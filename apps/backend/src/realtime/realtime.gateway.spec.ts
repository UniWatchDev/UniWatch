import { Types } from 'mongoose';
import type { Server } from 'socket.io';
import { REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';
import type { PlaybackState } from '@repo/schemas/realtime';

import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { ConnectionRegistryService } from '@/realtime/services/connection-registry.service';
import { PlaybackCountdownService } from '@/realtime/services/playback-countdown.service';
import { RealtimeBroadcastService } from '@/realtime/services/realtime-broadcast.service';
import { RoomModerationService } from '@/realtime/services/room-moderation.service';
import { RoomMovieChangeService } from '@/realtime/services/room-movie-change.service';
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
  let movieChange: RoomMovieChangeService;
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
    rooms = {
      findOneAccessibleById: jest.fn(),
      setStatus: jest.fn().mockResolvedValue(null),
      banUser: jest.fn(),
      findRawById: jest.fn()
    };
    broadcast = new RealtimeBroadcastService(roomState, countdown, rooms as unknown as RoomRepository);
    movieChange = new RoomMovieChangeService(roomState, countdown, broadcast, rooms as unknown as RoomRepository);
    moderation = new RoomModerationService(rooms as unknown as RoomRepository, roomState, broadcast);
    gateway = new RealtimeGateway(
      rooms as unknown as RoomRepository,
      roomState,
      {} as SocketAuthService,
      registry,
      countdown,
      broadcast,
      moderation,
      movieChange
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

  function roomEmitPlaybackPayload(eventName: string): { playback: PlaybackState } {
    for (const entry of roomEmit.mock.calls) {
      const [event, payload] = entry as [string, { playback: PlaybackState }];
      if (event === eventName) {
        return payload;
      }
    }
    throw new Error(`Expected room emit for ${eventName}`);
  }

  function roomEmitHasEvent(eventName: string): boolean {
    return roomEmit.mock.calls.some(([event]) => event === eventName);
  }

  it('sets the room to waiting when the last member disconnects during playback', async () => {
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.updatePlayback(roomId, {
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 120,
      playbackRate: 1
    });

    gateway.handleDisconnect({
      id: 'socket-1',
      rooms: new Set([roomId])
    } as never);

    await Promise.resolve();

    expect(roomState.get(roomId)).toBeUndefined();
    expect(rooms.setStatus).toHaveBeenCalledWith(roomId, 'waiting');
  });

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
    expect(roomEmit).not.toHaveBeenCalledWith('room:state', expect.anything());
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
    expect(roomEmit).toHaveBeenCalledWith('room:playback-changed', expect.any(Object));
    expect(roomEmit).toHaveBeenCalledWith(
      'room:presence-changed',
      expect.objectContaining({
        countdown: { active: false, endsAt: null }
      })
    );
    expect(roomEmitHasEvent(REALTIME_SERVER_EVENTS.roomState)).toBe(false);
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

  it('pauses at zero and resets readiness when the movie changes during playback', async () => {
    const viewerId = new Types.ObjectId().toString();
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.joinUser({ roomId, userId: viewerId, userName: 'Viewer', socketId: 'socket-2' });
    roomState.setUserReady(roomId, hostId, true);
    roomState.setUserReady(roomId, viewerId, true);
    roomState.updatePlayback(roomId, {
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 90,
      playbackRate: 1
    });

    rooms.findOneAccessibleById.mockResolvedValueOnce({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(nextMovieId),
      movie_name: 'Next movie'
    } as never);

    roomEmit.mockClear();

    await gateway.handleMovieUpdated(socket as never, { roomId, movieId: nextMovieId });

    const playback = roomState.get(roomId)?.playback;
    expect(playback?.movieId).toBe(nextMovieId);
    expect(playback?.isPlaying).toBe(false);
    expect(playback?.positionSec).toBe(0);
    expect(roomState.get(roomId)?.connectedUsers.every((user) => !user.isReady)).toBe(true);
    expect(roomState.syncStatus(roomId, hostId)).toBe('waiting');
    expect(roomEmit).toHaveBeenCalledWith('room:movie-updated', expect.objectContaining({ movieId: nextMovieId }));
    expect(roomEmit).toHaveBeenCalledWith('room:playback-changed', expect.any(Object));
    expect(roomEmit).toHaveBeenCalledWith('room:presence-changed', expect.any(Object));
    expect(roomEmitHasEvent('room:message-received')).toBe(true);
    const messages = roomState.get(roomId)?.messages ?? [];
    expect(messages.at(-1)?.content).toContain('Next movie');
    expect(roomState.get(roomId)?.countdown.active).toBe(false);
  });

  it('starts playback after swap when host plays and countdown completes', async () => {
    const viewerId = new Types.ObjectId().toString();
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.joinUser({ roomId, userId: viewerId, userName: 'Viewer', socketId: 'socket-2' });
    roomState.setUserReady(roomId, hostId, true);
    roomState.setUserReady(roomId, viewerId, true);
    roomState.updatePlayback(roomId, {
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 90,
      playbackRate: 1
    });

    rooms.findOneAccessibleById.mockResolvedValueOnce({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(nextMovieId),
      movie_name: 'Next movie'
    } as never);

    await gateway.handleMovieUpdated(socket as never, { roomId, movieId: nextMovieId });

    expect(roomState.get(roomId)?.countdown.active).toBe(false);
    expect(roomState.get(roomId)?.playback.isPlaying).toBe(false);

    roomState.setUserReady(roomId, hostId, true);
    roomState.setUserReady(roomId, viewerId, true);
    mockHostRoom(nextMovieId, 'Next movie');

    roomEmit.mockClear();

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: nextMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });

    expect(roomState.get(roomId)?.countdown.active).toBe(true);

    jest.advanceTimersByTime(3000);

    const startedPlayback = roomState.get(roomId)?.playback;
    expect(roomState.get(roomId)?.countdown.active).toBe(false);
    expect(startedPlayback?.movieId).toBe(nextMovieId);
    expect(startedPlayback?.isPlaying).toBe(true);

    expect(roomEmitHasEvent(REALTIME_SERVER_EVENTS.playbackChanged)).toBe(true);
    const playbackPayload = roomEmitPlaybackPayload(REALTIME_SERVER_EVENTS.playbackChanged);
    expect(playbackPayload.playback.isPlaying).toBe(true);
    expect(playbackPayload.playback.movieId).toBe(nextMovieId);
  });

  it('accepts host play for runtime movie id when persisted room.movie is stale', async () => {
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, nextMovieId);
    roomState.updatePlayback(roomId, {
      movieId: nextMovieId,
      isPlaying: false,
      positionSec: 0,
      playbackRate: 1
    });
    roomState.setUserReady(roomId, hostId, true);

    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(initialMovieId),
      movie_name: 'Old movie'
    } as never);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: nextMovieId,
      isPlaying: true,
      positionSec: 0,
      playbackRate: 1
    });

    expect(roomState.get(roomId)?.countdown.active).toBe(true);
    expect(roomState.get(roomId)?.playback.movieId).toBe(nextMovieId);
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

  it('does not broadcast position ticks while playback is already running', async () => {
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.updatePlayback(roomId, {
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 60,
      playbackRate: 1
    });

    roomEmit.mockClear();

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 61,
      playbackRate: 1
    });

    expect(roomState.get(roomId)?.playback.positionSec).toBe(61);
    expect(roomEmit).not.toHaveBeenCalledWith('room:playback-changed', expect.any(Object));
    expect(roomEmitHasEvent(REALTIME_SERVER_EVENTS.roomState)).toBe(false);
  });

  it('broadcasts seek and rate changes during active playback', async () => {
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.updatePlayback(roomId, {
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 60,
      playbackRate: 1
    });

    roomEmit.mockClear();

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 120,
      playbackRate: 1,
      force: true
    });

    expect(roomEmit).toHaveBeenCalledWith('room:playback-changed', expect.any(Object));
    expect(roomEmitHasEvent(REALTIME_SERVER_EVENTS.roomState)).toBe(false);

    roomEmit.mockClear();

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 120,
      playbackRate: 1.5
    });

    expect(roomEmit).toHaveBeenCalledWith('room:playback-changed', expect.any(Object));
  });

  it('keeps playback running when a viewer leaves during an active watch', async () => {
    const viewerId = new Types.ObjectId().toString();
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.joinUser({ roomId, userId: viewerId, userName: 'Viewer', socketId: 'socket-2' });
    roomState.updatePlayback(roomId, {
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 120,
      playbackRate: 1
    });
    roomState.syncStatus(roomId, hostId);
    rooms.findRawById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId)
    } as never);

    const viewerSocket = actorSocket('socket-2', viewerId, 'Viewer');
    (viewerSocket as unknown as { leave: jest.Mock }).leave = jest.fn().mockResolvedValue(undefined);
    await gateway.handleLeave(viewerSocket as never, { roomId });

    const playback = roomState.get(roomId)?.playback;
    expect(playback?.isPlaying).toBe(true);
    expect(playback?.movieId).toBe(initialMovieId);
    expect(roomState.syncStatus(roomId, hostId)).toBe('watching');
    expect(roomEmit).toHaveBeenCalledWith('room:presence-changed', expect.any(Object));
    expect(roomEmitHasEvent(REALTIME_SERVER_EVENTS.roomState)).toBe(false);
  });

  it('resets the playback session when the host reports the movie ended', async () => {
    const viewerId = new Types.ObjectId().toString();
    mockHostRoom(initialMovieId);
    roomState.syncMovie(roomId, initialMovieId);
    roomState.joinUser({ roomId, userId: viewerId, userName: 'Viewer', socketId: 'socket-2' });
    roomState.setUserReady(roomId, hostId, true);
    roomState.setUserReady(roomId, viewerId, true);
    roomState.updatePlayback(roomId, {
      movieId: initialMovieId,
      isPlaying: true,
      positionSec: 5400,
      playbackRate: 1
    });
    roomState.syncStatus(roomId, hostId);

    await gateway.handlePlaybackUpdate(socket as never, {
      roomId,
      movieId: initialMovieId,
      isPlaying: false,
      positionSec: 5400,
      playbackRate: 1,
      ended: true
    });

    const runtime = roomState.get(roomId);
    expect(runtime?.playback.isPlaying).toBe(false);
    expect(runtime?.playback.positionSec).toBe(0);
    expect(runtime?.playback.playbackRate).toBe(1);
    expect(runtime?.countdown.active).toBe(false);
    expect(runtime?.connectedUsers.every((user) => !user.isReady)).toBe(true);
    expect(roomState.syncStatus(roomId, hostId)).not.toBe('watching');
    expect(roomEmit).toHaveBeenCalledWith('room:playback-changed', expect.any(Object));
    expect(roomEmit).toHaveBeenCalledWith('room:state', expect.any(Object));
    const playbackChangedPayload = roomEmitPlaybackPayload('room:playback-changed');
    expect(playbackChangedPayload.playback.isPlaying).toBe(false);
    expect(playbackChangedPayload.playback.positionSec).toBe(0);
    const endStatePayload = roomEmitPlaybackPayload('room:state');
    expect(endStatePayload.playback.isPlaying).toBe(false);
    expect(endStatePayload.playback.positionSec).toBe(0);
  });

  it('emits presence-changed when a viewer toggles ready', async () => {
    const viewerId = new Types.ObjectId().toString();
    mockHostRoom(initialMovieId);
    registry.register('socket-2', { userId: viewerId, userName: 'Viewer' });
    roomState.joinUser({ roomId, userId: viewerId, userName: 'Viewer', socketId: 'socket-2' });
    const viewer = actorSocket('socket-2', viewerId, 'Viewer');
    roomEmit.mockClear();

    await gateway.handleReadyUpdate(viewer as never, { roomId, isReady: true });

    expect(roomEmit).toHaveBeenCalledWith('room:presence-changed', expect.any(Object));
    expect(roomEmitHasEvent(REALTIME_SERVER_EVENTS.roomState)).toBe(false);
  });

  it('clears orphan countdown timers when a user rejoins after disconnect mid-countdown', async () => {
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

    gateway.handleDisconnect({
      id: 'socket-1',
      rooms: new Set([roomId])
    } as never);

    const rejoinSocket = actorSocket('socket-3', hostId, 'Host');
    rejoinSocket.rooms = new Set();
    (rejoinSocket as unknown as { join: jest.Mock }).join = jest.fn((): Promise<void> => {
      rejoinSocket.rooms.add(roomId);
      return Promise.resolve();
    });
    registry.register('socket-3', { userId: hostId, userName: 'Host' });

    await gateway.handleJoin(rejoinSocket as never, { roomId });

    expect(roomState.get(roomId)?.countdown.active).toBe(false);
  });
});
