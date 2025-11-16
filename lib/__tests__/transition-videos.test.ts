import { describe, it, expect } from 'vitest';
import { applyTransitionVideoUpdate } from '@/lib/transition-videos';
import { TransitionVideo } from '@/lib/types';

const createVideo = (id: number, name: string): TransitionVideo => ({
  id,
  name,
  url: '',
  loading: true,
  duration: 1.5,
  easingPreset: 'easeInOutSine',
  useCustomEasing: false,
  customBezier: [0.42, 0, 0.58, 1],
});

describe('applyTransitionVideoUpdate', () => {
  it('preserves user-defined order when segments finish out of order', () => {
    let videos = [createVideo(1, 'A'), createVideo(2, 'B'), createVideo(3, 'C')];

    videos = [videos[2], videos[0], videos[1]];

    const updated = applyTransitionVideoUpdate(videos, 1, {
      url: 'video-a.mp4',
      loading: false,
    });

    expect(updated[0].id).toBe(3);
    expect(updated[1].id).toBe(1);
    expect(updated[1].url).toBe('video-a.mp4');
    expect(updated[1].loading).toBe(false);
  });
});
