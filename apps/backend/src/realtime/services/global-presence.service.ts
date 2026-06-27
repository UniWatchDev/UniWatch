import { Injectable } from '@nestjs/common';

type UserPresenceEntry = {
  socketIds: Set<string>;
  currentRoomId?: string;
  currentRoomName?: string;
};

export type UserPresenceSnapshot = {
  isOnline: boolean;
  currentRoomId?: string;
  currentRoomName?: string;
};

@Injectable()
export class GlobalPresenceService {
  private readonly users = new Map<string, UserPresenceEntry>();

  registerSocket(userId: string, socketId: string): void {
    const entry = this.users.get(userId);
    if (entry) {
      entry.socketIds.add(socketId);
    } else {
      this.users.set(userId, { socketIds: new Set([socketId]) });
    }
  }

  /** Returns true if the user is now fully offline (no sockets remaining). */
  removeSocket(userId: string, socketId: string): boolean {
    const entry = this.users.get(userId);
    if (!entry) return true;
    entry.socketIds.delete(socketId);
    if (entry.socketIds.size === 0) {
      this.users.delete(userId);
      return true;
    }
    return false;
  }

  isOnline(userId: string): boolean {
    return this.users.has(userId);
  }

  getSocketsForUser(userId: string): string[] {
    return Array.from(this.users.get(userId)?.socketIds ?? []);
  }

  setCurrentRoom(userId: string, roomId: string, roomName: string): void {
    const entry = this.users.get(userId);
    if (!entry) return;
    entry.currentRoomId = roomId;
    entry.currentRoomName = roomName;
  }

  clearCurrentRoom(userId: string): void {
    const entry = this.users.get(userId);
    if (!entry) return;
    delete entry.currentRoomId;
    delete entry.currentRoomName;
  }

  getUserPresence(userId: string): UserPresenceSnapshot {
    const entry = this.users.get(userId);
    if (!entry) return { isOnline: false };
    const snapshot: UserPresenceSnapshot = { isOnline: true };
    if (entry.currentRoomId !== undefined) snapshot.currentRoomId = entry.currentRoomId;
    if (entry.currentRoomName !== undefined) snapshot.currentRoomName = entry.currentRoomName;
    return snapshot;
  }

  getOnlineFriendPresences(
    friendIds: string[]
  ): Array<{ userId: string } & UserPresenceSnapshot> {
    return friendIds.map((userId) => ({
      userId,
      ...this.getUserPresence(userId)
    }));
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.users.keys());
  }
}
