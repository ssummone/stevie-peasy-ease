'use client';

import { useState } from 'react';
import { TransitionVideo } from '@/lib/types';
import { Loader2, AlertCircle, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideosListProps {
  videos: TransitionVideo[];
  isGenerating: boolean;
}

export function VideosList({ videos, isGenerating }: VideosListProps) {
  const completedCount = videos.filter((v) => v.url && !v.loading).length;
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const downloadVideo = async (video: TransitionVideo, fileName: string) => {
    if (!video.url) return;
    try {
      setDownloadingId(video.id);
      const response = await fetch(video.url);
      if (!response.ok) {
        throw new Error('Unable to fetch video');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Video download failed', error);
    } finally {
      setDownloadingId((prev) => (prev === video.id ? null : prev));
    }
  };

  return (
    <div className="w-full space-y-3">
      {videos.map((video) => {
        const isReady = Boolean(video.url && !video.loading && !video.error);
        const statusIcon = video.loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          : video.error
            ? <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            : isReady
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              : null;
        const statusLabel = video.loading
          ? 'Generating...'
          : video.error
            ? `Failed: ${video.error}`
            : isReady
              ? 'Ready'
              : 'Pending';

        return (
          <div
            key={video.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-muted/40 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {video.name}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {statusIcon}
                <span className="truncate">{statusLabel}</span>
              </div>
            </div>

            {video.url && !video.loading && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadVideo(
                    video,
                    `transition-${video.id.toString().padStart(2, '0')}.mp4`
                  )
                }
                disabled={downloadingId === video.id}
                className="gap-2 shrink-0"
              >
                {downloadingId === video.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {downloadingId === video.id ? 'Downloading...' : 'Download'}
                </span>
              </Button>
            )}
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground text-center">
        {completedCount} of {videos.length} ready
        {isGenerating ? ' · generating…' : ''}
      </p>
    </div>
  );
}
