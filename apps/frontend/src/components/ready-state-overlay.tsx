import { Check, Clapperboard, Loader2, Play } from 'lucide-react';

export type ReadyOverlayState = 'uploading' | 'processing' | 'waiting' | 'host-waiting' | 'solo-host-play';

interface ReadyStateOverlayProps {
  state: ReadyOverlayState;
  movieName?: string | null | undefined;
  uploadPercent?: number | null;
  processingPercent?: number | null;
  partialPlayable?: boolean;
  readyCount?: number;
  readinessTotal?: number;
  isCurrentUserReady?: boolean;
  onToggleReady?: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

export function ReadyStateOverlay({
  state,
  movieName,
  uploadPercent = null,
  processingPercent = null,
  partialPlayable = false,
  readyCount = 0,
  readinessTotal = 0,
  isCurrentUserReady = false,
  onToggleReady,
  onPrimaryAction,
  primaryActionLabel,
}: ReadyStateOverlayProps) {
  const trimmedName = movieName?.trim();
  const hasName = trimmedName !== undefined && trimmedName.length > 0;
  const isPreparing = state === 'uploading' || state === 'processing';
  const isSoloHostPlay = state === 'solo-host-play';

  const progressPercent =
    state === 'uploading'
      ? (uploadPercent ?? 0)
      : state === 'processing'
        ? (processingPercent ?? 0)
        : null;
  const lowerContent = state === 'waiting' || state === 'host-waiting';

  return (
    <div className="ready-overlay" aria-live="polite" aria-atomic="true">
      <div className="ready-overlay__backdrop" aria-hidden="true" />

      <div
        className={`ready-overlay__content fade-in${lowerContent ? ' ready-overlay__content--lowered' : ''}`}
      >

        {/* Preparing (uploading / processing) */}
        {isPreparing && (
          <>
            <Loader2 className="ready-overlay__spin" aria-hidden="true" />
            <p className="ready-overlay__eyebrow">
              {state === 'uploading' ? 'Uploading' : 'Preparing'}
            </p>
            {hasName && <h2 className="ready-overlay__title">{trimmedName}</h2>}
            {progressPercent !== null && (
              <p className="ready-overlay__pct">{String(progressPercent)}%</p>
            )}
            {state === 'processing' && partialPlayable && (
              <span className="ready-overlay__pill">Playable now</span>
            )}
            {state === 'processing' && partialPlayable && (
              <p className="ready-overlay__hint">More of the movie is still preparing.</p>
            )}
          </>
        )}

        {/* Viewer waiting for host */}
        {state === 'waiting' && (
          <>
            <Clapperboard className="ready-overlay__glyph" aria-hidden="true" />
            <p className="ready-overlay__eyebrow">Waiting for host</p>
            {hasName && <h2 className="ready-overlay__title">{trimmedName}</h2>}
            {readinessTotal > 0 && (
              <span className="ready-overlay__pill">
                {String(readyCount)} / {String(readinessTotal)} ready
              </span>
            )}
            {onToggleReady !== undefined && (
              <button
                type="button"
                className={`ready-overlay__ready-btn${isCurrentUserReady ? ' ready-overlay__ready-btn--done' : ' ready-overlay__ready-btn--pulse'}`}
                onClick={onToggleReady}
                aria-pressed={isCurrentUserReady}
              >
                {isCurrentUserReady ? (
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    You&rsquo;re ready
                  </>
                ) : (
                  "I'm ready"
                )}
              </button>
            )}
          </>
        )}

        {/* Host waiting for viewers */}
        {state === 'host-waiting' && (
          <>
            <Clapperboard className="ready-overlay__glyph" aria-hidden="true" />
            <p className="ready-overlay__eyebrow">Ready to start</p>
            {hasName && <h2 className="ready-overlay__title">{trimmedName}</h2>}
            {readinessTotal > 0 ? (
              <p className="ready-overlay__bignum">
                {String(readyCount)} / {String(readinessTotal)}
                <span>viewers ready</span>
              </p>
            ) : null}
            <p className="ready-overlay__hint">Press play to begin</p>
          </>
        )}

        {/* Solo-host play prompt */}
        {isSoloHostPlay && (
          <>
            <Play className="ready-overlay__glyph" aria-hidden="true" />
            <p className="ready-overlay__eyebrow">Ready to start</p>
            {hasName && <h2 className="ready-overlay__title">{trimmedName}</h2>}
            <p className="ready-overlay__hint">
              You’re the only one here. Start the movie whenever you’re ready.
            </p>
            {onPrimaryAction !== undefined && (
              <button
                type="button"
                className="ready-overlay__ready-btn ready-overlay__ready-btn--pulse ready-overlay__ready-btn--solo"
                onClick={onPrimaryAction}
                aria-label={primaryActionLabel ?? 'Play movie'}
              >
                <Play className="size-4" aria-hidden="true" />
                {primaryActionLabel ?? 'Play movie'}
              </button>
            )}
          </>
        )}

      </div>

      {/* Thin progress bar pinned to the bottom of the whole overlay */}
      {progressPercent !== null && (
        <div className="ready-overlay__prog-rail" aria-hidden="true">
          <div
            className="ready-overlay__prog-fill"
            style={{ width: `${String(Math.max(2, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
