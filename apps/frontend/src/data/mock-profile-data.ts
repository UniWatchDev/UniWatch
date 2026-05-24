import type {
  Achievement,
  FriendRequest,
  ProfileFriend,
  WatchHistoryItem
} from '@/types/profile';

export const MOCK_PROFILE_BADGE = 'Cinephile';
export const MOCK_MEMBER_SINCE = 'January 2024';

export const MOCK_FRIENDS: ProfileFriend[] = [
  {
    id: 'f1',
    name: 'Alex',
    username: 'alex_w',
    avatarColor: '#38bdf8',
    status: 'active'
  }
];

export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: 'req1',
    name: 'Sam',
    username: 'sam_movies',
    avatarColor: '#a78bfa',
    status: 'active',
    requestedAt: '2024-05-18'
  }
];

export const MOCK_WATCH_HISTORY: WatchHistoryItem[] = [
  {
    id: 'h1',
    title: 'Inception',
    year: 2010,
    genre: 'Sci-Fi',
    watchedAt: '2024-05-10',
    posterGradient: 'linear-gradient(135deg, #1e3a5f, #7c3aed)'
  },
  {
    id: 'h2',
    title: 'The Office',
    year: 2005,
    genre: 'Comedy',
    watchedAt: '2024-04-22',
    posterGradient: 'linear-gradient(135deg, #065f46, #34d399)'
  },
  {
    id: 'h3',
    title: 'Interstellar',
    year: 2014,
    genre: 'Sci-Fi',
    watchedAt: '2024-03-15',
    posterGradient: 'linear-gradient(135deg, #312e81, #818cf8)'
  }
];

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'a1',
    title: 'First Watch',
    description: 'Watched your first movie with friends',
    icon: 'film',
    unlockedAt: '2024-01-15',
    rarity: 'common'
  },
  {
    id: 'a2',
    title: 'Social Butterfly',
    description: 'Made your first friend on Uni-Watch',
    icon: 'users',
    unlockedAt: '2024-02-03',
    rarity: 'common'
  },
  {
    id: 'a3',
    title: 'Night Owl',
    description: 'Joined a room after midnight',
    icon: 'star',
    unlockedAt: '2024-03-20',
    rarity: 'rare'
  },
  {
    id: 'a4',
    title: 'Marathon Master',
    description: 'Watched 3 movies in one week',
    icon: 'trophy',
    unlockedAt: '2024-05-01',
    rarity: 'epic'
  }
];
