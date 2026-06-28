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
    return 'File exceeds the 5 GB upload limit.';
  }
  return null;
}

function readUploadErrorMessage(status: number, response: unknown): string {
  if (typeof response === 'object' && response !== null) {
    if ('detail' in response && typeof response.detail === 'string') {
      return response.detail;
    }
    if ('errors' in response && Array.isArray(response.errors) && response.errors.length > 0) {
      const first: unknown = response.errors[0];
      if (
        typeof first === 'object' &&
        first !== null &&
        'message' in first &&
        typeof first.message === 'string'
      ) {
        return first.message;
      }
    }
  }

  if (typeof response === 'string' && response.trim().length > 0) {
    return response;
  }

  if (status === 401) {
    return 'Your session expired. Sign in again and retry the upload.';
  }

  return `Upload failed (HTTP ${String(status)})`;
}

function parseUploadResponse(response: unknown): MovieResponse {
  if (typeof response === 'string') {
    return uploadMovieContract.responseSchema.parse(JSON.parse(response));
  }
  return uploadMovieContract.responseSchema.parse(response);
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
    xhr.setRequestHeader('Accept', 'application/json');

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
          resolve(parseUploadResponse(xhr.response));
        } catch (error) {
          reject(
            error instanceof Error
              ? new Error(`Upload completed but the server response was invalid: ${error.message}`)
              : new Error('Upload completed but the server response was invalid.')
          );
        }
        return;
      }

      reject(new Error(readUploadErrorMessage(xhr.status, xhr.response)));
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Upload failed due to a network error. Check that the backend is running on port 3000 and try again.'
        )
      );
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}
