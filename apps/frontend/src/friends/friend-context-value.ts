import { createContext } from 'react';

import type { PublicProfile } from '@repo/schemas/profile';
import type { FriendPresence, PendingFriendRequest } from '@repo/schemas/realtime';

export type FriendBanner =
  | { kind: 'request-received'; requestId: string; fromUserName: string; fromAvatarId: string }
  | { kind: 'request-accepted'; friendUserName: string; friendAvatarId: string }
  | { kind: 'friend-online'; friendUserId: string; friendUserName: string; friendAvatarId: string }
  | { kind: 'joined-room'; friendUserName: string; roomName: string; roomId: string }
  | { kind: 'dm'; fromUserId: string; fromUserName: string; content: string };

export type IncomingDm = {
  messageId: string;
  fromUserId: string;
  content: string;
  createdAt: string;
};

export type FriendContextValue = {
  friends: FriendPresence[];
  pendingRequests: PendingFriendRequest[];
  friendUserIds: Set<string>;
  banner: FriendBanner | null;
  dismissBanner: () => void;
  dmOpenForUserId: string | null;
  dmTargetName: string | null;
  openDm: (targetUserId: string, targetName?: string) => void;
  closeDm: () => void;
  sendFriendRequest: (targetUserId: string) => Promise<void>;
  respondToRequest: (requestId: string, action: 'accept' | 'reject') => Promise<void>;
  unfriend: (targetUserId: string) => Promise<void>;
  addFriendLocally: (profile: PublicProfile) => void;
  removeFriendLocally: (targetUserId: string) => void;
};

export const FriendContext = createContext<FriendContextValue | null>(null);
