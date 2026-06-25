import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { DirectMessagesModule } from '@/direct-messages/direct-messages.module';
import { FriendsModule } from '@/friends/friends.module';
import { RoomsModule } from '@/rooms/rooms.module';

import { FRIEND_BROADCAST_PORT } from '@/realtime/friend-broadcast.port';
import { REALTIME_BROADCAST_PORT } from '@/realtime/realtime.broadcast-port';
import { FriendGatewayHandler } from './handlers/friend-gateway.handler';
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
  imports: [
    AuthModule,
    forwardRef(() => RoomsModule),
    forwardRef(() => FriendsModule),
    forwardRef(() => DirectMessagesModule)
  ],
  providers: [
    RealtimeGateway,
    FriendGatewayHandler,
    RoomStateService,
    SocketAuthService,
    ConnectionRegistryService,
    GlobalPresenceService,
    FriendBroadcastService,
    PlaybackCountdownService,
    RealtimeBroadcastService,
    RoomMovieChangeService,
    RoomModerationService,
    WsAuthGuard,
    { provide: REALTIME_BROADCAST_PORT, useExisting: RealtimeBroadcastService },
    { provide: FRIEND_BROADCAST_PORT, useExisting: FriendBroadcastService }
  ],
  exports: [
    RoomStateService,
    REALTIME_BROADCAST_PORT,
    RoomMovieChangeService,
    GlobalPresenceService,
    FriendBroadcastService,
    FRIEND_BROADCAST_PORT
  ]
})
export class RealtimeModule {}
