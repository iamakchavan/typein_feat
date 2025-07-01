import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { MusicPlayer } from '@/components/MusicPlayer';

interface StatusBarProps {
  wordCount: number;
  charCount: number;
  lastSaved: number | null;
  isDirty: boolean;
  shortcuts: Array<{ icon: React.ReactNode; combo: string; }>;
}

export function StatusBar({ wordCount, charCount, lastSaved, isDirty, shortcuts }: StatusBarProps) {
  const getLastSavedText = () => {
    if (!lastSaved) return 'Not saved yet';
    
    if (isDirty) {
      return 'Saving...';
    }
    
    return `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`;
  };

  return (
    <footer className="border-t border-border py-2 px-4 text-xs text-muted-foreground bg-muted/10 flex-shrink-0">
      <div className="flex justify-between items-center min-h-[2rem]">
        <div className="flex items-center gap-4">
          <div className="flex gap-4">
            <span className="flex items-center">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span className="flex items-center">{charCount} {charCount === 1 ? 'character' : 'characters'}</span>
          </div>
          <div className="hidden md:flex gap-3 border-l border-border ml-4 pl-4">
            {shortcuts.map(({ icon, combo }) => (
              <span key={combo} className="flex items-center">
                <span className="opacity-70 flex items-center">{icon}</span>
                <kbd className="mx-1.5 px-1.5 py-0.5 text-[10px] font-mono font-medium bg-muted/30 rounded border border-border">
                  {combo}
                </kbd>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Music Player - Hidden on mobile */}
          <div className="hidden md:block">
            <MusicPlayer />
          </div>
          
          {/* Save Status */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "transition-opacity duration-300 flex items-center",
              isDirty ? "opacity-50" : "opacity-100"
            )}
          >
            {getLastSavedText()}
          </span>
          <div 
            className={cn(
              "h-2 w-2 rounded-full transition-colors duration-300",
              isDirty ? "bg-amber-500" : "bg-green-500"
            )} 
          />
          </div>
        </div>
      </div>
    </footer>
  );
}