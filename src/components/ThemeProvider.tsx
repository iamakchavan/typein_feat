import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/db';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'editor-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Try IndexedDB first
        const savedTheme = await db.getTheme();
        if (savedTheme) {
          setTheme(savedTheme as Theme);
          return;
        }
        
        // Fallback to localStorage
        const localTheme = localStorage.getItem(storageKey);
        if (localTheme) {
          setTheme(localTheme as Theme);
          // Sync to IndexedDB
          await db.saveTheme(localTheme as Theme);
        } else {
          // If no theme is set, force dark mode
          setTheme('dark');
          localStorage.setItem(storageKey, 'dark');
          await db.saveTheme('dark');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
        // On error, force dark mode
        setTheme('dark');
        try {
          localStorage.setItem(storageKey, 'dark');
        } catch (e) {
          console.error('Failed to save theme to localStorage:', e);
        }
      }
    };

    // Force dark mode immediately while loading
    document.documentElement.classList.add('dark');
    loadTheme();

    // Cleanup function to prevent theme flash on unmount
    return () => {
      if (localStorage.getItem(storageKey) !== 'light') {
        document.documentElement.classList.add('dark');
      }
    };
  }, [storageKey]);

  // Update theme class and storage when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    // Save theme preference
    try {
      localStorage.setItem(storageKey, theme);
      db.saveTheme(theme).catch(console.error);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [theme, storageKey]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};