import { Types } from 'mongoose';
import type { Server } from 'socket.io';
import { WsException } from '@nestjs/websockets';

import { PlaybackCountdownService } from '@/realtime/services/playback-countdown.service';
import { RealtimeBroadcastService } from '@/realtime/services/realtime-broadcast.service';
import { RoomModerationService } from '@/realtime/services/room-moderation.service';
import { RoomStateService } from '@/realtime/services/room-state.service';
import type { RoomRepository } from '@/rooms/room.repository';

describe('RoomModerationService', () => {
  const roomId = new Types.ObjectId().toString();
  const hostId = new Types.ObjectId().toString();
  const targetId = new Types.ObjectId().toString();

  let roomState: RoomStateService;
  let countdown: PlaybackCountdownService;
  let broadcast: RealtimeBroadcastService;
  let moderation: RoomModerationService;
  let rooms: jest.Mocked<
    Pick<RoomRepository, 'findOneAccessibleById' | 'setStatus' | 'banUser'>
  >;
  let roomEmit: jest.Mock;
  let socketRegistry: Map<string, { emit: jest.Mock; disconnect: jest.Mock }>;

  function mockHostRoom(): void {
    rooms.findOneAccessibleById.mockResolvedValue({
      _id: new Types.ObjectId(roomId),
      creator: new Types.ObjectId(hostId)
    } as never);
  }

  function registerSocket(socketId: string): { emit: jest.Mock; disconnect: jest.Mock } {
    const entry = { emit: jest.fn(), disconnect: jest.fn() };
    socketRegistry.set(socketId, entry);
    return entry;
  }

  beforeEach(() => {
    roomState = new RoomStateService();
    countdown = new PlaybackCountdownService(roomState);
    broadcast = new RealtimeBroadcastService(roomState, countdown, rooms as unknown as RoomRepository);
    rooms = {
      findOneAccessibleById: jest.fn(),
      setStatus: jest.fn(),
      banUser: jest.fn()
    };
    moderation = new RoomModerationService(rooms as unknown as RoomRepository, roomState, broadcast);

    roomEmit = jest.fn();
    socketRegistry = new Map();
    broadcast.bind({
      to: jest.fn(() => ({ emit: roomEmit })),
      sockets: { sockets: socketRegistry }
    } as unknown as Server);

    roomState.joinUser({ roomId, userId: hostId, userName: 'Host', socketId: 'host-socket' });
    roomState.joinUser({ roomId, userId: targetId, userName: 'Guest', socketId: 'target-1' });
    roomState.joinUser({ roomId, userId: targetId, userName: 'Guest', socketId: 'target-2' });
  });

  it('disconnects every socket the target holds and bans when requested', async () => {
    mockHostRoom();
    const first = registerSocket('target-1');
    const second = registerSocket('target-2');

    await moderation.moderate({
      actorUserId: hostId,
      roomId,
      targetUserId: targetId,
      errorMessage: 'You were removed',
      shouldBan: true
    });

    expect(rooms.banUser).toHaveBeenCalledTimes(1);
    expect(first.disconnect).toHaveBeenCalledWith(true);
    expect(second.disconnect).toHaveBeenCalledWith(true);
    expect(first.emit).toHaveBeenCalledWith('room:error', { message: 'You were removed' });
  });

  it('kicks without banning', async () => {
    mockHostRoom();
    registerSocket('target-1');
    registerSocket('target-2');

    await moderation.moderate({
      actorUserId: hostId,
      roomId,
      targetUserId: targetId,
      errorMessage: 'kicked',
      shouldBan: false
    });

    expect(rooms.banUser).not.toHaveBeenCalled();
  });

  it('rejects when the actor is not the room creator', async () => {
    mockHostRoom();

    await expect(
      moderation.moderate({
        actorUserId: targetId,
        roomId,
        targetUserId: hostId,
        errorMessage: 'nope',
        shouldBan: false
      })
    ).rejects.toBeInstanceOf(WsException);
  });

  it('refuses to moderate the room creator', async () => {
    mockHostRoom();

    await expect(
      moderation.moderate({
        actorUserId: hostId,
        roomId,
        targetUserId: hostId,
        errorMessage: 'nope',
        shouldBan: false
      })
    ).rejects.toBeInstanceOf(WsException);
  });

  it('throws when kicking a user that is not in the room', async () => {
    mockHostRoom();
    const strangerId = new Types.ObjectId().toString();

    await expect(
      moderation.moderate({
        actorUserId: hostId,
        roomId,
        targetUserId: strangerId,
        errorMessage: 'nope',
        shouldBan: false
      })
    ).rejects.toBeInstanceOf(WsException);
  });
});
