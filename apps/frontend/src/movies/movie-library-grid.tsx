import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { MovieResponse } from '@repo/schemas/movies';

import { MovieLibraryCard } from '@/movies/movie-library-card';
import {
  filterMoviesBySearch,
  isMovieLibraryReady,
  sortOwnedMoviesForLibrary,
} from '@/movies/selectable-owned-movies';

interface MovieLibraryGridProps {
  movies: readonly MovieResponse[];
  loading: boolean;
  error: string | null;
  selectedMovieId: string | null;
  onSelectedMovieIdChange: (movieId: string | null) => void;
  onRetry?: () => void;
  disabled?: boolean;
  emptyHint?: string;
}

export function MovieLibraryGrid({
  movies,
  loading,
  error,
  selectedMovieId,
  onSelectedMovieIdChange,
  onRetry,
  disabled = false,
  emptyHint = 'Upload a new video to add a personal copy.',
}: MovieLibraryGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const sortedMovies = useMemo(() => sortOwnedMoviesForLibrary(movies), [movies]);
  const filteredMovies = useMemo(
    () => filterMoviesBySearch(sortedMovies, searchQuery),
    [searchQuery, sortedMovies]
  );
  const readyCount = useMemo(
    () => movies.filter((movie) => isMovieLibraryReady(movie)).length,
    [movies]
  );

  if (loading) {
    return (
      <div className="movie-library-grid movie-library-grid--loading">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={`skeleton-${String(index)}`} className="movie-library-card-skeleton" />
        ))}
      </div>
    );
  }

  if (error != null) {
    return (
      <div className="movie-library-empty">
        <p>{error}</p>
        {onRetry != null && (
          <button type="button" className="btn-ghost" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="movie-library-empty">
        <p>No titles in the catalog yet.</p>
        <p className="movie-library-empty__hint">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="movie-library-grid-shell">
      <div className="movie-library-grid__toolbar">
        <label className="movie-library-search">
          <Search size={14} aria-hidden="true" />
          <input
            className="input movie-library-search__input"
            type="search"
            placeholder="Search catalog…"
            value={searchQuery}
            onChange={(event) => { setSearchQuery(event.target.value); }}
            disabled={disabled}
          />
        </label>
        <p className="movie-library-grid__count">
          {String(readyCount)} ready
        </p>
      </div>

      {filteredMovies.length === 0 ? (
        <div className="movie-library-empty">
          <p>No titles match your search.</p>
        </div>
      ) : (
        <div className="movie-library-grid">
          {filteredMovies.map((movie) => (
            <MovieLibraryCard
              key={movie.id}
              movie={movie}
              selected={selectedMovieId === movie.id}
              disabled={disabled}
              onSelect={() => {
                if (!isMovieLibraryReady(movie)) {
                  return;
                }
                onSelectedMovieIdChange(selectedMovieId === movie.id ? null : movie.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
