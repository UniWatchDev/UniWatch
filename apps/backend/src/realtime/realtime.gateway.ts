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
import type { Server, Socket } from 'socket.io';

import {
  joinRoomPayloadSchema,
  leaveRoomPayloadSchema,
  sendMessagePayloadSchema
} from '@repo/schemas/realtime';

import { RoomRepository } from '@/rooms/room.repository';
import { DEFAULT_USER_COLOR } from '@/realtime/realtime.consts';
import type { SocketUserInfo } from '@/realtime/realtime.types';
import { RoomStateService } from '@/realtime/services/room-state.service';
import { SocketAuthService } from '@/realtime/services/socket-auth.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  /** socket.id → authenticated user identity */
  private readonly socketToUser = new Map<string, SocketUserInfo>();

  constructor(
    private readonly rooms: RoomRepository,
    private readonly roomState: RoomStateService,
    private readonly socketAuth: SocketAuthService
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const userInfo = await this.socketAuth.authenticate(socket);
    if (!userInfo) {
      this.rejectSocket(socket, 'Unauthorized');
      return;
    }

    this.socketToUser.set(socket.id, userInfo);
    this.logger.debug(`connect ${socket.id} user=${userInfo.userId}`);
    // Signal to the client that auth is complete and room events can be sent.
    socket.emit('connection:ack');
  }

  handleDisconnect(socket: Socket): void {
    const userInfo = this.socketToUser.get(socket.id);
    this.socketToUser.delete(socket.id);
    if (!userInfo) return;

    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue; // default private room

      const result = this.roomState.removeSocket(roomId, socket.id);
      // Only notify the room if the user has no other active socket in it.
      // On a refresh the new socket already replaced the stale entry in
      // handleJoin, so the user is still present under a different socketId.
      if (result && !result.userStillConnected) {
        this.server.to(roomId).emit('room:user-left', { userId: userInfo.userId, roomId });
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

    const user = this.roomState.joinUser({ roomId, userId, userName, socketId: socket.id });
    const state = this.roomState.getOrCreate(roomId);

    socket.emit('room:state', {
      connectedUsers: state.connectedUsers,
      messages: state.messages,
      playback: state.playback
    });

    this.server.to(roomId).emit('room:user-joined', {
      userId,
      userName,
      color: user.color,
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

    this.roomState.removeSocket(roomId, socket.id);
    await socket.leave(roomId);

    this.server.to(roomId).emit('room:user-left', { userId, roomId });
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

  private rejectSocket(socket: Socket, message: string): void {
    socket.emit('room:error', { message });
    socket.disconnect(true);
  }
}
