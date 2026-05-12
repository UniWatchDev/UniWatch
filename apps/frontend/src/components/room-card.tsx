import { useNavigate } from 'react-router-dom';
import type { Room, RoomStatus } from '@/types/room';

interface RoomCardProps {
  room: Room;
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

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

const STATUS_BORDER_CLASS: Record<RoomStatus, string> = {
  watching: 'room-card-watching',
  preparing: 'room-card-preparing',
  ready: 'room-card-ready',
};

export function RoomCard({ room }: RoomCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`card ${STATUS_BORDER_CLASS[room.status]}`}
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
          <StatusBadge status={room.status} />
        </div>
        {room.isPrivate && <LockIcon />}
      </div>

      {/* Movie name */}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>
        {room.movieName}
      </p>

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

      {/* Genre + rating row */}
      {(room.genre ?? room.rating !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {room.genre && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'var(--accent-dim)',
                color: 'var(--accent-hover)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              {room.genre}
            </span>
          )}
          {room.rating !== undefined && <StarRating rating={room.rating} />}
        </div>
      )}

      {/* Private label or viewer count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {room.isPrivate ? (
          <span style={{ fontSize: 12, color: 'var(--accent-hover)', fontWeight: 600 }}>
            Password required
          </span>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-muted)' }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{room.viewerCount} watching</span>
          </>
        )}
      </div>
    </div>
  );
}
