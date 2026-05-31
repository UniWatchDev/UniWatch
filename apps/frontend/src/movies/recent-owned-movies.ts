import type { MovieResponse } from '@repo/schemas/movies';

const RECENT_UPLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getRecentReadyOwnedMovies(movies: readonly MovieResponse[], now = Date.now()): MovieResponse[] {
  return movies.filter((movie) => {
    if (!movie.has_file || movie.upload_status !== 'ready' || movie.file_uploaded_at === null) {
      return false;
    }
    const uploadedAt = new Date(movie.file_uploaded_at);
    if (Number.isNaN(uploadedAt.getTime())) {
      return false;
    }
    return now - uploadedAt.getTime() <= RECENT_UPLOAD_WINDOW_MS;
  });
}
