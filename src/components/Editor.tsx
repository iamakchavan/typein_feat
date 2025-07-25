import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useEntries } from '@/contexts/EntryContext';
import { editorReducer } from '@/lib/editorReducer';
import { loadEditorState, saveEditorState, initStorage } from '@/lib/storage';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { cn } from '@/lib/utils';
import { fonts } from '@/lib/fonts';
import packageJson from '../../package.json';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sidebar } from '@/components/Sidebar';
import { StatusBar } from '@/components/StatusBar';
import { CommandPalette } from '@/components/CommandPalette';
import { 
  ArrowDownToLine, 
  MoonIcon, 
  SunIcon, 
  Type, 
  Undo2,
  Redo2
} from 'lucide-react';

// Custom Fullscreen icons
const FullscreenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M3 7V3h4" />
    <path d="M21 7V3h-4" />
    <path d="M3 17v4h4" />
    <path d="M21 17v4h-4" />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M7 3v4H3" />
    <path d="M17 3v4h4" />
    <path d="M7 21v-4H3" />
    <path d="M17 21v-4h4" />
  </svg>
);

const SettingsIcon = () => (
  <svg 
    width="14" 
    height="14" 
    viewBox="0 0 14 14" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
  >
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M5.45494 0.450248C5.4805 0.194648 5.69558 0 5.95246 0H8.04747C8.30435 0 8.51943 0.194647 8.54499 0.450248L8.73073 2.30766C9.26926 2.50637 9.76418 2.79513 10.1972 3.15568L11.9 2.38721C12.1342 2.28155 12.4103 2.37049 12.5387 2.59295L13.5862 4.40728C13.7147 4.62975 13.6536 4.91334 13.4451 5.06327L11.9286 6.15339C11.9755 6.42858 12 6.71143 12 7C12 7.28864 11.9755 7.57157 11.9286 7.84682L13.4451 8.93696C13.6536 9.0869 13.7147 9.37049 13.5862 9.59295L12.5387 11.4073C12.4103 11.6297 12.1342 11.7187 11.9 11.613L10.197 10.8445C9.76404 11.205 9.26918 11.4937 8.73073 11.6923L8.54499 13.5498C8.51943 13.8054 8.30435 14 8.04747 14H5.95246C5.69558 14 5.4805 13.8054 5.45494 13.5498L5.2692 11.6923C4.73067 11.4936 4.23575 11.2049 3.80271 10.8443L2.0999 11.6128C1.86577 11.7185 1.58966 11.6295 1.46122 11.4071L0.413712 9.59272C0.285275 9.37026 0.346303 9.08667 0.554879 8.93673L2.07134 7.84661C2.02441 7.57142 1.99996 7.28857 1.99996 7C1.99996 6.71136 2.02442 6.42843 2.07138 6.15318L0.554879 5.06304C0.346302 4.9131 0.285274 4.62951 0.413712 4.40705L1.46122 2.59272C1.58966 2.37025 1.86577 2.28131 2.0999 2.38698L3.80289 3.15552C4.23589 2.79505 4.73075 2.50634 5.2692 2.30766L5.45494 0.450248ZM5.27747 8.01699L5.25611 7.98C5.09301 7.69039 4.99996 7.35606 4.99996 7C4.99996 5.89543 5.8954 5 6.99996 5C7.73323 5 8.37433 5.39461 8.72249 5.98306L8.74379 6.01995C8.90691 6.30957 8.99996 6.64392 8.99996 7C8.99996 8.10457 8.10453 9 6.99996 9C6.26672 9 5.62563 8.60541 5.27747 8.01699Z" 
      fill="currentColor" 
      fillOpacity="0.5"
    />
  </svg>
);

export function Editor({ 
  onShowOnboarding, 
  openCommandPalette: externalOpenCommandPalette, 
  setOpenCommandPalette: setExternalOpenCommandPalette 
}: { 
  onShowOnboarding?: () => void;
  openCommandPalette?: boolean;
  setOpenCommandPalette?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  // Theme and font handling
  const { theme, setTheme, selectedFont, setSelectedFont, fontSize, setFontSize } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Scroll state
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Command palette
  const { isOpen: isCommandPaletteOpen, openPalette, closePalette: closeCommandPalette } = useCommandPalette();

  // Get entries context
  const { currentEntry, updateEntryContent } = useEntries();

  // Track if we should auto-focus (for new entries on mobile)
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);

  // Handle external command palette trigger
  useEffect(() => {
    if (externalOpenCommandPalette && setExternalOpenCommandPalette) {
      openPalette();
      setExternalOpenCommandPalette(false);
    }
  }, [externalOpenCommandPalette, setExternalOpenCommandPalette, openPalette]);

  // Initialize editor state
  const [state, dispatch] = useReducer(editorReducer, {
    content: '',
    baseContent: '',
    lastSaved: null,
    isDirty: false,
    history: [],
    historyIndex: 0,
  });

  // Keyboard shortcuts
  useKeyboardShortcut({ key: 's', metaKey: true }, (e) => {
    e.preventDefault();
    dispatch({ type: 'SAVE' });
  });

  useKeyboardShortcut({ key: 'z', metaKey: true }, (e) => {
    e.preventDefault();
    dispatch({ type: 'UNDO' });
  });

  useKeyboardShortcut({ key: 'y', metaKey: true }, (e) => {
    e.preventDefault();
    dispatch({ type: 'REDO' });
  });

  // Load content from storage when component mounts
  useEffect(() => {
    const loadContent = async () => {
      try {
        if (currentEntry) {
          // If we have a current entry, use its content
          dispatch({
            type: 'INIT',
            payload: { content: currentEntry.content }
          });
        } else {
          // Otherwise try to load from editor state
          const savedContent = await loadEditorState();
          if (savedContent) {
            dispatch({
              type: 'INIT',
              payload: { content: savedContent.content }
            });
          } else {
            dispatch({
              type: 'INIT',
              payload: { content: '' }
            });
          }
        }
      } catch (error) {
        console.error('Failed to load content:', error);
        dispatch({
          type: 'INIT',
          payload: { content: '' }
        });
      }
    };

    loadContent();
  }, [currentEntry]);

  // Update editor content when current entry changes
  useEffect(() => {
    if (currentEntry) {
      dispatch({ 
        type: 'INIT', 
        payload: { content: currentEntry.content }
      });

      // Determine if we should auto-focus
      // Auto-focus if:
      // 1. It's a new entry (different ID from last one)
      // 2. The entry is empty (indicating it was just created)
      // 3. We're on mobile
      const isNewEntry = currentEntry.id !== lastEntryId;
      const isEmptyEntry = currentEntry.content.trim() === '';
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      
      // Only auto-focus on mobile for truly new empty entries
      setShouldAutoFocus(isNewEntry && isEmptyEntry && isMobile);

      setLastEntryId(currentEntry.id);
    } else {
      // Clear content if there's no current entry
      dispatch({
        type: 'INIT',
        payload: { content: '' }
      });
      setShouldAutoFocus(false);
      setLastEntryId(null);
    }
  }, [currentEntry, lastEntryId]);

  // Save content changes to current entry
  useEffect(() => {
    if (currentEntry && state.isDirty) {
      const saveContent = async () => {
        try {
          // Don't save empty entries
          if (state.content.trim() === '') {
            return;
          }

          await updateEntryContent(currentEntry.id, state.content);
          await saveEditorState({
            content: state.content,
            history: state.history,
            historyIndex: state.historyIndex
          });
          dispatch({ type: 'SAVE' });
        } catch (error) {
          console.error('Failed to save content:', error);
        }
      };

      // Debounce save to avoid too frequent saves
      const timeoutId = setTimeout(saveContent, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [state.content, state.isDirty, currentEntry, updateEntryContent, state.history, state.historyIndex]);

  // Handle content changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    dispatch({ type: 'SET_CONTENT', payload: newContent });
  }, []);

  // Handle textarea scroll
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const isNearBottom = textarea.scrollHeight - textarea.scrollTop - textarea.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.scrollTo({
        top: textarea.scrollHeight,
        behavior: 'smooth'
      });
      setShowScrollButton(false);
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Update fullscreen state when exiting via Esc key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle window unload to clean up empty entries
  useEffect(() => {
    const handleUnload = () => {
      if (currentEntry && state.content.trim() === '') {
        updateEntryContent(currentEntry.id, '');
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentEntry, state.content, updateEntryContent]);

  // Calculate stats
  const wordCount = (state.content || '').trim() ? (state.content || '').trim().split(/\s+/).length : 0;
  const charCount = (state.content || '').length;

  useEffect(() => {
    const handleDbError = (event: CustomEvent<{ message: string }>) => {
      // You can replace this with your preferred notification system
      console.error('Database Error:', event.detail.message);
      // Set dirty state to indicate save failed
      dispatch({ type: 'SET_DIRTY', payload: true });
    };

    window.addEventListener('db-error', handleDbError as EventListener);
    return () => {
      window.removeEventListener('db-error', handleDbError as EventListener);
    };
  }, []);

  // Initialize storage
  useEffect(() => {
    const init = async () => {
      const isStorageWorking = await initStorage();
      if (!isStorageWorking) {
        console.warn('Storage initialization failed, falling back to localStorage');
        window.dispatchEvent(new CustomEvent('db-error', { 
          detail: { message: 'Storage initialization failed, some features may not work properly' } 
        }));
      }
    };
    init();
  }, []);



  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-12 px-4 flex justify-between items-center border-b border-border/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <svg
              width="14"
              height="12"
              viewBox="0 0 14 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              style={{ color: 'currentColor' }}
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.8 12C3.11984 12 2.27976 12 1.63803 11.673C1.07354 11.3854 0.614601 10.9265 0.32698 10.362C0 9.72024 0 8.88016 0 7.2V4.8C0 3.11984 0 2.27976 0.32698 1.63803C0.614601 1.07354 1.07354 0.614601 1.63803 0.32698C2.27976 0 3.11984 0 4.8 0H9.2C10.8802 0 11.7202 0 12.362 0.32698C12.9265 0.614601 13.3854 1.07354 13.673 1.63803C14 2.27976 14 3.11984 14 4.8V7.2C14 8.88016 14 9.72024 13.673 10.362C13.3854 10.9265 12.9265 11.3854 12.362 11.673C11.7202 12 10.8802 12 9.2 12H4.8ZM10.1 1.5C10.9401 1.5 11.3601 1.5 11.681 1.66349C11.9632 1.8073 12.1927 2.03677 12.3365 2.31901C12.5 2.63988 12.5 3.05992 12.5 3.9V8.1C12.5 8.94008 12.5 9.36012 12.3365 9.68099C12.1927 9.96323 11.9632 10.1927 11.681 10.3365C11.3601 10.5 10.9401 10.5 10.1 10.5H9.9C9.05992 10.5 8.63988 10.5 8.31901 10.3365C8.03677 10.1927 7.8073 9.96323 7.66349 9.68099C7.5 9.36012 7.5 8.94008 7.5 8.1V3.9C7.5 3.05992 7.5 2.63988 7.66349 2.31901C7.8073 2.03677 8.03677 1.8073 8.31901 1.66349C8.63988 1.5 9.05992 1.5 9.9 1.5H10.1ZM1.96094 2.82422C1.96094 2.47904 2.24076 2.19922 2.58594 2.19922H4.08594C4.43112 2.19922 4.71094 2.47904 4.71094 2.82422C4.71094 3.1694 4.43112 3.44922 4.08594 3.44922H2.58594C2.24076 3.44922 1.96094 3.1694 1.96094 2.82422ZM2.58594 4.19531C2.24076 4.19531 1.96094 4.47513 1.96094 4.82031C1.96094 5.16549 2.24076 5.44531 2.58594 5.44531H4.08594C4.43112 5.44531 4.71094 5.16549 4.71094 4.82031C4.71094 4.47513 4.43112 4.19531 4.08594 4.19531H2.58594Z"
              />
            </svg>
            <span className="sr-only">Open Sidebar</span>
          </Button>
          <Select value={selectedFont} onValueChange={setSelectedFont}>
            <SelectTrigger 
              className={cn(
                "h-8 w-[200px] hover:bg-primary/10 transition-colors border-border",
                {
                'font-geist': selectedFont === 'geist',
                'font-space': selectedFont === 'space',
                'font-lora': selectedFont === 'lora',
                'font-instrument-italic italic': selectedFont === 'instrument-italic',
                }
              )}
            >
              <Type className="h-4 w-4 text-muted-foreground mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent 
              className="min-w-[200px] border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
              position="popper"
              sideOffset={4}
            >
              {fonts.map(font => (
                <SelectItem 
                  key={font.value} 
                  value={font.value}
                  className={cn(
                    "text-base cursor-pointer transition-colors",
                    "data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary",
                    {
                      'font-geist': font.value === 'geist',
                      'font-space': font.value === 'space',
                      'font-lora': font.value === 'lora',
                      'font-instrument-italic': font.value === 'instrument-italic',
                      'font-playfair': font.value === 'playfair',
                    },
                    font.value === 'instrument-italic' && 'italic'
                  )}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Centered ⌘K hint */}
        <div className="hidden md:flex items-center text-xs text-muted-foreground/60 bg-muted/20 px-2 py-1 rounded-md relative overflow-hidden border border-primary/20 shadow-sm">
          {/* Aurora glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-[shimmer_3s_ease-in-out_infinite]"></div>
          <div className="relative z-10 flex items-center">
            <kbd className="text-[14px] font-medium">⌘K</kbd>
            <span className="ml-1">for quick search</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden md:flex h-8 w-8 hover:bg-primary/10 hover:text-primary"
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            <span className="sr-only">Toggle fullscreen</span>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              >
                <SettingsIcon />
                <span className="sr-only">Settings</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 rounded-xl shadow-lg border border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-0 overflow-hidden">
              <div className="px-5 py-5">
                <div className="mb-3">
                  <span className="block text-[11px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">Font Size</span>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[fontSize]}
                      onValueChange={([value]) => setFontSize(value)}
                      max={28}
                      min={16}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-10 text-sm text-muted-foreground text-right">{fontSize}px</span>
                  </div>
                </div>
                <div className="border-t border-border my-4" />
                <div className="mb-3">
                  <span className="block text-[11px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">Theme</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={theme === 'light' || theme.endsWith('-light') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        // If currently on a special theme, switch to its light variant, otherwise use light
                        if (theme.includes('-')) {
                          // Handle multi-word theme names (e.g., quantum-rose-dark -> quantum-rose)
                          const baseTheme = theme.endsWith('-dark') 
                            ? theme.slice(0, -5) // Remove '-dark'
                            : theme.endsWith('-light') 
                              ? theme.slice(0, -6) // Remove '-light'
                              : theme;
                          const lightVariant = `${baseTheme}-light` as const;
                          // Type-safe mapping of valid light themes
                          const validLightThemes = {
                            'amethyst-light': 'amethyst-light',
                            'cosmic-light': 'cosmic-light', 
                            'perpetuity-light': 'perpetuity-light',
                            'quantum-rose-light': 'quantum-rose-light',
                            'clean-slate-light': 'clean-slate-light'
                          } as const;
                          
                          if (lightVariant in validLightThemes) {
                            setTheme(validLightThemes[lightVariant as keyof typeof validLightThemes]);
                          } else {
                            setTheme('light');
                          }
                        } else {
                          setTheme('light');
                        }
                      }}
                      className={cn(
                        'flex-1 rounded-md',
                        (theme === 'light' || theme.endsWith('-light')) ? 'ring-2 ring-primary/40' : ''
                      )}
                    >
                      <SunIcon className="h-4 w-4 mr-1" /> Light
                    </Button>
                    <Button
                      variant={theme === 'dark' || theme.endsWith('-dark') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        // If currently on a special theme, switch to its dark variant, otherwise use dark
                        if (theme.includes('-')) {
                          // Handle multi-word theme names (e.g., quantum-rose-light -> quantum-rose)
                          const baseTheme = theme.endsWith('-dark') 
                            ? theme.slice(0, -5) // Remove '-dark'
                            : theme.endsWith('-light') 
                              ? theme.slice(0, -6) // Remove '-light'
                              : theme;
                          const darkVariant = `${baseTheme}-dark` as const;
                          // Type-safe mapping of valid dark themes
                          const validDarkThemes = {
                            'amethyst-dark': 'amethyst-dark',
                            'cosmic-dark': 'cosmic-dark',
                            'perpetuity-dark': 'perpetuity-dark', 
                            'quantum-rose-dark': 'quantum-rose-dark',
                            'clean-slate-dark': 'clean-slate-dark'
                          } as const;
                          
                          if (darkVariant in validDarkThemes) {
                            setTheme(validDarkThemes[darkVariant as keyof typeof validDarkThemes]);
                          } else {
                            setTheme('dark');
                          }
                        } else {
                          setTheme('dark');
                        }
                      }}
                      className={cn(
                        'flex-1 rounded-md',
                        (theme === 'dark' || theme.endsWith('-dark')) ? 'ring-2 ring-primary/40' : ''
                      )}
                    >
                      <MoonIcon className="h-4 w-4 mr-1" /> Dark
                    </Button>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="block text-[11px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">Special Themes</span>
                  <Select 
                    value={theme} 
                    onValueChange={setTheme}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a special theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show light variants when light theme is selected */}
                      {(theme === 'light' || theme.endsWith('-light')) && (
                        <>
                          <SelectItem value="light">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300"></div>
                              Default Light
                            </div>
                          </SelectItem>
                          <SelectItem value="amethyst-light">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-purple-300 to-pink-300"></div>
                              Amethyst Light
                            </div>
                          </SelectItem>
                          <SelectItem value="cosmic-light">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-blue-300 to-purple-400"></div>
                              Cosmic Light
                            </div>
                          </SelectItem>
                          <SelectItem value="perpetuity-light">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-teal-300 to-cyan-400"></div>
                              Perpetuity Light
                            </div>
                          </SelectItem>
                          <SelectItem value="quantum-rose-light">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-pink-300 to-rose-400"></div>
                              Quantum Rose Light
                            </div>
                          </SelectItem>
                          <SelectItem value="clean-slate-light">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-slate-200 to-indigo-300"></div>
                              Clean Slate Light
                            </div>
                          </SelectItem>
                        </>
                      )}
                      {/* Show dark variants when dark theme is selected */}
                      {(theme === 'dark' || theme.endsWith('-dark')) && (
                        <>
                          <SelectItem value="dark">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-gray-700 to-gray-800 border border-gray-600"></div>
                              Default Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="amethyst-dark">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600"></div>
                              Amethyst Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="cosmic-dark">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-blue-800 to-purple-900"></div>
                              Cosmic Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="perpetuity-dark">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-teal-600 to-cyan-700"></div>
                              Perpetuity Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="quantum-rose-dark">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-700"></div>
                              Quantum Rose Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="clean-slate-dark">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full bg-gradient-to-r from-slate-600 to-indigo-600"></div>
                              Clean Slate Dark
                            </div>
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t border-border my-4" />
                <Button
                  variant="default"
                  className="w-full text-sm font-medium"
                  onClick={() => onShowOnboarding && onShowOnboarding()}
                >
                  Show Onboarding
                </Button>
                <div className="border-t border-border my-4" />
                <div className="space-y-2">
                  <span className="block text-[11px] font-semibold text-muted-foreground tracking-widest uppercase text-center">Support</span>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">For queries and feedback</p>
                    <a
                      href="mailto:info@typein.space"
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-primary/10 border border-border/50 hover:border-primary/30"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2"/>
                        <path d="m22 7-10 5L2 7"/>
                      </svg>
                      info@typein.space
                    </a>
                  </div>
                </div>
                <div className="mt-3 pt-2">
                  <div className="text-center">
                    <span className="text-[12px] text-muted-foreground/60 font-mono tracking-wide">
                      v{packageJson.version}
                    </span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>
      
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
      />

      <main className="flex-1 flex flex-col px-4 md:px-8 lg:px-16 py-8 max-w-4xl mx-auto w-full overflow-hidden">
        {/* SEO: Hidden H1 tag for search engines */}
        <h1 className="sr-only">typein - Free Minimalist Writing App | Distraction-Free Text Editor</h1>
        <div className="relative flex-1 min-h-0">
          <textarea
            key={currentEntry?.id}
            className={cn(
              "w-full h-full resize-none bg-transparent",
              "text-lg leading-relaxed outline-none whitespace-pre-wrap",
              "transition-all duration-200",
              "placeholder:text-muted-foreground/50 md:text-[20px] text-[18px]"
            )}
            style={{ fontSize: `var(--editor-font-size)` }}
            value={state.content}
            onChange={handleChange}
            onScroll={handleScroll}
            placeholder="you can just typein..."
            autoFocus={shouldAutoFocus || window.matchMedia('(min-width: 768px)').matches}
            onFocus={() => {
              // Clear the auto-focus flag after it's been used
              if (shouldAutoFocus) {
                setShouldAutoFocus(false);
              }
            }}
            spellCheck="true"
          />
          {showScrollButton && (
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-20 right-4 md:right-8 lg:right-16 h-8 w-8 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-opacity"
              onClick={scrollToBottom}
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span className="sr-only">Scroll to bottom</span>
            </Button>
          )}
        </div>
      </main>
      
      <StatusBar 
        wordCount={wordCount}
        charCount={charCount}
        lastSaved={state.lastSaved}
        isDirty={state.isDirty}
        shortcuts={[
          { icon: <Undo2 className="h-3 w-3" />, combo: '⌘ + Z' },
          { icon: <Redo2 className="h-3 w-3" />, combo: '⌘ + Y' },
        ]}
      />
    </div>
  );
}