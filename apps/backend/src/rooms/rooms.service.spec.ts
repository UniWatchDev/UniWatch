import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import type { TestingModule } from '@nestjs/testing';

import { MoviesService } from '@/movies/movies.service';
import {
  REALTIME_BROADCAST_PORT,
  type RealtimeBroadcastPort
} from '@/realtime/realtime.broadcast-port';
import { RoomStateService } from '@/realtime/services/room-state.service';
import { RoomRepository } from '@/rooms/room.repository';
import { RoomsService } from '@/rooms/rooms.service';
import type { Env } from '@/utils/env.validation';

describe('RoomsService', () => {
  let service: RoomsService;
  const roomsRepo = {
    findRawById: jest.fn(),
    addUser: jest.fn(),
    removeUser: jest.fn(),
    findOneAccessibleById: jest.fn(),
    setStatus: jest.fn(),
    banUser: jest.fn(),
    create: jest.fn(),
    updateIfCreator: jest.fn(),
    softDeleteIfCreator: jest.fn(),
    setDeactivatedAt: jest.fn()
  } as unknown as jest.Mocked<RoomRepository>;

  const moviesService = {
    get: jest.fn(),
    scheduleFilePurge: jest.fn()
  } as unknown as jest.Mocked<MoviesService>;

  const configService = {
    get: jest.fn()
  } as unknown as ConfigService<Env, true>;

  const roomStateService = {
    get: jest.fn(),
    syncStatus: jest.fn()
  } as unknown as jest.Mocked<RoomStateService>;

  const realtimeBroadcast = {
    emitRoomMovieUpdated: jest.fn(),
    emitRoomPlaybackChanged: jest.fn(),
    emitRoomState: jest.fn(),
    clearCountdown: jest.fn(),
    removeRoomMember: jest.fn()
  } as unknown as jest.Mocked<RealtimeBroadcastPort>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: RoomRepository, useValue: roomsRepo },
        { provide: MoviesService, useValue: moviesService },
        { provide: ConfigService, useValue: configService },
        { provide: RoomStateService, useValue: roomStateService },
        { provide: REALTIME_BROADCAST_PORT, useValue: realtimeBroadcast }
      ]
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('rejects a banned user when joining a room', async () => {
    const roomId = new Types.ObjectId().toString();
    const creatorId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    roomsRepo.findRawById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(creatorId),
      deleted_at: null,
      room_type: 'public',
      banned_users: [new Types.ObjectId(userId)],
      allowed_users: [],
      password: null
    } as never);

    await expect(service.join(roomId, userId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(roomsRepo.addUser.mock.calls).toHaveLength(0);
  });

  it('uses live room occupancy for list counts', async () => {
    const roomId = new Types.ObjectId().toString();
    roomStateService.get.mockReturnValue({
      connectedUsers: [{}, {}]
    } as never);
    roomsRepo.findAllActive = jest.fn().mockResolvedValue([
      {
        _id: new Types.ObjectId(roomId),
        name: 'Room',
        room_type: 'public',
        movie: null,
        creator: new Types.ObjectId(),
        description: null,
        password: null,
        allowed_users: [],
        banned_users: [],
        deactivate_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        status: 'waiting',
        movie_name: null,
        movie_description: null,
        creator_name: 'Host'
      }
    ] as never);

    const rooms = await service.list();
    expect(rooms[0]?.member_count).toBe(2);
  });

  it('clears live room membership when a user leaves', async () => {
    const roomId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const creatorId = new Types.ObjectId().toString();

    roomsRepo.findRawById.mockResolvedValueOnce({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(creatorId),
      deleted_at: null,
      room_type: 'public',
      movie: null,
      allowed_users: [new Types.ObjectId(userId)],
      banned_users: [],
      password: null
    } as never);
    roomsRepo.removeUser.mockResolvedValueOnce(undefined as never);
    roomsRepo.findRawById.mockResolvedValueOnce({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(creatorId),
      deleted_at: null,
      room_type: 'public',
      movie: null,
      allowed_users: [],
      banned_users: [],
      password: null
    } as never);
    roomStateService.syncStatus.mockReturnValue('waiting');

    await expect(service.leave(roomId, userId)).resolves.toEqual({ success: true });
    expect((realtimeBroadcast.removeRoomMember as jest.Mock).mock.calls).toEqual([[roomId, userId]]);
    expect((roomStateService.syncStatus as jest.Mock).mock.calls).toEqual([[roomId, creatorId]]);
    expect((roomsRepo.setStatus as jest.Mock).mock.calls).toEqual([[roomId, 'waiting']]);
  });
});
