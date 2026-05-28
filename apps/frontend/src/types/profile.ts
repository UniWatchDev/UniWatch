export type ProfileTab = 'friends' | 'history' | 'achievements';

export type FriendStatus = 'active' | 'away' | 'offline';

export interface ProfilePerson {
  id: string;
  name: string;
  username: string;
  avatarColor: string;
  status: FriendStatus;
}

export interface ProfileFriend extends ProfilePerson {
  status: FriendStatus;
}

export interface FriendRequest extends ProfilePerson {
  requestedAt: string;
}

export interface WatchHistoryItem {
  id: string;
  title: string;
  year: number;
  genre: string;
  watchedAt: string;
  posterGradient: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: 'film' | 'users' | 'star' | 'trophy';
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic';
}

export interface ProfileIdentity {
  displayName: string;
  handle: string;
  initials: string;
  avatarColor: string;
  avatarId: string;
  email: string;
  memberSince: string;
  badge: string;
}
