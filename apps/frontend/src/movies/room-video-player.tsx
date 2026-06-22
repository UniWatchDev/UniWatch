import { useEffect, useRef, useState } from 'react';

import { MovieAwaitingHostOverlay } from '@/components/movie-awaiting-host-overlay';
import { ReadyStateOverlay } from '@/components/ready-state-overlay';
import type { ReadyOverlayState } from '@/components/ready-state-overlay';
import { ViewerNoMovieOverlay } from '@/components/viewer-no-movie-overlay';
import type { PlaybackRate } from '@/movies/room-playback';
import { RoomVideoPlayerControls } from '@/movies/room-video-player-controls';
import type { SelectedQuality } from '@/movies/use-hls-player';
import { useFullscreenOverlayControls } from '@/movies/use-fullscreen-overlay-controls';

function CenterPlayIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

export function RoomVideoPlayer({
  roomName,
  movieName,
  loading,
  error,
  isUploading,
  isFailed,
  uploadPercent = null,
  processingPercent = null,
  mediaSrc,
  isHls = false,
  videoKey,
  videoRef,
  videoReady,
  videoError,
  canControl,
  showHostControls,
  currentTime,
  duration,
  bufferedEnd,
  qualities,
  selectedQuality,
  currentLevel = null,
  isPlaying,
  playbackRate,
  muted,
  volume,
  showAwaitingHostOverlay = false,
  awaitingHostMovieName,
  awaitingHostLoading = false,
  isHostViewer = false,
  showSoloHostPlayOverlay = false,
  ownerUploadOverlay,
  readyOverlayState = null,
  readyOverlayMovieName,
  readyUploadPercent = null,
  readyProcessingPercent = null,
  processingPartial = false,
  readyCount = 0,
  readinessTotal = 0,
  isCurrentUserReady = false,
  onToggleReady,
  onLoadedData,
  onTogglePlay,
  onTimeUpdate,
  onLoadedMetadata,
  onProgress,
  onPlay,
  onPause,
  onEnded,
  onCanPlay,
  onVideoError,
  onScrub,
  onSeekBy,
  onSelectQuality,
  onPlaybackRateChange,
  onToggleMute,
  onVolumeChange,
}: {
  roomName: string;
  movieName: string | null | undefined;
  loading: boolean;
  error: string | null;
  isUploading: boolean;
  isFailed: boolean;
  uploadPercent?: number | null;
  processingPercent?: number | null;
  mediaSrc: string | null;
  isHls?: boolean;
  videoKey: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoReady: boolean;
  videoError: string | null;
  canControl: boolean;
  showHostControls: boolean;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  qualities: number[];
  selectedQuality: SelectedQuality;
  currentLevel?: number | null;
  isPlaying: boolean;
  playbackRate: number;
  muted: boolean;
  volume: number;
  showAwaitingHostOverlay?: boolean;
  awaitingHostMovieName?: string | null;
  awaitingHostLoading?: boolean;
  isHostViewer?: boolean;
  showSoloHostPlayOverlay?: boolean;
  ownerUploadOverlay?: React.ReactNode;
  readyOverlayState?: ReadyOverlayState | null;
  readyOverlayMovieName?: string | null;
  readyUploadPercent?: number | null;
  readyProcessingPercent?: number | null;
  processingPartial?: boolean;
  readyCount?: number;
  readinessTotal?: number;
  isCurrentUserReady?: boolean;
  onToggleReady?: () => void;
  onLoadedData?: () => void;
  onTogglePlay: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onProgress: () => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onCanPlay: () => void;
  onVideoError: () => void;
  onScrub: (seconds: number) => void;
  onSeekBy: (deltaSeconds: number) => void;
  onSelectQuality: (quality: SelectedQuality) => void;
  onPlaybackRateChange: (rate: PlaybackRate) => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { overlayVisible, revealControls, hideControls } = useFullscreenOverlayControls(isFullscreen, isPlaying);
  const showPlaceholder = mediaSrc === null && readyOverlayState === null;
  const showNoMovieOverlay =
    showPlaceholder && !loading && !isUploading && !isFailed && error === null;
  const showCenterPlay =
    canControl &&
    !isPlaying &&
    videoReady &&
    mediaSrc !== null &&
    !videoError &&
    !showAwaitingHostOverlay &&
    !showSoloHostPlayOverlay;

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
      showHostControls={showHostControls}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      bufferedEnd={bufferedEnd}
      qualities={qualities}
      selectedQuality={selectedQuality}
      currentLevel={currentLevel ?? null}
      playbackRate={playbackRate}
      muted={muted}
      volume={volume}
      isFullscreen={isFullscreen}
      onTogglePlay={onTogglePlay}
      onScrub={onScrub}
      onSeekBy={onSeekBy}
      onSelectQuality={onSelectQuality}
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
      onMouseMove={revealControls}
      onMouseLeave={hideControls}
    >
      <div className="room-video-player__body">
        <div className="room-video-player__stage">
          {mediaSrc !== null && (
            <video
              key={videoKey ?? mediaSrc}
              ref={videoRef}
              className="room-video-player__video"
              // For HLS the hls.js hook (or native Safari) owns the source; for
              // plain MP4 the element keeps driving its own src.
              src={isHls ? undefined : mediaSrc}
              onClick={handleStageClick}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onLoadedData={onLoadedData}
              onProgress={onProgress}
              onPlay={onPlay}
              onPause={onPause}
              onEnded={onEnded}
              onCanPlay={onCanPlay}
              onError={onVideoError}
              playsInline
              preload="auto"
            />
          )}

          {showPlaceholder && loading && (
            <ReadyStateOverlay
              state="processing"
              movieName={movieName}
              processingPercent={0}
            />
          )}

          {showPlaceholder && !loading && isUploading && (
            <ReadyStateOverlay
              state={uploadPercent !== null ? 'uploading' : 'processing'}
              movieName={movieName}
              uploadPercent={uploadPercent}
              processingPercent={processingPercent}
            />
          )}

          {showPlaceholder && !loading && !isUploading && isFailed && (
            <div className="ready-overlay" aria-live="polite">
              <div className="ready-overlay__backdrop" aria-hidden="true" />
              <div className="ready-overlay__content fade-in">
                <p className="ready-overlay__eyebrow">Upload failed</p>
                <h2 className="ready-overlay__title">Could not prepare video</h2>
                <p className="ready-overlay__hint">
                  Video upload failed. Edit the room to try again.
                </p>
              </div>
            </div>
          )}

          {showPlaceholder && !loading && !isUploading && !isFailed && error !== null && (
            <div className="ready-overlay" aria-live="polite">
              <div className="ready-overlay__backdrop" aria-hidden="true" />
              <div className="ready-overlay__content fade-in">
                <p className="ready-overlay__eyebrow">Playback error</p>
                <h2 className="ready-overlay__title">Something went wrong</h2>
                <p className="ready-overlay__hint">{error}</p>
              </div>
            </div>
          )}

          {showNoMovieOverlay && ownerUploadOverlay}

          {showNoMovieOverlay && !ownerUploadOverlay && !isHostViewer && (
            <ViewerNoMovieOverlay />
          )}

          {showAwaitingHostOverlay && !readyOverlayState && (
            <MovieAwaitingHostOverlay
              movieName={awaitingHostMovieName}
              loading={awaitingHostLoading}
              isHost={isHostViewer}
            />
          )}

          {readyOverlayState !== null && (
            <ReadyStateOverlay
              state={readyOverlayState}
              movieName={readyOverlayMovieName ?? null}
              uploadPercent={readyUploadPercent}
              processingPercent={readyProcessingPercent}
              partialPlayable={processingPartial}
              readyCount={readyCount}
              readinessTotal={readinessTotal}
              isCurrentUserReady={isCurrentUserReady}
              {...(onToggleReady !== undefined ? { onToggleReady } : {})}
            />
          )}

          {showSoloHostPlayOverlay && (
            <ReadyStateOverlay
              state="solo-host-play"
              movieName={movieName ?? null}
              onPrimaryAction={onTogglePlay}
              primaryActionLabel="Play movie"
            />
          )}

          {mediaSrc !== null &&
            !videoReady &&
            !videoError &&
            currentTime === 0 &&
            !showAwaitingHostOverlay && (
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

          {mediaSrc !== null && readyOverlayState === null && (
            <div
              className={`room-video-player__controls room-video-player__controls--overlay${overlayVisible ? ' is-visible' : ''}`}
            >
              {isFullscreen && (
                <div className="room-video-player__overlay-title">
                  <span>{roomName}</span>
                  {movieName && <span className="room-video-player__overlay-title-sep">·</span>}
                  {movieName && <span>{movieName}</span>}
                </div>
              )}
              {controls}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
