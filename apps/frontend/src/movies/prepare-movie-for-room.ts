import { API_BASE_URL } from '@repo/consts/api';
import { resolveMovieContract } from '@repo/contracts/movies';
import type { CreateMovieInput, MovieResponse } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';
import { uploadMovieFile, type UploadProgress } from '@/movies/upload-movie-file';

/**
 * Resolve or create the movie metadata record for a room. The actual file
 * upload happens separately (e.g. via room-upload-tracker) so room creation
 * never blocks on the upload.
 */
export async function resolveMovieForRoom(body: CreateMovieInput): Promise<MovieResponse> {
  const parsedBody = resolveMovieContract.bodySchema.parse(body);
  const resolveRes = await fetch(`${API_BASE_URL}${resolveMovieContract.path}`, {
    method: resolveMovieContract.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(parsedBody)
  });

  if (!resolveRes.ok) {
    throw new Error(await readHttpErrorMessage(resolveRes));
  }

  return resolveMovieContract.responseSchema.parse(await resolveRes.json());
}

/** Resolve or create a movie, then upload the video file (blocking). */
export async function prepareMovieForRoom(
  body: CreateMovieInput,
  file: File,
  options?: { onProgress?: (progress: UploadProgress) => void }
): Promise<MovieResponse> {
  const movie = await resolveMovieForRoom(body);
  return uploadMovieFile(movie.id, file, {
    replace: true,
    ...(options?.onProgress !== undefined && { onProgress: options.onProgress })
  });
}
