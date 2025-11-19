'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload, Play, PlayCircle, GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { LightRays } from '@/components/ui/light-rays';
import { BlurFade } from '@/components/ui/blur-fade';
import { FinalVideoEditor } from '@/components/FinalVideoEditor';
import { useFinalizeVideo } from '@/hooks/useFinalizeVideo';
import { TransitionVideo, FinalVideo, AudioProcessingOptions } from '@/lib/types';
import TextPressure from '@/components/text/text-pressure';
import { canEncodeVideo, getEncodableVideoCodecs } from 'mediabunny';
import {
  DEFAULT_CUSTOM_BEZIER,
  EASING_PRESETS,
  getPresetBezier,
} from '@/lib/easing-presets';
import { DEFAULT_EASING } from '@/lib/speed-curve-config';
import { AVC_LEVEL_4_0, AVC_LEVEL_5_1 } from '@/lib/video-encoding';

type AudioFinalizeOptions = {
  audioBlob?: Blob;
  audioSettings?: AudioProcessingOptions;
};

type VideoMetadata = {
  width: number;
  height: number;
  duration: number;
};

const FOUR_K_WIDTH = 3840;
const FOUR_K_HEIGHT = 2160;

const readVideoMetadata = (file: File | Blob): Promise<VideoMetadata> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      if (!width || !height) {
        reject(new Error('Unable to determine video dimensions.'));
        return;
      }
      resolve({ width, height, duration });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to read video metadata.'));
    };

    video.src = url;
  });

const getCodecStringForResolution = (width: number, height: number) =>
  width >= FOUR_K_WIDTH || height >= FOUR_K_HEIGHT ? AVC_LEVEL_5_1 : AVC_LEVEL_4_0;

const estimateBitrateForResolution = (width: number, height: number) => {
  const pixels = width * height;
  if (pixels >= FOUR_K_WIDTH * FOUR_K_HEIGHT) {
    return 25_000_000;
  }
  if (pixels >= 2560 * 1440) {
    return 16_000_000;
  }
  if (pixels >= 1920 * 1080) {
    return 12_000_000;
  }
  if (pixels >= 1280 * 720) {
    return 6_000_000;
  }
  return 3_000_000;
};

const formatResolutionLabel = (width?: number, height?: number) =>
  width && height ? `${width}x${height}` : 'this resolution';

const ensureLoopIterations = (segments: TransitionVideo[]): TransitionVideo[] =>
  segments.map((segment) =>
    segment.loopIteration
      ? segment
      : {
        ...segment,
        loopIteration: 1,
      }
  );

const syncSegmentsToLoopCount = (
  segments: TransitionVideo[],
  targetLoopCount: number
): TransitionVideo[] => {
  if (segments.length === 0) {
    return segments;
  }

  const normalized = ensureLoopIterations(segments);
  const currentMaxLoop = normalized.reduce(
    (max, segment) => Math.max(max, segment.loopIteration ?? 1),
    1
  );

  if (targetLoopCount <= currentMaxLoop) {
    return normalized.filter(
      (segment) => (segment.loopIteration ?? 1) <= targetLoopCount
    );
  }

  let updatedSegments = [...normalized];
  let loopCursor = currentMaxLoop;
  let nextId = updatedSegments.reduce((max, segment) => Math.max(max, segment.id), 0) + 1;

  while (loopCursor < targetLoopCount) {
    const sourceSegments = updatedSegments.filter(
      (segment) => (segment.loopIteration ?? 1) === loopCursor
    );
    const fallbackSegments = updatedSegments.filter(
      (segment) => (segment.loopIteration ?? 1) === 1
    );
    const segmentsToClone = sourceSegments.length > 0 ? sourceSegments : fallbackSegments;

    const clonedSegments = segmentsToClone.map((segment) => ({
      ...segment,
      id: nextId++,
      loopIteration: loopCursor + 1,
      customBezier: segment.customBezier
        ? [...segment.customBezier] as [number, number, number, number]
        : undefined,
      file: segment.file, // Explicitly preserve file
    }));

    updatedSegments = [...updatedSegments, ...clonedSegments];
    loopCursor += 1;
  }

  return updatedSegments;
};

export default function Home() {
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const [transitionVideos, setTransitionVideos] = useState<TransitionVideo[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [loopCount, setLoopCount] = useState(1);
  const [draggingVideoIndex, setDraggingVideoIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [finalVideo, setFinalVideo] = useState<FinalVideo | null>(null);
  const [isFinalizingVideo, setIsFinalizingVideo] = useState(false);
  const [finalizationProgress, setFinalizationProgress] = useState(0);
  const [finalizationMessage, setFinalizationMessage] = useState('');
  const [isDropZoneHovered, setIsDropZoneHovered] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isCheckingSupport, setIsCheckingSupport] = useState(true);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check if the browser supports any video encoding
        // This implicitly checks for WebCodecs support
        const codecs = await getEncodableVideoCodecs();
        if (codecs.length === 0) {
          setIsSupported(false);
        }
      } catch (e) {
        console.warn("WebCodecs support check failed:", e);
        setIsSupported(false);
      } finally {
        setIsCheckingSupport(false);
      }
    };
    checkSupport();
  }, []);

  const { finalizeVideos } = useFinalizeVideo();

  const evaluateVideoEncodeCapability = useCallback(
    async (segments: TransitionVideo[]) => {
      await Promise.all(
        segments.map(async (segment) => {
          if (!segment.file) {
            return;
          }
          const segmentId = segment.id;

          setTransitionVideos((prev) => {
            if (!prev.some((v) => v.id === segmentId)) {
              return prev;
            }
            return prev.map((v) =>
              v.id === segmentId
                ? {
                    ...v,
                    encodeCapability: {
                      status: 'checking',
                      message: 'Checking device encoder support…',
                    },
                  }
                : v
            );
          });

          try {
            const metadata = await readVideoMetadata(segment.file);
            const codecString = getCodecStringForResolution(metadata.width, metadata.height);
            const bitrate = estimateBitrateForResolution(metadata.width, metadata.height);
            const supported = await canEncodeVideo('avc', {
              width: metadata.width,
              height: metadata.height,
              bitrate,
              fullCodecString: codecString,
            });

            setTransitionVideos((prev) => {
              if (!prev.some((v) => v.id === segmentId)) {
                return prev;
              }
              return prev.map((v) =>
                v.id === segmentId
                  ? {
                      ...v,
                      width: metadata.width,
                      height: metadata.height,
                      encodeCapability: {
                        status: supported ? 'supported' : 'unsupported',
                        message: supported
                          ? `Device can encode ${metadata.width}x${metadata.height} AVC`
                          : `Device encoder cannot output ${metadata.width}x${metadata.height}`,
                        codecString,
                        bitrate,
                      },
                    }
                  : v
              );
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unable to verify encode capability';
            setTransitionVideos((prev) => {
              if (!prev.some((v) => v.id === segmentId)) {
                return prev;
              }
              return prev.map((v) =>
                v.id === segmentId
                  ? {
                      ...v,
                      encodeCapability: {
                        status: 'error',
                        message: errorMessage,
                      },
                    }
                  : v
              );
            });
          }
        })
      );
    },
    [setTransitionVideos]
  );

  const handleVideosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const videoFiles = Array.from(files).filter((f) =>
        f.type.startsWith('video/')
      );
      setUploadedVideos(videoFiles);

      // Convert uploaded files to TransitionVideo format
      const transitionVideos = videoFiles.map((file, index) => ({
        id: index + 1,
        name: file.name,
        url: URL.createObjectURL(file),
        loading: false,
        duration: 1.5,
        easingPreset: DEFAULT_EASING,
        useCustomEasing: false,
        customBezier: getPresetBezier(DEFAULT_EASING),
        loopIteration: 1,
        file: file,
        encodeCapability: {
          status: 'checking',
          message: 'Checking device encoder support…',
        },
      }));
      setTransitionVideos(transitionVideos);
      setLoopCount(1);
      setSelectedSegmentId(transitionVideos[0]?.id ?? null);
      void evaluateVideoEncodeCapability(transitionVideos);
    }
  };

  const handleSelectSegment = (id: number) => {
    setSelectedSegmentId(id);
  };

  const handleLoopCountChange = (nextLoop: number) => {
    if (nextLoop === loopCount) {
      return;
    }
    setTransitionVideos((prev) => {
      const nextSegments = syncSegmentsToLoopCount(prev, nextLoop);
      if (nextSegments.length === 0) {
        setSelectedSegmentId(null);
      } else if (
        selectedSegmentId === null ||
        !nextSegments.some((segment) => segment.id === selectedSegmentId)
      ) {
        setSelectedSegmentId(nextSegments[0].id);
      }
      return nextSegments;
    });
    setLoopCount(nextLoop);
  };

  const updateSegmentMetadata = (
    id: number,
    updates: Partial<TransitionVideo>,
    applyAll: boolean = false
  ) => {
    setTransitionVideos((prev) =>
      prev.map((segment) => {
        const shouldUpdate = applyAll || segment.id === id;
        if (!shouldUpdate) {
          return segment;
        }

        const nextUpdates = { ...updates };
        if (updates.customBezier) {
          nextUpdates.customBezier = [...updates.customBezier] as [
            number,
            number,
            number,
            number
          ];
        }

        return { ...segment, ...nextUpdates };
      })
    );
  };

  const handleSegmentDurationChange = (id: number, duration: number, applyAll = false) => {
    const safeDuration = Number.isFinite(duration) ? Math.max(0.1, duration) : 0.1;
    updateSegmentMetadata(id, { duration: safeDuration }, applyAll);
  };

  const handleSegmentPresetChange = (id: number, preset: string, applyAll = false) => {
    updateSegmentMetadata(
      id,
      {
        easingPreset: preset,
        useCustomEasing: false,
        customBezier: getPresetBezier(preset),
      },
      applyAll
    );
  };

  const handleSegmentBezierChange = (
    id: number,
    bezier: [number, number, number, number],
    applyAll = false
  ) => {
    updateSegmentMetadata(id, { customBezier: bezier, useCustomEasing: true }, applyAll);
  };

  useEffect(() => {
    if (finalVideo && transitionVideos.length > 0 && selectedSegmentId === null) {
      setSelectedSegmentId(transitionVideos[0].id);
    }
  }, [finalVideo, transitionVideos, selectedSegmentId]);

  const handleCloneSegmentSettings = (id: number) => {
    const sourceSegment = transitionVideos.find((segment) => segment.id === id);
    if (!sourceSegment) {
      return;
    }

    const sourceCurve =
      sourceSegment.customBezier ??
      getPresetBezier(sourceSegment.easingPreset ?? DEFAULT_EASING);

    setTransitionVideos((prev) =>
      prev.map((segment) => {
        if (segment.id === id) {
          return segment;
        }
        return {
          ...segment,
          duration: sourceSegment.duration,
          easingPreset: sourceSegment.easingPreset,
          useCustomEasing: sourceSegment.useCustomEasing,
          customBezier: [...sourceCurve] as [number, number, number, number],
        };
      })
    );
  };

  const handleReapplyFinalVideo = async (options?: AudioFinalizeOptions) => {
    await handleFinalizeVideo(undefined, options);
  };

  const handleFinalizeVideo = async (
    segmentsOverride?: TransitionVideo[],
    options?: AudioFinalizeOptions
  ) => {
    try {
      setIsFinalizingVideo(true);
      setFinalizationProgress(0);
      setFinalizationMessage('Initializing...');

      const baseSegments = segmentsOverride ?? transitionVideos;
      const segmentsToFinalize = syncSegmentsToLoopCount(baseSegments, loopCount);

      const finalBlob = await finalizeVideos(
        segmentsToFinalize,
        (progress) => {
          setFinalizationProgress(progress.progress);
          setFinalizationMessage(progress.message);
        },
        1.5,
        options?.audioBlob,
        options?.audioSettings
      );

      if (!finalBlob) {
        throw new Error('Failed to finalize video');
      }

      // Revoke old object URL to free memory
      if (finalVideo?.url) {
        URL.revokeObjectURL(finalVideo.url);
      }

      // Create new object URL for preview and download
      const objectUrl = URL.createObjectURL(finalBlob);

      setFinalVideo({
        blob: finalBlob,
        url: objectUrl,
        size: finalBlob.size,
        createdAt: new Date(),
      });

      setFinalizationMessage('Video finalized successfully!');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error finalizing video:', error);
      setFinalizationMessage(`Error: ${errorMsg}`);
    } finally {
      setIsFinalizingVideo(false);
    }
  };

  const handleDownloadFinalVideo = () => {
    if (!finalVideo) return;

    const link = document.createElement('a');
    link.href = finalVideo.url;
    link.download = `easy-peasy-ease-${finalVideo.createdAt.getTime()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reorderTransitionVideos = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }
    setTransitionVideos((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const moveVideoUp = (index: number) => {
    if (index === 0) return;
    reorderTransitionVideos(index, index - 1);
  };

  const moveVideoDown = (index: number) => {
    if (index === transitionVideos.length - 1) return;
    reorderTransitionVideos(index, index + 1);
  };

  const handleVideoDragStart = (index: number) => (event: React.DragEvent<HTMLButtonElement>) => {
    setDraggingVideoIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  };

  const handleVideoDragOver = (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (draggingVideoIndex === null || draggingVideoIndex === index) {
      setDropIndicatorIndex(null);
      return;
    }
    event.dataTransfer.dropEffect = 'move';
    setDropIndicatorIndex(index);
  };

  const handleVideoDrop = (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceIndex =
      draggingVideoIndex ?? Number.parseInt(event.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(sourceIndex)) {
      setDraggingVideoIndex(null);
      setDropIndicatorIndex(null);
      return;
    }
    reorderTransitionVideos(sourceIndex, index);
    setDraggingVideoIndex(null);
    setDropIndicatorIndex(null);
  };

  const handleVideoDragEnd = () => {
    setDraggingVideoIndex(null);
    setDropIndicatorIndex(null);
  };

  const handlePlayTransitionVideo = (video: TransitionVideo) => {
    if (!video.url || video.loading) {
      return;
    }
    window.open(video.url, '_blank', 'noopener,noreferrer');
  };

  const warningKeySet = new Set<string>();
  const errorKeySet = new Set<string>();
  const encodeWarnings: string[] = [];
  const encodeErrors: string[] = [];
  let hasPendingEncodeChecks = false;

  transitionVideos.forEach((segment) => {
    const capability = segment.encodeCapability;
    if (!capability) {
      return;
    }
    if (capability.status === 'checking' || capability.status === 'pending') {
      hasPendingEncodeChecks = true;
    }
    const key = `${segment.name}-${segment.width ?? 0}x${segment.height ?? 0}`;
    if (capability.status === 'unsupported') {
      if (!warningKeySet.has(key)) {
        warningKeySet.add(key);
        encodeWarnings.push(`${segment.name} (${formatResolutionLabel(segment.width, segment.height)})`);
      }
    } else if (capability.status === 'error') {
      if (!errorKeySet.has(key)) {
        errorKeySet.add(key);
        encodeErrors.push(segment.name);
      }
    }
  });

  return (
    <div className="relative flex min-h-[calc(100vh-80px)] items-center justify-center bg-background overflow-hidden pb-20 sm:pb-24">
      <LightRays
        className="absolute inset-0 z-0"
        color={isDropZoneHovered ? "rgba(160, 210, 255, 0.17)" : "rgba(160, 210, 255, 0.15)"}
        count={7}
        speed={14}
        length={isDropZoneHovered ? "85vh" : "70vh"}
      />
      <main
        className={cn(
          'relative z-10 flex w-full flex-col items-center justify-center gap-12 px-4 py-12',
          finalVideo ? 'max-w-none items-stretch justify-start px-4 py-8 lg:px-8 lg:py-10' : 'max-w-2xl'
        )}
      >
        {finalVideo ? (
          <section className="w-full min-h-[calc(100vh-5rem)] space-y-8">
            <FinalVideoEditor
              finalVideo={finalVideo}
              segments={transitionVideos}
              selectedSegmentId={selectedSegmentId}
              easingOptions={EASING_PRESETS}
              onSelectSegment={handleSelectSegment}
              onDurationChange={handleSegmentDurationChange}
              onPresetChange={handleSegmentPresetChange}
              onBezierChange={handleSegmentBezierChange}
              defaultBezier={DEFAULT_CUSTOM_BEZIER}
              onCloneSegmentSettings={handleCloneSegmentSettings}
              onUpdateVideo={handleReapplyFinalVideo}
              isUpdating={isFinalizingVideo}
              onExit={() => {
                setFinalVideo(null);
                setTransitionVideos([]);
                setUploadedVideos([]);
                setSelectedSegmentId(null);
                setLoopCount(1);
              }}
              onDownload={handleDownloadFinalVideo}
              loopCount={loopCount}
              onLoopCountChange={handleLoopCountChange}
            />

            <Dialog open={isFinalizingVideo}>
              <DialogContent className="max-w-sm">
                <DialogTitle className="sr-only">Video Processing</DialogTitle>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      {finalizationMessage}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Processing...</span>
                      <span>{Math.round(finalizationProgress)}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${finalizationProgress}%` }}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </section>
        ) : (
          <>
            {/* Header */}
            <BlurFade>
              <div className="flex flex-col items-center gap-3 text-center">
                <TextPressure
                  text="EasyPeasyEase"
                  fontFamily="var(--font-inter-variable)"
                  weight={true}
                  width={false}
                  italic={false}
                  alpha={false}
                  flex={true}
                  minFontSize={40}
                  className="text-4xl sm:text-6xl md:text-8xl lg:text-[140px] font-bold tracking-tight text-foreground"
                />
                {uploadedVideos.length === 0 && (
                  <div className="flex flex-col items-center gap-2 px-4">
                    <p className="max-w-lg text-base sm:text-lg text-muted-foreground">
                      Free tool to stitch and apply ease curves to short videos.
                    </p>
                    <p className="text-xs text-muted-foreground/50">v0.1.1-debug</p>
                  </div>
                )}
              </div>
            </BlurFade>

            {/* Upload Area - Upload Videos */}
            {uploadedVideos.length === 0 && (
              <BlurFade delay={0.2} className="w-full">
                <div className="w-full space-y-4">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideosUpload}
                    className="hidden"
                    id="videos-input"
                    multiple
                    disabled={!isSupported}
                  />
                  <div
                    className={cn(
                      "rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center transition-colors min-h-[300px] flex items-center justify-center",
                      isSupported
                        ? "hover:border-muted-foreground/50 cursor-pointer"
                        : "cursor-not-allowed opacity-75"
                    )}
                    onMouseEnter={() => isSupported && setIsDropZoneHovered(true)}
                    onMouseLeave={() => setIsDropZoneHovered(false)}
                    onClick={() => isSupported && document.getElementById('videos-input')?.click()}
                    onKeyDown={(e) => {
                      if (isSupported && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        document.getElementById('videos-input')?.click();
                      }
                    }}
                    tabIndex={isSupported ? 0 : -1}
                    role="button"
                    aria-label={isSupported ? "Click to upload videos" : "Browser not supported"}
                    aria-disabled={!isSupported}
                  >
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {!isSupported ? 'Browser not supported, try Chrome' : 'Upload your videos'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {!isSupported ? 'WebCodecs API required' : 'MP4, WebM - Select one or more videos'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </BlurFade>
            )}


            {/* Uploaded Videos Preview */}
            {uploadedVideos.length > 0 && (
              <BlurFade delay={0.2} className="w-full">
                <div className="w-full space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Uploaded Videos ({uploadedVideos.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedVideos([]);
                        setTransitionVideos([]);
                        setFinalVideo(null);
                        setSelectedSegmentId(null);
                      }}
                    >
                      Reset
                    </Button>
                  </div>

                  {/* Videos List with Reordering */}
                  <div className="space-y-3">
                    {transitionVideos.map((video, index) => {
                      const isDragging = draggingVideoIndex === index;
                      const statusText = video.loading
                        ? 'Generating...'
                        : video.error
                          ? `Error: ${video.error}`
                          : video.url
                            ? 'Ready to finalize'
                            : 'Pending';
                      const statusColor = video.error
                        ? 'text-destructive'
                        : video.loading
                          ? 'text-muted-foreground'
                          : 'text-emerald-500';
                      const encodeCapability = video.encodeCapability;
                      let encodeStatusText: string | null = null;
                      let encodeStatusClass = 'text-muted-foreground';

                      if (encodeCapability) {
                        switch (encodeCapability.status) {
                          case 'pending':
                          case 'checking':
                            encodeStatusText =
                              encodeCapability.message ?? 'Checking device encoder support…';
                            encodeStatusClass = 'text-muted-foreground';
                            break;
                          case 'supported':
                            encodeStatusText =
                              encodeCapability.message ??
                              `Ready for ${formatResolutionLabel(video.width, video.height)}`;
                            encodeStatusClass = 'text-emerald-500';
                            break;
                          case 'unsupported':
                            encodeStatusText =
                              encodeCapability.message ??
                              `Cannot encode ${formatResolutionLabel(video.width, video.height)} on this device`;
                            encodeStatusClass = 'text-amber-600';
                            break;
                          case 'error':
                            encodeStatusText =
                              encodeCapability.message ?? 'Encoder support check failed';
                            encodeStatusClass = 'text-amber-600';
                            break;
                          default:
                            encodeStatusText = encodeCapability.message ?? null;
                            encodeStatusClass = 'text-muted-foreground';
                        }
                      }

                      return (
                        <div key={video.id}>
                          <div
                            className={cn(
                              'flex items-center gap-3 rounded-lg border border-border/80 bg-secondary/50 p-4 transition-colors',
                              isDragging && 'ring-2 ring-primary/40 bg-secondary'
                            )}
                            onDragOver={handleVideoDragOver(index)}
                            onDrop={handleVideoDrop(index)}
                          >
                            <div className="flex flex-col gap-1 mr-1 md:hidden">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === 0}
                                onClick={() => moveVideoUp(index)}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === transitionVideos.length - 1}
                                onClick={() => moveVideoDown(index)}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <button
                              type="button"
                              className="hidden md:flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border/70 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary cursor-grab"
                              draggable
                              onDragStart={handleVideoDragStart(index)}
                              onDragEnd={handleVideoDragEnd}
                              aria-label={`Reorder ${video.name}`}
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:bg-primary/10 disabled:text-muted-foreground"
                              onClick={() => handlePlayTransitionVideo(video)}
                              disabled={!video.url || video.loading}
                            >
                              <PlayCircle className="h-5 w-5" />
                            </Button>

                            <div className="flex-1 min-w-0 flex items-center gap-3">
                              {video.url && (
                                <video
                                  src={video.url}
                                  className="h-12 w-16 rounded-md object-cover flex-shrink-0 bg-secondary"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {index + 1}. {video.name}
                                </p>
                                <p className={cn('text-xs mt-1', statusColor)}>{statusText}</p>
                                {encodeStatusText && (
                                  <p className={cn('text-xs mt-0.5', encodeStatusClass)}>
                                    {encodeStatusText}
                                  </p>
                                )}
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                              onClick={() => {
                                setTransitionVideos((prev) => prev.filter((v) => v.id !== video.id));
                                setUploadedVideos((prev) => prev.filter((f) => f.name !== video.name));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {dropIndicatorIndex === index && (
                            <div className="h-0.5 bg-primary mt-2 mb-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Finalize Button for Uploaded Videos */}
                  {transitionVideos.every((v) => v.url && !v.loading) && !isFinalizingVideo && (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <Button
                          size="lg"
                          onClick={() => handleFinalizeVideo()}
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          {finalVideo ? 'Finalize Again' : 'Finalize & Stitch Videos'}
                        </Button>
                      </div>
                      {hasPendingEncodeChecks && encodeWarnings.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground">
                          Checking device encoder support for uploaded videos…
                        </p>
                      )}
                      {encodeWarnings.length > 0 && (
                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                          <p className="font-semibold">This device can&apos;t encode:</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {encodeWarnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                          <p className="mt-3 text-xs">
                            Consider downscaling or trimming before finalizing to avoid encoder errors on this device.
                          </p>
                        </div>
                      )}
                      {encodeErrors.length > 0 && (
                        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-800 dark:text-yellow-200">
                          Unable to verify encoder support for {encodeErrors.join(', ')}. Finalization may still work,
                          but it could fail if the device encoder is limited.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Finalization Progress */}
                  {isFinalizingVideo && (
                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          {finalizationMessage}
                        </p>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(finalizationProgress)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${finalizationProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </BlurFade>
            )}

          </>
        )}
      </main>

    </div>
  );
}
