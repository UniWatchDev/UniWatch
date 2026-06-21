import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_BASE_URL } from '@repo/consts/api';
import { REALTIME_CLIENT_EVENTS, REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';
import type { PlaybackState, CountdownState } from '@repo/schemas/realtime';
import {
  joinRoomPayloadSchema,
  leaveRoomPayloadSchema,
  roomModerateUserPayloadSchema,
  realtimeChatMessageSchema,
  roomClosedEventSchema,
  roomErrorEventSchema,
  roomMovieUpdatedEventSchema,
  roomMovieUpdatedPayloadSchema,
  roomPlaybackChangedEventSchema,
  roomPlaybackUpdatePayloadSchema,
  roomPresenceChangedEventSchema,
  roomReadyUpdatePayloadSchema,
  roomStateEventSchema,
  sendMessagePayloadSchema,
  userJoinedEventSchema,
  userLeftEventSchema
} from '@repo/schemas/realtime';
import type { RoomStatus } from '@repo/schemas/rooms';
import { shouldUnfreezePlaybackFromRoomState } from '@repo/schemas/realtime/playback-sync';
import type { ChatMessage, Member } from '@/types/room';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface PlaybackChangeEvent {
  actorUserId: string | null;
  playback: PlaybackState;
}

interface UseRoomSocketOptions {
  roomId: string;
  disabled: boolean;
  creatorId: string;
  creatorName: string | undefined;
  initialMemberIds: string[];
  onMovieUpdated?: (movieId: string, movieName?: string) => void;
  onPlaybackChanged?: (event: PlaybackChangeEvent) => void;
  onRoomClosed?: (message: string) => void;
}

interface UseRoomSocketReturn {
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
  sendPlaybackUpdate: (playback: PlaybackUpdateInput) => void;
  sendKickUser: (targetUserId: string) => void;
  sendBlockUser: (targetUserId: string) => void;
  playbackEpoch: number;
  connectionGeneration: number;
}

interface PlaybackUpdateInput {
  movieId: string;
  isPlaying: boolean;
  positionSec: number;
  playbackRate: number;
  force?: boolean;
  ended?: boolean;
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
  onPlaybackChanged,
  onRoomClosed
}: UseRoomSocketOptions): UseRoomSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Member[]>(() =>
    buildInitialMembers(creatorId, creatorName, initialMemberIds)
  );
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [playbackEpoch, setPlaybackEpoch] = useState(0);
  const [connectionGeneration, setConnectionGeneration] = useState(0);
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
  const onRoomClosedRef = useRef(onRoomClosed);

  useEffect(() => {
    onRoomClosedRef.current = onRoomClosed;
  }, [onRoomClosed]);

  const sendMessage = useCallback(
    (content: string) => {
      const payload = sendMessagePayloadSchema.parse({ roomId, content });
      socketRef.current?.emit(REALTIME_CLIENT_EVENTS.message, payload);
    },
    [roomId]
  );

  const sendReadyUpdate = useCallback(
    (isReady: boolean) => {
      const payload = roomReadyUpdatePayloadSchema.parse({ roomId, isReady });
      socketRef.current?.emit(REALTIME_CLIENT_EVENTS.readyUpdate, payload);
    },
    [roomId]
  );

  const sendMovieUpdated = useCallback(
    (movieId: string) => {
      const payload = roomMovieUpdatedPayloadSchema.parse({ roomId, movieId });
      socketRef.current?.emit(REALTIME_CLIENT_EVENTS.movieUpdated, payload);
    },
    [roomId]
  );

  const sendPlaybackUpdate = useCallback(
    (playback: PlaybackUpdateInput) => {
      const payload = roomPlaybackUpdatePayloadSchema.parse({ roomId, ...playback });
      socketRef.current?.emit(REALTIME_CLIENT_EVENTS.playbackUpdate, payload);
    },
    [roomId]
  );

  const sendKickUser = useCallback(
    (targetUserId: string) => {
      const payload = roomModerateUserPayloadSchema.parse({ roomId, targetUserId });
      socketRef.current?.emit(REALTIME_CLIENT_EVENTS.kickUser, payload);
    },
    [roomId]
  );

  const sendBlockUser = useCallback(
    (targetUserId: string) => {
      const payload = roomModerateUserPayloadSchema.parse({ roomId, targetUserId });
      socketRef.current?.emit(REALTIME_CLIENT_EVENTS.blockUser, payload);
    },
    [roomId]
  );

  const pushPlaybackChange = useCallback(
    (event: PlaybackChangeEvent) => {
      onPlaybackChanged?.(event);
    },
    [onPlaybackChanged]
  );

  const bumpPlaybackEpoch = useCallback(() => {
    setPlaybackEpoch((epoch) => epoch + 1);
  }, []);

  useEffect(() => {
    if (disabled || !roomId) return;

    // Only seed playback from the first room:state per connection; later room:state
    // events carry presence/countdown updates without touching playback unless the
    // server signals a meaningful playback change (countdown end, isPlaying flip, drift).
    let hasInitialSnapshot = false;
    let roomClosed = false;

    const mapConnectedUsers = (
      users: Array<{ userId: string; userName: string; color: string; isReady: boolean }>
    ): Member[] =>
      users.map((u) => ({
        ...memberFromId(u.userId, u.userId === creatorId, u.userName, u.color),
        isReady: u.isReady
      }));

    const applyPresence = (payload: {
      status: RoomStatus;
      connectedUsers: Array<{ userId: string; userName: string; color: string; isReady: boolean }>;
      countdown: CountdownState;
    }): void => {
      setRoomState((prev) => ({
        ...prev,
        status: payload.status,
        countdown: payload.countdown,
        connectedUsers: mapConnectedUsers(payload.connectedUsers)
      }));
      setMembers(mapConnectedUsers(payload.connectedUsers));
    };

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
      // causes handleJoin to find an empty registry → "Unauthorized".
    });

    socket.on('connect_error', () => {
      setSocketStatus('error');
    });

    // Fires on the first connection AND on every Socket.IO reconnect, since the
    // gateway re-runs handleConnection per connection. Re-emitting room:join here
    // is what restores room membership after a dropped socket reconnects.
    socket.on(REALTIME_SERVER_EVENTS.connectionAck, () => {
      if (roomClosed) {
        return;
      }
      setConnectionGeneration((gen) => gen + 1);
      socket.emit(REALTIME_CLIENT_EVENTS.join, joinRoomPayloadSchema.parse({ roomId }));
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socket.on(REALTIME_SERVER_EVENTS.roomState, (data: unknown) => {
      const parsed = roomStateEventSchema.safeParse(data);
      if (!parsed.success) {
        setSocketStatus('error');
        console.error('[room:socket]', 'Invalid room:state payload');
        return;
      }

      setRoomError(null);
      const bumpAfterStateRef = { current: false };
      setRoomState((prev) => {
        const nextPlayback = hasInitialSnapshot
          ? shouldUnfreezePlaybackFromRoomState(
              prev.playback,
              parsed.data.playback,
              prev.countdown.active,
              parsed.data.countdown.active
            )
            ? parsed.data.playback
            : prev.playback
          : parsed.data.playback;
        if (hasInitialSnapshot && nextPlayback !== prev.playback) {
          bumpAfterStateRef.current = true;
        }
        return {
          status: parsed.data.status,
          countdown: parsed.data.countdown,
          playback: nextPlayback,
          connectedUsers: mapConnectedUsers(parsed.data.connectedUsers)
        };
      });
      if (bumpAfterStateRef.current) {
        bumpPlaybackEpoch();
      }
      hasInitialSnapshot = true;
      setMembers(mapConnectedUsers(parsed.data.connectedUsers));
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

    socket.on(REALTIME_SERVER_EVENTS.presenceChanged, (data: unknown) => {
      const parsed = roomPresenceChangedEventSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:presence-changed payload');
        return;
      }

      applyPresence(parsed.data);
    });

    socket.on(REALTIME_SERVER_EVENTS.messageReceived, (data: unknown) => {
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

    socket.on(REALTIME_SERVER_EVENTS.userJoined, (data: unknown) => {
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

    socket.on(REALTIME_SERVER_EVENTS.userLeft, (data: unknown) => {
      const parsed = roomUserLeftSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:user-left payload');
        return;
      }

      setMembers((prev) => prev.filter((m) => m.id !== parsed.data.userId));
    });

    socket.on(REALTIME_SERVER_EVENTS.error, (data: unknown) => {
      const parsed = roomErrorEventSchema.safeParse(data);
      if (!parsed.success) {
        setRoomError('Realtime error');
        console.error('[room:socket]', 'Invalid room:error payload');
        return;
      }

      setRoomError(parsed.data.message);
      console.error('[room:socket]', parsed.data.message);
    });

    socket.on(REALTIME_SERVER_EVENTS.movieUpdated, (data: unknown) => {
      const parsed = roomMovieUpdatedEventSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:movie-updated payload');
        return;
      }

      onMovieUpdated?.(parsed.data.movieId, parsed.data.movieName);
    });

    socket.on(REALTIME_SERVER_EVENTS.playbackChanged, (data: unknown) => {
      const parsed = roomPlaybackChangedEventSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:playback-changed payload');
        return;
      }

      const countdownComplete =
        parsed.data.actorUserId === null && parsed.data.playback.isPlaying;
      setRoomState((prev) => ({
        ...prev,
        playback: parsed.data.playback,
        countdown: countdownComplete ? { active: false, endsAt: null } : prev.countdown
      }));
      bumpPlaybackEpoch();
      pushPlaybackChange({ actorUserId: parsed.data.actorUserId, playback: parsed.data.playback });
    });

    socket.on(REALTIME_SERVER_EVENTS.roomClosed, (data: unknown) => {
      const parsed = roomClosedEventSchema.safeParse(data);
      if (!parsed.success) {
        console.error('[room:socket]', 'Invalid room:closed payload');
        return;
      }
      if (parsed.data.roomId !== roomId) {
        return;
      }

      roomClosed = true;
      socket.disconnect();
      onRoomClosedRef.current?.(parsed.data.message);
    });

    return () => {
      if (!roomClosed) {
        socket.emit(REALTIME_CLIENT_EVENTS.leave, leaveRoomPayloadSchema.parse({ roomId }));
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, disabled, creatorId, onMovieUpdated, pushPlaybackChange, bumpPlaybackEpoch]);

  return {
    messages,
    members,
    socketStatus,
    roomError,
    roomState,
    sendMessage,
    sendReadyUpdate,
    sendMovieUpdated,
    sendPlaybackUpdate,
    sendKickUser,
    sendBlockUser,
    playbackEpoch,
    connectionGeneration
  };
}

const roomMessageSchema = realtimeChatMessageSchema;
const roomUserJoinedSchema = userJoinedEventSchema;
const roomUserLeftSchema = userLeftEventSchema;
