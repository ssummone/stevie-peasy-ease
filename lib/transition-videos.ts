import { TransitionVideo } from '@/lib/types';

export function applyTransitionVideoUpdate(
  videos: TransitionVideo[],
  segmentId: number,
  updates: Partial<TransitionVideo>
): TransitionVideo[] {
  const index = videos.findIndex((segment) => segment.id === segmentId);

  if (index === -1) {
    return videos.slice();
  }

  const updated = [...videos];

  updated[index] = {
    ...updated[index],
    ...updates,
  };

  return updated;
}
