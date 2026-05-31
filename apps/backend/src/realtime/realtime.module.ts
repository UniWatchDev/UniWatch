import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { RoomsModule } from '@/rooms/rooms.module';

import { RealtimeGateway } from './realtime.gateway';
import { RoomStateService } from './services/room-state.service';
import { SocketAuthService } from './services/socket-auth.service';

@Module({
  imports: [AuthModule, RoomsModule],
  providers: [RealtimeGateway, RoomStateService, SocketAuthService]
})
export class RealtimeModule {}
