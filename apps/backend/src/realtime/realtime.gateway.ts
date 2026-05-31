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

@WebSocketGateway({
  cors: { origin: true, credentials: true }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // socket.id → userId (JWT sub)
  private readonly socketToUser = new Map<string, string>();

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
      this.server.to(roomId).emit('room:user-left', { userId, roomId });
    }

    this.logger.debug(`disconnect ${socket.id}`);
  }

  @SubscribeMessage('room:join')
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string }
  ): Promise<void> {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }
    const room = await this.rooms.findOneAccessibleById(data.roomId, userId);
    if (!room) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }
    await socket.join(data.roomId);
    this.server.to(data.roomId).emit('room:user-joined', { userId, roomId: data.roomId });
    this.logger.debug(`${userId} joined room ${data.roomId}`);
  }

  @SubscribeMessage('room:leave')
  async handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string }
  ): Promise<void> {
    const userId = this.socketToUser.get(socket.id);
    await socket.leave(data.roomId);
    this.server.to(data.roomId).emit('room:user-left', { userId, roomId: data.roomId });
    this.logger.debug(`${String(userId)} left room ${data.roomId}`);
  }

  @SubscribeMessage('room:message')
  handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; content: string }
  ): void {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) {
      socket.emit('room:error', { message: 'Unauthorized' });
      return;
    }
    if (!socket.rooms.has(data.roomId)) {
      socket.emit('room:error', { message: 'Forbidden' });
      return;
    }
    if (typeof data.content !== 'string' || data.content.trim().length === 0 || data.content.length > 2000) {
      socket.emit('room:error', { message: 'Invalid message' });
      return;
    }
    this.server.to(data.roomId).emit('room:message-received', {
      id: `${socket.id}-${String(Date.now())}`,
      userId,
      content: data.content,
      timestamp: new Date().toISOString()
    });
  }
}
