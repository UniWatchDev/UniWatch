import type { MovieResponse } from '@repo/schemas/movies';

export function isMovieLibraryReady(movie: MovieResponse): boolean {
  return movie.has_file && movie.upload_status === 'ready';
}

export function sortOwnedMoviesForLibrary(movies: readonly MovieResponse[]): MovieResponse[] {
  return [...movies].sort((left, right) => {
    const leftReady = isMovieLibraryReady(left);
    const rightReady = isMovieLibraryReady(right);
    if (leftReady !== rightReady) {
      return leftReady ? -1 : 1;
    }

    const leftTime = left.file_uploaded_at !== null ? Date.parse(left.file_uploaded_at) : 0;
    const rightTime = right.file_uploaded_at !== null ? Date.parse(right.file_uploaded_at) : 0;
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return left.name.localeCompare(right.name);
  });
}

export function filterMoviesBySearch(
  movies: readonly MovieResponse[],
  query: string
): MovieResponse[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return [...movies];
  }

  return movies.filter((movie) => movie.name.toLowerCase().includes(normalized));
}

export function formatMovieDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) {
    return null;
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) {
    return `${String(hours)}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${String(minutes)} min`;
}

export function movieLibraryStatusLabel(movie: MovieResponse): string | null {
  if (isMovieLibraryReady(movie)) {
    return 'Ready';
  }
  if (movie.upload_status === 'failed') {
    return 'Failed';
  }
  if (movie.upload_status === 'pending' || movie.has_file) {
    return 'Processing';
  }
  return 'No file';
}
