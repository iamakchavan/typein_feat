import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';

export interface Entry {
  id: string;
  date: string;
  content: string;
}

interface EntryContextType {
  entries: Entry[];
  currentEntry: Entry | null;
  setCurrentEntry: (entry: Entry | null) => void;
  updateEntryContent: (id: string, content: string) => void;
  createNewEntry: () => void;
  deleteEntry: (id: string) => void;
}

const EntryContext = createContext<EntryContextType | null>(null);

export function EntryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load entries and initialize today's entry if needed
  useEffect(() => {
    const initializeEntries = async () => {
      try {
        // Try to load from IndexedDB first
        let loadedEntries = await db.getEntries();
        
        // If no entries in IndexedDB, try migrating from localStorage
        if (loadedEntries.length === 0) {
          await db.migrateFromLocalStorage();
          loadedEntries = await db.getEntries();
        }

        // Remove any empty entries
        loadedEntries = loadedEntries.filter(entry => entry.content.trim() !== '');
        
        // Sort entries by date (newest first)
        loadedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Try to get the last edited entry from localStorage
        const lastEditedId = localStorage.getItem('last-edited-entry');
        let lastEditedEntry = lastEditedId ? loadedEntries.find(e => e.id === lastEditedId) : null;

        // If no last edited entry or it doesn't exist anymore, use the most recent entry
        if (!lastEditedEntry && loadedEntries.length > 0) {
          lastEditedEntry = loadedEntries[0];
        }

        // Set the current entry
        if (lastEditedEntry) {
          setCurrentEntry(lastEditedEntry);
        }

        setEntries(loadedEntries);
      } catch (error) {
        console.error('Failed to initialize entries:', error);
        setEntries([]);
        setCurrentEntry(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeEntries();
  }, []);

  // Save last edited entry ID when current entry changes
  useEffect(() => {
    if (currentEntry) {
      localStorage.setItem('last-edited-entry', currentEntry.id);
    }
  }, [currentEntry?.id]);

  const updateEntryContent = async (id: string, content: string) => {
    try {
      // If content is empty, delete the entry
      if (content.trim() === '') {
        await deleteEntry(id);
        return;
      }

      const updatedEntries = entries.map(entry =>
        entry.id === id ? { ...entry, content } : entry
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
      if (currentEntry && entries.find(e => e.id === currentEntry.id)?.content.trim() === '') {
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <EntryContext.Provider
      value={{
        entries,
        currentEntry,
        setCurrentEntry,
        updateEntryContent,
        createNewEntry,
        deleteEntry
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