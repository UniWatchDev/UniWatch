import { useEffect, useState } from 'react';

import { API_BASE_URL } from '@repo/consts/api';
import { MOVIE_MEDIA_ENDPOINT } from '@repo/consts/movies';
import { getMovieContract } from '@repo/contracts/movies';
import type { MovieResponse } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';

const POLL_MS = 3000;

function movieMediaPath(movieId: string): string {
  return MOVIE_MEDIA_ENDPOINT.replace(':id', encodeURIComponent(movieId));
}

function movieMediaUrl(movieId: string, cacheKey?: string | null): string {
  const url = new URL(`${API_BASE_URL}${movieMediaPath(movieId)}`);
  if (cacheKey != null && cacheKey.length > 0) {
    url.searchParams.set('v', cacheKey);
  }
  return url.toString();
}

async function fetchRoomMovie(movieId: string): Promise<MovieResponse> {
  const params = getMovieContract.paramsSchema.parse({ id: movieId });
  const path = getMovieContract.path.replace(':id', encodeURIComponent(params.id));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) {
    throw new Error(await readHttpErrorMessage(res));
  }
  return getMovieContract.responseSchema.parse(await res.json());
}

function isMoviePlayable(movie: MovieResponse): boolean {
  return movie.has_file && movie.upload_status === 'ready';
}

function isMovieUploading(movie: MovieResponse): boolean {
  return movie.upload_status === 'pending';
}

export function useRoomMovie(movieId: string | null | undefined) {
  const [movie, setMovie] = useState<MovieResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(movieId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (movieId == null || movieId.length === 0) {
      setMovie(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      try {
        const next = await fetchRoomMovie(movieId);
        if (cancelled) return;
        setMovie(next);
        setError(null);
        if (isMovieUploading(next) && pollTimer === undefined) {
          pollTimer = setInterval(() => { void load(); }, POLL_MS);
        }
        if (isMoviePlayable(next) && pollTimer !== undefined) {
          clearInterval(pollTimer);
          pollTimer = undefined;
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load movie');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    void load();

    return () => {
      cancelled = true;
      if (pollTimer !== undefined) clearInterval(pollTimer);
    };
  }, [movieId]);

  return {
    movie,
    loading,
    error,
    mediaSrc: movieId != null && movie != null && isMoviePlayable(movie)
      ? movieMediaUrl(movieId, movie.file_uploaded_at ?? movie.updated_at)
      : null,
    isUploading: movie != null && isMovieUploading(movie),
    isPlayable: movie != null && isMoviePlayable(movie),
    isFailed: movie?.upload_status === 'failed'
  };
}
