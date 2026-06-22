import { Clapperboard, Loader2, Play, Users } from 'lucide-react';

interface RoomMovieChangeNoticeProps {
  movieName: string | null | undefined;
  variant: 'first' | 'changed';
  isHost: boolean;
  loading: boolean;
  uploadPercent?: number | null;
  processingPercent?: number | null;
  readyCount?: number;
  readinessTotal?: number;
  isCurrentUserReady?: boolean;
  onToggleReady?: () => void;
}

export function RoomMovieChangeNotice({
  movieName,
  variant,
  isHost,
  loading,
  uploadPercent = null,
  processingPercent = null,
  readyCount = 0,
  readinessTotal = 0,
  isCurrentUserReady = false,
  onToggleReady
}: RoomMovieChangeNoticeProps) {
  const trimmedName = movieName?.trim();
  const hasName = trimmedName !== undefined && trimmedName.length > 0;
  const isFirst = variant === 'first';
  const preparing =
    uploadPercent !== null || processingPercent !== null || loading;

  const statusLabel = preparing
    ? uploadPercent !== null
      ? `Uploading ${String(uploadPercent)}%`
      : processingPercent !== null
        ? `Preparing ${String(processingPercent)}%`
        : 'Preparing movie'
    : isFirst
      ? isHost
        ? 'Ready to start'
        : 'Waiting for host'
      : isHost
        ? 'Movie updated'
        : 'New movie in this room';

  const title = isFirst
    ? isHost
      ? hasName
        ? `"${trimmedName}" is ready`
        : 'Your movie is ready'
      : hasName
        ? `"${trimmedName}"`
        : 'Waiting for the host to start the movie'
    : hasName
      ? `"${trimmedName}"`
      : 'The host picked a new video';

  const description = preparing
    ? uploadPercent !== null
      ? 'The video is uploading directly to storage. Everyone will see it once processing finishes.'
      : processingPercent !== null
        ? 'The video is transcoding for smooth playback. This usually takes a few minutes.'
        : 'Hang tight — the video is preparing for everyone.'
    : isFirst
      ? isHost
        ? readinessTotal > 0
          ? `${String(readyCount)}/${String(readinessTotal)} viewers are ready. Press play when you want to start.`
          : 'Press play when you are ready. Everyone will sync with you.'
        : 'The host will press play when everyone is set. Mark yourself ready so they know you are waiting.'
      : isHost
        ? 'Press play when you are ready. Everyone will sync with you.'
        : 'Playback starts when the host presses play. You will stay in sync automatically.';

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
        {preparing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isHost ? (
          <Play className="size-4" />
        ) : (
          <Clapperboard className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-800/70 dark:text-amber-200/70">
          {statusLabel}
        </p>
        <p className="mt-1 mb-0 text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 mb-0 text-xs leading-relaxed text-muted-foreground">
          {!preparing && readinessTotal > 0 && (
            <>
              <Users className="mr-1 inline-block size-3.5 align-[-2px]" aria-hidden="true" />
              <span className="font-semibold text-foreground">
                {String(readyCount)}/{String(readinessTotal)} ready
              </span>
              {' · '}
            </>
          )}
          {description}
        </p>

        {!isHost && !preparing && isFirst && onToggleReady !== undefined && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={isCurrentUserReady ? 'btn-ghost' : 'btn-primary'}
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={onToggleReady}
            >
              {isCurrentUserReady ? 'Unready' : 'Ready'}
            </button>
            <span className="text-xs text-muted-foreground">
              {isCurrentUserReady ? 'Waiting for the host to press play' : 'Let the host know you are ready'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
