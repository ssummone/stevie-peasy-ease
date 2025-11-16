import { useEffect, useRef, useState, useCallback } from 'react';

export interface VideoPlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isReady: boolean;
}

export interface UseVideoPlaybackReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: VideoPlaybackState;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
}

/**
 * Hook for managing video playback state and controls
 */
export function useVideoPlayback(
  onTimeUpdate?: (currentTime: number) => void
): UseVideoPlaybackReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<VideoPlaybackState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    isReady: false,
  });

  const animationFrameRef = useRef<number | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const updateCurrentTimeRef = useRef<() => void | null>(null);

  // Keep refs up to date
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;

    // Update current time using requestAnimationFrame for smooth playhead movement
    updateCurrentTimeRef.current = () => {
      if (videoRef.current && !videoRef.current.paused) {
        const currentTime = videoRef.current.currentTime;
        setState((prev) => ({ ...prev, currentTime }));
        onTimeUpdateRef.current?.(currentTime);
        animationFrameRef.current = requestAnimationFrame(() => updateCurrentTimeRef.current?.());
      }
    };
  });

  // Play video
  const play = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Error playing video:', error);
      });
    }
  }, []);

  // Pause video
  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
      onTimeUpdateRef.current?.(time);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: video.duration,
        isReady: true,
      }));
    };

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
      animationFrameRef.current = requestAnimationFrame(() => updateCurrentTimeRef.current?.());
    };

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleTimeUpdate = () => {
      // Fallback for when RAF isn't running
      if (video.paused) {
        const currentTime = video.currentTime;
        setState((prev) => ({ ...prev, currentTime }));
        onTimeUpdateRef.current?.(currentTime);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if focus isn't on an input element
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause]);

  return {
    videoRef,
    state,
    play,
    pause,
    togglePlayPause,
    seek,
  };
}
