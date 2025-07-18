import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEntries } from '@/contexts/EntryContext';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { Search, FileText, Clock, Sun, Moon, Palette, ChevronDown, Trash2, Type, Play, Pause, Music, Mail, MoreVertical, Copy, Download, Pin } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { fonts } from '@/lib/fonts';
import { Track } from '@/lib/musicLibrary';
import { useAudioPlayerContext } from '@/contexts/AudioPlayerContext';
import { useToast } from '@/hooks/use-toast';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
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

interface Command {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action?: () => void;
  type: 'entry' | 'action' | 'theme' | 'special-themes' | 'fonts' | 'music' | 'music-selector';
  lastModified?: Date;
  isSpecialThemes?: boolean;
  isFonts?: boolean;
  isMusic?: boolean;
  fullContent?: string;
  dateString?: string;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSpecialThemes, setShowSpecialThemes] = useState<string | null>(null);
  const [showFonts, setShowFonts] = useState<string | null>(null);
  const [showMusic, setShowMusic] = useState<string | null>(null);
  const [showKebabMenu, setShowKebabMenu] = useState<string | null>(null);
  const [dropdownSelectedIndex, setDropdownSelectedIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const { entries, createNewEntry, setCurrentEntry, deleteEntry, branchOffEntry } = useEntries();
  const { theme, setTheme, selectedFont, setSelectedFont } = useTheme();
  const { isPlaying, currentTrack, togglePlayPause, selectTrack, tracks, play } = useAudioPlayerContext();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Function to select track and always start playing
  const selectAndPlayTrack = useCallback((track: Track) => {
    selectTrack(track);
    // Small delay to ensure track is loaded before playing
    setTimeout(() => play(), 150);
  }, [selectTrack, play]);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setShowSpecialThemes(null);
      setShowFonts(null);
      setShowMusic(null);
      setShowKebabMenu(null);
      setDropdownSelectedIndex(0);
      setIsScrolling(false);
      // Focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle scroll events to show/hide scrollbar
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Hide scrollbar after 1 second of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  }, []);

  // Show scrollbar during keyboard navigation
  const showScrollbarTemporarily = useCallback(() => {
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1500);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Create static commands (non-entry commands)
  const staticCommands: Command[] = [
    // Action commands
    {
      id: 'new-entry',
      title: 'Create New Entry',
      description: 'Start writing a new entry',
              icon: <NewEntryIcon />,
      action: () => {
        createNewEntry();
        onClose();
      },
      type: 'action'
    },
    // Theme toggle command
    {
      id: 'switch-theme',
      title: 'Switch Theme',
      description: `Switch between light and dark (currently: ${theme === 'light' || theme.endsWith('-light') ? 'light' : 'dark'})`,
      icon: theme === 'light' || theme.endsWith('-light') ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />,
      action: () => {
        const isCurrentlyLight = theme === 'light' || theme.endsWith('-light');
        
        if (theme.includes('-')) {
          // If we're on a special theme, switch to its opposite variant
          // Handle multi-word theme names (e.g., quantum-rose-dark -> quantum-rose)
          const baseTheme = theme.endsWith('-dark') 
            ? theme.slice(0, -5) // Remove '-dark'
            : theme.endsWith('-light') 
              ? theme.slice(0, -6) // Remove '-light'
              : theme;
          if (isCurrentlyLight) {
            // Switch to dark variant
            const validDarkThemes = {
              'amethyst-dark': 'amethyst-dark',
              'cosmic-dark': 'cosmic-dark',
              'perpetuity-dark': 'perpetuity-dark', 
              'quantum-rose-dark': 'quantum-rose-dark',
              'clean-slate-dark': 'clean-slate-dark'
            } as const;
            const darkVariant = `${baseTheme}-dark` as const;
            if (darkVariant in validDarkThemes) {
              setTheme(validDarkThemes[darkVariant as keyof typeof validDarkThemes]);
            } else {
              setTheme('dark');
            }
          } else {
            // Switch to light variant
            const validLightThemes = {
              'amethyst-light': 'amethyst-light',
              'cosmic-light': 'cosmic-light', 
              'perpetuity-light': 'perpetuity-light',
              'quantum-rose-light': 'quantum-rose-light',
              'clean-slate-light': 'clean-slate-light'
            } as const;
            const lightVariant = `${baseTheme}-light` as const;
            if (lightVariant in validLightThemes) {
              setTheme(validLightThemes[lightVariant as keyof typeof validLightThemes]);
            } else {
              setTheme('light');
            }
          }
        } else {
          // If we're on basic theme, just toggle
          setTheme(isCurrentlyLight ? 'dark' : 'light');
        }
        onClose();
      },
      type: 'theme'
    },
    {
      id: 'special-themes',
      title: 'Special Themes',
      description: 'Browse special theme variants',
      icon: <Palette className="h-4 w-4" />,
      type: 'special-themes',
      isSpecialThemes: true
    },
    {
      id: 'fonts',
      title: 'Change Font',
      description: `Browse available fonts (currently: ${fonts.find(f => f.value === selectedFont)?.label || 'Geist'})`,
      icon: <Type className="h-4 w-4" />,
      type: 'fonts',
      isFonts: true
    },
    {
      id: 'music-toggle',
      title: 'Play/Pause',
      description: currentTrack ? `${isPlaying ? 'Currently playing' : 'Currently paused'}: "${currentTrack.title}"` : 'No track selected',
      icon: isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />,
      type: 'music',
      action: togglePlayPause
    },
    {
      id: 'music-selector',
      title: 'Select Music',
      description: currentTrack ? `Currently: ${currentTrack.title}` : 'Choose a track to play',
      icon: <Music className="h-4 w-4" />,
      type: 'music-selector',
      isMusic: true
    },
    {
      id: 'contact-support',
      title: 'Contact Support',
      description: 'For queries and feedback: info@typein.space',
      icon: <Mail className="h-4 w-4" />,
      action: () => {
        window.open('mailto:info@typein.space', '_blank');
        onClose();
      },
      type: 'action'
    }
  ];

  // Create entry commands from ALL entries (for searching)
  const allEntryCommands: Command[] = entries.map(entry => {
    // Generate title from content or use date
    const title = entry.content.trim() 
      ? entry.content.split('\n')[0].slice(0, 50) + (entry.content.split('\n')[0].length > 50 ? '...' : '')
      : `Entry from ${new Date(entry.date).toLocaleDateString()}`;
    
    return {
      id: entry.id,
      title,
      description: entry.content.slice(0, 100) + (entry.content.length > 100 ? '...' : ''),
      icon: entry.isBranchedOff ? (
        <div className="relative">
          <FileText className="h-4 w-4" />
          <BranchOffIcon className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-orange-500" />
        </div>
      ) : entry.pinned ? (
        <div className="relative">
          <FileText className="h-4 w-4" />
          <Pin className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-primary" />
        </div>
      ) : (
        <FileText className="h-4 w-4" />
      ),
      action: () => {
        setCurrentEntry(entry);
        onClose();
      },
      type: 'entry' as const,
      lastModified: new Date(entry.date),
      // Add full entry data for enhanced searching
      fullContent: entry.content,
      dateString: new Date(entry.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit' 
      })
    };
  });

  // Filter entries based on search (search through ALL entries)
  const filteredEntryCommands = search.trim() 
    ? allEntryCommands.filter(command => {
        const searchLower = search.toLowerCase();
        const entryDate = command.lastModified;
        
        // Create multiple date format strings for better matching
        const dateFormats = entryDate ? [
          entryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }), // "Apr 02, 2025"
          entryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' }), // "April 02, 2025"
          entryDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }), // "04/02/2025"
          entryDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }), // "Apr 02"
          entryDate.toLocaleDateString('en-US', { month: 'long', day: '2-digit' }), // "April 02"
          entryDate.getFullYear().toString(), // "2025"
        ] : [];
        
        return command.title.toLowerCase().includes(searchLower) ||
               (command.description && command.description.toLowerCase().includes(searchLower)) ||
               (command.fullContent && command.fullContent.toLowerCase().includes(searchLower)) ||
               dateFormats.some(dateFormat => dateFormat.toLowerCase().includes(searchLower));
      }).sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0)) // Sort search results by date
    : allEntryCommands
        .sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0))
        .slice(0, 4); // Show 4 most recent when not searching

  // Filter static commands based on search
  const filteredStaticCommands = staticCommands.filter(command => 
    command.title.toLowerCase().includes(search.toLowerCase()) ||
    (command.description && command.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Combine filtered commands
  const filteredCommands = [...filteredStaticCommands, ...filteredEntryCommands];

  // Get theme options for dropdown
  const getThemeOptions = () => {
    const isLightTheme = theme === 'light' || theme.endsWith('-light');
    
    if (isLightTheme) {
      return [
        { id: 'light', name: 'Default Light', action: () => setTheme('light') },
        { id: 'amethyst-light', name: 'Amethyst Light', action: () => setTheme('amethyst-light') },
        { id: 'cosmic-light', name: 'Cosmic Light', action: () => setTheme('cosmic-light') },
        { id: 'perpetuity-light', name: 'Perpetuity Light', action: () => setTheme('perpetuity-light') },
        { id: 'quantum-rose-light', name: 'Quantum Rose Light', action: () => setTheme('quantum-rose-light') },
        { id: 'clean-slate-light', name: 'Clean Slate Light', action: () => setTheme('clean-slate-light') }
      ];
    } else {
      return [
        { id: 'dark', name: 'Default Dark', action: () => setTheme('dark') },
        { id: 'amethyst-dark', name: 'Amethyst Dark', action: () => setTheme('amethyst-dark') },
        { id: 'cosmic-dark', name: 'Cosmic Dark', action: () => setTheme('cosmic-dark') },
        { id: 'perpetuity-dark', name: 'Perpetuity Dark', action: () => setTheme('perpetuity-dark') },
        { id: 'quantum-rose-dark', name: 'Quantum Rose Dark', action: () => setTheme('quantum-rose-dark') },
        { id: 'clean-slate-dark', name: 'Clean Slate Dark', action: () => setTheme('clean-slate-dark') }
      ];
    }
  };

  const themeOptions = getThemeOptions();

  // Handle entry deletion
  const handleDeleteEntry = (entryId: string) => {
    setEntryToDelete(entryId);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteEntry(entryToDelete);
      setEntryToDelete(null);
    }
  };

  const cancelDelete = () => {
    setEntryToDelete(null);
  };

  const handleCopyClick = async (entry: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Find the full entry from entries array
      const fullEntry = entries.find(e => e.id === entry.id);
      if (fullEntry) {
        await navigator.clipboard.writeText(fullEntry.content);
        // Show toast only on desktop (not mobile)
        if (window.matchMedia('(min-width: 768px)').matches) {
          toast({
            description: "Note copied to clipboard",
            duration: 2000,
          });
        }
        console.log('Entry copied to clipboard');
      }
    } catch (err) {
      console.error('Failed to copy entry:', err);
    }
  };

  const handleExportClick = (entry: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Find the full entry from entries array
      const fullEntry = entries.find(e => e.id === entry.id);
      if (fullEntry) {
        // Create a blob with the entry content
        const blob = new Blob([fullEntry.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Create a temporary download link
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename from first line or use date
        const firstLine = fullEntry.content.split('\n')[0].trim();
        const filename = firstLine 
          ? `${firstLine.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim()}.txt`
          : `note-${new Date(fullEntry.date).toISOString().split('T')[0]}.txt`;
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Show toast only on desktop (not mobile)
        if (window.matchMedia('(min-width: 768px)').matches) {
          toast({
            description: "Note exported as .txt file",
            duration: 2000,
          });
        }
        console.log('Entry exported as .txt file');
      }
    } catch (err) {
      console.error('Failed to export entry:', err);
    }
  };

  const handleBranchOffClick = (entry: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Find the full entry from entries array
      const fullEntry = entries.find(e => e.id === entry.id);
      if (fullEntry && fullEntry.content.trim()) {
        branchOffEntry(fullEntry.id);
        // Show toast only on desktop (not mobile)
        if (window.matchMedia('(min-width: 768px)').matches) {
          const originalDate = new Date(fullEntry.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          toast({
            description: `Entry branched off from ${originalDate}`,
            duration: 2000,
          });
        }
        console.log('Entry branched off');
      }
    } catch (err) {
      console.error('Failed to branch off entry:', err);
    }
  };

  // Get the title of the entry to delete
  const entryToDeleteTitle = entryToDelete 
    ? entries.find(entry => entry.id === entryToDelete)?.content.split('\n')[0].slice(0, 50) || 'Untitled Entry'
    : '';

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // If dropdown is open, handle dropdown navigation
      if (showSpecialThemes) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setDropdownSelectedIndex(prev => Math.min(prev + 1, themeOptions.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setDropdownSelectedIndex(prev => Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (themeOptions[dropdownSelectedIndex]) {
              themeOptions[dropdownSelectedIndex].action();
              setShowSpecialThemes(null);
              onClose();
            }
            break;
          case 'Escape':
            e.preventDefault();
            setShowSpecialThemes(null);
            setDropdownSelectedIndex(0);
            break;
        }
        return;
      }

      // If fonts dropdown is open, handle font navigation
      if (showFonts) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setDropdownSelectedIndex(prev => Math.min(prev + 1, fonts.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setDropdownSelectedIndex(prev => Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (fonts[dropdownSelectedIndex]) {
              setSelectedFont(fonts[dropdownSelectedIndex].value as any);
              setShowFonts(null);
              onClose();
            }
            break;
          case 'Escape':
            e.preventDefault();
            setShowFonts(null);
            setDropdownSelectedIndex(0);
            break;
        }
        return;
      }

      // If music dropdown is open, handle music navigation
      if (showMusic) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setDropdownSelectedIndex(prev => Math.min(prev + 1, tracks.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setDropdownSelectedIndex(prev => Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (tracks[dropdownSelectedIndex]) {
              selectAndPlayTrack(tracks[dropdownSelectedIndex]);
              setShowMusic(null);
              onClose();
            }
            break;
          case 'Escape':
            e.preventDefault();
            setShowMusic(null);
            setDropdownSelectedIndex(0);
            break;
        }
        return;
      }

      // If kebab menu is open, handle kebab navigation
      if (showKebabMenu) {
                          const kebabOptions = ['copy', 'branch-off', 'export', 'delete'];
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setDropdownSelectedIndex(prev => Math.min(prev + 1, kebabOptions.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setDropdownSelectedIndex(prev => Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (dropdownSelectedIndex === 0) {
              // Copy action
              const fullEntry = entries.find(e => e.id === showKebabMenu);
              if (fullEntry && fullEntry.content.trim()) {
                navigator.clipboard.writeText(fullEntry.content);
                // Show toast only on desktop (not mobile)
                if (window.matchMedia('(min-width: 768px)').matches) {
                  toast({
                    description: "Note copied to clipboard",
                    duration: 2000,
                  });
                }
              }
            } else if (dropdownSelectedIndex === 1) {
              // Branch off action
              const fullEntry = entries.find(e => e.id === showKebabMenu);
              if (fullEntry && fullEntry.content.trim()) {
                branchOffEntry(fullEntry.id);
                // Show toast only on desktop (not mobile)
                if (window.matchMedia('(min-width: 768px)').matches) {
                  const originalDate = new Date(fullEntry.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  toast({
                    description: `Entry branched off from ${originalDate}`,
                    duration: 2000,
                  });
                }
              }
            } else if (dropdownSelectedIndex === 2) {
              // Export action
              const fullEntry = entries.find(e => e.id === showKebabMenu);
              if (fullEntry && fullEntry.content.trim()) {
                const blob = new Blob([fullEntry.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const firstLine = fullEntry.content.split('\n')[0].trim();
                const filename = firstLine 
                  ? `${firstLine.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim()}.txt`
                  : `note-${new Date(fullEntry.date).toISOString().split('T')[0]}.txt`;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                // Show toast only on desktop (not mobile)
                if (window.matchMedia('(min-width: 768px)').matches) {
                  toast({
                    description: "Note exported as .txt file",
                    duration: 2000,
                  });
                }
              }
            } else if (dropdownSelectedIndex === 3) {
              // Delete action
              handleDeleteEntry(showKebabMenu);
            }
            setShowKebabMenu(null);
            setDropdownSelectedIndex(0);
            break;
          case 'Escape':
            e.preventDefault();
            setShowKebabMenu(null);
            setDropdownSelectedIndex(0);
            break;
        }
        return;
      }

      // Main command palette navigation
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          showScrollbarTemporarily();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          showScrollbarTemporarily();
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            const command = filteredCommands[selectedIndex];
            if (command.isSpecialThemes) {
              setShowSpecialThemes(command.id);
              setDropdownSelectedIndex(0);
            } else if (command.isFonts) {
              setShowFonts(command.id);
              setDropdownSelectedIndex(0);
            } else if (command.isMusic) {
              setShowMusic(command.id);
              setDropdownSelectedIndex(0);
            } else if (command.action) {
              command.action();
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, showSpecialThemes, showFonts, showMusic, showKebabMenu, dropdownSelectedIndex, themeOptions, onClose, setSelectedFont, selectAndPlayTrack, tracks, entries, handleDeleteEntry]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex, isOpen]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300 ease-out" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[40%] z-50 translate-x-[-50%] translate-y-[-50%] p-0 max-w-xl w-full mx-4 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 border-0 shadow-2xl rounded-2xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[state=closed]:slide-out-to-top-[10px] data-[state=open]:slide-in-from-top-[10px] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex flex-col max-h-[70vh] min-w-0 overflow-hidden">
          {/* Search Header */}
          <div className="flex items-center gap-4 px-6 py-5 bg-background/20 animate-in fade-in-0 slide-in-from-top-2 duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <Search className="h-4 w-4 text-muted-foreground/60 flex-shrink-0 animate-in fade-in-0 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ animationDelay: '100ms', animationFillMode: 'both' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search entries or commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground/50 placeholder:font-normal animate-in fade-in-0 slide-in-from-left-2 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ animationDelay: '150ms', animationFillMode: 'both' }}
            />
            <div className="text-[11px] font-medium text-muted-foreground/60 bg-muted/30 px-2 py-1 rounded-md animate-in fade-in-0 zoom-in-95 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
              ⌘K
            </div>
          </div>

          {/* Commands List */}
          <div 
            ref={listRef}
            className={cn(
              "flex-1 overflow-y-auto max-h-80 py-1 transition-all duration-300",
              isScrolling ? "custom-scrollbar-visible" : "custom-scrollbar-hidden"
            )}
            onScroll={handleScroll}
          >
            {filteredCommands.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="h-7 w-7 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-[14px] font-medium text-muted-foreground/70 mb-1">No results found</p>
                <p className="text-[13px] text-muted-foreground/50">Try a different search term</p>
              </div>
            ) : (
              filteredCommands.map((command, index) => (
                <div 
                  key={command.id}
                  style={{ 
                    animationDelay: `${Math.min(index * 20, 100)}ms`,
                    animationFillMode: 'both'
                  }}
                  className="animate-in fade-in-0 slide-in-from-top-1 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                >
                  {command.isSpecialThemes ? (
                    <Popover 
                      open={showSpecialThemes === command.id} 
                      onOpenChange={(open) => setShowSpecialThemes(open ? command.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          onClick={() => setShowSpecialThemes(command.id)}
                          className={cn(
                            "w-full px-6 py-3 flex items-center gap-4 text-left transition-all duration-200 rounded-none relative min-w-0 overflow-hidden",
                            index === selectedIndex 
                              ? "bg-primary/12 border-r-4 border-primary shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-r-sm" 
                              : "hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "flex-shrink-0 transition-colors",
                            index === selectedIndex ? "text-primary" : "text-muted-foreground/70"
                          )}>
                            {command.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn(
                                "text-[14px] font-medium truncate transition-colors",
                                index === selectedIndex ? "text-foreground" : "text-foreground/90"
                              )}>
                                {command.title}
                              </span>
                              <ChevronDown className={cn(
                                "h-3 w-3 transition-colors",
                                index === selectedIndex ? "text-primary/70" : "text-muted-foreground/50"
                              )} />
                            </div>
                            {command.description && (
                              <p className={cn(
                                "text-[12px] line-clamp-1 transition-colors",
                                index === selectedIndex ? "text-muted-foreground/80" : "text-muted-foreground/60"
                              )}>
                                {command.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 bg-background/95 backdrop-blur-xl border-0 shadow-xl rounded-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]" align="start">
                        <div className="space-y-0.5">
                          {themeOptions.map((option, index) => {
                            const getGradient = (themeId: string) => {
                              const gradients: Record<string, string> = {
                                'light': 'from-gray-100 to-gray-200 border border-gray-300',
                                'dark': 'from-gray-700 to-gray-800 border border-gray-600',
                                'amethyst-light': 'from-purple-300 to-pink-300',
                                'amethyst-dark': 'from-purple-600 to-pink-600',
                                'cosmic-light': 'from-blue-300 to-purple-400',
                                'cosmic-dark': 'from-blue-800 to-purple-900',
                                'perpetuity-light': 'from-teal-300 to-cyan-400',
                                'perpetuity-dark': 'from-teal-600 to-cyan-700',
                                'quantum-rose-light': 'from-pink-300 to-rose-400',
                                'quantum-rose-dark': 'from-pink-600 to-fuchsia-700',
                                'clean-slate-light': 'from-slate-200 to-indigo-300',
                                'clean-slate-dark': 'from-slate-600 to-indigo-600'
                              };
                              return gradients[themeId] || 'from-gray-300 to-gray-400';
                            };

                            return (
                              <button
                                key={option.id}
                                onClick={() => {
                                  option.action();
                                  setShowSpecialThemes(null);
                                  onClose();
                                }}
                                className={cn(
                                  "w-full px-3 py-2.5 text-left rounded-lg transition-colors flex items-center gap-3 text-[13px] font-medium",
                                  index === dropdownSelectedIndex 
                                    ? "bg-primary/20 text-primary" 
                                    : "hover:bg-muted/50"
                                )}
                              >
                                <div className={cn("h-3 w-3 rounded-full bg-gradient-to-r", getGradient(option.id))}></div>
                                {option.name}
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : command.isFonts ? (
                    <Popover 
                      open={showFonts === command.id} 
                      onOpenChange={(open) => setShowFonts(open ? command.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          onClick={() => setShowFonts(command.id)}
                          className={cn(
                            "w-full px-6 py-3 flex items-center gap-4 text-left transition-all duration-200 rounded-none relative min-w-0 overflow-hidden",
                            index === selectedIndex 
                              ? "bg-primary/12 border-r-4 border-primary shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-r-sm" 
                              : "hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "flex-shrink-0 transition-colors",
                            index === selectedIndex ? "text-primary" : "text-muted-foreground/70"
                          )}>
                            {command.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn(
                                "text-[14px] font-medium truncate transition-colors",
                                index === selectedIndex ? "text-foreground" : "text-foreground/90"
                              )}>
                                {command.title}
                              </span>
                              <ChevronDown className={cn(
                                "h-3 w-3 transition-colors",
                                index === selectedIndex ? "text-primary/70" : "text-muted-foreground/50"
                              )} />
                            </div>
                            {command.description && (
                              <p className={cn(
                                "text-[12px] line-clamp-1 transition-colors",
                                index === selectedIndex ? "text-muted-foreground/80" : "text-muted-foreground/60"
                              )}>
                                {command.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 bg-background/95 backdrop-blur-xl border-0 shadow-xl rounded-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]" align="start">
                        <div className="space-y-0.5">
                          {fonts.map((font, fontIndex) => (
                                                         <button
                               key={font.value}
                               onClick={() => {
                                 setSelectedFont(font.value as any);
                                 setShowFonts(null);
                                 onClose();
                               }}
                               className={cn(
                                 "w-full px-3 py-2.5 text-left rounded-lg transition-colors flex items-center gap-3 text-[13px] font-medium",
                                 fontIndex === dropdownSelectedIndex 
                                   ? "bg-primary/20 text-primary" 
                                   : "hover:bg-muted/50",
                                 selectedFont === font.value && "bg-primary/10 border border-primary/30",
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
                               <Type className="h-3 w-3" />
                               <span>{font.label}</span>
                               {selectedFont === font.value && (
                                 <div className="ml-auto h-2 w-2 rounded-full bg-primary"></div>
                               )}
                             </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : command.isMusic ? (
                    <Popover 
                      open={showMusic === command.id} 
                      onOpenChange={(open) => setShowMusic(open ? command.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          onClick={() => setShowMusic(command.id)}
                          className={cn(
                            "w-full px-6 py-3 flex items-center gap-4 text-left transition-all duration-200 rounded-none relative min-w-0 overflow-hidden",
                            index === selectedIndex 
                              ? "bg-primary/12 border-r-4 border-primary shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-r-sm" 
                              : "hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "flex-shrink-0 transition-colors",
                            index === selectedIndex ? "text-primary" : "text-muted-foreground/70"
                          )}>
                            {command.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn(
                                "text-[14px] font-medium truncate transition-colors",
                                index === selectedIndex ? "text-foreground" : "text-foreground/90"
                              )}>
                                {command.title}
                              </span>
                              <ChevronDown className={cn(
                                "h-3 w-3 transition-colors",
                                index === selectedIndex ? "text-primary/70" : "text-muted-foreground/50"
                              )} />
                            </div>
                            {command.description && (
                              <p className={cn(
                                "text-[12px] line-clamp-1 transition-colors",
                                index === selectedIndex ? "text-muted-foreground/80" : "text-muted-foreground/60"
                              )}>
                                {command.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 bg-background/95 backdrop-blur-xl border-0 shadow-xl rounded-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]" align="start">
                        <div className="space-y-0.5">
                          {tracks.map((track, trackIndex) => (
                            <button
                              key={track.id}
                              onClick={() => {
                                selectAndPlayTrack(track);
                                setShowMusic(null);
                                onClose();
                              }}
                              className={cn(
                                "w-full px-3 py-2.5 text-left rounded-lg transition-colors flex items-center gap-3 text-[13px] font-medium",
                                trackIndex === dropdownSelectedIndex 
                                  ? "bg-primary/20 text-primary" 
                                  : "hover:bg-muted/50",
                                currentTrack?.id === track.id && "bg-primary/10 border border-primary/30"
                              )}
                            >
                              <Music className="h-3 w-3" />
                                                             <div className="flex-1 min-w-0">
                                 <div className="font-medium truncate">{track.title}</div>
                                 <div className="text-[11px] text-muted-foreground/70 truncate">{track.filename}</div>
                               </div>
                              {currentTrack?.id === track.id && (
                                <div className="ml-auto h-2 w-2 rounded-full bg-primary"></div>
                              )}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div 
                      className={cn(
                        "w-full flex items-center transition-all duration-200 rounded-none relative group min-w-0 overflow-hidden",
                        index === selectedIndex 
                          ? "bg-primary/12 border-r-4 border-primary shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-r-sm" 
                          : "hover:bg-muted/30"
                      )}
                      onMouseEnter={() => command.type === 'entry' && setHoveredEntryId(command.id)}
                      onMouseLeave={() => setHoveredEntryId(null)}
                    >
                      <button
                        onClick={command.action}
                        className="flex-1 px-6 py-3 flex items-center gap-4 text-left min-w-0 overflow-hidden"
                      >
                        <div className={cn(
                          "flex-shrink-0 transition-colors",
                          index === selectedIndex ? "text-primary" : "text-muted-foreground/70"
                        )}>
                          {command.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn(
                              "text-[14px] font-medium truncate transition-colors",
                              index === selectedIndex ? "text-foreground" : "text-foreground/90"
                            )}>
                              {command.title}
                            </span>
                            {command.type === 'entry' && command.lastModified && (
                              <span className={cn(
                                "text-[11px] flex items-center gap-1 flex-shrink-0 transition-colors",
                                index === selectedIndex ? "text-primary/70" : "text-muted-foreground/60"
                              )}>
                                <Clock className="h-2.5 w-2.5" />
                                {formatDate(command.lastModified)}
                              </span>
                            )}
                          </div>
                          {command.description && (
                            <p className={cn(
                              "text-[12px] line-clamp-1 transition-colors",
                              index === selectedIndex ? "text-muted-foreground/80" : "text-muted-foreground/60"
                            )}>
                              {command.description}
                            </p>
                          )}
                        </div>
                      </button>
                      
                      {/* Kebab menu for entries */}
                      {command.type === 'entry' && (hoveredEntryId === command.id || index === selectedIndex) && (
                        <Popover 
                          open={showKebabMenu === command.id} 
                          onOpenChange={(open) => {
                            setShowKebabMenu(open ? command.id : null);
                            if (open) {
                              setDropdownSelectedIndex(0); // Reset to first option when opening
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                        <button
                              onClick={() => {
                                setShowKebabMenu(command.id);
                                setDropdownSelectedIndex(0); // Reset to first option when opening
                          }}
                          className={cn(
                            "flex-shrink-0 p-2 mr-4 rounded-lg transition-all duration-200",
                                "text-muted-foreground hover:text-foreground hover:bg-primary/10"
                              )}
                              title="Entry options"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                              <span className="sr-only">Entry Options</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-40 p-1 bg-background border border-border shadow-lg rounded-md" 
                            align="end"
                            sideOffset={4}
                          >
                            <div className="space-y-1">
                              <button
                                onClick={() => {
                                  const fullEntry = entries.find(entry => entry.id === command.id);
                                  if (fullEntry && fullEntry.content.trim()) {
                                    handleCopyClick(command, new MouseEvent('click') as any);
                                    setShowKebabMenu(null);
                                    setDropdownSelectedIndex(0);
                                  }
                                }}
                                disabled={!entries.find(e => e.id === command.id)?.content.trim()}
                                className={cn(
                                  "w-full px-2 py-1.5 text-left rounded-sm transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer",
                                  dropdownSelectedIndex === 0 && showKebabMenu === command.id
                                    ? "bg-primary/20 text-primary" 
                                    : entries.find(e => e.id === command.id)?.content.trim()
                                    ? "hover:bg-primary/10 focus:bg-primary/10" 
                                    : "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <Copy className="h-4 w-4" />
                                Copy Note
                              </button>
                              <button
                                onClick={() => {
                                  const fullEntry = entries.find(entry => entry.id === command.id);
                                  if (fullEntry && fullEntry.content.trim()) {
                                    handleBranchOffClick(command, new MouseEvent('click') as any);
                                    setShowKebabMenu(null);
                                    setDropdownSelectedIndex(0);
                                  }
                                }}
                                disabled={!entries.find(e => e.id === command.id)?.content.trim()}
                                className={cn(
                                  "w-full px-2 py-1.5 text-left rounded-sm transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer",
                                  dropdownSelectedIndex === 1 && showKebabMenu === command.id
                                    ? "bg-primary/20 text-primary" 
                                    : entries.find(e => e.id === command.id)?.content.trim()
                                    ? "hover:bg-primary/10 focus:bg-primary/10" 
                                    : "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <BranchOffIcon className="h-4 w-4" />
                                Branch Off
                              </button>
                              <button
                                onClick={() => {
                                  const fullEntry = entries.find(entry => entry.id === command.id);
                                  if (fullEntry && fullEntry.content.trim()) {
                                    handleExportClick(command, new MouseEvent('click') as any);
                                    setShowKebabMenu(null);
                                    setDropdownSelectedIndex(0);
                                  }
                                }}
                                disabled={!entries.find(e => e.id === command.id)?.content.trim()}
                                className={cn(
                                  "w-full px-2 py-1.5 text-left rounded-sm transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer",
                                  dropdownSelectedIndex === 2 && showKebabMenu === command.id
                                    ? "bg-primary/20 text-primary" 
                                    : entries.find(e => e.id === command.id)?.content.trim()
                                    ? "hover:bg-primary/10 focus:bg-primary/10" 
                                    : "opacity-50 cursor-not-allowed"
                          )}
                              >
                                <Download className="h-4 w-4" />
                                Export as .txt
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteEntry(command.id);
                                  setShowKebabMenu(null);
                                  setDropdownSelectedIndex(0);
                                }}
                                className={cn(
                                  "w-full px-2 py-1.5 text-left rounded-sm transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer",
                                  dropdownSelectedIndex === 3 && showKebabMenu === command.id
                                    ? "bg-destructive/20 text-destructive" 
                                    : "text-destructive hover:text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
                                )}
                        >
                          <Trash2 className="h-4 w-4" />
                                Delete
                        </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-background/30 border-t border-border/20 animate-in fade-in-0 slide-in-from-bottom-2 duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                  <kbd className="px-1.5 py-0.5 bg-muted/40 rounded text-[10px] font-medium">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                  <kbd className="px-1.5 py-0.5 bg-muted/40 rounded text-[10px] font-medium">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                  <kbd className="px-1.5 py-0.5 bg-muted/40 rounded text-[10px] font-medium">Esc</kbd>
                  Close
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground/50 font-medium">{entries.length} total entries</span>
            </div>
          </div>
        </div>
        </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
        </Dialog>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={entryToDelete !== null}
        onConfirm={confirmDelete}
        onClose={cancelDelete}
        entryTitle={entryToDeleteTitle}
      />
    </>
  );
} 