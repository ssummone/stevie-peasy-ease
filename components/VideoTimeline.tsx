import { useEffect, useRef, useState } from 'react';
import { TransitionVideo } from '@/lib/types';
import {
  calculateSegmentBoundaries,
  getTotalDuration,
  timeToPixels,
  pixelsToTime,
  clamp,
} from '@/lib/timeline-utils';
import { cn } from '@/lib/utils';
import { extractVideoThumbnail } from '@/lib/timeline-utils';

interface VideoTimelineProps {
  segments: TransitionVideo[];
  currentTime: number;
  selectedSegmentId: number | null;
  onSeek: (time: number) => void;
  onSegmentSelect: (id: number) => void;
}

export function VideoTimeline({
  segments,
  currentTime,
  selectedSegmentId,
  onSeek,
  onSegmentSelect,
}: VideoTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  const [trackWidth, setTrackWidth] = useState(0);

  const totalDuration = getTotalDuration(segments);
  const normalizedTime = totalDuration > 0 ? currentTime % totalDuration : currentTime;
  const boundaries = calculateSegmentBoundaries(segments);

  // Measure track width
  useEffect(() => {
    const updateWidth = () => {
      if (trackRef.current) {
        setTrackWidth(trackRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Extract thumbnails for each segment
  useEffect(() => {
    const loadThumbnails = async () => {
      const newThumbnails: Record<number, string> = {};

      for (const segment of segments) {
        if (segment.url && !segment.loading) {
          try {
            const thumbnail = await extractVideoThumbnail(segment.url, 0);
            newThumbnails[segment.id] = thumbnail;
          } catch (error) {
            console.error(`Failed to extract thumbnail for segment ${segment.id}:`, error);
          }
        }
      }

      setThumbnails(newThumbnails);
    };

    loadThumbnails();
  }, [segments]);

  // Handle click on timeline to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = pixelsToTime(clickX, totalDuration, rect.width);
    const clampedTime = clamp(newTime, 0, totalDuration);

    onSeek(clampedTime);
  };

  // Handle playhead dragging
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const newTime = pixelsToTime(mouseX, totalDuration, rect.width);
      const clampedTime = clamp(newTime, 0, totalDuration);

      onSeek(clampedTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, totalDuration, onSeek]);

  // Calculate playhead position using tracked width
  const playheadPosition = timeToPixels(normalizedTime, totalDuration, trackWidth);

  return (
    <div className="space-y-2">
      {/* Time Ruler */}
      <div className="relative h-6 px-2">
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="h-1 w-px bg-border" />
              <span>{i}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Track */}
      <div
        ref={trackRef}
        className="relative h-24 cursor-pointer select-none rounded-lg border border-border bg-secondary/30 overflow-hidden"
        onClick={handleTimelineClick}
      >
        {/* Segments */}
        <div className="flex h-full">
          {boundaries.map((boundary) => {
            const widthPercentage =
              ((boundary.endTime - boundary.startTime) / totalDuration) * 100;
            const isSelected = boundary.segment.id === selectedSegmentId;
            const isPlaying =
              normalizedTime >= boundary.startTime && normalizedTime < boundary.endTime;

            return (
              <div
                key={boundary.segment.id}
                className={cn(
                  'relative h-full border-r border-border/50 transition-all',
                  isSelected && 'ring-2 ring-primary ring-inset',
                  isPlaying && 'bg-primary/10'
                )}
                style={{ width: `${widthPercentage}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSegmentSelect(boundary.segment.id);
                }}
              >
                {/* Thumbnail */}
                {thumbnails[boundary.segment.id] && (
                  <img
                    src={thumbnails[boundary.segment.id]}
                    alt={boundary.segment.name}
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                  />
                )}

                {/* Overlay gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Segment Name */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-xs font-medium text-white truncate">
                    {boundary.segment.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
          style={{ left: `${playheadPosition}px` }}
        >
          {/* Playhead handle (draggable) */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full cursor-grab active:cursor-grabbing pointer-events-auto"
            onMouseDown={handlePlayheadMouseDown}
          />
          {/* Playhead line shadow for visibility */}
          <div className="absolute inset-0 -left-px w-1 bg-primary/30 blur-sm -z-10" />
        </div>
      </div>
    </div>
  );
}
