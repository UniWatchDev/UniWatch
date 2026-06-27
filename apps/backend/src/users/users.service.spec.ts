import { Test } from '@nestjs/testing';

import { UserRepository } from '@/auth/user.repository';
import { FriendRequestRepository } from '@/friends/friend-request.repository';
import { GlobalPresenceService } from '@/realtime/services/global-presence.service';
import { RoomRepository } from '@/rooms/room.repository';
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
  let presenceService: jest.Mocked<GlobalPresenceService>;
  let roomRepo: jest.Mocked<RoomRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: {
            findByUserName: jest.fn(),
            findFriendIds: jest.fn().mockResolvedValue([]),
            searchByUsername: jest.fn().mockResolvedValue([]),
            findManyByIds: jest.fn().mockResolvedValue([]),
            findMutualFriendCounts: jest.fn().mockResolvedValue(new Map())
          }
        },
        {
          provide: FriendRequestRepository,
          useValue: {
            findAllPendingForUser: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: GlobalPresenceService,
          useValue: {
            getOnlineUserIds: jest.fn().mockReturnValue([]),
            getUserPresence: jest.fn().mockReturnValue({ isOnline: true })
          }
        },
        {
          provide: RoomRepository,
          useValue: {
            findTypesByIds: jest.fn().mockResolvedValue(new Map())
          }
        }
      ]
    }).compile();

    service = module.get(UsersService);
    userRepo = module.get<jest.Mocked<UserRepository>>(UserRepository);
    friendRequestRepo = module.get<jest.Mocked<FriendRequestRepository>>(FriendRequestRepository);
    presenceService = module.get<jest.Mocked<GlobalPresenceService>>(GlobalPresenceService);
    roomRepo = module.get<jest.Mocked<RoomRepository>>(RoomRepository);
  });

  describe('getActiveUsers', () => {
    it('returns empty array when no users are online', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([]);
      const result = await service.getActiveUsers(ALICE);
      expect(result).toEqual([]);
    });

    it('excludes self from results', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([ALICE]);
      const result = await service.getActiveUsers(ALICE);
      expect(result).toEqual([]);
    });

    it('returns friend with friendshipStatus "friend"', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([BOB]);
      userRepo.findManyByIds.mockResolvedValue([makeUserDoc({ id: BOB, userName: 'bob' })] as never);
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      presenceService.getUserPresence.mockReturnValue({ isOnline: true });

      const result = await service.getActiveUsers(ALICE);
      expect(result).toHaveLength(1);
      expect(result[0]?.friendshipStatus).toBe('friend');
      expect(result[0]?.mutualFriendsCount).toBe(0);
    });

    it('returns stranger with friendshipStatus "none" and mutual count', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([CAROL]);
      userRepo.findManyByIds.mockResolvedValue([makeUserDoc({ id: CAROL, userName: 'carol' })] as never);
      userRepo.findFriendIds.mockResolvedValue([]);
      userRepo.findMutualFriendCounts.mockResolvedValue(new Map([[CAROL, 2]]));
      presenceService.getUserPresence.mockReturnValue({ isOnline: true });

      const result = await service.getActiveUsers(ALICE);
      expect(result[0]?.friendshipStatus).toBe('none');
      expect(result[0]?.mutualFriendsCount).toBe(2);
    });

    it('returns pending_sent user with friendshipStatus "pending_sent"', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([CAROL]);
      userRepo.findManyByIds.mockResolvedValue([makeUserDoc({ id: CAROL, userName: 'carol' })] as never);
      userRepo.findFriendIds.mockResolvedValue([]);
      friendRequestRepo.findAllPendingForUser.mockResolvedValue([
        { from: { toString: () => ALICE }, to: { toString: () => CAROL } } as never
      ]);
      presenceService.getUserPresence.mockReturnValue({ isOnline: true });

      const result = await service.getActiveUsers(ALICE);
      expect(result[0]?.friendshipStatus).toBe('pending_sent');
    });

    it('places friends before strangers', async () => {
      presenceService.getOnlineUserIds.mockReturnValue([CAROL, BOB]);
      userRepo.findManyByIds.mockResolvedValue([
        makeUserDoc({ id: CAROL, userName: 'carol' }),
        makeUserDoc({ id: BOB, userName: 'bob' })
      ] as never);
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      presenceService.getUserPresence.mockReturnValue({ isOnline: true });

      const result = await service.getActiveUsers(ALICE);
      expect(result[0]?.userId).toBe(BOB);
      expect(result[1]?.userId).toBe(CAROL);
    });

    it('attaches currentRoom when user is in a public room', async () => {
      const ROOM_ID = 'r'.repeat(24);
      presenceService.getOnlineUserIds.mockReturnValue([BOB]);
      userRepo.findManyByIds.mockResolvedValue([makeUserDoc({ id: BOB })] as never);
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      presenceService.getUserPresence.mockReturnValue({
        isOnline: true,
        currentRoomId: ROOM_ID,
        currentRoomName: 'Movie Night'
      });
      roomRepo.findTypesByIds.mockResolvedValue(new Map([[ROOM_ID, 'public']]));

      const result = await service.getActiveUsers(ALICE);
      expect(result[0]?.currentRoom).toEqual({
        roomId: ROOM_ID,
        roomName: 'Movie Night',
        roomType: 'public'
      });
    });
  });

  describe('searchUsers', () => {
    it('returns friends in search results with friendshipStatus "friend"', async () => {
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      userRepo.searchByUsername.mockResolvedValue([makeUserDoc({ id: BOB, userName: 'bob' })] as never);

      const results = await service.searchUsers(ALICE, 'bob');
      expect(results[0]?.friendshipStatus).toBe('friend');
    });

    it('passes empty excludeIds so friends are included', async () => {
      userRepo.findFriendIds.mockResolvedValue([BOB]);
      userRepo.searchByUsername.mockResolvedValue([]);

      await service.searchUsers(ALICE, 'b');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepo.searchByUsername).toHaveBeenCalledWith(ALICE, 'b', []);
    });

    it('returns currentRoom as null for all search results', async () => {
      userRepo.searchByUsername.mockResolvedValue([makeUserDoc({ id: CAROL })] as never);
      const results = await service.searchUsers(ALICE, 'c');
      expect(results[0]?.currentRoom).toBeNull();
    });

    it('returns stranger with mutualFriendsCount', async () => {
      userRepo.searchByUsername.mockResolvedValue([makeUserDoc({ id: CAROL })] as never);
      userRepo.findMutualFriendCounts.mockResolvedValue(new Map([[CAROL, 3]]));

      const results = await service.searchUsers(ALICE, 'c');
      expect(results[0]?.mutualFriendsCount).toBe(3);
    });
  });
});
