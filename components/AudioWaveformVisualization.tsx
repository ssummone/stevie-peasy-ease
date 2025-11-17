'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { WaveformData } from '@/hooks/useAudioVisualization';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioWaveformVisualizationProps {
  waveformData: WaveformData | null;
  fileName?: string;
  isLoading?: boolean;
  onRemove?: () => void;
  currentTime?: number;
  timelineDuration: number;
  onSelect?: () => void;
  isSelected?: boolean;
  trackWidth: number;
  pixelsPerSecond: number;
}

export function AudioWaveformVisualization({
  waveformData,
  fileName = 'Audio Track',
  isLoading = false,
  onRemove,
  currentTime = 0,
  timelineDuration,
  onSelect,
  isSelected = false,
  trackWidth,
  pixelsPerSecond,
}: AudioWaveformVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !waveformData) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Get theme color (primary color from CSS variable)
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim() || 'hsl(262.1 83.3% 57.8%)';

    const width = rect.width;
    const height = rect.height;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    const audioDuration = waveformData.duration ?? 0;
    const visibleAudioDuration =
      timelineDuration > 0 && audioDuration > 0
        ? Math.min(audioDuration, timelineDuration)
        : audioDuration;

    const safePixelsPerSecond =
      pixelsPerSecond > 0
        ? pixelsPerSecond
        : visibleAudioDuration > 0
        ? width / visibleAudioDuration
        : width;
    const visibleWaveformWidth = Math.min(
      width,
      Math.max(visibleAudioDuration * safePixelsPerSecond, 0)
    );

    const peaks = waveformData.peaks;
    const visibleRatio =
      audioDuration > 0 ? Math.min(1, visibleAudioDuration / audioDuration) : 1;
    const visiblePeakCount = Math.max(
      1,
      Math.round(peaks.length * visibleRatio)
    );
    const barWidth =
      visiblePeakCount > 0 ? visibleWaveformWidth / visiblePeakCount : 0;

    ctx.fillStyle = primaryColor;

    for (let i = 0; i < visiblePeakCount; i++) {
      const peak = peaks[i] ?? 0;
      const barHeight = (peak * height) / 2;
      const x = i * Math.max(barWidth, 0);
      const y = height / 2 - barHeight / 2;

      ctx.fillRect(x, y, Math.max(1, Math.max(barWidth, 0) - 1), barHeight);
    }

    // Draw playback position indicator
    if (timelineDuration > 0 && currentTime >= 0) {
      const progressX = Math.min((currentTime / timelineDuration) * width, width);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  }, [waveformData, currentTime, timelineDuration, trackWidth, pixelsPerSecond]);

  if (!waveformData) {
    return null;
  }

  const handleSelect = () => {
    onSelect?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  const audioDurationSeconds = waveformData.duration ?? 0;
  const visibleAudioDuration = Math.min(
    audioDurationSeconds,
    timelineDuration > 0 ? timelineDuration : audioDurationSeconds
  );
  const hasOverflow =
    timelineDuration > 0 && audioDurationSeconds > timelineDuration;

  return (
    <div
      className="w-full space-y-2"
      style={{ width: `${trackWidth}px` }}
    >
      <div
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative rounded-lg border border-border bg-secondary/20 overflow-hidden transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          onSelect && 'cursor-pointer',
          isSelected && 'border-primary ring-2 ring-primary shadow-lg'
        )}
        aria-pressed={isSelected}
      >
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <canvas
          ref={canvasRef}
          className="h-[96px] w-full bg-secondary/50"
          aria-label={`${fileName} waveform`}
        />
        {hasOverflow && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-24 items-center justify-end bg-gradient-to-l from-background/90 via-background/10 to-transparent pr-3">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
              More audio
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
