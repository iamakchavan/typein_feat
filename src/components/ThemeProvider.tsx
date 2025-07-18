import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { loadFontPreferences, saveFontPreferences } from '@/lib/storage';

type Theme = 'dark' | 'light' | 'amethyst-light' | 'amethyst-dark' | 'cosmic-light' | 'cosmic-dark' | 'perpetuity-light' | 'perpetuity-dark' | 'quantum-rose-light' | 'quantum-rose-dark' | 'clean-slate-light' | 'clean-slate-dark';

type Font = 'geist' | 'space' | 'lora' | 'instrument-italic' | 'playfair';

type ThemeProviderProps = {
  children: React.ReactNode;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  selectedFont: Font;
  setSelectedFont: (font: Font) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
};

const initialState: ThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
  selectedFont: 'geist',
  setSelectedFont: () => null,
  fontSize: 20,
  setFontSize: () => null,
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
    const validThemes: Theme[] = ['light', 'dark', 'amethyst-light', 'amethyst-dark', 'cosmic-light', 'cosmic-dark', 'perpetuity-light', 'perpetuity-dark', 'quantum-rose-light', 'quantum-rose-dark', 'clean-slate-light', 'clean-slate-dark'];
    return validThemes.includes(savedTheme) ? savedTheme : 'dark';
  });

  // Font state
  const [selectedFont, setSelectedFont] = useState<Font>('geist');
  const [fontSize, setFontSize] = useState<number>(20);

  // Load font preferences on mount
  useEffect(() => {
    const loadFontSettings = async () => {
      try {
        const savedPreferences = await loadFontPreferences();
        if (savedPreferences) {
          setSelectedFont(savedPreferences.selectedFont as Font);
          setFontSize(savedPreferences.fontSize);
        }
      } catch (error) {
        console.error('Failed to load font preferences:', error);
      }
    };
    loadFontSettings();
  }, []);

  // Save font preferences when they change
  useEffect(() => {
    const saveFontSettings = async () => {
      try {
        await saveFontPreferences({
          selectedFont,
          fontSize
        });
      } catch (error) {
        console.error('Failed to save font preferences:', error);
      }
    };
    
    // Only save if we have non-default values (to avoid saving on initial load)
    if (selectedFont !== 'geist' || fontSize !== 20) {
      saveFontSettings();
    }
  }, [selectedFont, fontSize]);

  // Update theme class and storage when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'amethyst-light', 'amethyst-dark', 'cosmic-light', 'cosmic-dark', 'perpetuity-light', 'perpetuity-dark', 'quantum-rose-light', 'quantum-rose-dark', 'clean-slate-light', 'clean-slate-dark');
    
    // Add the current theme class
    root.classList.add(theme);

    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  // Apply font globally
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all font classes
    root.classList.remove('font-geist', 'font-space', 'font-lora', 'font-instrument-italic', 'font-playfair');
    
    // Add the current font class
    root.classList.add(`font-${selectedFont}`);
    
    // Set font size CSS variable
    root.style.setProperty('--editor-font-size', `${fontSize}px`);
  }, [selectedFont, fontSize]);

  // Listen for theme changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const newTheme = e.newValue as Theme;
        const validThemes: Theme[] = ['light', 'dark', 'amethyst-light', 'amethyst-dark', 'cosmic-light', 'cosmic-dark', 'perpetuity-light', 'perpetuity-dark', 'quantum-rose-light', 'quantum-rose-dark', 'clean-slate-light', 'clean-slate-dark'];
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
        selectedFont,
        setSelectedFont: (newFont: Font) => {
          setSelectedFont(newFont);
        },
        fontSize,
        setFontSize: (newSize: number) => {
          setFontSize(newSize);
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