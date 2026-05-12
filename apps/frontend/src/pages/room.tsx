import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_ROOMS, MOCK_CHAT } from '@/data/mock-data';
import type { ChatMessage, Member } from '@/types/room';

function Avatar({ member, size = 36 }: { member: Member; size?: number }) {
  const initials = member.name.slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: member.avatarColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

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

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const room = MOCK_ROOMS.find((r) => r.id === id);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(3862); // 1:04:22
  const [duration] = useState(8887); // 2:28:07
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  if (!room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 18 }}>Room not found.</p>
        <button className="btn-primary" onClick={() => { void navigate('/'); }}>Back to Lobby</button>
      </div>
    );
  }

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `c${String(Date.now())}`,
        userId: 'me',
        userName: 'You',
        content: text,
        timestamp: new Date(),
      },
    ]);
    setChatInput('');
    setTimeout(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 50);
  };

  const statusLabel: Record<string, string> = {
    watching: 'WATCHING',
    preparing: 'PREPARING',
    ready: 'READY',
  };
  const statusClass: Record<string, string> = {
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
          <span
            className="display"
            style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}
          >
            {room.name}
          </span>
          <span className={statusClass[room.status] ?? 'badge'}>{statusLabel[room.status] ?? room.status}</span>
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
        </div>
        <button
          className="btn-danger"
          style={{ padding: '7px 16px', fontSize: 13 }}
          onClick={() => { void navigate('/'); }}
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
            {/* Placeholder video state */}
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
                <span> - </span>
                <span>{room.movieName}</span>
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
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#4ade80',
                      display: 'inline-block',
                    }}
                  />
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
            {/* Progress */}
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

            {/* Buttons + volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => { setCurrentTime((t) => Math.max(0, t - 10)); }}
                style={controlBtnStyle}
                title="Rewind 10s"
              >
                <SkipBackIcon />
              </button>

              <button
                onClick={() => { setIsPlaying((p) => !p); }}
                style={{ ...controlBtnStyle, background: 'var(--accent)', color: '#fff', padding: '8px 14px', borderRadius: 8 }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>

              <button
                onClick={() => { setCurrentTime((t) => Math.min(duration, t + 10)); }}
                style={controlBtnStyle}
                title="Forward 10s"
              >
                <SkipForwardIcon />
              </button>

              <div style={{ flex: 1 }} />

              {/* Volume */}
              <button
                style={{ ...controlBtnStyle, padding: '6px 8px' }}
                onClick={() => { setMuted((m) => !m); }}
                title={muted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon muted={muted} />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setMuted(false);
                }}
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
          {/* Members */}
          <section
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
              }}
            >
              In this room ({room.members.length})
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {room.members.map((member) => (
                <li key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar member={member} size={32} />
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
          <section
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px 8px',
                borderBottom: '1px solid var(--border-subtle)',
                flexShrink: 0,
              }}
            >
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

            {/* Messages */}
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

            {/* Input */}
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
