import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { FRIEND_BROADCAST_PORT } from '@/realtime/friend-broadcast.port';
import { UserRepository } from '@/auth/user.repository';
import { FriendRequestRepository } from './friend-request.repository';
import { FriendsService } from './friends.service';

const ALICE = '000000000000000000000001';
const BOB   = '000000000000000000000002';

describe('FriendsService', () => {
  let service: FriendsService;
  let userRepo: jest.Mocked<UserRepository>;
  let requestRepo: jest.Mocked<FriendRequestRepository>;
  let broadcastPort: jest.Mocked<{ notifyFriendRequest: jest.Mock; notifyRequestAccepted: jest.Mock }>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FriendsService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            findFriendIds: jest.fn().mockResolvedValue([]),
            addFriend: jest.fn().mockResolvedValue(null),
            removeFriend: jest.fn().mockResolvedValue(null),
            findManyByIds: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: FriendRequestRepository,
          useValue: {
            create: jest.fn(),
            findPendingBetween: jest.fn().mockResolvedValue(null),
            findPendingInbox: jest.fn().mockResolvedValue([]),
            findById: jest.fn(),
            setStatus: jest.fn()
          }
        },
        {
          provide: FRIEND_BROADCAST_PORT,
          useValue: {
            notifyFriendRequest: jest.fn(),
            notifyRequestAccepted: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get(FriendsService);
    userRepo = module.get(UserRepository) as jest.Mocked<UserRepository>;
    requestRepo = module.get(FriendRequestRepository) as jest.Mocked<FriendRequestRepository>;
    broadcastPort = module.get(FRIEND_BROADCAST_PORT) as jest.Mocked<typeof broadcastPort>;
  });

  describe('sendRequest', () => {
    it('throws ConflictException if already friends', async () => {
      userRepo.findFriendIds.mockResolvedValueOnce([BOB]);
      await expect(service.sendRequest(ALICE, BOB)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException if duplicate pending request', async () => {
      requestRepo.findPendingBetween.mockResolvedValueOnce({ from: ALICE, to: BOB } as never);
      await expect(service.sendRequest(ALICE, BOB)).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a FriendRequest and returns requestId on success', async () => {
      requestRepo.create.mockResolvedValueOnce({ _id: { toString: () => 'req123' } } as never);
      userRepo.findById.mockResolvedValueOnce({
        _id: { toString: () => ALICE },
        userName: 'alice',
        firstName: 'Alice',
        isProfilePrivate: false,
        avatarId: 'violet-reel',
        createdAt: new Date()
      } as never);

      const result = await service.sendRequest(ALICE, BOB);
      expect(result.requestId).toBe('req123');
      expect(requestRepo.create).toHaveBeenCalledWith(ALICE, BOB);
    });
  });

  describe('unfriend', () => {
    it('removes each user from the other\'s friend list', async () => {
      await service.unfriend(ALICE, BOB);
      expect(userRepo.removeFriend).toHaveBeenCalledWith(ALICE, BOB);
      expect(userRepo.removeFriend).toHaveBeenCalledWith(BOB, ALICE);
    });
  });
});
