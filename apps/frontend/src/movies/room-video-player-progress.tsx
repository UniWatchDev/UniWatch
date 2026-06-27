import { useRef, useState, type PointerEvent } from 'react';

import { formatPlaybackTime } from '@/movies/room-playback';

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function RoomVideoPlayerProgress({
  currentTime,
  duration,
  bufferedEnd,
  disabled,
  onScrub,
  onInteract,
}: {
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  disabled: boolean;
  onScrub: (seconds: number) => void;
  onInteract: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverRatio, setHoverRatio] = useState(0);
  const [scrubRatio, setScrubRatio] = useState(0);

  const safeDuration = Math.max(duration, 0.001);
  const playedRatio = clampRatio(currentTime / safeDuration);
  const bufferedRatio = clampRatio(bufferedEnd);
  const activeRatio = isScrubbing ? scrubRatio : playedRatio;
  const previewRatio = isScrubbing ? scrubRatio : isHovering ? hoverRatio : playedRatio;
  const previewTime = previewRatio * safeDuration;

  const ratioFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (track === null) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return clampRatio((clientX - rect.left) / rect.width);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    onInteract();
    setIsScrubbing(true);
    const ratio = ratioFromClientX(event.clientX);
    setScrubRatio(ratio);
    setHoverRatio(ratio);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const ratio = ratioFromClientX(event.clientX);
    setHoverRatio(ratio);
    if (isScrubbing && !disabled) {
      onInteract();
      setScrubRatio(ratio);
    }
  };

  const finishScrub = (event: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    if (!disabled) {
      const ratio = ratioFromClientX(event.clientX);
      onScrub(ratio * safeDuration);
    }
    setIsScrubbing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      className={`room-video-player__progress${isHovering || isScrubbing ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
      onMouseEnter={() => { setIsHovering(true); }}
      onMouseLeave={() => {
        if (!isScrubbing) {
          setIsHovering(false);
        }
      }}
    >
      {(isHovering || isScrubbing) && (
        <div
          className="room-video-player__progress-tooltip"
          style={{ left: `${String(previewRatio * 100)}%` }}
          aria-hidden="true"
        >
          {formatPlaybackTime(previewTime)}
        </div>
      )}

      <div
        ref={trackRef}
        className="room-video-player__progress-track"
        role="slider"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDuration)}
        aria-valuenow={Math.round(currentTime)}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishScrub}
        onPointerCancel={finishScrub}
        onKeyDown={(event) => {
          if (disabled) return;
          onInteract();
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            onScrub(Math.max(0, currentTime - 5));
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            onScrub(Math.min(safeDuration, currentTime + 5));
          }
        }}
      >
        <div className="room-video-player__progress-rail" aria-hidden="true">
          <div
            className="room-video-player__progress-buffered"
            style={{ width: `${String(bufferedRatio * 100)}%` }}
          />
          <div
            className="room-video-player__progress-played"
            style={{ width: `${String(activeRatio * 100)}%` }}
          />
        </div>
        <div
          className="room-video-player__progress-thumb"
          style={{ left: `${String(activeRatio * 100)}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
