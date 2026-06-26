import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { DirectMessageRecord, type DirectMessageDocument } from '@/direct-messages/direct-message.schema';

function buildConversationId(userA: string, userB: string): string {
  return [userA, userB].sort().join('_');
}

@Injectable()
export class DirectMessageRepository {
  constructor(
    @InjectModel(DirectMessageRecord.name)
    private readonly model: Model<DirectMessageDocument>
  ) {}

  create(from: string, to: string, content: string): Promise<DirectMessageDocument> {
    return new this.model({
      conversationId: buildConversationId(from, to),
      from: new Types.ObjectId(from),
      content,
    }).save();
  }

  /** Return the last `limit` messages for a conversation, oldest first. */
  async findConversation(
    userA: string,
    userB: string,
    limit = 50
  ): Promise<DirectMessageDocument[]> {
    const conversationId = buildConversationId(userA, userB);
    const docs = await this.model
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit);
    return docs.reverse();
  }
}
