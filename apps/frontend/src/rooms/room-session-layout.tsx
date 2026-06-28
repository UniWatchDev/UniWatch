import { useCallback, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import type { RoomResponse } from '@repo/schemas/rooms';

import type { PlaybackChangeEvent } from '@/hooks/use-room-socket';
import { useRoomSocket } from '@/hooks/use-room-socket';
import { RoomSessionContext, type RoomSessionContextValue } from '@/rooms/room-session-context';

const ROOM_EXIT_REDIRECT_MS = 1_800;

function RoomSessionLayoutInner({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const [sessionRoom, setSessionRoom] = useState<RoomResponse | null>(null);
  const exitPendingRef = useRef(false);
  const onMovieUpdatedRef = useRef<((movieId: string, movieName?: string) => void) | null>(null);
  const onPlaybackChangedRef = useRef<((event: PlaybackChangeEvent) => void) | null>(null);

  const redirectToLobby = useCallback(
    (message: string, options?: { title?: string; tone?: 'closed' | 'kicked' | 'banned' }) => {
      if (exitPendingRef.current) {
        return;
      }
      exitPendingRef.current = true;
      const tone = options?.tone ?? 'closed';
      const title =
        options?.title ??
        (tone === 'kicked'
          ? 'Removed from room'
          : tone === 'banned'
            ? 'Banned from room'
            : 'Room closed');
      window.setTimeout(() => {
        void navigate('/rooms', {
          replace: true,
          state: { lobbyNoticeMessage: message, lobbyNoticeTitle: title, lobbyNoticeTone: tone },
        });
      }, ROOM_EXIT_REDIRECT_MS);
    },
    [navigate]
  );

  const syncSessionRoom = useCallback((room: RoomResponse | null) => {
    if (room !== null && room.id !== roomId) {
      return;
    }
    setSessionRoom(room);
  }, [roomId]);

  const socket = useRoomSocket({
    roomId,
    disabled: sessionRoom === null,
    creatorId: sessionRoom?.creator ?? '',
    creatorName: sessionRoom?.creator_name ?? undefined,
    initialMemberIds: sessionRoom?.allowed_users ?? [],
    onMovieUpdated: (movieId, movieName) => {
      onMovieUpdatedRef.current?.(movieId, movieName);
    },
    onPlaybackChanged: (event) => {
      onPlaybackChangedRef.current?.(event);
    },
    onRoomClosed: (message) => {
      redirectToLobby(message, { tone: 'closed' });
    },
    onKicked: (message) => {
      redirectToLobby(message, { title: 'Removed from room', tone: 'kicked' });
    },
    onBanned: (message) => {
      redirectToLobby(message, { title: 'Banned from room', tone: 'banned' });
    },
  });

  const registerMovieUpdatedHandler = useCallback(
    (handler: ((movieId: string, movieName?: string) => void) | null) => {
      onMovieUpdatedRef.current = handler;
    },
    []
  );

  const registerPlaybackChangedHandler = useCallback(
    (handler: ((event: PlaybackChangeEvent) => void) | null) => {
      onPlaybackChangedRef.current = handler;
    },
    []
  );

  const value = useMemo((): RoomSessionContextValue => ({
    ...socket,
    roomId,
    syncSessionRoom,
    registerMovieUpdatedHandler,
    registerPlaybackChangedHandler,
  }), [roomId, registerMovieUpdatedHandler, registerPlaybackChangedHandler, socket, syncSessionRoom]);

  return (
    <RoomSessionContext.Provider value={value}>
      <Outlet />
    </RoomSessionContext.Provider>
  );
}

export function RoomSessionLayout() {
  const { id } = useParams<{ id: string }>();
  if (id === undefined) {
    return null;
  }
  return <RoomSessionLayoutInner key={id} roomId={id} />;
}
