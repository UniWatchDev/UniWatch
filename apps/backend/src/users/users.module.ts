import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { FriendsModule } from '@/friends/friends.module';
import { UsersController } from '@/users/users.controller';
import { UsersService } from '@/users/users.service';

@Module({
  imports: [AuthModule, forwardRef(() => FriendsModule)],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
