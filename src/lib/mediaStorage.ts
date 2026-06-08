import { db } from './db';

/**
 * Media storage for BlockNote uploads
 * Stores media files in IndexedDB and returns URLs for display
 */

const MEDIA_STORE_NAME = 'media';

interface MediaFile {
  id: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  uploadedAt: string;
}

class MediaStorage {
  private mediaFallbackMap = new Map<string, MediaFile>();

  async init() {
    // Use the main db instance
    await db.init();
  }

  /**
   * Upload a file and return a URL for display
   */
  async uploadFile(file: File): Promise<string> {
    await this.init();

    const id = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert File to a clean Blob. Storing raw File objects from inputs can retain
    // disk references. If the file is moved/deleted by the user, reading it throws NotFoundError.
    let cleanBlob: Blob;
    try {
      const buffer = await file.arrayBuffer();
      cleanBlob = new Blob([buffer], { type: file.type });
    } catch (e) {
      console.warn('Failed to convert File to ArrayBuffer, falling back to raw File', e);
      cleanBlob = file;
    }
    
    const mediaFile: MediaFile = {
      id,
      blob: cleanBlob,
      filename: file.name,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
    };

    await this.saveMedia(mediaFile);

    // Return a custom URL that we can resolve later
    return `indexeddb://${id}`;
  }

  /**
   * Get a blob URL for a media file
   */
  async getMediaUrl(id: string): Promise<string | null> {
    await this.init();

    const mediaFile = await this.getMedia(id);
    if (!mediaFile) return null;

    // Create a blob URL for display
    return URL.createObjectURL(mediaFile.blob);
  }

  /**
   * Save media file to IndexedDB or fallback storage
   */
  private async saveMedia(mediaFile: MediaFile): Promise<void> {
    await this.init();
    
    if (db.useLocalStorageFallback) {
      console.log('Fallback: Saving media to memory map:', mediaFile.id);
      this.mediaFallbackMap.set(mediaFile.id, mediaFile);
      
      // Try saving small media to localStorage as base64 for persistence
      if (mediaFile.blob.size < 100 * 1024) { // Under 100KB
        try {
          const reader = new FileReader();
          reader.readAsDataURL(mediaFile.blob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            localStorage.setItem(`media_fallback_${mediaFile.id}`, JSON.stringify({
              id: mediaFile.id,
              filename: mediaFile.filename,
              mimeType: mediaFile.mimeType,
              uploadedAt: mediaFile.uploadedAt,
              blobBase64: base64data
            }));
          };
        } catch (e) {
          console.warn('Failed to save media to localStorage fallback:', e);
        }
      }
      return;
    }

    // Use the db helper method
    return (db as any).performTransaction(MEDIA_STORE_NAME, 'readwrite', (store: IDBObjectStore) => {
      store.put(mediaFile);
    });
  }

  /**
   * Get media file from IndexedDB or fallback storage
   */
  private async getMedia(id: string): Promise<MediaFile | null> {
    await this.init();
    
    if (db.useLocalStorageFallback) {
      console.log('Fallback: Getting media from memory/localStorage:', id);
      if (this.mediaFallbackMap.has(id)) {
        return this.mediaFallbackMap.get(id) || null;
      }
      
      // Check localStorage for persisted small file
      const localMedia = localStorage.getItem(`media_fallback_${id}`);
      if (localMedia) {
        try {
          const parsed = JSON.parse(localMedia);
          // Convert base64 back to Blob
          const res = await fetch(parsed.blobBase64);
          const blob = await res.blob();
          const mediaFile: MediaFile = {
            id: parsed.id,
            blob,
            filename: parsed.filename,
            mimeType: parsed.mimeType,
            uploadedAt: parsed.uploadedAt
          };
          this.mediaFallbackMap.set(id, mediaFile);
          return mediaFile;
        } catch (e) {
          console.warn('Failed to reconstruct media from localStorage fallback:', e);
        }
      }
      return null;
    }

    return (db as any).performTransaction(MEDIA_STORE_NAME, 'readonly', (store: IDBObjectStore) => {
      return store.get(id) as unknown as Promise<MediaFile | null>;
    });
  }

  /**
   * Delete media file from IndexedDB or fallback storage
   */
  async deleteMedia(id: string): Promise<void> {
    await this.init();
    
    if (db.useLocalStorageFallback) {
      this.mediaFallbackMap.delete(id);
      localStorage.removeItem(`media_fallback_${id}`);
      return;
    }

    return (db as any).performTransaction(MEDIA_STORE_NAME, 'readwrite', (store: IDBObjectStore) => {
      store.delete(id);
    });
  }

  /**
   * Get all media files (for cleanup/management)
   */
  async getAllMedia(): Promise<MediaFile[]> {
    await this.init();
    
    if (db.useLocalStorageFallback) {
      console.log('Fallback: Fetching all media from fallback storage');
      const all: MediaFile[] = Array.from(this.mediaFallbackMap.values());
      
      // Look for persisted media in localStorage that aren't loaded in memory yet
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('media_fallback_')) {
          const id = key.replace('media_fallback_', '');
          if (!this.mediaFallbackMap.has(id)) {
            const media = await this.getMedia(id);
            if (media) all.push(media);
          }
        }
      }
      return all;
    }

    return (db as any).performTransaction(MEDIA_STORE_NAME, 'readonly', (store: IDBObjectStore) => {
      return store.getAll() as unknown as Promise<MediaFile[]>;
    });
  }
}

export const mediaStorage = new MediaStorage();
