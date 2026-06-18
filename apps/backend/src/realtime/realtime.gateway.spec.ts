import { Types } from 'mongoose';
import type { Server } from 'socket.io';

import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { ConnectionRegistryService } from '@/realtime/services/connection-registry.service';
import { PlaybackCountdownService } from '@/realtime/services/playback-countdown.service';
import { RealtimeBroadcastService } from '@/realtime/services/realtime-broadcast.service';
import { RoomModerationService } from '@/realtime/services/room-moderation.service';
import { RoomStateService } from '@/realtime/services/room-state.service';
import type { SocketAuthService } from '@/realtime/services/socket-auth.service';
import type { RoomRepository } from '@/rooms/room.repository';

type ActorSocket = {
  id: string;
  rooms: Set<string>;
  emit: jest.Mock;
  disconnect: jest.Mock;
  data: { user: { userId: string; userName: string } };
};

describe('RealtimeGateway', () => {
  const roomId = new Types.ObjectId().toString();
  const hostId = new Types.ObjectId().toString();
  const initialMovieId = new Types.ObjectId().toString();
  const nextMovieId = new Types.ObjectId().toString();

  let gateway: RealtimeGateway;
  let roomState: RoomStateService;
  let registry: ConnectionRegistryService;
  let countdown: PlaybackCountdownService;
  let broadcast: RealtimeBroadcastService;
  let moderation: RoomModerationService;
  let rooms: jest.Mocked<
    Pick<RoomRepository, 'findOneAccessibleById' | 'setStatus' | 'banUser' | 'findRawById'>
  >;
  let roomEmit: jest.Mock;
  let socketRegistry: Map<string, { emit: jest.Mock; disconnect: jest.Mock }>;
  let socket: ActorSocket;

  function actorSocket(id: string, userId: string, userName: string): ActorSocket {
    return {
      id,
      rooms: new Set([roomId]),
      emit: jest.fn(),
      disconnect: jest.fn(),
      data: { user: { userId, userName } }
    };
  }

  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse('2026-06-16T12:00:00.000Z') });

    roomState = new RoomStateService();
    registry = new ConnectionRegistryService();
    countdown = new PlaybackCountdownService(roomState);
    broadcast = new RealtimeBroadcastService(roomState, countdown);
    rooms = {
      findOneAccessibleById: jest.fn(),
      setStatus: jest.fn(),
      banUser: jest.fn(),
      findRawById: jest.fn()
    };
    moderation = new RoomModerationService(rooms as unknown as RoomRepository, roomState, broadcast);
    gateway = new RealtimeGateway(
      rooms as unknown as RoomRepository,
      roomState,
      {} as SocketAuthService,
      registry,
      countdown,
      broadcast,
      moderation
    );

    roomEmit = jest.fn();
    socketRegistry = new Map();
    broadcast.bind({
      to: jest.fn(() => ({ emit: roomEmit })),
      sockets: { sockets: socketRegistry }
    } as unknown as Server);

    registry.register('socket-1', { userId: hostId, userName: 'Host' });
    roomState.joinUser({ roomId, userId: hostId, userName: 'Host', socketId: 'socket-1' });
    roomState.setUserReady(roomId, hostId, true);

    socket = actorSocket('socket-1', hostId, 'Host');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function mockHostRoom(movieId: string, movieName = 'Room movie'): void {
    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(movieId),
      movie_name: movieName
    } as never);
  }

  it('keeps the room member until the last socket for that user disconnects', () => {
    registry.register('socket-2', { userId: hostId, userName: 'Host' });
    roomState.joinUser({ roomId, userId: hostId, userName: 'Host', socketId: 'socket-2' });

    gateway.handleDisconnect({
      id: 'socket-1',
      rooms: new Set([roomId])
    } as never);

    const afterFirst = roomState.get(roomId);
    expect(afterFirst?.connectedUsers).toHaveLength(1);
    expect(afterFirst?.connectedUsers[0]?.socketIds).toEqual(['socket-2']);
    expect(roomEmit).not.toHaveBeenCalledWith('room:user-left', expect.anything());

    gateway.handleDisconnect({
      id: 'socket-2',
      rooms: new Set([roomId])
    } as never);

    expect(roomState.get(roomId)).toBeUndefined();
    expect(roomEmit).toHaveBeenCalledWith('room:user-left', { userId: hostId, roomId });
  });

  it('disconnects every live socket for a moderated user in the room', async () => {
    const viewerId = new Types.ObjectId().toString();
    const viewerSocketTwo = { emit: jest.fn(), disconnect: jest.fn() };
    const viewerSocketThree = { emit: jest.fn(), disconnect: jest.fn() };
    mockHostRoom(initialMovieId);

    registry.register('socket-2', { userId: viewerId, userName: 'Viewer' });
    registry.register('socket-3', { userId: viewerId, userName: 'Viewer' });
    socketRegistry.set('socket-2', viewerSocketTwo);
    socketRegistry.set('socket-3', viewerSocketThree);
    roomState.joinUser({ roomId, userId: viewerId, userName: 'Viewer', socketId: 'socket-2' });
    roomState.joinUser({ roomId, userId: viewerId, userName: 'Viewer', socketId: 'socket-3' });

    await gateway.handleKickUser(socket as never, { roomId, targetUserId: viewerId });

    expect(viewerSocketTwo.emit).toHaveBeenCalledWith('room:error', { message: 'kicked from the room' });
    expect(viewerSocketThree.emit).toHaveBeenCalledWith('room:error', { message: 'kicked from the room' });
    expect(viewerSocketTwo.disconnect).toHaveBeenCalledWith(true);
    expect(viewerSocketThree.disconnect).toHaveBeenCalledWith(true);
  });

  it('bans a user before disconnecting their sockets when blocking', async () => {
    const viewerId = new Types.ObjectId().toString();
    const viewerSocket = { emit: jest.fn(), disconnect: jest.fn() };
    mockHostRoom(initialMovieId);

    registry.register('socket-2', { userId: viewerId, userName: 'Viewer' });
    socketRegistry.set('socket-2', viewerSocket);
    roomState.joinUser({ roomId, userId: viewerId, userName: 'Viewer', socketId: 'socket-2' });

    await gateway.handleBlockUser(socket as never, { roomId, targetUserId: viewerId });

    expect((rooms.banUser as jest.Mock).mock.calls).toHaveLength(1);
    expect(viewerSocket.emit).toHaveBeenCalledWith('room:error', { message: 'blocked from the room' });
    expect(viewerSocket.disconnect).toHaveBeenCalledWith(true);
  });

  it('broadcasts a chat message to the room', () => {
    gateway.handleMessage(socket as never, { roomId, content: 'hello' });

    expect(roomEmit).toHaveBeenCalledWith(
      'room:message-received',
      expect.objectContaining({ roomId, userId: hostId, content: 'hello' })
    );
    expect(roomState.get(roomId)?.messages).toHaveLength(1);
  });

  it('rejects a message from a socket that is not in the room', () => {
    const outsider = actorSocket('socket-1', hostId, 'Host');
    outsider.rooms = new Set();

    expect(() => {
      gateway.handleMessage(outsider as never, { roomId, content: 'hi' });
    }).toThrow('Forbidden');
  });

  it('adds the joining user and announces them to the room', async () => {
    const viewerId = new Types.ObjectId().toString();
    mockHostRoom(initialMovieId);
    registry.register('socket-2', { userId: viewerId, userName: 'Viewer' });
    const viewer = actorSocket('socket-2', viewerId, 'Viewer');
    viewer.rooms = new Set();
    const joinFn = jest.fn((): Promise<void> => {
      viewer.rooms.add(roomId);
      return Promise.resolve();
    });
    (viewer as unknown as { join: jest.Mock }).join = joinFn;

    await gateway.handleJoin(viewer as never, { roomId });

    expect(joinFn).toHaveBeenCalledWith(roomId);
    expect(viewer.emit).toHaveBeenCalledWith('room:state', expect.objectContaining({ status: 'waiting' }));
    expect(roomEmit).toHaveBeenCalledWith(
      'room:user-joined',
      expect.objectContaining({ userId: viewerId, roomId })
    );
  });

  it('queues playback until the countdown ends', async () => {
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });

    const firstCountdown = roomState.get(roomId)?.countdown;
    expect(firstCountdown?.active).toBe(true);
    expect(firstCountdown?.endsAt).toBe('2026-06-16T12:00:03.000Z');
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(false);

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
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });
    expect(roomState.get(roomId)?.countdown.active).toBe(true);

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
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });
    expect(roomState.get(roomId)?.countdown.active).toBe(true);

    rooms.findOneAccessibleById.mockResolvedValueOnce({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(nextMovieId),
      movie_name: 'Next movie'
    } as never);

    await gateway.handleMovieUpdated(socket as never, { roomId, movieId: nextMovieId });

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
    mockHostRoom(initialMovieId);
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
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.joinUser({
      roomId,
      userId: new Types.ObjectId().toString(),
      userName: 'Viewer',
      socketId: 'socket-2'
    });
    roomState.setUserReady(roomId, hostId, true);

    await expect(
      gateway.handlePlaybackUpdate(socket as never, {
        roomId,
        movieId: initialMovieId,
        isPlaying: true,
        positionSec: 0,
        playbackRate: 1
      })
    ).rejects.toThrow('All users must be ready before playback starts.');

    expect(roomState.get(roomId)?.countdown.active).toBe(false);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(false);
  });

  it('allows the solo host to start playback even when unready', async () => {
    mockHostRoom(initialMovieId);
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
    jest.advanceTimersByTime(3000);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(true);
  });

  it('accepts a force play request when viewers are still unready', async () => {
    mockHostRoom(initialMovieId);
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
    jest.advanceTimersByTime(3000);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(true);
  });
});
