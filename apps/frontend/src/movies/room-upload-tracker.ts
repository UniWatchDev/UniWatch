import { uploadMovieFile } from '@/movies/upload-movie-file';

export type RoomUploadPhase = 'uploading' | 'complete' | 'failed';

export interface RoomUploadState {
  roomId: string;
  movieId: string;
  phase: RoomUploadPhase;
  percent: number;
  error?: string;
}

type Listener = () => void;

const uploads = new Map<string, RoomUploadState>();
const inFlight = new Set<string>();
const listeners = new Set<Listener>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setUploadState(roomId: string, next: RoomUploadState): void {
  uploads.set(roomId, next);
  emitChange();
}

export function getRoomUploadSnapshot(roomId: string | undefined): RoomUploadState | null {
  if (roomId === undefined || roomId.length === 0) return null;
  return uploads.get(roomId) ?? null;
}

export function subscribeRoomUpload(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearRoomUpload(roomId: string): void {
  uploads.delete(roomId);
  emitChange();
}

/** Fire-and-forget upload that survives navigation from create-room into the room. */
export function startRoomUpload(roomId: string, movieId: string, file: File): void {
  if (inFlight.has(roomId)) {
    return;
  }

  inFlight.add(roomId);
  setUploadState(roomId, { roomId, movieId, phase: 'uploading', percent: 0 });

  void (async () => {
    try {
      await uploadMovieFile(movieId, file, {
        replace: true,
        onProgress: (progress) => {
          setUploadState(roomId, {
            roomId,
            movieId,
            phase: 'uploading',
            percent: progress.percent
          });
        }
      });
      setUploadState(roomId, { roomId, movieId, phase: 'complete', percent: 100 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadState(roomId, { roomId, movieId, phase: 'failed', percent: 0, error: message });
    } finally {
      inFlight.delete(roomId);
    }
  })();
}
