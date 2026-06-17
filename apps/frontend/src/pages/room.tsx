import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '@repo/consts/api';
import { getRoomContract, previewRoomContract, joinRoomContract, leaveRoomContract } from '@repo/contracts/rooms';
import { getAuthMeContract } from '@repo/contracts/auth';
import type { RoomPreview } from '@repo/schemas/rooms';
import type { PlaybackState } from '@repo/schemas/realtime';
import type { RoomResponse, RoomStatus } from '@repo/schemas/rooms';
import { useRoomSocket } from '@/hooks/use-room-socket';
import { attachMovieToRoom } from '@/movies/attach-room-movie';
import { MovieUploadField } from '@/movies/movie-upload-field';
import { MovieUploadProgress } from '@/movies/movie-upload-progress';
import { RoomVideoPlayer } from '@/movies/room-video-player';
import { PLAYBACK_RATES, type PlaybackRate } from '@/movies/room-playback';
import { useRoomMovie } from '@/movies/use-room-movie';
import { prepareMovieForRoom } from '@/movies/prepare-movie-for-room';
import { validateMovieFile } from '@/movies/upload-movie-file';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ParticipantList } from '@/components/participant-list';
import { CinemaChat } from '@/components/cinema-chat';
import { CountdownOverlay } from '@/components/countdown-overlay';
import { ForcePlayConfirmationModal } from '@/components/force-play-confirmation-modal';
import { Users, MessageSquare, Volume2, VolumeX, UserPlus, Check, Link } from 'lucide-react';
import { MOCK_FRIENDS } from '@/data/mock-profile-data';
import type { Member } from '@/types/room';

function initials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

interface PlaybackChangeEvent {
  actorUserId: string | null;
  playback: PlaybackState;
}

function isPlaybackRate(rate: number): rate is PlaybackRate {
  return PLAYBACK_RATES.some((candidate) => candidate === rate);
}

function getHostPlaybackPosition(playback: PlaybackState, atMs = Date.now()): number {
  if (!playback.isPlaying) {
    return playback.positionSec;
  }
  const elapsedSeconds = Math.max(0, atMs - new Date(playback.updatedAt).getTime()) / 1000;
  return playback.positionSec + elapsedSeconds * playback.playbackRate;
}

function computeRoomStatus(
  hasMovie: boolean,
  moviePlayable: boolean,
  isPlaying: boolean,
  members: Member[],
  creatorId: string | null
): RoomStatus {
  if (!hasMovie || !moviePlayable) {
    return 'waiting';
  }
  if (isPlaying) {
    return 'watching';
  }
  if (members.length === 0) {
    return 'waiting';
  }
  const membersToCheck = creatorId === null ? members : members.filter((member) => member.id !== creatorId);
  if (membersToCheck.length === 0) {
    return 'waiting';
  }
  return membersToCheck.every((member) => member.isReady) ? 'ready' : 'waiting';
}

function canCurrentUserAccessRoomMovie(
  currentUserId: string | null,
  room: RoomResponse | null
): boolean {
  if (currentUserId === null || room === null || room.movie === null) {
    return false;
  }
  return currentUserId === room.creator || room.allowed_users.includes(currentUserId);
}

function InviteFriends({ members }: { members: Member[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const memberUsernames = new Set(members.map((m) => m.username));

  const handleInvite = (friendId: string) => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(friendId);
      setTimeout(() => { setCopied(null); }, 2000);
    });
  };

  return (
    <div style={{ padding: '12px 12px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <UserPlus size={13} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          Invite Friends
        </span>
      </div>
      {MOCK_FRIENDS.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>No friends yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          {MOCK_FRIENDS.map((friend) => {
            const inRoom = memberUsernames.has(friend.username);
            const wasCopied = copied === friend.id;
            return (
              <div
                key={friend.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: friend.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {initials(friend.name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {friend.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>@{friend.username}</p>
                </div>
                {inRoom ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>
                    In Room
                  </span>
                ) : (
                  <button
                    type="button"
                    title="Copy invite link"
                    onClick={() => { handleInvite(friend.id); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 99,
                      border: '1px solid var(--border-medium)',
                      background: wasCopied ? 'rgba(74,222,128,0.1)' : 'var(--accent-dim)',
                      color: wasCopied ? '#4ade80' : 'var(--accent)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 150ms ease',
                    }}
                  >
                    {wasCopied ? <Check size={11} /> : <Link size={11} />}
                    {wasCopied ? 'Copied!' : 'Invite'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 10 }} />
    </div>
  );
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
  const [ownerMovieSaving, setOwnerMovieSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatSoundMuted, setChatSoundMuted] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [ownerUploadFile, setOwnerUploadFile] = useState<File | null>(null);
  const [ownerUploadError, setOwnerUploadError] = useState<string | null>(null);
  const [ownerUploadPercent, setOwnerUploadPercent] = useState<number | null>(null);
  const [showRoomPassword, setShowRoomPassword] = useState(false);
  const [forcePlayModalOpen, setForcePlayModalOpen] = useState(false);
  const [movieAnnouncement, setMovieAnnouncement] = useState<string | null>(null);
  const [remotePlaybackEvent, setRemotePlaybackEvent] = useState<PlaybackChangeEvent | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>(() => MOCK_FRIENDS.map((friend) => friend.id));
  const videoRef = useRef<HTMLVideoElement>(null);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlaybackEmitAtRef = useRef(0);
  const initialPlaybackSyncRoomIdRef = useRef<string | null>(null);
  const suppressPlaybackEmitRef = useRef(false);
  const roomMovieId =
    canCurrentUserAccessRoomMovie(currentUserId, room) && room !== null ? room.movie : null;

  const {
    loading: movieLoading,
    error: movieError,
    mediaSrc,
    isUploading: movieUploading,
    isPlayable: moviePlayable,
    isFailed: movieFailed
  } = useRoomMovie(roomMovieId);
  const isOwner = currentUserId !== null && currentUserId === room?.creator;

  const refreshRoom = useCallback(async () => {
    if (id === undefined) return;
    try {
      const updated = await fetchRoom(id);
      setRoom(updated);
    } catch (err: unknown) {
      console.error('[room]', err instanceof Error ? err.message : 'Failed to refresh room');
    }
  }, [id]);

  const handleMovieUpdated = useCallback((movieId: string) => {
    if (movieId.length === 0) return;
    setMovieAnnouncement('Movie changed. Waiting for the host to play it.');
    void refreshRoom();
  }, [refreshRoom]);

  const handlePlaybackChanged = useCallback((event: PlaybackChangeEvent) => {
    setRemotePlaybackEvent(event);
  }, []);

  const {
    messages,
    members,
    socketStatus,
    roomState,
    sendMessage: socketSendMessage,
    sendReadyUpdate,
    sendMovieUpdated,
    sendPlaybackUpdate,
    sendKickUser,
    sendBlockUser
  } = useRoomSocket({
    roomId: id ?? '',
    disabled: loading || room === null,
    creatorId: room?.creator ?? '',
    creatorName: room?.creator_name ?? undefined,
    initialMemberIds: room?.allowed_users ?? [],
    onMovieUpdated: handleMovieUpdated,
    onPlaybackChanged: handlePlaybackChanged
  });

  const displayMembers = members.map((member) => ({
    ...member,
    isFriend: friendIds.includes(member.id)
  }));
  const currentMember = displayMembers.find((member) => member.id === currentUserId) ?? null;
  const isSoloHost = isOwner && displayMembers.length === 1;
  const liveRoomStatus = computeRoomStatus(
    room?.movie != null,
    moviePlayable,
    roomState.playback.isPlaying,
    displayMembers,
    room?.creator ?? null
  );
  const unreadyMembers = displayMembers.filter((member) => !member.isHost && !member.isReady);
  const needsForcePlayConfirmation = isOwner && !isSoloHost && unreadyMembers.length > 0;
  const showCountdown = roomState.countdown.active;
  const readinessMembers = displayMembers.filter((member) => !member.isHost);
  const handleAddFriend = (member: Member) => {
    setFriendIds((prev) => (prev.includes(member.id) ? prev : [...prev, member.id]));
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
      setOwnerUploadFile(null);
      setOwnerUploadError(null);
      setOwnerUploadPercent(null);
      setShowRoomPassword(false);
    }
  }, [isOwner]);

  useEffect(() => {
    setShowRoomPassword(false);
    setForcePlayModalOpen(false);
    setMovieAnnouncement(null);
    setRemotePlaybackEvent(null);
  }, [room?.id]);

  useEffect(() => {
    if (movieAnnouncement === null) return;
    if (announcementTimerRef.current !== null) {
      clearTimeout(announcementTimerRef.current);
    }
    announcementTimerRef.current = setTimeout(() => {
      setMovieAnnouncement(null);
      announcementTimerRef.current = null;
    }, 3500);

    return () => {
      if (announcementTimerRef.current !== null) {
        clearTimeout(announcementTimerRef.current);
        announcementTimerRef.current = null;
      }
    };
  }, [movieAnnouncement]);

  useEffect(() => {
    initialPlaybackSyncRoomIdRef.current = null;
  }, [room?.id, room?.movie]);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null || remotePlaybackEvent === null || room === null || !videoReady || mediaSrc === null) {
      return;
    }
    if (remotePlaybackEvent.actorUserId !== null && remotePlaybackEvent.actorUserId === currentUserId) {
      setRemotePlaybackEvent(null);
      return;
    }

    const { playback } = remotePlaybackEvent;
    if (playback.movieId !== room.movie) {
      setMovieAnnouncement('Movie changed. Waiting for the host to play it.');
      void refreshRoom();
      return;
    }

    suppressPlaybackEmitRef.current = true;
    try {
      if (isPlaybackRate(playback.playbackRate) && video.playbackRate !== playback.playbackRate) {
        video.playbackRate = playback.playbackRate;
        setPlaybackRate(playback.playbackRate);
      }

      const truthPosition = getHostPlaybackPosition(playback);
      const drift = Math.abs(video.currentTime - truthPosition);
      if (playback.movieId !== room.movie || drift > 2) {
        video.currentTime = truthPosition;
        setCurrentTime(truthPosition);
      }

      setIsPlaying(playback.isPlaying);
      if (playback.isPlaying) {
        void video.play().catch(() => {
          setVideoError('Playback failed. Check your connection and try again.');
        });
      } else {
        video.pause();
      }
    } finally {
      queueMicrotask(() => {
        suppressPlaybackEmitRef.current = false;
      });
    }
    setRemotePlaybackEvent(null);
  }, [currentUserId, mediaSrc, refreshRoom, remotePlaybackEvent, room, videoReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (
      video === null ||
      room === null ||
      room.movie === null ||
      roomState.playback.movieId !== room.movie ||
      !videoReady ||
      mediaSrc === null ||
      remotePlaybackEvent !== null
    ) {
      return;
    }

    if (initialPlaybackSyncRoomIdRef.current === room.id) {
      return;
    }

    suppressPlaybackEmitRef.current = true;
    try {
      const truthPosition = getHostPlaybackPosition(roomState.playback);
      if (isPlaybackRate(roomState.playback.playbackRate) && video.playbackRate !== roomState.playback.playbackRate) {
        video.playbackRate = roomState.playback.playbackRate;
        setPlaybackRate(roomState.playback.playbackRate);
      }

      video.currentTime = truthPosition;
      setCurrentTime(truthPosition);
      setIsPlaying(roomState.playback.isPlaying);
      if (roomState.playback.isPlaying) {
        void video.play().catch(() => {
          setVideoError('Playback failed. Check your connection and try again.');
        });
      } else {
        video.pause();
      }
    } finally {
      queueMicrotask(() => {
        suppressPlaybackEmitRef.current = false;
      });
    }

    initialPlaybackSyncRoomIdRef.current = room.id;
  }, [mediaSrc, remotePlaybackEvent, room, roomState.playback, videoReady]);

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

  const canControlPlayback = isOwner && moviePlayable && videoReady && videoError === null;
  const canStartPlayback = canControlPlayback && (liveRoomStatus === 'ready' || isSoloHost);

  const broadcastPlaybackState = (force: boolean) => {
    const video = videoRef.current;
    const movieId = room.movie;
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

    if (!force) {
      if (video.paused || video.ended) {
        return;
      }
      const now = Date.now();
      if (now - lastPlaybackEmitAtRef.current < 1000) {
        return;
      }
      lastPlaybackEmitAtRef.current = now;
    } else {
      lastPlaybackEmitAtRef.current = Date.now();
    }

    sendPlaybackUpdate({
      movieId,
      isPlaying: !video.paused && !video.ended,
      positionSec: video.currentTime,
      playbackRate: video.playbackRate
    });
  };

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
      if (!canStartPlayback) {
        if (needsForcePlayConfirmation) {
          setForcePlayModalOpen(true);
        }
        return;
      }
      if (room.movie == null) return;
      sendPlaybackUpdate({
        movieId: room.movie,
        isPlaying: true,
        positionSec: video.currentTime,
        playbackRate: video.playbackRate
      });
    } else {
      if (room.movie == null) return;
      sendPlaybackUpdate({
        movieId: room.movie,
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
    if (video === null || room.movie == null || !canControlPlayback) return;
    setForcePlayModalOpen(false);
    sendPlaybackUpdate({
      movieId: room.movie,
      isPlaying: true,
      positionSec: video.currentTime,
      playbackRate: video.playbackRate,
      force: true
    });
  };

  const seekBy = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (video === null || !canControlPlayback) return;
    const next = Math.min(Math.max(0, video.currentTime + deltaSeconds), video.duration || 0);
    video.currentTime = next;
    setCurrentTime(next);
    broadcastPlaybackState(true);
  };

  const handleVideoError = () => {
    setVideoError('Could not load the video. Refresh the page or re-upload the file.');
    setVideoReady(false);
    setIsPlaying(false);
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
      setMovieAnnouncement('Movie changed. Waiting for the host to play it.');
      sendMovieUpdated(updated.movie ?? uploadedMovie.id);
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
    broadcastPlaybackState(true);
  };

  const changePlaybackRate = (rate: PlaybackRate) => {
    const video = videoRef.current;
    if (video !== null) {
      video.playbackRate = rate;
    }
    setPlaybackRate(rate);
    broadcastPlaybackState(true);
  };

  const playbackStatusText = liveRoomStatus === 'watching'
    ? 'LIVE'
    : movieUploading
      ? 'UPLOADING'
      : liveRoomStatus === 'ready'
        ? 'READY'
        : 'WAITING';
  const ownerPlaceholderText = isOwner
    ? 'Choose one of your recent videos or upload a new one to start this room.'
    : 'Ask the owner to upload a movie.';
  const roomPassword = room.password ?? '';
  const roomPasswordVisible = isOwner && roomPassword.length > 0 && showRoomPassword;
  const readyCount = readinessMembers.filter((member) => member.isReady).length;
  const liveViewerCount = roomState.connectedUsers.length;

  const ownerMovieActions = isOwner && room.movie == null ? (
    <div
      style={{
        alignSelf: 'stretch',
        width: 'min(100%, 420px)',
        marginTop: 16,
        padding: '20px',
        border: '1px solid var(--border-medium)',
        borderRadius: 14,
        background: 'rgba(20,15,8,0.9)',
        backdropFilter: 'blur(14px)',
        color: 'var(--text-primary)',
        display: 'grid',
        gap: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Upload a movie</p>
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
        className="btn-primary"
        onClick={() => { void handleOwnerMovieUpload(); }}
        disabled={ownerMovieSaving || ownerUploadFile === null || ownerUploadError !== null}
      >
        {ownerMovieSaving ? 'Uploading…' : 'Upload'}
      </button>
      {ownerUploadPercent !== null && <MovieUploadProgress percent={ownerUploadPercent} />}
    </div>
  ) : null;


  const statusLabel: Record<RoomStatus, string> = {
    waiting: 'WAITING',
    ready: 'READY TO WATCH',
    watching: 'WATCHING',
  };
  const statusClass: Record<RoomStatus, string> = {
    waiting: 'badge badge-waiting',
    watching: 'badge badge-watching',
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
          <span className={statusClass[liveRoomStatus]}>{statusLabel[liveRoomStatus]}</span>
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
              showHostControls={isOwner}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              muted={muted}
              volume={volume}
              announcementText={movieAnnouncement}
              onTogglePlay={togglePlay}
              onTimeUpdate={syncVideoTime}
              onLoadedMetadata={syncVideoTime}
              onPlay={() => { setIsPlaying(true); }}
              onPause={() => { setIsPlaying(false); }}
              onEnded={() => {
                setIsPlaying(false);
                broadcastPlaybackState(true);
              }}
              onCanPlay={() => { setVideoReady(true); setVideoError(null); }}
              onVideoError={handleVideoError}
              onScrub={scrubTo}
              onSeekBy={seekBy}
              onPlaybackRateChange={changePlaybackRate}
              onToggleMute={() => { setMuted((m) => !m); }}
              onVolumeChange={(next) => { setVolume(next); setMuted(false); }}
              ownerActions={ownerMovieActions}
              placeholderText={ownerPlaceholderText}
            />
            {showCountdown && (
              <CountdownOverlay
                key={roomState.countdown.endsAt ?? 'countdown'}
                members={displayMembers}
                endsAt={roomState.countdown.endsAt}
                onComplete={() => {}}
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
          {(room.movie_name !== null && room.movie_name !== undefined) || socketStatus !== 'connected' ? (
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
              </div>
            </div>
          )}

          {!isOwner && room.movie != null && readinessMembers.length > 0 && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gap: 10
                }}
              >
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    Room readiness
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    {readyCount}/{readinessMembers.length} ready
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Your status</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>
                      {currentMember?.isReady ? 'Ready' : 'Not ready'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={currentMember?.isReady ? 'btn-ghost' : 'btn-primary'}
                    style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }}
                    onClick={() => { sendReadyUpdate(!(currentMember?.isReady ?? false)); }}
                  >
                    {currentMember?.isReady ? 'Unready' : 'Ready'}
                  </button>
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
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
