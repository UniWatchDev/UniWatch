import { useNavigate } from 'react-router-dom';
import type { RoomResponse, RoomStatus } from '@repo/schemas/rooms';

interface RoomCardProps {
  room: RoomResponse;
}

function StatusBadge({ status }: { status: RoomStatus }) {
  const map = {
    watching: { label: 'Watching Now', cls: 'badge badge-watching' },
    preparing: { label: 'Preparing', cls: 'badge badge-preparing' },
    ready: { label: 'Ready', cls: 'badge badge-ready' },
  } as const;
  const { label, cls } = map[status];
  return <span className={cls}>{label}</span>;
}

function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: 'var(--text-muted)', flexShrink: 0 }}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const STATUS_BORDER_CLASS: Record<RoomStatus, string> = {
  watching: 'room-card-watching',
  preparing: 'room-card-preparing',
  ready: 'room-card-ready',
};

export function RoomCard({ room }: RoomCardProps) {
  const navigate = useNavigate();
  const isPrivate = room.room_type === 'private';

  return (
    <div
      className={`card ${room.status !== undefined ? STATUS_BORDER_CLASS[room.status] : ''}`}
      onClick={() => { void navigate(`/room/${room.id}`); }}
      style={{ padding: '16px', cursor: 'pointer', userSelect: 'none' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') void navigate(`/room/${room.id}`); }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
          <span
            className="display"
            style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {room.name}
          </span>
          {room.status !== undefined && <StatusBadge status={room.status} />}
        </div>
        {isPrivate && <LockIcon />}
      </div>

      {/* Movie name */}
      {room.movie_name && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>
          {room.movie_name}
        </p>
      )}

      {/* Description */}
      {room.description && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            margin: '0 0 10px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {room.description}
        </p>
      )}

      {/* Owner + viewer count row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          by <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{room.creator_name}</span>
        </span>
        {isPrivate ? (
          <span style={{ fontSize: 12, color: 'var(--accent-hover)', fontWeight: 600 }}>
            Password required
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-muted)' }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{room.member_count} watching</span>
          </div>
        )}
      </div>
    </div>
  );
}
