import { API_BASE_URL } from '@repo/consts/api';
import { resolveMovieContract } from '@repo/contracts/movies';
import type { CreateMovieInput, MovieResponse } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';
import { uploadMovieFile, type UploadProgress } from '@/movies/upload-movie-file';

export function shouldReplaceMovieFile(movie: MovieResponse): boolean {
  return movie.has_file || movie.upload_status === 'ready';
}

/** Resolve or create a movie, then upload the video file for room creation. */
export async function prepareMovieForRoom(
  body: CreateMovieInput,
  file: File,
  options?: { onProgress?: (progress: UploadProgress) => void }
): Promise<MovieResponse> {
  const parsedBody = resolveMovieContract.bodySchema.parse(body);
  const resolveRes = await fetch(`${API_BASE_URL}${resolveMovieContract.path}`, {
    method: resolveMovieContract.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(parsedBody),
  });

  if (!resolveRes.ok) {
    throw new Error(await readHttpErrorMessage(resolveRes));
  }

  const movie = resolveMovieContract.responseSchema.parse(await resolveRes.json());
  return uploadMovieFile(movie.id, file, {
    replace: shouldReplaceMovieFile(movie),
    ...(options?.onProgress !== undefined && { onProgress: options.onProgress }),
  });
}
