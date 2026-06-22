import { useState } from 'react';

import {
  formatPlaybackTime,
  formatRateLabel,
  isPlaybackRate,
  PLAYBACK_RATES,
  SEEK_STEPS_SECONDS,
  type PlaybackRate
} from '@/movies/room-playback';
import type { SelectedQuality } from '@/movies/use-hls-player';

// ---------------------------------------------------------------------------
// SVG icons (inline, no dep)
// ---------------------------------------------------------------------------

function IconPlay({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  );
}

function IconPause({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function IconRewind({ seconds }: { seconds: number }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-5.54" />
      <text x="12.5" y="15" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">{seconds}</text>
    </svg>
  );
}

function IconFastForward({ seconds }: { seconds: number }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-.49-5.54" />
      <text x="11.5" y="15" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">{seconds}</text>
    </svg>
  );
}

function IconVolumeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function IconVolumeLow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

function IconVolumeHigh() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 00-2 2v3" />
      <path d="M21 8V5a2 2 0 00-2-2h-3" />
      <path d="M3 16v3a2 2 0 002 2h3" />
      <path d="M16 21h3a2 2 0 002-2v-3" />
    </svg>
  );
}

function IconShrink() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3v3a2 2 0 01-2 2H3" />
      <path d="M21 8h-3a2 2 0 01-2-2V3" />
      <path d="M3 16h3a2 2 0 012 2v3" />
      <path d="M16 21v-3a2 2 0 012-2h3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tooltip wrapper (pure CSS, no portal)
// ---------------------------------------------------------------------------

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ctrl-tip-host">
      {children}
      <span className="ctrl-tip" role="tooltip">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Control icon button
// ---------------------------------------------------------------------------

function CtrlBtn({
  onClick,
  disabled,
  label,
  children
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        className="ctrl-btn"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
      >
        {children}
      </button>
    </Tip>
  );
}

function volumeIcon(muted: boolean, volume: number): React.ReactNode {
  if (muted || volume === 0) return <IconVolumeOff />;
  if (volume < 55) return <IconVolumeLow />;
  return <IconVolumeHigh />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RoomVideoPlayerControls({
  canControl,
  showHostControls,
  isPlaying,
  currentTime,
  duration,
  bufferedEnd,
  qualities,
  selectedQuality,
  currentLevel,
  playbackRate,
  muted,
  volume,
  isFullscreen,
  onTogglePlay,
  onScrub,
  onSeekBy,
  onSelectQuality,
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
  qualities: number[];
  selectedQuality: SelectedQuality;
  currentLevel: number | null;
  playbackRate: number;
  muted: boolean;
  volume: number;
  isFullscreen: boolean;
  onTogglePlay: () => void;
  onScrub: (seconds: number) => void;
  onSeekBy: (deltaSeconds: number) => void;
  onSelectQuality: (quality: SelectedQuality) => void;
  onPlaybackRateChange: (rate: PlaybackRate) => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleFullscreen: () => void;
  onInteract: () => void;
}) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(currentTime);
  const [showQualityPopover, setShowQualityPopover] = useState(false);
  const [showSpeedPopover, setShowSpeedPopover] = useState(false);

  const act = (fn: () => void) => () => { onInteract(); fn(); };

  const commitScrub = () => {
    if (canControl) onScrub(scrubValue);
    setIsScrubbing(false);
  };

  const displayTime = isScrubbing ? scrubValue : currentTime;
  const scrubMax = Math.max(duration, 0.001);
  const playedPct = Math.min(100, Math.max(0, (displayTime / scrubMax) * 100));
  const bufferedPct = Math.min(100, Math.max(0, (bufferedEnd / scrubMax) * 100));
  const remaining = Math.max(0, duration - displayTime);
  const hasDuration = duration > 0;

  const qualityLabel =
    selectedQuality === 'auto'
      ? currentLevel !== null
        ? `Auto ${String(currentLevel)}p`
        : 'Auto'
      : `${String(selectedQuality)}p`;

  const speedLabel = playbackRate === 1 ? '1×' : `${String(playbackRate)}×`;
  const seekStep = SEEK_STEPS_SECONDS[0];

  return (
    <div className="ctrl-panel" onMouseMove={onInteract} onFocus={onInteract}>

      {/* Scrubber row (full width) */}
      <div className="ctrl-track">
        <div className="ctrl-track__rail" aria-hidden="true">
          <div className="ctrl-track__buffer" style={{ width: `${String(bufferedPct)}%` }} />
          <div className="ctrl-track__played" style={{ width: `${String(playedPct)}%` }} />
        </div>
        <input
          type="range"
          className="ctrl-track__range"
          min={0}
          max={scrubMax}
          step="any"
          value={displayTime}
          disabled={!canControl}
          onPointerDown={() => { onInteract(); setIsScrubbing(true); setScrubValue(currentTime); }}
          onPointerUp={commitScrub}
          onPointerCancel={commitScrub}
          onChange={(e) => {
            onInteract();
            const next = Number(e.target.value);
            setScrubValue(next);
            if (!isScrubbing) onScrub(next);
          }}
          aria-label="Playback position"
        />
      </div>

      {/* Actions row */}
      <div className="ctrl-actions">

        {/* Left cluster: transport + time */}
        <div className="ctrl-cluster ctrl-cluster--left">
          {showHostControls && (
            <>
              <CtrlBtn label={`Back ${String(seekStep)}s`} disabled={!canControl} onClick={act(() => { onSeekBy(-seekStep); })}>
                <IconRewind seconds={seekStep} />
              </CtrlBtn>
              <Tip label={isPlaying ? 'Pause' : 'Play'}>
                <button
                  type="button"
                  className="ctrl-play"
                  disabled={!canControl}
                  onClick={act(onTogglePlay)}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <IconPause size={22} /> : <IconPlay size={22} />}
                </button>
              </Tip>
              <CtrlBtn label={`Forward ${String(seekStep)}s`} disabled={!canControl} onClick={act(() => { onSeekBy(seekStep); })}>
                <IconFastForward seconds={seekStep} />
              </CtrlBtn>
            </>
          )}
          <div className="ctrl-times">
            <span className="ctrl-times__now">{formatPlaybackTime(displayTime)}</span>
            <span className="ctrl-times__sep">/</span>
            <span className="ctrl-times__total">{formatPlaybackTime(duration)}</span>
            {hasDuration && (
              <span className="ctrl-times__remaining">−{formatPlaybackTime(remaining)}</span>
            )}
          </div>
        </div>

        {/* Right cluster: volume + quality + speed + fullscreen */}
        <div className="ctrl-cluster ctrl-cluster--right">
          <div className="ctrl-volume">
            <CtrlBtn label={muted ? 'Unmute' : 'Mute'} onClick={act(onToggleMute)}>
              {volumeIcon(muted, volume)}
            </CtrlBtn>
            <input
              type="range"
              className="ctrl-volume__slider"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => { onInteract(); onVolumeChange(Number(e.target.value)); }}
              aria-label="Volume"
            />
          </div>

          {qualities.length > 0 && (
            <div className="ctrl-popover-host">
              <Tip label="Quality">
                <button
                  type="button"
                  className="ctrl-pill ctrl-pill--quality"
                  onClick={() => { onInteract(); setShowQualityPopover((p) => !p); setShowSpeedPopover(false); }}
                  aria-label={`Quality: ${qualityLabel}`}
                >
                  {qualityLabel}
                </button>
              </Tip>
              {showQualityPopover && (
                <div className="ctrl-popover">
                  <p className="ctrl-popover__label">Quality</p>
                  {([...qualities, 'auto'] as SelectedQuality[]).map((q) => (
                    <button
                      key={q === 'auto' ? 'auto' : String(q)}
                      type="button"
                      className={`ctrl-popover__opt${selectedQuality === q ? ' ctrl-popover__opt--active' : ''}`}
                      onClick={() => { onSelectQuality(q); setShowQualityPopover(false); onInteract(); }}
                    >
                      {q === 'auto' ? 'Auto' : `${String(q)}p`}
                      {q === 'auto' && currentLevel !== null && (
                        <span className="ctrl-popover__sub"> {String(currentLevel)}p</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {showHostControls && (
            <div className="ctrl-popover-host">
              <Tip label="Playback speed">
                <button
                  type="button"
                  className="ctrl-pill"
                  disabled={!canControl}
                  onClick={() => { onInteract(); setShowSpeedPopover((p) => !p); setShowQualityPopover(false); }}
                  aria-label={`Speed: ${speedLabel}`}
                >
                  {speedLabel}
                </button>
              </Tip>
              {showSpeedPopover && (
                <div className="ctrl-popover">
                  <p className="ctrl-popover__label">Speed</p>
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={String(rate)}
                      type="button"
                      className={`ctrl-popover__opt${playbackRate === rate ? ' ctrl-popover__opt--active' : ''}`}
                      onClick={() => {
                        if (isPlaybackRate(rate)) onPlaybackRateChange(rate);
                        setShowSpeedPopover(false);
                        onInteract();
                      }}
                    >
                      {formatRateLabel(rate)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <CtrlBtn label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={act(onToggleFullscreen)}>
            {isFullscreen ? <IconShrink /> : <IconExpand />}
          </CtrlBtn>
        </div>

      </div>
    </div>
  );
}
