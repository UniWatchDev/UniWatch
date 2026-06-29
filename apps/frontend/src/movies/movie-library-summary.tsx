import { Film } from 'lucide-react';
import type { MovieResponse } from '@repo/schemas/movies';

import { formatMovieDuration } from '@/movies/selectable-owned-movies';
import { useMovieThumbnail } from '@/movies/use-movie-thumbnail';

interface MovieLibrarySummaryProps {
  movie: MovieResponse | null;
  fallbackTitle?: string | null;
}

export function MovieLibrarySummary({ movie, fallbackTitle }: MovieLibrarySummaryProps) {
  if (movie == null) {
    return (
      <div className="movie-library-summary movie-library-summary--empty">
        <Film size={16} aria-hidden="true" />
        <span>{fallbackTitle ?? 'No movie attached'}</span>
      </div>
    );
  }

  return <MovieLibrarySummaryFilled movie={movie} />;
}

function MovieLibrarySummaryFilled({ movie }: { movie: MovieResponse }) {
  const thumbnailUrl = useMovieThumbnail(movie.id, movie.thumbnail_url);
  const duration = formatMovieDuration(movie.duration_seconds);

  return (
    <div className="movie-library-summary">
      <div className="movie-library-summary__poster relative overflow-hidden rounded-lg" aria-hidden="true">
        {thumbnailUrl != null ? (
          <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="cinema-card-fallback-bg flex h-full w-full items-center justify-center">
            <Film size={16} className="text-white/45" />
          </div>
        )}
        <div className="cinema-card-gradient absolute inset-0" />
      </div>

      <div className="movie-library-summary__copy">
        <p className="movie-library-summary__eyebrow">{movie.language}</p>
        <p className="movie-library-summary__title">{movie.name}</p>
        {duration != null && duration.length > 0 && (
          <p className="movie-library-summary__meta">{duration}</p>
        )}
      </div>
    </div>
  );
}
