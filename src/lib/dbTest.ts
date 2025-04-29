import { db } from './db';
import { Entry } from '@/contexts/EntryContext';

export async function verifyDatabaseOperations() {
  console.log('Starting database verification...');

  try {
    // Test saving and retrieving entries
    const testEntry: Entry = {
      id: 'test-entry',
      date: new Date().toISOString(),
      content: 'Test content'
    };

    console.log('Testing entry operations...');
    await db.saveEntry(testEntry);
    const allEntries = await db.getEntries();
    const savedEntry = allEntries.find(e => e.id === testEntry.id);
    console.log('Entry test result:', {
      saved: testEntry,
      retrieved: savedEntry,
      success: savedEntry && JSON.stringify(testEntry) === JSON.stringify(savedEntry)
    });

    // Test editor state operations
    console.log('Testing editor state operations...');
    const testState = {
      content: 'Test content',
      history: ['Test content'],
      historyIndex: 0
    };
    await db.saveEditorState(testState);
    const retrievedState = await db.getEditorState();
    console.log('Editor state test result:', {
      saved: testState,
      retrieved: retrievedState,
      success: retrievedState && JSON.stringify(testState) === JSON.stringify(retrievedState)
    });

    // Test delete operations
    console.log('Testing delete operations...');
    await db.deleteEntry(testEntry.id);
    const entriesAfterDelete = await db.getEntries();
    const isDeleted = !entriesAfterDelete.some(e => e.id === testEntry.id);
    console.log('Delete test result:', {
      entriesAfterDelete,
      isDeleted
    });

    console.log('Database verification completed successfully!');
    return true;
  } catch (error) {
    console.error('Database verification failed:', error);
    return false;
  }
} 