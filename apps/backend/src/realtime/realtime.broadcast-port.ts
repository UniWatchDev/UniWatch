/**
 * Narrow port the HTTP layer (RoomsService) depends on to push realtime
 * side effects, without coupling to the concrete gateway implementation.
 */
export interface RealtimeBroadcastPort {
  clearCountdown(roomId: string): void;
  emitRoomMovieUpdated(roomId: string, movieId: string, movieName?: string): void;
  emitRoomPlaybackChanged(roomId: string, actorUserId: string | null): void;
  emitRoomState(roomId: string): void;
  emitVideoProcessing(roomId: string, videoId: string): void;
  emitVideoProgress(roomId: string, videoId: string, percent: number): void;
  emitVideoPlayable(
    roomId: string,
    videoId: string,
    playbackUrl: string,
    availableQualities: number[],
    publishedDurationSec: number | null
  ): void;
  emitVideoReady(
    roomId: string,
    videoId: string,
    playbackUrl: string,
    availableQualities: number[]
  ): void;
  emitVideoFailed(roomId: string, videoId: string, errorMessage: string): void;
  removeRoomMember(roomId: string, userId: string): Promise<void>;
  closeRoom(roomId: string, message: string): Promise<void>;
}

export const REALTIME_BROADCAST_PORT = Symbol('REALTIME_BROADCAST_PORT');
