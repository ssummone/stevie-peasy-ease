/**
 * Speed Curve Configuration
 * Constants for video processing with Mediabunny
 */

// Video frame rate settings
export const TARGET_FRAME_RATE = 30; // 30 fps source
export const TARGET_FRAME_DURATION = 1 / TARGET_FRAME_RATE; // ~0.0333s

// Output constraints - high fps for smooth ease curve transitions and quality
export const MAX_OUTPUT_FPS = 60; // 60 fps output for smooth easing
export const MIN_OUTPUT_FRAME_DURATION = 1 / MAX_OUTPUT_FPS; // ~0.0167s

// Sample aggregation thresholds
export const MIN_SAMPLE_DURATION = 1 / 60000; // ultra-short aggregation to preserve eased ramps

// Default bitrate - high quality to preserve source detail
export const DEFAULT_BITRATE = 20e6; // 20 Mbps (source matching + quality)

// Speed curve parameters
export const DEFAULT_INPUT_DURATION = 5; // Kling videos are 5 seconds
export const DEFAULT_OUTPUT_DURATION = 1.5; // Target 1.5s with ease curve
export const DEFAULT_EASING = 'easeInExpoOutCubic'; // Default easing function
