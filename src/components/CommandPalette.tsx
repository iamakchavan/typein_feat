import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEntries } from '@/contexts/EntryContext';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { Search, FileText, Plus, Clock, Sun, Moon, Palette, ChevronDown, Trash2, Type, Play, Pause, Music } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { fonts } from '@/lib/fonts';
import { Track } from '@/lib/musicLibrary';
import { useAudioPlayerContext } from '@/contexts/AudioPlayerContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  const [dropdownSelectedIndex, setDropdownSelectedIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const { entries, createNewEntry, setCurrentEntry, deleteEntry } = useEntries();
  const { theme, setTheme, selectedFont, setSelectedFont } = useTheme();
  const { isPlaying, currentTrack, togglePlayPause, selectTrack, tracks, play } = useAudioPlayerContext();
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
      icon: <Plus className="h-4 w-4" />,
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
      icon: <FileText className="h-4 w-4" />,
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
  }, [isOpen, selectedIndex, filteredCommands, showSpecialThemes, showFonts, showMusic, dropdownSelectedIndex, themeOptions, onClose, setSelectedFont, selectAndPlayTrack, tracks]);

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
        <div className="flex flex-col max-h-[70vh]">
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
                            "w-full px-6 py-3 flex items-center gap-4 text-left transition-all duration-200 rounded-none relative",
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
                            "w-full px-6 py-3 flex items-center gap-4 text-left transition-all duration-200 rounded-none relative",
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
                                 `font-${font.value}`
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
                            "w-full px-6 py-3 flex items-center gap-4 text-left transition-all duration-200 rounded-none relative",
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
                        "w-full flex items-center transition-all duration-200 rounded-none relative group",
                        index === selectedIndex 
                          ? "bg-primary/12 border-r-4 border-primary shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-r-sm" 
                          : "hover:bg-muted/30"
                      )}
                      onMouseEnter={() => command.type === 'entry' && setHoveredEntryId(command.id)}
                      onMouseLeave={() => setHoveredEntryId(null)}
                    >
                      <button
                        onClick={command.action}
                        className="flex-1 px-6 py-3 flex items-center gap-4 text-left"
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
                      
                      {/* Delete button for entries */}
                      {command.type === 'entry' && (hoveredEntryId === command.id || index === selectedIndex) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEntry(command.id);
                          }}
                          className={cn(
                            "flex-shrink-0 p-2 mr-4 rounded-lg transition-all duration-200",
                            "hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                          )}
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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