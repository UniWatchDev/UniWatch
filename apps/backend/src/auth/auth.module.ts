import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserRecord, UserSchema } from '@/auth/user.schema';
import { UserRepository } from '@/auth/user.repository';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { MailModule } from '@/mail/mail.module';

@Module({
  imports: [
    MailModule,
    MongooseModule.forFeature([{ name: UserRecord.name, schema: UserSchema }])
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, UserRepository],
  exports: [AuthService]
})
export class AuthModule {}
