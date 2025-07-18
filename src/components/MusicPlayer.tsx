import { useState } from 'react';
import { useAudioPlayerContext } from '@/contexts/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { 
  Play, 
  Pause, 
  Music, 
  Volume2, 
  VolumeX,
  Loader2,
  ChevronDown
} from 'lucide-react';

export function MusicPlayer() {
  const {
    isPlaying,
    currentTrack,
    volume,
    isLoading,
    error,
    togglePlayPause,
    selectTrack,
    setVolume,
    tracks
  } = useAudioPlayerContext();

  const [showTrackList, setShowTrackList] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);

  const isMuted = volume === 0;

  const handleVolumeToggle = () => {
    if (isMuted) {
      setVolume(0.7); // Restore to 70%
    } else {
      setVolume(0); // Mute
    }
  };

  console.log('MusicPlayer render:', { currentTrack, tracks, isLoading, error });
  
  if (!currentTrack) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted/20 border border-border/20">
        <Music className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {tracks.length > 0 ? 'Loading music...' : 'No music available'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted/20 border border-border/20">
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlayPause}
        disabled={isLoading}
        className="h-6 w-6 p-0 hover:bg-primary/10"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>

      {/* Music Icon */}
      <Music className="h-3 w-3 text-muted-foreground" />

      {/* Track Selection Dropdown */}
      <Popover open={showTrackList} onOpenChange={setShowTrackList}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-auto p-1 text-xs font-medium hover:bg-primary/10 flex items-center gap-1",
              error && "text-destructive"
            )}
          >
            <span className="max-w-[120px] truncate">
              {error ? "Error loading" : currentTrack.title}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-48 p-1 border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          align="center"
          sideOffset={4}
        >
          <div className="space-y-1">
            {tracks.map((track) => (
              <Button
                key={track.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-xs h-8 px-2",
                  currentTrack.id === track.id && "bg-primary/10 text-primary"
                )}
                onClick={() => {
                  selectTrack(track);
                  setShowTrackList(false);
                }}
              >
                <Music className="h-3 w-3 mr-2" />
                {track.title}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Volume Control */}
      <Popover open={showVolumeControl} onOpenChange={setShowVolumeControl}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-primary/10"
            onMouseEnter={() => setShowVolumeControl(true)}
          >
            {isMuted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-40 p-4 border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl rounded-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
          align="center"
          sideOffset={8}
          onMouseLeave={() => setShowVolumeControl(false)}
        >
          <div className="space-y-3">
            {/* Header with icon and percentage */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">Volume</span>
              </div>
              <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md min-w-[3rem] text-center">
                {Math.round(volume * 100)}%
              </span>
            </div>
            
            {/* Volume Slider */}
            <div className="px-1">
              <Slider
                value={[volume]}
                onValueChange={([value]) => setVolume(value)}
                max={1}
                min={0}
                step={0.05}
                className="w-full"
              />
            </div>
            
            {/* Mute/Unmute Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleVolumeToggle}
              className="w-full h-8 text-xs font-medium border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
            >
              {isMuted ? (
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3 w-3" />
                  Unmute
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <VolumeX className="h-3 w-3" />
                  Mute
                </div>
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 