import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Types } from 'mongoose';
import type { Server, Socket } from 'socket.io';

import {
  joinRoomPayloadSchema,
  leaveRoomPayloadSchema,
  roomModerateUserPayloadSchema,
  roomMovieUpdatedPayloadSchema,
  roomPlaybackUpdatePayloadSchema,
  roomReadyUpdatePayloadSchema,
  sendMessagePayloadSchema
} from '@repo/schemas/realtime';

import { RoomRepository } from '@/rooms/room.repository';
import type { RoomDocument } from '@/rooms/room.schema';
import { DEFAULT_USER_COLOR } from '@/realtime/realtime.consts';
import type { SocketUserInfo } from '@/realtime/realtime.types';
import { RoomStateService } from '@/realtime/services/room-state.service';
import { SocketAuthService } from '@/realtime/services/socket-auth.service';

type CreatorRefLike = Types.ObjectId | { _id: Types.ObjectId | string } | string | null | undefined;

interface PendingPlaybackStart {
  movieId: string;
  positionSec: number;
  playbackRate: number;
}

const COUNTDOWN_DURATION_MS = 3_000;

function creatorRefToId(creator: CreatorRefLike): string | null {
  if (creator == null) return null;
  if (typeof creator === 'string') return creator;
  if (creator instanceof Types.ObjectId) return creator.toString();
  return String(creator._id);
}

@WebSocketGateway({
  cors: { origin: true, credentials: true }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  /** socket.id → authenticated user identity */
  private readonly socketToUser = new Map<string, SocketUserInfo>();
  /** userId → active socket ids */
  private readonly userToSockets = new Map<string, Set<string>>();
  private readonly countdownTimers = new Map<string, NodeJS.Timeout>();
  private readonly pendingPlaybackStarts = new Map<string, PendingPlaybackStart>();

  constructor(
    private readonly rooms: RoomRepository,
    private readonly roomState: RoomStateService,
    private readonly socketAuth: SocketAuthService
  ) {}

  emitRoomMovieUpdated(roomId: string, movieId: string): void {
    this.server.to(roomId).emit('room:movie-updated', { roomId, movieId });
  }

  emitRoomPlaybackChanged(roomId: string, actorUserId: string | null): void {
    this.server.to(roomId).emit('room:playback-changed', {
      roomId,
      actorUserId,
      playback: this.roomState.getMaterializedPlayback(roomId)
    });
  }

  emitRoomState(roomId: string): void {
    this.server.to(roomId).emit('room:state', this.buildRoomState(roomId));
  }

  clearCountdown(roomId: string): void {
    this.cancelCountdown(roomId);
  }

  removeRoomMember(roomId: string, userId: string): void {
    const state = this.roomState.get(roomId);
    if (!state) return;

    const result = this.roomState.removeUser(roomId, userId);
    if (!result) return;

    for (const socketId of result.socketIds) {
      const targetSocket = this.server.sockets.sockets.get(socketId);
      if (targetSocket) {
        void targetSocket.leave(roomId);
      }
    }

    this.server.to(roomId).emit('room:user-left', { userId, roomId });

    if (this.roomState.get(roomId)) {
      this.emitRoomState(roomId);
    } else {
      this.cancelCountdown(roomId);
    }
  }

  async handleConnection(socket: Socket): Promise<void> {
    const userInfo = await this.socketAuth.authenticate(socket);
    if (!userInfo) {
      this.rejectSocket(socket, 'Unauthorized');
      return;
    }

    this.socketToUser.set(socket.id, userInfo);
    this.addUserSocket(userInfo.userId, socket.id);
    this.logger.debug(`connect ${socket.id} user=${userInfo.userId}`);
    // Signal to the client that auth is complete and room events can be sent.
    socket.emit('connection:ack');
  }

  handleDisconnect(socket: Socket): void {
    const userInfo = this.socketToUser.get(socket.id);
    this.socketToUser.delete(socket.id);
    if (!userInfo) return;

    this.removeUserSocket(userInfo.userId, socket.id);

    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue; // default private room

      const result = this.roomState.removeSocket(roomId, socket.id);
      // Only notify the room when this was the user's last live socket there.
      if (result && !result.userStillConnected) {
        this.server.to(roomId).emit('room:user-left', { userId: userInfo.userId, roomId });
      }
      if (this.roomState.get(roomId)) {
        this.emitRoomState(roomId);
      } else {
        this.cancelCountdown(roomId);
      }
      void this.syncRoomStatus(roomId);
    }

    this.logger.debug(`disconnect ${socket.id}`);
  }

  @SubscribeMessage('room:join')
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): Promise<void> {
    const userInfo = this.socketToUser.get(socket.id);
    if (!userInfo) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }

    const parsed = joinRoomPayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid payload' });
      return;
    }

    const { roomId } = parsed.data;
    const { userId, userName } = userInfo;

    const room = await this.rooms.findOneAccessibleById(roomId, userId);
    if (!room) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    await socket.join(roomId);

    const roomState = this.roomState.getOrCreate(roomId);
    const wasAlreadyConnected = roomState.connectedUsers.some((user) => user.userId === userId);
    this.roomState.syncMovie(roomId, this.resolveRoomMovieId(room.movie));
    const user = this.roomState.joinUser({ roomId, userId, userName, socketId: socket.id });
    const state = this.roomState.getOrCreate(roomId);
    const playback = this.roomState.getMaterializedPlayback(roomId);
    const status = this.roomState.syncStatus(roomId, creatorRefToId(room.creator));
    await this.rooms.setStatus(roomId, status);

    socket.emit('room:state', {
      status,
      connectedUsers: state.connectedUsers,
      messages: state.messages,
      playback,
      countdown: state.countdown
    });

    if (!wasAlreadyConnected) {
      this.server.to(roomId).emit('room:user-joined', {
        userId,
        userName,
        color: user.color,
        isReady: user.isReady,
        roomId
      });
    }

    this.logger.debug(`${userId} joined room ${roomId}`);
  }

  @SubscribeMessage('room:leave')
  async handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): Promise<void> {
    const userInfo = this.socketToUser.get(socket.id);
    if (!userInfo) return;

    const parsed = leaveRoomPayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid payload' });
      return;
    }

    const { roomId } = parsed.data;
    const { userId } = userInfo;

    const result = this.roomState.removeSocket(roomId, socket.id);
    await socket.leave(roomId);

    if (result && !result.userStillConnected) {
      this.server.to(roomId).emit('room:user-left', { userId, roomId });
    }
    if (this.roomState.get(roomId)) {
      this.emitRoomState(roomId);
    } else {
      this.cancelCountdown(roomId);
    }
    const room = await this.rooms.findRawById(roomId).catch(() => null);
    if (room != null) {
      await this.syncRoomStatus(roomId, creatorRefToId(room.creator as CreatorRefLike));
    }
    this.logger.debug(`${userId} left room ${roomId}`);
  }

  @SubscribeMessage('room:message')
  handleMessage(@ConnectedSocket() socket: Socket, @MessageBody() data: unknown): void {
    const userInfo = this.socketToUser.get(socket.id);
    if (!userInfo) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }

    const parsed = sendMessagePayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid message' });
      return;
    }

    const { roomId, content } = parsed.data;
    const { userId, userName } = userInfo;

    if (!socket.rooms.has(roomId)) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const sender = this.roomState.findSocketUser(roomId, socket.id);
    const message = {
      id: `${socket.id}-${String(Date.now())}`,
      roomId,
      userId,
      userName,
      color: sender?.color ?? DEFAULT_USER_COLOR,
      content,
      timestamp: new Date().toISOString()
    };

    this.roomState.addMessage(roomId, message);
    this.server.to(roomId).emit('room:message-received', message);
  }

  @SubscribeMessage('room:movie-updated')
  async handleMovieUpdated(@ConnectedSocket() socket: Socket, @MessageBody() data: unknown): Promise<void> {
    const userInfo = this.socketToUser.get(socket.id);
    if (!userInfo) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }

    const parsed = roomMovieUpdatedPayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid payload' });
      return;
    }

    const { roomId, movieId } = parsed.data;
    if (!socket.rooms.has(roomId)) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const room = await this.assertRoomCreator(roomId, userInfo.userId);
    if (!room) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const currentPlayback = this.roomState.getOrCreate(roomId).playback;
    const pendingPlayback = this.pendingPlaybackStarts.get(roomId);
    this.roomState.syncMovie(roomId, movieId);
    this.roomState.setAllUsersReady(roomId, false);
    if (currentPlayback.isPlaying || pendingPlayback !== undefined) {
      this.pendingPlaybackStarts.set(roomId, {
        movieId,
        positionSec: 0,
        playbackRate: currentPlayback.playbackRate
      });
      this.startCountdown(roomId);
      this.roomState.updatePlayback(roomId, {
        movieId,
        isPlaying: false,
        positionSec: 0,
        playbackRate: currentPlayback.playbackRate
      });
    } else {
      this.cancelCountdown(roomId);
    }
    await this.syncRoomStatus(roomId, creatorRefToId(room.creator));
    const movieName = room.movie_name?.trim();
    const announcement =
      movieName !== undefined && movieName.length > 0
        ? `Movie changed to "${movieName}". Waiting for the host to play it.`
        : 'Movie changed. Waiting for the host to play it.';
    const sender = this.roomState.findSocketUser(roomId, socket.id);
    const message = {
      id: `${socket.id}-${String(Date.now())}`,
      roomId,
      userId: userInfo.userId,
      userName: userInfo.userName,
      color: sender?.color ?? DEFAULT_USER_COLOR,
      content: announcement,
      timestamp: new Date().toISOString()
    };

    this.roomState.addMessage(roomId, message);
    this.emitRoomMovieUpdated(roomId, movieId);
    this.emitRoomState(roomId);
    this.emitRoomPlaybackChanged(roomId, userInfo.userId);
    this.server.to(roomId).emit('room:message-received', message);
  }

  @SubscribeMessage('room:playback-update')
  async handlePlaybackUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): Promise<void> {
    const userInfo = this.socketToUser.get(socket.id);
    if (!userInfo) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }

    const parsed = roomPlaybackUpdatePayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid payload' });
      return;
    }

    const { roomId, movieId, isPlaying, positionSec, playbackRate, force } = parsed.data;
    if (!socket.rooms.has(roomId)) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const room = await this.assertRoomCreator(roomId, userInfo.userId);
    if (!room) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const roomRuntimeState = this.roomState.getOrCreate(roomId);
    const previousPlayback = roomRuntimeState.playback;
    const activeMovieId = this.resolveRoomMovieId(room.movie);
    if (activeMovieId !== movieId) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    if (isPlaying) {
      const isSoloHost = roomRuntimeState.connectedUsers.length === 1;
      const roomReady = this.roomState.computeStatus(roomId, creatorRefToId(room.creator)) === 'ready';
      if (!previousPlayback.isPlaying && !isSoloHost && !roomReady && !force) {
        socket.emit('room:error', { message: 'All users must be ready before playback starts.' });
        return;
      }

      if (previousPlayback.isPlaying) {
        this.roomState.updatePlayback(roomId, {
          movieId,
          isPlaying: true,
          positionSec,
          playbackRate
        });
        this.cancelCountdown(roomId);
        await this.syncRoomStatus(roomId, creatorRefToId(room.creator));
        this.server.to(roomId).emit('room:playback-changed', {
          roomId,
          actorUserId: userInfo.userId,
          playback: this.roomState.getMaterializedPlayback(roomId)
        });
        this.server.to(roomId).emit('room:state', this.buildRoomState(roomId));
        return;
      }

      this.pendingPlaybackStarts.set(roomId, {
        movieId,
        positionSec,
        playbackRate
      });
      this.startCountdown(roomId);
      await this.syncRoomStatus(roomId, creatorRefToId(room.creator));
      this.server.to(roomId).emit('room:state', this.buildRoomState(roomId));
      return;
    }

    this.pendingPlaybackStarts.delete(roomId);
    this.cancelCountdown(roomId);
    this.roomState.updatePlayback(roomId, {
      movieId,
      isPlaying: false,
      positionSec,
      playbackRate
    });
    await this.syncRoomStatus(roomId, creatorRefToId(room.creator));
    this.server.to(roomId).emit('room:playback-changed', {
      roomId,
      actorUserId: userInfo.userId,
      playback: this.roomState.getMaterializedPlayback(roomId)
    });
    this.server.to(roomId).emit('room:state', this.buildRoomState(roomId));
  }

  @SubscribeMessage('room:ready-update')
  async handleReadyUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): Promise<void> {
    const userInfo = this.socketToUser.get(socket.id);
    if (!userInfo) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }

    const parsed = roomReadyUpdatePayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid payload' });
      return;
    }

    const { roomId, isReady } = parsed.data;
    if (!socket.rooms.has(roomId)) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const room = await this.rooms.findOneAccessibleById(roomId, userInfo.userId);
    if (!room) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const user = this.roomState.setUserReady(roomId, userInfo.userId, isReady);
    if (!user) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    await this.syncRoomStatus(roomId, creatorRefToId(room.creator));
    this.server.to(roomId).emit('room:state', this.buildRoomState(roomId));
  }

  @SubscribeMessage('room:kick-user')
  async handleKickUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): Promise<void> {
    await this.handleModerateUser(socket, data, 'kicked from the room', false);
  }

  @SubscribeMessage('room:block-user')
  async handleBlockUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): Promise<void> {
    await this.handleModerateUser(socket, data, 'blocked from the room', true);
  }

  private rejectSocket(socket: Socket, message: string): void {
    socket.emit('room:error', { message });
    socket.disconnect(true);
  }

  private async assertRoomCreator(roomId: string, userId: string): Promise<RoomDocument | null> {
    const room = await this.rooms.findOneAccessibleById(roomId, userId);
    if (!room || creatorRefToId(room.creator) !== userId) {
      return null;
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

  private hasDocumentId(value: unknown): value is { _id: unknown } {
    return typeof value === 'object' && value !== null && '_id' in value;
  }

  private buildRoomState(roomId: string) {
    const state = this.roomState.getOrCreate(roomId);
    return {
      status: state.status,
      connectedUsers: state.connectedUsers,
      messages: state.messages,
      playback: this.roomState.getMaterializedPlayback(roomId),
      countdown: state.countdown
    };
  }

  private async syncRoomStatus(roomId: string, creatorId: string | null = null): Promise<void> {
    const status = this.roomState.syncStatus(roomId, creatorId);
    await this.rooms.setStatus(roomId, status);
  }

  private cancelCountdown(roomId: string): void {
    const timer = this.countdownTimers.get(roomId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.countdownTimers.delete(roomId);
    }
    this.pendingPlaybackStarts.delete(roomId);
    if (this.roomState.get(roomId)) {
      this.roomState.clearCountdown(roomId);
    }
  }

  private startCountdown(roomId: string): void {
    const state = this.roomState.get(roomId);
    if (!state) return;
    if (this.countdownTimers.has(roomId)) {
      return;
    }

    const endsAt = new Date(Date.now() + COUNTDOWN_DURATION_MS).toISOString();
    this.roomState.setCountdown(roomId, {
      active: true,
      endsAt
    });

    const timer = setTimeout(() => {
      this.countdownTimers.delete(roomId);
      if (!this.roomState.get(roomId)) {
        return;
      }
      const pendingPlayback = this.pendingPlaybackStarts.get(roomId);
      if (pendingPlayback === undefined) {
        this.roomState.clearCountdown(roomId);
        void this.syncRoomStatus(roomId);
        this.emitRoomState(roomId);
        return;
      }
      this.pendingPlaybackStarts.delete(roomId);
      this.roomState.updatePlayback(roomId, {
        movieId: pendingPlayback.movieId,
        isPlaying: true,
        positionSec: pendingPlayback.positionSec,
        playbackRate: pendingPlayback.playbackRate
      });
      this.roomState.clearCountdown(roomId);
      void this.syncRoomStatus(roomId);
      this.server.to(roomId).emit('room:playback-changed', {
        roomId,
        actorUserId: null,
        playback: this.roomState.getMaterializedPlayback(roomId)
      });
      this.server.to(roomId).emit('room:state', this.buildRoomState(roomId));
    }, COUNTDOWN_DURATION_MS);
    this.countdownTimers.set(roomId, timer);
  }

  private async handleModerateUser(
    socket: Socket,
    data: unknown,
    errorMessage: string,
    shouldBan: boolean
  ): Promise<void> {
    const userInfo = this.socketToUser.get(socket.id);
    if (!userInfo) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }

    const parsed = roomModerateUserPayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid payload' });
      return;
    }

    const { roomId, targetUserId } = parsed.data;
    if (!socket.rooms.has(roomId)) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const room = await this.assertRoomCreator(roomId, userInfo.userId);
    if (!room || targetUserId === creatorRefToId(room.creator)) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const state = this.roomState.get(roomId);
    if (!state) {
      socket.emit('room:error', { message: 'Room not found' });
      return;
    }

    const targetSockets = state.connectedUsers.filter((user) => user.userId === targetUserId);
    if (targetSockets.length === 0 && !shouldBan) {
      socket.emit('room:error', { message: 'User is not in the room' });
      return;
    }

    if (shouldBan) {
      await this.rooms.banUser(roomId, new Types.ObjectId(targetUserId));
    }

    const removedCount = this.disconnectUserSockets(roomId, targetUserId, errorMessage);
    if (removedCount === 0 && !shouldBan) {
      socket.emit('room:error', { message: 'User is not in the room' });
      return;
    }

    if (!this.roomState.get(roomId)) {
      this.cancelCountdown(roomId);
    }
    void this.syncRoomStatus(roomId, creatorRefToId(room.creator));
  }

  private disconnectUserSockets(roomId: string, targetUserId: string, message: string): number {
    const state = this.roomState.get(roomId);
    if (!state) {
      return 0;
    }

    const socketIds = new Set<string>();
    for (const user of state.connectedUsers) {
      if (user.userId !== targetUserId) continue;
      for (const socketId of user.socketIds) {
        socketIds.add(socketId);
      }
    }

    for (const socketId of socketIds) {
      const targetSocket = this.server.sockets.sockets.get(socketId);
      if (targetSocket) {
        targetSocket.emit('room:error', { message });
        targetSocket.disconnect(true);
      }
    }

    return socketIds.size;
  }

  private addUserSocket(userId: string, socketId: string): void {
    const sockets = this.userToSockets.get(userId);
    if (sockets) {
      sockets.add(socketId);
      return;
    }

    this.userToSockets.set(userId, new Set([socketId]));
  }

  private removeUserSocket(userId: string, socketId: string): void {
    const sockets = this.userToSockets.get(userId);
    if (!sockets) return;

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userToSockets.delete(userId);
    }
  }
}
