import { Clapperboard, Loader2, Play, Users } from 'lucide-react';

interface RoomMovieChangeNoticeProps {
  movieName: string | null | undefined;
  isHost: boolean;
  loading: boolean;
}

export function RoomMovieChangeNotice({
  movieName,
  isHost,
  loading
}: RoomMovieChangeNoticeProps) {
  const trimmedName = movieName?.trim();
  const hasName = trimmedName !== undefined && trimmedName.length > 0;

  return (
    <div
      className="room-movie-change-notice flex shrink-0 items-start gap-3 border-b border-amber-500/25 bg-amber-500/10 px-5 py-3.5 animate-in slide-in-from-top-2 fade-in duration-300"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-200"
        aria-hidden="true"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isHost ? (
          <Play className="size-4" />
        ) : (
          <Clapperboard className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-800/70 dark:text-amber-200/70">
          {loading ? 'Loading new movie' : isHost ? 'Movie updated' : 'New movie in this room'}
        </p>
        <p className="mt-1 mb-0 text-sm font-semibold text-foreground">
          {hasName ? `"${trimmedName}"` : 'The host picked a new video'}
        </p>
        <p className="mt-1 mb-0 text-xs leading-relaxed text-muted-foreground">
          {loading ? (
            'Hang tight — the video is preparing for everyone.'
          ) : isHost ? (
            'Press play when you are ready. Everyone will sync with you.'
          ) : (
            <>
              <Users className="mr-1 inline-block size-3.5 align-[-2px]" aria-hidden="true" />
              Playback starts when the host presses play. You will stay in sync automatically.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
