import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRoomContract, previewRoomContract, joinRoomContract, leaveRoomContract } from '@repo/contracts/rooms';
import { getAuthMeContract } from '@repo/contracts/auth';
import type { RoomPreview } from '@repo/schemas/rooms';
import { API_BASE_URL } from '@repo/consts/api';
import type { RoomResponse, RoomStatus } from '@repo/schemas/rooms';
import { useRoomSocket } from '@/hooks/use-room-socket';
import { UserAvatar } from '@/components/user-avatar';

function StatusDot({ status }: { status: Member['status'] }) {
  const color = status === 'active' ? '#4ade80' : status === 'away' ? '#fbbf24' : '#64748b';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="19,20 9,12 19,4" />
      <rect x="5" y="4" width="3" height="16" rx="1" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,4 15,12 5,20" />
      <rect x="16" y="4" width="3" height="16" rx="1" />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h)}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m)}:${String(s).padStart(2, '0')}`;
}

function formatChatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const [currentTime, setCurrentTime] = useState(3862);
  const [duration] = useState(8887);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const isOwner = currentUserId !== null && currentUserId === room.creator;

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    socketSendMessage(text);
    setChatInput('');
  };

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
          {isOwner && (
            <button
              onClick={() => { void navigate(`/rooms/${String(id)}/edit`); }}
              title="Edit room"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 7px',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-medium)',
                borderRadius: 7,
                cursor: 'pointer',
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border-medium)';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
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
      </header>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Video + controls */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border-subtle)',
            minWidth: 0,
          }}
        >
          {/* Video canvas */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>⏳</p>
              <p style={{ fontSize: 14 }}>Waiting for the host to upload a video…</p>
            </div>

            {/* Movie info overlay */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{room.name}</span>
                {room.movie_name && (
                  <>
                    <span> - </span>
                    <span>{room.movie_name}</span>
                  </>
                )}
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: '#4ade80',
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              padding: '10px 20px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={(e) => { setCurrentTime(Number(e.target.value)); }}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {formatTime(duration)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => { setCurrentTime((t) => Math.max(0, t - 10)); }} style={controlBtnStyle} title="Rewind 10s">
                <SkipBackIcon />
              </button>
              <button
                onClick={() => { setIsPlaying((p) => !p); }}
                style={{ ...controlBtnStyle, background: 'var(--accent)', color: '#fff', padding: '8px 14px', borderRadius: 8 }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button onClick={() => { setCurrentTime((t) => Math.min(duration, t + 10)); }} style={controlBtnStyle} title="Forward 10s">
                <SkipForwardIcon />
              </button>
              <div style={{ flex: 1 }} />
              <button style={{ ...controlBtnStyle, padding: '6px 8px' }} onClick={() => { setMuted((m) => !m); }} title={muted ? 'Unmute' : 'Mute'}>
                <VolumeIcon muted={muted} />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
                style={{ width: 80 }}
                title="Volume"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside
          style={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-surface)',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Room info */}
          <section style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <h3
              style={{
                margin: '0 0 10px',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
              }}
            >
              In this room ({room.member_count})
            </h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <p style={{ margin: '0 0 4px' }}>
                Host: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>@{room.creator_name}</span>
                {isOwner && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent-hover)', fontWeight: 700 }}>YOU</span>}
              </p>
              {!isOwner && currentUserId !== null && (
                <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-muted)' }}>
                  You joined as a member
                </p>
              )}
              {room.movie_name && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  Watching: {room.movie_name}
                </p>
              )}
            </div>
            {socketStatus !== 'connected' && (
              <p style={{ margin: '10px 0 0', fontSize: 11, color: socketStatus === 'error' ? '#f87171' : 'var(--text-muted)', fontStyle: 'italic' }}>
                {socketStatus === 'error' ? 'Connection error' : socketStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
              </p>
            )}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.map((member) => (
                <li key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <UserAvatar name={member.name} avatarColor={member.avatarColor} size={32} />
                    <span style={{ position: 'absolute', bottom: 0, right: 0 }}>
                      <StatusDot status={member.status} />
                    </span>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member.name}
                      </span>
                      {member.isHost && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'var(--accent-dim)',
                            color: 'var(--accent-hover)',
                            border: '1px solid rgba(124,58,237,0.25)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          HOST
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{member.username}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Chat */}
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                }}
              >
                Chat
              </h3>
            </div>

            <div
              className="soft-scroll"
              style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {messages.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 16 }}>
                  No messages yet. Say something!
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: msg.userId === 'me' ? 'var(--accent-hover)' : 'var(--text-primary)' }}>
                        {msg.userName}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatChatTime(msg.timestamp)}</span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <input
                className="input"
                type="text"
                placeholder="Say something…"
                value={chatInput}
                onChange={(e) => { setChatInput(e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
              />
              <button
                onClick={sendMessage}
                style={{
                  ...controlBtnStyle,
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: 8,
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '7px 10px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-medium)',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  transition: 'all 200ms ease',
};
