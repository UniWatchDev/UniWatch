import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';

import { avatarPresetIdSchema, type PublicProfile } from '@repo/schemas/profile';
import type { FriendRequestResponse, SendFriendRequestResponse } from '@repo/schemas/friends';

import { UserRepository } from '@/auth/user.repository';
import type { UserDocument } from '@/auth/user.schema';
import { FRIEND_BROADCAST_PORT, type FriendBroadcastPort } from '@/realtime/friend-broadcast.port';
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
    @Inject(FRIEND_BROADCAST_PORT) private readonly broadcast: FriendBroadcastPort
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
      await this.acceptRequest(existing._id.toString(), targetUserId);
      return { requestId: existing._id.toString() };
    }

    if (existing !== null) {
      throw new ConflictException('Friend request already sent');
    }

    const actor = await this.users.findById(actorUserId);
    if (!actor) throw new NotFoundException('User not found');

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
      await this.requests.setStatus(requestId, 'rejected');
      return;
    }

    await this.acceptRequest(requestId, actorUserId);
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
      this.users.removeFriend(targetUserId, actorUserId)
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
  private async acceptRequest(requestId: string, acceptorUserId: string): Promise<void> {
    const req = await this.requests.findById(requestId);
    if (!req) return;

    const fromId = req.from.toString();
    const toId = req.to.toString();

    await Promise.all([
      this.requests.setStatus(requestId, 'accepted'),
      this.users.addFriend(fromId, toId),
      this.users.addFriend(toId, fromId)
    ]);

    // Notify the person who sent the original request
    const acceptorDoc = await this.users.findById(acceptorUserId);
    if (acceptorDoc) {
      const notifyUserId = acceptorUserId === toId ? fromId : toId;
      this.broadcast.notifyRequestAccepted({
        targetUserId: notifyUserId,
        requestId,
        friend: docToPublicProfile(acceptorDoc)
      });
    }
  }
}
