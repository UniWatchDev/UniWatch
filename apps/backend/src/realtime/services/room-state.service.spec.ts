import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { RoomStateService } from '@/realtime/services/room-state.service';

describe('RoomStateService', () => {
  let service: RoomStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomStateService]
    }).compile();

    service = module.get<RoomStateService>(RoomStateService);
  });

  it('tracks readiness, status, and live playback timing', () => {
    const roomId = 'room-1';
    service.getOrCreate(roomId);

    const joined = service.joinUser({
      roomId,
      userId: 'user-1',
      userName: 'User One',
      socketId: 'socket-1'
    });
    expect(joined.isReady).toBe(false);
    expect(service.syncStatus(roomId)).toBe('waiting');

    service.syncMovie(roomId, 'movie-1');
    service.setUserReady(roomId, 'user-1', true);
    expect(service.syncStatus(roomId)).toBe('ready');

    service.updatePlayback(roomId, {
      movieId: 'movie-1',
      isPlaying: true,
      positionSec: 42,
      playbackRate: 1
    });

    const playback = service.getMaterializedPlayback(roomId, new Date(Date.now() + 1500));
    expect(playback.movieId).toBe('movie-1');
    expect(playback.isPlaying).toBe(true);
    expect(playback.positionSec).toBeGreaterThan(43);

    service.removeSocket(roomId, 'socket-1');
    expect(service.syncStatus(roomId)).toBe('waiting');
  });

  it('preserves a user ready flag across a refresh socket swap', () => {
    const roomId = 'room-2';
    service.joinUser({
      roomId,
      userId: 'user-1',
      userName: 'User One',
      socketId: 'socket-old'
    });
    service.setUserReady(roomId, 'user-1', true);

    const rejoined = service.joinUser({
      roomId,
      userId: 'user-1',
      userName: 'User One',
      socketId: 'socket-new'
    });

    expect(rejoined.isReady).toBe(true);
  });

  it('ignores the creator when computing readiness status', () => {
    const roomId = 'room-3';
    service.joinUser({
      roomId,
      userId: 'creator',
      userName: 'Host',
      socketId: 'socket-host'
    });
    service.joinUser({
      roomId,
      userId: 'viewer',
      userName: 'Viewer',
      socketId: 'socket-viewer'
    });
    service.syncMovie(roomId, 'movie-1');

    service.setUserReady(roomId, 'creator', false);
    service.setUserReady(roomId, 'viewer', true);

    expect(service.syncStatus(roomId, 'creator')).toBe('ready');
  });
});
