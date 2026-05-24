import { Injectable, NotFoundException } from '@nestjs/common';

import {
  avatarPresetIdSchema,
  type GetUserProfileResponse,
  type PublicProfile
} from '@repo/schemas/profile';

import { UserRepository } from '@/auth/user.repository';
import type { UserDocument } from '@/auth/user.schema';

function userToPublicProfile(doc: UserDocument): PublicProfile {
  const userId = doc._id.toString();
  return {
    userId,
    userName: doc.userName,
    firstName: doc.firstName,
    ...(doc.lastName !== undefined && doc.lastName.length > 0
      ? { lastName: doc.lastName }
      : {}),
    isProfilePrivate: doc.isProfilePrivate,
    avatarId: avatarPresetIdSchema.parse(doc.avatarId),
    createdAt: doc.createdAt.toISOString()
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  async getProfileByUserName(
    viewerUserId: string,
    userName: string
  ): Promise<GetUserProfileResponse> {
    const doc = await this.users.findByUserName(userName);
    if (doc === null) {
      throw new NotFoundException('User not found');
    }

    const viewerIsOwner = doc._id.toString() === viewerUserId;
    return {
      profile: userToPublicProfile(doc),
      viewerIsOwner
    };
  }
}
