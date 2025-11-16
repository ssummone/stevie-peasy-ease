'use client';

import { useState, useCallback } from 'react';
import { useApplySpeedCurve } from './useApplySpeedCurve';
import { useStitchVideos } from './useStitchVideos';
import { TransitionVideo } from '@/lib/types';
import { DEFAULT_OUTPUT_DURATION, DEFAULT_EASING } from '@/lib/speed-curve-config';
import { createBezierEasing, type EasingFunction } from '@/lib/easing-functions';

interface FinalizeProgress {
  stage: 'idle' | 'applying-curves' | 'stitching' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
  currentVideo?: number;
  totalVideos?: number;
  error?: string;
}

interface UseFinalizeVideoReturn {
  finalizeVideos: (
    transitionVideos: TransitionVideo[],
    onProgress?: (progress: FinalizeProgress) => void,
    inputDuration?: number
  ) => Promise<Blob | null>;
  progress: FinalizeProgress;
  reset: () => void;
}

/**
 * Hook that orchestrates the complete finalization pipeline:
 * 1. Apply speed curves (adaptive expo-in / cubic-out) to each video
 * 2. Stitch all speed-curved videos together
 */
export const useFinalizeVideo = (): UseFinalizeVideoReturn => {
  const [progress, setProgress] = useState<FinalizeProgress>({
    stage: 'idle',
    message: 'Ready to finalize',
    progress: 0,
  });

  const { applySpeedCurve } = useApplySpeedCurve();
  const { stitchVideos } = useStitchVideos();

  const finalizeVideos = useCallback(
    async (
      transitionVideos: TransitionVideo[],
      onProgress?: (progress: FinalizeProgress) => void,
      inputDuration: number = 5
    ): Promise<Blob | null> => {
      try {
        // Validate inputs
        if (transitionVideos.length === 0) {
          throw new Error('No videos to finalize');
        }

        const videosWithUrls = transitionVideos.filter((v) => v.url && !v.loading);
        if (videosWithUrls.length === 0) {
          throw new Error('No successfully loaded videos');
        }

        const totalVideos = videosWithUrls.length;
        const transitionMap = new Map(transitionVideos.map((segment) => [segment.id, segment]));

        // Reset progress
        const initialProgress: FinalizeProgress = {
          stage: 'applying-curves',
          message: 'Fetching and applying speed curves...',
          progress: 0,
          totalVideos,
        };
        setProgress(initialProgress);
        onProgress?.(initialProgress);

        // Step 1: Apply speed curves to each video (parallel processing)
        const speedCurvedBlobs: Blob[] = [];

        for (let i = 0; i < videosWithUrls.length; i++) {
          const video = videosWithUrls[i];
          const videoNumber = i + 1;
          const segmentMetadata = transitionMap.get(video.id) ?? video;
          const targetDuration = segmentMetadata.duration ?? DEFAULT_OUTPUT_DURATION;
          let easingFunction: EasingFunction | string = DEFAULT_EASING;

          if (segmentMetadata.useCustomEasing && segmentMetadata.customBezier) {
            easingFunction = createBezierEasing(...segmentMetadata.customBezier);
          } else if (segmentMetadata.easingPreset) {
            easingFunction = segmentMetadata.easingPreset;
          }

          try {
            // Fetch video blob from URL
            const response = await fetch(video.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch video: ${response.statusText}`);
            }
            const videoBlob = await response.blob();

            // Update progress
            const curveProgress = ((i) / totalVideos) * 50;
            const updateMsg = `Applying speed curve to video ${videoNumber}/${totalVideos}...`;
            const progressObj: FinalizeProgress = {
              stage: 'applying-curves',
              message: updateMsg,
              progress: curveProgress,
              currentVideo: videoNumber,
              totalVideos,
            };
            setProgress(progressObj);
            onProgress?.(progressObj);

            // Apply speed curve with progress callback
            const curvedBlob = await applySpeedCurve(
              videoBlob,
              inputDuration, // Input duration from settings
              targetDuration,
              (curveProgress_inner) => {
                const overallProgress = (i / totalVideos) * 50 +
                  (curveProgress_inner.progress / 100) * (50 / totalVideos);
                const progressUpdate: FinalizeProgress = {
                  stage: 'applying-curves',
                  message: `${updateMsg} (${curveProgress_inner.message})`,
                  progress: overallProgress,
                  currentVideo: videoNumber,
                  totalVideos,
                };
                setProgress(progressUpdate);
                onProgress?.(progressUpdate);
              },
              easingFunction
            );

            if (!curvedBlob) {
              throw new Error(`Failed to apply speed curve to video ${videoNumber}`);
            }

            speedCurvedBlobs.push(curvedBlob);
          } catch (error) {
            const errorMsg = error instanceof Error
              ? error.message
              : `Failed to process video ${videoNumber}`;
            console.error(`Error processing video ${videoNumber}:`, error);
            throw new Error(errorMsg);
          }
        }

        // Step 2: Stitch all speed-curved videos together
        const stitchStartProgress: FinalizeProgress = {
          stage: 'stitching',
          message: 'Stitching videos together...',
          progress: 50,
          totalVideos,
        };
        setProgress(stitchStartProgress);
        onProgress?.(stitchStartProgress);

        const finalBlob = await stitchVideos(
          speedCurvedBlobs,
          (stitchProgress) => {
            const overallProgress = 50 + (stitchProgress.progress / 100) * 50;
            const progressUpdate: FinalizeProgress = {
              stage: 'stitching',
              message: stitchProgress.message,
              progress: overallProgress,
              currentVideo: stitchProgress.currentVideo,
              totalVideos: stitchProgress.totalVideos,
            };
            setProgress(progressUpdate);
            onProgress?.(progressUpdate);
          }
        );

        if (!finalBlob) {
          throw new Error('Failed to stitch videos');
        }

        // Step 3: Complete
        const completeProgress: FinalizeProgress = {
          stage: 'complete',
          message: `Success! Created ${(finalBlob.size / 1024 / 1024).toFixed(2)}MB final video`,
          progress: 100,
          totalVideos,
        };
        setProgress(completeProgress);
        onProgress?.(completeProgress);

        return finalBlob;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Video finalization error:', error);

        const errorProgress: FinalizeProgress = {
          stage: 'error',
          message: `Error: ${errorMessage}`,
          progress: 0,
          error: errorMessage,
        };

        setProgress(errorProgress);
        onProgress?.(errorProgress);

        return null;
      }
    },
    [applySpeedCurve, stitchVideos]
  );

  const reset = useCallback(() => {
    setProgress({
      stage: 'idle',
      message: 'Ready to finalize',
      progress: 0,
    });
  }, []);

  return {
    finalizeVideos,
    progress,
    reset,
  };
};
