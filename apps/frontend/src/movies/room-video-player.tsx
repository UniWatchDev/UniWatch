import { useEffect, useRef, useState } from 'react';

import { MovieUploadProgress } from '@/movies/movie-upload-progress';
import type { PlaybackRate } from '@/movies/room-playback';
import { RoomVideoPlayerControls } from '@/movies/room-video-player-controls';
import { useFullscreenOverlayControls } from '@/movies/use-fullscreen-overlay-controls';

function CenterPlayIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

export function RoomVideoPlayer({
  roomName,
  movieName,
  statusText,
  isLive,
  loading,
  error,
  isUploading,
  isFailed,
  mediaSrc,
  videoRef,
  videoReady,
  videoError,
  canControl,
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  muted,
  volume,
  onTogglePlay,
  onTimeUpdate,
  onLoadedMetadata,
  onPlay,
  onPause,
  onEnded,
  onCanPlay,
  onVideoError,
  onScrub,
  onSeekBy,
  onPlaybackRateChange,
  onToggleMute,
  onVolumeChange,
  ownerActions,
  placeholderText,
}: {
  roomName: string;
  movieName: string | null | undefined;
  statusText: string;
  isLive: boolean;
  loading: boolean;
  error: string | null;
  isUploading: boolean;
  isFailed: boolean;
  mediaSrc: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoReady: boolean;
  videoError: string | null;
  canControl: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  muted: boolean;
  volume: number;
  onTogglePlay: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onCanPlay: () => void;
  onVideoError: () => void;
  onScrub: (seconds: number) => void;
  onSeekBy: (deltaSeconds: number) => void;
  onPlaybackRateChange: (rate: PlaybackRate) => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  ownerActions?: React.ReactNode;
  placeholderText?: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { overlayVisible, revealControls } = useFullscreenOverlayControls(isFullscreen, isPlaying);
  const showPlaceholder = mediaSrc === null;
  const showCenterPlay = canControl && !isPlaying && videoReady && mediaSrc !== null && !videoError;

  useEffect(() => {
    const onNativeFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', onNativeFullscreenChange);
    return () => { document.removeEventListener('fullscreenchange', onNativeFullscreenChange); };
  }, []);

  const handleShellFullscreen = () => {
    const shell = shellRef.current;
    if (shell === null) return;
    if (document.fullscreenElement === shell) {
      void document.exitFullscreen();
      return;
    }
    void shell.requestFullscreen();
  };

  const handleStageClick = () => {
    revealControls();
    if (canControl) onTogglePlay();
  };

  const controls = (
    <RoomVideoPlayerControls
      canControl={canControl}
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      playbackRate={playbackRate}
      muted={muted}
      volume={volume}
      isFullscreen={isFullscreen}
      movieName={movieName}
      statusText={statusText}
      isLive={isLive}
      onScrub={onScrub}
      onTogglePlay={onTogglePlay}
      onSeekBy={onSeekBy}
      onPlaybackRateChange={onPlaybackRateChange}
      onToggleMute={onToggleMute}
      onVolumeChange={onVolumeChange}
      onToggleFullscreen={handleShellFullscreen}
      onInteract={revealControls}
    />
  );

  return (
    <div
      ref={shellRef}
      className="room-video-player"
      onMouseMove={isFullscreen ? revealControls : undefined}
    >
      <div className="room-video-player__body">
        <div className="room-video-player__stage">
          {mediaSrc !== null && (
            <video
              ref={videoRef}
              className="room-video-player__video"
              src={mediaSrc}
              crossOrigin="use-credentials"
              onClick={handleStageClick}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onPlay={onPlay}
              onPause={onPause}
              onEnded={onEnded}
              onCanPlay={onCanPlay}
              onError={onVideoError}
              playsInline
              preload="metadata"
            />
          )}

          {showPlaceholder && (
            <div className="room-video-player__overlay room-video-player__overlay--placeholder">
              <div className="room-video-player__placeholder-stack">
                {loading ? (
                  <>
                    <p className="room-video-player__placeholder-icon">⏳</p>
                    <p className="room-video-player__placeholder-text">Loading video…</p>
                  </>
                ) : isUploading ? (
                  <>
                    <p className="room-video-player__placeholder-icon">📤</p>
                    <p className="room-video-player__placeholder-text">
                      {movieName ? `"${movieName}" is still uploading…` : 'Video is still uploading…'}
                    </p>
                    <div className="room-video-player__upload-progress">
                      <MovieUploadProgress percent={0} indeterminate label="Preparing video for playback" />
                    </div>
                  </>
                ) : isFailed ? (
                  <>
                    <p className="room-video-player__placeholder-icon">⚠️</p>
                    <p className="room-video-player__placeholder-text">Video upload failed. Edit the room to try again.</p>
                  </>
                ) : error ? (
                  <>
                    <p className="room-video-player__placeholder-icon">⚠️</p>
                    <p className="room-video-player__placeholder-text">{error}</p>
                  </>
                ) : (
                  <>
                    <p className="room-video-player__placeholder-icon">⏳</p>
                    <p className="room-video-player__placeholder-text">
                      {placeholderText ?? 'Waiting for the host to upload a video…'}
                    </p>
                  </>
                )}

                {ownerActions && (
                  <div className="room-video-player__owner-actions room-video-player__overlay--interactive">
                    {ownerActions}
                  </div>
                )}
              </div>
            </div>
          )}

          {mediaSrc !== null && !videoReady && !videoError && (
            <div className="room-video-player__overlay room-video-player__overlay--loading">Loading video…</div>
          )}

          {videoError !== null && (
            <div className="room-video-player__overlay room-video-player__overlay--error room-video-player__overlay--interactive">
              {videoError}
            </div>
          )}

          {showCenterPlay && (
            <button
              type="button"
              className="room-video-player__center-play"
              onClick={(e) => {
                e.stopPropagation();
                revealControls();
                onTogglePlay();
              }}
              aria-label="Play"
            >
              <CenterPlayIcon />
            </button>
          )}

          {isFullscreen && (
            <div
              className={`room-video-player__controls room-video-player__controls--overlay${overlayVisible ? ' is-visible' : ''}`}
            >
              <div className="room-video-player__overlay-title">
                <span>{roomName}</span>
                {movieName && <span className="room-video-player__overlay-title-sep">·</span>}
                {movieName && <span>{movieName}</span>}
              </div>
              {controls}
            </div>
          )}
        </div>

        {!isFullscreen && (
          <div className="room-video-player__controls room-video-player__controls--docked">
            {controls}
          </div>
        )}
      </div>
    </div>
  );
}
