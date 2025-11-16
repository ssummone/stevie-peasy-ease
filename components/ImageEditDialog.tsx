'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ImageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onConfirm: (editedImageUrl: string) => void;
  replicateToken: string | null;
}

export function ImageEditDialog({
  isOpen,
  onClose,
  imageUrl,
  onConfirm,
  replicateToken,
}: ImageEditDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('Please enter an edit prompt');
      return;
    }

    if (!replicateToken) {
      setError('API token is missing');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create prediction via proxy
      const createResponse = await fetch('/api/replicate-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: replicateToken,
          action: 'create-prediction',
          payload: {
            version: 'google/nano-banana',
            input: {
              prompt,
              image_input: [imageUrl],
              output_format: 'jpg',
            },
          },
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || 'Failed to create edit prediction');
      }

      const prediction = await createResponse.json();
      const predictionId = prediction.id;

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 300; // 5 minutes with 1 second intervals
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
        throw new Error(currentPrediction.error || 'Image editing failed');
      }

      if (currentPrediction.status === 'succeeded') {
        const editedImageUrl = currentPrediction.output;
        if (editedImageUrl) {
          onConfirm(editedImageUrl);
          setPrompt('');
          onClose();
        } else {
          throw new Error('No image in output');
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPrompt('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
          <DialogDescription>
            Describe how you want to edit this image using Nano Banana
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-3xl">
              <Image
                src={imageUrl}
                alt="Edit preview"
                width={1920}
                height={1080}
                className="h-full w-full rounded-xl border border-border shadow-lg object-contain"
                unoptimized
              />
            </div>
          </div>

          {/* Edit Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Edit Instructions</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Change the background to a sunset' or 'Add more vibrant colors'"
              disabled={isLoading}
              className="w-full min-h-24 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !prompt.trim()}
              className="gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Editing...' : 'Apply Edit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
