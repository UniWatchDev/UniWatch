import { Injectable } from '@nestjs/common';

import type { SocketUserInfo } from '@/realtime/realtime.types';

/**
 * Owns the bidirectional connection index: `socketId -> user` for resolving the
 * actor behind an inbound event, and `userId -> socketIds` for addressing every
 * live connection a single user holds (multi-tab / multi-device).
 */
@Injectable()
export class ConnectionRegistryService {
  private readonly socketToUser = new Map<string, SocketUserInfo>();
  private readonly userToSockets = new Map<string, Set<string>>();

  register(socketId: string, user: SocketUserInfo): void {
    this.socketToUser.set(socketId, user);
    const sockets = this.userToSockets.get(user.userId);
    if (sockets) {
      sockets.add(socketId);
      return;
    }
    this.userToSockets.set(user.userId, new Set([socketId]));
  }

  unregister(socketId: string): SocketUserInfo | undefined {
    const user = this.socketToUser.get(socketId);
    this.socketToUser.delete(socketId);
    if (!user) return undefined;

    const sockets = this.userToSockets.get(user.userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userToSockets.delete(user.userId);
      }
    }
    return user;
  }

  getUser(socketId: string): SocketUserInfo | undefined {
    return this.socketToUser.get(socketId);
  }

  getSocketIds(userId: string): string[] {
    const sockets = this.userToSockets.get(userId);
    return sockets ? [...sockets] : [];
  }
}
