import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'amethyst-light' | 'amethyst-dark' | 'cosmic-light' | 'cosmic-dark' | 'perpetuity-light' | 'perpetuity-dark' | 'quantum-rose-light' | 'quantum-rose-dark';

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
    const savedTheme = localStorage.getItem(storageKey) as Theme;
    const validThemes: Theme[] = ['light', 'dark', 'amethyst-light', 'amethyst-dark', 'cosmic-light', 'cosmic-dark', 'perpetuity-light', 'perpetuity-dark', 'quantum-rose-light', 'quantum-rose-dark'];
    return validThemes.includes(savedTheme) ? savedTheme : 'dark';
  });

  // Update theme class and storage when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'amethyst-light', 'amethyst-dark', 'cosmic-light', 'cosmic-dark', 'perpetuity-light', 'perpetuity-dark', 'quantum-rose-light', 'quantum-rose-dark');
    
    // Add the current theme class
    root.classList.add(theme);

    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  // Listen for theme changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const newTheme = e.newValue as Theme;
        const validThemes: Theme[] = ['light', 'dark', 'amethyst-light', 'amethyst-dark', 'cosmic-light', 'cosmic-dark', 'perpetuity-light', 'perpetuity-dark', 'quantum-rose-light', 'quantum-rose-dark'];
        if (validThemes.includes(newTheme)) {
          setTheme(newTheme);
        }
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