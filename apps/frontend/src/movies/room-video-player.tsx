import { useCallback, useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

import { MovieAwaitingHostOverlay } from '@/components/movie-awaiting-host-overlay';
import { MovieUploadProgress } from '@/movies/movie-upload-progress';
import type { PlaybackRate } from '@/movies/room-playback';
import { RoomVideoPlayerControls } from '@/movies/room-video-player-controls';
import type { PlayerToolbarStatusTone } from '@/rooms/room-status-display';
import { useFullscreenOverlayControls } from '@/movies/use-fullscreen-overlay-controls';

function readBufferedEnd(video: HTMLVideoElement | null, duration: number): number {
  if (video === null || duration <= 0) return 0;
  const ranges = video.buffered;
  if (ranges.length === 0) return 0;
  let maxEnd = 0;
  for (let index = 0; index < ranges.length; index += 1) {
    maxEnd = Math.max(maxEnd, ranges.end(index));
  }
  return Math.min(1, maxEnd / duration);
}

export function RoomVideoPlayer({
  roomName,
  movieName,
  statusText,
  statusTone,
  loading,
  error,
  isUploading,
  isFailed,
  mediaSrc,
  videoKey,
  videoRef,
  videoReady,
  videoError,
  canControl,
  showHostControls,
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  muted,
  volume,
  showAwaitingHostOverlay = false,
  awaitingHostMovieName,
  awaitingHostLoading = false,
  isHostViewer = false,
  onLoadedData,
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
  statusTone: PlayerToolbarStatusTone;
  loading: boolean;
  error: string | null;
  isUploading: boolean;
  isFailed: boolean;
  mediaSrc: string | null;
  videoKey: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoReady: boolean;
  videoError: string | null;
  canControl: boolean;
  showHostControls: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  muted: boolean;
  volume: number;
  showAwaitingHostOverlay?: boolean;
  awaitingHostMovieName?: string | null;
  awaitingHostLoading?: boolean;
  isHostViewer?: boolean;
  onLoadedData?: () => void;
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
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const { overlayVisible, revealControls } = useFullscreenOverlayControls(isFullscreen, isPlaying);
  const showPlaceholder = mediaSrc === null;
  const showCenterPlay =
    canControl &&
    !isPlaying &&
    videoReady &&
    mediaSrc !== null &&
    !videoError &&
    !showAwaitingHostOverlay;
  const showControls = mediaSrc !== null && videoError === null;
  const controlsVisible = !isFullscreen || !isPlaying || overlayVisible;

  const syncBufferedEnd = useCallback(() => {
    setBufferedEnd(readBufferedEnd(videoRef.current, duration));
  }, [duration, videoRef]);

  useEffect(() => {
    const onNativeFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', onNativeFullscreenChange);
    return () => { document.removeEventListener('fullscreenchange', onNativeFullscreenChange); };
  }, []);

  useEffect(() => {
    syncBufferedEnd();
  }, [currentTime, duration, mediaSrc, syncBufferedEnd]);

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

  const handleTimeUpdate = () => {
    syncBufferedEnd();
    onTimeUpdate();
  };

  const handleProgress = () => {
    syncBufferedEnd();
  };

  const controls = (
    <RoomVideoPlayerControls
      canControl={canControl}
      showHostControls={showHostControls}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      bufferedEnd={bufferedEnd}
      playbackRate={playbackRate}
      muted={muted}
      volume={volume}
      isFullscreen={isFullscreen}
      movieName={movieName}
      statusText={statusText}
      statusTone={statusTone}
      onTogglePlay={onTogglePlay}
      onScrub={onScrub}
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
              key={videoKey ?? mediaSrc}
              ref={videoRef}
              className="room-video-player__video"
              src={mediaSrc}
              onClick={handleStageClick}
              onTimeUpdate={handleTimeUpdate}
              onProgress={handleProgress}
              onLoadedMetadata={onLoadedMetadata}
              onLoadedData={onLoadedData}
              onPlay={onPlay}
              onPause={onPause}
              onEnded={onEnded}
              onCanPlay={onCanPlay}
              onError={onVideoError}
              playsInline
              preload="auto"
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

          {showAwaitingHostOverlay && (
            <MovieAwaitingHostOverlay
              movieName={awaitingHostMovieName}
              loading={awaitingHostLoading}
              isHost={isHostViewer}
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
              onClick={(event) => {
                event.stopPropagation();
                revealControls();
                onTogglePlay();
              }}
              aria-label="Play"
            >
              <Play size={36} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
            </button>
          )}

          {showControls && (
            <div
              className={`room-video-player__controls room-video-player__controls--overlay${controlsVisible ? ' is-visible' : ''}`}
            >
              {isFullscreen && controlsVisible && (
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
