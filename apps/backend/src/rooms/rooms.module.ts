import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomRecord, RoomSchema } from '@/rooms/room.schema';
import { RoomRepository } from '@/rooms/room.repository';
import { RoomsService } from '@/rooms/rooms.service';
import { RoomsController } from '@/rooms/rooms.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: RoomRecord.name, schema: RoomSchema }])],
  controllers: [RoomsController],
  providers: [RoomsService, RoomRepository],
  exports: [RoomRepository]
})
export class RoomsModule {}
