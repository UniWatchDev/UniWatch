import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@repo/consts/api';
import { getMovieContract, streamMovieContract } from '@repo/contracts/movies';
import type { MovieResponse } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';

const UPLOAD_POLL_MS = 2_000;
const STREAM_REFRESH_BUFFER_MS = 60_000;

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

async function fetchStreamUrl(movieId: string): Promise<{ url: string; expiresAtMs: number }> {
  const params = streamMovieContract.paramsSchema.parse({ id: movieId });
  const path = streamMovieContract.path.replace(':id', encodeURIComponent(params.id));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) {
    throw new Error(await readHttpErrorMessage(res));
  }
  const body = streamMovieContract.responseSchema.parse(await res.json());
  return {
    url: body.url,
    expiresAtMs: new Date(body.expires_at).getTime()
  };
}

function isMoviePlayable(movie: MovieResponse): boolean {
  return movie.has_file && movie.upload_status === 'ready';
}

function isMovieUploading(movie: MovieResponse): boolean {
  return movie.upload_status === 'pending';
}

function isCancelled(ref: { current: boolean }): boolean {
  return ref.current;
}

export function useRoomMovie(
  movieId: string | null | undefined,
  streamRevision = 0
) {
  const [movie, setMovie] = useState<MovieResponse | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(movieId));
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const inFlightRef = useRef(false);
  const streamRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (movieId == null || movieId.length === 0) {
      setMovie(null);
      setMediaSrc(null);
      setLoading(false);
      setError(null);
      return;
    }

    cancelledRef.current = false;
    inFlightRef.current = false;
    setMovie(null);
    setMediaSrc(null);
    setError(null);
    setLoading(true);

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const clearStreamRefresh = (): void => {
      if (streamRefreshTimerRef.current !== null) {
        clearTimeout(streamRefreshTimerRef.current);
        streamRefreshTimerRef.current = null;
      }
    };

    const stopPolling = (): void => {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const scheduleStreamRefresh = (expiresAtMs: number): void => {
      clearStreamRefresh();
      const refreshInMs = Math.max(5_000, expiresAtMs - Date.now() - STREAM_REFRESH_BUFFER_MS);
      streamRefreshTimerRef.current = setTimeout(() => {
        void refreshStream();
      }, refreshInMs);
    };

    const refreshStream = async (): Promise<void> => {
      if (isCancelled(cancelledRef)) return;
      try {
        const stream = await fetchStreamUrl(movieId);
        if (isCancelled(cancelledRef)) return;
        setMediaSrc(stream.url);
        setError(null);
        scheduleStreamRefresh(stream.expiresAtMs);
      } catch (err: unknown) {
        if (!isCancelled(cancelledRef)) {
          setError(err instanceof Error ? err.message : 'Failed to load stream URL');
          setMediaSrc(null);
        }
      }
    };

    const load = async () => {
      if (isCancelled(cancelledRef) || inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const next = await fetchRoomMovie(movieId);
        if (isCancelled(cancelledRef)) return;

        setMovie(next);
        const playable = isMoviePlayable(next);

        if (playable) {
          stopPolling();
          await refreshStream();
        } else {
          setMediaSrc(null);
          setError(null);
        }
      } catch (err: unknown) {
        if (!isCancelled(cancelledRef)) {
          setError(err instanceof Error ? err.message : 'Failed to load movie');
          setMediaSrc(null);
        }
      } finally {
        inFlightRef.current = false;
        if (!isCancelled(cancelledRef)) {
          setLoading(false);
        }
      }
    };

    pollTimer = setInterval(() => {
      void load();
    }, UPLOAD_POLL_MS);

    void load();

    return () => {
      cancelledRef.current = true;
      stopPolling();
      clearStreamRefresh();
    };
  }, [movieId, streamRevision]);

  return {
    movie,
    loading,
    error,
    mediaSrc,
    isUploading: movie != null && isMovieUploading(movie),
    isPlayable: movie != null && isMoviePlayable(movie),
    isFailed: movie?.upload_status === 'failed'
  };
}
