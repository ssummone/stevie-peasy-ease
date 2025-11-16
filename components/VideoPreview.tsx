'use client';

import { useEffect, useState } from 'react';
import { GeneratedVideo } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

interface VideoPreviewProps {
  video: GeneratedVideo | null;
  onRegenerate?: () => void;
}

export function VideoPreview({ video, onRegenerate }: VideoPreviewProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!video?.startTime) {
      return;
    }
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [video?.startTime]);

  if (!video) {
    return null;
  }

  const elapsedSeconds =
    video.startTime !== undefined ? Math.max(0, Math.round((now - video.startTime) / 1000)) : null;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">
          Generated Video
        </h2>
      </div>

      <div className="flex flex-col items-center gap-4 w-full">
        {/* Video Player Container */}
        <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden border border-border">
          {video.url && (
            <video
              controls
              className="h-full w-full"
              src={video.url}
            >
              Your browser does not support the video tag.
            </video>
          )}

          {video.loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
              <p className="text-white text-sm">
                Generating video...
              </p>
              {elapsedSeconds !== null && (
                <p className="text-white text-xs text-muted-foreground">
                  {elapsedSeconds}s elapsed
                </p>
              )}
            </div>
          )}

          {video.error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-destructive/10 p-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive text-center font-medium">
                Error generating video
              </p>
              <p className="text-xs text-destructive text-center">
                {video.error}
              </p>
            </div>
          )}
        </div>

        {/* Video Info */}
        {video.url && !video.loading && (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <p>Video ready for download and processing</p>
            {elapsedSeconds !== null && (
              <p>
                Generated in {elapsedSeconds}s
              </p>
            )}
          </div>
        )}

        {/* Regenerate Button */}
        {video.error && onRegenerate && (
          <button
            onClick={onRegenerate}
            className="text-sm text-primary hover:underline transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
