import { API_BASE_URL } from '@repo/consts/api';
import {
  listAdminCatalogMoviesContract,
  updateCatalogMovieContract,
  uploadCatalogMovieContract
} from '@repo/contracts/admin';
import type { UpdateCatalogMovieInput } from '@repo/schemas/admin';
import type { MovieResponse } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';
import type { UploadProgress } from '@/movies/upload-movie-file';
import { validateMovieFile } from '@/movies/upload-movie-file';

export async function fetchAdminCatalogMovies(): Promise<MovieResponse[]> {
  const res = await fetch(`${API_BASE_URL}${listAdminCatalogMoviesContract.path}`, {
    method: listAdminCatalogMoviesContract.method,
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error(await readHttpErrorMessage(res));
  }

  return listAdminCatalogMoviesContract.responseSchema.parse(await res.json());
}

export async function updateAdminCatalogMovie(
  movieId: string,
  body: UpdateCatalogMovieInput
): Promise<MovieResponse> {
  const params = updateCatalogMovieContract.paramsSchema.parse({ id: movieId });
  const payload = updateCatalogMovieContract.bodySchema.parse(body);
  const path = updateCatalogMovieContract.path.replace(
    ':id',
    encodeURIComponent(params.id)
  );

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: updateCatalogMovieContract.method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(await readHttpErrorMessage(res));
  }

  return updateCatalogMovieContract.responseSchema.parse(await res.json());
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
  if (status === 403) {
    return 'Admin access is required to upload catalog movies.';
  }
  return `Upload failed (HTTP ${String(status)})`;
}

export function uploadCatalogMovieFile(
  metadata: {
    name: string;
    language: string;
    description?: string | undefined;
  },
  file: File,
  options?: { onProgress?: (progress: UploadProgress) => void }
): Promise<MovieResponse> {
  const validationError = validateMovieFile(file);
  if (validationError !== null) {
    return Promise.reject(new Error(validationError));
  }

  const fields = uploadCatalogMovieContract.bodySchema.parse(metadata);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${uploadCatalogMovieContract.path}`);
    xhr.withCredentials = true;
    xhr.responseType = 'json';
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options?.onProgress) {
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
          resolve(uploadCatalogMovieContract.responseSchema.parse(xhr.response));
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
      reject(new Error('Upload failed due to a network error.'));
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', fields.name);
    formData.append('language', fields.language);
    if (fields.description !== undefined) {
      formData.append('description', fields.description);
    }
    xhr.send(formData);
  });
}
