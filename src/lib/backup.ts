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
 * Export all notes and media to a zip file
 */
export async function exportBackup(): Promise<void> {
  try {
    const zip = new JSZip();

    // Get all entries
    const allEntries = await db.getEntries();
    
    // Filter out empty entries
    const entries = allEntries.filter(entry => !isEmptyContent(entry.content));

    // Get all media files
    const allMedia = await mediaStorage.getAllMedia();

    // Create backup metadata
    const backupData: BackupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      entries: entries,
      mediaFiles: allMedia.map((media) => ({
        id: media.id,
        filename: media.filename,
        mimeType: media.mimeType,
      })),
    };

    // Add entries JSON
    zip.file('backup.json', JSON.stringify(backupData, null, 2));

    // Add media files to a media folder
    if (allMedia.length > 0) {
      const mediaFolder = zip.folder('media');
      if (mediaFolder) {
        for (const media of allMedia) {
          // Add each media file with its ID as filename
          mediaFolder.file(`${media.id}.${getExtensionFromMimeType(media.mimeType)}`, media.blob);
        }
      }
    }

    // Generate zip file
    const blob = await zip.generateAsync({ type: 'blob' });

    // Download the zip file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typein-backup-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Backup exported successfully');
  } catch (error) {
    console.error('Failed to export backup:', error);
    throw new Error('Failed to export backup');
  }
}

/**
 * Import notes and media from a zip file
 */
export async function importBackup(file: File): Promise<{ success: boolean; entriesImported: number; mediaImported: number; errors: string[] }> {
  const errors: string[] = [];
  let entriesImported = 0;
  let mediaImported = 0;

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
              mediaImported++;
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
        
        // Skip empty entries (no content)
        if (isEmptyContent(normalizedContent)) {
          console.log(`Skipping empty entry: ${entry.id}`);
          continue;
        }

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

    console.log(
      `Backup imported: ${entriesImported} entries, ${mediaImported} media files`
    );

    return {
      success: true,
      entriesImported,
      mediaImported,
      errors,
    };
  } catch (error) {
    console.error('Failed to import backup:', error);
    return {
      success: false,
      entriesImported,
      mediaImported,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Check if content is empty (no actual text)
 */
function isEmptyContent(content: any): boolean {
  if (!Array.isArray(content)) return true;
  if (content.length === 0) return true;

  // Check if all blocks are empty
  return content.every((block: any) => {
    if (!block.content || !Array.isArray(block.content)) return true;
    if (block.content.length === 0) return true;
    
    // Check if all content items are empty text
    return block.content.every((item: any) => {
      if (item.type === 'text') {
        return !item.text || item.text.trim() === '';
      }
      return false;
    });
  });
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
