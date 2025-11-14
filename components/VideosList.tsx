'use client';

import { useState } from 'react';
import { TransitionVideo } from '@/lib/types';
import { Loader2, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideosListProps {
  videos: TransitionVideo[];
  isGenerating: boolean;
}

export function VideosList({ videos, isGenerating }: VideosListProps) {
  const [videoError, setVideoError] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  const completedVideo = videos.find((v) => v.url && !v.loading);

  // Update selected video when a new one completes
  if (completedVideo && completedVideo.url !== selectedVideoUrl) {
    setSelectedVideoUrl(completedVideo.url);
    setVideoError(null);
  }

  const downloadVideo = (video: TransitionVideo, fileName: string) => {
    if (!video.url) return;

    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = video.url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const completedCount = videos.filter((v) => v.url && !v.loading).length;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">
          Transition Videos
        </h2>
        <p className="text-sm text-muted-foreground">
          {completedCount} of {videos.length} videos generated
        </p>
      </div>

      <div className="space-y-3">
        {videos.map((video) => (
          <div
            key={video.id}
            className="flex items-center gap-4 p-4 rounded-lg border border-border"
          >
            {/* Video Preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-foreground">
                  {video.name}
                </span>
                {video.loading && (
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">
                      Generating...
                    </span>
                  </div>
                )}
                {video.error && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-xs text-destructive">Failed</span>
                  </div>
                )}
                {video.url && !video.loading && (
                  <span className="text-xs text-green-600">✓ Ready</span>
                )}
              </div>

              {video.error && (
                <p className="text-xs text-destructive">{video.error}</p>
              )}
            </div>

            {/* Download Button */}
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
                className="gap-2 shrink-0"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Video Player - Show first completed video */}
      {completedVideo && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Preview</h3>
            <span className="text-xs text-muted-foreground">
              {completedVideo.name}
            </span>
          </div>
          <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden border border-border mx-auto">
            {selectedVideoUrl ? (
              <>
                <video
                  key={selectedVideoUrl}
                  controls
                  className="h-full w-full"
                  src={selectedVideoUrl}
                  onError={(e) => {
                    console.error('Video error:', e);
                    const errorMsg = 'Failed to load video. The URL may have expired or is not accessible.';
                    setVideoError(errorMsg);
                  }}
                  onLoadStart={() => {
                    console.log('Loading video:', selectedVideoUrl);
                    setVideoError(null);
                  }}
                  onCanPlay={() => {
                    console.log('Video ready to play:', selectedVideoUrl);
                  }}
                >
                  Your browser does not support the video tag.
                </video>
                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-destructive/10 p-4">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                    <p className="text-xs text-destructive text-center">
                      {videoError}
                    </p>
                    <p className="text-xs text-destructive/70 text-center mt-2">
                      URL: {selectedVideoUrl}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white text-sm">Loading preview...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
