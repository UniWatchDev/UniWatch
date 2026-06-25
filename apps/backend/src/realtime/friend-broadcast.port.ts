import type { PublicProfile } from '@repo/schemas/profile';

export const FRIEND_BROADCAST_PORT = Symbol('FriendBroadcastPort');

export interface FriendBroadcastPort {
  /**
   * Emit `friend:request-received` to all online sockets of `targetUserId`.
   * No-op if target is offline.
   */
  notifyFriendRequest(opts: {
    targetUserId: string;
    requestId: string;
    requester: PublicProfile;
  }): void;

  /**
   * Emit `friend:request-accepted` to all online sockets of `targetUserId`.
   * No-op if target is offline.
   */
  notifyRequestAccepted(opts: {
    targetUserId: string;
    requestId: string;
    friend: PublicProfile;
  }): void;
}
