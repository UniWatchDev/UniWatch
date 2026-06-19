import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { ConnectionRegistryService } from '@/realtime/services/connection-registry.service';
import type { SocketUserInfo } from '@/realtime/realtime.types';

type AuthenticatedSocketData = { user?: SocketUserInfo };

/**
 * Rejects message handlers whose socket has no authenticated identity and
 * attaches the resolved user to `socket.data` for the handler to read.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly registry: ConnectionRegistryService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const user = this.registry.getUser(client.id);
    if (!user) {
      throw new WsException('Unauthorized');
    }
    (client.data as AuthenticatedSocketData).user = user;
    return true;
  }
}

/** Read the user the {@link WsAuthGuard} attached, narrowing the optional away. */
export function getAuthenticatedUser(socket: Socket): SocketUserInfo {
  const user = (socket.data as AuthenticatedSocketData).user;
  if (!user) {
    throw new WsException('Unauthorized');
  }
  return user;
}
