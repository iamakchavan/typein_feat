import React, { useState, useEffect } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';
import { Play, Pause, Music, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';

export function MobileMusicPlayer() {
  const { 
    isPlaying, 
    currentTrack, 
    volume, 
    togglePlayPause, 
    setVolume,
    tracks,
    selectTrack
  } = useAudioPlayer();

  const [showVolume, setShowVolume] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);

  const toggleMute = () => {
    if (isMuted) {
      setVolume(volume || 0.7);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  const getCurrentTrackIndex = () => {
    return tracks.findIndex(track => track.id === currentTrack?.id);
  };

  const nextTrack = () => {
    const currentIndex = getCurrentTrackIndex();
    const nextIndex = (currentIndex + 1) % tracks.length;
    selectTrack(tracks[nextIndex]);
  };

  const previousTrack = () => {
    const currentIndex = getCurrentTrackIndex();
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    selectTrack(tracks[prevIndex]);
  };

  // Show swipe hint on first load
  useEffect(() => {
    const hasSeenHint = localStorage.getItem('music-swipe-hint-seen');
    if (!hasSeenHint) {
      setShowSwipeHint(true);
      setTimeout(() => setShowSwipeHint(false), 3000);
      localStorage.setItem('music-swipe-hint-seen', 'true');
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextTrack();
    }
    if (isRightSwipe) {
      previousTrack();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  if (!currentTrack) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Music className="h-3 w-3" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </button>

      {/* Track Name - Swipeable */}
      <div
        className={cn(
          "relative flex items-center gap-1 text-muted-foreground cursor-pointer select-none transition-all duration-200",
          isSwiping && "scale-105 opacity-80",
          showSwipeHint && "animate-pulse"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe hint arrows */}
        {showSwipeHint && (
          <>
            <ChevronLeft className="h-2.5 w-2.5 text-primary/60 animate-bounce" />
            <ChevronRight className="h-2.5 w-2.5 text-primary/60 animate-bounce" />
          </>
        )}
        
        <Music className="h-3 w-3" />
        <span className="truncate max-w-[100px]">{currentTrack.title}</span>
        
        {/* Swipe indicator dots - shows actual track count */}
        <div className="flex items-center gap-1 ml-1">
          {tracks.map((_, index) => (
            <div 
              key={index}
              className={cn(
                "h-1 w-1 rounded-full transition-colors duration-200",
                index === getCurrentTrackIndex() 
                  ? "bg-primary/60" 
                  : "bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
      </div>

      {/* Volume Control */}
      <button
        onClick={() => setShowVolume(!showVolume)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {isMuted ? (
          <VolumeX className="h-3 w-3" />
        ) : (
          <Volume2 className="h-3 w-3" />
        )}
      </button>

      {/* Volume Popup */}
      {showVolume && (
        <div className="absolute bottom-6 right-0 bg-background border border-border rounded-lg p-2 shadow-lg min-w-[120px]">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={toggleMute}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isMuted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </button>
            <span className="text-xs text-muted-foreground">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%, hsl(var(--muted)) 100%)`
            }}
          />
        </div>
      )}
    </div>
  );
} 