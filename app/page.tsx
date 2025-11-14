'use client';

import { useState } from 'react';
import { Upload, Trash2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LightRays } from '@/components/ui/light-rays';
import { ReplicateTokenInput } from '@/components/ReplicateTokenInput';
import { GeneratedAngles } from '@/components/GeneratedAngles';
import { VideoPreview } from '@/components/VideoPreview';
import { VideosList } from '@/components/VideosList';
import { VideoSettings, type VideoGenerationSettings } from '@/components/VideoSettings';
import { ImageEditDialog } from '@/components/ImageEditDialog';
import { useReplicateAPI } from '@/hooks/useReplicateAPI';
import { ANGLE_CONFIGS } from '@/lib/angle-configs';
import { GeneratedImage, GeneratedVideo, TransitionVideo } from '@/lib/types';

type UploadMode = 'generate' | 'angles' | 'videos';

export default function Home() {
  const [uploadMode, setUploadMode] = useState<UploadMode>('generate');
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadedAngles, setUploadedAngles] = useState<File[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<'generateAngles' | 'generateVideos' | null>(null);
  const [replicateToken, setReplicateToken] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [transitionVideos, setTransitionVideos] = useState<TransitionVideo[]>([]);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [videoSettings, setVideoSettings] = useState<VideoGenerationSettings>({
    model: 'kling-2.1',
    resolution: '720p',
  });
  const [showImageEditDialog, setShowImageEditDialog] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  // Note: Token is passed directly in generateAngles, not via hook
  useReplicateAPI({
    token: replicateToken || '',
  });

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      setSelectedImage(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setSelectedImage(files[0]);
    }
  };

  const handleAnglesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith('image/')
      );
      setUploadedAngles(imageFiles);

      // Create generated images from uploaded files
      if (imageFiles.length > 0) {
        const images = imageFiles.slice(0, 4).map((file, index) => ({
          angle: ANGLE_CONFIGS[index]?.name || `Angle ${index + 1}`,
          url: URL.createObjectURL(file),
          loading: false,
        }));
        setGeneratedImages(images);
      }
    }
  };

  const handleVideosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const videoFiles = Array.from(files).filter((f) =>
        f.type.startsWith('video/')
      );
      setUploadedVideos(videoFiles);

      // Use first video as preview
      if (videoFiles[0]) {
        setGeneratedVideo({
          url: URL.createObjectURL(videoFiles[0]),
          loading: false,
        });
      }
    }
  };

  const handleGoOnThen = async () => {
    setPendingOperation('generateAngles');
    setShowTokenInput(true);
  };

  const handleTokenSubmit = async (token: string) => {
    setReplicateToken(token);
    setShowTokenInput(false);

    if (pendingOperation === 'generateVideos') {
      // Video generation was requested
      setPendingOperation(null);
      setShowVideoSettings(true);
    } else {
      // Default to angle generation
      setPendingOperation(null);
      await generateAngles(token);
    }
  };

  const handleRegenerate = async (index: number) => {
    if (!replicateToken) {
      setShowTokenInput(true);
      return;
    }

    // Regenerate a single angle
    const config = ANGLE_CONFIGS[index];
    setGeneratedImages((prev) => {
      const updated = [...prev];
      updated[index] = {
        angle: config.name,
        url: '',
        loading: true,
      };
      return updated;
    });

    try {
      setIsGenerating(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;

        try {
          const proxyResponse = await fetch('/api/replicate-proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: replicateToken,
              action: 'create-prediction',
              payload: {
                version: 'qwen/qwen-edit-multiangle',
                input: {
                  image: base64String,
                  rotate_degrees: config.rotateDegrees,
                  move_forward: config.moveForward,
                  vertical_tilt: config.verticalTilt,
                  aspect_ratio: 'match_input_image',
                  go_fast: true,
                  output_format: 'webp',
                  output_quality: 95,
                },
              },
            }),
          });

          if (!proxyResponse.ok) {
            const error = await proxyResponse.json();
            throw new Error(error.error || 'Failed to create prediction');
          }

          const prediction = await proxyResponse.json();
          const predictionId = prediction.id;

          // Poll for completion
          let attempts = 0;
          const maxAttempts = 300;
          let currentPrediction = prediction;

          while (
            (currentPrediction.status === 'starting' ||
              currentPrediction.status === 'processing') &&
            attempts < maxAttempts
          ) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;

            const pollResponse = await fetch('/api/replicate-proxy', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token: replicateToken,
                action: 'get-prediction',
                payload: { predictionId },
              }),
            });

            if (!pollResponse.ok) {
              throw new Error('Failed to poll prediction status');
            }

            currentPrediction = await pollResponse.json();
          }

          if (currentPrediction.status === 'failed') {
            throw new Error(currentPrediction.error || 'Prediction failed');
          }

          if (currentPrediction.status !== 'succeeded') {
            throw new Error('Prediction did not complete in time');
          }

          const output = currentPrediction.output;
          const imageUrl = Array.isArray(output) && output.length > 0 ? output[0] : null;

          if (imageUrl) {
            setGeneratedImages((prev) => {
              const updated = [...prev];
              updated[index] = {
                angle: config.name,
                url: imageUrl,
                loading: false,
              };
              return updated;
            });
          } else {
            setGeneratedImages((prev) => {
              const updated = [...prev];
              updated[index] = {
                angle: config.name,
                url: '',
                loading: false,
                error: 'Failed to generate image',
              };
              return updated;
            });
          }
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : 'Unknown error';
          console.error(`Error regenerating angle ${index}:`, errorMsg);
          setGeneratedImages((prev) => {
            const updated = [...prev];
            updated[index] = {
              angle: config.name,
              url: '',
              loading: false,
              error: errorMsg,
            };
            return updated;
          });
        }
      };

      reader.readAsDataURL(selectedImage!);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAngles = async (tokenToUse: string) => {
    if (!selectedImage) return;

    try {
      setIsGenerating(true);
      setGeneratedImages(
        ANGLE_CONFIGS.map((config) => ({
          angle: config.name,
          url: '',
          loading: true,
        }))
      );

      // Convert File to base64 for Replicate API
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;

        // Generate each angle
        for (let i = 0; i < ANGLE_CONFIGS.length; i++) {
          const config = ANGLE_CONFIGS[i];

          try {
            // Call the API directly with the token
            const proxyResponse = await fetch('/api/replicate-proxy', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token: tokenToUse,
                action: 'create-prediction',
                payload: {
                  version: 'qwen/qwen-edit-multiangle',
                  input: {
                    image: base64String,
                    rotate_degrees: config.rotateDegrees,
                    move_forward: config.moveForward,
                    vertical_tilt: config.verticalTilt,
                    aspect_ratio: 'match_input_image',
                    go_fast: true,
                    output_format: 'webp',
                    output_quality: 95,
                  },
                },
              }),
            });

            if (!proxyResponse.ok) {
              const error = await proxyResponse.json();
              throw new Error(error.error || 'Failed to create prediction');
            }

            const prediction = await proxyResponse.json();
            const predictionId = prediction.id;

            // Poll for completion
            let attempts = 0;
            const maxAttempts = 300;
            let currentPrediction = prediction;

            while (
              (currentPrediction.status === 'starting' ||
                currentPrediction.status === 'processing') &&
              attempts < maxAttempts
            ) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              attempts++;

              const pollResponse = await fetch('/api/replicate-proxy', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token: tokenToUse,
                  action: 'get-prediction',
                  payload: { predictionId },
                }),
              });

              if (!pollResponse.ok) {
                throw new Error('Failed to poll prediction status');
              }

              currentPrediction = await pollResponse.json();
            }

            if (currentPrediction.status === 'failed') {
              throw new Error(currentPrediction.error || 'Prediction failed');
            }

            if (currentPrediction.status !== 'succeeded') {
              throw new Error('Prediction did not complete in time');
            }

            const output = currentPrediction.output;
            const imageUrl = Array.isArray(output) && output.length > 0 ? output[0] : null;

            if (imageUrl) {
              setGeneratedImages((prev) => {
                const updated = [...prev];
                updated[i] = {
                  angle: config.name,
                  url: imageUrl,
                  loading: false,
                };
                return updated;
              });
            } else {
              setGeneratedImages((prev) => {
                const updated = [...prev];
                updated[i] = {
                  angle: config.name,
                  url: '',
                  loading: false,
                  error: 'Failed to generate image',
                };
                return updated;
              });
            }
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : 'Unknown error';
            console.error(`Error generating angle ${i}:`, errorMsg);
            setGeneratedImages((prev) => {
              const updated = [...prev];
              updated[i] = {
                angle: config.name,
                url: '',
                loading: false,
                error: errorMsg,
              };
              return updated;
            });
          }
        }
      };

      reader.readAsDataURL(selectedImage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditImage = (index: number) => {
    setEditingImageIndex(index);
    setShowImageEditDialog(true);
  };

  const handleImageEditConfirm = (editedImageUrl: string) => {
    if (editingImageIndex !== null) {
      setGeneratedImages((prev) => {
        const updated = [...prev];
        updated[editingImageIndex] = {
          ...updated[editingImageIndex],
          url: editedImageUrl,
        };
        return updated;
      });
    }
    setEditingImageIndex(null);
  };

  const handleGenerateVideo = async () => {
    if (!selectedImage || generatedImages.length === 0 || !generatedImages[0].url) {
      return;
    }

    if (!replicateToken) {
      setPendingOperation('generateVideos');
      setShowTokenInput(true);
      return;
    }

    // Show settings dialog to let user choose model
    setShowVideoSettings(true);
  };

  const generateSingleVideo = async (
    startImage: string,
    endImageUrl: string,
    model: 'kling-2.1' | 'seedream-lite',
    token: string
  ): Promise<string | null> => {
    let payload;

    if (model === 'kling-2.1') {
      payload = {
        version: 'kwaivgi/kling-v2.1',
        input: {
          prompt: 'Smooth transition keeping the subject in frame the entire time',
          start_image: startImage,
          end_image: endImageUrl,
          duration: 5,
          mode: 'pro',
        },
      };
    } else {
      // Seedream-lite uses different parameters
      payload = {
        version: 'bytedance/seedance-1-lite',
        input: {
          prompt: 'Smooth transition keeping the subject in frame the entire time',
          image: startImage,
          last_frame_image: endImageUrl,
          duration: 5,
          resolution: '720p',
          fps: 24,
          camera_fixed: false,
        },
      };
    }

    const proxyResponse = await fetch('/api/replicate-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        action: 'create-video',
        payload,
      }),
    });

    if (!proxyResponse.ok) {
      const error = await proxyResponse.json();
      throw new Error(error.error || 'Failed to create video');
    }

    const prediction = await proxyResponse.json();
    let predictionId = prediction.id;

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 600; // 10 minutes with 1 second intervals
    let currentPrediction = prediction;

    while (
      (currentPrediction.status === 'starting' ||
        currentPrediction.status === 'processing') &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      const pollResponse = await fetch('/api/replicate-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          action: 'get-video',
          payload: { predictionId },
        }),
      });

      if (!pollResponse.ok) {
        throw new Error('Failed to poll video status');
      }

      currentPrediction = await pollResponse.json();
    }

    if (currentPrediction.status === 'failed') {
      throw new Error(currentPrediction.error || 'Video generation failed');
    }

    if (currentPrediction.status !== 'succeeded') {
      throw new Error('Video generation did not complete in time');
    }

    const output = currentPrediction.output;
    // Handle both string and array output formats
    const videoUrl = typeof output === 'string'
      ? output
      : (Array.isArray(output) && output.length > 0 ? output[0] : null);

    console.log('Video generation completed:', {
      status: currentPrediction.status,
      output,
      videoUrl,
    });

    return videoUrl;
  };

  const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
    if (!blobUrl.startsWith('blob:')) {
      return blobUrl; // Not a blob URL, return as-is
    }
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleVideoSettingsConfirm = async (settings: VideoGenerationSettings) => {
    setVideoSettings(settings);

    try {
      setIsGeneratingVideo(true);

      // Initialize transition videos array (temporary: only 1 video for debugging)
      const initialVideos: TransitionVideo[] = [
        { id: 1, name: 'Original → Angle 1', url: '', loading: true },
      ];
      setTransitionVideos(initialVideos);

      if (!selectedImage) {
        throw new Error('No image selected');
      }

      // Convert user's original image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const startImageBase64 = e.target?.result as string;

        try {
          // Convert any blob URLs to base64 (for manually uploaded angles)
          const endImageUrl = await blobUrlToBase64(generatedImages[0].url);

          // Temporary: Generate only first video for debugging
          // TODO: Change back to all 5 videos once working
          const videoConfigs = [
            {
              index: 0,
              start: startImageBase64,
              end: endImageUrl,
              name: 'Original → Angle 1',
            },
          ];

          // Generate each video and update state as they complete
          for (const config of videoConfigs) {
            try {
              console.log(`Generating video ${config.index + 1}: ${config.name}`);
              const videoUrl = await generateSingleVideo(
                config.start,
                config.end,
                settings.model,
                replicateToken!
              );

              // Update the specific video in the list
              setTransitionVideos((prev) => {
                const updated = [...prev];
                updated[config.index] = {
                  ...updated[config.index],
                  url: videoUrl || '',
                  loading: false,
                };
                return updated;
              });
            } catch (err) {
              const errorMsg =
                err instanceof Error ? err.message : 'Failed to generate video';
              setTransitionVideos((prev) => {
                const updated = [...prev];
                updated[config.index] = {
                  ...updated[config.index],
                  loading: false,
                  error: errorMsg,
                };
                return updated;
              });
            }
          }
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : 'Unknown error';
          console.error('Error generating videos:', errorMsg);
          // Mark all videos as failed
          setTransitionVideos((prev) =>
            prev.map((v) => ({
              ...v,
              loading: false,
              error: errorMsg,
            }))
          );
        }
      };

      reader.readAsDataURL(selectedImage);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      <LightRays
        className="absolute inset-0 z-0"
        color="rgba(160, 210, 255, 0.15)"
        count={7}
        speed={14}
      />
      <main className="relative z-10 flex w-full max-w-2xl flex-col items-center justify-center gap-12 px-4 py-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Easy Peasy Ease
          </h1>
          {!selectedImage && uploadedAngles.length === 0 && uploadedVideos.length === 0 && (
            <p className="max-w-lg text-lg text-muted-foreground">
              Make a fancy ease curved video from a single image.
            </p>
          )}
        </div>

        {/* Upload Mode Selector */}
        {!selectedImage && uploadedAngles.length === 0 && uploadedVideos.length === 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            <Button
              variant={uploadMode === 'generate' ? 'default' : 'outline'}
              onClick={() => setUploadMode('generate')}
              size="sm"
            >
              Generate from Image
            </Button>
            <Button
              variant={uploadMode === 'angles' ? 'default' : 'outline'}
              onClick={() => setUploadMode('angles')}
              size="sm"
            >
              Upload Angles
            </Button>
            <Button
              variant={uploadMode === 'videos' ? 'default' : 'outline'}
              onClick={() => setUploadMode('videos')}
              size="sm"
            >
              Upload Videos
            </Button>
          </div>
        )}

        {/* Upload Area - Generate from Image */}
        {!selectedImage && uploadMode === 'generate' && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'relative w-full cursor-pointer rounded-lg border-2 border-dashed transition-all',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/30 hover:border-muted-foreground/50'
            )}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="hidden"
              id="image-input"
            />
            <label
              htmlFor="image-input"
              className="flex flex-col items-center justify-center gap-4 px-6 py-16"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, JPEG (up to 10MB)
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Upload Area - Upload Angles */}
        {uploadMode === 'angles' && uploadedAngles.length === 0 && (
          <div className="w-full space-y-4">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center hover:border-muted-foreground/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleAnglesUpload}
                className="hidden"
                id="angles-input"
                multiple
              />
              <label
                htmlFor="angles-input"
                className="flex flex-col items-center justify-center gap-4 cursor-pointer"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Upload 4 angle images
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, JPEG - Select all 4 images at once
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Upload Area - Upload Videos */}
        {uploadMode === 'videos' && uploadedVideos.length === 0 && (
          <div className="w-full space-y-4">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center hover:border-muted-foreground/50 transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideosUpload}
                className="hidden"
                id="videos-input"
                multiple
              />
              <label
                htmlFor="videos-input"
                className="flex flex-col items-center justify-center gap-4 cursor-pointer"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Upload 5 transition videos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MP4, WebM - Select all 5 videos at once
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Image Container with Delete Button */}
            <div className="relative w-full flex justify-center">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Preview"
                className="max-h-96 max-w-full rounded-lg border border-border"
              />
              <Button
                onClick={() => setSelectedImage(null)}
                variant="outline"
                size="icon"
                className="absolute top-4 right-4"
                aria-label="Delete image"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Go On Then Button */}
            <Button size="lg" onClick={handleGoOnThen} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Go on then'}
            </Button>
          </div>
        )}

        {/* Uploaded Angles Preview */}
        {uploadedAngles.length > 0 && (
          <div className="w-full space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Uploaded Angles ({uploadedAngles.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadedAngles([]);
                    setGeneratedImages([]);
                  }}
                >
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {uploadedAngles.map((file, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Angle ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-lg border border-border"
                    />
                    <p className="text-xs text-muted-foreground text-center truncate">
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Original Image Upload for Angles Mode */}
            {!selectedImage && (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleChange}
                  className="hidden"
                  id="original-image-input"
                />
                <label
                  htmlFor="original-image-input"
                  className="flex flex-col items-center justify-center gap-4 cursor-pointer"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Upload original image
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This will be the start and end point of the video loop
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Uploaded Videos Preview */}
        {uploadedVideos.length > 0 && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Uploaded Videos ({uploadedVideos.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUploadedVideos([]);
                  setGeneratedVideo(null);
                }}
              >
                Reset
              </Button>
            </div>
            <div className="space-y-2">
              {uploadedVideos.map((file, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  {index + 1}. {file.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Angles Grid */}
        {generatedImages.length > 0 && (
          <div className="w-full space-y-6">
            <GeneratedAngles
              images={generatedImages}
              onRegenerate={uploadedAngles.length === 0 ? handleRegenerate : undefined}
              onEdit={handleEditImage}
              isRegenerating={isGenerating}
            />

            {/* Generate Video Button */}
            {!generatedVideo && generatedImages.every((img) => img.url) && selectedImage && (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isGeneratingVideo ? 'Generating Video...' : 'Generate Video'}
                </Button>
              </div>
            )}

          </div>
        )}

        {/* Transition Videos List */}
        {transitionVideos.length > 0 && (
          <div className="w-full space-y-6">
            <VideosList
              videos={transitionVideos}
              isGenerating={isGeneratingVideo}
            />

            {/* Regenerate Button */}
            {!isGeneratingVideo && transitionVideos.some((v) => v.url && !v.loading) && (
              <div className="flex justify-center gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setTransitionVideos([])}
                >
                  Back to Angles
                </Button>
                <Button
                  size="lg"
                  onClick={handleGenerateVideo}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Regenerate Videos
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Video Preview (Legacy) */}
        {generatedVideo && transitionVideos.length === 0 && (
          <div className="w-full">
            <VideoPreview
              video={generatedVideo}
              onRegenerate={handleGenerateVideo}
            />
          </div>
        )}
      </main>

      {/* Replicate Token Input Modal */}
      <ReplicateTokenInput
        open={showTokenInput}
        onTokenSubmit={handleTokenSubmit}
        isLoading={isGenerating}
      />

      {/* Video Settings Modal */}
      <VideoSettings
        isOpen={showVideoSettings}
        onClose={() => setShowVideoSettings(false)}
        onConfirm={handleVideoSettingsConfirm}
      />

      {/* Image Edit Dialog */}
      {editingImageIndex !== null && (
        <ImageEditDialog
          isOpen={showImageEditDialog}
          onClose={() => setShowImageEditDialog(false)}
          imageUrl={generatedImages[editingImageIndex].url}
          onConfirm={handleImageEditConfirm}
          replicateToken={replicateToken}
        />
      )}
    </div>
  );
}
