import { Injectable, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '@/auth/auth.module';
import { FRIEND_BROADCAST_PORT, type FriendBroadcastPort } from '@/realtime/friend-broadcast.port';

import { FriendRequestRecord, FriendRequestSchema } from './friend-request.schema';
import { FriendRequestRepository } from './friend-request.repository';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

/**
 * No-op stub for FRIEND_BROADCAST_PORT.
 * Replaced in Task 11 when AppModule wires the real FriendBroadcastService
 * from RealtimeModule (which imports FriendsModule via forwardRef).
 */
@Injectable()
class NullFriendBroadcastService implements FriendBroadcastPort {
  notifyFriendRequest(): void {}
  notifyRequestAccepted(): void {}
}

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FriendRequestRecord.name, schema: FriendRequestSchema }]),
    AuthModule
  ],
  controllers: [FriendsController],
  providers: [
    FriendRequestRepository,
    FriendsService,
    NullFriendBroadcastService,
    { provide: FRIEND_BROADCAST_PORT, useExisting: NullFriendBroadcastService }
  ],
  exports: [FriendsService, FriendRequestRepository]
})
export class FriendsModule {}
