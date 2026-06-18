import { Injectable, Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';

import { REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';
import type {
  RealtimeChatMessage,
  RoomStateEvent,
  UserJoinedEvent
} from '@repo/schemas/realtime';

import type { RealtimeBroadcastPort } from '@/realtime/realtime.broadcast-port';
import { PlaybackCountdownService } from '@/realtime/services/playback-countdown.service';
import { RoomStateService } from '@/realtime/services/room-state.service';

/**
 * Single owner of every outbound socket write. Wraps the Socket.IO server so
 * the gateway, moderation, and HTTP layer all emit through one place, and
 * implements the {@link RealtimeBroadcastPort} the HTTP layer depends on.
 */
@Injectable()
export class RealtimeBroadcastService implements RealtimeBroadcastPort {
  private readonly logger = new Logger(RealtimeBroadcastService.name);
  private server: Server | null = null;

  constructor(
    private readonly roomState: RoomStateService,
    private readonly countdown: PlaybackCountdownService
  ) {}

  bind(server: Server): void {
    this.server = server;
  }

  getSocket(socketId: string): Socket | undefined {
    return this.requireServer().sockets.sockets.get(socketId);
  }

  emitToRoom(roomId: string, event: string, payload?: unknown): void {
    this.requireServer().to(roomId).emit(event, payload);
  }

  disconnectSocket(socketId: string, message?: string): void {
    const socket = this.getSocket(socketId);
    if (!socket) return;
    if (message !== undefined) {
      socket.emit(REALTIME_SERVER_EVENTS.error, { message });
    }
    socket.disconnect(true);
  }

  buildRoomState(roomId: string): RoomStateEvent {
    const state = this.roomState.getOrCreate(roomId);
    return {
      status: state.status,
      connectedUsers: state.connectedUsers,
      messages: state.messages,
      playback: this.roomState.getMaterializedPlayback(roomId),
      countdown: state.countdown
    };
  }

  emitRoomState(roomId: string): void {
    this.emitToRoom(roomId, REALTIME_SERVER_EVENTS.roomState, this.buildRoomState(roomId));
  }

  emitRoomMovieUpdated(roomId: string, movieId: string): void {
    this.emitToRoom(roomId, REALTIME_SERVER_EVENTS.movieUpdated, { roomId, movieId });
  }

  emitRoomPlaybackChanged(roomId: string, actorUserId: string | null): void {
    this.emitToRoom(roomId, REALTIME_SERVER_EVENTS.playbackChanged, {
      roomId,
      actorUserId,
      playback: this.roomState.getMaterializedPlayback(roomId)
    });
  }

  emitUserJoined(roomId: string, payload: UserJoinedEvent): void {
    this.emitToRoom(roomId, REALTIME_SERVER_EVENTS.userJoined, payload);
  }

  emitUserLeft(roomId: string, userId: string): void {
    this.emitToRoom(roomId, REALTIME_SERVER_EVENTS.userLeft, { userId, roomId });
  }

  emitMessage(roomId: string, message: RealtimeChatMessage): void {
    this.emitToRoom(roomId, REALTIME_SERVER_EVENTS.messageReceived, message);
  }

  clearCountdown(roomId: string): void {
    this.countdown.cancel(roomId);
  }

  removeRoomMember(roomId: string, userId: string): void {
    if (!this.roomState.get(roomId)) return;

    const result = this.roomState.removeUser(roomId, userId);
    if (!result) return;

    for (const socketId of result.socketIds) {
      const socket = this.getSocket(socketId);
      if (socket) {
        void socket.leave(roomId);
      }
    }

    this.emitUserLeft(roomId, userId);

    if (this.roomState.get(roomId)) {
      this.emitRoomState(roomId);
    } else {
      this.countdown.cancel(roomId);
    }
  }

  private requireServer(): Server {
    if (!this.server) {
      this.logger.error('Realtime server accessed before initialization');
      throw new Error('Realtime server has not been initialized yet');
    }
    return this.server;
  }
}
