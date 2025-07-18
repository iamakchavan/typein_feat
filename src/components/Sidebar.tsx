import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Trash2, Search, MoreVertical, Copy, Download, Pin } from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useEntries, Entry } from '@/contexts/EntryContext';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

function getContentPreview(content: string): string {
  if (!content) return 'Empty entry...';
  const firstLine = content.split('\n').find(line => line.trim()) || '';
  return firstLine.trim().slice(0, 50) + (firstLine.length > 50 ? '...' : '');
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

export function Sidebar({ isOpen, onClose, className }: SidebarProps) {
  const { entries, currentEntry, setCurrentEntry, createNewEntry, deleteEntry, togglePinEntry, branchOffEntry } = useEntries();
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const handleEntryClick = (entry: Entry) => {
    if (currentEntry?.id === entry.id) return;
    setCurrentEntry(entry);
    // Note: We deliberately don't close the sidebar when selecting existing entries
    // This allows users to browse between entries while keeping the sidebar open
  };

  const handleNewEntry = () => {
    createNewEntry();
    // Close sidebar on mobile when creating new entry
    // This allows the editor to get focus and open the keyboard
    if (window.matchMedia('(max-width: 767px)').matches) {
      onClose();
    }
  };

  const handleDeleteClick = (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteEntryId(entryId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteEntryId) {
      deleteEntry(deleteEntryId);
    }
    setIsDeleteModalOpen(false);
    setDeleteEntryId(null);
  };

  const handleCopyClick = async (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(entry.content);
      // Show toast only on desktop (not mobile)
      if (window.matchMedia('(min-width: 768px)').matches) {
        toast({
          description: "Note copied to clipboard",
          duration: 2000,
        });
      }
      console.log('Entry copied to clipboard');
    } catch (err) {
      console.error('Failed to copy entry:', err);
    }
  };

  const handleExportClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Create a blob with the entry content
      const blob = new Blob([entry.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary download link
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename from first line or use date
      const firstLine = entry.content.split('\n')[0].trim();
      const filename = firstLine 
        ? `${firstLine.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim()}.txt`
        : `note-${format(new Date(entry.date), 'yyyy-MM-dd')}.txt`;
      
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
    } catch (err) {
      console.error('Failed to export entry:', err);
    }
  };

  const handlePinClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinEntry(entry.id);
    // Show toast only on desktop (not mobile)
    if (window.matchMedia('(min-width: 768px)').matches) {
      toast({
        description: entry.pinned ? "Note unpinned" : "Note pinned",
        duration: 2000,
      });
    }
  };

  const handleBranchOffClick = (entry: Entry, e: React.MouseEvent) => {
    e.stopPropagation();
    branchOffEntry(entry.id);
    // Show toast only on desktop (not mobile)
    if (window.matchMedia('(min-width: 768px)').matches) {
      const originalDate = format(new Date(entry.date), 'MMM dd, yyyy');
      toast({
        description: `Entry branched off from ${originalDate}`,
        duration: 2000,
      });
    }
  };

  const pinnedEntries = entries.filter(entry => entry.pinned);
  const pinnedCount = pinnedEntries.length;

  const filteredEntries = entries
    .filter(entry => {
    const searchLower = searchQuery.toLowerCase();
    const contentLower = entry.content.toLowerCase();
    const dateLower = format(new Date(entry.date), 'MMMM dd, yyyy').toLowerCase();
    return contentLower.includes(searchLower) || dateLower.includes(searchLower);
    })
    .sort((a, b) => {
      // Sort pinned entries first, then by date
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const entryToDelete = entries.find(entry => entry.id === deleteEntryId);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-40",
          "transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          "lg:hidden"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
          "border-r border-border/10 shadow-xl",
          "transform transition-all duration-300 ease-in-out z-50",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-border/10 bg-background/50">
          <h2 className="text-sm font-semibold">Your life history</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              onClick={handleNewEntry}
            >
              <NewEntryIcon />
              <span className="sr-only">New Entry</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close Sidebar</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-transparent"
            />
          </div>
          <div className="hidden md:flex items-center justify-center mt-2 text-xs text-muted-foreground/60">
            <kbd className="text-[10px] font-medium bg-muted/30 px-1.5 py-0.5 rounded">⌘K</kbd>
            <span className="ml-1">for advanced search</span>
          </div>
        </div>

        {/* Entries List */}
        <div className="h-[calc(100vh-8.5rem)] overflow-y-auto custom-scrollbar-visible">
          <div className="p-2 space-y-1">
            {filteredEntries.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No matching entries found' : 'No entries yet'}
                </p>
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const entryDate = new Date(entry.date);
                const isSelected = entry.id === currentEntry?.id;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "w-full p-3 rounded-lg cursor-pointer group",
                      "transition-all duration-200 ease-in-out",
                      isSelected 
                        ? "bg-primary/15 text-primary shadow-sm" 
                        : "hover:bg-primary/10 hover:text-primary",
                      "border border-transparent",
                      isSelected ? "border-primary/20" : "hover:border-primary/20"
                    )}
                    onClick={() => handleEntryClick(entry)}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {format(entryDate, 'MMM dd, yyyy')}
                          </span>
                          {entry.pinned && (
                            <Pin className="h-3 w-3 text-primary/70 flex-shrink-0" />
                          )}
                          {entry.isBranchedOff && (
                            <div title={`Branched off from ${entry.originalEntryDate ? format(new Date(entry.originalEntryDate), 'MMM dd, yyyy') : 'original entry'}`}>
                              <BranchOffIcon className="h-3 w-3 text-orange-500/70 flex-shrink-0" />
                            </div>
                          )}
                          {isToday(entryDate) && (
                            <span className="flex-shrink-0 text-[10px] font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 group-hover:text-primary/80">
                          {getContentPreview(entry.content)}
                        </div>
                      </div>
                      
                      {/* Desktop version: always rendered, controlled by CSS visibility */}
                      <div className="hidden md:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6 transition-all duration-200",
                                "text-muted-foreground hover:text-foreground hover:bg-primary/10",
                                "opacity-0 group-hover:opacity-100",
                                isSelected && "opacity-100"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                              <span className="sr-only">Entry Options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-40 bg-background border border-border shadow-lg rounded-md"
                            sideOffset={4}
                          >
                            <DropdownMenuItem 
                              onClick={(e) => (entry.content.trim() && (entry.pinned || pinnedCount < 5)) ? handlePinClick(entry, e) : e.stopPropagation()}
                              disabled={!entry.content.trim() || (!entry.pinned && pinnedCount >= 5)}
                              className={cn(
                                "cursor-pointer",
                                entry.content.trim() && (entry.pinned || pinnedCount < 5)
                                  ? "hover:bg-primary/10 focus:bg-primary/10" 
                                  : "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Pin className="h-4 w-4 mr-2" />
                              {entry.pinned ? 'Unpin note' : 'Pin note'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => entry.content.trim() ? handleBranchOffClick(entry, e) : e.stopPropagation()}
                              disabled={!entry.content.trim()}
                              className={cn(
                                "cursor-pointer",
                                entry.content.trim() 
                                  ? "hover:bg-primary/10 focus:bg-primary/10" 
                                  : "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <BranchOffIcon className="h-4 w-4 mr-2 text-orange-500" />
                              Branch Off
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => entry.content.trim() ? handleCopyClick(entry, e) : e.stopPropagation()}
                              disabled={!entry.content.trim()}
                              className={cn(
                                "cursor-pointer",
                                entry.content.trim() 
                                  ? "hover:bg-primary/10 focus:bg-primary/10" 
                                  : "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Note
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => entry.content.trim() ? handleExportClick(entry, e) : e.stopPropagation()}
                              disabled={!entry.content.trim()}
                              className={cn(
                                "cursor-pointer",
                                entry.content.trim() 
                                  ? "hover:bg-primary/10 focus:bg-primary/10" 
                                  : "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export as .txt
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(entry.id, e);
                              }}
                              className="text-destructive hover:text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer"
                      >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Mobile version: only rendered when selected */}
                      {isSelected && (
                        <div className="block md:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                                <span className="sr-only">Entry Options</span>
                      </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end" 
                              className="w-40 bg-background border border-border shadow-lg rounded-md"
                              sideOffset={4}
                            >
                              <DropdownMenuItem 
                                onClick={(e) => (entry.content.trim() && (entry.pinned || pinnedCount < 5)) ? handlePinClick(entry, e) : e.stopPropagation()}
                                disabled={!entry.content.trim() || (!entry.pinned && pinnedCount >= 5)}
                                className={cn(
                                  "cursor-pointer",
                                  entry.content.trim() && (entry.pinned || pinnedCount < 5)
                                    ? "hover:bg-primary/10 focus:bg-primary/10" 
                                    : "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <Pin className="h-4 w-4 mr-2" />
                                {entry.pinned ? 'Unpin note' : 'Pin note'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => entry.content.trim() ? handleBranchOffClick(entry, e) : e.stopPropagation()}
                                disabled={!entry.content.trim()}
                                className={cn(
                                  "cursor-pointer",
                                  entry.content.trim() 
                                    ? "hover:bg-primary/10 focus:bg-primary/10" 
                                    : "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <BranchOffIcon className="h-4 w-4 mr-2 text-orange-500" />
                                Branch Off
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => entry.content.trim() ? handleCopyClick(entry, e) : e.stopPropagation()}
                                disabled={!entry.content.trim()}
                                className={cn(
                                  "cursor-pointer",
                                  entry.content.trim() 
                                    ? "hover:bg-primary/10 focus:bg-primary/10" 
                                    : "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Note
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => entry.content.trim() ? handleExportClick(entry, e) : e.stopPropagation()}
                                disabled={!entry.content.trim()}
                                className={cn(
                                  "cursor-pointer",
                                  entry.content.trim() 
                                    ? "hover:bg-primary/10 focus:bg-primary/10" 
                                    : "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export as .txt
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(entry.id, e);
                                }}
                                className="text-destructive hover:text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          entryTitle={format(new Date(entryToDelete.date), 'MMMM d, yyyy')}
        />
      )}
    </>
  );
} 