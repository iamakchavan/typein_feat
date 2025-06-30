import { db } from './db';

interface StorageData {
  content: string;
  history: string[];
  historyIndex: number;
}

interface FontPreferences {
  selectedFont: string;
  fontSize: number;
}

// Initialize and verify database access
export const initStorage = async (): Promise<boolean> => {
  try {
    // Try to initialize the database
    await db.init();
    
    // Verify database is working
    const isWorking = await db.verifyDatabase();
    
    if (!isWorking) {
      console.error('Database verification failed, storage may not work correctly');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    return false;
  }
};

/**
 * Save content to IndexedDB with localStorage fallback
 */
export const saveEditorState = async (data: StorageData): Promise<void> => {
  try {
    await db.saveEditorState(data);
  } catch (error) {
    console.error('Failed to save to IndexedDB:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem('editor-state', JSON.stringify(data));
    } catch (localError) {
      console.error('Failed to save to localStorage:', localError);
    }
  }
};

/**
 * Load content from IndexedDB with localStorage fallback
 */
export const loadEditorState = async (): Promise<StorageData | null> => {
  try {
    const state = await db.getEditorState();
    if (state) return state;

    // Try localStorage if IndexedDB returns null
    const localState = localStorage.getItem('editor-state');
    if (localState) {
      return JSON.parse(localState);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load from IndexedDB:', error);
    // Try localStorage as fallback
    try {
      const localState = localStorage.getItem('editor-state');
      if (localState) {
        return JSON.parse(localState);
      }
    } catch (localError) {
      console.error('Failed to load from localStorage:', localError);
    }
    return null;
  }
};

/**
 * Save font preferences to IndexedDB with localStorage fallback
 */
export const saveFontPreferences = async (preferences: FontPreferences): Promise<void> => {
  try {
    await db.saveFontPreferences(preferences);
  } catch (error) {
    console.error('Failed to save font preferences to IndexedDB:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem('font-preferences', JSON.stringify(preferences));
    } catch (localError) {
      console.error('Failed to save font preferences to localStorage:', localError);
    }
  }
};

/**
 * Load font preferences from IndexedDB with localStorage fallback
 */
export const loadFontPreferences = async (): Promise<FontPreferences | null> => {
  try {
    const preferences = await db.getFontPreferences();
    if (preferences) return preferences;

    // Try localStorage if IndexedDB returns null
    const localPreferences = localStorage.getItem('font-preferences');
    if (localPreferences) {
      return JSON.parse(localPreferences);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load font preferences from IndexedDB:', error);
    // Try localStorage as fallback
    try {
      const localPreferences = localStorage.getItem('font-preferences');
      if (localPreferences) {
        return JSON.parse(localPreferences);
      }
    } catch (localError) {
      console.error('Failed to load font preferences from localStorage:', localError);
    }
    return null;
  }
};