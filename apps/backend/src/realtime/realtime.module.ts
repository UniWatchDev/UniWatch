import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { RoomsModule } from '@/rooms/rooms.module';

import { REALTIME_BROADCAST_PORT } from '@/realtime/realtime.broadcast-port';
import { RealtimeGateway } from './realtime.gateway';
import { ConnectionRegistryService } from './services/connection-registry.service';
import { FriendBroadcastService } from './services/friend-broadcast.service';
import { GlobalPresenceService } from './services/global-presence.service';
import { PlaybackCountdownService } from './services/playback-countdown.service';
import { RealtimeBroadcastService } from './services/realtime-broadcast.service';
import { RoomMovieChangeService } from './services/room-movie-change.service';
import { RoomModerationService } from './services/room-moderation.service';
import { RoomStateService } from './services/room-state.service';
import { SocketAuthService } from './services/socket-auth.service';
import { WsAuthGuard } from './ws-auth.guard';

@Module({
  imports: [AuthModule, forwardRef(() => RoomsModule)],
  providers: [
    RealtimeGateway,
    RoomStateService,
    SocketAuthService,
    ConnectionRegistryService,
    PlaybackCountdownService,
    RealtimeBroadcastService,
    RoomMovieChangeService,
    RoomModerationService,
    WsAuthGuard,
    GlobalPresenceService,
    FriendBroadcastService,
    { provide: REALTIME_BROADCAST_PORT, useExisting: RealtimeBroadcastService }
  ],
  exports: [RoomStateService, REALTIME_BROADCAST_PORT, RoomMovieChangeService, GlobalPresenceService]
})
export class RealtimeModule {}
