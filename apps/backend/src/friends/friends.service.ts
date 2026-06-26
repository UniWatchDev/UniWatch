import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef
} from '@nestjs/common';

import { avatarPresetIdSchema, type PublicProfile } from '@repo/schemas/profile';
import type { FriendRequestResponse, SendFriendRequestResponse } from '@repo/schemas/friends';

import { UserRepository } from '@/auth/user.repository';
import type { UserDocument } from '@/auth/user.schema';
import { FRIEND_BROADCAST_PORT, type FriendBroadcastPort } from '@/realtime/friend-broadcast.port';
import { GlobalPresenceService } from '@/realtime/services/global-presence.service';
import { FriendRequestRepository } from './friend-request.repository';
import type { FriendRequestDocument } from './friend-request.schema';

function docToPublicProfile(doc: UserDocument): PublicProfile {
  return {
    userId: doc._id.toString(),
    userName: doc.userName,
    firstName: doc.firstName,
    ...(doc.lastName !== undefined && doc.lastName.length > 0 ? { lastName: doc.lastName } : {}),
    isProfilePrivate: doc.isProfilePrivate,
    avatarId: avatarPresetIdSchema.parse(doc.avatarId),
    createdAt: doc.createdAt.toISOString()
  };
}

function requestToResponse(req: FriendRequestDocument, fromDoc: UserDocument): FriendRequestResponse {
  return {
    requestId: req._id.toString(),
    from: docToPublicProfile(fromDoc),
    createdAt: req.createdAt.toISOString()
  };
}

@Injectable()
export class FriendsService {
  constructor(
    private readonly users: UserRepository,
    private readonly requests: FriendRequestRepository,
    @Inject(FRIEND_BROADCAST_PORT) private readonly broadcast: FriendBroadcastPort,
    @Inject(forwardRef(() => GlobalPresenceService)) private readonly presence: GlobalPresenceService
  ) {}

  async sendRequest(
    actorUserId: string,
    targetUserId: string
  ): Promise<SendFriendRequestResponse> {
    const friendIds = await this.users.findFriendIds(actorUserId);
    if (friendIds.includes(targetUserId)) {
      throw new ConflictException('Already friends');
    }

    const existing = await this.requests.findPendingBetween(actorUserId, targetUserId);

    // Mutual request: target already sent actor a request → auto-accept
    if (existing !== null && existing.from.toString() === targetUserId) {
      await this.acceptRequest(existing._id.toString());
      return { requestId: existing._id.toString() };
    }

    if (existing !== null) {
      throw new ConflictException('Friend request already sent');
    }

    const actor = await this.users.findById(actorUserId);
    if (!actor) throw new NotFoundException('User not found');

    const target = await this.users.findById(targetUserId);
    if (!target) throw new NotFoundException('Target user not found');

    const request = await this.requests.create(actorUserId, targetUserId);
    const requestId = request._id.toString();

    this.broadcast.notifyFriendRequest({
      targetUserId,
      requestId,
      requester: docToPublicProfile(actor)
    });

    return { requestId };
  }

  async respondToRequest(opts: {
    actorUserId: string;
    requestId: string;
    action: 'accept' | 'reject';
  }): Promise<void> {
    const { actorUserId, requestId, action } = opts;
    const req = await this.requests.findById(requestId);
    if (!req || req.status !== 'pending') throw new NotFoundException('Request not found');
    if (req.to.toString() !== actorUserId) throw new ForbiddenException('Not your request');

    if (action === 'reject') {
      await this.requests.deleteById(requestId);
      return;
    }

    await this.acceptRequest(requestId);
  }

  async getFriendList(userId: string): Promise<PublicProfile[]> {
    const ids = await this.users.findFriendIds(userId);
    if (ids.length === 0) return [];
    const docs = await this.users.findManyByIds(ids);
    return docs.map(docToPublicProfile);
  }

  async unfriend(actorUserId: string, targetUserId: string): Promise<void> {
    await Promise.all([
      this.users.removeFriend(actorUserId, targetUserId),
      this.users.removeFriend(targetUserId, actorUserId),
      this.requests.deleteByPair(actorUserId, targetUserId)
    ]);
  }

  async getPendingInbox(userId: string): Promise<FriendRequestResponse[]> {
    const requests = await this.requests.findPendingInbox(userId);
    if (requests.length === 0) return [];

    const senderIds = requests.map((r) => r.from.toString());
    const senders = await this.users.findManyByIds(senderIds);
    const senderMap = new Map(senders.map((s) => [s._id.toString(), s]));

    return requests.flatMap((req) => {
      const sender = senderMap.get(req.from.toString());
      if (!sender) return [];
      return [requestToResponse(req, sender)];
    });
  }

  /** Shared by sendRequest (mutual) and respondToRequest (accept). */
  private async acceptRequest(requestId: string): Promise<void> {
    const req = await this.requests.findById(requestId);
    if (!req) return;

    const fromId = req.from.toString();
    const toId = req.to.toString();

    await Promise.all([
      this.requests.setStatus(requestId, 'accepted'),
      this.users.addFriend(fromId, toId),
      this.users.addFriend(toId, fromId)
    ]);

    // Notify both parties — each receives the other's profile as `friend`.
    // If either user doc is missing (edge case), skip that party's notification gracefully.
    const [fromDoc, toDoc] = await Promise.all([
      this.users.findById(fromId),
      this.users.findById(toId)
    ]);

    if (toDoc) {
      // Notify the original requester (fromId) with the acceptor's profile
      this.broadcast.notifyRequestAccepted({
        targetUserId: fromId,
        requestId,
        friend: docToPublicProfile(toDoc)
      });
    }

    if (fromDoc) {
      // Notify the acceptor (toId) with the requester's profile
      this.broadcast.notifyRequestAccepted({
        targetUserId: toId,
        requestId,
        friend: docToPublicProfile(fromDoc)
      });
    }

    // Immediately sync presence so each new friend sees the other as
    // online/in-room without waiting for the next socket reconnect.
    if (fromDoc && this.presence.isOnline(fromId)) {
      const fromPresence = this.presence.getUserPresence(fromId);
      this.broadcast.notifyFriendsOnline({
        userId: fromId,
        userName: fromDoc.userName,
        avatarId: avatarPresetIdSchema.parse(fromDoc.avatarId),
        friendIds: [toId],
        ...(fromPresence.currentRoomId !== undefined ? { currentRoomId: fromPresence.currentRoomId } : {}),
        ...(fromPresence.currentRoomName !== undefined ? { currentRoomName: fromPresence.currentRoomName } : {})
      });
    }

    if (toDoc && this.presence.isOnline(toId)) {
      const toPresence = this.presence.getUserPresence(toId);
      this.broadcast.notifyFriendsOnline({
        userId: toId,
        userName: toDoc.userName,
        avatarId: avatarPresetIdSchema.parse(toDoc.avatarId),
        friendIds: [fromId],
        ...(toPresence.currentRoomId !== undefined ? { currentRoomId: toPresence.currentRoomId } : {}),
        ...(toPresence.currentRoomName !== undefined ? { currentRoomName: toPresence.currentRoomName } : {})
      });
    }
  }
}
