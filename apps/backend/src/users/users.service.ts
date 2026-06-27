import { Injectable, NotFoundException } from '@nestjs/common';

import {
  avatarPresetIdSchema,
  type ActiveUser,
  type FriendshipStatus,
  type GetUserProfileResponse,
  type PublicProfile,
  type UserSearchResponse
} from '@repo/schemas/profile';

import { UserRepository } from '@/auth/user.repository';
import type { UserDocument } from '@/auth/user.schema';
import { FriendRequestRepository } from '@/friends/friend-request.repository';
import { GlobalPresenceService } from '@/realtime/services/global-presence.service';
import { RoomRepository } from '@/rooms/room.repository';

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

function docToActiveUser(
  doc: UserDocument,
  friendshipStatus: FriendshipStatus,
  mutualFriendsCount: number,
  currentRoom: ActiveUser['currentRoom']
): ActiveUser {
  return {
    userId: doc._id.toString(),
    userName: doc.userName,
    firstName: doc.firstName,
    avatarId: avatarPresetIdSchema.parse(doc.avatarId),
    friendshipStatus,
    mutualFriendsCount,
    currentRoom
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UserRepository,
    private readonly friendRequests: FriendRequestRepository,
    private readonly presence: GlobalPresenceService,
    private readonly rooms: RoomRepository
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
    return { profile: userToPublicProfile(doc), viewerIsOwner };
  }

  async getActiveUsers(currentUserId: string): Promise<ActiveUser[]> {
    const onlineIds = this.presence
      .getOnlineUserIds()
      .filter((id) => id !== currentUserId);

    if (onlineIds.length === 0) return [];

    const [profiles, friendIds, pendingRequests] = await Promise.all([
      this.users.findManyByIds(onlineIds),
      this.users.findFriendIds(currentUserId),
      this.friendRequests.findAllPendingForUser(currentUserId)
    ]);

    const friendIdSet = new Set(friendIds);
    const pendingSentIds = new Set(
      pendingRequests
        .filter((r) => r.from.toString() === currentUserId)
        .map((r) => r.to.toString())
    );

    const strangerIds = onlineIds.filter(
      (id) => !friendIdSet.has(id) && !pendingSentIds.has(id)
    );

    const [mutualCounts, roomTypes] = await Promise.all([
      this.users.findMutualFriendCounts(strangerIds, friendIds),
      this.resolveRoomTypes(onlineIds)
    ]);

    const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]));

    const result: ActiveUser[] = [];
    for (const id of onlineIds) {
      const doc = profileMap.get(id);
      if (doc === undefined) continue;

      const fs: FriendshipStatus = friendIdSet.has(id)
        ? 'friend'
        : pendingSentIds.has(id)
        ? 'pending_sent'
        : 'none';

      const presence = this.presence.getUserPresence(id);
      const currentRoom =
        presence.currentRoomId !== undefined &&
        presence.currentRoomName !== undefined
          ? {
              roomId: presence.currentRoomId,
              roomName: presence.currentRoomName,
              roomType: roomTypes.get(presence.currentRoomId) ?? ('private' as const)
            }
          : null;

      result.push(
        docToActiveUser(doc, fs, fs === 'none' ? (mutualCounts.get(id) ?? 0) : 0, currentRoom)
      );
    }

    return result.sort((a, b) => {
      if (a.friendshipStatus === 'friend' && b.friendshipStatus !== 'friend') return -1;
      if (a.friendshipStatus !== 'friend' && b.friendshipStatus === 'friend') return 1;
      return 0;
    });
  }

  async searchUsers(viewerUserId: string, q: string): Promise<UserSearchResponse> {
    const [friendIds, pendingRequests, docs] = await Promise.all([
      this.users.findFriendIds(viewerUserId),
      this.friendRequests.findAllPendingForUser(viewerUserId),
      this.users.searchByUsername(viewerUserId, q, [])
    ]);

    const friendIdSet = new Set(friendIds);
    const pendingSentIds = new Set(
      pendingRequests
        .filter((r) => r.from.toString() === viewerUserId)
        .map((r) => r.to.toString())
    );

    const strangerDocIds = docs
      .map((d) => d._id.toString())
      .filter((id) => !friendIdSet.has(id) && !pendingSentIds.has(id));

    const mutualCounts = await this.users.findMutualFriendCounts(strangerDocIds, friendIds);

    return docs.map((doc) => {
      const id = doc._id.toString();
      const fs: FriendshipStatus = friendIdSet.has(id)
        ? 'friend'
        : pendingSentIds.has(id)
        ? 'pending_sent'
        : 'none';
      return docToActiveUser(
        doc,
        fs,
        fs === 'none' ? (mutualCounts.get(id) ?? 0) : 0,
        null
      );
    });
  }

  private async resolveRoomTypes(userIds: string[]): Promise<Map<string, 'public' | 'private'>> {
    const roomIds = [
      ...new Set(
        userIds
          .map((id) => this.presence.getUserPresence(id).currentRoomId)
          .filter((id): id is string => id !== undefined)
      )
    ];
    if (roomIds.length === 0) return new Map();
    return this.rooms.findTypesByIds(roomIds);
  }
}
