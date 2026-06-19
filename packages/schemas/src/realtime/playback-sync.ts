import type { PlaybackState } from './realtime.schemas.js';

/** Drift beyond this (seconds) triggers a seek when applying server playback. */
export const PLAYBACK_DRIFT_THRESHOLD_SEC = 2;

/** Tighter threshold for first snapshot after connect/rejoin. */
export const PLAYBACK_JOIN_DRIFT_THRESHOLD_SEC = 0.3;

/** Materialized position drift that unfreezes playback from room:state. */
export const PLAYBACK_UNFREEZE_DRIFT_SEC = 0.5;

/** Live position the host (server) is at, accounting for elapsed play time. */
export function getMaterializedPlaybackPosition(playback: PlaybackState, atMs = Date.now()): number {
  if (!playback.isPlaying) {
    return playback.positionSec;
  }
  const elapsedSeconds = Math.max(0, atMs - new Date(playback.updatedAt).getTime()) / 1000;
  return playback.positionSec + elapsedSeconds * playback.playbackRate;
}

/** Whether a room:state payload should override frozen playback on the client. */
export function shouldUnfreezePlaybackFromRoomState(
  prevPlayback: PlaybackState,
  nextPlayback: PlaybackState,
  prevCountdownActive: boolean,
  nextCountdownActive: boolean
): boolean {
  if (prevPlayback.movieId !== nextPlayback.movieId) {
    return true;
  }
  if (prevCountdownActive && !nextCountdownActive) {
    return true;
  }
  if (prevPlayback.isPlaying !== nextPlayback.isPlaying) {
    return true;
  }
  if (prevPlayback.updatedAt !== nextPlayback.updatedAt) {
    const prevPos = getMaterializedPlaybackPosition(prevPlayback);
    const nextPos = getMaterializedPlaybackPosition(nextPlayback);
    return Math.abs(prevPos - nextPos) > PLAYBACK_UNFREEZE_DRIFT_SEC;
  }
  return false;
}
