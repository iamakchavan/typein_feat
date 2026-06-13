import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import type { PartialBlock } from '@blocknote/core';
import { migrateEntryContent } from '@/lib/migration';
import { isContentEmpty } from '@/lib/entryHelpers';
import { WELCOME_NOTE_BLOCKS } from '@/lib/welcomeTemplate';

// Timezone-safe local date string helper (YYYY-MM-DD)
export const getLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Timezone-safe date parser
export function parseDateSafe(dateStr: string | Date | undefined | null): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;

  // If it's a date-only string (YYYY-MM-DD), parse it as local time by creating Date with local args
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export interface Entry {
  id: string;
  date: string;
  content: string | PartialBlock[]; // Support both plain text and BlockNote format
  contentFormat?: 'plaintext' | 'blocknote'; // Track which format is being used
  pinned?: boolean;
  isBranchedOff?: boolean;
  originalEntryDate?: string;
  migratedAt?: string; // Timestamp when migration occurred
  migrationError?: string; // Error message if migration failed
}

interface EntryContextType {
  entries: Entry[];
  currentEntry: Entry | null;
  setCurrentEntry: (entry: Entry | null) => void;
  updateEntryContent: (id: string, content: string | PartialBlock[]) => void;
  createNewEntry: () => void;
  deleteEntry: (id: string) => void;
  togglePinEntry: (id: string) => void;
  branchOffEntry: (id: string) => void;
}

const EntryContext = createContext<EntryContextType | null>(null);

export function EntryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load entries and initialize today's entry if needed
  useEffect(() => {
    let active = true;

    // Failsafe: if loading takes more than 8 seconds, force-unblock
    const failsafeTimer = setTimeout(() => {
      if (active) {
        setIsLoading(false);
      }
    }, 8000);

    const initializeEntries = async () => {
      try {
        // Try to load from IndexedDB first
        let loadedEntries = await db.getEntries();
        if (!active) return;

        // If no entries in IndexedDB, try migrating from localStorage
        if (loadedEntries.length === 0) {
          await db.migrateFromLocalStorage();
          loadedEntries = await db.getEntries();
          if (!active) return;
        }

        const isBrandNewUser = loadedEntries.length === 0;

        // MIGRATION: Check if entries need to be migrated from plain text to BlockNote format
        const migrationStatus = await db.getMigrationStatus();
        if (!active) return;
        const needsMigration = !migrationStatus || migrationStatus.version < 1;

        if (needsMigration) {
          // Check if there are actually any plain-text entries that need converting.
          // New users have no entries — skip the UI entirely and just mark done.
          const plainTextEntries = loadedEntries.filter(
            e => typeof e.content === 'string' && !e.contentFormat
          );

          if (plainTextEntries.length === 0) {
            // Nothing to migrate — silently mark as done
            await db.saveMigrationStatus({
              version: 1,
              completedAt: new Date().toISOString(),
              totalEntries: 0,
              migratedEntries: 0,
              failedEntries: [],
            });
            if (!active) return;
          } else {
            console.log('Starting entry migration to BlockNote format...');

            // Set up a promise that resolves when 'migration-dialog-mounted' is fired
            const dialogMountedPromise = new Promise<void>((resolve) => {
              const onMounted = () => {
                window.removeEventListener('migration-dialog-mounted', onMounted);
                resolve();
              };
              window.addEventListener('migration-dialog-mounted', onMounted);
              // Failsafe timeout of 2.0s in case the dialog is somehow already mounted or fails to mount
              setTimeout(resolve, 2000);
            });

            // Hide the loading screen immediately — MigrationStatusDialog owns the UI from here
            setIsLoading(false);

            // Wait for the dialog to be mounted and ready to receive events
            await dialogMountedPromise;
            if (!active) return;

            // Step 1: Show the welcome screen and wait for user to click Continue or Cancel
            window.dispatchEvent(new CustomEvent('migration-welcome'));

            let migrationCancelled = false;
            await new Promise<void>(resolve => {
              const onReady = () => {
                window.removeEventListener('migration-ready', onReady);
                window.removeEventListener('migration-cancelled', onCancel);
                migrationCancelled = false;
                resolve();
              };
              const onCancel = () => {
                window.removeEventListener('migration-ready', onReady);
                window.removeEventListener('migration-cancelled', onCancel);
                migrationCancelled = true;
                resolve();
              };
              window.addEventListener('migration-ready', onReady);
              window.addEventListener('migration-cancelled', onCancel);
            });

            if (!active) return;

            if (migrationCancelled) {
              console.log('Migration cancelled by user. Loading entries without format conversion.');
              // We do not run the migration loop, just proceed to load entries as they are.
            } else {
              // Step 2: Signal UI to start scanning
              window.dispatchEvent(new CustomEvent('migration-indexing', {
                detail: { totalEntries: loadedEntries.length }
              }));

              // Small pause so scanning screen is visible
              await new Promise(resolve => setTimeout(resolve, 700));
              if (!active) return;

              // Step 3: Start migration
              window.dispatchEvent(new CustomEvent('migration-start', {
                detail: { totalEntries: loadedEntries.length }
              }));

              const totalEntries = loadedEntries.length;
              let migratedCount = 0;
              const failedEntries: string[] = [];

              // Migrate each entry
              for (const entry of loadedEntries) {
                if (!active) return;
                // Only migrate if content is plain text
                if (typeof entry.content === 'string' && !entry.contentFormat) {
                  try {
                    const { success, migratedContent, error } = migrateEntryContent(entry.content);

                    if (success) {
                      entry.content = migratedContent;
                      entry.contentFormat = 'blocknote';
                      entry.migratedAt = new Date().toISOString();
                      await db.saveEntry(entry);
                      migratedCount++;
                      window.dispatchEvent(new CustomEvent('migration-progress', {
                        detail: { migratedCount, totalEntries }
                      }));
                      console.log(`Migrated entry ${entry.id}`);
                    } else {
                      entry.contentFormat = 'plaintext';
                      entry.migrationError = error;
                      await db.saveEntry(entry);
                      failedEntries.push(entry.id);
                      console.error(`Failed to migrate entry ${entry.id}:`, error);
                    }
                  } catch (error) {
                    entry.contentFormat = 'plaintext';
                    entry.migrationError = error instanceof Error ? error.message : String(error);
                    await db.saveEntry(entry);
                    failedEntries.push(entry.id);
                    console.error(`Error migrating entry ${entry.id}:`, error);
                  }
                }
              }

              if (!active) return;

              // Save migration status
              const finalStatus = {
                version: 1,
                completedAt: new Date().toISOString(),
                totalEntries,
                migratedEntries: migratedCount,
                failedEntries,
              };
              await db.saveMigrationStatus(finalStatus);
              window.dispatchEvent(new CustomEvent('migration-complete', {
                detail: finalStatus
              }));

              console.log(`Migration complete: ${migratedCount}/${totalEntries} entries migrated`);
              if (failedEntries.length > 0) {
                console.warn(`${failedEntries.length} entries failed to migrate:`, failedEntries);
              }
            } // end else (migration not cancelled)
          } // end else (has plain-text entries)
        } // end if (needsMigration)

        if (!active) return;

        // Ensure any existing welcome notes with level 1/2 headings are migrated to level 3 (user preference)
        for (const entry of loadedEntries) {
          if (Array.isArray(entry.content)) {
            const isWelcomeNote = entry.content.some(block => 
              block.type === 'heading' && 
              Array.isArray(block.content) && 
              block.content.some((c: any) => typeof c.text === 'string' && c.text.includes('Welcome to typein!'))
            );
            if (isWelcomeNote) {
              let modified = false;
              const updatedContent = entry.content.map(block => {
                if (block.type === 'heading' && block.props && (block.props.level === 1 || block.props.level === 2)) {
                  modified = true;
                  return {
                    ...block,
                    props: {
                      ...block.props,
                      level: 3
                    }
                  };
                }
                return block;
              });
              if (modified) {
                entry.content = updatedContent;
                await db.saveEntry(entry);
              }
            }
          }
        }

        // Get today's date in local timezone YYYY-MM-DD
        const today = getLocalDateString(new Date());

        // Find today's entries using timezone-safe local dates
        const todayEntries = loadedEntries.filter(entry => {
          const entryDate = getLocalDateString(parseDateSafe(entry.date));
          return entryDate === today;
        });

        // Sort all entries by date (newest first)
        loadedEntries.sort((a, b) => parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime());

        if (todayEntries.length === 0) {
          // No entry for today — create one fresh blank note
          const newEntry: Entry = {
            id: uuidv4(),
            date: new Date().toISOString(),
            content: isBrandNewUser ? WELCOME_NOTE_BLOCKS : '',
            contentFormat: isBrandNewUser ? 'blocknote' : 'plaintext'
          };
          await db.saveEntry(newEntry);
          if (!active) return;

          if (isBrandNewUser) {
            localStorage.setItem('typein_onboarding_complete', 'true');
          }

          loadedEntries = [newEntry, ...loadedEntries];
          setEntries(loadedEntries);
          setCurrentEntry(newEntry);
          // Save as last-edited so refresh restores it
          localStorage.setItem('last-edited-entry', newEntry.id);
        } else {
          setEntries(loadedEntries);
          // Restore last-edited entry (survives refresh)
          const lastEditedId = localStorage.getItem('last-edited-entry');
          const lastEdited = lastEditedId ? loadedEntries.find(e => e.id === lastEditedId) : null;
          if (lastEdited) {
            setCurrentEntry(lastEdited);
          } else {
            // Fall back to most recent non-branched entry for today, or newest overall
            const preferred = todayEntries
              .filter(e => !e.isBranchedOff)
              .sort((a, b) => parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime())[0];
            setCurrentEntry(preferred ?? loadedEntries[0]);
          }
        }
      } catch (error) {
        if (!active) return;
        console.error('Failed to initialize entries:', error);

        // Hide the loading screen so the MigrationStatusDialog mounts
        setIsLoading(false);

        // Wait a small delay to ensure MigrationStatusDialog is mounted and listening
        await new Promise(resolve => setTimeout(resolve, 150));
        if (!active) return;

        // Signal migration error to UI
        window.dispatchEvent(new CustomEvent('migration-error', {
          detail: { message: error instanceof Error ? error.message : 'Unknown error' }
        }));

        // Recovery: Try loading entries from fallback database mode
        try {
          console.log('IndexedDB failed/timed out. Attempting fallback recovery...');
          let fallbackEntries = await db.getEntries();
          if (active) {
            if (fallbackEntries.length > 0) {
              console.log(`Fallback recovery: Loaded ${fallbackEntries.length} entries from fallback`);
              const today = getLocalDateString(new Date());
              const todayEntries = fallbackEntries.filter(entry => getLocalDateString(parseDateSafe(entry.date)) === today);

              if (todayEntries.length === 0) {
                const newEntry: Entry = {
                  id: uuidv4(),
                  date: new Date().toISOString(),
                  content: '',
                };
                await db.saveEntry(newEntry);
                fallbackEntries = [newEntry, ...fallbackEntries];
                fallbackEntries.sort((a, b) => parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime());
                setEntries(fallbackEntries);
                setCurrentEntry(newEntry);
                localStorage.setItem('last-edited-entry', newEntry.id);
              } else {
                fallbackEntries.sort((a, b) => parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime());
                setEntries(fallbackEntries);
                const lastEditedId = localStorage.getItem('last-edited-entry');
                const lastEdited = lastEditedId ? fallbackEntries.find(e => e.id === lastEditedId) : null;
                if (lastEdited) {
                  setCurrentEntry(lastEdited);
                } else {
                  const preferred = todayEntries
                    .filter(e => !e.isBranchedOff)
                    .sort((a, b) => parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime())[0];
                  setCurrentEntry(preferred ?? fallbackEntries[0]);
                }
              }
              return; // Recovery successful, exit catch block!
            }
          }
        } catch (fallbackError) {
          console.error('Fallback recovery failed to load entries:', fallbackError);
        }

        // Even if loading fails and no fallback entries exist, try to create a today's entry
        try {
          const newEntry: Entry = {
            id: uuidv4(),
            date: new Date().toISOString(),
            content: ''
          };
          await db.saveEntry(newEntry);
          if (!active) return;
          setEntries([newEntry]);
          setCurrentEntry(newEntry);
        } catch (fallbackError) {
          console.error('Failed to create fallback entry:', fallbackError);
          setEntries([]);
          setCurrentEntry(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    // Delay start slightly to allow Strict Mode synchronous cleanup to run
    const initTimer = setTimeout(() => {
      if (active) {
        initializeEntries();
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(failsafeTimer);
      clearTimeout(initTimer);
    };
  }, []);

  // Save last edited entry ID when current entry changes
  useEffect(() => {
    if (currentEntry) {
      localStorage.setItem('last-edited-entry', currentEntry.id);
    }
  }, [currentEntry?.id]);

  const updateEntryContent = async (id: string, content: string | PartialBlock[]) => {
    try {
      // Determine content format
      const contentFormat: 'blocknote' | 'plaintext' = Array.isArray(content) ? 'blocknote' : 'plaintext';

      const updatedEntries = entries.map(entry =>
        entry.id === id ? { ...entry, content, contentFormat } : entry
      );
      setEntries(updatedEntries);
      const updatedEntry = updatedEntries.find(entry => entry.id === id);
      if (updatedEntry) {
        await db.saveEntry(updatedEntry);
      }
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const createNewEntry = async () => {
    try {
      // If current entry exists and is empty, just keep using it
      const currentEntryData = entries.find(e => e.id === currentEntry?.id);
      if (currentEntry && currentEntryData && isContentEmpty(currentEntryData.content)) {
        return;
      }

      const newEntry: Entry = {
        id: uuidv4(),
        date: new Date().toISOString(),
        content: ''
      };

      // Create and save the new entry
      await db.saveEntry(newEntry);
      setEntries(prevEntries => [newEntry, ...prevEntries]);
      setCurrentEntry(newEntry);
    } catch (error) {
      console.error('Failed to create new entry:', error);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const updatedEntries = entries.filter(entry => entry.id !== id);
      await db.deleteEntry(id);
      setEntries(updatedEntries);

      // If we deleted the current entry or if there are no entries left
      if (currentEntry?.id === id || updatedEntries.length === 0) {
        // If there are remaining entries, switch to the most recent one
        if (updatedEntries.length > 0) {
          setCurrentEntry(updatedEntries[0]);
        } else {
          // If no entries left, clear current entry
          setCurrentEntry(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const togglePinEntry = async (id: string) => {
    try {
      const entryToUpdate = entries.find(entry => entry.id === id);
      if (!entryToUpdate) return;

      const updatedEntry = { ...entryToUpdate, pinned: !entryToUpdate.pinned };

      // Update in database
      await db.saveEntry(updatedEntry);

      // Update state
      setEntries(prev => prev.map(entry =>
        entry.id === id ? updatedEntry : entry
      ));

      // Update current entry if it's the one being pinned/unpinned
      if (currentEntry?.id === id) {
        setCurrentEntry(updatedEntry);
      }
    } catch (error) {
      console.error('Failed to toggle pin entry:', error);
    }
  };

  const branchOffEntry = async (id: string) => {
    try {
      const entryToBranchOff = entries.find(entry => entry.id === id);
      if (!entryToBranchOff) return;

      const today = new Date().toISOString();
      const originalDate = getLocalDateString(parseDateSafe(entryToBranchOff.date));

      const branchedEntry: Entry = {
        id: uuidv4(),
        date: today,
        content: entryToBranchOff.content,
        isBranchedOff: true,
        originalEntryDate: originalDate,
        pinned: false // Don't branch off the pinned status
      };

      // Save to database
      await db.saveEntry(branchedEntry);

      // Update state
      setEntries(prev => {
        const updated = [branchedEntry, ...prev];
        // Sort to maintain order (pinned first, then by date)
        return updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime();
        });
      });

      // Set the branched entry as current
      setCurrentEntry(branchedEntry);
    } catch (error) {
      console.error('Failed to branch off entry:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <EntryContext.Provider
      value={{
        entries,
        currentEntry,
        setCurrentEntry,
        updateEntryContent,
        createNewEntry,
        deleteEntry,
        togglePinEntry,
        branchOffEntry
      }}
    >
      {children}
    </EntryContext.Provider>
  );
}

export function useEntries() {
  const context = useContext(EntryContext);
  if (!context) {
    throw new Error('useEntries must be used within an EntryProvider');
  }
  return context;
} 