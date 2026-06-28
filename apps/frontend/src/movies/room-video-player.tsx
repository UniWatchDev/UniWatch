import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clapperboard, Loader2, Play, Upload } from 'lucide-react';

import { MovieAwaitingHostOverlay } from '@/components/movie-awaiting-host-overlay';
import { RoomVideoStageOverlay } from '@/components/room-video-stage-overlay';
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
  const trimmedMovieName = movieName?.trim();
  const hasMovieName = trimmedMovieName !== undefined && trimmedMovieName.length > 0;

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

  const handleLoadedMetadata = () => {
    syncBufferedEnd();
    onLoadedMetadata();
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

  const preparingOverlay = (
    <RoomVideoStageOverlay
      icon={Loader2}
      loading
      eyebrow="Preparing video"
      title={hasMovieName ? trimmedMovieName : 'Loading movie…'}
      description="Hang tight — the stream is getting ready for everyone."
    />
  );

  const stageOverlay = (() => {
    if (showAwaitingHostOverlay) {
      return (
        <MovieAwaitingHostOverlay
          movieName={awaitingHostMovieName}
          loading={awaitingHostLoading}
          isHost={isHostViewer}
        />
      );
    }

    if (videoError !== null && mediaSrc !== null) {
      return (
        <RoomVideoStageOverlay
          icon={AlertTriangle}
          eyebrow="Playback error"
          title="Video failed to play"
          description={videoError}
          ariaLive="assertive"
        />
      );
    }

    if (showPlaceholder) {
      if (loading) {
        return (
          <RoomVideoStageOverlay
            icon={Loader2}
            loading
            eyebrow="Loading"
            title="Fetching video…"
            description="Hang tight while this room's movie loads."
          />
        );
      }

      if (isUploading) {
        return (
          <RoomVideoStageOverlay
            icon={Upload}
            loading
            eyebrow="Uploading"
            title={hasMovieName ? trimmedMovieName : 'Video uploading…'}
            description="Keep this tab open until the upload finishes."
          />
        );
      }

      if (isFailed) {
        return (
          <RoomVideoStageOverlay
            icon={AlertTriangle}
            eyebrow="Upload failed"
            title="Video could not be uploaded"
            description="Edit the room to choose another file and try again."
          />
        );
      }

      if (error != null) {
        return (
          <RoomVideoStageOverlay
            icon={AlertTriangle}
            eyebrow="Unable to load"
            title="Something went wrong"
            description={error}
          />
        );
      }

      return (
        <RoomVideoStageOverlay
          icon={Clapperboard}
          eyebrow={showHostControls ? 'Your room' : 'Waiting for host'}
          title={showHostControls ? 'Add a video to start' : 'No video yet'}
          description={placeholderText ?? 'Waiting for the host to upload a video…'}
          footer={ownerActions}
          interactiveFooter={ownerActions != null}
        />
      );
    }

    if (!videoReady && currentTime === 0) {
      return preparingOverlay;
    }

    return null;
  })();

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
              onLoadedMetadata={handleLoadedMetadata}
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

          {stageOverlay}

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
