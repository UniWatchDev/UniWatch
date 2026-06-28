import { useEffect, useState } from 'react';

import { fetchMovieThumbnailUrl } from '@/movies/fetch-movie-thumbnail-url';

export function useMovieThumbnail(movieId: string, thumbnailUrl: string | null): string | null {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (thumbnailUrl == null) {
      return;
    }

    let cancelled = false;
    void fetchMovieThumbnailUrl(movieId)
      .then((url) => {
        if (!cancelled) {
          setResolvedUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [movieId, thumbnailUrl]);

  if (thumbnailUrl == null) {
    return null;
  }

  return resolvedUrl;
}
