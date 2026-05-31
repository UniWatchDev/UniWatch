import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_BASE_URL } from '@repo/consts/api';
import type {
  RealtimeChatMessage,
  RoomErrorEvent,
  UserJoinedEvent,
  UserLeftEvent
} from '@repo/schemas/realtime';
import type { ChatMessage, Member } from '@/types/room';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseRoomSocketOptions {
  roomId: string;
  disabled: boolean;
  currentUserId: string | null;
  creatorId: string;
  creatorName: string | undefined;
  initialMemberIds: string[];
}

interface UseRoomSocketReturn {
  messages: ChatMessage[];
  members: Member[];
  socketStatus: SocketStatus;
  sendMessage: (content: string) => void;
}

const AVATAR_PALETTE = ['#f97316', '#38bdf8', '#a78bfa', '#4ade80', '#fb923c', '#f472b6'];

function colorFromId(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length] ?? '#64748b';
}

function memberFromId(id: string, isHost: boolean, displayName?: string): Member {
  const label = displayName ?? `user-${id.slice(-5)}`;
  return {
    id,
    name: label,
    username: label,
    avatarColor: colorFromId(id),
    isHost,
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
  currentUserId,
  creatorId,
  creatorName,
  initialMemberIds
}: UseRoomSocketOptions): UseRoomSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Member[]>(() =>
    buildInitialMembers(creatorId, creatorName, initialMemberIds)
  );
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
  const socketRef = useRef<Socket | null>(null);

  const sendMessage = useCallback(
    (content: string) => {
      socketRef.current?.emit('room:message', { roomId, content });
    },
    [roomId]
  );

  useEffect(() => {
    if (disabled || !roomId) return;

    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketStatus('connected');
      socket.emit('room:join', { roomId });
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socket.on('room:message-received', (data: RealtimeChatMessage) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          userId: data.userId,
          userName: data.userId === currentUserId ? 'You' : `user-${data.userId.slice(-5)}`,
          content: data.content,
          timestamp: new Date(data.timestamp)
        }
      ]);
    });

    socket.on('room:user-joined', (data: UserJoinedEvent) => {
      setMembers((prev) => {
        if (prev.some((m) => m.id === data.userId)) return prev;
        return [...prev, memberFromId(data.userId, false)];
      });
    });

    socket.on('room:user-left', (data: UserLeftEvent) => {
      setMembers((prev) => prev.filter((m) => m.id !== data.userId));
    });

    socket.on('room:error', (data: RoomErrorEvent) => {
      setSocketStatus('error');
      console.error('[room:socket]', data.message);
    });

    return () => {
      socket.emit('room:leave', { roomId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, disabled, currentUserId]);

  return { messages, members, socketStatus, sendMessage };
}
