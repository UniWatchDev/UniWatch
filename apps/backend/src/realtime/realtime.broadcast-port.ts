/**
 * Narrow port the HTTP layer (RoomsService) depends on to push realtime
 * side effects, without coupling to the concrete gateway implementation.
 */
export interface RealtimeBroadcastPort {
  clearCountdown(roomId: string): void;
  emitRoomMovieUpdated(roomId: string, movieId: string): void;
  emitRoomPlaybackChanged(roomId: string, actorUserId: string | null): void;
  emitRoomState(roomId: string): void;
  removeRoomMember(roomId: string, userId: string): void;
}

export const REALTIME_BROADCAST_PORT = Symbol('REALTIME_BROADCAST_PORT');
