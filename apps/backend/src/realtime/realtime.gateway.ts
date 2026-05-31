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
import { UserRepository } from '@/auth/user.repository';
import { RoomRepository } from '@/rooms/room.repository';

// Stable palette used for the duration of a socket connection.
const ROOM_COLORS = [
  '#f97316', // orange
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#4ade80', // green
  '#fb923c', // amber
  '#f472b6', // pink
  '#34d399', // emerald
  '#60a5fa', // blue
  '#fbbf24', // yellow
  '#e879f9'  // fuchsia
] as const satisfies readonly string[];

function pickColor(usedColors: ReadonlySet<string>): string {
  const available = ROOM_COLORS.filter((c) => !usedColors.has(c));
  const pool = available.length > 0 ? available : [...ROOM_COLORS];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? ROOM_COLORS[0];
}

type SocketUserInfo = { userId: string; userName: string };

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

  /** socket.id → { userId, userName } */
  private readonly socketToUser = new Map<string, SocketUserInfo>();

  /** roomId → in-memory runtime state (never persisted to MongoDB) */
  private readonly roomStates = new Map<string, RealtimeRoomState>();

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UserRepository,
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
      const user = await this.users.findById(payload.sub);
      if (!user) {
        socket.emit('room:error', { message: 'Unauthorized' });
        socket.disconnect(true);
        return;
      }
      this.socketToUser.set(socket.id, { userId: payload.sub, userName: user.userName });
      this.logger.debug(`connect ${socket.id} user=${payload.sub}`);
      // Signal to the client that auth is complete and room events can be sent.
      socket.emit('connection:ack');
    } catch {
      socket.emit('room:error', { message: 'Unauthorized' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    const userInfo = this.socketToUser.get(socket.id);
    this.socketToUser.delete(socket.id);

    if (!userInfo) return;

    const { userId } = userInfo;

    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue; // default private room

      const state = this.roomStates.get(roomId);
      if (state) {
        state.connectedUsers = state.connectedUsers.filter((u) => u.socketId !== socket.id);
        // Only notify the room if the user has no other active socket in this room.
        // If they refreshed, their new socket already replaced the stale entry in
        // handleJoin, so they're still present under a different socketId.
        const stillConnected = state.connectedUsers.some((u) => u.userId === userId);
        if (!stillConnected) {
          this.server.to(roomId).emit('room:user-left', { userId, roomId });
        }
        if (state.connectedUsers.length === 0) {
          this.roomStates.delete(roomId);
        }
      }
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

    const state = getOrCreateRoomState(this.roomStates, roomId);

    // Remove any stale entry for this userId before adding the current socket.
    // This covers the refresh case: the new socket arrives before the old one's
    // disconnect fires, leaving two entries for the same user.
    const staleEntry = state.connectedUsers.find((u) => u.userId === userId);
    state.connectedUsers = state.connectedUsers.filter((u) => u.userId !== userId);

    // Reuse the previous color so the user keeps the same color after a refresh.
    const usedColors = new Set(state.connectedUsers.map((u) => u.color));
    const color = staleEntry?.color ?? pickColor(usedColors);

    const user: ConnectedUser = {
      userId,
      userName,
      color,
      socketId: socket.id,
      joinedAt: new Date().toISOString()
    };
    state.connectedUsers.push(user);

    socket.emit('room:state', {
      connectedUsers: state.connectedUsers,
      messages: state.messages,
      playback: state.playback
    });

    const joined = state.connectedUsers.find((u) => u.socketId === socket.id);
    this.server.to(roomId).emit('room:user-joined', {
      userId,
      userName,
      color: joined?.color ?? '#64748b',
      roomId
    });

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

    const state = this.roomStates.get(roomId);
    if (state) {
      state.connectedUsers = state.connectedUsers.filter((u) => u.socketId !== socket.id);
      if (state.connectedUsers.length === 0) {
        this.roomStates.delete(roomId);
      }
    }

    await socket.leave(roomId);
    this.server.to(roomId).emit('room:user-left', { userId, roomId });
    this.logger.debug(`${userId} left room ${roomId}`);
  }

  @SubscribeMessage('room:message')
  handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: unknown
  ): void {
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

    const state = getOrCreateRoomState(this.roomStates, roomId);
    const sender = state.connectedUsers.find((u) => u.socketId === socket.id);
    const color = sender?.color ?? '#64748b';

    const message = {
      id: `${socket.id}-${String(Date.now())}`,
      roomId,
      userId,
      userName,
      color,
      content,
      timestamp: new Date().toISOString()
    };

    state.messages.push(message);
    if (state.messages.length > REALTIME_MAX_MESSAGES) {
      state.messages = state.messages.slice(-REALTIME_MAX_MESSAGES);
    }

    this.server.to(roomId).emit('room:message-received', message);
  }
}
