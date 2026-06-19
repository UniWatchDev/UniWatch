import { Injectable } from '@nestjs/common';

import { RoomStateService } from '@/realtime/services/room-state.service';

export interface PendingPlaybackStart {
  movieId: string;
  positionSec: number;
  playbackRate: number;
}

export const COUNTDOWN_DURATION_MS = 3_000;

/**
 * Owns the pre-playback countdown: the per-room timer and the playback start
 * queued behind it. Scheduling lives here; the completion side effects (emit +
 * status sync) are supplied by the caller via the `onComplete` callback so this
 * service stays free of any socket/broadcast coupling.
 */
@Injectable()
export class PlaybackCountdownService {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly pending = new Map<string, PendingPlaybackStart>();

  constructor(private readonly roomState: RoomStateService) {}

  hasTimer(roomId: string): boolean {
    return this.timers.has(roomId);
  }

  getPending(roomId: string): PendingPlaybackStart | undefined {
    return this.pending.get(roomId);
  }

  setPending(roomId: string, pending: PendingPlaybackStart): void {
    this.pending.set(roomId, pending);
  }

  deletePending(roomId: string): void {
    this.pending.delete(roomId);
  }

  start(roomId: string, onComplete: (roomId: string) => void): void {
    const state = this.roomState.get(roomId);
    if (!state) return;
    if (this.timers.has(roomId)) return;

    const endsAt = new Date(Date.now() + COUNTDOWN_DURATION_MS).toISOString();
    this.roomState.setCountdown(roomId, { active: true, endsAt });

    const timer = setTimeout(() => {
      this.timers.delete(roomId);
      onComplete(roomId);
    }, COUNTDOWN_DURATION_MS);
    this.timers.set(roomId, timer);
  }

  cancel(roomId: string): void {
    const timer = this.timers.get(roomId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(roomId);
    }
    this.pending.delete(roomId);
    if (this.roomState.get(roomId)) {
      this.roomState.clearCountdown(roomId);
    }
  }
}
