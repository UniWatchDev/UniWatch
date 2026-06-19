import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { MoviesModule } from '@/movies/movies.module';
import { AuthModule } from '@/auth/auth.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { RoomRecord, RoomSchema } from '@/rooms/room.schema';
import { RoomRepository } from '@/rooms/room.repository';
import { RoomsService } from '@/rooms/rooms.service';
import { RoomsController } from '@/rooms/rooms.controller';
import { RoomCleanupService } from '@/rooms/room-cleanup.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    MoviesModule,
    forwardRef(() => RealtimeModule),
    MongooseModule.forFeature([{ name: RoomRecord.name, schema: RoomSchema }])
  ],
  controllers: [RoomsController],
  providers: [RoomsService, RoomRepository, RoomCleanupService],
  exports: [RoomRepository]
})
export class RoomsModule {}
