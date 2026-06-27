import type { Server } from 'socket.io';

import type { PublicProfile } from '@repo/schemas/profile';

export const FRIEND_BROADCAST_PORT = Symbol('FriendBroadcastPort');

export interface FriendBroadcastPort {
  notifyFriendRequest(opts: {
    targetUserId: string;
    requestId: string;
    requester: PublicProfile;
  }): void;

  notifyRequestAccepted(opts: {
    targetUserId: string;
    requestId: string;
    friend: PublicProfile;
  }): void;

  notifyFriendsOnline(opts: {
    userId: string;
    userName: string;
    avatarId: string;
    friendIds: string[];
    currentRoomId?: string;
    currentRoomName?: string;
  }): void;

  notifyFriendsOffline(userId: string, friendIds: string[]): void;

  notifyFriendsJoinedRoom(opts: {
    userId: string;
    roomId: string;
    roomName: string;
    friendIds: string[];
  }): void;

  notifyFriendsLeftRoom(userId: string, friendIds: string[]): void;

  notifyDmReceived(opts: {
    targetUserId: string;
    messageId: string;
    fromUserId: string;
    fromUserName: string;
    content: string;
    createdAt: string;
  }): void;

  bind(server: Server): void;
}
