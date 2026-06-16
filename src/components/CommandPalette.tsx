import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEntries } from '@/contexts/EntryContext';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { Clock, Sun, Moon, Trash2, MoreVertical, Pin, Filter, ChevronRight, X as ClearIcon } from 'lucide-react';
import { JsonFileIcon, MarkdownFileIcon, EntryPageIcon, CopyIcon, ColorPresetFillIcon, FontSelectorIcon, SearchIcon } from './Icons';
import { Dialog } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { useModalHistory } from '@/hooks/useModalHistory';
import { fonts } from '@/lib/fonts';
import { getEntryPlainText, getEntryTitle, isContentEmpty } from '@/lib/entryHelpers';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { exportEntryAsMarkdown, exportEntryAsJson } from '@/lib/markdown';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

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
  type: 'entry' | 'action' | 'theme' | 'special-themes' | 'fonts';
  lastModified?: Date;
  isSpecialThemes?: boolean;
  isFonts?: boolean;
  fullContent?: string;
  dateString?: string;
}

function parseDateQuery(query: string): { start?: Date; end?: Date; isParsed: boolean; cleanedQuery: string } {
  const q = query.toLowerCase().trim();
  if (!q) return { isParsed: false, cleanedQuery: query };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Relative terms
  if (q === 'today') {
    const start = new Date(today);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start, end, isParsed: true, cleanedQuery: '' };
  }
  if (q.includes('today')) {
    const cleaned = q.replace(/\btoday\b/g, '').replace(/\s+/g, ' ').trim();
    const start = new Date(today);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start, end, isParsed: true, cleanedQuery: cleaned };
  }

  if (q === 'yesterday') {
    const start = new Date(today);
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end, isParsed: true, cleanedQuery: '' };
  }
  if (q.includes('yesterday')) {
    const cleaned = q.replace(/\byesterday\b/g, '').replace(/\s+/g, ' ').trim();
    const start = new Date(today);
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end, isParsed: true, cleanedQuery: cleaned };
  }

  if (q.includes('this month')) {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const cleaned = q.replace(/\bthis month\b/g, '').replace(/\s+/g, ' ').trim();
    return { start, end, isParsed: true, cleanedQuery: cleaned };
  }

  if (q.includes('last month')) {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    const cleaned = q.replace(/\blast month\b/g, '').replace(/\s+/g, ' ').trim();
    return { start, end, isParsed: true, cleanedQuery: cleaned };
  }

  if (q.includes('this year')) {
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
    const cleaned = q.replace(/\bthis year\b/g, '').replace(/\s+/g, ' ').trim();
    return { start, end, isParsed: true, cleanedQuery: cleaned };
  }

  if (q.includes('last year')) {
    const start = new Date(today.getFullYear() - 1, 0, 1);
    const end = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    const cleaned = q.replace(/\blast year\b/g, '').replace(/\s+/g, ' ').trim();
    return { start, end, isParsed: true, cleanedQuery: cleaned };
  }

  // 2. Parse formatted dates like DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, D/M/YY
  const dateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/;
  const match = q.match(dateRegex);
  if (match) {
    let day = parseInt(match[1]);
    let month = parseInt(match[2]) - 1; // 0-indexed
    let year = parseInt(match[3]);
    if (year < 100) {
      year += 2000;
    }
    
    // Swap day/month if month > 11 and day <= 12
    if (month > 11 && day <= 12) {
      const temp = month + 1;
      month = day - 1;
      day = temp;
    }
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const start = new Date(year, month, day);
      const end = new Date(year, month, day);
      end.setHours(23, 59, 59, 999);
      const cleaned = q.replace(match[0], '').replace(/\s+/g, ' ').trim();
      return { start, end, isParsed: true, cleanedQuery: cleaned };
    }
  }

  // 3. Month Name patterns like "04 jan 2025", "4 January", "january 2025"
  const monthNames = [
    ['january', 'jan'],
    ['february', 'feb'],
    ['march', 'mar'],
    ['april', 'apr'],
    ['may', 'may'],
    ['june', 'jun'],
    ['july', 'jul'],
    ['august', 'aug'],
    ['september', 'sep', 'sept'],
    ['october', 'oct'],
    ['november', 'nov'],
    ['december', 'dec']
  ];

  let foundMonthIdx = -1;
  let matchedMonthStr = '';
  for (let i = 0; i < monthNames.length; i++) {
    for (const name of monthNames[i]) {
      const regex = new RegExp(`\\b${name}\\b`, 'i');
      if (regex.test(q)) {
        foundMonthIdx = i;
        matchedMonthStr = name;
        break;
      }
    }
    if (foundMonthIdx !== -1) break;
  }

  if (foundMonthIdx !== -1) {
    let year = now.getFullYear();
    let day: number | null = null;

    const numberMatches = q.match(/\b\d+\b/g);
    if (numberMatches) {
      if (numberMatches.length === 1) {
        const num = parseInt(numberMatches[0]);
        if (num > 31) {
          year = num;
          if (year < 100) year += 2000;
        } else {
          day = num;
        }
      } else if (numberMatches.length >= 2) {
        const num1 = parseInt(numberMatches[0]);
        const num2 = parseInt(numberMatches[1]);
        
        if (numberMatches[0].length === 4) {
          year = num1;
          day = num2;
        } else if (numberMatches[1].length === 4) {
          year = num2;
          day = num1;
        } else {
          if (num1 > 31) {
            year = num1 + 2000;
            day = num2;
          } else if (num2 > 31) {
            year = num2 + 2000;
            day = num1;
          } else {
            const monthPos = q.indexOf(matchedMonthStr);
            const num1Pos = q.indexOf(numberMatches[0]);
            if (num1Pos < monthPos) {
              day = num1;
              year = num2 + 2000;
            } else {
              day = num1;
              year = num2 + 2000;
            }
          }
        }
      }
    }

    // Clean query of the parsed date parts
    let cleaned = q.replace(new RegExp(`\\b${matchedMonthStr}\\b`, 'i'), '');
    if (numberMatches) {
      for (const numStr of numberMatches) {
        cleaned = cleaned.replace(new RegExp(`\\b${numStr}\\b`), '');
      }
    }
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    if (day !== null) {
      const start = new Date(year, foundMonthIdx, day);
      const end = new Date(year, foundMonthIdx, day);
      end.setHours(23, 59, 59, 999);
      return { start, end, isParsed: true, cleanedQuery: cleaned };
    } else {
      const start = new Date(year, foundMonthIdx, 1);
      const end = new Date(year, foundMonthIdx + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, isParsed: true, cleanedQuery: cleaned };
    }
  }

  // 4. Standalone Year (4 digits, e.g. "2025")
  const standaloneYearMatch = q.match(/\b(20\d{2}|19\d{2})\b/);
  if (standaloneYearMatch) {
    const year = parseInt(standaloneYearMatch[1]);
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    const cleaned = q.replace(standaloneYearMatch[0], '').replace(/\s+/g, ' ').trim();
    return { start, end, isParsed: true, cleanedQuery: cleaned };
  }

  return { isParsed: false, cleanedQuery: query };
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  useModalHistory(isOpen, onClose, 'command-palette');
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSpecialThemes, setShowSpecialThemes] = useState<string | null>(null);
  const [showFonts, setShowFonts] = useState<string | null>(null);
  const [showKebabMenu, setShowKebabMenu] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'custom'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showTimelineFilter, setShowTimelineFilter] = useState(false);
  const [showDateRangeFilter, setShowDateRangeFilter] = useState(false);
  const [dropdownSelectedIndex, setDropdownSelectedIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const [isExportExpanded, setIsExportExpanded] = useState(false);
  const { entries, createNewEntry, setCurrentEntry, deleteEntry, branchOffEntry } = useEntries();
  const { theme, setTheme, selectedFont, setSelectedFont } = useTheme();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [viewportOffsetTop, setViewportOffsetTop] = useState<number>(0);
  const [viewportOffsetLeft, setViewportOffsetLeft] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        setViewportOffsetTop(window.visualViewport.offsetTop);
        setViewportOffsetLeft(window.visualViewport.offsetLeft);
      } else {
        setViewportHeight(window.innerHeight);
        setViewportOffsetTop(0);
        setViewportOffsetLeft(0);
      }
    };

    updateViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }
    window.addEventListener('resize', updateViewport);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
    };
  }, [isOpen]);

  // Blur search input on mobile when any filter/popover opens to hide keyboard and free up viewport space
  useEffect(() => {
    if (isMobile && (showTimelineFilter || showDateRangeFilter || showSpecialThemes || showFonts || showKebabMenu)) {
      searchInputRef.current?.blur();
    }
  }, [isMobile, showTimelineFilter, showDateRangeFilter, showSpecialThemes, showFonts, showKebabMenu]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setShowSpecialThemes(null);
      setShowFonts(null);
      setShowKebabMenu(null);
      setIsExportExpanded(false);
      setTimelineFilter('all');
      setDateRange(undefined);
      setShowTimelineFilter(false);
      setShowDateRangeFilter(false);
      setDropdownSelectedIndex(-1);
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
      },
      type: 'theme'
    },
    {
      id: 'special-themes',
      title: 'Color Preset',
      description: 'Browse color preset variants',
      icon: <ColorPresetFillIcon className="h-4 w-4" />,
      type: 'special-themes',
      isSpecialThemes: true
    },
    {
      id: 'fonts',
      title: 'Change Font',
      description: `Browse available fonts (currently: ${fonts.find(f => f.value === selectedFont)?.label || 'Geist'})`,
      icon: <FontSelectorIcon className="h-4 w-4" />,
      type: 'fonts',
      isFonts: true
    },
    {
      id: 'contact-support',
      title: 'Contact Support',
      description: 'For queries and feedback: info@typein.space',
      icon: (
        <svg 
          className="h-4 w-4 bg-current flex-shrink-0" 
          aria-hidden="true" 
          focusable="false" 
          style={{
            maskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/envelope.svg")',
            WebkitMaskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/envelope.svg")',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center center',
            WebkitMaskPosition: 'center center',
          }}
        />
      ),
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
    const plainText = getEntryPlainText(entry.content);
    const title = !isContentEmpty(entry.content)
      ? getEntryTitle(entry.content, `Entry from ${new Date(entry.date).toLocaleDateString()}`)
      : `Entry from ${new Date(entry.date).toLocaleDateString()}`;
    
    const description = plainText.slice(0, 100) + (plainText.length > 100 ? '...' : '');
    
    return {
      id: entry.id,
      title,
      description,
      icon: entry.isBranchedOff ? (
        <BranchOffIcon className="h-4 w-4 text-orange-500" />
      ) : entry.pinned ? (
        <div className="relative">
          <EntryPageIcon className="h-4 w-4 flex-shrink-0" />
          <Pin className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-primary" />
        </div>
      ) : (
        <EntryPageIcon className="h-4 w-4 flex-shrink-0" />
      ),
      action: () => {
        setCurrentEntry(entry);
        onClose();
      },
      type: 'entry' as const,
      lastModified: new Date(entry.date),
      // Add full entry data for enhanced searching
      fullContent: plainText,
      dateString: new Date(entry.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit' 
      })
    };
  });

  // Helper to determine if an entry falls within the active date filter
  const isDateInFilter = (date: Date) => {
    if (timelineFilter === 'all') return true;
    
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Normalize to start of day for simple comparisons

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (timelineFilter === 'today') {
      return d.getTime() === today.getTime();
    }
    if (timelineFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return d.getTime() === yesterday.getTime();
    }
    if (timelineFilter === '7days') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return d.getTime() >= sevenDaysAgo.getTime() && d.getTime() <= today.getTime();
    }
    if (timelineFilter === '30days') {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return d.getTime() >= thirtyDaysAgo.getTime() && d.getTime() <= today.getTime();
    }
    if (timelineFilter === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return d.getTime() >= startOfMonth.getTime() && d.getTime() <= today.getTime();
    }
    if (timelineFilter === 'custom' && dateRange) {
      const from = dateRange.from ? new Date(dateRange.from) : null;
      if (from) from.setHours(0, 0, 0, 0);
      const to = dateRange.to ? new Date(dateRange.to) : null;
      if (to) to.setHours(23, 59, 59, 999);

      if (from && to) {
        return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
      } else if (from) {
        // Only one date selected: applies to that day
        const fromEnd = new Date(from);
        fromEnd.setHours(23, 59, 59, 999);
        return d.getTime() >= from.getTime() && d.getTime() <= fromEnd.getTime();
      }
    }
    return true;
  };

  // Parse search input for natural language dates
  const parsedSearchDate = parseDateQuery(search);

  // Filter entries based on search and date filters
  const filteredEntryCommands = allEntryCommands.filter(command => {
    // 1. First apply timeline/calendar date filter
    if (command.lastModified && !isDateInFilter(command.lastModified)) {
      return false;
    }

    // 2. Next apply parsed search date filter if active
    if (parsedSearchDate.isParsed && command.lastModified) {
      const entryTime = command.lastModified.getTime();
      const startLimit = parsedSearchDate.start?.getTime();
      const endLimit = parsedSearchDate.end?.getTime();
      if (startLimit && entryTime < startLimit) return false;
      if (endLimit && entryTime > endLimit) return false;
    }

    // 3. Finally apply search text if search query is active
    if (search.trim()) {
      if (parsedSearchDate.isParsed) {
        if (!parsedSearchDate.cleanedQuery) {
          return true; // Date-only match
        }
        const queryToUse = parsedSearchDate.cleanedQuery.toLowerCase();
        return command.title.toLowerCase().includes(queryToUse) ||
               (command.description && command.description.toLowerCase().includes(queryToUse)) ||
               (command.fullContent && command.fullContent.toLowerCase().includes(queryToUse));
      }

      const searchLower = search.toLowerCase();
      const entryDate = command.lastModified;
      
      const dateFormats = entryDate ? [
        entryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
        entryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' }),
        entryDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        entryDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        entryDate.toLocaleDateString('en-US', { month: 'long', day: '2-digit' }),
        entryDate.getFullYear().toString(),
      ] : [];
      
      return command.title.toLowerCase().includes(searchLower) ||
             (command.description && command.description.toLowerCase().includes(searchLower)) ||
             (command.fullContent && command.fullContent.toLowerCase().includes(searchLower)) ||
             dateFormats.some(dateFormat => dateFormat.toLowerCase().includes(searchLower));
    }
    
    return true;
  });

  // Sort and format the final list of entries
  const finalEntryCommands = search.trim() || timelineFilter !== 'all'
    ? filteredEntryCommands.sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0))
    : filteredEntryCommands
        .sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0))
        .slice(0, 4); // Keep standard behavior of showing top 4 if no search/filters are active

  // Filter static commands based on search (only show if no date filter is active)
  const filteredStaticCommands = timelineFilter === 'all' && !parsedSearchDate.isParsed
    ? staticCommands.filter(command => 
        command.title.toLowerCase().includes(search.toLowerCase()) ||
        (command.description && command.description.toLowerCase().includes(search.toLowerCase()))
      )
    : []; // Hide actions if date filtering is active

  // Combine filtered commands
  const filteredCommands = [...filteredStaticCommands, ...finalEntryCommands];

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
    setTimeout(() => {
      setIsDeleteModalOpen(true);
    }, 50);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteEntry(entryToDelete);
      toast({
        description: "Note deleted successfully",
        duration: 2000,
      });
    }
    setIsDeleteModalOpen(false);
    setTimeout(() => {
      setEntryToDelete(null);
    }, 400);
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setTimeout(() => {
      setEntryToDelete(null);
    }, 400);
  };

  const handleCopyClick = async (entry: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Find the full entry from entries array
      const fullEntry = entries.find(e => e.id === entry.id);
      if (fullEntry) {
        const plainText = getEntryPlainText(fullEntry.content);
        await navigator.clipboard.writeText(plainText);
        // Show toast only on desktop (not mobile)
        toast({
          description: "Note copied to clipboard",
          duration: 2000,
        });
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
        const plainText = getEntryPlainText(fullEntry.content);
        const blob = new Blob([plainText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Create a temporary download link
        const link = document.createElement('a');
        link.href = url;
        
        const lines = plainText.split('\n');
        const firstLine = (lines.find(line => line.trim() !== '') || '').trim();
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
        toast({
          description: "Note exported as .txt file",
          duration: 2000,
        });
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
      if (fullEntry && !isContentEmpty(fullEntry.content)) {
        branchOffEntry(fullEntry.id);
        // Show toast only on desktop (not mobile)
        const originalDate = new Date(fullEntry.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        toast({
          description: `Entry branched off from ${originalDate}`,
          duration: 2000,
        });
        console.log('Entry branched off');
      }
    } catch (err) {
      console.error('Failed to branch off entry:', err);
    }
  };

  // Get the title of the entry to delete
  const entryToDeleteTitle = entryToDelete 
    ? getEntryTitle(entries.find(entry => entry.id === entryToDelete)?.content || '', 'Untitled Entry')
    : '';

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // If timeline or date range filter popovers are open, block normal command navigation
      if (showTimelineFilter || showDateRangeFilter) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setShowTimelineFilter(false);
          setShowDateRangeFilter(false);
        }
        return;
      }

      // If dropdown is open, handle dropdown navigation
      if (showSpecialThemes) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setDropdownSelectedIndex(prev => prev === -1 ? 0 : Math.min(prev + 1, themeOptions.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setDropdownSelectedIndex(prev => prev === -1 ? themeOptions.length - 1 : Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (themeOptions[dropdownSelectedIndex]) {
              themeOptions[dropdownSelectedIndex].action();
            }
            break;
          case 'Escape':
            e.preventDefault();
            e.stopPropagation();
            setShowSpecialThemes(null);
            setDropdownSelectedIndex(-1);
            break;
        }
        return;
      }

      // If fonts dropdown is open, handle font navigation
      if (showFonts) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setDropdownSelectedIndex(prev => prev === -1 ? 0 : Math.min(prev + 1, fonts.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setDropdownSelectedIndex(prev => prev === -1 ? fonts.length - 1 : Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (fonts[dropdownSelectedIndex]) {
              setSelectedFont(fonts[dropdownSelectedIndex].value as any);
            }
            break;
          case 'Escape':
            e.preventDefault();
            e.stopPropagation();
            setShowFonts(null);
            setDropdownSelectedIndex(-1);
            break;
        }
        return;
      }



      // If kebab menu is open, handle kebab navigation
      if (showKebabMenu) {
        const kebabOptions = isExportExpanded 
          ? ['copy', 'branch-off', 'export', 'export-md', 'export-txt', 'export-json', 'delete']
          : ['copy', 'branch-off', 'export', 'delete'];
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setDropdownSelectedIndex(prev => prev === -1 ? 0 : Math.min(prev + 1, kebabOptions.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setDropdownSelectedIndex(prev => prev === -1 ? kebabOptions.length - 1 : Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            const option = kebabOptions[dropdownSelectedIndex];
            const fullEntry = entries.find(e => e.id === showKebabMenu);
            if (!fullEntry) return;

            if (option === 'copy') {
              if (!isContentEmpty(fullEntry.content)) {
                const plainText = getEntryPlainText(fullEntry.content);
                navigator.clipboard.writeText(plainText);
                if (window.matchMedia('(min-width: 768px)').matches) {
                  toast({
                    description: "Note copied to clipboard",
                    duration: 2000,
                  });
                }
              }
              setShowKebabMenu(null);
              setIsExportExpanded(false);
              setDropdownSelectedIndex(-1);
            } else if (option === 'branch-off') {
              if (!isContentEmpty(fullEntry.content)) {
                branchOffEntry(fullEntry.id);
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
              setShowKebabMenu(null);
              setIsExportExpanded(false);
              setDropdownSelectedIndex(-1);
            } else if (option === 'export') {
              // Toggle export expansion
              setIsExportExpanded(prev => !prev);
            } else if (option === 'export-md') {
              if (!isContentEmpty(fullEntry.content)) {
                try {
                  exportEntryAsMarkdown(fullEntry);
                  toast({
                    title: 'Exported as Markdown',
                    description: 'Note exported successfully',
                  });
                } catch (err) {
                  console.error('Failed to export as markdown:', err);
                }
              }
              setShowKebabMenu(null);
              setIsExportExpanded(false);
              setDropdownSelectedIndex(-1);
            } else if (option === 'export-txt') {
              if (!isContentEmpty(fullEntry.content)) {
                const plainText = getEntryPlainText(fullEntry.content);
                const blob = new Blob([plainText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const lines = plainText.split('\n');
                const firstLine = (lines.find(line => line.trim() !== '') || '').trim();
                const filename = firstLine 
                  ? `${firstLine.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim()}.txt`
                  : `note-${new Date(fullEntry.date).toISOString().split('T')[0]}.txt`;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                if (window.matchMedia('(min-width: 768px)').matches) {
                  toast({
                    description: "Note exported as .txt file",
                    duration: 2000,
                  });
                }
              }
              setShowKebabMenu(null);
              setIsExportExpanded(false);
              setDropdownSelectedIndex(-1);
            } else if (option === 'export-json') {
              if (!isContentEmpty(fullEntry.content)) {
                try {
                  exportEntryAsJson(fullEntry);
                  toast({
                    title: 'Exported as JSON',
                    description: 'Note exported successfully',
                  });
                } catch (err) {
                  console.error('Failed to export as json:', err);
                }
              }
              setShowKebabMenu(null);
              setIsExportExpanded(false);
              setDropdownSelectedIndex(-1);
            } else if (option === 'delete') {
              handleDeleteEntry(showKebabMenu);
              setShowKebabMenu(null);
              setIsExportExpanded(false);
              setDropdownSelectedIndex(-1);
            }
            break;
          case 'Escape':
            e.preventDefault();
            setShowKebabMenu(null);
            setIsExportExpanded(false);
            setDropdownSelectedIndex(-1);
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
          e.stopPropagation();
          if (filteredCommands[selectedIndex]) {
            const command = filteredCommands[selectedIndex];
            if (command.isSpecialThemes) {
              setShowSpecialThemes(command.id);
              setDropdownSelectedIndex(-1);
            } else if (command.isFonts) {
              setShowFonts(command.id);
              setDropdownSelectedIndex(-1);
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

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedIndex, filteredCommands, showSpecialThemes, showFonts, showKebabMenu, showTimelineFilter, showDateRangeFilter, dropdownSelectedIndex, themeOptions, onClose, setSelectedFont, entries, handleDeleteEntry, branchOffEntry, showScrollbarTemporarily, toast, searchInputRef]);

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
          <DialogPrimitive.Content
            onEscapeKeyDown={(e) => {
              // If any dropdown or filter popover is open, block Radix from closing the dialog —
              // our keyboard handler will close only the dropdown/popover.
              if (showSpecialThemes || showFonts || showKebabMenu || showTimelineFilter || showDateRangeFilter) {
                e.preventDefault();
              }
            }}
            className="fixed left-0 md:left-[50%] top-0 md:top-[40%] z-50 translate-x-0 md:translate-x-[-50%] translate-y-0 md:translate-y-[-50%] p-0 w-full h-[100dvh] md:h-auto md:max-w-xl md:mx-4 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 border-0 shadow-2xl rounded-none md:rounded-2xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[state=closed]:slide-out-to-top-[10px] data-[state=open]:slide-in-from-top-[10px] duration-300 ease-out"
            style={
              isMobile && viewportHeight
                ? {
                    height: `${viewportHeight}px`,
                    top: `${viewportOffsetTop}px`,
                    left: `${viewportOffsetLeft}px`,
                    position: 'fixed',
                  }
                : undefined
            }
          >
            <DialogPrimitive.Title className="sr-only">Quick Search</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Search and navigate through your entries, themes, fonts, and music tracks</DialogPrimitive.Description>
        <div className="flex flex-col h-full max-h-full md:max-h-[70vh] min-w-0 overflow-hidden">
          {/* Search Header */}
          <div className="flex items-center gap-4 px-6 pt-10 pb-5 md:py-5 bg-background/20 animate-in fade-in-0 slide-in-from-top-2 duration-400 ease-out">
            <SearchIcon className="h-4 w-4 text-muted-foreground/60 flex-shrink-0 animate-in fade-in-0 duration-500 ease-out" style={{ animationDelay: '100ms', animationFillMode: 'both' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search entries or commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground/50 placeholder:font-normal animate-in fade-in-0 slide-in-from-left-2 duration-500 ease-out"
              style={{ animationDelay: '150ms', animationFillMode: 'both' }}
            />
            <div className="hidden md:flex text-[11px] font-medium text-muted-foreground/60 bg-muted/30 px-2 py-1 rounded-md animate-in fade-in-0 zoom-in-95 duration-500 ease-out" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
              ⌘K
            </div>
            <button
              onClick={onClose}
              className="flex md:hidden text-[14px] font-medium text-primary/80 hover:text-primary active:scale-95 transition-all select-none"
            >
              Cancel
            </button>
          </div>

          {/* Date Filters Bar */}
          <div className="flex items-center gap-2 px-6 pb-4 pt-1 bg-background/20 border-b border-border/10 overflow-x-auto select-none no-scrollbar animate-in fade-in-0 slide-in-from-top-1 duration-400 ease-out" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            {/* Timeline Preset Pill */}
            <Popover open={showTimelineFilter} onOpenChange={setShowTimelineFilter}>
              <PopoverTrigger asChild>
                <button className={cn(
                  "rounded-full text-[12px] font-medium px-3.5 py-1.5 flex items-center gap-1.5 transition-all outline-none liquid-glass-dock",
                  timelineFilter !== 'all'
                    ? "is-active"
                    : "text-foreground/90"
                )}>
                  <Filter className="h-3 w-3 opacity-80" />
                  <span>
                    {timelineFilter === 'all' && 'All Time'}
                    {timelineFilter === 'today' && 'Today'}
                    {timelineFilter === 'yesterday' && 'Yesterday'}
                    {timelineFilter === '7days' && 'Last 7 Days'}
                    {timelineFilter === '30days' && 'Last 30 Days'}
                    {timelineFilter === 'month' && 'This Month'}
                    {timelineFilter === 'custom' && 'Custom Date'}
                  </span>
                  <svg 
                    className="h-3 w-3 bg-current opacity-70 flex-shrink-0" 
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
                </button>
              </PopoverTrigger>
              <PopoverContent forceMount className="w-44 p-0 border-0 bg-transparent shadow-none" align={isMobile ? "center" : "start"}>
                <AnimatePresence>
                  {showTimelineFilter && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="w-full p-1 bg-background/95 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl"
                    >
                      <div className="space-y-0.5">
                        {[
                          { val: 'all', label: 'All Time' },
                          { val: 'today', label: 'Today' },
                          { val: 'yesterday', label: 'Yesterday' },
                          { val: '7days', label: 'Last 7 Days' },
                          { val: '30days', label: 'Last 30 Days' },
                          { val: 'month', label: 'This Month' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => {
                              setTimelineFilter(opt.val as any);
                              setDateRange(undefined);
                              setShowTimelineFilter(false);
                            }}
                            className={cn(
                              "w-full px-2.5 py-1.5 text-left rounded-lg transition-colors text-[13px] font-medium flex items-center justify-between",
                              timelineFilter === opt.val ? "bg-primary/8 text-primary" : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                            )}
                          >
                            <span>{opt.label}</span>
                            {timelineFilter === opt.val && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </PopoverContent>
            </Popover>

            {/* Custom Date Range Pill */}
            <Popover open={showDateRangeFilter} onOpenChange={setShowDateRangeFilter}>
              <PopoverTrigger asChild>
                <button className={cn(
                  "rounded-full text-[12px] font-medium px-3.5 py-1.5 flex items-center gap-1.5 transition-all outline-none liquid-glass-dock",
                  timelineFilter === 'custom'
                    ? "is-active"
                    : "text-foreground/90"
                )}>
                  <svg 
                    className="h-3 w-3 bg-current opacity-80 flex-shrink-0" 
                    aria-hidden="true" 
                    focusable="false" 
                    style={{
                      maskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/calendar.svg")',
                      WebkitMaskImage: 'url("https://d3gk2c5xim1je2.cloudfront.net/fontawesome/v7.2.0/duotone/calendar.svg")',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center center',
                      WebkitMaskPosition: 'center center',
                    }}
                  />
                  <span>
                    {timelineFilter === 'custom' && dateRange ? (
                      dateRange.to ? (
                        `${format(dateRange.from!, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                      ) : (
                        format(dateRange.from!, 'MMMM d, yyyy')
                      )
                    ) : (
                      'Select Date'
                    )}
                  </span>
                  <svg 
                    className="h-3 w-3 bg-current opacity-70 flex-shrink-0" 
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
                </button>
              </PopoverTrigger>
              <PopoverContent forceMount className="w-auto p-0 border-0 bg-transparent shadow-none" align={isMobile ? "center" : "start"}>
                <AnimatePresence>
                  {showDateRangeFilter && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="bg-background/95 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl p-0 overflow-hidden"
                    >
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={(range) => {
                          setDateRange(range);
                          if (range?.from) {
                            setTimelineFilter('custom');
                          } else {
                            setTimelineFilter('all');
                          }
                        }}
                        numberOfMonths={1}
                        captionLayout="dropdown-buttons"
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 10}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </PopoverContent>
            </Popover>

            {/* Reset Button */}
            {timelineFilter !== 'all' && (
              <button
                onClick={() => {
                  setTimelineFilter('all');
                  setDateRange(undefined);
                }}
                className="rounded-full text-[11px] font-medium px-2.5 py-1.5 flex items-center gap-1 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all outline-none"
              >
                <ClearIcon className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Commands List */}
          <div 
            ref={listRef}
            className={cn(
              "flex-1 overflow-y-auto max-h-none md:max-h-80 py-1 transition-all duration-300",
              isScrolling ? "custom-scrollbar-visible" : "custom-scrollbar-hidden"
            )}
            onScroll={handleScroll}
          >
            {filteredCommands.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <EntryPageIcon className="h-7 w-7 mx-auto mb-3 text-muted-foreground/40 flex-shrink-0" />
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
                  className="animate-in fade-in-0 slide-in-from-top-1 duration-300 ease-out"
                >
                  {command.isSpecialThemes ? (
                    <Popover
                      open={showSpecialThemes === command.id}
                      onOpenChange={(open) => setShowSpecialThemes(open ? command.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          tabIndex={-1}
                          onClick={() => setShowSpecialThemes(showSpecialThemes === command.id ? null : command.id)}
                          className={cn(
                            "w-full px-6 py-3 flex items-center gap-4 text-left transition-all duration-200 rounded-none relative min-w-0 overflow-hidden",
                            index === selectedIndex
                              ? "bg-primary/12 border-r-4 border-primary shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-r-sm"
                              : "hover:bg-muted/30"
                          )}
                        >
                          <div className={cn("flex-shrink-0 transition-colors", index === selectedIndex ? "text-primary" : "text-muted-foreground/70")}>
                            {command.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn("text-[14px] font-medium truncate transition-colors", index === selectedIndex ? "text-foreground" : "text-foreground/90")}>
                                {command.title}
                              </span>
                              <svg 
                                className={cn("h-3 w-3 transition-colors", index === selectedIndex ? "bg-primary/70" : "bg-muted-foreground/50")} 
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
                            </div>
                            {command.description && (
                              <p className={cn("text-[12px] line-clamp-1 transition-colors", index === selectedIndex ? "text-muted-foreground/80" : "text-muted-foreground/60")}>
                                {command.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        forceMount
                        className="w-56 p-0 border-0 bg-transparent shadow-none"
                        align={isMobile ? "center" : "start"}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <AnimatePresence>
                          {showSpecialThemes === command.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -8 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className="w-full p-2 bg-background/95 backdrop-blur-xl border border-border/30 shadow-xl rounded-2xl"
                            >
                              <div className="space-y-0.5">
                                {themeOptions.map((option, optIdx) => {
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
                                  return (
                                    <button
                                      key={option.id}
                                      tabIndex={-1}
                                      onClick={() => { option.action(); }}
                                      className={cn(
                                        "w-full px-3 py-1.5 text-left rounded-lg transition-colors flex items-center gap-3 text-[13px] font-medium",
                                        optIdx === dropdownSelectedIndex 
                                          ? "bg-primary/20 text-primary" 
                                          : theme === option.id 
                                            ? "bg-primary/10 text-primary" 
                                            : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                                      )}
                                    >
                                      <div className={cn("h-3 w-3 rounded-full bg-gradient-to-r flex-shrink-0", gradients[option.id] || 'from-gray-300 to-gray-400')} />
                                      <span className="flex-1 truncate">{option.name}</span>
                                      {theme === option.id && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </PopoverContent>
                    </Popover>
                  ) : command.isFonts ? (
                    <Popover
                      open={showFonts === command.id}
                      onOpenChange={(open) => setShowFonts(open ? command.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          tabIndex={-1}
                          onClick={() => setShowFonts(showFonts === command.id ? null : command.id)}
                          className={cn(
                            "w-full px-6 py-3 flex items-center gap-4 text-left transition-all duration-200 rounded-none relative min-w-0 overflow-hidden",
                            index === selectedIndex
                              ? "bg-primary/12 border-r-4 border-primary shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-r-sm"
                              : "hover:bg-muted/30"
                          )}
                        >
                          <div className={cn("flex-shrink-0 transition-colors", index === selectedIndex ? "text-primary" : "text-muted-foreground/70")}>
                            {command.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn("text-[14px] font-medium truncate transition-colors", index === selectedIndex ? "text-foreground" : "text-foreground/90")}>
                                {command.title}
                              </span>
                              <svg 
                                className={cn("h-3 w-3 transition-colors", index === selectedIndex ? "bg-primary/70" : "bg-muted-foreground/50")} 
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
                            </div>
                            {command.description && (
                              <p className={cn("text-[12px] line-clamp-1 transition-colors", index === selectedIndex ? "text-muted-foreground/80" : "text-muted-foreground/60")}>
                                {command.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        forceMount
                        className="w-56 p-0 border-0 bg-transparent shadow-none"
                        align={isMobile ? "center" : "start"}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <AnimatePresence>
                          {showFonts === command.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -8 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className="w-full p-2 bg-background/95 backdrop-blur-xl border border-border/30 shadow-xl rounded-2xl"
                            >
                              <div className="space-y-0.5">
                                {fonts.map((font, fontIdx) => (
                                  <button
                                    key={font.value}
                                    tabIndex={-1}
                                    onClick={() => { setSelectedFont(font.value as any); }}
                                    className={cn(
                                      "w-full px-3 py-1.5 text-left rounded-lg transition-colors flex items-center gap-3 text-[13px] font-medium",
                                      fontIdx === dropdownSelectedIndex 
                                        ? "bg-primary/20 text-primary" 
                                        : selectedFont === font.value 
                                          ? "bg-primary/10 text-primary" 
                                          : "hover:bg-muted/50 text-foreground/80 hover:text-foreground",
                                      { 'font-geist': font.value === 'geist', 'font-space': font.value === 'space', 'font-lora': font.value === 'lora', 'font-instrument-italic': font.value === 'instrument-italic', 'font-playfair': font.value === 'playfair' },
                                      font.value === 'instrument-italic' && 'italic'
                                    )}
                                  >
                                    <FontSelectorIcon className="h-3 w-3 flex-shrink-0" />
                                    <span className="flex-1 truncate">{font.label}</span>
                                    {selectedFont === font.value && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
                      {command.type === 'entry' && (hoveredEntryId === command.id || index === selectedIndex || showKebabMenu === command.id) && (
                        <Popover 
                          open={showKebabMenu === command.id} 
                          onOpenChange={(open) => {
                            setShowKebabMenu(open ? command.id : null);
                            if (open) {
                              setDropdownSelectedIndex(-1); // Reset to -1 when opening
                              setIsExportExpanded(false);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              onClick={() => {
                                setShowKebabMenu(command.id);
                                setDropdownSelectedIndex(-1); // Reset to -1 when opening
                                setIsExportExpanded(false);
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
                            forceMount
                            className="w-48 p-0 border-0 bg-transparent shadow-none focus:outline-none pointer-events-auto" 
                            align="end"
                            sideOffset={5}
                          >
                            <AnimatePresence>
                              {showKebabMenu === command.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                  className="w-full p-1 bg-background/85 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl"
                                >
                                  <div className="space-y-0.5">
                                    <button
                                      onClick={() => {
                                        const fullEntry = entries.find(entry => entry.id === command.id);
                                        if (fullEntry && !isContentEmpty(fullEntry.content)) {
                                          handleCopyClick(command, new MouseEvent('click') as any);
                                          setShowKebabMenu(null);
                                          setIsExportExpanded(false);
                                          setDropdownSelectedIndex(-1);
                                        }
                                      }}
                                      disabled={isExportExpanded || (() => {
                                        const entry = entries.find(e => e.id === command.id);
                                        return !entry || isContentEmpty(entry.content);
                                      })()}
                                      style={{
                                        opacity: isExportExpanded ? 0.35 : 1,
                                        filter: isExportExpanded ? 'blur(0.5px)' : 'none',
                                        transition: 'all 0.2s ease',
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer outline-none focus:outline-none",
                                        dropdownSelectedIndex === 0 && showKebabMenu === command.id
                                          ? "bg-primary/12 text-primary" 
                                          : (() => {
                                              const entry = entries.find(e => e.id === command.id);
                                              return entry && !isContentEmpty(entry.content);
                                            })() && !isExportExpanded
                                          ? "hover:bg-primary/8 focus:bg-primary/8 text-foreground/90 hover:text-foreground" 
                                          : "opacity-40 cursor-not-allowed"
                                      )}
                                    >
                                       <CopyIcon className="h-3.5 w-3.5 opacity-70" />
                                      <span>Copy Note</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        const fullEntry = entries.find(entry => entry.id === command.id);
                                        if (fullEntry && !isContentEmpty(fullEntry.content)) {
                                          handleBranchOffClick(command, new MouseEvent('click') as any);
                                          setShowKebabMenu(null);
                                          setIsExportExpanded(false);
                                          setDropdownSelectedIndex(-1);
                                        }
                                      }}
                                      disabled={isExportExpanded || (() => {
                                        const entry = entries.find(e => e.id === command.id);
                                        return !entry || isContentEmpty(entry.content);
                                      })()}
                                      style={{
                                        opacity: isExportExpanded ? 0.35 : 1,
                                        filter: isExportExpanded ? 'blur(0.5px)' : 'none',
                                        transition: 'all 0.2s ease',
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer outline-none focus:outline-none",
                                        dropdownSelectedIndex === 1 && showKebabMenu === command.id
                                          ? "bg-primary/12 text-primary" 
                                          : (() => {
                                              const entry = entries.find(e => e.id === command.id);
                                              return entry && !isContentEmpty(entry.content);
                                            })() && !isExportExpanded
                                          ? "hover:bg-primary/8 focus:bg-primary/8 text-foreground/90 hover:text-foreground" 
                                          : "opacity-40 cursor-not-allowed"
                                      )}
                                    >
                                      <BranchOffIcon className="h-3.5 w-3.5 opacity-70" />
                                      <span>Branch Off</span>
                                    </button>
                                    
                                    {/* Export Note Trigger */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const fullEntry = entries.find(entry => entry.id === command.id);
                                        if (fullEntry && !isContentEmpty(fullEntry.content)) {
                                          setIsExportExpanded(!isExportExpanded);
                                        }
                                      }}
                                      disabled={(() => {
                                        const entry = entries.find(e => e.id === command.id);
                                        return !entry || isContentEmpty(entry.content);
                                      })()}
                                      className={cn(
                                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer outline-none focus:outline-none select-none",
                                        dropdownSelectedIndex === 2 && showKebabMenu === command.id
                                          ? "bg-primary/12 text-primary"
                                          : (() => {
                                              const entry = entries.find(e => e.id === command.id);
                                              return entry && !isContentEmpty(entry.content);
                                            })()
                                          ? "hover:bg-primary/8 focus:bg-primary/8 text-foreground/90 hover:text-foreground" 
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
                                    </button>

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
                                          <div className="pl-6 pr-1 py-0.5 flex flex-col gap-0.5">
                                            {[
                                              { label: 'as Markdown (.md)', Icon: MarkdownFileIcon, key: 'export-md', idx: 3 },
                                              { label: 'as Plain Text (.txt)', Icon: EntryPageIcon, key: 'export-txt', idx: 4 },
                                              { label: 'as JSON (.json)', Icon: JsonFileIcon, key: 'export-json', idx: 5 },
                                            ].map((opt) => (
                                              <button
                                                key={opt.label}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const fullEntry = entries.find(entry => entry.id === command.id);
                                                  if (fullEntry && !isContentEmpty(fullEntry.content)) {
                                                    if (opt.key === 'export-md') {
                                                      try {
                                                        exportEntryAsMarkdown(fullEntry);
                                                        toast({
                                                          title: 'Exported as Markdown',
                                                          description: 'Note exported successfully',
                                                        });
                                                      } catch (err) {
                                                        console.error(err);
                                                      }
                                                    } else if (opt.key === 'export-txt') {
                                                      handleExportClick(command, new MouseEvent('click') as any);
                                                    } else if (opt.key === 'export-json') {
                                                      try {
                                                        exportEntryAsJson(fullEntry);
                                                        toast({
                                                          title: 'Exported as JSON',
                                                          description: 'Note exported successfully',
                                                        });
                                                      } catch (err) {
                                                        console.error(err);
                                                      }
                                                    }
                                                  }
                                                  setShowKebabMenu(null);
                                                  setIsExportExpanded(false);
                                                  setDropdownSelectedIndex(-1);
                                                }}
                                                className={cn(
                                                  "w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer outline-none focus:outline-none text-left",
                                                  dropdownSelectedIndex === opt.idx && showKebabMenu === command.id
                                                    ? "bg-primary/12 text-primary"
                                                    : "text-foreground/80 hover:bg-primary/8 hover:text-primary focus:bg-primary/8 focus:text-primary"
                                                )}
                                              >
                                                <opt.Icon className="h-3.5 w-3.5 opacity-70" />
                                                <span>{opt.label}</span>
                                              </button>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>

                                    <button
                                      onClick={() => {
                                        handleDeleteEntry(command.id);
                                        setShowKebabMenu(null);
                                        setIsExportExpanded(false);
                                        setDropdownSelectedIndex(-1);
                                      }}
                                      disabled={isExportExpanded}
                                      style={{
                                        opacity: isExportExpanded ? 0.35 : 1,
                                        filter: isExportExpanded ? 'blur(0.5px)' : 'none',
                                        transition: 'all 0.2s ease',
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer outline-none focus:outline-none text-destructive",
                                        (isExportExpanded ? dropdownSelectedIndex === 6 : dropdownSelectedIndex === 3) && showKebabMenu === command.id
                                          ? "bg-destructive/15 text-destructive" 
                                          : !isExportExpanded
                                          ? "hover:bg-destructive/8 focus:bg-destructive/8 hover:text-destructive focus:text-destructive"
                                          : "opacity-40 cursor-not-allowed"
                                      )}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive/80" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
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
          <div className="px-6 py-3 bg-background/30 border-t border-border/20 animate-in fade-in-0 slide-in-from-bottom-2 duration-400 ease-out" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <div className="flex items-center justify-center md:justify-between">
              <div className="hidden md:flex items-center gap-3">
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
        isOpen={isDeleteModalOpen}
        onConfirm={confirmDelete}
        onClose={cancelDelete}
        entryTitle={entryToDeleteTitle}
      />
    </>
  );
} 