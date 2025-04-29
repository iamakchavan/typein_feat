import { db } from './db';

interface StorageData {
  content: string;
  history: string[];
  historyIndex: number;
}

/**
 * Save content to IndexedDB
 */
export const saveEditorState = async (data: StorageData): Promise<void> => {
  try {
    await db.saveEditorState(data);
  } catch (error) {
    console.error('Failed to save to IndexedDB:', error);
  }
};

/**
 * Load content from IndexedDB
 */
export const loadEditorState = async (): Promise<StorageData | null> => {
  try {
    return await db.getEditorState();
  } catch (error) {
    console.error('Failed to load from IndexedDB:', error);
    return null;
  }
};