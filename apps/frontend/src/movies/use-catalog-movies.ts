import { useCallback, useEffect, useState } from 'react';

import type { MovieResponse } from '@repo/schemas/movies';

import { formatFetchError } from '@/auth/auth-fetch-helpers';
import { fetchCatalogMovies } from '@/movies/fetch-catalog-movies';

const emptyCatalogState = {
  movies: [] as MovieResponse[],
  loading: false,
  error: null as string | null,
  reload: () => {},
};

export function useCatalogMovies(enabled = true) {
  const [movies, setMovies] = useState<MovieResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await fetchCatalogMovies();
      setMovies(next);
    } catch (err: unknown) {
      setError(formatFetchError(err));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void reload();
  }, [enabled, reload]);

  if (!enabled) {
    return emptyCatalogState;
  }

  return { movies, loading, error, reload: () => { void reload(); } };
}
