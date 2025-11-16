'use client';

import Image from 'next/image';
import { GeneratedImage } from '@/lib/types';
import { Loader2, AlertCircle, RotateCcw, PencilIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GeneratedAnglesProps {
  images: GeneratedImage[];
  onRegenerate?: (index: number) => void;
  onEdit?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  isRegenerating?: boolean;
}

export function GeneratedAngles({
  images,
  onRegenerate,
  onEdit,
  onMoveUp,
  onMoveDown,
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

      {/* Show reordering list if we have reorder handlers */}
      {(onMoveUp || onMoveDown) ? (
        <div className="space-y-3">
          {images.map((image, index) => (
            <div
              key={index}
              className="flex gap-4 items-center rounded-lg border border-border p-4 bg-secondary/50"
            >
              {/* Image Preview */}
              <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted border border-border">
                {image.url ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={image.url}
                      alt={image.angle}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : image.loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : image.error ? (
                  <div className="w-full h-full flex items-center justify-center bg-destructive/10">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </div>

              {/* Image Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {index + 1}. {image.angle}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Order: {index + 1} of {images.length}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 flex-shrink-0">
                {onMoveUp && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                )}
                {onMoveDown && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveDown(index)}
                    disabled={index === images.length - 1}
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && image.url && !image.loading && (
                  <Button
                    onClick={() => onEdit(index)}
                    variant="outline"
                    size="sm"
                    title="Edit this image"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                )}
                {onRegenerate && !image.loading && (
                  <Button
                    onClick={() => onRegenerate(index)}
                    variant="outline"
                    size="sm"
                    disabled={isRegenerating}
                    title="Regenerate this angle"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Original grid layout when no reordering is available
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-lg border border-border overflow-hidden"
            >
              {/* Image Container with Regenerate Button */}
              <div className="relative w-full aspect-square bg-muted overflow-hidden group">
                {image.url && (
                  <Image
                    src={image.url}
                    alt={image.angle}
                    fill
                    className="object-cover"
                    unoptimized
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
      )}
    </div>
  );
}
