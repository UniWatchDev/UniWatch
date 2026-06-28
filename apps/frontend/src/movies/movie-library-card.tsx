import type { MovieResponse } from '@repo/schemas/movies';

import { CinemaMovieCard } from '@/components/cinema-movie-card';
import { isMovieLibraryReady } from '@/movies/selectable-owned-movies';

interface MovieLibraryCardProps {
  movie: MovieResponse;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function MovieLibraryCard({
  movie,
  selected,
  disabled = false,
  onSelect,
}: MovieLibraryCardProps) {
  const isDisabled = disabled || !isMovieLibraryReady(movie);

  return (
    <CinemaMovieCard
      movie={movie}
      selected={selected}
      disabled={isDisabled}
      onActivate={onSelect}
      hoverLabel="Select movie"
    />
  );
}
