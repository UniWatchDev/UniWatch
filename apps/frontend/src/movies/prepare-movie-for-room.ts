import { API_BASE_URL } from '@repo/consts/api';
import { resolveMovieContract } from '@repo/contracts/movies';
import type { CreateMovieInput, MovieResponse } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';

/**
 * Resolve or create the movie metadata record for a room. The actual file
 * upload happens separately and asynchronously via `uploadMovieViaPresign`, so
 * room creation never blocks on the upload.
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
