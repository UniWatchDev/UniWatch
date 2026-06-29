import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RefreshSessionRecord, RefreshSessionSchema } from '@/auth/refresh-session.schema';
import { RefreshSessionRepository } from '@/auth/refresh-session.repository';
import { UserRecord, UserSchema } from '@/auth/user.schema';
import { UserRepository } from '@/auth/user.repository';
import { AdminGuard } from '@/auth/admin.guard';
import { AdminRoleService } from '@/auth/admin-role.service';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { MailModule } from '@/mail/mail.module';

@Module({
  imports: [
    MailModule,
    MongooseModule.forFeature([
      { name: UserRecord.name, schema: UserSchema },
      { name: RefreshSessionRecord.name, schema: RefreshSessionSchema }
    ])
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminGuard, AdminRoleService, UserRepository, RefreshSessionRepository],
  exports: [AuthService, JwtAuthGuard, AdminGuard, AdminRoleService, UserRepository]
})
export class AuthModule {}
