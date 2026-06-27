import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

import { REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';
import type { PublicProfile } from '@repo/schemas/profile';

import type { FriendBroadcastPort } from '@/realtime/friend-broadcast.port';
import { GlobalPresenceService } from './global-presence.service';

@Injectable()
export class FriendBroadcastService implements FriendBroadcastPort {
  private readonly logger = new Logger(FriendBroadcastService.name);
  private server: Server | null = null;

  constructor(private readonly presence: GlobalPresenceService) {}

  bind(server: Server): void {
    this.server = server;
  }

  notifyFriendRequest(opts: {
    targetUserId: string;
    requestId: string;
    requester: PublicProfile;
  }): void {
    this.emitToUser(opts.targetUserId, REALTIME_SERVER_EVENTS.friendRequestReceived, {
      requestId: opts.requestId,
      requester: opts.requester
    });
  }

  notifyRequestAccepted(opts: {
    targetUserId: string;
    requestId: string;
    friend: PublicProfile;
  }): void {
    this.emitToUser(opts.targetUserId, REALTIME_SERVER_EVENTS.friendRequestAccepted, {
      requestId: opts.requestId,
      friend: opts.friend
    });
  }

  /** Emit `friend:online` to all online friends of `userId`. */
  notifyFriendsOnline(opts: {
    userId: string;
    userName: string;
    avatarId: string;
    friendIds: string[];
    currentRoomId?: string;
    currentRoomName?: string;
  }): void {
    const payload = {
      userId: opts.userId,
      userName: opts.userName,
      avatarId: opts.avatarId,
      isOnline: true,
      currentRoomId: opts.currentRoomId,
      currentRoomName: opts.currentRoomName
    };
    for (const friendId of opts.friendIds) {
      this.emitToUser(friendId, REALTIME_SERVER_EVENTS.friendOnline, payload);
    }
  }

  /** Emit `friend:offline` to all online friends of `userId`. */
  notifyFriendsOffline(userId: string, friendIds: string[]): void {
    for (const friendId of friendIds) {
      this.emitToUser(friendId, REALTIME_SERVER_EVENTS.friendOffline, { userId });
    }
  }

  /** Emit `friend:joined-room` to all online friends of `userId`. */
  notifyFriendsJoinedRoom(opts: {
    userId: string;
    roomId: string;
    roomName: string;
    friendIds: string[];
  }): void {
    const payload = { userId: opts.userId, roomId: opts.roomId, roomName: opts.roomName };
    for (const friendId of opts.friendIds) {
      this.emitToUser(friendId, REALTIME_SERVER_EVENTS.friendJoinedRoom, payload);
    }
  }

  /** Emit `friend:left-room` to all online friends of `userId`. */
  notifyFriendsLeftRoom(userId: string, friendIds: string[]): void {
    for (const friendId of friendIds) {
      this.emitToUser(friendId, REALTIME_SERVER_EVENTS.friendLeftRoom, { userId });
    }
  }

  /** Emit `dm:received` to the target user's sockets. */
  notifyDmReceived(opts: {
    targetUserId: string;
    messageId: string;
    fromUserId: string;
    fromUserName: string;
    content: string;
    createdAt: string;
  }): void {
    this.emitToUser(opts.targetUserId, REALTIME_SERVER_EVENTS.dmReceived, {
      messageId: opts.messageId,
      fromUserId: opts.fromUserId,
      fromUserName: opts.fromUserName,
      content: opts.content,
      createdAt: opts.createdAt
    });
  }

  private emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`Server not bound — cannot emit ${event} to user ${userId}`);
      return;
    }
    const socketIds = this.presence.getSocketsForUser(userId);
    for (const socketId of socketIds) {
      this.server.to(socketId).emit(event, payload);
    }
  }
}
