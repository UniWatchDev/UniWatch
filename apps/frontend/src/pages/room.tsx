import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '@repo/consts/api';
import { MOVIE_ALLOWED_FORMATS_LABEL } from '@repo/consts/movies';
import { getRoomContract, previewRoomContract, joinRoomContract, leaveRoomContract } from '@repo/contracts/rooms';
import { getAuthMeContract } from '@repo/contracts/auth';
import type { RoomPreview } from '@repo/schemas/rooms';
import type { RoomResponse, RoomStatus } from '@repo/schemas/rooms';
import { useRoomSocket } from '@/hooks/use-room-socket';
import type { MovieResponse } from '@repo/schemas/movies';

import { attachMovieToRoom } from '@/movies/attach-room-movie';
import { formatMovieUploadAge } from '@/movies/format-movie-upload-age';
import { fetchOwnedMovies } from '@/movies/fetch-owned-movies';
import { getRecentReadyOwnedMovies } from '@/movies/recent-owned-movies';
import { MovieUploadField } from '@/movies/movie-upload-field';
import { MovieUploadProgress } from '@/movies/movie-upload-progress';
import { RoomVideoPlayer } from '@/movies/room-video-player';
import type { PlaybackRate } from '@/movies/room-playback';
import { useRoomMovie } from '@/movies/use-room-movie';
import { prepareMovieForRoom } from '@/movies/prepare-movie-for-room';
import { validateMovieFile } from '@/movies/upload-movie-file';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ParticipantList } from '@/components/participant-list';
import { CinemaChat } from '@/components/cinema-chat';
import { CountdownOverlay } from '@/components/countdown-overlay';
import { Users, MessageSquare } from 'lucide-react';


function RecentOwnedMoviePicker({
  movies,
  selectedMovieId,
  onSelect,
  disabled,
}: {
  movies: readonly MovieResponse[];
  selectedMovieId: string;
  onSelect: (movieId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {movies.map((movie) => {
        const isSelected = movie.id === selectedMovieId;
        const ageLabel = formatMovieUploadAge(movie.file_uploaded_at) ?? 'Uploaded recently';
        return (
          <button
            key={movie.id}
            type="button"
            disabled={disabled}
            onClick={() => { onSelect(movie.id); }}
            aria-pressed={isSelected}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-medium)',
              background: isSelected ? 'var(--accent-dim)' : 'var(--bg-input)',
              color: 'var(--text-primary)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.7 : 1,
              textAlign: 'left',
            }}
          >
            <span style={{ minWidth: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {movie.name}
            </span>
            <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              {ageLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function isRoomLoaded(room: RoomResponse | null): room is RoomResponse {
  return room !== null;
}


async function fetchRoom(id: string): Promise<RoomResponse> {
  const path = getRoomContract.path.replace(':id', encodeURIComponent(id));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
  return getRoomContract.responseSchema.parse(await res.json());
}

async function fetchRoomPreview(id: string): Promise<RoomPreview> {
  const path = previewRoomContract.path.replace(':id', encodeURIComponent(id));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
  return previewRoomContract.responseSchema.parse(await res.json());
}

async function joinRoom(id: string, password: string | undefined): Promise<void> {
  const path = joinRoomContract.path.replace(':id', encodeURIComponent(id));
  const body = joinRoomContract.bodySchema.parse(password !== undefined ? { password } : {});
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: joinRoomContract.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(typeof data['detail'] === 'string' ? data['detail'] : `HTTP ${String(res.status)}`);
  }
}

async function leaveRoom(id: string): Promise<void> {
  const path = leaveRoomContract.path.replace(':id', encodeURIComponent(id));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: leaveRoomContract.method,
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(typeof data['detail'] === 'string' ? data['detail'] : `HTTP ${String(res.status)}`);
  }
}

async function fetchCurrentUserId(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${getAuthMeContract.path}`, {
      headers: { Accept: 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) return null;
    const me = getAuthMeContract.responseSchema.parse(await res.json());
    return me.userId;
  } catch {
    return null;
  }
}

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [roomPreview, setRoomPreview] = useState<RoomPreview | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [joiningRoom, setJoiningRoom] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [ownedMovies, setOwnedMovies] = useState<MovieResponse[]>([]);
  const [ownedMoviesLoading, setOwnedMoviesLoading] = useState(false);
  const [ownedMoviesError, setOwnedMoviesError] = useState<string | null>(null);
  const [selectedOwnedMovieId, setSelectedOwnedMovieId] = useState('');
  const [ownerMovieSaving, setOwnerMovieSaving] = useState(false);
  const [ownerUploadFile, setOwnerUploadFile] = useState<File | null>(null);
  const [ownerUploadError, setOwnerUploadError] = useState<string | null>(null);
  const [ownerUploadPercent, setOwnerUploadPercent] = useState<number | null>(null);
  const [showRoomPassword, setShowRoomPassword] = useState(false);
  const [countdownDismissed, setCountdownDismissed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    loading: movieLoading,
    error: movieError,
    mediaSrc,
    isUploading: movieUploading,
    isPlayable: moviePlayable,
    isFailed: movieFailed
  } = useRoomMovie(room?.movie ?? null);
  const isOwner = currentUserId !== null && currentUserId === room?.creator;
  const showCountdown =
    room !== null &&
    room.status === 'ready' &&
    moviePlayable &&
    !isPlaying &&
    !countdownDismissed;

  const { messages, members, socketStatus, sendMessage: socketSendMessage } = useRoomSocket({
    roomId: id ?? '',
    disabled: loading || room === null,
    currentUserId,
    creatorId: room?.creator ?? '',
    creatorName: room?.creator_name ?? undefined,
    initialMemberIds: room?.allowed_users ?? []
  });

  const loadRoom = (roomId: string, cancelled: { current: boolean }) => {
    setLoading(true);
    setPasswordRequired(false);
    let autoJoining = false;
    Promise.all([fetchRoom(roomId), fetchCurrentUserId()])
      .then(([r, userId]) => {
        if (cancelled.current) return;
        setRoom(r);
        setCurrentUserId(userId);
      })
      .catch(async (err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('403')) {
          try {
            const preview = await fetchRoomPreview(roomId);
            if (preview.room_type === 'public' && !preview.has_password) {
              await joinRoom(roomId, undefined);
              if (!cancelled.current) {
                autoJoining = true;
                loadRoom(roomId, cancelled);
              }
            } else if (!cancelled.current) {
              setRoomPreview(preview);
              setPasswordRequired(true);
            }
          } catch {
            if (!cancelled.current) setLoadError('You do not have access to this room.');
          }
        } else if (!cancelled.current) {
          setLoadError(msg || 'Failed to load room');
        }
      })
      .finally(() => { if (!cancelled.current && !autoJoining) setLoading(false); });
  };

  useEffect(() => {
    if (!id) return;
    const cancelled: { current: boolean } = { current: false };
    loadRoom(id, cancelled);
    return () => { cancelled.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);


  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.volume = muted ? 0 : volume / 100;
  }, [volume, muted, mediaSrc]);

  useEffect(() => {
    setVideoReady(false);
    setVideoError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackRate(1);
  }, [mediaSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.playbackRate = playbackRate;
  }, [playbackRate, mediaSrc, videoReady]);

  useEffect(() => {
    if (!isOwner) {
      setOwnedMovies([]);
      setOwnedMoviesLoading(false);
      setOwnedMoviesError(null);
      setOwnerUploadFile(null);
      setOwnerUploadError(null);
      setOwnerUploadPercent(null);
      setShowRoomPassword(false);
      return;
    }

    let cancelled = false;
    setOwnedMoviesLoading(true);
    setOwnedMoviesError(null);
    void fetchOwnedMovies()
      .then((movies) => {
        if (!cancelled) {
          setOwnedMovies(movies);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOwnedMoviesError(err instanceof Error ? err.message : 'Failed to load your movies');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOwnedMoviesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner || !isRoomLoaded(room)) return;
    const readyOwnedMovies = getRecentReadyOwnedMovies(ownedMovies);
    const fallbackMovieId = room.movie ?? readyOwnedMovies[0]?.id ?? '';
    if (selectedOwnedMovieId.length === 0 || !readyOwnedMovies.some((movie) => movie.id === selectedOwnedMovieId)) {
      setSelectedOwnedMovieId(fallbackMovieId);
    }
  }, [isOwner, ownedMovies, room, selectedOwnedMovieId]);

  useEffect(() => {
    setShowRoomPassword(false);
    setCountdownDismissed(false);
  }, [room?.id]);

  const handleJoin = async () => {
    if (!id) return;
    setJoiningRoom(true);
    setPasswordError(null);
    try {
      await joinRoom(id, passwordInput);
      const cancelled: { current: boolean } = { current: false };
      loadRoom(id, cancelled);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Incorrect password');
    } finally {
      setJoiningRoom(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading room…</p>
      </div>
    );
  }

  if (passwordRequired && roomPreview !== null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--bg-primary)' }}>
        <div className="card fade-up" style={{ width: '100%', maxWidth: 380, padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 36 }}>🔒</span>
            <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 4px' }}>
              {roomPreview.name}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {roomPreview.has_password ? 'This room is password protected.' : 'This is a private room.'}
            </p>
          </div>
          {passwordError !== null && (
            <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#f87171' }}>
              {passwordError}
            </div>
          )}
          {roomPreview.has_password && (
            <input
              className="input"
              type="password"
              placeholder="Enter room password"
              value={passwordInput}
              autoComplete="current-password"
              autoFocus
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleJoin(); }}
              style={{ marginBottom: 12 }}
            />
          )}
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: 14, opacity: joiningRoom ? 0.7 : 1 }}
            disabled={joiningRoom || (roomPreview.has_password && passwordInput.length === 0)}
            onClick={() => { void handleJoin(); }}
          >
            {joiningRoom ? 'Joining…' : 'Join Room'}
          </button>
          <button
            className="btn-ghost"
            style={{ width: '100%', marginTop: 8, padding: '8px', fontSize: 13 }}
            onClick={() => { void navigate('/rooms'); }}
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (loadError || !room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 18 }}>{loadError ?? 'Room not found.'}</p>
        <button className="btn-primary" onClick={() => { void navigate('/rooms'); }}>Back to Lobby</button>
      </div>
    );
  }

  const canControlPlayback = moviePlayable && videoReady && videoError === null;
  const ownedReadyMovies = getRecentReadyOwnedMovies(ownedMovies);
  const selectedOwnedMovie = ownedReadyMovies.find((movie) => movie.id === selectedOwnedMovieId) ?? null;

  const syncVideoTime = () => {
    const video = videoRef.current;
    if (video === null) return;
    setCurrentTime(video.currentTime);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setIsPlaying(!video.paused && !video.ended);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video === null || !canControlPlayback) return;
    if (video.paused) {
      void video.play().catch(() => {
        setVideoError('Playback failed. Check your connection and try again.');
      });
    } else {
      video.pause();
    }
  };

  const seekBy = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (video === null || !canControlPlayback) return;
    const next = Math.min(Math.max(0, video.currentTime + deltaSeconds), video.duration || 0);
    video.currentTime = next;
    setCurrentTime(next);
  };

  const handleVideoError = () => {
    setVideoError('Could not load the video. Refresh the page or re-upload the file.');
    setVideoReady(false);
    setIsPlaying(false);
  };

  const handleAttachOwnedMovie = async () => {
    if (!isOwner || room.movie != null || selectedOwnedMovie === null) return;
    setOwnerMovieSaving(true);
    setOwnedMoviesError(null);
    try {
      const updated = await attachMovieToRoom(room.id, selectedOwnedMovie);
      setRoom(updated);
      setOwnerUploadError(null);
    } catch (err: unknown) {
      setOwnedMoviesError(err instanceof Error ? err.message : 'Failed to attach movie');
    } finally {
      setOwnerMovieSaving(false);
    }
  };

  const clearOwnerUpload = () => {
    setOwnerUploadFile(null);
    setOwnerUploadError(null);
    setOwnerUploadPercent(null);
  };

  const handleOwnerUploadFileChange = (file: File | null, validationError: string | null) => {
    setOwnerUploadFile(file);
    setOwnerUploadError(validationError);
    if (validationError === null) {
      setOwnedMoviesError(null);
    }
  };

  const handleOwnerMovieUpload = async () => {
    if (!isOwner || room.movie != null) return;
    if (ownerUploadFile === null) {
      setOwnerUploadError('Choose a video before uploading.');
      return;
    }
    const fileError = validateMovieFile(ownerUploadFile);
    if (fileError) {
      setOwnerUploadError(fileError);
      return;
    }

    setOwnerMovieSaving(true);
    setOwnerUploadPercent(0);
    setOwnerUploadError(null);
    try {
      const movieBody = {
        name: ownerUploadFile.name.replace(/\.[^.]+$/, ''),
        language: 'english' as const,
      };
      const uploadedMovie = await prepareMovieForRoom(movieBody, ownerUploadFile, {
        onProgress: (progress) => {
          setOwnerUploadPercent(progress.percent);
        },
      });
      const updated = await attachMovieToRoom(room.id, uploadedMovie);
      setRoom(updated);
      clearOwnerUpload();
    } catch (err: unknown) {
      setOwnerUploadError(err instanceof Error ? err.message : 'Failed to upload video');
    } finally {
      setOwnerMovieSaving(false);
      setOwnerUploadPercent(null);
    }
  };

  const scrubTo = (seconds: number) => {
    const video = videoRef.current;
    if (video !== null) video.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const playbackStatusText = moviePlayable
    ? (isPlaying ? 'LIVE' : videoReady ? 'READY' : 'LOADING')
    : movieUploading
      ? 'UPLOADING'
      : 'PREPARING';
  const ownerPlaceholderText = isOwner
    ? 'Choose one of your recent videos or upload a new one to start this room.'
    : 'Ask the owner to upload a movie.';
  const roomPassword = room.password ?? '';
  const roomPasswordVisible = isOwner && roomPassword.length > 0 && showRoomPassword;

  const ownerMovieActions = isOwner && room.movie == null ? (
    <div
      style={{
        alignSelf: 'stretch',
        width: 'min(100%, 520px)',
        marginTop: 16,
        padding: '16px',
        border: '1px solid rgba(124,58,237,0.18)',
        borderRadius: 14,
        background: 'rgba(19,19,31,0.88)',
        backdropFilter: 'blur(14px)',
        color: 'var(--text-primary)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Add a video to this room</div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
          Choose one of your recent videos from the last 24 hours or upload a new {MOVIE_ALLOWED_FORMATS_LABEL} file. Only you can see this panel.
        </p>
      </div>

      {ownedMoviesError && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(239,68,68,0.25)',
            background: 'rgba(239,68,68,0.08)',
            color: '#fca5a5',
            fontSize: 12,
          }}
        >
          {ownedMoviesError}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Your recent videos</label>
          {ownedMoviesLoading ? (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Loading your videos…</p>
          ) : ownedReadyMovies.length > 0 ? (
            <RecentOwnedMoviePicker
              movies={ownedReadyMovies}
              selectedMovieId={selectedOwnedMovieId}
              onSelect={setSelectedOwnedMovieId}
              disabled={ownerMovieSaving}
            />
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              You do not have any videos uploaded in the last 24 hours yet.
            </p>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => { void handleAttachOwnedMovie(); }}
            disabled={ownerMovieSaving || selectedOwnedMovie === null}
          >
            Use selected video
          </button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Or upload a new one</label>
          <MovieUploadField
            label="Video file"
            file={ownerUploadFile}
            error={ownerUploadError ?? undefined}
            onFileChange={handleOwnerUploadFileChange}
            onRemove={clearOwnerUpload}
            disabled={ownerMovieSaving}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => { void handleOwnerMovieUpload(); }}
            disabled={ownerMovieSaving || ownerUploadFile === null || ownerUploadError !== null}
          >
            {ownerMovieSaving ? 'Uploading…' : 'Upload selected video'}
          </button>
          {ownerUploadPercent !== null && <MovieUploadProgress percent={ownerUploadPercent} />}
        </div>
      </div>
    </div>
  ) : null;


  const statusLabel: Record<RoomStatus, string> = {
    watching: 'WATCHING',
    preparing: 'PREPARING',
    ready: 'READY',
  };
  const statusClass: Record<RoomStatus, string> = {
    watching: 'badge badge-watching',
    preparing: 'badge badge-preparing',
    ready: 'badge badge-ready',
  };

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {room.name}
          </span>
          {room.status !== undefined && (
              <span className={statusClass[room.status]}>{statusLabel[room.status]}</span>
            )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isOwner && (
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: 13 }}
              onClick={() => { void navigate(`/rooms/${String(id)}/edit`); }}
              title="Edit room settings"
            >
              <PencilIcon />
              Edit room
            </button>
          )}
          <button
            className="btn-danger"
            style={{ padding: '7px 16px', fontSize: 13 }}
            onClick={() => {
              if (!isOwner && id) {
                void leaveRoom(id).finally(() => { void navigate('/rooms'); });
              } else {
                void navigate('/rooms');
              }
            }}
          >
            Leave room
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="room-main">
        {/* Video column */}
        <div className="room-player-column">
          <div className="room-video-area" style={{ position: 'relative' }}>
            <RoomVideoPlayer
              roomName={room.name}
              movieName={room.movie_name}
              statusText={playbackStatusText}
              isLive={moviePlayable && isPlaying}
              loading={movieLoading}
              error={movieError}
              isUploading={movieUploading}
              isFailed={movieFailed}
              mediaSrc={mediaSrc}
              videoRef={videoRef}
              videoReady={videoReady}
              videoError={videoError}
              canControl={canControlPlayback}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              muted={muted}
              volume={volume}
              onTogglePlay={togglePlay}
              onTimeUpdate={syncVideoTime}
              onLoadedMetadata={syncVideoTime}
              onPlay={() => { setIsPlaying(true); }}
              onPause={() => { setIsPlaying(false); }}
              onEnded={() => { setIsPlaying(false); }}
              onCanPlay={() => { setVideoReady(true); setVideoError(null); }}
              onVideoError={handleVideoError}
              onScrub={scrubTo}
              onSeekBy={seekBy}
              onPlaybackRateChange={setPlaybackRate}
              onToggleMute={() => { setMuted((m) => !m); }}
              onVolumeChange={(next) => { setVolume(next); setMuted(false); }}
              ownerActions={ownerMovieActions}
              placeholderText={ownerPlaceholderText}
            />
            {showCountdown && (
              <CountdownOverlay
                members={members}
                onComplete={() => { setCountdownDismissed(true); }}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside
          style={{
            width: 320,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-subtle)',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Room header */}
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {room.name}
              </span>
              {room.status !== undefined && (
                <span className={statusClass[room.status]} style={{ flexShrink: 0 }}>
                  {statusLabel[room.status]}
                </span>
              )}
            </div>
            {room.movie_name !== null && room.movie_name !== undefined && (
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {room.movie_name}
              </p>
            )}
            {socketStatus !== 'connected' && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: socketStatus === 'error' ? '#f87171' : 'var(--text-muted)', fontStyle: 'italic' }}>
                {socketStatus === 'error' ? 'Connection error' : socketStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
              </p>
            )}
          </div>

          {/* Owner tools — password reveal */}
          {isOwner && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  Owner Tools
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Room password</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.password == null ? 'No password set' : roomPasswordVisible ? room.password : '••••••••••'}
                    </p>
                  </div>
                  {room.password != null && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '5px 10px', fontSize: 12, flexShrink: 0 }}
                      onClick={() => { setShowRoomPassword((prev) => !prev); }}
                    >
                      {roomPasswordVisible ? 'Hide' : 'Reveal'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabs: Participants | Chat */}
          <Tabs defaultValue="participants" className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TabsList
              className="mx-3 mb-0 mt-2 h-9 shrink-0 rounded-lg"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
            >
              <TabsTrigger value="participants" className="flex flex-1 items-center gap-1.5 text-xs">
                <Users size={12} />
                Viewers ({members.length})
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex flex-1 items-center gap-1.5 text-xs">
                <MessageSquare size={12} />
                Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="participants"
              className="soft-scroll mt-1 min-h-0 flex-1 overflow-y-auto"
            >
              <ParticipantList members={members} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent
              value="chat"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0"
            >
              <CinemaChat messages={messages} onSend={socketSendMessage} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
