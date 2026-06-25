import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import type { SendDmPayload } from '@repo/schemas/dm';
import {
  friendPresenceSchema,
  pendingFriendRequestSchema,
  type ConnectionAckPayload,
  type FriendRemovePayload,
  type FriendRequestRespondPayload,
  type FriendRequestSendPayload
} from '@repo/schemas/realtime';

import { DirectMessagesService } from '@/direct-messages/direct-messages.service';
import { FriendsService } from '@/friends/friends.service';

import { FriendBroadcastService } from '../services/friend-broadcast.service';
import { GlobalPresenceService } from '../services/global-presence.service';

@Injectable()
export class FriendGatewayHandler {
  constructor(
    private readonly friends: FriendsService,
    private readonly dm: DirectMessagesService,
    private readonly presence: GlobalPresenceService,
    private readonly friendBroadcast: FriendBroadcastService
  ) {}

  async handleFriendRequestSend(
    _socket: Socket,
    userId: string,
    payload: FriendRequestSendPayload
  ): Promise<void> {
    try {
      await this.friends.sendRequest(userId, payload.targetUserId);
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }

  async handleFriendRequestRespond(
    _socket: Socket,
    userId: string,
    payload: FriendRequestRespondPayload
  ): Promise<void> {
    try {
      await this.friends.respondToRequest({
        actorUserId: userId,
        requestId: payload.requestId,
        action: payload.action
      });
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }

  async handleFriendRemove(
    _socket: Socket,
    userId: string,
    payload: FriendRemovePayload
  ): Promise<void> {
    try {
      await this.friends.unfriend(userId, payload.targetUserId);
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }

  async handleDmSend(
    _socket: Socket,
    userId: string,
    payload: SendDmPayload
  ): Promise<void> {
    try {
      const message = await this.dm.send(userId, payload.targetUserId, payload.content);
      this.friendBroadcast.notifyDmReceived({
        targetUserId: payload.targetUserId,
        messageId: message.messageId,
        fromUserId: message.fromUserId,
        content: message.content,
        createdAt: message.createdAt
      });
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }

  async buildConnectionAckPayload(userId: string): Promise<ConnectionAckPayload> {
    const [friendList, pendingRequests] = await Promise.all([
      this.friends.getFriendList(userId),
      this.friends.getPendingInbox(userId)
    ]);

    const friends = friendList.map((f) =>
      friendPresenceSchema.parse({
        userId: f.userId,
        userName: f.userName,
        avatarId: f.avatarId,
        ...this.presence.getUserPresence(f.userId)
      })
    );

    const pending = pendingRequests.map((r) =>
      pendingFriendRequestSchema.parse({
        requestId: r.requestId,
        fromUserId: r.from.userId,
        fromUserName: r.from.userName,
        fromAvatarId: r.from.avatarId,
        createdAt: r.createdAt
      })
    );

    return { friends, pendingRequests: pending };
  }

  /** Called after a user joins a room — notifies their online friends. */
  async notifyFriendsJoinedRoom(opts: {
    userId: string;
    userName: string;
    avatarId: string;
    roomId: string;
    roomName: string;
  }): Promise<void> {
    const friendList = await this.friends.getFriendList(opts.userId);
    const friendIds = friendList.map((f) => f.userId);
    this.presence.setCurrentRoom(opts.userId, opts.roomId, opts.roomName);
    this.friendBroadcast.notifyFriendsJoinedRoom({
      userId: opts.userId,
      roomId: opts.roomId,
      roomName: opts.roomName,
      friendIds
    });
  }

  /** Called after a user fully leaves a room. */
  async notifyFriendsLeftRoom(userId: string): Promise<void> {
    const friendList = await this.friends.getFriendList(userId);
    const friendIds = friendList.map((f) => f.userId);
    this.presence.clearCurrentRoom(userId);
    this.friendBroadcast.notifyFriendsLeftRoom(userId, friendIds);
  }

  /** Called on socket connect — registers presence and notifies friends. */
  async onConnect(opts: {
    userId: string;
    userName: string;
    avatarId: string;
    socketId: string;
  }): Promise<void> {
    this.presence.registerSocket(opts.userId, opts.socketId);
    const friendList = await this.friends.getFriendList(opts.userId);
    const friendIds = friendList.map((f) => f.userId);
    this.friendBroadcast.notifyFriendsOnline({
      userId: opts.userId,
      userName: opts.userName,
      avatarId: opts.avatarId,
      friendIds
    });
  }

  /** Called on socket disconnect — deregisters presence and notifies friends if fully offline. */
  async onDisconnect(userId: string, socketId: string): Promise<void> {
    const fullyOffline = this.presence.removeSocket(userId, socketId);
    if (!fullyOffline) return;
    const friendList = await this.friends.getFriendList(userId);
    const friendIds = friendList.map((f) => f.userId);
    this.friendBroadcast.notifyFriendsOffline(userId, friendIds);
  }
}
