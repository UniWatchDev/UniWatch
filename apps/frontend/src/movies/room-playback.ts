import type { PlaybackState } from '@repo/schemas/realtime';
import {
  getMaterializedPlaybackPosition,
  PLAYBACK_DRIFT_THRESHOLD_SEC,
  PLAYBACK_JOIN_DRIFT_THRESHOLD_SEC
} from '@repo/schemas/realtime/playback-sync';

export {
  getMaterializedPlaybackPosition,
  PLAYBACK_DRIFT_THRESHOLD_SEC,
  PLAYBACK_JOIN_DRIFT_THRESHOLD_SEC,
  PLAYBACK_UNFREEZE_DRIFT_SEC,
  shouldUnfreezePlaybackFromRoomState
} from '@repo/schemas/realtime/playback-sync';

export const SEEK_STEPS_SECONDS = [5] as const;

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export function isPlaybackRate(rate: number): rate is PlaybackRate {
  return PLAYBACK_RATES.some((candidate) => candidate === rate);
}

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

export type ApplyServerPlaybackResult = {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: PlaybackRate;
};

export type ApplyServerPlaybackMode = 'full' | 'soft' | 'join';

/** Snap the local video element to the server-authoritative host playback snapshot. */
export function applyServerPlaybackToVideo(
  video: HTMLVideoElement,
  playback: PlaybackState,
  roomMovieId: string,
  mode: ApplyServerPlaybackMode = 'full',
  driftThresholdSec?: number,
  onPlayRejected?: () => void
): ApplyServerPlaybackResult | null {
  if (playback.movieId !== roomMovieId) {
    return null;
  }

  const resolvedDriftThreshold =
    driftThresholdSec ??
    (mode === 'join' ? PLAYBACK_JOIN_DRIFT_THRESHOLD_SEC : PLAYBACK_DRIFT_THRESHOLD_SEC);

  const playbackRate: PlaybackRate = isPlaybackRate(playback.playbackRate) ? playback.playbackRate : 1;
  if (video.playbackRate !== playbackRate) {
    video.playbackRate = playbackRate;
  }

  const truthPosition = getMaterializedPlaybackPosition(playback);
  const drift = Math.abs(video.currentTime - truthPosition);
  if (drift > resolvedDriftThreshold) {
    video.currentTime = truthPosition;
  }

  const alignPlayPause = mode === 'full' || mode === 'join';
  if (alignPlayPause) {
    if (playback.isPlaying) {
      if (video.paused || video.ended) {
        void video.play().catch(() => {
          onPlayRejected?.();
        });
      }
    } else if (!video.paused) {
      video.pause();
    }
  } else {
    // soft: only nudge play/pause when out of sync — avoids reload stutter on join/leave
    if (playback.isPlaying && (video.paused || video.ended)) {
      void video.play().catch(() => {
        onPlayRejected?.();
      });
    } else if (!playback.isPlaying && !video.paused) {
      video.pause();
    }
  }

  return {
    currentTime: video.currentTime,
    isPlaying: playback.isPlaying,
    playbackRate
  };
}
