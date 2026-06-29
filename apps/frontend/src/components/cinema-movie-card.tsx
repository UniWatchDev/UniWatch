import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { MovieResponse } from '@repo/schemas/movies';

import { formatMovieDuration } from '@/movies/selectable-owned-movies';
import { useMovieThumbnail } from '@/movies/use-movie-thumbnail';

export interface CinemaMovieCardProps {
  movie: MovieResponse;
  selected?: boolean;
  disabled?: boolean;
  interactive?: boolean;
  hoverLabel?: string | null;
  footerExtra?: ReactNode;
  onActivate?: () => void;
  className?: string;
}

export function CinemaMovieCard({
  movie,
  selected = false,
  disabled = false,
  interactive = true,
  hoverLabel = 'Select movie',
  footerExtra,
  onActivate,
  className = '',
}: CinemaMovieCardProps) {
  const thumbnailUrl = useMovieThumbnail(movie.id, movie.thumbnail_url);
  const duration = formatMovieDuration(movie.duration_seconds);
  const isInteractive = interactive && !disabled && onActivate !== undefined;

  const shellClassName = [
    'cinema-card-shell',
    'cinema-card-hover',
    isInteractive ? 'group relative cursor-pointer' : 'relative',
    selected ? 'is-selected cinema-movie-card is-selected' : 'cinema-movie-card',
    disabled ? 'is-disabled' : '',
    className,
  ]
    .filter((value) => value.length > 0)
    .join(' ');

  const shellStyle = { width: '100%', padding: 0, textAlign: 'left' as const };

  const content = (
    <>
      {thumbnailUrl != null ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="cinema-card-fallback-bg absolute inset-0" aria-hidden="true" />
      )}

      {selected && (
        <div className="absolute right-3 top-3 z-10">
          <div
            className="flex items-center justify-center rounded-full p-1.5 backdrop-blur-sm"
            style={{ background: 'var(--accent)', color: 'var(--primary-foreground)' }}
          >
            <Check size={11} />
          </div>
        </div>
      )}

      <div className="cinema-card-gradient absolute inset-0 z-10" />

      <div className="absolute inset-x-0 bottom-0 z-20 p-3">
        <p className="mb-0.5 truncate font-mono text-[10px] uppercase tracking-widest text-white/45">
          {movie.language}
        </p>

        <p
          className="mb-2 truncate font-bold leading-tight text-white"
          style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}
        >
          {movie.name}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-white/35">
            {duration ?? 'Duration unknown'}
          </span>
          {footerExtra}
        </div>
      </div>

      {isInteractive && hoverLabel !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md ring-1 ring-white/20">
            {hoverLabel}
          </div>
        </div>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        onClick={onActivate}
        className={`${shellClassName} overflow-hidden rounded-xl`}
        style={shellStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`${shellClassName} overflow-hidden rounded-xl`} style={shellStyle}>
      {content}
    </div>
  );
}
