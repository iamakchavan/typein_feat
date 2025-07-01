import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useEntries, Entry } from '@/contexts/EntryContext';
import { Input } from '@/components/ui/input';

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

export function Sidebar({ isOpen, onClose, className }: SidebarProps) {
  const { entries, currentEntry, setCurrentEntry, createNewEntry, deleteEntry } = useEntries();
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleEntryClick = (entry: Entry) => {
    if (currentEntry?.id === entry.id) return;
    setCurrentEntry(entry);
  };

  const handleNewEntry = () => {
    createNewEntry();
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

  const filteredEntries = entries.filter(entry => {
    const searchLower = searchQuery.toLowerCase();
    const contentLower = entry.content.toLowerCase();
    const dateLower = format(new Date(entry.date), 'MMMM dd, yyyy').toLowerCase();
    return contentLower.includes(searchLower) || dateLower.includes(searchLower);
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
              <Plus className="h-4 w-4" />
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
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6 transition-all duration-200",
                          "text-muted-foreground hover:text-destructive",
                          "hover:bg-destructive/10",
                          isSelected ? "opacity-100" : "opacity-70 hover:opacity-100"
                        )}
                        onClick={(e) => handleDeleteClick(entry.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Delete Entry</span>
                      </Button>
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