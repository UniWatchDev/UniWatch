import { ConflictException, NotFoundException } from '@nestjs/common';
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
      // Second findById call: existence check for target user
      userRepo.findById.mockResolvedValueOnce({
        _id: { toString: () => BOB },
        userName: 'bob',
        firstName: 'Bob',
        isProfilePrivate: false,
        avatarId: 'violet-reel',
        createdAt: new Date()
      } as never);

      const result = await service.sendRequest(ALICE, BOB);
      expect(result.requestId).toBe('req123');
      expect(requestRepo.create).toHaveBeenCalledWith(ALICE, BOB);
    });

    it('throws NotFoundException when targetUserId does not exist', async () => {
      userRepo.findById
        .mockResolvedValueOnce({
          _id: { toString: () => ALICE },
          userName: 'alice',
          firstName: 'Alice',
          isProfilePrivate: false,
          avatarId: 'violet-reel',
          createdAt: new Date()
        } as never)
        .mockResolvedValueOnce(null);

      await expect(service.sendRequest(ALICE, BOB)).rejects.toBeInstanceOf(NotFoundException);
      expect(requestRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('respondToRequest (accept)', () => {
    const REQ_ID = 'req-accept-001';
    const aliceDoc = {
      _id: { toString: () => ALICE },
      userName: 'alice',
      firstName: 'Alice',
      isProfilePrivate: false,
      avatarId: 'violet-reel',
      createdAt: new Date()
    };
    const bobDoc = {
      _id: { toString: () => BOB },
      userName: 'bob',
      firstName: 'Bob',
      isProfilePrivate: false,
      avatarId: 'violet-reel',
      createdAt: new Date()
    };

    it('notifies both parties when a request is accepted', async () => {
      const pendingReqDoc = {
        _id: { toString: () => REQ_ID },
        from: { toString: () => ALICE },
        to: { toString: () => BOB },
        status: 'pending',
        createdAt: new Date()
      };
      // respondToRequest calls findById once; acceptRequest calls it again
      requestRepo.findById
        .mockResolvedValueOnce(pendingReqDoc as never)
        .mockResolvedValueOnce(pendingReqDoc as never);
      requestRepo.setStatus.mockResolvedValueOnce(null);
      // acceptRequest fetches fromDoc (ALICE) and toDoc (BOB) in Promise.all
      userRepo.findById
        .mockResolvedValueOnce(aliceDoc as never)
        .mockResolvedValueOnce(bobDoc as never);

      await service.respondToRequest({ actorUserId: BOB, requestId: REQ_ID, action: 'accept' });

      expect(broadcastPort.notifyRequestAccepted).toHaveBeenCalledTimes(2);
      // Original requester (ALICE) is notified with BOB's profile
      expect(broadcastPort.notifyRequestAccepted).toHaveBeenCalledWith(
        expect.objectContaining({ targetUserId: ALICE, requestId: REQ_ID })
      );
      // Acceptor (BOB) is notified with ALICE's profile
      expect(broadcastPort.notifyRequestAccepted).toHaveBeenCalledWith(
        expect.objectContaining({ targetUserId: BOB, requestId: REQ_ID })
      );
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
