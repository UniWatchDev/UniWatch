import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { RoomsModule } from '@/rooms/rooms.module';

import { RealtimeGateway } from './realtime.gateway';
import { RoomStateService } from './services/room-state.service';
import { SocketAuthService } from './services/socket-auth.service';

@Module({
  imports: [AuthModule, forwardRef(() => RoomsModule)],
  providers: [RealtimeGateway, RoomStateService, SocketAuthService],
  exports: [RealtimeGateway, RoomStateService]
})
export class RealtimeModule {}
