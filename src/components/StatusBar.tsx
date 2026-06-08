import { cn } from '@/lib/utils';


interface StatusBarProps {
  wordCount: number;
  charCount: number;
  lastSaved: number | null;
  isDirty: boolean;
}

export function StatusBar({ wordCount, charCount, lastSaved, isDirty }: StatusBarProps) {

  const getLastSavedText = () => {
    if (!lastSaved) return 'Not saved yet';
    
    if (isDirty) {
      return 'Saving...';
    }
    
    const diffMs = Date.now() - lastSaved;
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 10) return 'Saved just now';
    if (diffSecs < 60) return `Saved ${diffSecs}s ago`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `Saved ${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Saved ${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Saved ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 mx-auto w-full z-30 pointer-events-none flex justify-center pb-6 px-4">
      <div 
        className={cn(
          "pointer-events-auto flex items-center justify-between gap-3 md:gap-6 px-4 py-2 md:px-6 md:py-2.5 rounded-full w-full max-w-2xl md:max-w-3xl min-h-[2.25rem] md:min-h-[2.5rem] liquid-glass-dock static text-[11px] md:text-xs",
          isDirty && "is-saving"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex gap-3 md:gap-4 text-muted-foreground/80 font-medium">
            <span className="tabular-nums flex items-center gap-0.5 md:gap-1">
              <span>{wordCount}</span>
              <span className="md:inline hidden">{wordCount === 1 ? 'word' : 'words'}</span>
              <span className="md:hidden inline">w</span>
            </span>
            <span className="tabular-nums flex items-center gap-0.5 md:gap-1">
              <span>{charCount}</span>
              <span className="md:inline hidden">{charCount === 1 ? 'character' : 'characters'}</span>
              <span className="md:hidden inline">c</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 md:gap-2.5">
            <span
              className={cn(
                "transition-all duration-300 font-medium",
                isDirty ? "text-amber-500/90 font-semibold" : "text-muted-foreground/85"
              )}
            >
              {getLastSavedText()}
            </span>
            <div 
              className={cn(
                "h-1.5 w-1.5 md:h-2 md:w-2 rounded-full transition-all duration-500 relative flex-shrink-0",
                isDirty 
                  ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" 
                  : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
              )} 
            >
              {isDirty && (
                <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-75" />
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}