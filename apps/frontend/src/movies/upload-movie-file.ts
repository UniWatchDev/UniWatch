import {
  MOVIE_ALLOWED_FORMATS_LABEL,
  MOVIE_COMPLETE_UPLOAD_ENDPOINT,
  MOVIE_MAX_BYTES,
  MOVIE_PRESIGN_UPLOAD_ENDPOINT,
  resolveMovieMime
} from '@repo/consts/movies';
import { completeUploadContract, presignUploadContract } from '@repo/contracts/movies';
import { API_BASE_URL } from '@repo/consts/api';
import type { PresignUploadResponse } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';

export { MOVIE_FILE_ACCEPT } from '@repo/consts/movies';

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export function validateMovieFile(file: File): string | null {
  if (resolveMovieMime(file.type, file.name) === null) {
    return `Only ${MOVIE_ALLOWED_FORMATS_LABEL} video files are supported.`;
  }
  if (file.size > MOVIE_MAX_BYTES) {
    return 'File exceeds the 1 GB upload limit.';
  }
  return null;
}

/** Ask the backend for a presigned PUT URL for direct-to-R2 upload. */
async function presignMovieUpload(
  movieId: string,
  file: File,
  contentType: string
): Promise<PresignUploadResponse> {
  const params = presignUploadContract.paramsSchema.parse({ id: movieId });
  const path = MOVIE_PRESIGN_UPLOAD_ENDPOINT.replace(':id', encodeURIComponent(params.id));
  const body = presignUploadContract.bodySchema.parse({
    file_name: file.name,
    file_type: contentType,
    file_size: file.size
  });
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: presignUploadContract.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(await readHttpErrorMessage(res));
  }
  return presignUploadContract.responseSchema.parse(await res.json());
}

/** Upload the raw file straight to R2 via the presigned URL (no cookies cross-origin). */
function putFileToUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100)
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Upload to storage failed (HTTP ${String(xhr.status)})`));
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Upload failed due to a network or CORS error. Confirm the R2 bucket allows PUT from this origin.'
        )
      );
    };

    xhr.send(file);
  });
}

/** Tell the backend the upload finished so it can start async HLS processing. */
async function completeMovieUpload(movieId: string, roomId: string): Promise<void> {
  const params = completeUploadContract.paramsSchema.parse({ id: movieId });
  const path = MOVIE_COMPLETE_UPLOAD_ENDPOINT.replace(':id', encodeURIComponent(params.id));
  const body = completeUploadContract.bodySchema.parse({ room_id: roomId });
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: completeUploadContract.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(await readHttpErrorMessage(res));
  }
}

/**
 * Full direct-upload flow for a movie tied to a room:
 * presign → PUT to R2 → complete (which enqueues async transcoding).
 */
export async function uploadMovieViaPresign(
  movieId: string,
  file: File,
  roomId: string,
  options?: { onProgress?: (progress: UploadProgress) => void }
): Promise<void> {
  const contentType = resolveMovieMime(file.type, file.name);
  if (contentType === null) {
    throw new Error(`Only ${MOVIE_ALLOWED_FORMATS_LABEL} video files are supported.`);
  }
  const presign = await presignMovieUpload(movieId, file, contentType);
  await putFileToUrl(presign.upload_url, file, contentType, options?.onProgress);
  await completeMovieUpload(movieId, roomId);
}
