import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RefreshSessionRecord, RefreshSessionSchema } from '@/auth/refresh-session.schema';
import { RefreshSessionRepository } from '@/auth/refresh-session.repository';
import { UserRecord, UserSchema } from '@/auth/user.schema';
import { UserRepository } from '@/auth/user.repository';
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
  providers: [AuthService, JwtAuthGuard, UserRepository, RefreshSessionRepository],
  exports: [AuthService, JwtAuthGuard]
})
export class AuthModule {}
