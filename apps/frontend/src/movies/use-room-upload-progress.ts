import { useSyncExternalStore } from 'react';

import {
  getRoomUploadSnapshot,
  subscribeRoomUpload,
  type RoomUploadState
} from '@/movies/room-upload-tracker';

export function useRoomUploadProgress(roomId: string | undefined): RoomUploadState | null {
  return useSyncExternalStore(
    subscribeRoomUpload,
    () => getRoomUploadSnapshot(roomId),
    () => getRoomUploadSnapshot(roomId)
  );
}
