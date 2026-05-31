import { Injectable } from '@nestjs/common';

import { REALTIME_MAX_MESSAGES } from '@repo/schemas/realtime';
import type {
  ConnectedUser,
  RealtimeChatMessage,
  RealtimeRoomState
} from '@repo/schemas/realtime';

import { pickColor } from '@/realtime/utils/pick-color';

type JoinUserInput = {
  roomId: string;
  userId: string;
  userName: string;
  socketId: string;
};

/** Result of removing a socket from a room's runtime state. */
type RemovalResult = {
  removed: ConnectedUser | null;
  /** Whether the same user still has another active socket in the room. */
  userStillConnected: boolean;
};

/**
 * Owns the in-memory, per-room runtime state (connected users, chat history,
 * playback). State is never persisted to MongoDB — it lives only for the
 * lifetime of the process and is discarded when a room empties out.
 */
@Injectable()
export class RoomStateService {
  /** roomId → in-memory runtime state */
  private readonly roomStates = new Map<string, RealtimeRoomState>();

  get(roomId: string): RealtimeRoomState | undefined {
    return this.roomStates.get(roomId);
  }

  getOrCreate(roomId: string): RealtimeRoomState {
    const existing = this.roomStates.get(roomId);
    if (existing) return existing;

    const state: RealtimeRoomState = {
      roomId,
      connectedUsers: [],
      messages: [],
      playback: this.makeDefaultPlayback()
    };
    this.roomStates.set(roomId, state);
    return state;
  }

  /**
   * Register a socket as a connected user, returning the resulting entry.
   *
   * Removes any stale entry for the same userId first — this covers the refresh
   * case where the new socket arrives before the old one's disconnect fires,
   * which would otherwise leave two entries for the same user. The previous
   * color is reused so the user keeps the same color across a refresh.
   */
  joinUser({ roomId, userId, userName, socketId }: JoinUserInput): ConnectedUser {
    const state = this.getOrCreate(roomId);

    const staleEntry = state.connectedUsers.find((u) => u.userId === userId);
    state.connectedUsers = state.connectedUsers.filter((u) => u.userId !== userId);

    const usedColors = new Set(state.connectedUsers.map((u) => u.color));
    const color = staleEntry?.color ?? pickColor(usedColors);

    const user: ConnectedUser = {
      userId,
      userName,
      color,
      socketId,
      joinedAt: new Date().toISOString()
    };
    state.connectedUsers.push(user);
    return user;
  }

  /**
   * Remove a socket from a room, deleting the room when it becomes empty.
   * Returns `null` when the room has no runtime state.
   */
  removeSocket(roomId: string, socketId: string): RemovalResult | null {
    const state = this.roomStates.get(roomId);
    if (!state) return null;

    const removed = state.connectedUsers.find((u) => u.socketId === socketId) ?? null;
    state.connectedUsers = state.connectedUsers.filter((u) => u.socketId !== socketId);

    const userStillConnected =
      removed !== null && state.connectedUsers.some((u) => u.userId === removed.userId);

    if (state.connectedUsers.length === 0) {
      this.roomStates.delete(roomId);
    }

    return { removed, userStillConnected };
  }

  findSocketUser(roomId: string, socketId: string): ConnectedUser | undefined {
    return this.roomStates.get(roomId)?.connectedUsers.find((u) => u.socketId === socketId);
  }

  /** Append a chat message, trimming history to the most recent N messages. */
  addMessage(roomId: string, message: RealtimeChatMessage): void {
    const state = this.getOrCreate(roomId);
    state.messages.push(message);
    if (state.messages.length > REALTIME_MAX_MESSAGES) {
      state.messages = state.messages.slice(-REALTIME_MAX_MESSAGES);
    }
  }

  private makeDefaultPlayback(): RealtimeRoomState['playback'] {
    return {
      movieId: null,
      isPlaying: false,
      positionSec: 0,
      updatedAt: new Date().toISOString()
    };
  }
}
