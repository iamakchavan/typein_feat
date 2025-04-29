import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
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
  storageKey = 'editor-theme',
  ...props
}: ThemeProviderProps) {
  // Initialize from localStorage or default to dark
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(storageKey);
    return savedTheme === 'light' ? 'light' : 'dark';
  });

  // Update theme class and storage when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  // Listen for theme changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setTheme(e.newValue === 'light' ? 'light' : 'dark');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  return (
    <ThemeProviderContext.Provider
      value={{
        theme,
        setTheme: (newTheme: Theme) => {
          setTheme(newTheme);
        },
      }}
      {...props}
    >
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