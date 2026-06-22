import { Injectable } from '@nestjs/common';

import type { RealtimeChatMessage } from '@repo/schemas/realtime';

import { DEFAULT_USER_COLOR } from '@/realtime/realtime.consts';
import { RealtimeBroadcastService } from '@/realtime/services/realtime-broadcast.service';
import { PlaybackCountdownService } from '@/realtime/services/playback-countdown.service';
import { RoomStateService } from '@/realtime/services/room-state.service';
import { RoomRepository } from '@/rooms/room.repository';

export type ApplyMovieChangeOptions = {
  actorUserId: string;
  actorUserName: string;
  creatorId: string;
  movieName?: string | null;
};

/**
 * Single orchestration path for host movie swaps — used by the socket gateway and
 * HTTP room updates so viewers always get the same pause-at-zero, ready-reset,
 * countdown-pending, and broadcast sequence.
 */
@Injectable()
export class RoomMovieChangeService {
  constructor(
    private readonly roomState: RoomStateService,
    private readonly countdown: PlaybackCountdownService,
    private readonly broadcast: RealtimeBroadcastService,
    private readonly rooms: RoomRepository
  ) {}

  finishCountdown(roomId: string): void {
    if (!this.roomState.get(roomId)) {
      return;
    }

    const pending = this.countdown.getPending(roomId);
    if (pending === undefined) {
      this.roomState.clearCountdown(roomId);
      void this.syncRoomStatus(roomId, null);
      this.broadcast.emitRoomPresenceChanged(roomId);
      return;
    }

    this.countdown.deletePending(roomId);
    this.roomState.updatePlayback(roomId, {
      movieId: pending.movieId,
      isPlaying: true,
      positionSec: pending.positionSec,
      playbackRate: pending.playbackRate
    });
    this.roomState.clearCountdown(roomId);
    void this.syncRoomStatus(roomId, null);
    this.broadcast.emitRoomPlaybackChanged(roomId, null);
    this.broadcast.emitRoomPresenceChanged(roomId);
  }

  async applyMovieChange(
    roomId: string,
    movieId: string,
    options: ApplyMovieChangeOptions
  ): Promise<void> {
    const runtime = this.roomState.getOrCreate(roomId);
    const countdownWasActive = runtime.countdown.active;
    const hadPendingStart = this.countdown.getPending(roomId) !== undefined;
    const playbackRate = runtime.playback.playbackRate;

    this.roomState.syncMovie(roomId, movieId);
    this.roomState.setAllUsersReady(roomId, false);

    if (countdownWasActive || hadPendingStart) {
      this.countdown.setPending(roomId, {
        movieId,
        positionSec: 0,
        playbackRate
      });
      this.countdown.start(roomId, (id) => {
        this.finishCountdown(id);
      });
      this.roomState.updatePlayback(roomId, {
        movieId,
        isPlaying: false,
        positionSec: 0,
        playbackRate
      });
    } else {
      this.countdown.cancel(roomId);
      this.roomState.updatePlayback(roomId, {
        movieId,
        isPlaying: false,
        positionSec: 0,
        playbackRate
      });
    }

    await this.syncRoomStatus(roomId, options.creatorId);

    const message = this.buildAnnouncement(roomId, options);
    this.roomState.addMessage(roomId, message);
    const trimmedMovieName = options.movieName?.trim();
    this.broadcast.emitRoomMovieUpdated(
      roomId,
      movieId,
      trimmedMovieName !== undefined && trimmedMovieName.length > 0
        ? trimmedMovieName
        : undefined
    );
    this.broadcast.emitRoomPlaybackChanged(roomId, options.actorUserId);
    this.broadcast.emitMessage(roomId, message);
  }

  private buildAnnouncement(
    roomId: string,
    options: ApplyMovieChangeOptions
  ): RealtimeChatMessage {
    const actor = this.roomState
      .get(roomId)
      ?.connectedUsers.find((user) => user.userId === options.actorUserId);
    const trimmedName = options.movieName?.trim();
    const content =
      trimmedName !== undefined && trimmedName.length > 0
        ? `Movie changed to "${trimmedName}". Waiting for the host to play it.`
        : 'Movie changed. Waiting for the host to play it.';

    return {
      id: `${options.actorUserId}-${String(Date.now())}`,
      roomId,
      userId: options.actorUserId,
      userName: options.actorUserName,
      color: actor?.color ?? DEFAULT_USER_COLOR,
      content,
      timestamp: new Date().toISOString()
    };
  }

  private async syncRoomStatus(roomId: string, creatorId: string | null): Promise<void> {
    const status = this.roomState.syncStatus(roomId, creatorId);
    await this.rooms.setStatus(roomId, status);
  }
}
