/**
 * Camera angle configurations for Qwen Image Edit model
 * Maps to rotate_degrees, move_forward, and vertical_tilt parameters
 */

export interface AngleConfig {
  name: string;
  description: string;
  rotateDegrees: number;
  moveForward: number;
  verticalTilt: number;
}

export const ANGLE_CONFIGS: AngleConfig[] = [
  {
    name: 'Zoomed In',
    description: 'Zoomed in with no angle',
    rotateDegrees: 0,
    moveForward: 8,
    verticalTilt: 0,
  },
  {
    name: 'High Elevation Right',
    description: 'High elevation, orbit halfway to the right',
    rotateDegrees: -80,
    moveForward: 0,
    verticalTilt: -1,
  },
  {
    name: "Worm's Eye View",
    description: "Worm's eye view (low angle)",
    rotateDegrees: 0,
    moveForward: 0,
    verticalTilt: 1,
  },
  {
    name: 'Far Left',
    description: 'Far left with no elevation',
    rotateDegrees: 90,
    moveForward: 0,
    verticalTilt: 0,
  },
];
