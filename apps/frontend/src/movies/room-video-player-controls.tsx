import { useState } from 'react';

import {
  formatPlaybackTime,
  formatRateLabel,
  isPlaybackRate,
  PLAYBACK_RATES,
  SEEK_STEPS_SECONDS,
  type PlaybackRate
} from '@/movies/room-playback';

function VolumeIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

function FullscreenIcon({ exit }: { exit: boolean }) {
  if (exit) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 3v3a2 2 0 01-2 2H3" />
        <path d="M21 8h-3a2 2 0 01-2-2V3" />
        <path d="M3 16h3a2 2 0 012 2v3" />
        <path d="M16 21v-3a2 2 0 012-2h3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 00-2 2v3" />
      <path d="M21 8V5a2 2 0 00-2-2h-3" />
      <path d="M3 16v3a2 2 0 002 2h3" />
      <path d="M16 21h3a2 2 0 002-2v-3" />
    </svg>
  );
}

export function RoomVideoPlayerControls({
  canControl,
  showHostControls,
  currentTime,
  duration,
  playbackRate,
  muted,
  volume,
  isFullscreen,
  movieName,
  statusText,
  isLive,
  onScrub,
  onSeekBy,
  onPlaybackRateChange,
  onToggleMute,
  onVolumeChange,
  onToggleFullscreen,
  onInteract,
}: {
  canControl: boolean;
  showHostControls: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  muted: boolean;
  volume: number;
  isFullscreen: boolean;
  movieName?: string | null | undefined;
  statusText?: string;
  isLive?: boolean;
  onScrub: (seconds: number) => void;
  onSeekBy: (deltaSeconds: number) => void;
  onPlaybackRateChange: (rate: PlaybackRate) => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleFullscreen: () => void;
  onInteract: () => void;
}) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(currentTime);

  const stopAnd = (fn: () => void) => () => {
    onInteract();
    fn();
  };

  const commitScrub = () => {
    if (!canControl) {
      setIsScrubbing(false);
      return;
    }
    onScrub(scrubValue);
    setIsScrubbing(false);
  };

  const displayTime = isScrubbing ? scrubValue : currentTime;
  const scrubMax = Math.max(duration, 0.001);

  return (
    <div className="room-video-player__controls-panel" onMouseMove={onInteract} onFocus={onInteract}>
      {!isFullscreen && (movieName != null || statusText != null) && (
        <div className="room-video-player__toolbar-meta">
          {movieName != null && movieName.length > 0 && (
            <span className="room-video-player__toolbar-movie">{movieName}</span>
          )}
          {statusText != null && (
            <span className={`room-video-player__toolbar-status${isLive === true ? ' room-video-player__toolbar-status--live' : ''}`}>
              <span className="room-video-player__status-dot" aria-hidden="true" />
              {statusText}
            </span>
          )}
        </div>
      )}

      <div className="room-video-player__scrubber">
        <span className="room-video-player__time">{formatPlaybackTime(displayTime)}</span>
        <input
          type="range"
          className="room-video-player__range room-video-player__range--scrub"
          min={0}
          max={scrubMax}
          step="any"
          value={displayTime}
          disabled={!canControl}
          onPointerDown={() => {
            onInteract();
            setIsScrubbing(true);
            setScrubValue(currentTime);
          }}
          onPointerUp={commitScrub}
          onPointerCancel={commitScrub}
          onChange={(e) => {
            onInteract();
            const next = Number(e.target.value);
            setScrubValue(next);
            if (!isScrubbing) {
              onScrub(next);
            }
          }}
          aria-label="Playback position"
        />
        <span className="room-video-player__time">{formatPlaybackTime(duration)}</span>
      </div>

      <div className="room-video-player__actions">
        {showHostControls && (
          <div className="room-video-player__transport-group" aria-label="Playback controls">
            <button
              type="button"
              className="room-video-player__seek-btn room-video-player__seek-btn--primary"
              disabled={!canControl}
              onClick={stopAnd(() => { onSeekBy(-SEEK_STEPS_SECONDS[0]); })}
              title="Back 5 seconds"
            >
              −5s
            </button>

            <button
              type="button"
              className="room-video-player__seek-btn room-video-player__seek-btn--primary"
              disabled={!canControl}
              onClick={stopAnd(() => { onSeekBy(SEEK_STEPS_SECONDS[0]); })}
              title="Forward 5 seconds"
            >
              +5s
            </button>
          </div>
        )}

        <div className="room-video-player__utility-group">
          {showHostControls && (
            <>
              <label className="room-video-player__speed">
                <span className="room-video-player__speed-label">Speed</span>
                <select
                  className="room-video-player__speed-select"
                  value={String(playbackRate)}
                  disabled={!canControl}
                  onChange={(e) => {
                    onInteract();
                    const rate = Number(e.target.value);
                    if (isPlaybackRate(rate)) {
                      onPlaybackRateChange(rate);
                    }
                  }}
                  aria-label="Playback speed"
                >
                  {PLAYBACK_RATES.map((rate) => (
                    <option key={String(rate)} value={String(rate)}>
                      {formatRateLabel(rate)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="room-video-player__volume">
            <button
              type="button"
              className="room-video-player__icon-btn"
              onClick={stopAnd(onToggleMute)}
              title={muted ? 'Unmute' : 'Mute'}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              <VolumeIcon muted={muted} />
            </button>
            <input
              type="range"
              className="room-video-player__range room-video-player__range--volume"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              disabled={!canControl}
              onChange={(e) => { onInteract(); onVolumeChange(Number(e.target.value)); }}
              aria-label="Volume"
            />
          </div>

          <button
            type="button"
            className="room-video-player__icon-btn"
            onClick={stopAnd(onToggleFullscreen)}
            title={isFullscreen ? 'Exit full view' : 'Full view'}
            aria-label={isFullscreen ? 'Exit full view' : 'Enter full view'}
          >
            <FullscreenIcon exit={isFullscreen} />
          </button>
        </div>
      </div>
    </div>
  );
}
