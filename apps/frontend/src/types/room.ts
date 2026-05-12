export type RoomStatus = 'watching' | 'preparing' | 'ready';

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
  content: string;
  timestamp: Date;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  movieName: string;
  movieDescription?: string;
  genre?: string;
  rating?: number;
  status: RoomStatus;
  isPrivate: boolean;
  viewerCount: number;
  host: string;
  members: Member[];
}
