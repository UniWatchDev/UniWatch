import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import {
  FriendRequestRecord,
  type FriendRequestDocument,
  type FriendRequestStatus,
} from '@/friends/friend-request.schema';

@Injectable()
export class FriendRequestRepository {
  constructor(
    @InjectModel(FriendRequestRecord.name)
    private readonly model: Model<FriendRequestDocument>
  ) {}

  create(from: string, to: string): Promise<FriendRequestDocument> {
    return new this.model({
      from: new Types.ObjectId(from),
      to: new Types.ObjectId(to),
      status: 'pending',
    }).save();
  }

  /** Find any pending request between two users in either direction. */
  findPendingBetween(userA: string, userB: string): Promise<FriendRequestDocument | null> {
    return this.model.findOne({
      status: 'pending',
      $or: [
        { from: new Types.ObjectId(userA), to: new Types.ObjectId(userB) },
        { from: new Types.ObjectId(userB), to: new Types.ObjectId(userA) },
      ],
    });
  }

  /** Find all pending requests where `toUserId` is the recipient. */
  findPendingInbox(toUserId: string): Promise<FriendRequestDocument[]> {
    return this.model
      .find({
        to: new Types.ObjectId(toUserId),
        status: 'pending',
      })
      .sort({ createdAt: -1 });
  }

  /**
   * Find all pending requests where `userId` is either the sender or recipient.
   * Used by Task 9 (UsersService) to resolve pending friend requests for a user.
   */
  findAllPendingForUser(userId: string): Promise<FriendRequestDocument[]> {
    const uid = new Types.ObjectId(userId);
    return this.model
      .find({
        status: 'pending',
        $or: [{ from: uid }, { to: uid }],
      })
      .sort({ createdAt: -1 });
  }

  findById(id: string): Promise<FriendRequestDocument | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return this.model.findById(id);
  }

  setStatus(id: string, status: FriendRequestStatus): Promise<FriendRequestDocument | null> {
    return this.model.findByIdAndUpdate(id, { $set: { status } }, { returnDocument: 'after' });
  }

  deleteById(id: string): Promise<void> {
    return this.model.deleteOne({ _id: id }).then(() => undefined);
  }

  deleteByPair(userA: string, userB: string): Promise<void> {
    const a = new Types.ObjectId(userA);
    const b = new Types.ObjectId(userB);
    return this.model
      .deleteMany({
        $or: [
          { from: a, to: b },
          { from: b, to: a }
        ]
      })
      .then(() => undefined);
  }
}
