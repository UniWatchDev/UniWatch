import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_BASE_URL } from '@repo/consts/api';
import type { PlaybackState, CountdownState } from '@repo/schemas/realtime';
import {
  roomModerateUserPayloadSchema,
  realtimeChatMessageSchema,
  roomErrorEventSchema,
  roomMovieUpdatedEventSchema,
  roomMovieUpdatedPayloadSchema,
  roomPlaybackChangedEventSchema,
  roomPlaybackUpdatePayloadSchema,
  roomReadyUpdatePayloadSchema,
  roomStateEventSchema,
  sendMessagePayloadSchema,
  userJoinedEventSchema,
  userLeftEventSchema
} from '@repo/schemas/realtime';
import type { RoomStatus } from '@repo/schemas/rooms';
import type { ChatMessage, Member } from '@/types/room';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseRoomSocketOptions {
  roomId: string;
  disabled: boolean;
  creatorId: string;
  creatorName: string | undefined;
  initialMemberIds: string[];
  onMovieUpdated?: (movieId: string) => void;
  onPlaybackChanged?: (event: PlaybackChangeEvent) => void;
}

interface UseRoomSocketReturn {
  messages: ChatMessage[];
  members: Member[];
  socketStatus: SocketStatus;
  roomState: {
    status: RoomStatus;
    countdown: CountdownState;
    playback: PlaybackState;
    connectedUsers: Member[];
  };
  sendMessage: (content: string) => void;
  sendReadyUpdate: (isReady: boolean) => void;
  sendMovieUpdated: (movieId: string) => void;
  sendPlaybackUpdate: (playback: PlaybackUpdateInput) => void;
  sendKickUser: (targetUserId: string) => void;
  sendBlockUser: (targetUserId: string) => void;
}

interface PlaybackChangeEvent {
  actorUserId: string | null;
  playback: PlaybackState;
}

interface PlaybackUpdateInput {
  movieId: string;
  isPlaying: boolean;
  positionSec: number;
  playbackRate: number;
  force?: boolean;
}

const FALLBACK_AVATAR_PALETTE = ['#f97316', '#38bdf8', '#a78bfa', '#4ade80', '#fb923c', '#f472b6'];

function colorFromId(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return FALLBACK_AVATAR_PALETTE[hash % FALLBACK_AVATAR_PALETTE.length] ?? '#64748b';
}

function memberFromId(id: string, isHost: boolean, displayName?: string, color?: string): Member {
  const label = displayName ?? `user-${id.slice(-5)}`;
  return {
    id,
    name: label,
    username: label,
    avatarColor: color ?? colorFromId(id),
    isHost,
    isReady: false,
    isFriend: false,
    status: 'active'
  };
}

function buildInitialMembers(
  creatorId: string,
  creatorName: string | undefined,
  memberIds: string[]
): Member[] {
  const creator = memberFromId(creatorId, true, creatorName);
  const others = memberIds.filter((id) => id !== creatorId).map((id) => memberFromId(id, false));
  return [creator, ...others];
}

export function useRoomSocket({
  roomId,
  disabled,
  creatorId,
  creatorName,
  initialMemberIds,
  onMovieUpdated,
  onPlaybackChanged
}: UseRoomSocketOptions): UseRoomSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Member[]>(() =>
    buildInitialMembers(creatorId, creatorName, initialMemberIds)
  );
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
  const [roomState, setRoomState] = useState<UseRoomSocketReturn['roomState']>(() => ({
    status: 'waiting',
    countdown: { active: false, endsAt: null },
    playback: {
      movieId: null,
      isPlaying: false,
      positionSec: 0,
      playbackRate: 1,
      updatedAt: new Date().toISOString()
    },
    connectedUsers: []
  }));
  const socketRef = useRef<Socket | null>(null);

  const sendMessage = useCallback(
    (content: string) => {
      const payload = sendMessagePayloadSchema.parse({ roomId, content });
      socketRef.current?.emit('room:message', payload);
    },
    [roomId]
  );

  const sendReadyUpdate = useCallback(
    (isReady: boolean) => {
      const payload = roomReadyUpdatePayloadSchema.parse({ roomId, isReady });
      socketRef.current?.emit('room:ready-update', payload);
    },
    [roomId]
  );

  const sendMovieUpdated = useCallback(
    (movieId: string) => {
      const payload = roomMovieUpdatedPayloadSchema.parse({ roomId, movieId });
      socketRef.current?.emit('room:movie-updated', payload);
    },
    [roomId]
  );

  const sendPlaybackUpdate = useCallback(
    (playback: PlaybackUpdateInput) => {
      const payload = roomPlaybackUpdatePayloadSchema.parse({ roomId, ...playback });
      socketRef.current?.emit('room:playback-update', payload);
    },
    [roomId]
  );

  const sendKickUser = useCallback(
    (targetUserId: string) => {
      const payload = roomModerateUserPayloadSchema.parse({ roomId, targetUserId });
      socketRef.current?.emit('room:kick-user', payload);
    },
    [roomId]
  );

  const sendBlockUser = useCallback(
    (targetUserId: string) => {
      const payload = roomModerateUserPayloadSchema.parse({ roomId, targetUserId });
      socketRef.current?.emit('room:block-user', payload);
    },
    [roomId]
  );

  const pushPlaybackChange = useCallback(
    (event: PlaybackChangeEvent) => {
      onPlaybackChanged?.(event);
    },
    [onPlaybackChanged]
  );

  useEffect(() => {
    if (disabled || !roomId) return;

    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketStatus('connecting');
      // Do not emit room:join here — wait for connection:ack.
      // The gateway's handleConnection is async (JWT verify + DB lookup).
      // Socket.IO acknowledges the TCP connection before that promise resolves,
      // so emitting room:join on 'connect' races against handleConnection and
      // causes handleJoin to find an empty socketToUser map → "Unauthorized".
    });

    socket.on('connection:ack', () => {
      socket.emit('room:join', { roomId });
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socket.on('room:state', (data: unknown) => {
      const parsed = roomStateEventSchema.safeParse(data);
      if (!parsed.success) {
        setSocketStatus('error');
        console.error('[room:socket]', 'Invalid room:state payload');
        return;
      }

      setRoomState({
        status: parsed.data.status,
        countdown: parsed.data.countdown,
        playback: parsed.data.playback,
        connectedUsers: parsed.data.connectedUsers.map((u) => ({
          ...memberFromId(u.userId, u.userId === creatorId, u.userName, u.color),
          isReady: u.isReady
        }))
      });
      setMembers(
        parsed.data.connectedUsers.map((u) =>
          ({
            ...memberFromId(u.userId, u.userId === creatorId, u.userName, u.color),
            isReady: u.isReady
          })
        )
      );
      setMessages(
        parsed.data.messages.map((m) => ({
          id: m.id,
          userId: m.userId,
          userName: m.userName,
          color: m.color,
          content: m.content,
          timestamp: new Date(m.timestamp)
        }))
      );
      setSocketStatus('connected');
    });

    socket.on('room:message-received', (data: unknown) => {
      const parsed = roomMessageSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:message-received payload');
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: parsed.data.id,
          userId: parsed.data.userId,
          userName: parsed.data.userName,
          color: parsed.data.color,
          content: parsed.data.content,
          timestamp: new Date(parsed.data.timestamp)
        }
      ]);
    });

    socket.on('room:user-joined', (data: unknown) => {
      const parsed = roomUserJoinedSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:user-joined payload');
        return;
      }

      setMembers((prev) => {
        if (prev.some((m) => m.id === parsed.data.userId)) return prev;
        return [
          ...prev,
          {
            ...memberFromId(
              parsed.data.userId,
              parsed.data.userId === creatorId,
              parsed.data.userName,
              parsed.data.color
            ),
            isReady: parsed.data.isReady
          }
        ];
      });
    });

    socket.on('room:user-left', (data: unknown) => {
      const parsed = roomUserLeftSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:user-left payload');
        return;
      }

      setMembers((prev) => prev.filter((m) => m.id !== parsed.data.userId));
    });

    socket.on('room:error', (data: unknown) => {
      const parsed = roomErrorEventSchema.safeParse(data);
      if (!parsed.success) {
        setSocketStatus('error');
        console.error('[room:socket]', 'Invalid room:error payload');
        return;
      }

      setSocketStatus('error');
      console.error('[room:socket]', parsed.data.message);
    });

    socket.on('room:movie-updated', (data: unknown) => {
      const parsed = roomMovieUpdatedEventSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:movie-updated payload');
        return;
      }

      onMovieUpdated?.(parsed.data.movieId);
    });

    socket.on('room:playback-changed', (data: unknown) => {
      const parsed = roomPlaybackChangedEventSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:playback-changed payload');
        return;
      }

      setRoomState((prev) => ({
        ...prev,
        playback: parsed.data.playback
      }));
      pushPlaybackChange({ actorUserId: parsed.data.actorUserId, playback: parsed.data.playback });
    });

    return () => {
      socket.emit('room:leave', { roomId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, disabled, creatorId, onMovieUpdated, pushPlaybackChange]);

  return {
    messages,
    members,
    socketStatus,
    roomState,
    sendMessage,
    sendReadyUpdate,
    sendMovieUpdated,
    sendPlaybackUpdate,
    sendKickUser,
    sendBlockUser
  };
}

const roomMessageSchema = realtimeChatMessageSchema;
const roomUserJoinedSchema = userJoinedEventSchema;
const roomUserLeftSchema = userLeftEventSchema;
