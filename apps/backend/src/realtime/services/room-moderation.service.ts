import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Types } from 'mongoose';

import type { RoomDocument } from '@/rooms/room.schema';
import { RealtimeBroadcastService } from '@/realtime/services/realtime-broadcast.service';
import { RoomStateService } from '@/realtime/services/room-state.service';
import { creatorRefToId } from '@/realtime/utils/creator-ref';
import { RoomRepository } from '@/rooms/room.repository';

interface ModerateUserOptions {
  actorUserId: string;
  roomId: string;
  targetUserId: string;
  errorMessage: string;
  shouldBan: boolean;
}

/**
 * Handles kick/block moderation: verifies the actor is the room creator, bans
 * when required, and disconnects every live socket the target holds in the room.
 */
@Injectable()
export class RoomModerationService {
  constructor(
    private readonly rooms: RoomRepository,
    private readonly roomState: RoomStateService,
    private readonly broadcast: RealtimeBroadcastService
  ) {}

  async moderate({
    actorUserId,
    roomId,
    targetUserId,
    errorMessage,
    shouldBan
  }: ModerateUserOptions): Promise<void> {
    const room = await this.assertRoomCreator(roomId, actorUserId);
    const creatorId = creatorRefToId(room.creator);
    if (targetUserId === creatorId) {
      throw new WsException('Forbidden');
    }

    const state = this.roomState.get(roomId);
    if (!state) {
      throw new WsException('Room not found');
    }

    const targetSocketIds = this.collectUserSocketIds(roomId, targetUserId);
    if (targetSocketIds.length === 0 && !shouldBan) {
      throw new WsException('User is not in the room');
    }

    if (shouldBan) {
      await this.rooms.banUser(roomId, new Types.ObjectId(targetUserId));
    }

    for (const socketId of targetSocketIds) {
      this.broadcast.disconnectSocket(socketId, errorMessage);
    }

    if (!this.roomState.get(roomId)) {
      this.broadcast.clearCountdown(roomId);
    }
    await this.syncStatus(roomId, creatorId);
  }

  private collectUserSocketIds(roomId: string, targetUserId: string): string[] {
    const state = this.roomState.get(roomId);
    if (!state) return [];

    const socketIds = new Set<string>();
    for (const user of state.connectedUsers) {
      if (user.userId !== targetUserId) continue;
      for (const socketId of user.socketIds) {
        socketIds.add(socketId);
      }
    }
    return [...socketIds];
  }

  private async assertRoomCreator(roomId: string, userId: string): Promise<RoomDocument> {
    const room = await this.rooms.findOneAccessibleById(roomId, userId);
    if (!room || creatorRefToId(room.creator) !== userId) {
      throw new WsException('Forbidden');
    }
    return room;
  }

  private async syncStatus(roomId: string, creatorId: string | null): Promise<void> {
    const status = this.roomState.syncStatus(roomId, creatorId);
    await this.rooms.setStatus(roomId, status);
  }
}
