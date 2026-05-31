import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import {
  joinRoomPayloadSchema,
  leaveRoomPayloadSchema,
  REALTIME_MAX_MESSAGES,
  sendMessagePayloadSchema
} from '@repo/schemas/realtime';
import type { ConnectedUser, RealtimeRoomState } from '@repo/schemas/realtime';

import { AUTH_ACCESS_COOKIE } from '@/auth/auth.consts';
import type { JwtAccessPayload } from '@/auth/auth.types';
import { RoomRepository } from '@/rooms/room.repository';

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const idx = pair.indexOf('=');
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      return [key, val];
    })
  );
}

function makeDefaultPlayback(): RealtimeRoomState['playback'] {
  return { movieId: null, isPlaying: false, positionSec: 0, updatedAt: new Date().toISOString() };
}

function getOrCreateRoomState(
  map: Map<string, RealtimeRoomState>,
  roomId: string
): RealtimeRoomState {
  const existing = map.get(roomId);
  if (existing) return existing;
  const state: RealtimeRoomState = {
    roomId,
    connectedUsers: [],
    messages: [],
    playback: makeDefaultPlayback()
  };
  map.set(roomId, state);
  return state;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  /** socket.id → userId (JWT sub) */
  private readonly socketToUser = new Map<string, string>();

  /** roomId → in-memory runtime state (never persisted to MongoDB) */
  private readonly roomStates = new Map<string, RealtimeRoomState>();

  constructor(
    private readonly jwt: JwtService,
    private readonly rooms: RoomRepository
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const token = cookies[AUTH_ACCESS_COOKIE];

    if (!token) {
      socket.emit('room:error', { message: 'Unauthorized' });
      socket.disconnect(true);
      return;
    }

    try {
      // TODO: call authService.assertAccessTokenClaims(payload) to also check passwordVersion
      const payload = await this.jwt.verifyAsync<JwtAccessPayload>(token);
      this.socketToUser.set(socket.id, payload.sub);
      this.logger.debug(`connect ${socket.id} user=${payload.sub}`);
    } catch {
      socket.emit('room:error', { message: 'Unauthorized' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    const userId = this.socketToUser.get(socket.id);
    this.socketToUser.delete(socket.id);

    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue; // default private room

      const state = this.roomStates.get(roomId);
      if (state) {
        state.connectedUsers = state.connectedUsers.filter((u) => u.socketId !== socket.id);
        if (state.connectedUsers.length === 0) {
          this.roomStates.delete(roomId);
        }
      }

      this.server.to(roomId).emit('room:user-left', { userId, roomId });
    }

    this.logger.debug(`disconnect ${socket.id}`);
  }

  @SubscribeMessage('room:join')
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): Promise<void> {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }

    const parsed = joinRoomPayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid payload' });
      return;
    }

    const { roomId } = parsed.data;
    const room = await this.rooms.findOneAccessibleById(roomId, userId);
    if (!room) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    await socket.join(roomId);

    const state = getOrCreateRoomState(this.roomStates, roomId);
    const alreadyPresent = state.connectedUsers.some((u) => u.socketId === socket.id);
    if (!alreadyPresent) {
      const user: ConnectedUser = { userId, socketId: socket.id, joinedAt: new Date().toISOString() };
      state.connectedUsers.push(user);
    }

    this.server.to(roomId).emit('room:user-joined', { userId, roomId });
    this.logger.debug(`${userId} joined room ${roomId}`);
  }

  @SubscribeMessage('room:leave')
  async handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): Promise<void> {
    const userId = this.socketToUser.get(socket.id);

    const parsed = leaveRoomPayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid payload' });
      return;
    }

    const { roomId } = parsed.data;

    const state = this.roomStates.get(roomId);
    if (state) {
      state.connectedUsers = state.connectedUsers.filter((u) => u.socketId !== socket.id);
      if (state.connectedUsers.length === 0) {
        this.roomStates.delete(roomId);
      }
    }

    await socket.leave(roomId);
    this.server.to(roomId).emit('room:user-left', { userId, roomId });
    this.logger.debug(`${String(userId)} left room ${roomId}`);
  }

  @SubscribeMessage('room:message')
  handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): void {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }

    const parsed = sendMessagePayloadSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('room:error', { message: 'Invalid message' });
      return;
    }

    const { roomId, content } = parsed.data;

    if (!socket.rooms.has(roomId)) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }

    const message = {
      id: `${socket.id}-${String(Date.now())}`,
      roomId,
      userId,
      content,
      timestamp: new Date().toISOString()
    };

    const state = getOrCreateRoomState(this.roomStates, roomId);
    state.messages.push(message);
    if (state.messages.length > REALTIME_MAX_MESSAGES) {
      state.messages = state.messages.slice(-REALTIME_MAX_MESSAGES);
    }

    this.server.to(roomId).emit('room:message-received', message);
  }
}
