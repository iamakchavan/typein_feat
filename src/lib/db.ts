import pako from 'pako';
import { Entry } from '@/contexts/EntryContext';

interface StorageData {
  content: string;
  history: string[];
  historyIndex: number;
}

interface DBSchema {
  entries: Entry;
  editor: StorageData;
  theme: string;
}

class TypeInDB {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'typein-db';
  private readonly DB_VERSION = 3;
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        console.log('Initializing IndexedDB...');
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        
        request.onerror = () => {
          console.error('Failed to open IndexedDB:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          console.log('Successfully opened IndexedDB');
          this.db = request.result;

          // Add error handler for database-level errors
          this.db.onerror = (event: Event) => {
            const target = event.target as IDBRequest;
            console.error('Database error:', target.error);
          };

          resolve();
        };
        
        request.onupgradeneeded = (event) => {
          console.log('Upgrading IndexedDB schema...');
          const db = (event.target as IDBOpenDBRequest).result;
          
          try {
            // Create stores
            if (!db.objectStoreNames.contains('entries')) {
              console.log('Creating entries store...');
              const entryStore = db.createObjectStore('entries', { keyPath: 'id' });
              entryStore.createIndex('date', 'date');
            }
            
            if (!db.objectStoreNames.contains('editor')) {
              console.log('Creating editor store...');
              db.createObjectStore('editor');
            }

            if (!db.objectStoreNames.contains('theme')) {
              console.log('Creating theme store...');
              db.createObjectStore('theme');
            }
          } catch (error) {
            console.error('Error during database upgrade:', error);
            throw error;
          }
        };
      } catch (error) {
        console.error('Error initializing IndexedDB:', error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  // Entry operations
  async getEntries(): Promise<Entry[]> {
    console.log('Fetching all entries from IndexedDB...');
    return this.performTransaction('entries', 'readonly', (store) => {
      return store.getAll() as unknown as Promise<Entry[]>;
    });
  }

  async saveEntry(entry: Entry): Promise<void> {
    console.log('Saving entry to IndexedDB:', entry.id);
    return this.performTransaction('entries', 'readwrite', (store) => {
      store.put(entry);
    });
  }

  async deleteEntry(id: string): Promise<void> {
    console.log('Deleting entry from IndexedDB:', id);
    return this.performTransaction('entries', 'readwrite', async (store) => {
      // Verify the entry exists before deleting
      const entry = await store.get(id);
      if (!entry) {
        console.warn('Attempted to delete non-existent entry:', id);
        return;
      }
      store.delete(id);
    });
  }

  // Editor state operations
  async saveEditorState(data: StorageData): Promise<void> {
    console.log('Saving editor state to IndexedDB...');
    const compressed = await this.compress(data);
    return this.performTransaction('editor', 'readwrite', (store) => {
      store.put(compressed, 'current');
    });
  }

  async getEditorState(): Promise<StorageData | null> {
    console.log('Fetching editor state from IndexedDB...');
    const compressed = await this.performTransaction('editor', 'readonly', (store) => {
      return store.get('current') as unknown as Promise<Uint8Array | null>;
    });
    
    if (!compressed) {
      console.log('No editor state found in IndexedDB');
      return null;
    }
    return this.decompress(compressed);
  }

  // Theme operations
  async saveTheme(theme: string): Promise<void> {
    console.log('Saving theme to IndexedDB:', theme);
    return this.performTransaction('theme', 'readwrite', (store) => {
      store.put(theme, 'current');
    });
  }

  async getTheme(): Promise<string | null> {
    console.log('Fetching theme from IndexedDB...');
    return this.performTransaction('theme', 'readonly', (store) => {
      return store.get('current') as unknown as Promise<string | null>;
    });
  }

  // Helper methods
  private async compress(data: StorageData): Promise<Uint8Array> {
    try {
      const textEncoder = new TextEncoder();
      const contentUint8 = textEncoder.encode(JSON.stringify(data));
      return pako.deflate(contentUint8);
    } catch (error) {
      console.error('Error compressing data:', error);
      throw error;
    }
  }

  private async decompress(compressed: Uint8Array): Promise<StorageData> {
    try {
      const decompressed = pako.inflate(compressed);
      const textDecoder = new TextDecoder();
      const decodedData = textDecoder.decode(decompressed);
      return JSON.parse(decodedData);
    } catch (error) {
      console.error('Error decompressing data:', error);
      throw error;
    }
  }

  private async performTransaction<T>(
    storeName: keyof DBSchema,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => T | Promise<T>
  ): Promise<T> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        const error = new Error('Database not initialized');
        console.error(error);
        reject(error);
        return;
      }

      try {
        const transaction = this.db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        
        transaction.onerror = () => {
          console.error(`Transaction error (${storeName}):`, transaction.error);
          reject(transaction.error);
        };

        transaction.onabort = () => {
          console.error(`Transaction aborted (${storeName}):`, transaction.error);
          reject(transaction.error);
        };
        
        try {
          const request = operation(store);
          
          transaction.oncomplete = () => {
            if (request instanceof IDBRequest) {
              resolve(request.result);
            } else if (request instanceof Promise) {
              request.then(resolve).catch(reject);
            } else {
              resolve(request);
            }
          };
        } catch (error) {
          console.error(`Error in transaction operation (${storeName}):`, error);
          reject(error);
        }
      } catch (error) {
        console.error(`Error creating transaction (${storeName}):`, error);
        reject(error);
      }
    });
  }

  // Migration helper
  async migrateFromLocalStorage(): Promise<void> {
    console.log('Starting migration from localStorage to IndexedDB...');
    await this.init();

    try {
      // Migrate entries
      const savedEntries = localStorage.getItem('typein-entries');
      if (savedEntries) {
        console.log('Migrating entries from localStorage...');
        const entries = JSON.parse(savedEntries);
        for (const entry of entries) {
          await this.saveEntry(entry);
        }
        console.log(`Successfully migrated ${entries.length} entries`);
      }

      // Migrate editor state
      const editorContent = localStorage.getItem('editor-content');
      if (editorContent) {
        console.log('Migrating editor state from localStorage...');
        try {
          // Try to decompress if it's compressed
          const binaryString = atob(editorContent);
          const uint8Array = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
          }
          const decompressed = pako.inflate(uint8Array);
          const textDecoder = new TextDecoder();
          const decodedData = textDecoder.decode(decompressed);
          const data = JSON.parse(decodedData);
          await this.saveEditorState(data);
          console.log('Successfully migrated compressed editor state');
        } catch {
          // If decompression fails, try parsing as uncompressed
          try {
            const data = JSON.parse(editorContent);
            await this.saveEditorState(data);
            console.log('Successfully migrated uncompressed editor state');
          } catch {
            // If parsing fails, save as legacy content
            await this.saveEditorState({
              content: editorContent,
              history: [editorContent],
              historyIndex: 0
            });
            console.log('Successfully migrated legacy editor state');
          }
        }
      }

      // Migrate theme
      const theme = localStorage.getItem('editor-theme');
      if (theme) {
        console.log('Migrating theme from localStorage...');
        await this.saveTheme(theme);
        console.log('Successfully migrated theme');
      }

      // Clear localStorage after successful migration
      localStorage.clear();
      console.log('Migration completed successfully, localStorage cleared');
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  }

  // Verification methods
  async verifyDatabase(): Promise<boolean> {
    try {
      await this.init();
      
      // Verify stores exist
      const storeNames = ['entries', 'editor', 'theme'];
      const missingStores = storeNames.filter(name => !this.db?.objectStoreNames.contains(name));
      
      if (missingStores.length > 0) {
        console.error('Missing stores:', missingStores);
        return false;
      }

      // Verify we can perform basic operations
      const testEntry: Entry = {
        id: '_test_entry_',
        date: new Date().toISOString(),
        content: 'Test entry'
      };

      // Test entry operations
      await this.saveEntry(testEntry);
      const entries = await this.getEntries();
      const savedEntry = entries.find(e => e.id === '_test_entry_');
      if (!savedEntry) {
        console.error('Failed to verify entry operations');
        return false;
      }
      await this.deleteEntry('_test_entry_');

      // Test editor state
      const testState: StorageData = {
        content: 'Test content',
        history: ['Test content'],
        historyIndex: 0
      };
      await this.saveEditorState(testState);
      const savedState = await this.getEditorState();
      if (!savedState) {
        console.error('Failed to verify editor state operations');
        return false;
      }

      // Test theme
      await this.saveTheme('light');
      const savedTheme = await this.getTheme();
      if (savedTheme !== 'light') {
        console.error('Failed to verify theme operations');
        return false;
      }

      console.log('Database verification completed successfully');
      return true;
    } catch (error) {
      console.error('Database verification failed:', error);
      return false;
    }
  }
}

export const db = new TypeInDB(); 