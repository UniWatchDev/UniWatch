import { useEffect, useRef, useState } from 'react';
import {
  Gauge,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { RoomVideoPlayerProgress } from '@/movies/room-video-player-progress';
import {
  formatPlaybackTime,
  formatRateLabel,
  PLAYBACK_RATES,
  SEEK_STEPS_SECONDS,
  type PlaybackRate,
} from '@/movies/room-playback';
import type { PlayerToolbarStatusTone } from '@/rooms/room-status-display';

function PlaybackSpeedMenu({
  playbackRate,
  disabled,
  onChange,
  onInteract,
}: {
  playbackRate: number;
  disabled: boolean;
  onChange: (rate: PlaybackRate) => void;
  onInteract: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node) !== true) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="room-video-player__speed-menu">
      <button
        type="button"
        className="room-video-player__chrome-btn room-video-player__speed-trigger"
        disabled={disabled}
        aria-label="Playback speed"
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Playback speed"
        onClick={() => {
          onInteract();
          setOpen((value) => !value);
        }}
      >
        <Gauge size={18} strokeWidth={2} aria-hidden="true" />
        <span className="room-video-player__speed-value">{formatRateLabel(playbackRate)}</span>
      </button>

      {open && (
        <div className="room-video-player__speed-popover" role="listbox" aria-label="Playback speed">
          {PLAYBACK_RATES.map((rate) => (
            <button
              key={String(rate)}
              type="button"
              role="option"
              aria-selected={rate === playbackRate}
              className={`room-video-player__speed-option${rate === playbackRate ? ' is-selected' : ''}`}
              onClick={() => {
                onInteract();
                onChange(rate);
                setOpen(false);
              }}
            >
              {formatRateLabel(rate)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VolumeControl({
  muted,
  volume,
  onToggleMute,
  onVolumeChange,
  onInteract,
}: {
  muted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onInteract: () => void;
}) {
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className="room-video-player__volume">
      <button
        type="button"
        className="room-video-player__chrome-btn"
        onClick={() => {
          onInteract();
          onToggleMute();
        }}
        title={muted ? 'Unmute' : 'Mute'}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        <VolumeIcon size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      <input
        type="range"
        className="room-video-player__volume-slider"
        min={0}
        max={100}
        value={muted ? 0 : volume}
        onChange={(event) => {
          onInteract();
          onVolumeChange(Number(event.target.value));
        }}
        aria-label="Volume"
      />
    </div>
  );
}

export function RoomVideoPlayerControls({
  canControl,
  showHostControls,
  isPlaying,
  currentTime,
  duration,
  bufferedEnd,
  playbackRate,
  muted,
  volume,
  isFullscreen,
  movieName,
  statusText,
  statusTone,
  onTogglePlay,
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
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  playbackRate: number;
  muted: boolean;
  volume: number;
  isFullscreen: boolean;
  movieName?: string | null | undefined;
  statusText?: string;
  statusTone?: PlayerToolbarStatusTone;
  onTogglePlay: () => void;
  onScrub: (seconds: number) => void;
  onSeekBy: (deltaSeconds: number) => void;
  onPlaybackRateChange: (rate: PlaybackRate) => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleFullscreen: () => void;
  onInteract: () => void;
}) {
  const stopAnd = (fn: () => void) => () => {
    onInteract();
    fn();
  };

  return (
    <div
      className="room-video-player__controls-panel"
      onMouseMove={onInteract}
      onFocus={onInteract}
      onClick={(event) => { event.stopPropagation(); }}
    >
      {!isFullscreen && (movieName != null || statusText != null) && (
        <div className="room-video-player__toolbar-meta">
          {movieName != null && movieName.length > 0 && (
            <span className="room-video-player__toolbar-movie">{movieName}</span>
          )}
          {statusText != null && (
            <span className={`room-video-player__toolbar-status room-video-player__toolbar-status--${statusTone ?? 'waiting'}`}>
              <span className="room-video-player__status-dot" aria-hidden="true" />
              {statusText}
            </span>
          )}
        </div>
      )}

      <RoomVideoPlayerProgress
        currentTime={currentTime}
        duration={duration}
        bufferedEnd={bufferedEnd}
        disabled={!canControl}
        onScrub={onScrub}
        onInteract={onInteract}
      />

      <div className="room-video-player__transport">
        <div className="room-video-player__transport-left">
          {showHostControls && (
            <>
              <button
                type="button"
                className="room-video-player__chrome-btn"
                disabled={!canControl}
                onClick={stopAnd(onTogglePlay)}
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={20} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Play size={20} strokeWidth={2} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                className="room-video-player__chrome-btn"
                disabled={!canControl}
                onClick={stopAnd(() => { onSeekBy(-SEEK_STEPS_SECONDS[0]); })}
                title={`Back ${String(SEEK_STEPS_SECONDS[0])} seconds`}
                aria-label={`Back ${String(SEEK_STEPS_SECONDS[0])} seconds`}
              >
                <RotateCcw size={18} strokeWidth={2} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="room-video-player__chrome-btn"
                disabled={!canControl}
                onClick={stopAnd(() => { onSeekBy(SEEK_STEPS_SECONDS[0]); })}
                title={`Forward ${String(SEEK_STEPS_SECONDS[0])} seconds`}
                aria-label={`Forward ${String(SEEK_STEPS_SECONDS[0])} seconds`}
              >
                <RotateCw size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div className="room-video-player__transport-center">
          <span className="room-video-player__time">
            {formatPlaybackTime(currentTime)}
            <span className="room-video-player__time-sep" aria-hidden="true"> / </span>
            {formatPlaybackTime(duration)}
          </span>
        </div>

        <div className="room-video-player__transport-right">
          {showHostControls && (
            <PlaybackSpeedMenu
              playbackRate={playbackRate}
              disabled={!canControl}
              onChange={onPlaybackRateChange}
              onInteract={onInteract}
            />
          )}

          <VolumeControl
            muted={muted}
            volume={volume}
            onToggleMute={onToggleMute}
            onVolumeChange={onVolumeChange}
            onInteract={onInteract}
          />

          <button
            type="button"
            className="room-video-player__chrome-btn"
            onClick={stopAnd(onToggleFullscreen)}
            title={isFullscreen ? 'Exit full view' : 'Full view'}
            aria-label={isFullscreen ? 'Exit full view' : 'Enter full view'}
          >
            {isFullscreen ? (
              <Minimize size={18} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Maximize size={18} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
