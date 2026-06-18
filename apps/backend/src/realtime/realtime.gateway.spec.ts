import { Types } from 'mongoose';

import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { RoomStateService } from '@/realtime/services/room-state.service';
import type { RoomRepository } from '@/rooms/room.repository';
import type { SocketAuthService } from '@/realtime/services/socket-auth.service';

describe('RealtimeGateway countdown flow', () => {
  const roomId = new Types.ObjectId().toString();
  const hostId = new Types.ObjectId().toString();
  const initialMovieId = new Types.ObjectId().toString();
  const nextMovieId = new Types.ObjectId().toString();

  let gateway: RealtimeGateway;
  let roomState: RoomStateService;
  let rooms: jest.Mocked<Pick<RoomRepository, 'findOneAccessibleById' | 'setStatus'>>;
  let roomEmit: jest.Mock;
  let socket: {
    id: string;
    rooms: Set<string>;
    emit: jest.Mock;
    disconnect: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse('2026-06-16T12:00:00.000Z') });

    roomState = new RoomStateService();
    rooms = {
      findOneAccessibleById: jest.fn(),
      setStatus: jest.fn()
    };

    gateway = new RealtimeGateway(
      rooms as unknown as RoomRepository,
      roomState,
      {} as SocketAuthService
    );

    roomEmit = jest.fn();
    (gateway as unknown as { server: { to: (roomId: string) => { emit: jest.Mock } } }).server = {
      to: jest.fn(() => ({ emit: roomEmit })),
      sockets: { sockets: new Map() }
    } as never;

    (gateway as unknown as { socketToUser: Map<string, { userId: string; userName: string }> })
      .socketToUser.set('socket-1', {
        userId: hostId,
        userName: 'Host'
      });
    roomState.joinUser({
      roomId,
      userId: hostId,
      userName: 'Host',
      socketId: 'socket-1'
    });
    roomState.setUserReady(roomId, hostId, true);

    socket = {
      id: 'socket-1',
      rooms: new Set([roomId]),
      emit: jest.fn(),
      disconnect: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('keeps the room member until the last socket for that user disconnects', () => {
    const socketTwoId = 'socket-2';

    (gateway as unknown as {
      socketToUser: Map<string, { userId: string; userName: string }>;
      userToSockets: Map<string, Set<string>>;
    }).socketToUser.set(socketTwoId, {
      userId: hostId,
      userName: 'Host'
    });
    (gateway as unknown as {
      socketToUser: Map<string, { userId: string; userName: string }>;
      userToSockets: Map<string, Set<string>>;
    }).userToSockets.set(hostId, new Set(['socket-1', socketTwoId]));

    roomState.joinUser({
      roomId,
      userId: hostId,
      userName: 'Host',
      socketId: socketTwoId
    });

    gateway.handleDisconnect({
      id: 'socket-1',
      rooms: new Set([roomId]),
      emit: jest.fn(),
      disconnect: jest.fn()
    } as never);

    const stateAfterFirstDisconnect = roomState.get(roomId);
    expect(stateAfterFirstDisconnect?.connectedUsers).toHaveLength(1);
    expect(stateAfterFirstDisconnect?.connectedUsers[0]?.socketIds).toEqual([socketTwoId]);
    expect(roomEmit).not.toHaveBeenCalledWith('room:user-left', expect.anything());

    gateway.handleDisconnect({
      id: socketTwoId,
      rooms: new Set([roomId]),
      emit: jest.fn(),
      disconnect: jest.fn()
    } as never);

    expect(roomState.get(roomId)).toBeUndefined();
    expect(roomEmit).toHaveBeenCalledWith('room:user-left', { userId: hostId, roomId });
  });

  it('disconnects every live socket for a moderated user in the room', async () => {
    const viewerId = new Types.ObjectId().toString();
    const socketTwoId = 'socket-2';
    const socketThreeId = 'socket-3';
    const viewerSocketTwo = {
      emit: jest.fn(),
      disconnect: jest.fn()
    };
    const viewerSocketThree = {
      emit: jest.fn(),
      disconnect: jest.fn()
    };

    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(initialMovieId),
      movie_name: 'Room movie'
    } as never);

    (gateway as unknown as {
      socketToUser: Map<string, { userId: string; userName: string }>;
      userToSockets: Map<string, Set<string>>;
      server: { sockets: { sockets: Map<string, { emit: jest.Mock; disconnect: jest.Mock }> } };
    }).socketToUser.set(socketTwoId, {
      userId: viewerId,
      userName: 'Viewer'
    });
    (gateway as unknown as {
      socketToUser: Map<string, { userId: string; userName: string }>;
      userToSockets: Map<string, Set<string>>;
      server: { sockets: { sockets: Map<string, { emit: jest.Mock; disconnect: jest.Mock }> } };
    }).socketToUser.set(socketThreeId, {
      userId: viewerId,
      userName: 'Viewer'
    });
    (gateway as unknown as {
      socketToUser: Map<string, { userId: string; userName: string }>;
      userToSockets: Map<string, Set<string>>;
      server: { sockets: { sockets: Map<string, { emit: jest.Mock; disconnect: jest.Mock }> } };
    }).userToSockets.set(viewerId, new Set([socketTwoId, socketThreeId]));
    (gateway as unknown as {
      server: { sockets: { sockets: Map<string, { emit: jest.Mock; disconnect: jest.Mock }> } };
    }).server.sockets.sockets.set(socketTwoId, viewerSocketTwo);
    (gateway as unknown as {
      server: { sockets: { sockets: Map<string, { emit: jest.Mock; disconnect: jest.Mock }> } };
    }).server.sockets.sockets.set(socketThreeId, viewerSocketThree);

    roomState.joinUser({
      roomId,
      userId: viewerId,
      userName: 'Viewer',
      socketId: socketTwoId
    });
    roomState.joinUser({
      roomId,
      userId: viewerId,
      userName: 'Viewer',
      socketId: socketThreeId
    });

    await gateway.handleKickUser({
      id: 'socket-1',
      rooms: new Set([roomId]),
      emit: jest.fn(),
      disconnect: jest.fn()
    } as never, {
      roomId,
      targetUserId: viewerId
    });

    expect(viewerSocketTwo.emit).toHaveBeenCalledWith('room:error', {
      message: 'kicked from the room'
    });
    expect(viewerSocketThree.emit).toHaveBeenCalledWith('room:error', {
      message: 'kicked from the room'
    });
    expect(viewerSocketTwo.disconnect).toHaveBeenCalledWith(true);
    expect(viewerSocketThree.disconnect).toHaveBeenCalledWith(true);
  });

  it('queues playback until the countdown ends', async () => {
    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(initialMovieId),
      movie_name: 'Room movie'
    } as never);
    roomState.syncMovie(roomId, initialMovieId);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });

    const firstCountdown = roomState.get(roomId)?.countdown;
    const queuedPlayback = roomState.get(roomId)?.playback;
    expect(firstCountdown?.active).toBe(true);
    expect(firstCountdown?.endsAt).toBe('2026-06-16T12:00:03.000Z');
    expect(queuedPlayback?.isPlaying).toBe(false);
    expect(queuedPlayback?.movieId).toBe(initialMovieId);

    jest.advanceTimersByTime(1000);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 12,
      playbackRate: 1
    });

    expect(roomState.get(roomId)?.countdown.endsAt).toBe(firstCountdown?.endsAt ?? null);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(false);

    jest.advanceTimersByTime(2000);

    const livePlayback = roomState.get(roomId)?.playback;
    expect(roomState.get(roomId)?.countdown.active).toBe(false);
    expect(livePlayback?.isPlaying).toBe(true);
    expect(livePlayback?.positionSec).toBe(12);
    expect(livePlayback?.updatedAt).toBe('2026-06-16T12:00:03.000Z');
  });

  it('clears the countdown when playback pauses', async () => {
    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(initialMovieId),
      movie_name: 'Room movie'
    } as never);
    roomState.syncMovie(roomId, initialMovieId);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });
    expect(roomState.get(roomId)?.countdown.active).toBe(true);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(false);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: false,
      positionSec: 12,
      playbackRate: 1
    });

    expect(roomState.get(roomId)?.countdown.active).toBe(false);
    expect(roomState.get(roomId)?.countdown.endsAt).toBeNull();
  });

  it('keeps a queued start aligned when the movie changes before the countdown ends', async () => {
    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(initialMovieId),
      movie_name: 'Room movie'
    } as never);
    roomState.syncMovie(roomId, initialMovieId);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });

    expect(roomState.get(roomId)?.countdown.active).toBe(true);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(false);

    rooms.findOneAccessibleById.mockResolvedValueOnce({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(nextMovieId),
      movie_name: 'Next movie'
    } as never);

    await gateway.handleMovieUpdated(socket as never, {
      roomId,
      movieId: nextMovieId
    });

    const playback = roomState.get(roomId)?.playback;
    expect(playback?.movieId).toBe(nextMovieId);
    expect(playback?.isPlaying).toBe(false);
    expect(playback?.positionSec).toBe(0);

    jest.advanceTimersByTime(3000);

    const startedPlayback = roomState.get(roomId)?.playback;
    expect(roomState.get(roomId)?.countdown.active).toBe(false);
    expect(startedPlayback?.movieId).toBe(nextMovieId);
    expect(startedPlayback?.isPlaying).toBe(true);
    expect(startedPlayback?.updatedAt).toBe('2026-06-16T12:00:03.000Z');
  });

  it('expires the countdown after three seconds', async () => {
    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(initialMovieId),
      movie_name: 'Room movie'
    } as never);
    roomState.syncMovie(roomId, initialMovieId);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });

    expect(roomState.get(roomId)?.countdown.active).toBe(true);

    jest.advanceTimersByTime(3000);

    expect(roomState.get(roomId)?.countdown.active).toBe(false);
    expect(roomState.get(roomId)?.countdown.endsAt).toBeNull();
    expect(roomEmit).toHaveBeenCalled();
  });

  it('rejects playback when not all connected users are ready', async () => {
    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(initialMovieId),
      movie_name: 'Room movie'
    } as never);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.joinUser({
      roomId,
      userId: hostId,
      userName: 'Host',
      socketId: 'socket-1'
    });
    roomState.joinUser({
      roomId,
      userId: new Types.ObjectId().toString(),
      userName: 'Viewer',
      socketId: 'socket-2'
    });
    roomState.setUserReady(roomId, hostId, true);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });

    expect(socket.emit).toHaveBeenCalledWith('room:error', {
      message: 'All users must be ready before playback starts.'
    });
    expect(roomState.get(roomId)?.countdown.active).toBe(false);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(false);
  });

  it('allows the solo host to start playback even when unready', async () => {
    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(initialMovieId),
      movie_name: 'Room movie'
    } as never);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.setUserReady(roomId, hostId, false);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });

    expect(roomState.get(roomId)?.countdown.active).toBe(true);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(false);
    jest.advanceTimersByTime(3000);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(true);
  });

  it('accepts a force play request when viewers are still unready', async () => {
    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(initialMovieId),
      movie_name: 'Room movie'
    } as never);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.joinUser({
      roomId,
      userId: new Types.ObjectId().toString(),
      userName: 'Viewer',
      socketId: 'socket-2'
    });

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1,
      force: true
    });

    expect(roomState.get(roomId)?.countdown.active).toBe(true);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(false);

    jest.advanceTimersByTime(3000);

    expect(roomState.get(roomId)?.countdown.active).toBe(false);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(true);
  });
});
