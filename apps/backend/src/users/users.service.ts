import { Injectable, NotFoundException } from '@nestjs/common';

import {
  avatarPresetIdSchema,
  type GetUserProfileResponse,
  type PublicProfile,
  type UserSearchResponse
} from '@repo/schemas/profile';

import { UserRepository } from '@/auth/user.repository';
import type { UserDocument } from '@/auth/user.schema';
import { FriendRequestRepository } from '@/friends/friend-request.repository';

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
  constructor(
    private readonly users: UserRepository,
    private readonly friendRequests: FriendRequestRepository
  ) {}

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

  async searchUsers(viewerUserId: string, q: string): Promise<UserSearchResponse> {
    const [friendIds, pendingRequests] = await Promise.all([
      this.users.findFriendIds(viewerUserId),
      this.friendRequests.findAllPendingForUser(viewerUserId)
    ]);

    const pendingUserIds = pendingRequests.map((r) =>
      r.from.toString() === viewerUserId ? r.to.toString() : r.from.toString()
    );
    const excludeIds = [...new Set([...friendIds, ...pendingUserIds])];

    const docs = await this.users.searchByUsername(viewerUserId, q, excludeIds);
    return docs.map(userToPublicProfile);
  }
}
