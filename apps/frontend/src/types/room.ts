export type { RoomStatus, RoomType, RoomResponse } from '@repo/schemas/rooms';

export type MemberStatus = 'active' | 'away' | 'free';

export interface Member {
  id: string;
  name: string;
  username: string;
  avatarColor: string;
  isHost: boolean;
  status: MemberStatus;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  color: string;
  content: string;
  timestamp: Date;
}
