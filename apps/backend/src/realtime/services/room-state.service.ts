import { Injectable } from '@nestjs/common';

import { REALTIME_MAX_MESSAGES } from '@repo/schemas/realtime';
import type {
  CountdownState,
  ConnectedUser,
  RealtimeChatMessage,
  PlaybackState,
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

type UserRemovalResult = {
  removed: ConnectedUser | null;
  socketIds: string[];
};

type RoomRuntimeStatus = RealtimeRoomState['status'];

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

  destroyRoom(roomId: string): void {
    this.roomStates.delete(roomId);
  }

  getOrCreate(roomId: string): RealtimeRoomState {
    const existing = this.roomStates.get(roomId);
    if (existing) return existing;

    const state: RealtimeRoomState = {
      roomId,
      status: 'waiting',
      connectedUsers: [],
      messages: [],
      playback: this.makeDefaultPlayback(),
      countdown: this.makeDefaultCountdown()
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

    const existing = state.connectedUsers.find((u) => u.userId === userId);
    if (existing) {
      if (!existing.socketIds.includes(socketId)) {
        existing.socketIds = [...existing.socketIds, socketId];
      }
      existing.userName = userName;
      return existing;
    }

    const usedColors = new Set(state.connectedUsers.map((u) => u.color));
    const user: ConnectedUser = {
      userId,
      userName,
      color: pickColor(usedColors),
      socketIds: [socketId],
      joinedAt: new Date().toISOString(),
      isReady: false
    };
    state.connectedUsers.push(user);
    return user;
  }

  /** Pause playback and clear countdown before the last member leaves an active watch. */
  prepareEmptyRoom(roomId: string): void {
    const state = this.roomStates.get(roomId);
    if (!state) {
      return;
    }
    if (state.playback.isPlaying) {
      this.resetPlaybackSession(roomId);
      return;
    }
    this.clearCountdown(roomId);
  }

  isLastSocketLeave(roomId: string, socketId: string): boolean {
    const state = this.roomStates.get(roomId);
    if (!state) {
      return false;
    }
    const user = state.connectedUsers.find((entry) => entry.socketIds.includes(socketId));
    if (user === undefined || user.socketIds.length !== 1) {
      return false;
    }
    return state.connectedUsers.length === 1;
  }

  isLastUserLeave(roomId: string, userId: string): boolean {
    const state = this.roomStates.get(roomId);
    if (!state || state.connectedUsers.length !== 1) {
      return false;
    }
    return state.connectedUsers[0]?.userId === userId;
  }

  /**
   * Remove a socket from a room, deleting the room when it becomes empty.
   * Returns `null` when the room has no runtime state.
   */
  removeSocket(roomId: string, socketId: string): RemovalResult | null {
    const state = this.roomStates.get(roomId);
    if (!state) return null;

    const user = state.connectedUsers.find((u) => u.socketIds.includes(socketId)) ?? null;
    if (!user) {
      return null;
    }

    const removed = {
      ...user,
      socketIds: [...user.socketIds]
    };

    user.socketIds = user.socketIds.filter((id) => id !== socketId);
    if (user.socketIds.length === 0) {
      state.connectedUsers = state.connectedUsers.filter((entry) => entry !== user);
    }

    const userStillConnected = user.socketIds.length > 0;

    if (state.connectedUsers.length === 0) {
      this.roomStates.delete(roomId);
    }

    return { removed, userStillConnected };
  }

  removeUser(roomId: string, userId: string): UserRemovalResult | null {
    const state = this.roomStates.get(roomId);
    if (!state) return null;

    const user = state.connectedUsers.find((entry) => entry.userId === userId) ?? null;
    if (!user) return null;

    const removed = {
      ...user,
      socketIds: [...user.socketIds]
    };

    state.connectedUsers = state.connectedUsers.filter((entry) => entry.userId !== userId);

    if (state.connectedUsers.length === 0) {
      this.roomStates.delete(roomId);
    }

    return {
      removed,
      socketIds: removed.socketIds
    };
  }

  findSocketUser(roomId: string, socketId: string): ConnectedUser | undefined {
    return this.roomStates.get(roomId)?.connectedUsers.find((u) => u.socketIds.includes(socketId));
  }

  setUserReady(roomId: string, userId: string, isReady: boolean): ConnectedUser | null {
    const state = this.roomStates.get(roomId);
    if (!state) return null;

    const user = state.connectedUsers.find((entry) => entry.userId === userId);
    if (!user) return null;

    user.isReady = isReady;
    return user;
  }

  setAllUsersReady(roomId: string, isReady: boolean): void {
    const state = this.roomStates.get(roomId);
    if (!state) return;

    for (const user of state.connectedUsers) {
      user.isReady = isReady;
    }
  }

  setCountdown(roomId: string, countdown: CountdownState): CountdownState {
    const state = this.getOrCreate(roomId);
    state.countdown = countdown;
    return state.countdown;
  }

  clearCountdown(roomId: string): CountdownState {
    return this.setCountdown(roomId, this.makeDefaultCountdown());
  }

  /** Append a chat message, trimming history to the most recent N messages. */
  addMessage(roomId: string, message: RealtimeChatMessage): void {
    const state = this.getOrCreate(roomId);
    state.messages.push(message);
    if (state.messages.length > REALTIME_MAX_MESSAGES) {
      state.messages = state.messages.slice(-REALTIME_MAX_MESSAGES);
    }
  }

  syncMovie(roomId: string, movieId: string | null): PlaybackState {
    const state = this.getOrCreate(roomId);
    if (state.playback.movieId === movieId) {
      return state.playback;
    }

    state.playback = {
      movieId,
      isPlaying: false,
      positionSec: 0,
      playbackRate: 1,
      updatedAt: new Date().toISOString()
    };
    return state.playback;
  }

  updatePlayback(roomId: string, playback: Omit<PlaybackState, 'updatedAt'>): PlaybackState {
    const state = this.getOrCreate(roomId);
    state.playback = {
      ...playback,
      updatedAt: new Date().toISOString()
    };
    return state.playback;
  }

  /** End-of-watch reset: paused at t=0 and everyone marked not ready. */
  resetPlaybackSession(roomId: string): PlaybackState | null {
    const state = this.roomStates.get(roomId);
    if (!state || state.playback.movieId === null) {
      return null;
    }

    this.clearCountdown(roomId);
    this.setAllUsersReady(roomId, false);
    return this.updatePlayback(roomId, {
      movieId: state.playback.movieId,
      isPlaying: false,
      positionSec: 0,
      playbackRate: 1
    });
  }

  getMaterializedPlayback(roomId: string, at = new Date()): PlaybackState {
    const state = this.roomStates.get(roomId);
    if (!state) {
      return this.makeDefaultPlayback();
    }

    if (!state.playback.isPlaying) {
      return state.playback;
    }

    const elapsedMs = Math.max(0, at.getTime() - new Date(state.playback.updatedAt).getTime());
    const positionSec = state.playback.positionSec + (elapsedMs / 1000) * state.playback.playbackRate;
    return {
      ...state.playback,
      positionSec,
      updatedAt: at.toISOString()
    };
  }

  setStatus(roomId: string, status: RoomRuntimeStatus): RoomRuntimeStatus {
    const state = this.getOrCreate(roomId);
    state.status = status;
    return state.status;
  }

  computeStatus(roomId: string, creatorId: string | null = null): RoomRuntimeStatus {
    const state = this.roomStates.get(roomId);
    if (!state || state.playback.movieId === null) {
      return 'waiting';
    }
    if (state.connectedUsers.length === 0) {
      return 'waiting';
    }
    if (state.playback.isPlaying) {
      return 'watching';
    }
    const membersToCheck =
      creatorId === null ? state.connectedUsers : state.connectedUsers.filter((user) => user.userId !== creatorId);
    if (membersToCheck.length === 0) {
      return 'waiting';
    }
    return membersToCheck.every((user) => user.isReady) ? 'ready' : 'waiting';
  }

  syncStatus(roomId: string, creatorId: string | null = null): RoomRuntimeStatus {
    const state = this.roomStates.get(roomId);
    if (!state) {
      return 'waiting';
    }

    state.status = this.computeStatus(roomId, creatorId);
    return state.status;
  }

  private makeDefaultPlayback(): RealtimeRoomState['playback'] {
    return {
      movieId: null,
      isPlaying: false,
      positionSec: 0,
      playbackRate: 1,
      updatedAt: new Date().toISOString()
    };
  }

  private makeDefaultCountdown(): CountdownState {
    return {
      active: false,
      endsAt: null
    };
  }
}
