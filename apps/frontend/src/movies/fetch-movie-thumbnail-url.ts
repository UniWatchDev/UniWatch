import { API_BASE_URL } from '@repo/consts/api';
import { getMovieContract } from '@repo/contracts/movies';
import { movieStreamResponseSchema } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';

export async function fetchMovieThumbnailUrl(movieId: string): Promise<string | null> {
  const params = getMovieContract.paramsSchema.parse({ id: movieId });
  const path = getMovieContract.path.replace(':id', encodeURIComponent(params.id));
  const res = await fetch(`${API_BASE_URL}${path}/thumbnail`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    throw new Error(await readHttpErrorMessage(res));
  }

  const body = movieStreamResponseSchema.parse(await res.json());
  return body.url;
}
