import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FriendsModule } from '@/friends/friends.module';

import { DirectMessageRecord, DirectMessageSchema } from './direct-message.schema';
import { DirectMessageRepository } from './direct-message.repository';
import { DirectMessagesController } from './direct-messages.controller';
import { DirectMessagesService } from './direct-messages.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DirectMessageRecord.name, schema: DirectMessageSchema }]),
    forwardRef(() => FriendsModule)
  ],
  controllers: [DirectMessagesController],
  providers: [DirectMessageRepository, DirectMessagesService],
  exports: [DirectMessagesService]
})
export class DirectMessagesModule {}
