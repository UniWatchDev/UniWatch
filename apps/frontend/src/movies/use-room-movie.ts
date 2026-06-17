import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@repo/consts/api';
import { getMovieContract, streamMovieContract } from '@repo/contracts/movies';
import type { MovieResponse } from '@repo/schemas/movies';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';

const POLL_MS = 2_000;

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

async function fetchRoomMovieStreamUrl(movieId: string): Promise<string> {
  const params = streamMovieContract.paramsSchema.parse({ id: movieId });
  const path = streamMovieContract.path.replace(':id', encodeURIComponent(params.id));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) {
    throw new Error(await readHttpErrorMessage(res));
  }
  const data = streamMovieContract.responseSchema.parse(await res.json());
  return data.url;
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

export function useRoomMovie(movieId: string | null | undefined) {
  const [movie, setMovie] = useState<MovieResponse | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(movieId));
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (movieId == null || movieId.length === 0) {
      setMovie(null);
      setMediaSrc(null);
      setLoading(false);
      setError(null);
      return;
    }

    let lastMovieSignature: string | null = null;
    let currentMediaSrc: string | null = null;

    cancelledRef.current = false;
    inFlightRef.current = false;
    setMovie(null);
    setMediaSrc(null);
    setError(null);
    setLoading(true);

    const load = async () => {
      if (isCancelled(cancelledRef) || inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const next = await fetchRoomMovie(movieId);
        if (isCancelled(cancelledRef)) return;

        setMovie(next);
        const signature = `${next.file_uploaded_at ?? ''}:${next.updated_at}`;
        const playable = isMoviePlayable(next);
        const shouldReloadStream = playable && (currentMediaSrc === null || signature !== lastMovieSignature);

        if (playable && shouldReloadStream) {
          const nextMediaSrc = await fetchRoomMovieStreamUrl(movieId);
          if (isCancelled(cancelledRef)) return;
          setMediaSrc(nextMediaSrc);
          currentMediaSrc = nextMediaSrc;
          lastMovieSignature = signature;
          setError(null);
        }

        if (!playable) {
          setMediaSrc(null);
          currentMediaSrc = null;
          lastMovieSignature = null;
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

    const pollTimer = setInterval(() => {
      void load();
    }, POLL_MS);

    void load();

    return () => {
      cancelledRef.current = true;
      clearInterval(pollTimer);
    };
  }, [movieId]);

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
