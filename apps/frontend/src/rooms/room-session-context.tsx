import { createContext, useContext } from 'react';

import type { CountdownState, PlaybackState } from '@repo/schemas/realtime';
import type { RoomResponse, RoomStatus } from '@repo/schemas/rooms';

import type { PlaybackChangeEvent, SocketStatus } from '@/hooks/use-room-socket';
import type { ChatMessage, Member } from '@/types/room';

export type RoomSessionContextValue = {
  messages: ChatMessage[];
  members: Member[];
  socketStatus: SocketStatus;
  roomError: string | null;
  roomState: {
    status: RoomStatus;
    countdown: CountdownState;
    playback: PlaybackState;
    connectedUsers: Member[];
  };
  sendMessage: (content: string) => void;
  sendReadyUpdate: (isReady: boolean) => void;
  sendMovieUpdated: (movieId: string) => void;
  sendPlaybackUpdate: (playback: {
    movieId: string;
    isPlaying: boolean;
    positionSec: number;
    playbackRate: number;
    force?: boolean;
    ended?: boolean;
  }) => void;
  sendKickUser: (targetUserId: string) => void;
  sendBlockUser: (targetUserId: string) => void;
  playbackEpoch: number;
  connectionGeneration: number;
  roomId: string;
  syncSessionRoom: (room: RoomResponse | null) => void;
  registerMovieUpdatedHandler: (
    handler: ((movieId: string, movieName?: string) => void) | null
  ) => void;
  registerPlaybackChangedHandler: (
    handler: ((event: PlaybackChangeEvent) => void) | null
  ) => void;
};

export const RoomSessionContext = createContext<RoomSessionContextValue | null>(null);

export function useRoomSession(): RoomSessionContextValue {
  const value = useContext(RoomSessionContext);
  if (value === null) {
    throw new Error('useRoomSession must be used within RoomSessionLayout');
  }
  return value;
}
