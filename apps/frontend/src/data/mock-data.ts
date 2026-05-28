import type { Member, ChatMessage, RoomResponse } from '@/types/room';

export const MOCK_CHAT: ChatMessage[] = [
  { id: 'c1', userId: 'm2', userName: 'Alex', content: 'omg this scene 🤯', timestamp: new Date(Date.now() - 5 * 60000) },
  { id: 'c2', userId: 'm3', userName: 'Sam', content: "I knew it!! called it from min 10", timestamp: new Date(Date.now() - 4 * 60000) },
  { id: 'c3', userId: 'm1', userName: 'moriel', content: 'no way wait what 😱', timestamp: new Date(Date.now() - 3 * 60000) },
  { id: 'c4', userId: 'm2', userName: 'Alex', content: 'pause pause PAUSE', timestamp: new Date(Date.now() - 2 * 60000) },
  { id: 'c5', userId: 'm1', userName: 'moriel', content: 'ok paused, what did you see?', timestamp: new Date(Date.now() - 90000) },
  { id: 'c6', userId: 'm3', userName: 'Sam', content: 'look at the background in the previous frame', timestamp: new Date(Date.now() - 60000) },
];

export const MOCK_MEMBERS: Member[] = [
  { id: 'm1', name: 'moriel', username: 'moriel', avatarColor: '#f97316', isHost: true, status: 'active' },
  { id: 'm2', name: 'Alex', username: 'alex_w', avatarColor: '#38bdf8', isHost: false, status: 'active' },
  { id: 'm3', name: 'Sam', username: 'sam_movies', avatarColor: '#a78bfa', isHost: false, status: 'away' },
];

export const MOCK_ROOMS: RoomResponse[] = [
  {
    id: 'r1',
    name: 'Inception Night',
    room_type: 'public',
    movie: 'm1',
    creator: 'u1',
    allowed_users: ['u1', 'u2', 'u3'],
    deactivate_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    status: 'watching',
    movie_name: 'Inception',
    description: 'Watching the dream heist classic together',
    creator_name: 'moriel',
    member_count: 8,
  },
  {
    id: 'r2',
    name: 'Dune Watch Party',
    room_type: 'public',
    movie: 'm2',
    creator: 'u2',
    allowed_users: ['u2', 'u4'],
    deactivate_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60000).toISOString(),
    status: 'preparing',
    movie_name: 'Dune: Part Two',
    description: 'Getting ready to enter Arrakis',
    creator_name: 'alex_w',
    member_count: 3,
  },
  {
    id: 'r3',
    name: 'Private Screening',
    room_type: 'private',
    movie: 'm3',
    creator: 'u3',
    password: 'secret',
    allowed_users: ['u3', 'u5'],
    deactivate_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60000).toISOString(),
    status: 'ready',
    movie_name: 'Interstellar',
    description: 'Invite-only space odyssey',
    creator_name: 'sam_movies',
    member_count: 2,
  },
];
