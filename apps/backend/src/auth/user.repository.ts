import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { UserRecord, type UserDocument } from '@/auth/user.schema';

export type CreateUserInput = {
  email: string;
  userName: string;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  passwordHash: string;
  emailVerificationCode: string;
  emailVerificationExpiresAt: Date;
};

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(UserRecord.name) private readonly model: Model<UserDocument>
  ) {}

  findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return Promise.resolve(null);
    }
    return this.model.findById(id);
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email });
  }

  findByUserName(userName: string): Promise<UserDocument | null> {
    return this.model.findOne({ userName: new RegExp(`^${escapeRegex(userName)}$`, 'i') });
  }

  findByIdentifier(identifier: string): Promise<UserDocument | null> {
    if (identifier.includes('@')) return this.findByEmail(identifier);
    return this.findByUserName(identifier);
  }

  findByPasswordResetTokenHash(hash: string): Promise<UserDocument | null> {
    return this.model.findOne({ passwordResetTokenHash: hash });
  }

  create(data: CreateUserInput): Promise<UserDocument> {
    return new this.model({
      email: data.email,
      userName: data.userName,
      firstName: data.firstName,
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      phoneNumber: data.phoneNumber,
      passwordHash: data.passwordHash,
      emailVerificationCode: data.emailVerificationCode,
      emailVerificationExpiresAt: data.emailVerificationExpiresAt,
      emailVerified: false,
      passwordVersion: 0
    }).save();
  }

  setEmailVerificationChallenge(
    id: string,
    code: string,
    expiresAt: Date
  ): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        $set: {
          emailVerificationCode: code,
          emailVerificationExpiresAt: expiresAt
        }
      },
      { returnDocument: 'after' }
    );
  }

  markEmailVerified(id: string): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        $set: { emailVerified: true },
        $unset: {
          emailVerificationCode: '',
          emailVerificationExpiresAt: ''
        }
      },
      { returnDocument: 'after' }
    );
  }

  setPasswordResetChallenge(
    id: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt
        }
      },
      { returnDocument: 'after' }
    );
  }

  clearPasswordResetChallenge(id: string): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        $unset: {
          passwordResetTokenHash: '',
          passwordResetExpiresAt: ''
        }
      },
      { returnDocument: 'after' }
    );
  }

  updatePassword(id: string, passwordHash: string): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        $set: { passwordHash },
        $inc: { passwordVersion: 1 }
      },
      { returnDocument: 'after' }
    );
  }

  /** Password reset: bump version, set hash, clear reset token fields. */
  updateProfile(
    id: string,
    data: {
      firstName: string;
      lastName?: string | undefined;
      phoneNumber: string;
      isProfilePrivate: boolean;
      avatarId: string;
    }
  ): Promise<UserDocument | null> {
    const setFields: Record<string, string | boolean> = {
      firstName: data.firstName,
      phoneNumber: data.phoneNumber,
      isProfilePrivate: data.isProfilePrivate,
      avatarId: data.avatarId
    };
    const update: {
      $set: Record<string, string | boolean>;
      $unset?: Record<string, ''>;
    } = { $set: setFields };

    if (data.lastName === undefined) {
      update.$unset = { lastName: '' };
    } else {
      setFields['lastName'] = data.lastName;
    }

    return this.model.findByIdAndUpdate(id, update, { returnDocument: 'after' });
  }

  completePasswordReset(id: string, passwordHash: string): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        $set: { passwordHash },
        $unset: {
          passwordResetTokenHash: '',
          passwordResetExpiresAt: ''
        },
        $inc: { passwordVersion: 1 }
      },
      { returnDocument: 'after' }
    );
  }

  /** Push `friendId` into `userId`'s friends array (no-op if already present). */
  addFriend(userId: string, friendId: string): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(
      userId,
      { $addToSet: { friends: new Types.ObjectId(friendId) } },
      { returnDocument: 'after' }
    );
  }

  /** Pull `friendId` from `userId`'s friends array. */
  removeFriend(userId: string, friendId: string): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(
      userId,
      { $pull: { friends: new Types.ObjectId(friendId) } },
      { returnDocument: 'after' }
    );
  }

  /** Return just the friends array as strings. */
  async findFriendIds(userId: string): Promise<string[]> {
    const doc = await this.model.findById(userId).select('friends').lean();
    if (!doc) return [];
    const friends = (doc as { friends?: Types.ObjectId[] | null }).friends;
    return (friends ?? []).map((id) => id.toString());
  }

  setIsAdmin(id: string, isAdmin: boolean): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return Promise.resolve(null);
    }
    return this.model.findByIdAndUpdate(id, { $set: { isAdmin } }, { returnDocument: 'after' });
  }

  async promoteEmailsToAdmin(emails: string[]): Promise<number> {
    if (emails.length === 0) {
      return 0;
    }
    const result = await this.model.updateMany(
      { email: { $in: emails }, isAdmin: { $ne: true } },
      { $set: { isAdmin: true } }
    );
    return result.modifiedCount;
  }

  async demoteAdminsNotInEmails(emails: string[]): Promise<number> {
    const filter =
      emails.length === 0
        ? { isAdmin: true }
        : { isAdmin: true, email: { $nin: emails } };
    const result = await this.model.updateMany(filter, { $set: { isAdmin: false } });
    return result.modifiedCount;
  }

  /** Fetch multiple users by id in one query. */
  findManyByIds(ids: string[]): Promise<UserDocument[]> {
    const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    return this.model.find({ _id: { $in: objectIds } });
  }

  /**
   * Case-insensitive partial match on userName.
   * Excludes: private profiles, the viewer themselves, and any ids in excludeIds.
   */
  searchByUsername(
    viewerUserId: string,
    q: string,
    excludeIds: string[]
  ): Promise<UserDocument[]> {
    const excludeObjectIds = [viewerUserId, ...excludeIds]
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    return this.model
      .find({
        userName: new RegExp(escapeRegex(q), 'i'),
        isProfilePrivate: { $ne: true },
        _id: { $nin: excludeObjectIds }
      })
      .limit(20);
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
