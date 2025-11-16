/**
 * Hook for communicating with Replicate API
 * Handles authentication and prediction polling via proxy
 */

import { useState, useCallback } from 'react';
import { QwenInput, ReplicatePrediction } from '@/lib/types';

const PROXY_URL = '/api/replicate-proxy';
const QWEN_MODEL = 'qwen/qwen-edit-multiangle';

interface UseReplicateAPIOptions {
  token: string;
}

export function useReplicateAPI({ token }: UseReplicateAPIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQwenImage = useCallback(
    async (input: QwenInput): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Create prediction via proxy
        const createResponse = await fetch(PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            action: 'create-prediction',
            payload: {
              version: QWEN_MODEL,
              input,
            },
          }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.detail || error.error || 'Failed to create prediction');
        }

        const prediction: ReplicatePrediction = await createResponse.json();
        const predictionId = prediction.id;

        // Poll for completion
        let attempts = 0;
        const maxAttempts = 300; // 5 minutes with 1 second intervals (image generation can take time)
        let currentPrediction = prediction;

        while (
          (currentPrediction.status === 'starting' ||
            currentPrediction.status === 'processing') &&
          attempts < maxAttempts
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;

          const pollResponse = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token,
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
          throw new Error(
            currentPrediction.error || 'Prediction failed'
          );
        }

        if (currentPrediction.status !== 'succeeded') {
          throw new Error('Prediction did not complete in time');
        }

        // Extract image URL from output
        const output = currentPrediction.output;
        if (Array.isArray(output) && output.length > 0) {
          return output[0];
        }

        throw new Error('No image in prediction output');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  return {
    generateQwenImage,
    isLoading,
    error,
  };
}
