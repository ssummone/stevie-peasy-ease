'use client';

import { GeneratedImage } from '@/lib/types';
import { Loader2, AlertCircle, RotateCcw, PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GeneratedAnglesProps {
  images: GeneratedImage[];
  onRegenerate?: (index: number) => void;
  onEdit?: (index: number) => void;
  isRegenerating?: boolean;
}

export function GeneratedAngles({
  images,
  onRegenerate,
  onEdit,
  isRegenerating,
}: GeneratedAnglesProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">
          Generated Camera Angles
        </h2>
        <p className="text-sm text-muted-foreground">
          {images.filter((img) => img.url).length} of {images.length} angles generated
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {images.map((image, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-border overflow-hidden"
          >
            {/* Image Container with Regenerate Button */}
            <div className="relative w-full aspect-square bg-muted overflow-hidden group">
              {image.url && (
                <img
                  src={image.url}
                  alt={image.angle}
                  className="h-full w-full object-cover"
                />
              )}

              {image.loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}

              {image.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-destructive/10 p-4">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <p className="text-xs text-destructive text-center">
                    {image.error}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {image.url && !image.loading && (
                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEdit && (
                    <Button
                      onClick={() => onEdit(index)}
                      variant="outline"
                      size="icon"
                      className="bg-background/80 hover:bg-background"
                      title="Edit this image"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {onRegenerate && (
                    <Button
                      onClick={() => onRegenerate(index)}
                      variant="outline"
                      size="icon"
                      className="bg-background/80 hover:bg-background"
                      disabled={isRegenerating}
                      title="Regenerate this angle"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Label */}
            <div className="px-3 pb-3">
              <p className="font-medium text-sm text-foreground">
                {image.angle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
