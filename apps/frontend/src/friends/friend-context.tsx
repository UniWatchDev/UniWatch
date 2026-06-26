import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_BASE_URL } from '@repo/consts/api';
import { REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';
import type { PublicProfile } from '@repo/schemas/profile';
import {
  connectionAckPayloadSchema,
  type FriendPresence,
  type PendingFriendRequest
} from '@repo/schemas/realtime';

import { useCookieAuth } from '@/auth/use-cookie-auth';
import {
  apiRespondFriendRequest,
  apiSendFriendRequest,
  apiUnfriend
} from '@/friends/friend-api';
import type { FriendBanner } from '@/friends/friend-context-value';
import { FriendContext } from '@/friends/friend-context-value';

export function FriendProvider({ children }: { children: React.ReactNode }) {
  const { sessionUser } = useCookieAuth();
  const socketRef = useRef<Socket | null>(null);
  const bannerQueue = useRef<FriendBanner[]>([]);

  const [friends, setFriends] = useState<FriendPresence[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [banner, setBanner] = useState<FriendBanner | null>(null);
  const [dmOpenForUserId, setDmOpenForUserId] = useState<string | null>(null);

  const friendUserIds: Set<string> = new Set(friends.map((f) => f.userId));

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNextBanner = useCallback(() => {
    const next = bannerQueue.current.shift();
    if (next === undefined) return;
    setBanner(next);
    timerRef.current = setTimeout(() => {
      setBanner(null);
      showNextBanner();
    }, 6000);
  }, []);

  const enqueueBanner = useCallback(
    (b: FriendBanner) => {
      if (document.fullscreenElement !== null) return;
      bannerQueue.current.push(b);
      if (banner === null) showNextBanner();
    },
    [banner, showNextBanner]
  );

  const dismissBanner = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setBanner(null);
    showNextBanner();
  }, [showNextBanner]);

  useEffect(() => {
    if (sessionUser === null) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    setFriends([]);
    setPendingRequests([]);

    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on(REALTIME_SERVER_EVENTS.connectionAck, (raw: unknown) => {
      try {
        const payload = connectionAckPayloadSchema.parse(raw);
        setFriends(payload.friends);
        setPendingRequests(payload.pendingRequests);
      } catch {
        // ignore malformed ack
      }
    });

    socket.on(REALTIME_SERVER_EVENTS.friendOnline, (raw: unknown) => {
      const p = raw as {
        userId: string;
        userName: string;
        avatarId: string;
        isOnline: boolean;
        currentRoomId?: string;
        currentRoomName?: string;
      };
      setFriends((prev) => {
        const idx = prev.findIndex((f) => f.userId === p.userId);
        const updated: FriendPresence = {
          userId: p.userId,
          userName: p.userName,
          avatarId: p.avatarId,
          isOnline: true,
          currentRoomId: p.currentRoomId,
          currentRoomName: p.currentRoomName
        };
        if (idx === -1) return [...prev, updated];
        return prev.map((f, i) => (i === idx ? updated : f));
      });
    });

    socket.on(REALTIME_SERVER_EVENTS.friendOffline, (raw: unknown) => {
      const { userId } = raw as { userId: string };
      setFriends((prev) =>
        prev.map((f) =>
          f.userId === userId
            ? { ...f, isOnline: false, currentRoomId: undefined, currentRoomName: undefined }
            : f
        )
      );
    });

    socket.on(REALTIME_SERVER_EVENTS.friendJoinedRoom, (raw: unknown) => {
      const { userId, roomId, roomName } = raw as {
        userId: string;
        roomId: string;
        roomName: string;
      };
      setFriends((prev) =>
        prev.map((f) =>
          f.userId === userId ? { ...f, currentRoomId: roomId, currentRoomName: roomName } : f
        )
      );
      setFriends((prev) => {
        const friend = prev.find((f) => f.userId === userId);
        if (friend !== undefined) {
          enqueueBanner({
            kind: 'joined-room',
            friendUserName: friend.userName,
            roomName,
            roomId
          });
        }
        return prev;
      });
    });

    socket.on(REALTIME_SERVER_EVENTS.friendLeftRoom, (raw: unknown) => {
      const { userId } = raw as { userId: string };
      setFriends((prev) =>
        prev.map((f) =>
          f.userId === userId ? { ...f, currentRoomId: undefined, currentRoomName: undefined } : f
        )
      );
    });

    socket.on(REALTIME_SERVER_EVENTS.friendRequestReceived, (raw: unknown) => {
      const { requestId, requester } = raw as {
        requestId: string;
        requester: PublicProfile;
      };
      setPendingRequests((prev) => [
        {
          requestId,
          fromUserId: requester.userId,
          fromUserName: requester.userName,
          fromAvatarId: requester.avatarId,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
      enqueueBanner({
        kind: 'request-received',
        requestId,
        fromUserName: requester.userName,
        fromAvatarId: requester.avatarId
      });
    });

    socket.on(REALTIME_SERVER_EVENTS.friendRequestAccepted, (raw: unknown) => {
      const { requestId, friend } = raw as {
        requestId: string;
        friend: PublicProfile;
      };
      setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      setFriends((prev) => {
        if (prev.some((f) => f.userId === friend.userId)) return prev;
        return [
          ...prev,
          {
            userId: friend.userId,
            userName: friend.userName,
            avatarId: friend.avatarId,
            isOnline: false
          }
        ];
      });
      enqueueBanner({
        kind: 'request-accepted',
        friendUserName: friend.userName,
        friendAvatarId: friend.avatarId
      });
    });

    socket.on(REALTIME_SERVER_EVENTS.dmReceived, (raw: unknown) => {
      const { fromUserId, content, fromUserName } = raw as {
        messageId: string;
        fromUserId: string;
        fromUserName?: string;
        content: string;
        createdAt: string;
      };
      enqueueBanner({
        kind: 'dm',
        fromUserId,
        fromUserName: fromUserName ?? 'Someone',
        content
      });
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.userId]);

  const sendFriendRequest = useCallback(async (targetUserId: string): Promise<void> => {
    await apiSendFriendRequest(targetUserId);
  }, []);

  const respondToRequest = useCallback(
    async (requestId: string, action: 'accept' | 'reject'): Promise<void> => {
      await apiRespondFriendRequest(requestId, action);
      setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    },
    []
  );

  const unfriendFn = useCallback(async (targetUserId: string): Promise<void> => {
    await apiUnfriend(targetUserId);
    setFriends((prev) => prev.filter((f) => f.userId !== targetUserId));
  }, []);

  const addFriendLocally = useCallback((profile: PublicProfile): void => {
    setFriends((prev) => {
      if (prev.some((f) => f.userId === profile.userId)) return prev;
      return [
        ...prev,
        {
          userId: profile.userId,
          userName: profile.userName,
          avatarId: profile.avatarId,
          isOnline: false
        }
      ];
    });
  }, []);

  const removeFriendLocally = useCallback((targetUserId: string): void => {
    setFriends((prev) => prev.filter((f) => f.userId !== targetUserId));
  }, []);

  const openDm = useCallback((targetUserId: string): void => {
    setDmOpenForUserId(targetUserId);
  }, []);

  const closeDm = useCallback((): void => {
    setDmOpenForUserId(null);
  }, []);

  return (
    <FriendContext.Provider
      value={{
        friends,
        pendingRequests,
        friendUserIds,
        banner,
        dismissBanner,
        dmOpenForUserId,
        openDm,
        closeDm,
        sendFriendRequest,
        respondToRequest,
        unfriend: unfriendFn,
        addFriendLocally,
        removeFriendLocally
      }}
    >
      {children}
    </FriendContext.Provider>
  );
}
