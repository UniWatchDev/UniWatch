import { useEffect, useRef } from 'react';
import type { CountdownState, PlaybackState } from '@repo/schemas/realtime';

import type { PlaybackChangeEvent } from '@/hooks/use-room-socket';
import {
  applyServerPlaybackToVideo,
  type ApplyServerPlaybackMode,
  type PlaybackRate
} from '@/movies/room-playback';

export interface UseRoomPlaybackSyncOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  roomMovieId: string | null;
  mediaSrc: string | null;
  videoReady: boolean;
  posterFrameReady: boolean;
  isOwner: boolean;
  currentUserId: string | null;
  playback: PlaybackState;
  countdown: CountdownState;
  connectionGeneration: number;
  remotePlaybackEvent: PlaybackChangeEvent | null;
  suppressPlaybackEmitRef: React.RefObject<boolean>;
  onApplied: (result: { currentTime: number; isPlaying: boolean; playbackRate: PlaybackRate }) => void;
  onPlayFailed: () => void;
  onMovieMismatch: () => void;
  onRemoteEventHandled: () => void;
}

/**
 * Aligns the local video element with server-authoritative host playback.
 * Initial snapshot: viewers snap once (join mode); host stays local (soft).
 * After that: explicit room:playback-changed events, plus recovery when the
 * server is playing but the local element is still paused (post-swap / countdown).
 */
export function useRoomPlaybackSync({
  videoRef,
  roomMovieId,
  mediaSrc,
  videoReady,
  posterFrameReady,
  isOwner,
  currentUserId,
  playback,
  countdown,
  connectionGeneration,
  remotePlaybackEvent,
  suppressPlaybackEmitRef,
  onApplied,
  onPlayFailed,
  onMovieMismatch,
  onRemoteEventHandled
}: UseRoomPlaybackSyncOptions): void {
  const initialSyncDoneRef = useRef(false);
  const prevCountdownActiveRef = useRef(false);
  const lastConnectionGenerationRef = useRef(-1);
  const lastSyncedMovieIdRef = useRef<string | null>(null);
  const playbackRef = useRef(playback);

  playbackRef.current = playback;

  useEffect(() => {
    initialSyncDoneRef.current = false;
    lastSyncedMovieIdRef.current = null;
  }, [roomMovieId]);

  useEffect(() => {
    if (connectionGeneration !== lastConnectionGenerationRef.current) {
      initialSyncDoneRef.current = false;
      lastSyncedMovieIdRef.current = null;
      lastConnectionGenerationRef.current = connectionGeneration;
    }
  }, [connectionGeneration]);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null || roomMovieId === null) {
      return;
    }
    if (
      lastSyncedMovieIdRef.current !== null &&
      lastSyncedMovieIdRef.current !== roomMovieId
    ) {
      initialSyncDoneRef.current = false;
      video.pause();
    }
  }, [roomMovieId, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const snapshotPlayback = playbackRef.current;
    const pendingPlayback = remotePlaybackEvent?.playback ?? snapshotPlayback;
    const serverPlaying = pendingPlayback.isPlaying && !countdown.active;
    const mediaReadyForPaused = videoReady || posterFrameReady;
    if (
      video === null ||
      roomMovieId === null ||
      mediaSrc === null ||
      pendingPlayback.movieId !== roomMovieId
    ) {
      return;
    }

    if (serverPlaying) {
      if (!videoReady) {
        return;
      }
    } else if (!mediaReadyForPaused) {
      return;
    }

    const countdownJustEnded = prevCountdownActiveRef.current && !countdown.active;
    prevCountdownActiveRef.current = countdown.active;

    const isPlaybackChangedEvent = remotePlaybackEvent !== null;
    const skipHostEcho =
      isOwner &&
      isPlaybackChangedEvent &&
      remotePlaybackEvent.actorUserId === currentUserId;

    if (skipHostEcho) {
      onRemoteEventHandled();
      return;
    }

    const isInitialSync = !initialSyncDoneRef.current;
    const localPaused = video.paused || video.ended;
    const needsStuckPlayRecovery = !isPlaybackChangedEvent && serverPlaying && localPaused;

    if (!isInitialSync && !isPlaybackChangedEvent && !needsStuckPlayRecovery) {
      return;
    }

    const snapshot = isPlaybackChangedEvent ? remotePlaybackEvent.playback : snapshotPlayback;
    const swappedMovie =
      lastSyncedMovieIdRef.current !== null &&
      lastSyncedMovieIdRef.current !== roomMovieId;
    const needsJoinSnap =
      isInitialSync ||
      swappedMovie ||
      (!isOwner &&
        snapshot.isPlaying &&
        (needsStuckPlayRecovery || lastSyncedMovieIdRef.current !== roomMovieId));
    const mode: ApplyServerPlaybackMode = needsJoinSnap ? (isOwner ? 'soft' : 'join') : 'soft';

    suppressPlaybackEmitRef.current = true;
    try {
      if (snapshot.movieId !== roomMovieId) {
        onMovieMismatch();
        return;
      }

      const applied = applyServerPlaybackToVideo(
        video,
        snapshot,
        roomMovieId,
        mode,
        undefined,
        onPlayFailed
      );
      if (applied === null) {
        return;
      }

      onApplied(applied);

      if (
        countdownJustEnded &&
        snapshot.isPlaying &&
        (video.paused || video.ended)
      ) {
        void video.play().catch(() => {
          onPlayFailed();
        });
      }

      initialSyncDoneRef.current = true;
      lastSyncedMovieIdRef.current = roomMovieId;
    } finally {
      queueMicrotask(() => {
        suppressPlaybackEmitRef.current = false;
      });
    }

    if (isPlaybackChangedEvent) {
      onRemoteEventHandled();
    }
  }, [
    connectionGeneration,
    countdown.active,
    currentUserId,
    isOwner,
    mediaSrc,
    onApplied,
    onMovieMismatch,
    onPlayFailed,
    onRemoteEventHandled,
    playback.isPlaying,
    playback.movieId,
    posterFrameReady,
    remotePlaybackEvent,
    roomMovieId,
    suppressPlaybackEmitRef,
    videoReady,
    videoRef
  ]);
}
