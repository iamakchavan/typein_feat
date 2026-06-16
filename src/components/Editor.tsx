import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useEntries } from '@/contexts/EntryContext';
import { editorReducer } from '@/lib/editorReducer';
import { loadEditorState, saveEditorState, initStorage } from '@/lib/storage';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { cn } from '@/lib/utils';
import { fonts } from '@/lib/fonts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Sidebar } from '@/components/Sidebar';
import { StatusBar } from '@/components/StatusBar';
import { CommandPalette } from '@/components/CommandPalette';
import { getEntryPlainText, isContentEmpty } from '@/lib/entryHelpers';
import { 
  ArrowDownToLine,
  X,
  Check,
  Search
} from 'lucide-react';
import { SettingsModal } from '@/components/SettingsModal';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppleScroll } from '@/hooks/useAppleScroll';
import { getCaretCoordinates } from '@/lib/caretCoordinates';

const isMobileDevice = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.innerWidth < 768
);

const spring = isMobileDevice
  ? { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.28 }
  : { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 };

const springMed = isMobileDevice
  ? { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.32 }
  : { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 };



import { BackupStatusDialog } from '@/components/BackupStatusDialog';
import { exportBackup, importBackup, getReferencedMediaIds, getReferencedMediaCount } from '@/lib/backup';
import { db } from '@/lib/db';
import { mediaStorage } from '@/lib/mediaStorage';

import { FullscreenIcon, ExitFullscreenIcon, SettingsIcon, FontSelectorIcon } from './Icons';

export function Editor({ 
  openCommandPalette: externalOpenCommandPalette, 
  setOpenCommandPalette: setExternalOpenCommandPalette 
}: { 
  openCommandPalette?: boolean;
  setOpenCommandPalette?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  // Theme and font handling
  const { selectedFont, setSelectedFont } = useTheme();
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFontSheetOpen, setIsFontSheetOpen] = useState(false);

  const getScrollContainer = useCallback(() => {
    return document.querySelector('textarea') as HTMLElement | null;
  }, []);

  const getCaretRect = useCallback(() => {
    const textarea = document.querySelector('textarea');
    if (!textarea || document.activeElement !== textarea) return null;

    const caret = getCaretCoordinates(textarea, textarea.selectionStart);
    return { top: caret.top, bottom: caret.top + caret.height };
  }, []);

  useAppleScroll({ getScrollContainer, getCaretRect, bottomMargin: isMobile ? 180 : 220 });

  // Backup status dialog state
  const [backupDialog, setBackupDialog] = useState<{
    isOpen: boolean;
    type: 'export' | 'import';
    status: 'preparing' | 'processing' | 'complete' | 'error';
    progress: number;
    stats?: {
      entriesProcessed?: number;
      totalEntries?: number;
      mediaProcessed?: number;
      totalMedia?: number;
    };
    error?: string;
  }>({
    isOpen: false,
    type: 'export',
    status: 'preparing',
    progress: 0,
  });

  // Backup/Restore handlers
  const handleExportBackup = async () => {
    let totalEntries = 0;
    let totalMedia = 0;
    try {
      const allEntries = await db.getEntries();
      const validEntries = allEntries.filter(entry => entry && typeof entry === 'object' && entry.id);
      totalEntries = validEntries.length;
      
      const referencedMediaIds = getReferencedMediaIds(validEntries);
      const media = await mediaStorage.getAllMedia();
      const validMedia = media.filter(m => referencedMediaIds.has(m.id));
      const validMediaIds = new Set(validMedia.map(m => m.id));
      totalMedia = getReferencedMediaCount(validEntries, validMediaIds);
    } catch (e) {
      console.warn('Failed to fetch counts for export dialog', e);
      totalEntries = 0;
      totalMedia = 0;
    }

    setBackupDialog({
      isOpen: true,
      type: 'export',
      status: 'preparing',
      progress: 0,
      stats: {
        entriesProcessed: 0,
        totalEntries,
        mediaProcessed: 0,
        totalMedia,
      }
    });

    try {
      setBackupDialog(prev => ({ 
        ...prev, 
        status: 'processing', 
        progress: 30,
        stats: {
          entriesProcessed: Math.round(totalEntries * 0.3),
          totalEntries,
          mediaProcessed: Math.round(totalMedia * 0.3),
          totalMedia,
        }
      }));
      
      const result = await exportBackup();
      
      setBackupDialog(prev => ({ 
        ...prev, 
        progress: 100, 
        status: 'complete',
        stats: {
          entriesProcessed: result.entriesCount,
          totalEntries: result.entriesCount,
          mediaProcessed: result.mediaCount,
          totalMedia: result.mediaCount,
        }
      }));
      
      setTimeout(() => {
        setBackupDialog(prev => ({ ...prev, isOpen: false }));
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export backup. Please try again.';
      setBackupDialog(prev => ({
        ...prev,
        status: 'error',
        error: message,
      }));
    }
  };

  const handleImportBackup = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setBackupDialog({
        isOpen: true,
        type: 'import',
        status: 'preparing',
        progress: 0,
      });

      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(file);
        const backupFile = zip.file('backup.json');
        let totalEntries = 0;
        let totalMedia = 0;
        
        if (backupFile) {
          const content = await backupFile.async('string');
          const data = JSON.parse(content);
          totalEntries = data.entries?.length || 0;
          totalMedia = data.mediaFiles?.length || 0;
        }

        setBackupDialog(prev => ({ 
          ...prev, 
          status: 'processing', 
          progress: 20,
          stats: {
            entriesProcessed: 0,
            totalEntries,
            mediaProcessed: 0,
            totalMedia,
          }
        }));
        
        const result = await importBackup(file);
        
        if (result.success) {
          setBackupDialog(prev => ({
            ...prev,
            progress: 100,
            status: 'complete',
            stats: {
              entriesProcessed: result.entriesImported,
              totalEntries: result.entriesImported,
              mediaProcessed: result.mediaImported,
              totalMedia: result.mediaImported,
            },
          }));
          
          setTimeout(() => window.location.reload(), 2000);
        } else {
          setBackupDialog(prev => ({
            ...prev,
            status: 'error',
            error: result.errors[0] || 'Failed to import backup',
          }));
        }
      } catch (error) {
        setBackupDialog(prev => ({
          ...prev,
          status: 'error',
          error: 'Failed to import backup. Please try again.',
        }));
      }
    };
    input.click();
  };

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

  // Track window width for responsive font picker labels
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useKeyboardShortcut(
    [
      { key: ',', ctrlKey: true },
      { key: ',', metaKey: true },
    ],
    (e) => {
      e.preventDefault();
      setIsSettingsOpen(prev => !prev);
    }
  );

  useKeyboardShortcut(
    [
      { key: '\\', ctrlKey: true },
      { key: '\\', metaKey: true },
      { key: 'b', ctrlKey: true },
      { key: 'b', metaKey: true },
    ],
    (e) => {
      e.preventDefault();
      setIsSidebarOpen(prev => !prev);
    }
  );

  // Load content from storage when component mounts
  useEffect(() => {
    const loadContent = async () => {
      try {
        if (currentEntry) {
          // If we have a current entry, use its content
          // Convert to plain text if it's in BlockNote format
          const plainText = getEntryPlainText(currentEntry.content);
          dispatch({
            type: 'INIT',
            payload: { content: plainText }
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
      // Convert to plain text if it's in BlockNote format
      const plainText = getEntryPlainText(currentEntry.content);
      dispatch({ 
        type: 'INIT', 
        payload: { content: plainText }
      });

      // Determine if we should auto-focus
      // Auto-focus if:
      // 1. It's a new entry (different ID from last one)
      // 2. The entry is empty (indicating it was just created)
      // 3. We're on mobile
      const isNewEntry = currentEntry.id !== lastEntryId;
      const isEmptyEntry = isContentEmpty(currentEntry.content);
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

  // Toggle body class so CSS can hide/blur elements when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [isSidebarOpen]);



  return (
    <>
      <BackupStatusDialog
        isOpen={backupDialog.isOpen}
        onClose={() => setBackupDialog(prev => ({ ...prev, isOpen: false }))}
        type={backupDialog.type}
        status={backupDialog.status}
        progress={backupDialog.progress}
        stats={backupDialog.stats}
        error={backupDialog.error}
      />
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* Font selector bottom-sheet Modal */}
      <AnimatePresence>
        {isFontSheetOpen && (
          <DialogPrimitive.Root open={isFontSheetOpen} onOpenChange={setIsFontSheetOpen}>
            <DialogPrimitive.Portal forceMount>
              {/* Backdrop */}
              <DialogPrimitive.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 60,
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                  }}
                />
              </DialogPrimitive.Overlay>

              {/* Content Sheet */}
              <DialogPrimitive.Content asChild>
                <motion.div
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.85 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 300) {
                      setIsFontSheetOpen(false);
                    }
                  }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={springMed}
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 61,
                    background: 'hsl(var(--background))',
                    borderRadius: isMobile ? '24px 24px 0 0' : '32px 32px 0 0',
                    boxShadow: '0 -12px 60px rgba(0,0,0,0.15)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    maxWidth: 520,
                    margin: '0 auto',
                    maxHeight: isMobile ? '85vh' : '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Drag handle */}
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, paddingBottom: 2, flexShrink: 0 }}>
                    <div style={{ width: 38, height: 5, borderRadius: 99, background: 'hsl(var(--muted-foreground)/0.2)' }} />
                  </div>

                  {/* Header */}
                  <div style={{ padding: isMobile ? '10px 16px 14px' : '10px 24px 20px', position: 'relative', flexShrink: 0 }}>
                    <DialogPrimitive.Close asChild>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: isMobile ? 16 : 20,
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'hsl(var(--muted))',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'hsl(var(--muted-foreground))',
                        }}
                      >
                        <X size={16} />
                      </motion.button>
                    </DialogPrimitive.Close>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.04 }}
                    >
                      <div style={{
                        width: isMobile ? 44 : 56,
                        height: isMobile ? 44 : 56,
                        borderRadius: 99,
                        background: 'hsl(var(--primary)/0.1)',
                        color: 'hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: isMobile ? 12 : 16,
                      }}>
                        <FontSelectorIcon size={isMobile ? 20 : 24} />
                      </div>
                      <div style={{
                        fontSize: isMobile ? 20 : 24,
                        fontWeight: 600,
                        color: 'hsl(var(--foreground))',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.2,
                        marginBottom: isMobile ? 4 : 6,
                      }}>
                        Font Family
                      </div>
                      <div style={{ fontSize: isMobile ? 12.5 : 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4 }}>
                        Choose your preferred typography for the writing space.
                      </div>
                    </motion.div>
                  </div>

                  {/* Scrollable list */}
                  <div 
                    className="custom-scrollbar-visible"
                    style={{ 
                      flex: 1, 
                      overflowY: 'auto', 
                      padding: isMobile ? '0 16px 16px' : '0 24px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{
                      borderRadius: isMobile ? 16 : 20,
                      border: '1px solid hsl(var(--border)/0.4)',
                      background: 'hsl(var(--muted)/0.12)',
                      backdropFilter: 'blur(10px)',
                      overflow: 'hidden',
                    }}>
                      {fonts.map((font, i) => {
                        const isSelected = selectedFont === font.value;
                        return (
                          <button
                            key={font.value}
                            onClick={() => {
                              setSelectedFont(font.value);
                              setIsFontSheetOpen(false);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: isMobile ? '12px 16px' : '14px 20px',
                              background: 'transparent',
                              border: 'none',
                              borderBottom: i < fonts.length - 1 ? '1px solid hsl(var(--border)/0.2)' : 'none',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              transition: 'background .12s ease-in-out',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--muted)/0.35)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span className={cn(
                              isMobile ? "text-[13px]" : "text-[14px]",
                              {
                                'font-general-sans': font.value === 'general-sans',
                                'font-geist': font.value === 'geist',
                                'font-space': font.value === 'space',
                                'font-lora': font.value === 'lora',
                                'font-instrument-italic': font.value === 'instrument-italic',
                                'font-playfair': font.value === 'playfair',
                              },
                              font.value === 'instrument-italic' && 'italic'
                            )} style={{ color: 'hsl(var(--foreground))' }}>
                              {font.label}
                            </span>
                            {isSelected && (
                              <Check size={16} style={{ color: 'hsl(var(--primary))' }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </AnimatePresence>

      <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="fixed top-4 left-0 right-0 z-40 pointer-events-none flex justify-between items-center h-12 px-4 md:px-8 lg:px-12 bg-transparent border-b-0">
        <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full liquid-glass-dock static shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
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
          
          <div className="border-l border-border/30 h-4 mx-0.5" />
          
          {windowWidth < 768 ? (
            <Button
              variant="ghost"
              onClick={() => setIsFontSheetOpen(true)}
              className={cn(
                "h-8 w-[140px] md:w-[155px] border-none bg-transparent hover:bg-primary/5 transition-all shadow-none font-medium rounded-full py-0 px-2 flex items-center justify-between",
                {
                  'font-general-sans': selectedFont === 'general-sans',
                  'font-geist': selectedFont === 'geist',
                  'font-space': selectedFont === 'space',
                  'font-lora': selectedFont === 'lora',
                  'font-instrument-italic italic': selectedFont === 'instrument-italic',
                  'font-playfair': selectedFont === 'playfair',
                }
              )}
            >
              <div className="flex items-center truncate">
                <FontSelectorIcon className="h-4 w-4 text-muted-foreground/60 flex-shrink-0 mr-1.5" />
                <span className="truncate">
                  {{
                    'geist': 'Geist Sans',
                    'lora': 'Lora',
                    'general-sans': 'General',
                    'space': 'Space',
                    'instrument-italic': 'Instrument',
                    'playfair': 'Playfair'
                  }[selectedFont] || selectedFont}
                </span>
              </div>
              <svg 
                className="h-3.5 w-3.5 bg-muted-foreground/60 dark:bg-muted-foreground/60 flex-shrink-0 ml-1.5" 
                aria-hidden="true" 
                focusable="false" 
                style={{
                  maskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/sort.svg")',
                  WebkitMaskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/sort.svg")',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center center',
                  WebkitMaskPosition: 'center center',
                }}
              />
            </Button>
          ) : (
            <Select value={selectedFont} onValueChange={setSelectedFont}>
              <SelectTrigger 
                className={cn(
                  "h-8 w-[140px] md:w-[155px] border-none bg-transparent hover:bg-primary/5 transition-all shadow-none font-medium rounded-full py-0 px-2",
                  {
                  'font-general-sans': selectedFont === 'general-sans',
                  'font-geist': selectedFont === 'geist',
                  'font-space': selectedFont === 'space',
                  'font-lora': selectedFont === 'lora',
                  'font-instrument-italic italic': selectedFont === 'instrument-italic',
                  'font-playfair': selectedFont === 'playfair',
                  }
                )}
              >
                <FontSelectorIcon className="h-4 w-4 text-muted-foreground/60 flex-shrink-0 mr-1.5" />
                <span className="truncate">
                  {(() => {
                    const isMobile = windowWidth < 768;
                    if (isMobile) {
                      return {
                        'geist': 'Geist Sans',
                        'lora': 'Lora',
                        'general-sans': 'General',
                        'space': 'Space',
                        'instrument-italic': 'Instrument',
                        'playfair': 'Playfair'
                      }[selectedFont] || selectedFont;
                    } else {
                      return {
                        'geist': 'Geist Sans',
                        'general-sans': 'General Sans',
                        'space': 'Space',
                        'lora': 'Lora',
                        'instrument-italic': 'Instrument',
                        'playfair': 'Playfair'
                      }[selectedFont] || selectedFont;
                    }
                  })()}
                </span>
              </SelectTrigger>
              <SelectContent 
                className="min-w-[170px]"
                position="popper"
                sideOffset={6}
              >
                {fonts.map(font => (
                  <SelectItem 
                    key={font.value} 
                    value={font.value}
                    className={cn(
                      "text-[13px] cursor-pointer transition-colors",
                      {
                        'font-general-sans': font.value === 'general-sans',
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
          )}
        </div>
        
        {/* Centered Search Pill */}
        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none z-50">
          <button
            onClick={openPalette}
            className="pointer-events-auto flex items-center justify-between gap-3 text-xs text-muted-foreground/70 liquid-glass-dock px-3.5 py-1 rounded-full shadow-lg overflow-hidden h-10 w-64 cursor-pointer hover:text-foreground/90 transition-all select-none outline-none focus:outline-none"
          >
            <div className="relative z-10 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-[13px] font-medium tracking-tight">Search notes...</span>
            </div>
            <div className="relative z-10 flex items-center gap-0.5 bg-muted/40 px-1.5 py-0.5 rounded-md border border-border/20 text-[10px] font-sans font-medium">
              <kbd className="text-[10px] font-sans">⌘K</kbd>
            </div>
          </button>
        </div>
        
        <div className="pointer-events-auto flex items-center justify-center h-11 w-11 p-0 md:h-auto md:w-auto md:px-1.5 md:py-1 md:gap-1 rounded-full liquid-glass-dock static shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden md:flex h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            <span className="sr-only">Toggle fullscreen</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <SettingsIcon />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </header>
      
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCommandPaletteOpen={isCommandPaletteOpen}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
      />

      <main className="flex-1 flex flex-col px-4 md:px-8 lg:px-16 pt-0 pb-0 max-w-4xl mx-auto w-full overflow-hidden">
        {/* SEO: Hidden H1 tag for search engines */}
        <h1 className="sr-only">typein - Free Minimalist Writing App | Distraction-Free Text Editor</h1>
        <div className="relative flex-1 min-h-0">
          <textarea
            key={currentEntry?.id}
            className={cn(
              "w-full h-full resize-none bg-transparent pt-20 pb-48",
              "text-lg leading-relaxed outline-none whitespace-pre-wrap",
              "transition-all duration-200",
              "placeholder:text-muted-foreground/75 md:text-[20px] text-[18px]"
            )}
            style={{ 
              fontSize: `var(--editor-font-size)`,
              scrollPaddingBottom: isMobile ? 120 : 160
            }}
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
      />
    </div>
    </>
  );
}