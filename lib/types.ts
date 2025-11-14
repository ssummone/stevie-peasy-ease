/**
 * Shared TypeScript types for the application
 */

export interface GeneratedImage {
  angle: string;
  url: string;
  loading: boolean;
  error?: string;
}

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: Record<string, any>;
  output?: any;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  expires_at: string;
  metrics?: Record<string, any>;
}

export interface QwenInput {
  image: string;
  prompt?: string;
  rotate_degrees: number;
  move_forward: number;
  vertical_tilt: number;
  use_wide_angle?: boolean;
  aspect_ratio?: string;
  go_fast?: boolean;
  num_inference_steps?: number;
  output_format?: string;
  output_quality?: number;
}

export interface GeneratedVideo {
  url: string;
  loading: boolean;
  error?: string;
  startTime?: number;
}

export interface TransitionVideo {
  id: number;
  name: string;
  url: string;
  loading: boolean;
  error?: string;
}

export interface KlingVideoInput {
  prompt: string;
  image_1?: string;
  image_2?: string;
  duration?: number;
  mode?: 'standard' | 'pro';
}
