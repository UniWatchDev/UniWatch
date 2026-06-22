import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway
} from '@nestjs/websockets';
import { WsException } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { REALTIME_CLIENT_EVENTS, REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';
import {
  joinRoomPayloadSchema,
  leaveRoomPayloadSchema,
  roomModerateUserPayloadSchema,
  roomMovieUpdatedPayloadSchema,
  roomPlaybackUpdatePayloadSchema,
  roomReadyUpdatePayloadSchema,
  sendMessagePayloadSchema
} from '@repo/schemas/realtime';
import type {
  JoinRoomPayload,
  LeaveRoomPayload,
  RealtimeChatMessage,
  RoomModerateUserPayload,
  RoomMovieUpdatedPayload,
  RoomPlaybackUpdatePayload,
  RoomReadyUpdatePayload,
  SendMessagePayload
} from '@repo/schemas/realtime';

import { DEFAULT_USER_COLOR } from '@/realtime/realtime.consts';
import type { SocketUserInfo } from '@/realtime/realtime.types';
import { ConnectionRegistryService } from '@/realtime/services/connection-registry.service';
import { PlaybackCountdownService } from '@/realtime/services/playback-countdown.service';
import { RealtimeBroadcastService } from '@/realtime/services/realtime-broadcast.service';
import { RoomMovieChangeService } from '@/realtime/services/room-movie-change.service';
import { RoomModerationService } from '@/realtime/services/room-moderation.service';
import { RoomStateService } from '@/realtime/services/room-state.service';
import { SocketAuthService } from '@/realtime/services/socket-auth.service';
import { creatorRefToId, type CreatorRefLike } from '@/realtime/utils/creator-ref';
import { getAuthenticatedUser, WsAuthGuard } from '@/realtime/ws-auth.guard';
import { WsExceptionFilter } from '@/realtime/ws-exception.filter';
import { ZodWsValidationPipe } from '@/realtime/zod-ws-validation.pipe';
import { RoomRepository } from '@/rooms/room.repository';
import type { RoomDocument } from '@/rooms/room.schema';

/**
 * Thin transport layer for realtime room events. Authentication is enforced by
 * {@link WsAuthGuard}, payloads are validated by {@link ZodWsValidationPipe}, and
 * thrown errors are mapped to `room:error` by {@link WsExceptionFilter}. All
 * runtime state, countdown timers, broadcasting, and moderation live in
 * dedicated services so each handler only orchestrates.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true }
})
@UseGuards(WsAuthGuard)
@UseFilters(WsExceptionFilter)
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly rooms: RoomRepository,
    private readonly roomState: RoomStateService,
    private readonly socketAuth: SocketAuthService,
    private readonly registry: ConnectionRegistryService,
    private readonly countdown: PlaybackCountdownService,
    private readonly broadcast: RealtimeBroadcastService,
    private readonly moderation: RoomModerationService,
    private readonly movieChange: RoomMovieChangeService
  ) {}

  afterInit(server: Server): void {
    this.broadcast.bind(server);
  }

  async handleConnection(socket: Socket): Promise<void> {
    const user = await this.socketAuth.authenticate(socket);
    if (!user) {
      socket.emit(REALTIME_SERVER_EVENTS.error, { message: 'Unauthorized' });
      socket.disconnect(true);
      return;
    }

    this.registry.register(socket.id, user);
    this.logger.debug(`connect ${socket.id} user=${user.userId}`);
    socket.emit(REALTIME_SERVER_EVENTS.connectionAck);
  }

  handleDisconnect(socket: Socket): void {
    const user = this.registry.unregister(socket.id);
    if (!user) return;

    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue; // default private room
      this.removeSocketFromRoom(roomId, socket.id, user.userId);
    }

    this.logger.debug(`disconnect ${socket.id}`);
  }

  @SubscribeMessage(REALTIME_CLIENT_EVENTS.join)
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodWsValidationPipe(joinRoomPayloadSchema)) { roomId }: JoinRoomPayload
  ): Promise<void> {
    const user = getAuthenticatedUser(socket);
    const room = await this.rooms.findOneAccessibleById(roomId, user.userId);
    if (!room) {
      throw new WsException('Forbidden');
    }

    await socket.join(roomId);

    const existing = this.roomState.getOrCreate(roomId);
    const wasAlreadyConnected = existing.connectedUsers.some((entry) => entry.userId === user.userId);
    this.roomState.syncMovie(roomId, this.resolveRoomMovieId(room.movie));
    this.clearOrphanCountdown(roomId);
    const joined = this.roomState.joinUser({
      roomId,
      userId: user.userId,
      userName: user.userName,
      socketId: socket.id
    });
    await this.syncRoomStatus(roomId, creatorRefToId(room.creator));

    socket.emit(REALTIME_SERVER_EVENTS.roomState, this.broadcast.buildRoomState(roomId));

    if (!wasAlreadyConnected) {
      this.broadcast.emitUserJoined(roomId, {
        userId: user.userId,
        userName: user.userName,
        color: joined.color,
        isReady: joined.isReady,
        roomId
      });
    }

    this.logger.debug(`${user.userId} joined room ${roomId}`);
  }

  @SubscribeMessage(REALTIME_CLIENT_EVENTS.leave)
  async handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodWsValidationPipe(leaveRoomPayloadSchema)) { roomId }: LeaveRoomPayload
  ): Promise<void> {
    const user = getAuthenticatedUser(socket);
    if (this.roomState.isLastSocketLeave(roomId, socket.id)) {
      this.roomState.prepareEmptyRoom(roomId);
    }
    const result = this.roomState.removeSocket(roomId, socket.id);
    await socket.leave(roomId);

    if (result && !result.userStillConnected) {
      this.broadcast.emitUserLeft(roomId, user.userId);
    }
    if (this.roomState.get(roomId)) {
      this.broadcast.emitRoomPresenceChanged(roomId);
    } else {
      this.countdown.cancel(roomId);
    }

    const room = await this.rooms.findRawById(roomId).catch(() => null);
    if (room != null) {
      if (!this.roomState.get(roomId)) {
        await this.finalizeRoomWhenEmpty(roomId, creatorRefToId(room.creator as CreatorRefLike));
      } else {
        await this.syncRoomStatus(roomId, creatorRefToId(room.creator as CreatorRefLike));
      }
    }
    this.logger.debug(`${user.userId} left room ${roomId}`);
  }

  @SubscribeMessage(REALTIME_CLIENT_EVENTS.message)
  handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodWsValidationPipe(sendMessagePayloadSchema, 'Invalid message'))
    { roomId, content }: SendMessagePayload
  ): void {
    const user = getAuthenticatedUser(socket);
    this.assertInRoom(socket, roomId);

    const message = this.buildChatMessage(roomId, socket.id, user, content);
    this.roomState.addMessage(roomId, message);
    this.broadcast.emitMessage(roomId, message);
  }

  @SubscribeMessage(REALTIME_CLIENT_EVENTS.movieUpdated)
  async handleMovieUpdated(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodWsValidationPipe(roomMovieUpdatedPayloadSchema))
    { roomId, movieId }: RoomMovieUpdatedPayload
  ): Promise<void> {
    const user = getAuthenticatedUser(socket);
    this.assertInRoom(socket, roomId);
    const room = await this.assertRoomCreator(roomId, user.userId);

    await this.movieChange.applyMovieChange(roomId, movieId, {
      actorUserId: user.userId,
      actorUserName: user.userName,
      creatorId: creatorRefToId(room.creator) ?? user.userId,
      movieName: room.movie_name ?? null
    });
  }

  @SubscribeMessage(REALTIME_CLIENT_EVENTS.playbackUpdate)
  async handlePlaybackUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodWsValidationPipe(roomPlaybackUpdatePayloadSchema))
    payload: RoomPlaybackUpdatePayload
  ): Promise<void> {
    const user = getAuthenticatedUser(socket);
    const { roomId, movieId, isPlaying, positionSec, playbackRate, force, ended } = payload;
    this.assertInRoom(socket, roomId);
    const room = await this.assertRoomCreator(roomId, user.userId);

    const runtime = this.roomState.getOrCreate(roomId);
    const previousPlayback = runtime.playback;
    const publishedDurationSec = this.roomState.getPublishedDuration(roomId);
    const maxPlayablePositionSec =
      publishedDurationSec !== null ? Math.max(0, publishedDurationSec - 1) : null;
    const clampedPositionSec =
      maxPlayablePositionSec !== null ? Math.min(positionSec, maxPlayablePositionSec) : positionSec;
    if (!this.isAllowedPlaybackMovieId(runtime, room, movieId)) {
      throw new WsException('Forbidden');
    }

    if (!isPlaying) {
      this.countdown.cancel(roomId);
      if (ended === true) {
        this.roomState.resetPlaybackSession(roomId);
      } else {
        this.roomState.updatePlayback(roomId, {
          movieId,
          isPlaying: false,
          positionSec: clampedPositionSec,
          playbackRate
        });
      }
      await this.syncRoomStatus(roomId, creatorRefToId(room.creator));
      this.broadcast.emitRoomPlaybackChanged(roomId, user.userId);
      this.broadcast.emitRoomState(roomId);
      return;
    }

    if (previousPlayback.isPlaying) {
      this.roomState.updatePlayback(roomId, {
        movieId,
        isPlaying: true,
        positionSec: clampedPositionSec,
        playbackRate
      });
      this.countdown.cancel(roomId);
      await this.syncRoomStatus(roomId, creatorRefToId(room.creator));
      // Keep server position fresh for joiners, but avoid room-wide playback broadcasts
      // during continuous play — those cause viewers to seek/replay and stutter.
      const rateChanged = previousPlayback.playbackRate !== playbackRate;
      const seeked =
        force === true ||
        Math.abs(clampedPositionSec - previousPlayback.positionSec) > 1;
      if (rateChanged || seeked) {
        this.broadcast.emitRoomPlaybackChanged(roomId, user.userId);
      }
      return;
    }

    this.assertPlaybackAllowed(roomId, runtime.connectedUsers.length, creatorRefToId(room.creator), force);
    this.countdown.setPending(roomId, { movieId, positionSec: clampedPositionSec, playbackRate });
    this.countdown.start(roomId, (id) => {
      this.movieChange.finishCountdown(id);
    });
    await this.syncRoomStatus(roomId, creatorRefToId(room.creator));
    this.broadcast.emitRoomPresenceChanged(roomId);
  }

  @SubscribeMessage(REALTIME_CLIENT_EVENTS.readyUpdate)
  async handleReadyUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodWsValidationPipe(roomReadyUpdatePayloadSchema))
    { roomId, isReady }: RoomReadyUpdatePayload
  ): Promise<void> {
    const user = getAuthenticatedUser(socket);
    this.assertInRoom(socket, roomId);

    const room = await this.rooms.findOneAccessibleById(roomId, user.userId);
    if (!room) {
      throw new WsException('Forbidden');
    }

    const updated = this.roomState.setUserReady(roomId, user.userId, isReady);
    if (!updated) {
      throw new WsException('Forbidden');
    }

    await this.syncRoomStatus(roomId, creatorRefToId(room.creator));
    this.broadcast.emitRoomPresenceChanged(roomId);
  }

  @SubscribeMessage(REALTIME_CLIENT_EVENTS.kickUser)
  async handleKickUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodWsValidationPipe(roomModerateUserPayloadSchema))
    { roomId, targetUserId }: RoomModerateUserPayload
  ): Promise<void> {
    const user = getAuthenticatedUser(socket);
    this.assertInRoom(socket, roomId);
    await this.moderation.moderate({
      actorUserId: user.userId,
      roomId,
      targetUserId,
      errorMessage: 'You have been kicked from this room.',
      shouldBan: false
    });
  }

  @SubscribeMessage(REALTIME_CLIENT_EVENTS.blockUser)
  async handleBlockUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodWsValidationPipe(roomModerateUserPayloadSchema))
    { roomId, targetUserId }: RoomModerateUserPayload
  ): Promise<void> {
    const user = getAuthenticatedUser(socket);
    this.assertInRoom(socket, roomId);
    await this.moderation.moderate({
      actorUserId: user.userId,
      roomId,
      targetUserId,
      errorMessage: 'You have been blocked from this room.',
      shouldBan: true
    });
  }

  private removeSocketFromRoom(roomId: string, socketId: string, userId: string): void {
    if (this.roomState.isLastSocketLeave(roomId, socketId)) {
      this.roomState.prepareEmptyRoom(roomId);
    }
    const result = this.roomState.removeSocket(roomId, socketId);
    if (result && !result.userStillConnected) {
      this.broadcast.emitUserLeft(roomId, userId);
    }
    if (this.roomState.get(roomId)) {
      this.broadcast.emitRoomPresenceChanged(roomId);
      void this.syncRoomStatus(roomId);
      return;
    }
    this.countdown.cancel(roomId);
    void this.finalizeRoomWhenEmpty(roomId);
  }

  private async finalizeRoomWhenEmpty(roomId: string, creatorId: string | null = null): Promise<void> {
    this.countdown.cancel(roomId);
    await this.syncRoomStatus(roomId, creatorId);
  }

  private clearOrphanCountdown(roomId: string): void {
    if (this.countdown.hasTimer(roomId) && this.countdown.getPending(roomId) === undefined) {
      this.countdown.cancel(roomId);
    }
  }

  private assertPlaybackAllowed(
    roomId: string,
    connectedCount: number,
    creatorId: string | null,
    force: boolean | undefined
  ): void {
    const isSoloHost = connectedCount === 1;
    const roomReady = this.roomState.computeStatus(roomId, creatorId) === 'ready';
    if (!isSoloHost && !roomReady && force !== true) {
      throw new WsException('All users must be ready before playback starts.');
    }
  }

  private buildChatMessage(
    roomId: string,
    socketId: string,
    user: SocketUserInfo,
    content: string
  ): RealtimeChatMessage {
    const sender = this.roomState.findSocketUser(roomId, socketId);
    return {
      id: `${socketId}-${String(Date.now())}`,
      roomId,
      userId: user.userId,
      userName: user.userName,
      color: sender?.color ?? DEFAULT_USER_COLOR,
      content,
      timestamp: new Date().toISOString()
    };
  }

  private assertInRoom(socket: Socket, roomId: string): void {
    if (!socket.rooms.has(roomId)) {
      throw new WsException('Forbidden');
    }
  }

  private async assertRoomCreator(roomId: string, userId: string): Promise<RoomDocument> {
    const room = await this.rooms.findOneAccessibleById(roomId, userId);
    if (!room || creatorRefToId(room.creator) !== userId) {
      throw new WsException('Forbidden');
    }
    return room;
  }

  private resolveRoomMovieId(movie: unknown): string | null {
    if (movie == null) return null;
    if (typeof movie === 'string') return movie;
    if (this.hasDocumentId(movie)) {
      return String(movie._id);
    }
    return null;
  }

  /** Accept runtime playback movie id or persisted room.movie during mid-session swaps. */
  private isAllowedPlaybackMovieId(
    runtime: { playback: { movieId: string | null } },
    room: RoomDocument,
    movieId: string
  ): boolean {
    const allowed = new Set<string>();
    const dbMovieId = this.resolveRoomMovieId(room.movie);
    if (dbMovieId !== null) {
      allowed.add(dbMovieId);
    }
    if (runtime.playback.movieId !== null) {
      allowed.add(runtime.playback.movieId);
    }
    return allowed.has(movieId);
  }

  private hasDocumentId(value: unknown): value is { _id: unknown } {
    return typeof value === 'object' && value !== null && '_id' in value;
  }

  private async syncRoomStatus(roomId: string, creatorId: string | null = null): Promise<void> {
    const status = this.roomState.syncStatus(roomId, creatorId);
    await this.rooms.setStatus(roomId, status);
  }
}
