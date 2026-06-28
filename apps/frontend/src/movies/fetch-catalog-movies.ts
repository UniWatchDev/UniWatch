import { API_BASE_URL } from '@repo/consts/api';
import { listCatalogMoviesContract } from '@repo/contracts/movies';
import type { MovieResponse } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';

export async function fetchCatalogMovies(): Promise<MovieResponse[]> {
  const res = await fetch(`${API_BASE_URL}${listCatalogMoviesContract.path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(await readHttpErrorMessage(res));
  }

  return listCatalogMoviesContract.responseSchema.parse(await res.json());
}
