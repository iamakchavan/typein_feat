import { useState, useRef, useEffect, useCallback } from 'react';
import { Track, musicLibrary, getTrackUrl } from '@/lib/musicLibrary';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTrack: Track | null;
  volume: number;
  isLoading: boolean;
  error: string | null;
}

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTrack: null,
    volume: 0.7,
    isLoading: false,
    error: null
  });

  // Initialize audio element
  useEffect(() => {
    console.log('useAudioPlayer: Initializing with musicLibrary:', musicLibrary);
    
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.volume = 0.7; // Set default volume directly

    const audio = audioRef.current;

    const handleLoadStart = () => setState(prev => ({ ...prev, isLoading: true, error: null }));
    const handleCanPlay = () => setState(prev => ({ ...prev, isLoading: false }));
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load audio',
        isPlaying: false 
      }));
    };
    
    const handleEnded = () => {
      // This should not happen with loop=true, but just in case
      console.log('Audio ended - restarting loop');
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    // Load saved preferences
    const savedTrackId = localStorage.getItem('music-current-track');
    const savedVolume = localStorage.getItem('music-volume');
    
    let trackToSet = null;
    
    if (savedTrackId) {
      trackToSet = musicLibrary.find(t => t.id === savedTrackId);
      console.log('Found saved track:', trackToSet);
    }
    
    if (!trackToSet && musicLibrary.length > 0) {
      trackToSet = musicLibrary[0];
      console.log('Using default track:', trackToSet);
    }
    
    if (trackToSet) {
      console.log('Setting track:', trackToSet);
      setState(prev => ({ ...prev, currentTrack: trackToSet }));
      const trackUrl = getTrackUrl(trackToSet.filename);
      console.log('Track URL:', trackUrl);
      audio.src = trackUrl;
      audio.loop = true; // Ensure loop is enabled
    } else {
      console.log('No tracks available in musicLibrary:', musicLibrary);
    }

    if (savedVolume) {
      const volume = parseFloat(savedVolume);
      setState(prev => ({ ...prev, volume }));
      audio.volume = volume;
    }

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  const play = useCallback(async () => {
    if (!audioRef.current || !state.currentTrack) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
    } catch (error) {
      console.error('Error playing audio:', error);
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isLoading: false,
        error: 'Failed to play audio'
      }));
    }
  }, [state.currentTrack]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const selectTrack = useCallback((track: Track) => {
    if (!audioRef.current) return;

    const wasPlaying = state.isPlaying;
    
    // Pause current track
    audioRef.current.pause();
    
    // Set new track
    audioRef.current.src = getTrackUrl(track.filename);
    audioRef.current.loop = true; // Ensure loop is always enabled
    setState(prev => ({ 
      ...prev, 
      currentTrack: track, 
      isPlaying: false,
      error: null 
    }));

    // Save to localStorage
    localStorage.setItem('music-current-track', track.id);

    // Auto-play if was playing before
    if (wasPlaying) {
      setTimeout(() => play(), 100);
    }
  }, [state.isPlaying, play]);

  const setVolume = useCallback((newVolume: number) => {
    if (!audioRef.current) return;

    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    audioRef.current.volume = clampedVolume;
    setState(prev => ({ ...prev, volume: clampedVolume }));
    
    // Save to localStorage
    localStorage.setItem('music-volume', clampedVolume.toString());
  }, []);

  return {
    ...state,
    play,
    pause,
    togglePlayPause,
    selectTrack,
    setVolume,
    tracks: musicLibrary
  };
}; 