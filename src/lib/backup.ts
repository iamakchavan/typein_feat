import JSZip from 'jszip';
import { db } from './db';
import { mediaStorage } from './mediaStorage';
import type { Entry } from '@/contexts/EntryContext';

interface BackupData {
  version: string;
  exportDate: string;
  entries: Entry[];
  mediaFiles: {
    id: string;
    filename: string;
    mimeType: string;
  }[];
}

/**
 * Helper to get all media IDs referenced in a set of entries
 */
export function getReferencedMediaIds(entries: Entry[]): Set<string> {
  const referencedIds = new Set<string>();
  for (const entry of entries) {
    if (!entry.content) continue;
    const contentString = typeof entry.content === 'string'
      ? entry.content
      : JSON.stringify(entry.content);
    
    const regex = /media_[a-zA-Z0-9_]+/g;
    let match;
    while ((match = regex.exec(contentString)) !== null) {
      referencedIds.add(match[0]);
    }
  }
  return referencedIds;
}

/**
 * Helper to count all instances/references of valid media files across entries
 */
export function getReferencedMediaCount(entries: Entry[], validMediaIds: Set<string>): number {
  let count = 0;
  for (const entry of entries) {
    if (!entry.content) continue;
    const contentString = typeof entry.content === 'string'
      ? entry.content
      : JSON.stringify(entry.content);
    
    const matches = contentString.match(/media_[a-zA-Z0-9_]+/g);
    if (matches) {
      for (const id of matches) {
        if (validMediaIds.has(id)) {
          count++;
        }
      }
    }
  }
  return count;
}

/**
 * Export all notes and media to a zip file
 */
export async function exportBackup(): Promise<{ entriesCount: number; mediaCount: number }> {
  try {
    const zip = new JSZip();

    // Step 1: Get all entries
    let allEntries: any[] = [];
    try {
      allEntries = await db.getEntries();
    } catch (entriesError) {
      console.error('Failed to fetch entries:', entriesError);
      throw new Error('Could not read entries from database');
    }
    
    // Filter out invalid entries (safely — don't let a single bad entry crash the whole export)
    const entries = allEntries.filter(entry => {
      try {
        return entry && typeof entry === 'object' && entry.id;
      } catch {
        return false;
      }
    });

    if (entries.length === 0) {
      throw new Error('No entries to export');
    }

    // Step 2: Get all media files — gracefully skip if media store doesn't exist
    let allMedia: any[] = [];
    try {
      allMedia = await mediaStorage.getAllMedia();
    } catch (mediaError) {
      console.warn('Could not load media files for backup (store may not exist):', mediaError);
    }

    // Step 3: Validate and add media files to the ZIP (only those referenced in the entries)
    const validMedia: any[] = [];
    const validMediaIds = new Set<string>();
    if (allMedia.length > 0) {
      const referencedMediaIds = getReferencedMediaIds(entries);
      const mediaFolder = zip.folder('media');
      if (mediaFolder) {
        for (const media of allMedia) {
          // Only include if referenced in the exported entries
          if (!referencedMediaIds.has(media.id)) {
            continue;
          }
          try {
            if (media.blob) {
              // Verify if the blob's underlying file is still accessible.
              await media.blob.slice(0, 1).arrayBuffer();
              
              mediaFolder.file(`${media.id}.${getExtensionFromMimeType(media.mimeType)}`, media.blob);
              validMedia.push(media);
              validMediaIds.add(media.id);
            }
          } catch (mediaFileError) {
            console.warn(`Skipping unreadable or missing media file ${media.id} (${media.filename}):`, mediaFileError);
          }
        }
      }
    }

    // Step 4: Build backup data (using only successfully verified media files)
    const backupData: BackupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      entries: entries,
      mediaFiles: validMedia.map((media) => ({
        id: media.id,
        filename: media.filename,
        mimeType: media.mimeType,
      })),
    };

    // Step 5: Add entries JSON to zip
    zip.file('backup.json', JSON.stringify(backupData, null, 2));

    // Step 6: Generate zip file
    const blob = await zip.generateAsync({ type: 'blob' });

    // Step 7: Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typein-backup-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Backup exported successfully');
    
    // Count total media references/instances exported
    const mediaCount = getReferencedMediaCount(entries, validMediaIds);

    return {
      entriesCount: entries.length,
      mediaCount: mediaCount,
    };
  } catch (error) {
    console.error('Failed to export backup:', error);
    throw error instanceof Error ? error : new Error('Failed to export backup. Please try again.');
  }
}

/**
 * Import notes and media from a zip file
 */
export async function importBackup(file: File): Promise<{ success: boolean; entriesImported: number; mediaImported: number; errors: string[] }> {
  const errors: string[] = [];
  let entriesImported = 0;
  const importedMediaIds = new Set<string>();

  try {
    const zip = await JSZip.loadAsync(file);

    // Read backup.json
    const backupFile = zip.file('backup.json');
    if (!backupFile) {
      throw new Error('Invalid backup file: missing backup.json');
    }

    const backupContent = await backupFile.async('string');
    const backupData: BackupData = JSON.parse(backupContent);

    // Validate backup version
    if (!backupData.version || !backupData.entries) {
      throw new Error('Invalid backup file format');
    }

    // Import media files first
    const mediaFolder = zip.folder('media');
    if (mediaFolder) {
      const mediaFiles = Object.keys(zip.files).filter((name) =>
        name.startsWith('media/')
      );

      for (const mediaPath of mediaFiles) {
        try {
          const mediaFile = zip.file(mediaPath);
          if (mediaFile && !mediaFile.dir) {
            const blob = await mediaFile.async('blob');
            const filename = mediaPath.split('/').pop() || 'unknown';
            const mediaId = filename.split('.')[0];

            // Find metadata for this media file
            const mediaMetadata = backupData.mediaFiles.find(
              (m) => m.id === mediaId
            );

            if (mediaMetadata) {
              // Save to IndexedDB
              await (mediaStorage as any).saveMedia({
                id: mediaId,
                blob: blob,
                filename: mediaMetadata.filename,
                mimeType: mediaMetadata.mimeType,
                uploadedAt: new Date().toISOString(),
              });
              importedMediaIds.add(mediaId);
            }
          }
        } catch (error) {
          console.error(`Failed to import media file ${mediaPath}:`, error);
          errors.push(`Failed to import media: ${mediaPath}`);
        }
      }
    }

    // Get existing entries to check for duplicates
    const existingEntries = await db.getEntries();
    const existingIds = new Set(existingEntries.map(e => e.id));

    // Import entries with content normalization
    for (const entry of backupData.entries) {
      try {
        // Skip if entry already exists (prevent duplicates)
        if (existingIds.has(entry.id)) {
          console.log(`Skipping duplicate entry: ${entry.id}`);
          continue;
        }

        // Normalize entry content to ensure it's in the correct format
        const normalizedContent = normalizeEntryContent(entry.content);

        const normalizedEntry = {
          ...entry,
          content: normalizedContent,
        };
        
        await db.saveEntry(normalizedEntry);
        entriesImported++;
      } catch (error) {
        console.error(`Failed to import entry ${entry.id}:`, error);
        errors.push(`Failed to import entry from ${entry.date}`);
      }
    }

    // Count total media references/instances imported
    const mediaImportedCount = getReferencedMediaCount(backupData.entries, importedMediaIds);

    console.log(
      `Backup imported: ${entriesImported} entries, ${mediaImportedCount} media instances`
    );

    return {
      success: true,
      entriesImported,
      mediaImported: mediaImportedCount,
      errors,
    };
  } catch (error) {
    console.error('Failed to import backup:', error);
    return {
      success: false,
      entriesImported,
      mediaImported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Normalize entry content to BlockNote format
 */
function normalizeEntryContent(content: any): any {
  // If content is already an array (BlockNote format), return as is
  if (Array.isArray(content)) {
    return content;
  }

  // If content is a string, convert to BlockNote format
  if (typeof content === 'string') {
    if (content.trim() === '') {
      return [{ type: 'paragraph', content: [] }];
    }

    // Split by lines and create paragraph blocks
    const lines = content.split('\n');
    return lines.map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line, styles: {} }] : [],
    }));
  }

  // If content is an object (might be old format), try to extract text
  if (typeof content === 'object' && content !== null) {
    // If it has a 'content' property that's a string, use that
    if (typeof content.content === 'string') {
      return normalizeEntryContent(content.content);
    }
    
    // If it looks like a single BlockNote block, wrap it in an array
    if (content.type) {
      return [content];
    }
  }

  // Fallback: empty paragraph
  return [{ type: 'paragraph', content: [] }];
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
  };

  return mimeMap[mimeType] || 'bin';
}
