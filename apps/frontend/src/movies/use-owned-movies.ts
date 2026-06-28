import { useCallback, useEffect, useState } from 'react';

import type { MovieResponse } from '@repo/schemas/movies';

import { formatFetchError } from '@/auth/auth-fetch-helpers';
import { fetchOwnedMovies } from '@/movies/fetch-owned-movies';

const emptyOwnedMoviesState = {
  movies: [] as MovieResponse[],
  loading: false,
  error: null as string | null,
  reload: () => {},
};

export function useOwnedMovies(enabled = true) {
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
      const next = await fetchOwnedMovies();
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
    return emptyOwnedMoviesState;
  }

  return { movies, loading, error, reload: () => { void reload(); } };
}
