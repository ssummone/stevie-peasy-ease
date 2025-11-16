import { Play, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { formatTime } from '@/lib/timeline-utils';

interface VideoPlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  createdAt?: Date;
  videoSize?: number;
}

export function VideoPlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  createdAt,
  videoSize,
}: VideoPlaybackControlsProps) {
  return (
    <div className="flex items-center gap-4 px-2 py-0">
      <button
        onClick={onPlayPause}
        className="p-0 shrink-0 hover:opacity-70 transition-opacity"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-9 w-9" />
        ) : (
          <Play className="h-9 w-9 ml-1" />
        )}
      </button>

      <div className="flex items-center gap-6">
        <div className="text-sm font-medium text-muted-foreground tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {(videoSize !== undefined || createdAt) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {videoSize !== undefined && (
              <span>Size: {(videoSize / 1024 / 1024).toFixed(2)}MB</span>
            )}
            {createdAt && (
              <span>Created: {createdAt.toLocaleTimeString()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
