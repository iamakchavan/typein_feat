import pako from 'pako';
import { Entry } from '@/contexts/EntryContext';

interface StorageData {
  content: string;
  history: string[];
  historyIndex: number;
}

interface FontPreferences {
  selectedFont: string;
  fontSize: number;
}

interface MigrationStatus {
  version: number;
  completedAt?: string;
  totalEntries: number;
  migratedEntries: number;
  failedEntries: string[]; // Entry IDs that failed migration
}

interface DBSchema {
  entries: Entry;
  editor: StorageData;
  theme: string;
  fontPreferences: FontPreferences;
  migrationStatus: MigrationStatus;
  media: any;
}

class typeinDB {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'typein-db';
  private readonly DB_VERSION = 6; // Increment version for media store
  private initPromise: Promise<void> | null = null;
  public useLocalStorageFallback = false;

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not supported or running in SSR. Falling back to localStorage.');
        this.useLocalStorageFallback = true;
        resolve();
        return;
      }

      let timeoutFired = false;
      const initTimeout = setTimeout(() => {
        timeoutFired = true;
        console.error('IndexedDB initialization timed out after 1.5s. Falling back to localStorage.');
        this.useLocalStorageFallback = true;
        resolve();
      }, 1500);

      try {
        console.log('Initializing IndexedDB...');
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        
        request.onerror = () => {
          if (timeoutFired) return;
          clearTimeout(initTimeout);
          const errorMsg = `Failed to open IndexedDB: ${request.error?.message || 'Unknown error'}`;
          console.error(errorMsg + '. Falling back to localStorage.');
          this.useLocalStorageFallback = true;
          resolve();
        };

        request.onblocked = () => {
          if (timeoutFired) return;
          clearTimeout(initTimeout);
          console.error('Database blocked. Falling back to localStorage.');
          this.useLocalStorageFallback = true;
          resolve();
        };
        request.onsuccess = () => {
          if (timeoutFired) return;
          clearTimeout(initTimeout);
          console.log('Successfully opened IndexedDB');
          this.db = request.result;

          // Add error handler for database-level errors
          this.db.onerror = (event: Event) => {
            const target = event.target as IDBRequest;
            const errorMsg = `Database error: ${target.error?.message || 'Unknown error'}`;
            console.error(errorMsg);
          };

          // Close database connection if another tab/version requests an upgrade
          this.db.onversionchange = () => {
            console.warn('Database version change requested by another tab/session. Closing connection.');
            if (this.db) {
              this.db.close();
              this.db = null;
            }
          };

          resolve();
        };

        request.onupgradeneeded = (event) => {
          if (timeoutFired) return;
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

            if (!db.objectStoreNames.contains('fontPreferences')) {
              console.log('Creating fontPreferences store...');
              db.createObjectStore('fontPreferences');
            }

            if (!db.objectStoreNames.contains('migrationStatus')) {
              console.log('Creating migrationStatus store...');
              db.createObjectStore('migrationStatus');
            }

            if (!db.objectStoreNames.contains('media')) {
              console.log('Creating media store...');
              db.createObjectStore('media', { keyPath: 'id' });
            }
          } catch (error) {
            console.error('Error during database upgrade:', error);
          }
        };
      } catch (error) {
        if (timeoutFired) return;
        clearTimeout(initTimeout);
        console.error('Error initializing IndexedDB:', error);
        this.useLocalStorageFallback = true;
        resolve();
      }
    });

    return this.initPromise;
  }

  // Entry operations
  async getEntries(): Promise<Entry[]> {
    await this.init();
    if (this.useLocalStorageFallback) {
      console.log('Fallback: Loading entries from localStorage');
      const data = localStorage.getItem('typein-entries');
      return data ? JSON.parse(data) : [];
    }
    console.log('Fetching all entries from IndexedDB...');
    return this.performTransaction('entries', 'readonly', (store) => {
      return store.getAll() as unknown as Promise<Entry[]>;
    });
  }

  async saveEntry(entry: Entry): Promise<void> {
    await this.init();
    if (this.useLocalStorageFallback) {
      console.log('Fallback: Saving entry to localStorage:', entry.id);
      const entries = await this.getEntries();
      const index = entries.findIndex(e => e.id === entry.id);
      if (index > -1) {
        entries[index] = entry;
      } else {
        entries.push(entry);
      }
      localStorage.setItem('typein-entries', JSON.stringify(entries));
      return;
    }
    console.log('Saving entry to IndexedDB:', entry.id);
    return this.performTransaction('entries', 'readwrite', (store) => {
      store.put(entry);
    });
  }

  async deleteEntry(id: string): Promise<void> {
    await this.init();
    if (this.useLocalStorageFallback) {
      console.log('Fallback: Deleting entry from localStorage:', id);
      const entries = await this.getEntries();
      const updated = entries.filter(e => e.id !== id);
      localStorage.setItem('typein-entries', JSON.stringify(updated));
      return;
    }
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
  private async verifyDatabaseAccess(): Promise<boolean> {
    if (this.useLocalStorageFallback) return true;
    try {
      // Try to write and read a test value
      await this.performTransaction('editor', 'readwrite', (store) => {
        store.put('test', '_verify');
      });
      
      const testValue = await this.performTransaction('editor', 'readonly', (store) => {
        return store.get('_verify') as unknown as Promise<string>;
      });

      // Clean up test value
      await this.performTransaction('editor', 'readwrite', (store) => {
        store.delete('_verify');
      });

      return testValue === 'test';
    } catch (error) {
      console.error('Database verification failed:', error);
      return false;
    }
  }

  async saveEditorState(data: StorageData): Promise<void> {
    await this.init();
    if (this.useLocalStorageFallback) {
      console.log('Fallback: Saving editor state to localStorage');
      localStorage.setItem('editor-state', JSON.stringify(data));
      return;
    }
    console.log('Saving editor state to IndexedDB...');
    try {
      const compressed = await this.compress(data);
      await this.performTransaction('editor', 'readwrite', (store) => {
        store.put(compressed, 'current');
      });
    } catch (error) {
      console.error('Failed to save editor state:', error);
      // If save fails, verify database access
      const hasAccess = await this.verifyDatabaseAccess();
      if (!hasAccess) {
        window.dispatchEvent(new CustomEvent('db-error', { 
          detail: { message: 'Database access verification failed. Storage might be restricted in this environment.' } 
        }));
      }
      throw error;
    }
  }

  async getEditorState(): Promise<StorageData | null> {
    await this.init();
    if (this.useLocalStorageFallback) {
      console.log('Fallback: Loading editor state from localStorage');
      const data = localStorage.getItem('editor-state');
      return data ? JSON.parse(data) : null;
    }
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
    await this.init();
    if (this.useLocalStorageFallback) {
      localStorage.setItem('editor-theme', theme);
      return;
    }
    console.log('Saving theme to IndexedDB:', theme);
    return this.performTransaction('theme', 'readwrite', (store) => {
      store.put(theme, 'current');
    });
  }

  async getTheme(): Promise<string | null> {
    await this.init();
    if (this.useLocalStorageFallback) {
      return localStorage.getItem('editor-theme');
    }
    console.log('Fetching theme from IndexedDB...');
    return this.performTransaction('theme', 'readonly', (store) => {
      return store.get('current') as unknown as Promise<string | null>;
    });
  }

  // Font preferences operations
  async saveFontPreferences(preferences: FontPreferences): Promise<void> {
    await this.init();
    if (this.useLocalStorageFallback) {
      localStorage.setItem('font-preferences', JSON.stringify(preferences));
      return;
    }
    console.log('Saving font preferences to IndexedDB:', preferences);
    return this.performTransaction('fontPreferences', 'readwrite', (store) => {
      store.put(preferences, 'current');
    });
  }

  async getFontPreferences(): Promise<FontPreferences | null> {
    await this.init();
    if (this.useLocalStorageFallback) {
      const data = localStorage.getItem('font-preferences');
      return data ? JSON.parse(data) : null;
    }
    console.log('Fetching font preferences from IndexedDB...');
    return this.performTransaction('fontPreferences', 'readonly', (store) => {
      return store.get('current') as unknown as Promise<FontPreferences | null>;
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
    if (this.useLocalStorageFallback) {
      throw new Error(`IndexedDB transaction failed because database is in localStorage fallback mode`);
    }

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
    await this.init();
    if (this.useLocalStorageFallback) {
      console.log('Fallback: Skipping localStorage to IndexedDB migration (database not available)');
      return;
    }
    console.log('Starting migration from localStorage to IndexedDB...');
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

      // Migrate font preferences if they exist
      const fontPreferences = localStorage.getItem('font-preferences');
      if (fontPreferences) {
        console.log('Migrating font preferences from localStorage...');
        try {
          const preferences = JSON.parse(fontPreferences);
          await this.saveFontPreferences(preferences);
          console.log('Successfully migrated font preferences');
        } catch (error) {
          console.error('Failed to migrate font preferences:', error);
        }
      }

      // Clear localStorage after successful migration, preserving keys we still need
      const preserve: Record<string, string | null> = {
        'last-edited-entry': localStorage.getItem('last-edited-entry'),
        'editor-theme': localStorage.getItem('editor-theme'),
        'typein_onboarding_complete': localStorage.getItem('typein_onboarding_complete'),
        'migration-status-shown-v6': localStorage.getItem('migration-status-shown-v6'),
      };
      localStorage.clear();
      Object.entries(preserve).forEach(([k, v]) => { if (v !== null) localStorage.setItem(k, v); });
      console.log('Migration completed successfully, localStorage cleared');
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  }

  // Verification methods
  async verifyDatabase(): Promise<boolean> {
    await this.init();
    if (this.useLocalStorageFallback) {
      console.log('Fallback: Database verification succeeded (running on localStorage fallback)');
      return true;
    }
    try {
      // Verify stores exist
      const storeNames = ['entries', 'editor', 'theme', 'fontPreferences'];
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

  // Migration status operations
  async getMigrationStatus(): Promise<MigrationStatus | null> {
    await this.init();
    if (this.useLocalStorageFallback) {
      const data = localStorage.getItem('migration-status-v6');
      return data ? JSON.parse(data) : null;
    }
    console.log('Fetching migration status from IndexedDB...');
    return this.performTransaction('migrationStatus', 'readonly', (store) => {
      return store.get('current') as unknown as Promise<MigrationStatus | null>;
    });
  }

  async saveMigrationStatus(status: MigrationStatus): Promise<void> {
    await this.init();
    if (this.useLocalStorageFallback) {
      localStorage.setItem('migration-status-v6', JSON.stringify(status));
      return;
    }
    console.log('Saving migration status to IndexedDB:', status);
    return this.performTransaction('migrationStatus', 'readwrite', (store) => {
      store.put(status, 'current');
    });
  }
}

export const db = new typeinDB(); 