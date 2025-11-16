'use client';

import { useState, useCallback } from 'react';
import {
  Input,
  Output,
  VideoSampleSink,
  VideoSampleSource,
  BlobSource,
  ALL_FORMATS,
  BufferTarget,
  Mp4OutputFormat,
} from 'mediabunny';
import {
  DEFAULT_BITRATE,
  MAX_OUTPUT_FPS,
} from '@/lib/speed-curve-config';

interface StitchProgress {
  status: 'idle' | 'processing' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
  currentVideo?: number; // Which video is being processed (1-indexed)
  totalVideos?: number;
  error?: string;
}

interface UseStitchVideosReturn {
  stitchVideos: (
    videoBlobs: Blob[],
    onProgress?: (progress: StitchProgress) => void,
    bitrate?: number
  ) => Promise<Blob | null>;
  progress: StitchProgress;
  reset: () => void;
}

/**
 * Hook for stitching multiple video blobs together sequentially
 * Reads frames from each video and writes them to output in order
 */
export const useStitchVideos = (): UseStitchVideosReturn => {
  const [progress, setProgress] = useState<StitchProgress>({
    status: 'idle',
    message: 'Ready',
    progress: 0,
  });

  const stitchVideos = useCallback(
    async (
      videoBlobs: Blob[],
      onProgress?: (progress: StitchProgress) => void,
      bitrate: number = DEFAULT_BITRATE
    ): Promise<Blob | null> => {
      try {
        // Reset progress
        const initialProgress: StitchProgress = {
          status: 'processing',
          message: 'Initializing stitching...',
          progress: 0,
          totalVideos: videoBlobs.length,
        };
        setProgress(initialProgress);
        onProgress?.(initialProgress);

        if (videoBlobs.length === 0) {
          throw new Error('No videos to stitch');
        }

        // Helper to update progress
        const updateProgress = (
          status: StitchProgress['status'],
          message: string,
          progressValue: number,
          currentVideo?: number
        ) => {
          const p: StitchProgress = {
            status,
            message,
            progress: progressValue,
            currentVideo,
            totalVideos: videoBlobs.length,
          };
          setProgress(p);
          onProgress?.(p);
        };

        // Create output once
        updateProgress('processing', 'Creating output container...', 5);

        const videoSource = new VideoSampleSource({
          codec: 'avc', // H.264
          bitrate,
          keyFrameInterval: 1 / MAX_OUTPUT_FPS,
        });

        const bufferTarget = new BufferTarget();
        const output = new Output({
          format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
          target: bufferTarget,
        });

        output.addVideoTrack(videoSource);
        await output.start();

        // Track cumulative time for proper sequencing
        let currentOutputTime = 0;

        // Process each video blob
        for (let videoIndex = 0; videoIndex < videoBlobs.length; videoIndex++) {
          const videoBlob = videoBlobs[videoIndex];
          const videoNumber = videoIndex + 1;

          updateProgress(
            'processing',
            `Processing video ${videoNumber}/${videoBlobs.length}...`,
            5 + (videoIndex / videoBlobs.length) * 90,
            videoNumber
          );

          try {
            // Create input for this video
            const blobSource = new BlobSource(videoBlob);
            const input = new Input({
              source: blobSource,
              formats: ALL_FORMATS,
            });

            const videoTracks = await input.getVideoTracks();
            if (videoTracks.length === 0) {
              console.warn(`No video tracks in video ${videoNumber}`);
              continue;
            }

            const videoTrack = videoTracks[0];
            const sink = new VideoSampleSink(videoTrack);

            // Get duration of this video
            const videoDuration = await input.computeDuration();

            // Read and write samples from this video
            let samplesFromThisVideo = 0;
            for await (const sample of sink.samples(0, videoDuration)) {
              const originalTimestamp = sample.timestamp ?? 0;

              // Adjust timestamps to fit after previous videos
              const adjustedTimestamp = currentOutputTime + originalTimestamp;
              sample.setTimestamp(adjustedTimestamp);

              await videoSource.add(sample);
              sample.close();

              samplesFromThisVideo++;

              // Update progress
              if (samplesFromThisVideo % 10 === 0) {
                const videoProgress = samplesFromThisVideo / 300; // Rough estimate
                const overallProgress =
                  5 +
                  ((videoIndex + videoProgress) / videoBlobs.length) * 90;
                updateProgress(
                  'processing',
                  `Processing video ${videoNumber}/${videoBlobs.length}: ${samplesFromThisVideo} frames...`,
                  overallProgress,
                  videoNumber
                );
              }
            }

            // Update the current output time for next video
            currentOutputTime += videoDuration;
          } catch (videoError) {
            const errorMsg = videoError instanceof Error
              ? videoError.message
              : `Failed to process video ${videoNumber}`;
            console.error(`Error processing video ${videoNumber}:`, videoError);
            throw new Error(errorMsg);
          }
        }

        updateProgress('processing', 'Finalizing stitched video...', 95);

        // Finalize output
        await output.finalize();
        const buffer = bufferTarget.buffer;

        if (!buffer) {
          throw new Error('Failed to generate output buffer');
        }

        const outputBlob = new Blob([buffer], { type: 'video/mp4' });

        updateProgress(
          'complete',
          `Successfully stitched ${videoBlobs.length} videos into ${(outputBlob.size / 1024 / 1024).toFixed(2)}MB file`,
          100
        );

        return outputBlob;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Video stitching error:', error);

        const errorProgress: StitchProgress = {
          status: 'error',
          message: `Error: ${errorMessage}`,
          progress: 0,
          error: errorMessage,
        };

        setProgress(errorProgress);
        onProgress?.(errorProgress);

        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      message: 'Ready',
      progress: 0,
    });
  }, []);

  return {
    stitchVideos,
    progress,
    reset,
  };
};
