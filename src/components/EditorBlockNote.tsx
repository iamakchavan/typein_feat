import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useEntries } from '@/contexts/EntryContext';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { cn } from '@/lib/utils';
import { fonts } from '@/lib/fonts';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectScrollUpButton,
  SelectScrollDownButton
} from '@/components/ui/select';
import { Sidebar } from '@/components/Sidebar';
import { StatusBar } from '@/components/StatusBar';
import { CommandPalette } from '@/components/CommandPalette';
import { useBlockNoteEditor } from '@/hooks/useBlockNoteEditor';
import { BlockNoteView, ShadCNDefaultComponents } from '@blocknote/shadcn';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import '@blocknote/shadcn/style.css';
import '@/styles/blocknote-custom.css';
import type { PartialBlock } from '@blocknote/core';
import { mediaStorage } from '@/lib/mediaStorage';
import { exportBackup, importBackup, getReferencedMediaIds, getReferencedMediaCount } from '@/lib/backup';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { BackupStatusDialog } from '@/components/BackupStatusDialog';
import { SettingsModal } from '@/components/SettingsModal';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppleScroll } from '@/hooks/useAppleScroll';

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




const BlockNoteSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => {
  // Lock the portal container element on mount so it remains static during component's lifetime.
  // This prevents React/Radix from trying to migrate DOM elements between body and .bn-editor,
  // resolving the DOM unmount crash ("Failed to execute 'removeChild' on 'Node'") completely.
  const container = React.useMemo(() => {
    if (typeof document === 'undefined') return undefined;
    const editorEl = document.querySelector('.bn-editor');
    return (editorEl?.parentElement instanceof HTMLElement ? editorEl.parentElement : undefined);
  }, []);

  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'relative z-[9999] max-h-96 min-w-[190px] overflow-hidden rounded-2xl border border-border/40 bg-background/85 backdrop-blur-xl text-popover-foreground shadow-2xl pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1.5 data-[side=left]:-translate-x-1.5 data-[side=right]:translate-x-1.5 data-[side=top]:-translate-y-1.5',
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1.5',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
BlockNoteSelectContent.displayName = 'BlockNoteSelectContent';

const SafeDropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>((props, ref) => (
  <DropdownMenuPrimitive.Trigger ref={ref} data-slot="dropdown-menu-trigger" {...props} />
));
SafeDropdownMenuTrigger.displayName = 'SafeDropdownMenuTrigger';

const SafeTooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>((props, ref) => (
  <TooltipPrimitive.Trigger ref={ref} data-slot="tooltip-trigger" {...props} />
));
SafeTooltipTrigger.displayName = 'SafeTooltipTrigger';

const SafePopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>((props, ref) => (
  <PopoverPrimitive.Trigger ref={ref} data-slot="popover-trigger" {...props} />
));
SafePopoverTrigger.displayName = 'SafePopoverTrigger';

import { FullscreenIcon, ExitFullscreenIcon, SettingsIcon, FontSelectorIcon, SearchIcon } from './Icons';

export function EditorBlockNote({ 
  openCommandPalette: externalOpenCommandPalette, 
  setOpenCommandPalette: setExternalOpenCommandPalette 
}: { 
  openCommandPalette?: boolean;
  setOpenCommandPalette?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  // Theme and font handling
  const { theme, selectedFont, setSelectedFont, fontSize } = useTheme();
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFontSheetOpen, setIsFontSheetOpen] = useState(false);
  const { toast } = useToast();

  const getScrollContainer = useCallback(() => {
    return document.querySelector('.bn-container') as HTMLElement | null;
  }, []);

  const getCaretRect = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return null;
    
    const editorEl = document.querySelector('.bn-editor');
    if (!editorEl || !editorEl.contains(anchorNode)) return null;

    const range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();

    if (rect.top === 0 && rect.bottom === 0) {
      // Fallback if caret rect is empty (e.g. empty line or brand new line)
      const element = anchorNode.nodeType === Node.ELEMENT_NODE 
        ? (anchorNode as Element) 
        : anchorNode.parentElement;
      if (element) {
        rect = element.getBoundingClientRect();
      }
    }

    return { top: rect.top, bottom: rect.bottom };
  }, []);

  useAppleScroll({ getScrollContainer, getCaretRect, bottomMargin: isMobile ? 180 : 220 });

  // Keyboard shortcuts
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

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    // Fetch actual counts so we can display them in the real modal
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
      // Transition to processing state
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
      
      // Auto-close after 2 seconds
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
        // Load the zip metadata first to get the total count for the progress stats!
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
          
          // Reload the page after showing success
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

  // Command palette
  const { isOpen: isCommandPaletteOpen, openPalette, closePalette: closeCommandPalette } = useCommandPalette();

  // Get entries context
  const { currentEntry, updateEntryContent } = useEntries();

  // Track last entry ID for detecting changes
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);

  // Handle external command palette trigger
  useEffect(() => {
    if (externalOpenCommandPalette && setExternalOpenCommandPalette) {
      openPalette();
      setExternalOpenCommandPalette(false);
    }
  }, [externalOpenCommandPalette, setExternalOpenCommandPalette, openPalette]);

  // Initialize BlockNote editor with current entry content
  const initialContent = currentEntry && Array.isArray(currentEntry.content) 
    ? currentEntry.content as PartialBlock[]
    : undefined;
  
  const editor = useBlockNoteEditor(initialContent);

  // Track save state
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Track window width for responsive font picker labels
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update editor content when current entry changes
  useEffect(() => {
    if (currentEntry && currentEntry.id !== lastEntryId && editor) {
      try {
        let content: any;
        
        if (Array.isArray(currentEntry.content)) {
          // Already in BlockNote format - validate it
          content = currentEntry.content.length > 0 
            ? currentEntry.content 
            : [{ type: 'paragraph' as const, content: [] }];
        } else if (typeof currentEntry.content === 'string') {
          // Plain text - convert to BlockNote format
          if (currentEntry.content.trim() === '') {
            content = [{ type: 'paragraph' as const, content: [] }];
          } else {
            // Split by lines and create paragraph blocks
            const lines = currentEntry.content.split('\n');
            content = lines.map(line => ({
              type: 'paragraph' as const,
              content: line ? [{ type: 'text' as const, text: line, styles: {} }] : [],
            }));
          }
        } else {
          // Fallback to empty paragraph
          console.warn('Unknown content format for entry:', currentEntry.id);
          content = [{ type: 'paragraph' as const, content: [] }];
        }
        
        editor.replaceBlocks(editor.document, content);
        setLastEntryId(currentEntry.id);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to load entry content:', error);
        // Load empty content on error
        editor.replaceBlocks(editor.document, [{ type: 'paragraph' as const, content: [] }]);
        setLastEntryId(currentEntry.id);
        setIsDirty(false);
        
        toast({
          title: 'Error loading entry',
          description: 'This entry could not be loaded. It may be corrupted.',
          variant: 'destructive',
        });
      }
    }
  }, [currentEntry, lastEntryId, editor, toast]);

  // Handle editor changes
  const handleEditorChange = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Auto-save content changes
  useEffect(() => {
    if (currentEntry && isDirty && editor) {
      const saveContent = async () => {
        try {
          const blocks = editor.document;
          
          // Always save, even if empty (let EntryContext handle deletion logic)
          await updateEntryContent(currentEntry.id, blocks);
          setLastSaved(Date.now());
          setIsDirty(false);
        } catch (error) {
          console.error('Failed to save content:', error);
        }
      };

      // Debounce save to avoid too frequent saves
      const timeoutId = setTimeout(saveContent, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isDirty, currentEntry, editor, updateEntryContent]);

  // Keyboard shortcut for manual save
  useKeyboardShortcut({ key: 's', metaKey: true }, (e) => {
    e.preventDefault();
    if (currentEntry && editor) {
      const blocks = editor.document;
      updateEntryContent(currentEntry.id, blocks);
      setLastSaved(Date.now());
      setIsDirty(false);
    }
  });

  // Toggle body class so CSS can hide BlockNote's portaled side menu when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [isSidebarOpen]);

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

  // Resolve IndexedDB media URLs to blob URLs - aggressive approach
  useEffect(() => {
    if (!editor) return;

    const resolveMediaUrl = async (element: HTMLImageElement | HTMLVideoElement | HTMLAudioElement) => {
      const src = element.getAttribute('src');
      if (!src || !src.startsWith('indexeddb://')) return;
      
      const mediaId = src.replace('indexeddb://', '');
      
      try {
        const blobUrl = await mediaStorage.getMediaUrl(mediaId);
        if (blobUrl) {
          element.src = blobUrl;
          // Also update srcset if present
          if (element.hasAttribute('srcset')) {
            element.setAttribute('srcset', blobUrl);
          }
        }
      } catch (error) {
        console.error('Failed to resolve media URL:', error);
      }
    };

    const resolveAllMediaUrls = () => {
      const mediaElements = document.querySelectorAll<HTMLImageElement | HTMLVideoElement | HTMLAudioElement>(
        'img, video, audio'
      );

      mediaElements.forEach((element) => {
        const src = element.getAttribute('src');
        if (src && src.startsWith('indexeddb://')) {
          resolveMediaUrl(element);
        }
      });
    };

    // Run resolver frequently to catch new elements
    const intervalId = setInterval(resolveAllMediaUrls, 100);

    // Also watch for DOM changes
    const observer = new MutationObserver(() => {
      resolveAllMediaUrls();
    });

    // Observe the editor container
    const editorContainer = document.querySelector('.bn-editor');
    if (editorContainer) {
      observer.observe(editorContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src'],
      });
    }

    // Initial resolve
    resolveAllMediaUrls();

    return () => {
      clearInterval(intervalId);
      observer.disconnect();
    };
  }, [editor, currentEntry]);

  // Calculate stats from BlockNote content
  const wordCount = editor ? (() => {
    const blocks = editor.document;
    let text = '';
    blocks.forEach((block: any) => {
      if (block.content && Array.isArray(block.content)) {
        block.content.forEach((item: any) => {
          if (item.type === 'text' && item.text) {
            text += item.text + ' ';
          }
        });
      }
    });
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  })() : 0;

  const charCount = editor ? (() => {
    const blocks = editor.document;
    let text = '';
    blocks.forEach((block: any) => {
      if (block.content && Array.isArray(block.content)) {
        block.content.forEach((item: any) => {
          if (item.type === 'text' && item.text) {
            text += item.text;
          }
        });
      }
    });
    return text.length;
  })() : 0;

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
              <SearchIcon className="h-4 w-4 text-muted-foreground/60" />
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

      <main className="flex-1 flex flex-col px-8 md:px-8 lg:px-16 pt-0 pb-0 max-w-4xl mx-auto w-full overflow-hidden">
        <h1 className="sr-only">typein - Free Minimalist Writing App | Distraction-Free Text Editor</h1>
        <div 
          className={cn(
            "relative flex-1 min-h-0 editor-wrapper",
            {
              'font-general-sans': selectedFont === 'general-sans',
              'font-geist': selectedFont === 'geist',
              'font-space': selectedFont === 'space',
              'font-lora': selectedFont === 'lora',
              'font-instrument-italic italic': selectedFont === 'instrument-italic',
              'font-playfair': selectedFont === 'playfair',
            }
          )}
          style={{ 
            '--editor-font-size': `${fontSize}px`
          } as React.CSSProperties}
        >
          {editor && (
            <BlockNoteView
              editor={editor}
              theme={theme === 'dark' || theme.endsWith('-dark') ? 'dark' : 'light'}
              onChange={handleEditorChange}
              className="w-full h-full"
              data-theming-css-variables-demo
              sideMenu={true}
              shadCNComponents={{
                Select: {
                  Select: ShadCNDefaultComponents.Select.Select,
                  SelectTrigger: ShadCNDefaultComponents.Select.SelectTrigger,
                  SelectValue: ShadCNDefaultComponents.Select.SelectValue,
                  SelectContent: BlockNoteSelectContent as any,
                  SelectItem: SelectItem as any,
                },
                DropdownMenu: {
                  ...ShadCNDefaultComponents.DropdownMenu,
                  DropdownMenuTrigger: SafeDropdownMenuTrigger as any,
                },
                Tooltip: {
                  ...ShadCNDefaultComponents.Tooltip,
                  TooltipTrigger: SafeTooltipTrigger as any,
                },
                Popover: {
                  ...ShadCNDefaultComponents.Popover,
                  PopoverTrigger: SafePopoverTrigger as any,
                }
              }}
            />
          )}
        </div>
      </main>
      
      <StatusBar 
        wordCount={wordCount}
        charCount={charCount}
        lastSaved={lastSaved}
        isDirty={isDirty}
      />
      </div>
    </>
  );
}
