import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { UserRepository } from '@/auth/user.repository';
import { FriendRequestRepository } from '@/friends/friend-request.repository';
import { UsersService } from './users.service';

const ALICE = '000000000000000000000001';
const BOB   = '000000000000000000000002';
const CAROL = '000000000000000000000003';

function makeUserDoc(overrides: {
  id: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  isProfilePrivate?: boolean;
}) {
  return {
    _id: { toString: () => overrides.id },
    userName: overrides.userName ?? 'user',
    firstName: overrides.firstName ?? 'First',
    lastName: overrides.lastName,
    isProfilePrivate: overrides.isProfilePrivate ?? false,
    avatarId: 'violet-reel',
    createdAt: new Date('2024-01-01T00:00:00.000Z')
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<UserRepository>;
  let friendRequestRepo: jest.Mocked<FriendRequestRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: {
            findByUserName: jest.fn(),
            findFriendIds: jest.fn().mockResolvedValue([]),
            searchByUsername: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: FriendRequestRepository,
          useValue: {
            findAllPendingForUser: jest.fn().mockResolvedValue([])
          }
        }
      ]
    }).compile();

    service = module.get(UsersService);
    userRepo = module.get<jest.Mocked<UserRepository>>(UserRepository);
    friendRequestRepo = module.get<jest.Mocked<FriendRequestRepository>>(FriendRequestRepository);
  });

  describe('getProfileByUserName', () => {
    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findByUserName.mockResolvedValueOnce(null);
      await expect(service.getProfileByUserName(ALICE, 'unknown')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('returns profile with viewerIsOwner=true when viewer is the profile owner', async () => {
      userRepo.findByUserName.mockResolvedValueOnce(makeUserDoc({ id: ALICE, userName: 'alice' }) as never);
      const result = await service.getProfileByUserName(ALICE, 'alice');
      expect(result.viewerIsOwner).toBe(true);
      expect(result.profile.userName).toBe('alice');
    });

    it('returns profile with viewerIsOwner=false when viewer is not the profile owner', async () => {
      userRepo.findByUserName.mockResolvedValueOnce(makeUserDoc({ id: BOB, userName: 'bob' }) as never);
      const result = await service.getProfileByUserName(ALICE, 'bob');
      expect(result.viewerIsOwner).toBe(false);
    });
  });

  describe('searchUsers', () => {
    it('calls searchByUsername with empty excludeIds when no friends or pending requests', async () => {
      userRepo.searchByUsername.mockResolvedValueOnce([]);
      await service.searchUsers(ALICE, 'car');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepo.searchByUsername).toHaveBeenCalledWith(ALICE, 'car', []);
    });

    it('excludes friend IDs from search', async () => {
      userRepo.findFriendIds.mockResolvedValueOnce([BOB]);
      userRepo.searchByUsername.mockResolvedValueOnce([]);
      await service.searchUsers(ALICE, 'car');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepo.searchByUsername).toHaveBeenCalledWith(ALICE, 'car', [BOB]);
    });

    it('excludes the OTHER party from pending outbound requests', async () => {
      friendRequestRepo.findAllPendingForUser.mockResolvedValueOnce([
        { from: { toString: () => ALICE }, to: { toString: () => CAROL } } as never
      ]);
      userRepo.searchByUsername.mockResolvedValueOnce([]);
      await service.searchUsers(ALICE, 'car');
      // CAROL (to) should be excluded since viewer is from
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepo.searchByUsername).toHaveBeenCalledWith(ALICE, 'car', [CAROL]);
    });

    it('excludes the OTHER party from pending inbound requests', async () => {
      friendRequestRepo.findAllPendingForUser.mockResolvedValueOnce([
        { from: { toString: () => CAROL }, to: { toString: () => ALICE } } as never
      ]);
      userRepo.searchByUsername.mockResolvedValueOnce([]);
      await service.searchUsers(ALICE, 'car');
      // CAROL (from) should be excluded since viewer is to
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepo.searchByUsername).toHaveBeenCalledWith(ALICE, 'car', [CAROL]);
    });

    it('deduplicates excludeIds when user is both friend and has pending request', async () => {
      userRepo.findFriendIds.mockResolvedValueOnce([BOB]);
      friendRequestRepo.findAllPendingForUser.mockResolvedValueOnce([
        { from: { toString: () => ALICE }, to: { toString: () => BOB } } as never
      ]);
      userRepo.searchByUsername.mockResolvedValueOnce([]);
      await service.searchUsers(ALICE, 'bob');
      const callArgs = userRepo.searchByUsername.mock.calls[0];
      expect(callArgs).toBeDefined();
      if (!callArgs) throw new Error('searchByUsername was not called');
      const excludeIds = callArgs[2];
      expect(excludeIds.filter((id) => id === BOB)).toHaveLength(1);
    });

    it('maps results to PublicProfile shape', async () => {
      const carolDoc = makeUserDoc({ id: CAROL, userName: 'carol', firstName: 'Carol' });
      userRepo.searchByUsername.mockResolvedValueOnce([carolDoc as never]);
      const results = await service.searchUsers(ALICE, 'car');
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        userId: CAROL,
        userName: 'carol',
        firstName: 'Carol',
        isProfilePrivate: false,
        avatarId: 'violet-reel'
      });
    });
  });
});
