import {
  MOVIE_ALLOWED_FORMATS_LABEL,
  MOVIE_MAX_BYTES,
  resolveMovieMime
} from '@repo/consts/movies';
import { uploadMovieContract } from '@repo/contracts/movies';
import { API_BASE_URL } from '@repo/consts/api';
import type { MovieResponse } from '@repo/schemas/movies';

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

function uploadFileToBackend(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<MovieResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.responseType = 'json';

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
        const parsed = uploadMovieContract.responseSchema.safeParse(xhr.response);
        if (!parsed.success) {
          reject(new Error('Backend returned an invalid movie payload'));
          return;
        }
        resolve(parsed.data);
        return;
      }
      const details = typeof xhr.responseText === 'string' && xhr.responseText.length > 0
        ? `: ${xhr.responseText.slice(0, 200)}`
        : '';
      reject(new Error(`Upload failed (HTTP ${String(xhr.status)})${details}`));
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Upload failed due to a network or auth error. Confirm the backend is reachable and the session cookie is valid.'
        )
      );
    };

    xhr.send(file);
  });
}

/**
 * Full upload flow for a movie tied to a room:
 * send the raw file body to the backend relay, which streams it into ffmpeg and R2.
 */
export async function uploadMovieViaStream(
  movieId: string,
  file: File,
  roomId: string,
  options?: { onProgress?: (progress: UploadProgress) => void }
): Promise<MovieResponse> {
  const contentType = resolveMovieMime(file.type, file.name);
  if (contentType === null) {
    throw new Error(`Only ${MOVIE_ALLOWED_FORMATS_LABEL} video files are supported.`);
  }
  const params = uploadMovieContract.paramsSchema.parse({ id: movieId });
  const query = {
    room_id: roomId,
    file_name: file.name,
    file_type: contentType,
    file_size: file.size
  };
  const path = uploadMovieContract.path.replace(':id', encodeURIComponent(params.id));
  const url = new URL(`${API_BASE_URL}${path}`);
  url.search = new URLSearchParams({
    room_id: query.room_id,
    file_name: query.file_name,
    file_type: query.file_type,
    file_size: String(query.file_size)
  }).toString();

  return await uploadFileToBackend(url.toString(), file, contentType, options?.onProgress);
}
