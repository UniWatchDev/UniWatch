export const SEEK_STEPS_SECONDS = [5] as const;

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export function formatSeekLabel(seconds: number): string {
  if (seconds >= 3600 && seconds % 3600 === 0) {
    return `${String(seconds / 3600)}h`;
  }
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${String(seconds / 60)}m`;
  }
  return `${String(seconds)}s`;
}

export function formatPlaybackTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h)}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m)}:${String(s).padStart(2, '0')}`;
}

export function formatRateLabel(rate: number): string {
  return rate === 1 ? '1×' : `${String(rate)}×`;
}
