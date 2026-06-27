import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '@/auth/auth.module';
import { RealtimeModule } from '@/realtime/realtime.module';

import { FriendRequestRecord, FriendRequestSchema } from './friend-request.schema';
import { FriendRequestRepository } from './friend-request.repository';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FriendRequestRecord.name, schema: FriendRequestSchema }]),
    AuthModule,
    forwardRef(() => RealtimeModule)
  ],
  controllers: [FriendsController],
  providers: [FriendRequestRepository, FriendsService],
  exports: [FriendsService, FriendRequestRepository]
})
export class FriendsModule {}
