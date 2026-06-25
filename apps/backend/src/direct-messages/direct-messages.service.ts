import { ForbiddenException, Injectable } from '@nestjs/common';

import type { DirectMessage } from '@repo/schemas/dm';

import { FriendsService } from '@/friends/friends.service';
import { DirectMessageRepository } from './direct-message.repository';
import type { DirectMessageDocument } from './direct-message.schema';

function docToDto(doc: DirectMessageDocument): DirectMessage {
  return {
    messageId: doc._id.toString(),
    conversationId: doc.conversationId,
    fromUserId: doc.from.toString(),
    content: doc.content,
    createdAt: doc.createdAt.toISOString()
  };
}

@Injectable()
export class DirectMessagesService {
  constructor(
    private readonly repo: DirectMessageRepository,
    private readonly friends: FriendsService
  ) {}

  async getHistory(viewerUserId: string, targetUserId: string): Promise<DirectMessage[]> {
    await this.assertFriends(viewerUserId, targetUserId);
    const docs = await this.repo.findConversation(viewerUserId, targetUserId, 50);
    return docs.map(docToDto);
  }

  async send(fromUserId: string, toUserId: string, content: string): Promise<DirectMessage> {
    await this.assertFriends(fromUserId, toUserId);
    const doc = await this.repo.create(fromUserId, toUserId, content);
    return docToDto(doc);
  }

  private async assertFriends(userA: string, userB: string): Promise<void> {
    const friends = await this.friends.getFriendList(userA);
    const isFriend = friends.some((f) => f.userId === userB);
    if (!isFriend) throw new ForbiddenException('Not friends');
  }
}
