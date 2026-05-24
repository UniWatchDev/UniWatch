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
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
