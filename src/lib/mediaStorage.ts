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
    
    const mediaFile: MediaFile = {
      id,
      blob: file,
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
   * Save media file to IndexedDB
   */
  private async saveMedia(mediaFile: MediaFile): Promise<void> {
    await this.init();
    
    // Use the db helper method
    return (db as any).performTransaction(MEDIA_STORE_NAME, 'readwrite', (store: IDBObjectStore) => {
      store.put(mediaFile);
    });
  }

  /**
   * Get media file from IndexedDB
   */
  private async getMedia(id: string): Promise<MediaFile | null> {
    await this.init();
    
    return (db as any).performTransaction(MEDIA_STORE_NAME, 'readonly', (store: IDBObjectStore) => {
      return store.get(id) as unknown as Promise<MediaFile | null>;
    });
  }

  /**
   * Delete media file from IndexedDB
   */
  async deleteMedia(id: string): Promise<void> {
    await this.init();
    
    return (db as any).performTransaction(MEDIA_STORE_NAME, 'readwrite', (store: IDBObjectStore) => {
      store.delete(id);
    });
  }

  /**
   * Get all media files (for cleanup/management)
   */
  async getAllMedia(): Promise<MediaFile[]> {
    await this.init();
    
    return (db as any).performTransaction(MEDIA_STORE_NAME, 'readonly', (store: IDBObjectStore) => {
      return store.getAll() as unknown as Promise<MediaFile[]>;
    });
  }
}

export const mediaStorage = new MediaStorage();
