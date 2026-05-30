import {
  MOVIE_ALLOWED_FORMATS_LABEL,
  MOVIE_MAX_BYTES,
  MOVIE_UPLOAD_ENDPOINT,
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

export function uploadMovieFile(
  movieId: string,
  file: File,
  options: { replace?: boolean; onProgress?: (progress: UploadProgress) => void }
): Promise<MovieResponse> {
  const params = uploadMovieContract.paramsSchema.parse({ id: movieId });
  const path = MOVIE_UPLOAD_ENDPOINT.replace(':id', encodeURIComponent(params.id));
  const query = options.replace === true ? '?replace=true' : '';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${path}${query}`);
    xhr.withCredentials = true;
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100)
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(uploadMovieContract.responseSchema.parse(xhr.response));
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Invalid upload response'));
        }
        return;
      }
      const message =
        typeof xhr.response === 'object' &&
        xhr.response !== null &&
        'detail' in xhr.response &&
        typeof (xhr.response as { detail: unknown }).detail === 'string'
          ? (xhr.response as { detail: string }).detail
          : `Upload failed (HTTP ${String(xhr.status)})`;
      reject(new Error(message));
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed'));
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}
