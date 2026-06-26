import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { DirectMessage } from '@repo/schemas/dm';
import type { AvatarPresetId } from '@repo/schemas/profile';

import { FriendsService } from '@/friends/friends.service';
import { DirectMessageRepository } from './direct-message.repository';
import { DirectMessagesService } from './direct-messages.service';

const ALICE = '000000000000000000000001';
const BOB   = '000000000000000000000002';

const BOB_PROFILE = {
  userId: BOB,
  userName: 'bob',
  firstName: 'Bob',
  isProfilePrivate: false,
  avatarId: 'violet-reel' as AvatarPresetId,
  createdAt: new Date().toISOString()
};

describe('DirectMessagesService', () => {
  let service: DirectMessagesService;
  let repo: jest.Mocked<DirectMessageRepository>;
  let friendsService: jest.Mocked<FriendsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DirectMessagesService,
        {
          provide: DirectMessageRepository,
          useValue: {
            create: jest.fn(),
            findConversation: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: FriendsService,
          useValue: {
            getFriendList: jest.fn().mockResolvedValue([])
          }
        }
      ]
    }).compile();

    service = module.get(DirectMessagesService);
    repo = module.get<jest.Mocked<DirectMessageRepository>>(DirectMessageRepository);
    friendsService = module.get<jest.Mocked<FriendsService>>(FriendsService);
  });

  describe('friendship gate', () => {
    it('getHistory throws ForbiddenException when users are not friends', async () => {
      friendsService.getFriendList.mockResolvedValueOnce([]);
      await expect(service.getHistory(ALICE, BOB)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('send throws ForbiddenException when users are not friends', async () => {
      friendsService.getFriendList.mockResolvedValueOnce([]);
      await expect(service.send(ALICE, BOB, 'hello')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('getHistory returns messages when users are friends', async () => {
      friendsService.getFriendList.mockResolvedValueOnce([BOB_PROFILE]);
      repo.findConversation.mockResolvedValueOnce([]);

      const result = await service.getHistory(ALICE, BOB);
      expect(result).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.findConversation).toHaveBeenCalledWith(ALICE, BOB, 50);
    });

    it('send creates message when users are friends', async () => {
      friendsService.getFriendList.mockResolvedValueOnce([BOB_PROFILE]);

      const fakeDoc = {
        _id: { toString: () => 'msg001' },
        conversationId: `${ALICE}_${BOB}`,
        from: { toString: () => ALICE },
        content: 'hello',
        createdAt: new Date('2025-01-01T00:00:00.000Z')
      };
      repo.create.mockResolvedValueOnce(fakeDoc as never);

      const result = await service.send(ALICE, BOB, 'hello');
      const expected: DirectMessage = {
        messageId: 'msg001',
        conversationId: `${ALICE}_${BOB}`,
        fromUserId: ALICE,
        content: 'hello',
        createdAt: '2025-01-01T00:00:00.000Z'
      };
      expect(result).toEqual(expected);
    });
  });
});
