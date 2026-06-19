import { Clapperboard, Loader2, Play, Radio } from 'lucide-react';

interface MovieAwaitingHostOverlayProps {
  movieName: string | null | undefined;
  loading: boolean;
  isHost: boolean;
}

export function MovieAwaitingHostOverlay({
  movieName,
  loading,
  isHost
}: MovieAwaitingHostOverlayProps) {
  const trimmedName = movieName?.trim();
  const hasName = trimmedName !== undefined && trimmedName.length > 0;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-linear-to-b from-black/35 via-black/55 to-black/75 px-6 text-center pointer-events-none"
      aria-live="polite"
    >
      <div className="flex max-w-md flex-col items-center gap-4">
        <div
          className="flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_0_32px_rgba(255,255,255,0.08)]"
          aria-hidden="true"
        >
          {loading ? (
            <Loader2 className="size-7 animate-spin" />
          ) : isHost ? (
            <Play className="size-7" />
          ) : (
            <Clapperboard className="size-7" />
          )}
        </div>

        {loading ? (
          <>
            <p className="m-0 font-mono text-xs uppercase tracking-[0.24em] text-white/55">
              Preparing video
            </p>
            <p className="m-0 text-lg font-semibold text-white">Loading new movie…</p>
          </>
        ) : (
          <>
            <p className="m-0 font-mono text-xs uppercase tracking-[0.24em] text-white/55">
              {isHost ? 'Ready when you are' : 'New movie loaded'}
            </p>
            {hasName && (
              <p className="m-0 text-xl font-bold leading-snug text-white">{trimmedName}</p>
            )}
            <p className="m-0 max-w-sm text-sm leading-relaxed text-white/75">
              {isHost
                ? 'Press play on the controls below when you want everyone to watch together.'
                : 'The host changed the movie. You will start watching together when they press play.'}
            </p>

            {!isHost && (
              <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100">
                <Radio className="size-3.5 animate-pulse" aria-hidden="true" />
                Waiting for host to start
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
