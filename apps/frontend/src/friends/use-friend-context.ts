import { useContext } from 'react';

import { FriendContext } from '@/friends/friend-context-value';
import type { FriendContextValue } from '@/friends/friend-context-value';

export type { FriendBanner, IncomingDm, FriendContextValue } from '@/friends/friend-context-value';

export function useFriendContext(): FriendContextValue {
  const ctx = useContext(FriendContext);
  if (ctx === null) throw new Error('useFriendContext must be used within FriendProvider');
  return ctx;
}
