import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useEntries } from '@/contexts/EntryContext';
import { editorReducer } from '@/lib/editorReducer';
import { loadEditorState, saveEditorState, initStorage } from '@/lib/storage';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { cn } from '@/lib/utils';
import { fonts } from '@/lib/fonts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sidebar } from '@/components/Sidebar';
import { StatusBar } from '@/components/StatusBar';
import { 
  ArrowDownToLine, 
  MoonIcon, 
  SunIcon, 
  Type, 
  Undo2,
  Redo2,
  Settings
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

export function Editor({ onShowOnboarding }: { onShowOnboarding?: () => void }) {
  // Theme handling
  const { theme, setTheme } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Font handling
  const [selectedFont, setSelectedFont] = useState('geist');
  const [fontSize, setFontSize] = useState(20);

  // Scroll state
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Get entries context
  const { currentEntry, updateEntryContent } = useEntries();

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
    } else {
      // Clear content if there's no current entry
      dispatch({
        type: 'INIT',
        payload: { content: '' }
      });
    }
  }, [currentEntry]);

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
      textarea.scrollTop = textarea.scrollHeight;
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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-12 px-4 flex justify-between items-center border-b border-border/10">
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
                      'font-instrument-italic italic': font.value === 'instrument-italic',
                    }
                  )}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <Settings className="h-4 w-4" />
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
                      variant={theme === 'light' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTheme('light')}
                      className={cn(
                        'flex-1 rounded-md',
                        theme === 'light' ? 'ring-2 ring-primary/40' : ''
                      )}
                    >
                      <SunIcon className="h-4 w-4 mr-1" /> Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                      className={cn(
                        'flex-1 rounded-md',
                        theme === 'dark' ? 'ring-2 ring-primary/40' : ''
                      )}
                    >
                      <MoonIcon className="h-4 w-4 mr-1" /> Dark
                    </Button>
                  </div>
                </div>
                <div className="border-t border-border my-4" />
                <Button
                  variant="default"
                  className="w-full text-sm font-medium"
                  onClick={() => onShowOnboarding && onShowOnboarding()}
                >
                  Show Onboarding
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>
      
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col px-4 md:px-8 lg:px-16 py-8 max-w-4xl mx-auto w-full">
        <div className="relative h-full">
          <textarea
            key={currentEntry?.id}
            className={cn(
              "w-full min-h-[calc(100vh-10rem)] resize-none bg-transparent",
              "text-lg leading-relaxed outline-none whitespace-pre-wrap",
              "transition-all duration-200",
              "placeholder:text-muted-foreground/50 md:text-[20px] text-[18px]",
              {
                'font-geist': selectedFont === 'geist',
                'font-space': selectedFont === 'space',
                'font-lora': selectedFont === 'lora',
                'font-instrument-italic': selectedFont === 'instrument-italic',
                'italic': selectedFont === 'instrument-italic',
              }
            )}
            style={{ fontSize: `${fontSize}px` }}
            value={state.content}
            onChange={handleChange}
            onScroll={handleScroll}
            placeholder="you can just type things..."
            autoFocus
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