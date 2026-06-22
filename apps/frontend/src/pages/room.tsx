import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ROOM_CLOSED_MESSAGE } from '@repo/consts/realtime';
import type { BlockedUser, RoomPreview, RoomResponse, RoomStatus } from '@repo/schemas/rooms';
import { useRoomSocket, type PlaybackChangeEvent, type VideoStatusChangeEvent } from '@/hooks/use-room-socket';
import { OwnerUploadOverlay } from '@/components/owner-upload-overlay';
import type { ReadyOverlayState } from '@/components/ready-state-overlay';
import { RoomClosedOverlay } from '@/components/room-closed-overlay';
import type { PlaybackRate } from '@/movies/room-playback';
import { useRoomPlaybackSync } from '@/movies/use-room-playback-sync';
import { useRoomMovie } from '@/movies/use-room-movie';
import { useHlsPlayer } from '@/movies/use-hls-player';
import { resolveMovieForRoom } from '@/movies/prepare-movie-for-room';
import { clearRoomUpload } from '@/movies/room-upload-tracker';
import { useRoomUploadProgress } from '@/movies/use-room-upload-progress';
import { uploadMovieViaStream, validateMovieFile } from '@/movies/upload-movie-file';
import { usePlayerKeyboard } from '@/movies/use-player-keyboard';
import { RoomVideoPlayer } from '@/movies/room-video-player';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ParticipantList } from '@/components/participant-list';
import { CinemaChat } from '@/components/cinema-chat';
import { CountdownOverlay } from '@/components/countdown-overlay';
import { ForcePlayConfirmationModal } from '@/components/force-play-confirmation-modal';
import { InviteFriends } from '@/components/invite-friends';
import { RoomPasswordGate } from '@/components/room-password-gate';
import { ThemeToggle } from '@/theme/theme-toggle';
import { Users, MessageSquare, Volume2, VolumeX, Link2, KeyRound, Check } from 'lucide-react';
import { MOCK_FRIENDS } from '@/data/mock-profile-data';
import type { Member } from '@/types/room';
import {
  fetchBlockedUsers,
  fetchCurrentUserId,
  fetchRoom,
  fetchRoomPreview,
  joinRoom,
  leaveRoom,
  unblockUser
} from '@/pages/room-api';
import { RoomStatusBadge } from '@/rooms/room-status-badge';

const ROOM_CLOSED_REDIRECT_MS = 1_800;

function canCurrentUserAccessRoomMovie(
  currentUserId: string | null,
  room: RoomResponse | null
): boolean {
  if (currentUserId === null || room === null) {
    return false;
  }
  return currentUserId === room.creator || room.allowed_users.includes(currentUserId);
}

/**
 * During an edit-room swap, `room:movie-updated` often arrives before `room:playback-changed`.
 * Prefer the in-flight swap id until server playback confirms it.
 */
function resolveActiveRoomMovieId(
  playbackMovieId: string | null,
  swapMovieId: string | null,
  persistedMovieId: string | null
): string | null {
  if (swapMovieId !== null && swapMovieId.length > 0) {
    return swapMovieId;
  }
  if (playbackMovieId !== null && playbackMovieId.length > 0) {
    return playbackMovieId;
  }
  return persistedMovieId;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch { /* audio not available */ }
}


function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
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
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [posterFrameReady, setPosterFrameReady] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [ownerMovieSaving, setOwnerMovieSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatSoundMuted, setChatSoundMuted] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [copiedInvite, setCopiedInvite] = useState<'link' | 'password' | null>(null);
  const [ownerUploadFile, setOwnerUploadFile] = useState<File | null>(null);
  const [ownerUploadError, setOwnerUploadError] = useState<string | null>(null);
  const [ownerUploadPercent, setOwnerUploadPercent] = useState<number | null>(null);
  const [ownerUploadNotice, setOwnerUploadNotice] = useState<string | null>(null);
  const [showRoomPassword, setShowRoomPassword] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [blockedError, setBlockedError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [forcePlayModalOpen, setForcePlayModalOpen] = useState(false);
  const [remotePlaybackEvent, setRemotePlaybackEvent] = useState<PlaybackChangeEvent | null>(null);
  const [swapMovieId, setSwapMovieId] = useState<string | null>(null);
  const [movieChangePending, setMovieChangePending] = useState<{ movieName: string | null } | null>(
    null
  );
  const [movieStreamRevision, setMovieStreamRevision] = useState(0);
  const [processingPercent, setProcessingPercent] = useState<number | null>(null);
  const hasWatchStartedRef = useRef(false);
  const [countdownDismissed, setCountdownDismissed] = useState(false);
  const [friendIds, setFriendIds] = useState<string[]>(() => MOCK_FRIENDS.map((friend) => friend.id));
  const videoRef = useRef<HTMLVideoElement>(null);
  const swapMovieIdRef = useRef<string | null>(null);
  const retriedStreamForSrcRef = useRef<string | null>(null);
  const suppressPlaybackEmitRef = useRef(false);
  const currentTimeRef = useRef(0);
  const lastProgressUiAtRef = useRef(0);
  const roomClosedRedirectRef = useRef(false);
  const roomClosedPendingRef = useRef(false);
  const roomClosedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PROGRESS_UI_MS = 250;
  const [roomClosedNotice, setRoomClosedNotice] = useState<string | null>(null);
  const roomUpload = useRoomUploadProgress(id);

  useEffect(() => {
    return () => {
      if (roomClosedTimerRef.current !== null) {
        clearTimeout(roomClosedTimerRef.current);
      }
    };
  }, []);

  const redirectToLobbyClosed = useCallback(
    (message: string) => {
      if (roomClosedRedirectRef.current || roomClosedPendingRef.current) {
        return;
      }
      roomClosedPendingRef.current = true;
      setRoomClosedNotice(message);
      if (roomClosedTimerRef.current !== null) {
        clearTimeout(roomClosedTimerRef.current);
      }
      roomClosedTimerRef.current = setTimeout(() => {
        roomClosedRedirectRef.current = true;
        void navigate('/rooms', { replace: true, state: { roomClosedMessage: message } });
      }, ROOM_CLOSED_REDIRECT_MS);
    },
    [navigate]
  );

  const refreshRoom = useCallback(async () => {
    if (id === undefined) return;
    try {
      const updated = await fetchRoom(id);
      setRoom((prev) => {
        if (prev === null) return updated;
        const pendingSwap = swapMovieIdRef.current;
        if (
          pendingSwap !== null &&
          updated.movie !== pendingSwap &&
          prev.movie === pendingSwap
        ) {
          return { ...updated, movie: pendingSwap };
        }
        return updated;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('404')) {
        redirectToLobbyClosed(ROOM_CLOSED_MESSAGE);
        return;
      }
      console.error('[room]', msg || 'Failed to refresh room');
    }
  }, [id, redirectToLobbyClosed]);

  const handleMovieUpdated = useCallback((movieId: string, movieName?: string) => {
    if (movieId.length === 0) return;
    swapMovieIdRef.current = movieId;
    setSwapMovieId(movieId);
    setMovieStreamRevision((revision) => revision + 1);
    setMovieChangePending({ movieName: movieName?.trim() ?? null });
    setCountdownDismissed(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setPosterFrameReady(false);
    setVideoError(null);
    videoRef.current?.pause();
    setRoom((prev) => {
      if (prev === null) return prev;
      const next = { ...prev, movie: movieId };
      if (movieName !== undefined && movieName.length > 0) {
        return { ...next, movie_name: movieName };
      }
      return next;
    });
    void refreshRoom();
  }, [refreshRoom]);

  const handlePlaybackChanged = useCallback((event: PlaybackChangeEvent) => {
    setRemotePlaybackEvent(event);
  }, []);

  // Async video lifecycle (room:video-processing/ready/failed). The worker has
  // already updated Mongo (and promoted room.movie on ready), so re-fetch the
  // room and force the movie hook to re-poll — it picks up the new status/URL.
  const handleVideoStatusChanged = useCallback((event: VideoStatusChangeEvent) => {
    if (event.status === 'processing') {
      setProcessingPercent(0);
    }
    if (event.status === 'playable') {
      setMovieStreamRevision((revision) => revision + 1);
      void refreshRoom();
      return;
    }
    if (event.status === 'ready' || event.status === 'failed') {
      setProcessingPercent(null);
    }
    setMovieStreamRevision((revision) => revision + 1);
    void refreshRoom();
  }, [refreshRoom]);

  const handleVideoProgress = useCallback((_videoId: string, percent: number) => {
    setProcessingPercent(percent);
  }, []);

  const handlePlaybackApplied = useCallback(
    (result: { currentTime: number; isPlaying: boolean; playbackRate: PlaybackRate }) => {
      setCurrentTime(result.currentTime);
      setPlaybackRate(result.playbackRate);
      setIsPlaying(result.isPlaying);
    },
    []
  );

  const handlePlaybackPlayFailed = useCallback(() => {
    setVideoError('Playback failed. Check your connection and try again.');
  }, []);

  const handlePlaybackMovieMismatch = useCallback(() => {
    void refreshRoom();
  }, [refreshRoom]);

  const handleRemotePlaybackHandled = useCallback(() => {
    setRemotePlaybackEvent(null);
  }, []);

  const handleRoomClosed = useCallback(
    (message: string) => {
      redirectToLobbyClosed(message);
    },
    [redirectToLobbyClosed]
  );

  const {
    messages,
    members,
    socketStatus,
    roomError,
    roomState,
    sendMessage: socketSendMessage,
    sendReadyUpdate,
    sendPlaybackUpdate,
    sendKickUser,
    sendBlockUser,
    connectionGeneration
  } = useRoomSocket({
    roomId: id ?? '',
    disabled: loading || room === null,
    creatorId: room?.creator ?? '',
    creatorName: room?.creator_name ?? undefined,
    initialMemberIds: room?.allowed_users ?? [],
    onMovieUpdated: handleMovieUpdated,
    onPlaybackChanged: handlePlaybackChanged,
    onVideoStatusChanged: handleVideoStatusChanged,
    onVideoProgress: handleVideoProgress,
    onRoomClosed: handleRoomClosed
  });

  const authoritativeMovieId = resolveActiveRoomMovieId(
    roomState.playback.movieId,
    swapMovieId,
    room?.movie ?? null
  );
  const roomMovieId = canCurrentUserAccessRoomMovie(currentUserId, room) ? authoritativeMovieId : null;
  const trackerUploadPercent =
    roomUpload?.phase === 'uploading' ? roomUpload.percent : null;
  const activeUploadPercent = ownerUploadPercent ?? trackerUploadPercent;
  const trackerIsUploading = roomUpload?.phase === 'uploading';
  const ownerIsUploading = ownerMovieSaving || ownerUploadPercent !== null || trackerIsUploading;

  useEffect(() => {
    if (roomUpload?.phase === 'complete' && id !== undefined) {
      clearRoomUpload(id);
    }
  }, [roomUpload?.phase, id]);

  useEffect(() => {
    swapMovieIdRef.current = swapMovieId;
  }, [swapMovieId]);

  useEffect(() => {
    retriedStreamForSrcRef.current = null;
  }, [roomMovieId, movieStreamRevision]);

  useEffect(() => {
    if (swapMovieId === null) return;
    if (roomState.playback.movieId === swapMovieId) {
      swapMovieIdRef.current = null;
      setSwapMovieId(null);
    }
  }, [swapMovieId, roomState.playback.movieId]);

  useEffect(() => {
    hasWatchStartedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (roomState.playback.isPlaying) {
      hasWatchStartedRef.current = true;
    }
  }, [roomState.playback.isPlaying]);

  useEffect(() => {
    if (roomState.playback.isPlaying || roomState.countdown.active) {
      setMovieChangePending(null);
    }
  }, [roomState.playback.isPlaying, roomState.countdown.active]);

  const {
    movie,
    loading: movieLoading,
    error: movieError,
    mediaSrc,
    isHls,
    isUploading: movieUploading,
    isPlayable: moviePlayable,
    isFailed: movieFailed
  } = useRoomMovie(roomMovieId, movieStreamRevision);
  const isPartialPlayback = movie?.playback_partial === true;
  const { qualities, selectedQuality, currentLevel, selectQuality } = useHlsPlayer({
    videoRef,
    src: mediaSrc,
    enabled: isHls,
    partial: isPartialPlayback
  });
  const availableQualities =
    qualities.length > 0 ? qualities : movie?.available_qualities ?? [];
  const movieDurationSeconds = movie?.duration_seconds ?? null;
  const publishedDurationSec = roomState.publishedDurationSec;
  const effectiveBufferedEnd = publishedDurationSec ?? bufferedEnd;
  // Require the loaded room to match the current route: RoomPage does not remount
  // on room→room navigation, so a stale room you own must never flash owner-only
  // UI (host controls, Edit room) on someone else's room.
  const isOwner =
    currentUserId !== null && room !== null && room.id === id && currentUserId === room.creator;

  const showMovieSwapOverlay =
    movieChangePending !== null &&
    !roomState.playback.isPlaying &&
    !roomState.countdown.active &&
    roomState.playback.positionSec === 0 &&
    authoritativeMovieId === roomMovieId &&
    (mediaSrc !== null || movieLoading);
  const awaitingHostMovieName =
    movieChangePending?.movieName ?? movie?.name ?? room?.movie_name ?? null;

  const displayMembers = members.map((member) => ({
    ...member,
    isFriend: friendIds.includes(member.id)
  }));
  const currentMember = displayMembers.find((member) => member.id === currentUserId) ?? null;
  const readinessMembers = displayMembers.filter((member) => !member.isHost);
  const readyCount = readinessMembers.filter((member) => member.isReady).length;
  const showFirstMovieWaiting =
    !hasWatchStartedRef.current &&
    moviePlayable &&
    !roomState.playback.isPlaying &&
    !roomState.countdown.active &&
    room?.movie != null;
  const showReadyOverlay =
    movieChangePending !== null ||
    showFirstMovieWaiting ||
    trackerIsUploading ||
    processingPercent !== null ||
    (movieUploading && !moviePlayable) ||
    (ownerIsUploading && room?.movie == null) ||
    (ownerUploadNotice !== null && room?.movie == null);
  const readyOverlayState: ReadyOverlayState | null = showReadyOverlay
    ? trackerIsUploading || ownerUploadPercent !== null || (ownerIsUploading && room?.movie == null)
      ? 'uploading'
      : processingPercent !== null || (movieUploading && !moviePlayable)
        ? 'processing'
        : isOwner
          ? 'host-waiting'
          : 'waiting'
    : null;
  const isSoloHost = isOwner && displayMembers.length === 1;
  const showSoloHostPlayOverlay =
    isSoloHost &&
    !hasWatchStartedRef.current &&
    readyOverlayState === null &&
    moviePlayable &&
    !isPlaying &&
    videoError === null &&
    !showMovieSwapOverlay &&
    mediaSrc !== null;
  // The server is authoritative for room status (it already returns 'waiting'
  // for an empty room). We only override to 'waiting' when the movie file is not
  // yet streamable on this client — stream readiness is browser-side state the
  // server cannot know about.
  const liveRoomStatus: RoomStatus = moviePlayable ? roomState.status : 'waiting';
  const unreadyMembers = displayMembers.filter((member) => !member.isHost && !member.isReady);
  const needsForcePlayConfirmation = isOwner && !isSoloHost && unreadyMembers.length > 0;
  const showCountdown = roomState.countdown.active && !countdownDismissed;
  const handleAddFriend = (member: Member) => {
    setFriendIds((prev) =>
      prev.includes(member.id)
        ? prev.filter((id) => id !== member.id)
        : [...prev, member.id]
    );
  };
  const handleTagUser = (member: Member) => {
    setActiveTab('chat');
    setChatDraft((draft) => {
      const prefix = draft.length > 0 && !draft.endsWith(' ') ? `${draft} ` : draft;
      return `${prefix}@${member.username} `;
    });
  };
  const handleKickUser = (member: Member) => {
    if (!isOwner) return;
    sendKickUser(member.id);
  };
  const handleBlockUser = (member: Member) => {
    if (!isOwner) return;
    sendBlockUser(member.id);
    // Optimistically reflect the ban in Owner Tools so the host sees the
    // blocked member right away; the panel reconciles with the server the
    // next time it is opened via loadBlockedUsers.
    setBlockedUsers((prev) =>
      prev.some((blocked) => blocked.id === member.id)
        ? prev
        : [...prev, { id: member.id, name: member.name }]
    );
    setShowBlockedUsers(true);
  };

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
        } else if (msg.includes('404')) {
          if (!cancelled.current) {
            redirectToLobbyClosed(ROOM_CLOSED_MESSAGE);
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
    setPosterFrameReady(false);
    setVideoError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
    setPlaybackRate(1);
  }, [mediaSrc]);

  useEffect(() => {
    setVideoError(null);
  }, [roomMovieId]);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.playbackRate = playbackRate;
  }, [playbackRate, mediaSrc, videoReady]);

  useEffect(() => {
    if (!isOwner) {
      setOwnerUploadFile(null);
      setOwnerUploadError(null);
      setOwnerUploadPercent(null);
      setShowRoomPassword(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (room?.movie != null) {
      setOwnerUploadNotice(null);
    }
  }, [room?.movie]);

  useEffect(() => {
    setShowRoomPassword(false);
    setForcePlayModalOpen(false);
    setRemotePlaybackEvent(null);
    setCountdownDismissed(false);
    swapMovieIdRef.current = null;
    setSwapMovieId(null);
  }, [room?.id]);

  useEffect(() => {
    if (roomState.countdown.active && roomState.countdown.endsAt !== null) {
      setCountdownDismissed(false);
    }
  }, [roomState.countdown.active, roomState.countdown.endsAt]);

  useRoomPlaybackSync({
    videoRef,
    roomMovieId,
    mediaSrc,
    partialPlayback: isPartialPlayback,
    videoReady,
    posterFrameReady,
    isOwner,
    currentUserId,
    playback: roomState.playback,
    countdown: roomState.countdown,
    connectionGeneration,
    remotePlaybackEvent,
    suppressPlaybackEmitRef,
    onApplied: handlePlaybackApplied,
    onPlayFailed: handlePlaybackPlayFailed,
    onMovieMismatch: handlePlaybackMovieMismatch,
    onRemoteEventHandled: handleRemotePlaybackHandled
  });

  const prevMessageCount = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const newFromOthers = messages
        .slice(prevMessageCount.current)
        .filter((m) => m.userId !== currentUserId);
      if (newFromOthers.length > 0 && activeTab !== 'chat') {
        if (!chatSoundMuted) playBeep();
        setUnreadCount((n) => n + newFromOthers.length);
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages, activeTab, chatSoundMuted, currentUserId]);

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

  // Keyboard shortcut refs — defined early so the hook can be called before
  // the early-return guards (rules-of-hooks compliance). The actual function
  // bodies reference videoRef and other state safely because they run in
  // event handlers, never during render.
  const kbTogglePlayRef = useRef<() => void>(() => undefined);
  const kbSeekByRef = useRef<(delta: number) => void>(() => undefined);
  const kbScrubToRef = useRef<(sec: number) => void>(() => undefined);
  const kbCanControl = room !== null && !loading && isOwner && videoReady && videoError === null;
  usePlayerKeyboard({
    canControl: kbCanControl,
    isPlaying,
    duration,
    muted,
    onTogglePlay: useCallback(() => { kbTogglePlayRef.current(); }, []),
    onSeekBy: useCallback((d: number) => { kbSeekByRef.current(d); }, []),
    onSeekTo: useCallback((s: number) => { kbScrubToRef.current(s); }, []),
    onToggleMute: useCallback(() => { setMuted((m) => !m); }, []),
    onToggleFullscreen: useCallback(() => {
      const el = document.querySelector<HTMLElement>('.room-video-player');
      if (el === null) return;
      if (document.fullscreenElement === el) {
        void document.exitFullscreen();
      } else {
        void el.requestFullscreen();
      }
    }, []),
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading room…</p>
      </div>
    );
  }

  if (passwordRequired && roomPreview !== null) {
    return (
      <RoomPasswordGate
        preview={roomPreview}
        passwordInput={passwordInput}
        passwordError={passwordError}
        joining={joiningRoom}
        onPasswordChange={(value) => {
          setPasswordInput(value);
          setPasswordError(null);
        }}
        onJoin={() => {
          void handleJoin();
        }}
        onBack={() => {
          void navigate('/rooms');
        }}
      />
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

  const canControlPlayback = isOwner && moviePlayable && videoReady && videoError === null;
  const canStartPlayback = canControlPlayback && (liveRoomStatus === 'ready' || isSoloHost);
  const broadcastPlaybackState = () => {
    const video = videoRef.current;
    const movieId = authoritativeMovieId;
    if (
      suppressPlaybackEmitRef.current ||
      !isOwner ||
      movieId == null ||
      video === null ||
      videoError !== null ||
      !videoReady
    ) {
      return;
    }

    sendPlaybackUpdate({
      movieId,
      isPlaying: !video.paused && !video.ended,
      positionSec: video.currentTime,
      playbackRate: video.playbackRate,
      force: true
    });
  };

  const getTimelineEnd = () => {
    if (movieDurationSeconds !== null && movieDurationSeconds > 0) {
      return movieDurationSeconds;
    }
    const video = videoRef.current;
    if (video === null) return 0;
    if (Number.isFinite(video.duration) && video.duration > 0) {
      return video.duration;
    }
    if (video.seekable.length > 0) {
      return video.seekable.end(video.seekable.length - 1);
    }
    return bufferedEnd;
  };

  const syncVideoTime = () => {
    const video = videoRef.current;
    if (video === null) return;
    currentTimeRef.current = video.currentTime;
    const now = Date.now();
    if (now - lastProgressUiAtRef.current >= PROGRESS_UI_MS) {
      lastProgressUiAtRef.current = now;
      setCurrentTime(video.currentTime);
      setDuration(getTimelineEnd());
      setIsPlaying(!video.paused && !video.ended);
    }
  };

  const syncVideoMetadata = () => {
    const video = videoRef.current;
    if (video === null) return;
    currentTimeRef.current = video.currentTime;
    lastProgressUiAtRef.current = Date.now();
    setCurrentTime(video.currentTime);
    setDuration(getTimelineEnd());
    setIsPlaying(!video.paused && !video.ended);
  };

  // Gray buffer bar: use the server-published HLS window when available, and
  // fall back to the browser's buffered ranges for fully ready playback.
  const updateBufferedEnd = () => {
    const video = videoRef.current;
    if (video === null) return;
    if (publishedDurationSec !== null && publishedDurationSec > 0) {
      setBufferedEnd(publishedDurationSec);
      return;
    }
    const ranges = video.buffered;
    const position = video.currentTime;
    let end = 0;
    for (let i = 0; i < ranges.length; i += 1) {
      const start = ranges.start(i);
      const rangeEnd = ranges.end(i);
      if (start <= position && position <= rangeEnd) {
        end = rangeEnd;
        break;
      }
      if (rangeEnd > end) {
        end = rangeEnd;
      }
    }
    setBufferedEnd(end);
    const timelineEnd =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : video.seekable.length > 0
          ? video.seekable.end(video.seekable.length - 1)
          : end;
    setDuration(timelineEnd);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video === null || !canControlPlayback) return;
    if (video.paused || video.ended) {
      if (!canStartPlayback) {
        if (needsForcePlayConfirmation) {
          setForcePlayModalOpen(true);
        }
        return;
      }
      if (authoritativeMovieId == null) return;
      if (video.ended) {
        video.currentTime = 0;
        setCurrentTime(0);
      }
      sendPlaybackUpdate({
        movieId: authoritativeMovieId,
        isPlaying: true,
        positionSec: video.currentTime,
        playbackRate: video.playbackRate
      });
      setIsPlaying(true);
    } else {
      if (authoritativeMovieId == null) return;
      sendPlaybackUpdate({
        movieId: authoritativeMovieId,
        isPlaying: false,
        positionSec: video.currentTime,
        playbackRate: video.playbackRate
      });
      video.pause();
    }
  };

  const cancelForcePlay = () => {
    setForcePlayModalOpen(false);
  };

  const confirmForcePlay = () => {
    const video = videoRef.current;
    if (video === null || authoritativeMovieId == null || !canControlPlayback) return;
    setForcePlayModalOpen(false);
    if (video.ended) {
      video.currentTime = 0;
      setCurrentTime(0);
    }
    sendPlaybackUpdate({
      movieId: authoritativeMovieId,
      isPlaying: true,
      positionSec: video.currentTime,
      playbackRate: video.playbackRate,
      force: true
    });
    setIsPlaying(true);
  };

  const seekBy = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (video === null || !canControlPlayback) return;
    const timelineEnd = getTimelineEnd();
    const next = Math.min(Math.max(0, video.currentTime + deltaSeconds), timelineEnd || 0);
    video.currentTime = next;
    setCurrentTime(next);
    broadcastPlaybackState();
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    if (video !== null && video.error?.code === MediaError.MEDIA_ERR_ABORTED) {
      return;
    }
    if (
      video !== null &&
      mediaSrc !== null &&
      video.currentSrc.length > 0 &&
      video.currentSrc !== mediaSrc
    ) {
      return;
    }
    if (mediaSrc !== null && retriedStreamForSrcRef.current !== mediaSrc) {
      retriedStreamForSrcRef.current = mediaSrc;
      setMovieStreamRevision((revision) => revision + 1);
      return;
    }
    setVideoError('Could not load the video. Refresh the page or re-upload the file.');
    setVideoReady(false);
    setPosterFrameReady(false);
    setIsPlaying(false);
  };

  const handleVideoLoadedData = () => {
    const video = videoRef.current;
    if (video === null) return;
    setPosterFrameReady(true);
    if (!roomState.playback.isPlaying && !roomState.countdown.active) {
      video.currentTime = 0;
      video.pause();
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
    setOwnerUploadNotice(null);
    if (validationError === null) {
      setOwnerUploadError(null);
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
    setOwnerUploadNotice(null);
    try {
      const movieBody = {
        name: ownerUploadFile.name.replace(/\.[^.]+$/, ''),
        language: 'english' as const,
      };
      const uploadedMovie = await resolveMovieForRoom(movieBody);
      // The backend relay streams the file into R2 and ffmpeg; the room updates
      // automatically once the video becomes playable and again when ready.
      await uploadMovieViaStream(uploadedMovie.id, ownerUploadFile, room.id, {
        onProgress: (progress) => {
          setOwnerUploadPercent(progress.percent);
        },
      });
      clearOwnerUpload();
      setOwnerUploadNotice(
        'Video uploaded. Processing now — it will start playing automatically once ready.'
      );
      void refreshRoom();
    } catch (err: unknown) {
      setOwnerUploadError(err instanceof Error ? err.message : 'Failed to upload video');
    } finally {
      setOwnerMovieSaving(false);
      setOwnerUploadPercent(null);
    }
  };

  const scrubTo = (seconds: number) => {
    const video = videoRef.current;
    const timelineEnd = getTimelineEnd();
    const next = Math.min(Math.max(0, seconds), timelineEnd || 0);
    if (video !== null) video.currentTime = next;
    setCurrentTime(next);
    broadcastPlaybackState();
  };

  // Wire keyboard shortcut refs now that the actual functions are in scope.
  kbTogglePlayRef.current = togglePlay;
  kbSeekByRef.current = seekBy;
  kbScrubToRef.current = scrubTo;

  const changePlaybackRate = (rate: PlaybackRate) => {
    const video = videoRef.current;
    if (video !== null) {
      video.playbackRate = rate;
    }
    setPlaybackRate(rate);
    broadcastPlaybackState();
  };

  const copyToClipboard = (text: string, kind: 'link' | 'password') => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedInvite(kind);
      setTimeout(() => { setCopiedInvite(null); }, 2200);
    });
  };

  const loadBlockedUsers = (roomId: string) => {
    setBlockedLoading(true);
    setBlockedError(null);
    fetchBlockedUsers(roomId)
      .then((users) => { setBlockedUsers(users); })
      .catch((err: unknown) => {
        setBlockedError(err instanceof Error ? err.message : 'Failed to load blocked users');
      })
      .finally(() => { setBlockedLoading(false); });
  };

  const toggleBlockedPanel = (roomId: string) => {
    setShowBlockedUsers((prev) => {
      if (!prev) loadBlockedUsers(roomId);
      return !prev;
    });
  };

  const handleUnblockUser = (roomId: string, userId: string) => {
    setUnblockingId(userId);
    setBlockedError(null);
    unblockUser(roomId, userId)
      .then((users) => { setBlockedUsers(users); })
      .catch((err: unknown) => {
        setBlockedError(err instanceof Error ? err.message : 'Failed to unblock user');
      })
      .finally(() => { setUnblockingId(null); });
  };

  const ownerUploadOverlay = isOwner && room.movie == null && !ownerIsUploading && ownerUploadNotice === null ? (
    <OwnerUploadOverlay
      file={ownerUploadFile}
      error={ownerUploadError}
      uploadPercent={ownerUploadPercent}
      notice={ownerUploadNotice}
      saving={ownerMovieSaving}
      onFileChange={handleOwnerUploadFileChange}
      onRemove={clearOwnerUpload}
      onUpload={() => { void handleOwnerMovieUpload(); }}
    />
  ) : null;
  const roomPassword = room.password ?? '';
  const roomPasswordVisible = isOwner && roomPassword.length > 0 && showRoomPassword;
  const liveViewerCount = displayMembers.length;

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
      {roomClosedNotice !== null && <RoomClosedOverlay message={roomClosedNotice} />}

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
          <RoomStatusBadge status={liveRoomStatus} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="room-header__theme-toggle">
            <ThemeToggle />
          </div>
          {isOwner && (
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: 13 }}
              onClick={() => { void navigate(`/rooms/${id}/edit`); }}
              title="Edit room settings"
            >
              <PencilIcon />
              Edit room
            </button>
          )}
          {/* Copy invite link */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '7px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              title="Copy invite link"
              aria-label="Copy invite link"
              onClick={() => { copyToClipboard(window.location.href, 'link'); }}
            >
              {copiedInvite === 'link' ? <Check size={14} /> : <Link2 size={14} />}
              <span className="room-invite-label">{copiedInvite === 'link' ? 'Copied!' : 'Invite'}</span>
            </button>
            {room.password !== undefined && room.password !== null && room.password.length > 0 && (
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '7px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                title="Copy room password"
                aria-label="Copy room password"
                onClick={() => { copyToClipboard(room.password ?? '', 'password'); }}
              >
                {copiedInvite === 'password' ? <Check size={14} /> : <KeyRound size={14} />}
              </button>
            )}
          </div>
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

      {/* Ready-state overlay is rendered inside RoomVideoPlayer */}

      {/* Main area */}
      <div className="room-main">
        {/* Video column */}
        <div className="room-player-column">
          <div className="room-video-area" style={{ position: 'relative' }}>
            <RoomVideoPlayer
              roomName={room.name}
              movieName={room.movie_name}
              loading={movieLoading && !ownerIsUploading}
              error={ownerIsUploading ? null : movieError}
              isUploading={
                movieUploading ||
                trackerIsUploading ||
                processingPercent !== null ||
                ownerIsUploading
              }
              isFailed={movieFailed}
              uploadPercent={activeUploadPercent}
              processingPercent={processingPercent}
              mediaSrc={mediaSrc}
              isHls={isHls}
              videoKey={roomMovieId}
              videoRef={videoRef}
              videoReady={videoReady}
              videoError={ownerIsUploading ? null : videoError}
              canControl={canControlPlayback}
              showHostControls={isOwner}
              currentTime={currentTime}
              duration={duration}
              bufferedEnd={effectiveBufferedEnd}
              qualities={availableQualities}
              currentLevel={currentLevel}
              selectedQuality={selectedQuality}
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              muted={muted}
              volume={volume}
              showAwaitingHostOverlay={showMovieSwapOverlay}
              awaitingHostMovieName={awaitingHostMovieName}
              awaitingHostLoading={showMovieSwapOverlay && !posterFrameReady && videoError === null}
              isHostViewer={isOwner}
              readyOverlayState={readyOverlayState}
              readyOverlayMovieName={awaitingHostMovieName}
              readyUploadPercent={activeUploadPercent}
              readyProcessingPercent={processingPercent}
              processingPartial={isPartialPlayback}
              readyCount={readyCount}
              readinessTotal={readinessMembers.length}
              isCurrentUserReady={currentMember?.isReady ?? false}
              showSoloHostPlayOverlay={showSoloHostPlayOverlay}
              {...(!isOwner && readinessMembers.length > 0
                ? {
                    onToggleReady: () => {
                      sendReadyUpdate(!(currentMember?.isReady ?? false));
                    }
                  }
                : {})}
              onTogglePlay={togglePlay}
              onTimeUpdate={syncVideoTime}
              onLoadedMetadata={syncVideoMetadata}
              onProgress={updateBufferedEnd}
              onLoadedData={handleVideoLoadedData}
              onPlay={() => { setIsPlaying(true); }}
              onPause={() => { setIsPlaying(false); }}
              onEnded={() => {
                const video = videoRef.current;
                if (video === null || authoritativeMovieId == null || !isOwner) {
                  setIsPlaying(false);
                  return;
                }
                video.currentTime = 0;
                sendPlaybackUpdate({
                  movieId: authoritativeMovieId,
                  isPlaying: false,
                  positionSec: 0,
                  playbackRate: 1,
                  ended: true
                });
                setIsPlaying(false);
                setCurrentTime(0);
                setPlaybackRate(1);
              }}
              onCanPlay={() => { setVideoReady(true); setVideoError(null); updateBufferedEnd(); }}
              onVideoError={handleVideoError}
              onScrub={scrubTo}
              onSeekBy={seekBy}
              onSelectQuality={selectQuality}
              onPlaybackRateChange={changePlaybackRate}
              onToggleMute={() => { setMuted((m) => !m); }}
              onVolumeChange={(next) => { setVolume(next); setMuted(false); }}
              ownerUploadOverlay={ownerUploadOverlay}
            />
            {showCountdown && (
              <CountdownOverlay
                key={roomState.countdown.endsAt ?? 'countdown'}
                members={displayMembers}
                endsAt={roomState.countdown.endsAt}
                onComplete={() => { setCountdownDismissed(true); }}
              />
            )}
            <ForcePlayConfirmationModal
              open={forcePlayModalOpen}
              currentUserId={currentUserId}
              unreadyMembers={unreadyMembers}
              onCancel={cancelForcePlay}
              onConfirm={confirmForcePlay}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className="room-sidebar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Sidebar info bar — movie title + connection status only (room name is in the top header) */}
          {(room.movie_name !== null && room.movie_name !== undefined) || socketStatus !== 'connected' || roomError !== null ? (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              {room.movie_name !== null && room.movie_name !== undefined && (
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {room.movie_name}
                </p>
              )}
              {socketStatus !== 'connected' && (
                <p style={{ margin: room.movie_name !== null && room.movie_name !== undefined ? '4px 0 0' : 0, fontSize: 11, color: socketStatus === 'error' ? '#f87171' : 'var(--text-muted)', fontStyle: 'italic' }}>
                  {socketStatus === 'error' ? 'Connection error' : socketStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
                </p>
              )}
              {roomError !== null && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#f87171' }}>
                  {roomError}
                </p>
              )}
            </div>
          ) : null}

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

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Blocked users</p>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                        {blockedUsers.length > 0 ? `${String(blockedUsers.length)} blocked` : 'None blocked'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '5px 10px', fontSize: 12, flexShrink: 0 }}
                      onClick={() => { toggleBlockedPanel(room.id); }}
                    >
                      {showBlockedUsers ? 'Hide' : 'Manage'}
                    </button>
                  </div>

                  {showBlockedUsers && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                      {blockedLoading && (
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Loading…</p>
                      )}
                      {blockedError !== null && (
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--accent)' }}>{blockedError}</p>
                      )}
                      {!blockedLoading && blockedError === null && blockedUsers.length === 0 && (
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                          No one is blocked from this room.
                        </p>
                      )}
                      {blockedUsers.map((blocked) => (
                        <div
                          key={blocked.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          <span style={{ minWidth: 0, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {blocked.name}
                          </span>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }}
                            disabled={unblockingId === blocked.id}
                            onClick={() => { handleUnblockUser(room.id, blocked.id); }}
                          >
                            {unblockingId === blocked.id ? 'Unblocking…' : 'Unblock'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabs: Participants | Chat */}
          <Tabs
            value={activeTab}
            onValueChange={(tab) => {
              setActiveTab(tab);
              if (tab === 'chat') setUnreadCount(0);
            }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="mx-3 mt-2 flex shrink-0 items-center gap-1.5">
              <TabsList
                className="h-9 flex-1 rounded-lg"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
              >
                <TabsTrigger value="participants" className="flex flex-1 items-center gap-1.5 text-xs">
                  <Users size={12} />
                  Viewers ({liveViewerCount})
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex flex-1 items-center gap-1.5 text-xs">
                  <MessageSquare size={12} />
                  Chat{unreadCount > 0 ? ` (${String(unreadCount)})` : ''}
                </TabsTrigger>
              </TabsList>
              <button
                type="button"
                title={chatSoundMuted ? 'Unmute chat sounds' : 'Mute chat sounds'}
                onClick={() => { setChatSoundMuted((m) => !m); }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                style={{
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: chatSoundMuted ? 'var(--text-muted)' : 'var(--accent)',
                }}
              >
                {chatSoundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>

            <TabsContent
              value="participants"
              className="soft-scroll mt-1 min-h-0 flex-1 overflow-y-auto"
            >
              <InviteFriends members={displayMembers} />
              <ParticipantList
                members={displayMembers}
                currentUserId={currentUserId}
                canModerate={isOwner}
                onAddFriend={handleAddFriend}
                onTagUser={handleTagUser}
                onKickUser={handleKickUser}
                onBlockUser={handleBlockUser}
              />
            </TabsContent>

            <TabsContent
              value="chat"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0"
            >
              <CinemaChat
                messages={messages}
                onSend={socketSendMessage}
                draftMessage={chatDraft}
                onDraftMessageChange={setChatDraft}
                currentUserId={currentUserId}
                members={displayMembers.map((m) => ({ id: m.id, name: m.name }))}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
