import { useState, useEffect } from 'react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  X, Trash2, MoreVertical, Pin, 
  ChevronRight, Filter
} from 'lucide-react';
import { JsonFileIcon, MarkdownFileIcon, EntryPageIcon, CopyIcon, SidebarImportPillIcon, SearchIcon } from './Icons';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ImportModal } from './ImportModal';
import { ExportWarningDialog } from './ExportWarningDialog';
import { useEntries, Entry, parseDateSafe } from '@/contexts/EntryContext';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getEntryPlainText, getContentPreview as getPreview, isContentEmpty, searchInContent } from '@/lib/entryHelpers';
import { exportEntryAsMarkdown, exportEntryAsJson } from '@/lib/markdown';
import { importMarkdownFile, importTextFile, importJsonFile } from '@/lib/importers';
import { importBackup } from '@/lib/backup';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useModalHistory } from '@/hooks/useModalHistory';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  isCommandPaletteOpen?: boolean;
}

// Custom New Entry icon
const NewEntryIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
  >
    <path
      d="M11.4875 0.512563C10.804 -0.170854 9.696 -0.170854 9.01258 0.512563L4.75098 4.77417C4.49563 5.02951 4.29308 5.33265 4.15488 5.66628L3.30712 7.71282C3.19103 7.99307 3.25519 8.31566 3.46968 8.53017C3.68417 8.74467 4.00676 8.80885 4.28702 8.69277L6.33382 7.84501C6.66748 7.70681 6.97066 7.50423 7.22604 7.24886L11.4875 2.98744C12.1709 2.30402 12.1709 1.19598 11.4875 0.512563Z"
      fill="currentColor"
    />
    <path
      d="M2.75 1.5C2.05964 1.5 1.5 2.05964 1.5 2.75V9.25C1.5 9.94036 2.05964 10.5 2.75 10.5H9.25C9.94036 10.5 10.5 9.94036 10.5 9.25V7C10.5 6.58579 10.8358 6.25 11.25 6.25C11.6642 6.25 12 6.58579 12 7V9.25C12 10.7688 10.7688 12 9.25 12H2.75C1.23122 12 0 10.7688 0 9.25V2.75C0 1.23122 1.23122 4.84288e-08 2.75 4.84288e-08H5C5.41421 4.84288e-08 5.75 0.335786 5.75 0.75C5.75 1.16421 5.41421 1.5 5 1.5H2.75Z"
      fill="currentColor"
    />
  </svg>
);

// Custom Branch Off icon
const BranchOffIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6.02,5.78m0,15.31V4.55m0,0v-1.91m0,3.14v-1.23m0,1.23c0,1.61,1.21,3.11,3.2,3.94l4.58,1.92c1.98,.83,3.2,2.32,3.2,3.94v3.84"></path>
    <path d="M20.53,17.59l-3.41,3.66-3.66-3.41"></path>
  </svg>
);

// Detect mobile devices for performance-optimized transitions
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

export function Sidebar({ isOpen, onClose, className, isCommandPaletteOpen = false }: SidebarProps) {
  useModalHistory(isOpen, onClose, 'sidebar');
  const { entries, currentEntry, setCurrentEntry, createNewEntry, deleteEntry, togglePinEntry, branchOffEntry } = useEntries();
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'pinned'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [expandedExportId, setExpandedExportId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [exportWarning, setExportWarning] = useState<{ isOpen: boolean; entry: Entry | null; format: 'md' | 'txt' }>({
    isOpen: false,
    entry: null,
    format: 'md',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        const hasActiveModal = 
          isDeleteModalOpen || 
          isImportModalOpen || 
          exportWarning.isOpen || 
          isCommandPaletteOpen || 
          openDropdownId !== null;

        if (!hasActiveModal) {
          event.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDeleteModalOpen, isImportModalOpen, exportWarning.isOpen, isCommandPaletteOpen, openDropdownId]);

  const isAnyOtherModalOpen = isDeleteModalOpen || exportWarning.isOpen || isCommandPaletteOpen;

  const handleEntryClick = (entry: Entry) => {
    if (currentEntry?.id === entry.id) return;
    setCurrentEntry(entry);
  };

  const handleNewEntry = () => {
    createNewEntry();
    if (window.matchMedia('(max-width: 767px)').matches) {
      onClose();
    }
  };

  const handleDeleteClick = (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteEntryId(entryId);
    setTimeout(() => {
      setIsDeleteModalOpen(true);
    }, 250);
  };

  const handleDeleteConfirm = () => {
    if (deleteEntryId) {
      deleteEntry(deleteEntryId);
      toast({
        description: "Note deleted successfully",
        duration: 2000,
      });
    }
    setIsDeleteModalOpen(false);
    setTimeout(() => {
      setDeleteEntryId(null);
    }, 400);
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setTimeout(() => {
      setDeleteEntryId(null);
    }, 400);
  };

  const handleImport = async (format: 'txt' | 'md' | 'json' | 'zip', retainDate: boolean, file: File) => {
    try {
      if (format === 'zip') {
        const result = await importBackup(file);
        if (result.success) {
          toast({
            title: 'Import successful',
            description: `Imported ${result.entriesImported} entries and ${result.mediaImported} media files`,
          });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast({
            title: 'Import failed',
            description: result.errors[0] || 'Failed to import backup',
            variant: 'destructive',
          });
        }
      } else if (format === 'md') {
        await importMarkdownFile(file, retainDate);
        toast({
          title: 'Import successful',
          description: 'Markdown file imported successfully',
        });
        setTimeout(() => window.location.reload(), 1000);
      } else if (format === 'txt') {
        await importTextFile(file);
        toast({
          title: 'Import successful',
          description: 'Text file imported successfully',
        });
        setTimeout(() => window.location.reload(), 1000);
      } else if (format === 'json') {
        await importJsonFile(file, retainDate);
        toast({
          title: 'Import successful',
          description: 'JSON note imported successfully',
        });
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: 'Import failed',
        description: 'Failed to import file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyClick = async (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const plainText = getEntryPlainText(entry.content);
      await navigator.clipboard.writeText(plainText);
      toast({
        description: "Note copied to clipboard",
        duration: 2000,
      });
      console.log('Entry copied to clipboard');
    } catch (err) {
      console.error('Failed to copy entry:', err);
    }
  };

  const handleExportMarkdownClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimeout(() => {
      setExportWarning({ isOpen: true, entry, format: 'md' });
    }, 250);
  };

  const handleExportJsonClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      exportEntryAsJson(entry);
      toast({
        title: 'Exported as JSON',
        description: 'Note exported successfully',
      });
    } catch (error) {
      console.error('Failed to export as JSON:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export note as JSON',
        variant: 'destructive',
      });
    }
  };

  const handleExportWarningContinue = () => {
    if (!exportWarning.entry) return;

    try {
      if (exportWarning.format === 'md') {
        exportEntryAsMarkdown(exportWarning.entry);
        toast({
          title: 'Exported as Markdown',
          description: 'Note exported successfully',
        });
      } else {
        handleExportClick(exportWarning.entry, {} as React.MouseEvent);
      }
    } catch (error) {
      console.error('Failed to export:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export note',
        variant: 'destructive',
      });
    }

    setExportWarning({ isOpen: false, entry: null, format: 'md' });
  };

  const handleExportWarningUseJson = () => {
    if (!exportWarning.entry) return;

    try {
      exportEntryAsJson(exportWarning.entry);
      toast({
        title: 'Exported as JSON',
        description: 'Note exported successfully with all features preserved',
      });
    } catch (error) {
      console.error('Failed to export as JSON:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export note as JSON',
        variant: 'destructive',
      });
    }

    setExportWarning({ isOpen: false, entry: null, format: 'md' });
  };

  const handleExportTxtClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimeout(() => {
      setExportWarning({ isOpen: true, entry, format: 'txt' });
    }, 250);
  };

  const handleExportClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const plainText = getEntryPlainText(entry.content);
      const blob = new Blob([plainText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;

      const lines = plainText.split('\n');
      const firstLine = (lines.find(line => line.trim() !== '') || '').trim();
      const filename = firstLine
        ? `${firstLine.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim()}.txt`
        : `note-${format(new Date(entry.date), 'yyyy-MM-dd')}.txt`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        description: "Note exported as .txt file",
        duration: 2000,
      });
      console.log('Entry exported as .txt file');
    } catch (err) {
      console.error('Failed to export entry:', err);
    }
  };

  const handlePinClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinEntry(entry.id);
    toast({
      description: entry.pinned ? "Note unpinned" : "Note pinned",
      duration: 2000,
    });
  };

  const handleBranchOffClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    branchOffEntry(entry.id);
    const originalDate = format(new Date(entry.date), 'MMM dd, yyyy');
    toast({
      description: `Entry branched off from ${originalDate}`,
      duration: 2000,
    });
  };

  const pinnedEntries = entries.filter(entry => entry.pinned);
  const pinnedCount = pinnedEntries.length;

  const filteredEntries = entries
    .filter(entry => {
      // 1. Search Query filter
      const searchLower = searchQuery.toLowerCase();
      const dateLower = format(new Date(entry.date), 'MMMM dd, yyyy').toLowerCase();
      const matchesSearch = searchInContent(entry.content, searchLower) || dateLower.includes(searchLower);
      if (!matchesSearch) return false;

      // 2. Date/Pin Filter
      const entryDate = new Date(entry.date);
      switch (dateFilter) {
        case 'today':
          return isToday(entryDate);
        case 'yesterday':
          return isYesterday(entryDate);
        case 'week':
          return isThisWeek(entryDate, { weekStartsOn: 1 });
        case 'month':
          return isThisMonth(entryDate);
        case 'pinned':
          return entry.pinned;
        case 'all':
        default:
          return true;
      }
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const entryToDelete = entries.find(entry => entry.id === deleteEntryId);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 40,
                background: 'rgba(0,0,0,0.25)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
              onClick={onClose}
              className="lg:hidden"
            />

            {/* Sidebar Wrapper (slides in/out) */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={springMed}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 288,
                zIndex: 50,
                pointerEvents: 'none',
              }}
            >
              {/* Sidebar Drawer Panel (with background and backdrop filter) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: 'inherit',
                  pointerEvents: 'auto',
                }}
                className={cn("liquid-glass-sidebar", className)}
              >
              {/* Header */}
              <div style={{
                height: 56,
                padding: '0 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid hsla(var(--border)/0.15)',
                background: 'transparent',
              }}>
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '-0.1px',
                    color: 'hsl(var(--foreground)/0.9)',
                    margin: 0
                  }}
                  className="font-general-sans"
                >
                  Your history
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      color: 'hsl(var(--muted-foreground))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'hsla(var(--muted)/0.35)',
                      border: '1px solid hsla(var(--border)/0.35)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s, color 0.2s',
                    }}
                    className="hover:bg-muted/70 hover:text-foreground focus:outline-none"
                    onClick={handleNewEntry}
                  >
                    <NewEntryIcon />
                    <span className="sr-only">New Entry</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      color: 'hsl(var(--muted-foreground))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'hsla(var(--muted)/0.35)',
                      border: '1px solid hsla(var(--border)/0.35)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s, color 0.2s',
                    }}
                    className="hover:bg-muted/70 hover:text-foreground focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Close Sidebar</span>
                  </motion.button>
                </div>
              </div>

              {/* Search */}
              <div style={{ padding: '12px 18px', borderBottom: '1px solid hsla(var(--border)/0.15)' }}>
                <div className="search-wrapper">
                  <SearchIcon className="search-icon" />
                  <Input
                    type="text"
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="liquid-glass-search"
                    style={{
                      paddingRight: searchQuery ? 34 : 12,
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="clear-button focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>



              {/* Entries List */}
              <div
                className="custom-scrollbar-visible font-geist"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px 10px 16px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                {filteredEntries.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                      {searchQuery ? 'No matching entries found' : 'No entries yet'}
                    </p>
                  </div>
                ) : (
                  filteredEntries.map((entry) => {
                    const entryDate = new Date(entry.date);
                    const isSelected = entry.id === currentEntry?.id;
                    return (
                      <motion.div
                        key={entry.id}
                        onClick={() => handleEntryClick(entry)}
                        whileTap={{ scale: 0.98 }}
                        transition={spring}
                        style={{
                          position: 'relative',
                          padding: '12px 14px',
                          borderRadius: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          zIndex: 1,
                          border: '1px solid transparent',
                          transition: 'background-color 0.2s, border-color 0.2s',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--accent))';
                            e.currentTarget.style.borderColor = 'hsla(var(--border)/0.2)';
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                        className="group"
                      >
                        {/* Shared Background Pill */}
                        {isSelected && (
                          <motion.div
                            layoutId="active-sidebar-pill"
                            transition={spring}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'hsl(var(--primary))',
                              borderRadius: 10,
                              zIndex: -1,
                              boxShadow: '0 4px 12px hsla(var(--primary)/0.15)',
                            }}
                          />
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span
                              style={{
                                fontSize: 12.5,
                                fontWeight: isSelected ? 600 : 500,
                                color: isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                                transition: 'color 0.2s',
                              }}
                              className="font-general-sans"
                            >
                              {format(entryDate, 'MMM dd, yyyy')}
                            </span>
                             {entry.pinned && (
                               <Pin size={11} style={{
                                 color: isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary)/0.75)',
                                 flexShrink: 0,
                                 transition: 'color 0.2s',
                               }} />
                             )}
                            {entry.isBranchedOff && (
                              <div
                                title={`Branched off from ${entry.originalEntryDate ? format(parseDateSafe(entry.originalEntryDate), 'MMM dd, yyyy') : 'original entry'}`}
                                style={{ display: 'flex', alignItems: 'center' }}
                              >
                                <BranchOffIcon className={cn(
                                  "h-3.5 w-3.5 flex-shrink-0 transition-colors duration-200",
                                  isSelected
                                    ? "text-primary-foreground/90"
                                    : "text-orange-500/70"
                                )} />
                              </div>
                            )}
                            {isToday(entryDate) && (
                              <span style={{
                                flexShrink: 0,
                                fontSize: 9,
                                fontWeight: 600,
                                letterSpacing: '0.2px',
                                textTransform: 'uppercase',
                                background: isSelected ? 'hsla(var(--primary-foreground)/0.2)' : 'hsla(var(--primary)/0.06)',
                                color: isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))',
                                border: isSelected ? '1px solid hsla(var(--primary-foreground)/0.25)' : '1px solid hsla(var(--primary)/0.12)',
                                padding: '1px 5px',
                                borderRadius: 99,
                                transition: 'all 0.2s',
                              }}>
                                Today
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: 11.5,
                            color: isSelected ? 'hsla(var(--primary-foreground) / 0.85)' : 'hsla(var(--foreground) / 0.65)',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            transition: 'color 0.2s',
                          }}>
                            {getPreview(entry.content) || 'Empty entry'}
                          </div>
                        </div>

                        {/* Dropdown Options */}
                        <div onClick={e => e.stopPropagation()}>
                          <DropdownMenu
                            open={openDropdownId === entry.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setOpenDropdownId(entry.id);
                                const triggerEl = document.getElementById(`trigger-${entry.id}`);
                                if (triggerEl) {
                                  const rect = triggerEl.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  setIsNearBottom(spaceBelow < 280);
                                }
                              } else {
                                setOpenDropdownId(null);
                                setExpandedExportId(null);
                              }
                            }}
                          >
                            <DropdownMenuTrigger asChild>
                              <button
                                id={`trigger-${entry.id}`}
                                onPointerDown={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  setIsNearBottom(spaceBelow < 280);
                                }}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  color: isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                                  transition: 'all 0.2s',
                                }}
                                className={cn(
                                  "transition-all duration-200",
                                  (openDropdownId === entry.id || isSelected)
                                    ? "opacity-100"
                                    : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                                  openDropdownId === entry.id
                                    ? isSelected ? "bg-primary-foreground/15" : "bg-muted"
                                    : "",
                                  isSelected
                                    ? "hover:bg-primary-foreground/15 text-primary-foreground"
                                    : "hover:bg-muted hover:text-foreground text-muted-foreground"
                                )}
                              >
                                <MoreVertical size={13} />
                                <span className="sr-only">Entry Options</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              side={isNearBottom ? "top" : "bottom"}
                              avoidCollisions={false}
                              className="w-48 p-1 bg-background/85 backdrop-blur-xl border border-border/40 shadow-xl rounded-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150 ease-out"
                              sideOffset={5}
                            >
                              {(() => {
                                const isExportExpanded = expandedExportId === entry.id;
                                const itemBaseClass = "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer outline-none focus:outline-none";
                                const itemFadeStyle = {
                                  opacity: isExportExpanded ? 0.35 : 1,
                                  filter: isExportExpanded ? 'blur(0.5px)' : 'none',
                                  transition: 'all 0.2s ease',
                                };

                                return (
                                  <>
                                    {/* Pin / Unpin */}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isContentEmpty(entry.content)) return;
                                        if (!entry.pinned && pinnedCount >= 5) {
                                          toast({
                                            description: "Maximum of 5 pinned notes allowed",
                                            duration: 2500,
                                          });
                                          return;
                                        }
                                        handlePinClick(entry, e);
                                      }}
                                      disabled={isExportExpanded || isContentEmpty(entry.content)}
                                      className={cn(
                                        itemBaseClass,
                                        isContentEmpty(entry.content)
                                          ? "opacity-40 cursor-not-allowed"
                                          : (!entry.pinned && pinnedCount >= 5)
                                            ? "opacity-40 cursor-default hover:bg-transparent focus:bg-transparent text-muted-foreground/60 focus:text-muted-foreground/60"
                                            : "hover:bg-primary/8 focus:bg-primary/8 text-foreground/90 hover:text-foreground"
                                      )}
                                      style={itemFadeStyle}
                                    >
                                       <Pin className="h-3.5 w-3.5 opacity-70" />
                                      <span>{entry.pinned ? 'Unpin note' : 'Pin note'}</span>
                                    </DropdownMenuItem>

                                    {/* Branch Off */}
                                    <DropdownMenuItem
                                      onClick={(e) => !isContentEmpty(entry.content) ? handleBranchOffClick(entry, e) : e.stopPropagation()}
                                      disabled={isExportExpanded || isContentEmpty(entry.content)}
                                      className={cn(
                                        itemBaseClass,
                                        !isContentEmpty(entry.content)
                                          ? "hover:bg-primary/8 focus:bg-primary/8 text-foreground/90 hover:text-foreground"
                                          : "opacity-40 cursor-not-allowed"
                                      )}
                                      style={itemFadeStyle}
                                    >
                                      <BranchOffIcon className="h-3.5 w-3.5 opacity-70" />
                                      <span>Branch Off</span>
                                    </DropdownMenuItem>

                                    {/* Copy Note */}
                                    <DropdownMenuItem
                                      onClick={(e) => !isContentEmpty(entry.content) ? handleCopyClick(entry, e) : e.stopPropagation()}
                                      disabled={isExportExpanded || isContentEmpty(entry.content)}
                                      className={cn(
                                        itemBaseClass,
                                        !isContentEmpty(entry.content)
                                          ? "hover:bg-primary/8 focus:bg-primary/8 text-foreground/90 hover:text-foreground"
                                          : "opacity-40 cursor-not-allowed"
                                      )}
                                      style={itemFadeStyle}
                                    >
                                      <CopyIcon className="h-3.5 w-3.5 opacity-70" />
                                      <span>Copy Note</span>
                                    </DropdownMenuItem>

                                    {/* Export Note Trigger */}
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isContentEmpty(entry.content)) {
                                          setExpandedExportId(isExportExpanded ? null : entry.id);
                                        }
                                      }}
                                      style={{
                                        cursor: isContentEmpty(entry.content) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        borderRadius: 8,
                                      }}
                                      className={cn(
                                        "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 outline-none select-none",
                                        !isContentEmpty(entry.content)
                                          ? "hover:bg-primary/8 text-foreground/90 hover:text-foreground"
                                          : "opacity-40 cursor-not-allowed"
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="opacity-70"
                                        >
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                          <polyline points="17 8 12 3 7 8" />
                                          <line x1="12" x2="12" y1="3" y2="15" />
                                        </svg>
                                        <span>Export Note</span>
                                      </div>
                                      <motion.div
                                        animate={{ rotate: isExportExpanded ? 90 : 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                      >
                                        <ChevronRight size={14} className="opacity-50" />
                                      </motion.div>
                                    </div>

                                    {/* Inline Export Options */}
                                    <AnimatePresence initial={false}>
                                      {isExportExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.22, ease: 'easeInOut' }}
                                          style={{ overflow: 'hidden' }}
                                        >
                                          <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            paddingLeft: 22,
                                            paddingRight: 4,
                                            paddingTop: 2,
                                            paddingBottom: 4,
                                            gap: 2,
                                          }}>
                                            {[
                                              { label: 'as Markdown (.md)', Icon: MarkdownFileIcon, onClick: (e: any) => handleExportMarkdownClick(entry, e) },
                                              { label: 'as Plain Text (.txt)', Icon: EntryPageIcon, onClick: (e: any) => handleExportTxtClick(entry, e) },
                                              { label: 'as JSON (.json)', Icon: JsonFileIcon, onClick: (e: any) => handleExportJsonClick(entry, e) },
                                            ].map((opt) => (
                                              <DropdownMenuItem
                                                key={opt.label}
                                                onClick={(e) => {
                                                  opt.onClick(e);
                                                  setOpenDropdownId(null);
                                                  setExpandedExportId(null);
                                                }}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 8,
                                                  width: '100%',
                                                  border: 'none',
                                                  background: 'transparent',
                                                  cursor: 'pointer',
                                                  fontFamily: 'inherit',
                                                  padding: '5px 8px',
                                                  borderRadius: 6,
                                                  textAlign: 'left',
                                                  transition: 'all 0.15s ease',
                                                }}
                                                className="text-[12px] font-medium text-foreground/80 hover:bg-primary/8 hover:text-primary focus:bg-primary/8 focus:text-primary outline-none"
                                              >
                                                <opt.Icon className="h-3.5 w-3.5 opacity-60" />
                                                <span>{opt.label}</span>
                                              </DropdownMenuItem>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>

                                    {/* Delete */}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(entry.id, e);
                                      }}
                                      disabled={isExportExpanded}
                                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer outline-none focus:outline-none text-destructive hover:bg-destructive/8 focus:bg-destructive/8 hover:text-destructive focus:text-destructive"
                                      style={itemFadeStyle}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive/80" />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </>
                                );
                              })()}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                {/* Spacer inside the scrollable container to allow scrolling past the pills */}
                {filteredEntries.length > 0 && (
                  <div style={{ height: 86, flexShrink: 0 }} />
                )}
              </div>

              {/* Progressive Bottom Fade Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 110,
                  background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsla(var(--background)/0.9) 30%, hsla(var(--background)/0.4) 70%, transparent 100%)',
                  pointerEvents: 'none',
                  zIndex: 45, // above list items (zIndex 1) but below floating pills (zIndex 55)
                  display: (isAnyOtherModalOpen || (isImportModalOpen && isMobile)) ? 'none' : 'block',
                }}
              />
            </div> {/* Close Sidebar Drawer Panel */}

            {/* Floating Actions Pill (sibling of Sidebar Drawer Panel, child of Sidebar Wrapper) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 20,
                  left: 0,
                  width: 288,
                  zIndex: (isAnyOtherModalOpen || (isImportModalOpen && isMobile)) ? 40 : 55,
                  display: (isAnyOtherModalOpen || (isImportModalOpen && isMobile)) ? 'none' : 'flex',
                  padding: '0 18px',
                  pointerEvents: 'none',
                }}
              >
                {/* Separate Glass Actions Pills stretched end-to-end */}
                <div style={{
                  display: 'flex',
                  width: '100%',
                  gap: 10,
                  pointerEvents: 'none',
                }}>
                  {/* Import Notes Button */}
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    style={{
                      flex: 1,
                      height: 42,
                      fontSize: 12.5,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isImportModalOpen ? 'default' : 'pointer',
                      border: 'none',
                      borderRadius: 99,
                      pointerEvents: (isImportModalOpen || isAnyOtherModalOpen) ? 'none' : 'auto',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseDown={(e) => {
                      if (!isImportModalOpen && !isAnyOtherModalOpen) {
                        e.currentTarget.style.transform = 'scale(0.975)';
                      }
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'none';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                    }}
                    className="liquid-glass-dock shadow-lg focus:outline-none pointer-events-auto text-foreground/90"
                  >
                    <SidebarImportPillIcon className="h-3.5 w-3.5 mr-2 opacity-85" />
                    Import Notes
                  </button>

                  {/* Filter Popover */}
                  <Popover open={isImportModalOpen ? false : isFilterOpen} onOpenChange={isImportModalOpen ? undefined : setIsFilterOpen}>
                    <PopoverTrigger asChild>
                      <button
                        disabled={isImportModalOpen}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isImportModalOpen ? 'default' : 'pointer',
                          border: 'none',
                          pointerEvents: (isImportModalOpen || isAnyOtherModalOpen) ? 'none' : 'auto',
                        }}
                        className={cn(
                          "liquid-glass-dock shadow-lg focus:outline-none flex-shrink-0 pointer-events-auto",
                          isImportModalOpen 
                            ? "opacity-30 pointer-events-none" 
                            : dateFilter !== 'all' 
                              ? "is-active" 
                              : "text-foreground/90"
                        )}
                      >
                        <Filter className="h-4 w-4 opacity-85" />
                        <span className="sr-only">Filter</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      forceMount
                      className="p-0 border-0 bg-transparent shadow-none w-[180px]"
                      align="end"
                      side="top"
                      sideOffset={12}
                      style={{ zIndex: 100 }}
                    >
                      <AnimatePresence>
                        {isFilterOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="p-1 border border-border/40 bg-background/95 backdrop-blur-xl shadow-xl rounded-2xl"
                            style={{
                              width: 180,
                              fontFamily: 'inherit',
                            }}
                          >
                            <div className="space-y-0.5" style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ padding: '6px 10px 4px', fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground)/0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Filter by
                              </div>
                              {[
                                { value: 'all', label: 'All Time', count: entries.length },
                                { value: 'today', label: 'Today', count: entries.filter(e => isToday(new Date(e.date))).length },
                                { value: 'yesterday', label: 'Yesterday', count: entries.filter(e => isYesterday(new Date(e.date))).length },
                                { value: 'week', label: 'This Week', count: entries.filter(e => isThisWeek(new Date(e.date), { weekStartsOn: 1 })).length },
                                { value: 'month', label: 'This Month', count: entries.filter(e => isThisMonth(new Date(e.date))).length },
                                { value: 'pinned', label: 'Pinned Only', count: entries.filter(e => e.pinned).length },
                              ].map((item) => {
                                const isSelected = dateFilter === item.value;
                                return (
                                  <button
                                    key={item.value}
                                    onClick={() => {
                                      setDateFilter(item.value as any);
                                    }}
                                    className={cn(
                                      "w-full px-2.5 py-1 text-left rounded-lg transition-colors text-[13px] font-medium flex items-center justify-between outline-none",
                                      isSelected 
                                        ? "bg-primary/8 text-primary" 
                                        : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                                    )}
                                    style={{
                                      border: 'none',
                                      margin: 0,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span>{item.label}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span style={{ 
                                        fontSize: 10, 
                                        fontWeight: 500,
                                        color: isSelected ? 'hsl(var(--primary)/0.7)' : 'hsl(var(--muted-foreground)/0.6)',
                                        background: isSelected ? 'hsla(var(--primary)/0.12)' : 'hsla(var(--muted)/0.5)',
                                        padding: '1px 5px',
                                        borderRadius: 99,
                                      }}>
                                        {item.count}
                                      </span>
                                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        entryTitle={entryToDelete ? format(new Date(entryToDelete.date), 'MMMM d, yyyy') : ''}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        onImportBackup={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.zip';
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
              const { importBackup } = await import('@/lib/backup');
              const result = await importBackup(file);
              if (result.success) {
                toast({ title: 'Backup restored', description: `Imported ${result.entriesImported} entries` });
                setTimeout(() => window.location.reload(), 1500);
              } else {
                toast({ title: 'Import failed', description: result.errors[0] || 'Failed to restore backup', variant: 'destructive' });
              }
            } catch (err) {
              toast({ title: 'Import failed', description: 'Could not read backup file', variant: 'destructive' });
            }
          };
          input.click();
        }}
      />

      {/* Export Warning Dialog */}
      <ExportWarningDialog
        isOpen={exportWarning.isOpen}
        onClose={() => setExportWarning({ isOpen: false, entry: null, format: 'md' })}
        onContinue={handleExportWarningContinue}
        onUseJson={handleExportWarningUseJson}
        format={exportWarning.format}
      />
    </>
  );
}