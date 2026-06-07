import { useNavigate } from 'react-router-dom';
import type { RoomResponse, RoomStatus } from '@repo/schemas/rooms';
import { Badge } from '@/components/ui/badge';
import { Lock, Users } from 'lucide-react';

const STATUS_CONFIG: Record<RoomStatus, { label: string; className: string }> = {
  watching: {
    label: '● LIVE',
    className:
      'border-red-500/40 bg-red-500/20 font-mono text-[10px] tracking-widest text-red-400',
  },
  preparing: {
    label: 'PREPARING',
    className:
      'border-amber-500/40 bg-amber-500/20 font-mono text-[10px] tracking-widest text-amber-400',
  },
  ready: {
    label: 'READY',
    className:
      'border-emerald-500/40 bg-emerald-500/20 font-mono text-[10px] tracking-widest text-emerald-400',
  },
};

interface CinemaRoomCardProps {
  room: RoomResponse;
}

export function CinemaRoomCard({ room }: CinemaRoomCardProps) {
  const navigate = useNavigate();
  const statusCfg = room.status !== undefined ? STATUS_CONFIG[room.status] : null;

  const handleClick = () => { void navigate(`/room/${room.id}`); };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKey}
      className="cinema-card-hover group relative cursor-pointer overflow-hidden rounded-xl"
      style={{
        aspectRatio: '16 / 9',
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#0d0d1a',
        userSelect: 'none',
      }}
    >
      {/* Gradient background standing in for movie art */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 40%, rgba(124, 58, 237, 0.18) 0%, transparent 65%),
            radial-gradient(ellipse at 80% 20%, rgba(249, 115, 22, 0.12) 0%, transparent 60%),
            linear-gradient(160deg, #0f0f1e 0%, #0d0d1a 100%)
          `,
        }}
      />

      {/* Status badge — top left */}
      {statusCfg !== null && (
        <div className="absolute left-3 top-3 z-10">
          <Badge variant="outline" className={statusCfg.className}>
            {statusCfg.label}
          </Badge>
        </div>
      )}

      {/* Private lock — top right */}
      {room.room_type === 'private' && (
        <div className="absolute right-3 top-3 z-10">
          <div className="rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
            <Lock size={11} className="text-white/60" />
          </div>
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div className="cinema-card-gradient absolute inset-0 z-10" />

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3">
        {room.movie_name !== null && room.movie_name !== undefined && (
          <p className="mb-0.5 truncate font-mono text-[10px] uppercase tracking-widest text-white/45">
            {room.movie_name}
          </p>
        )}

        <p
          className="mb-2 truncate font-bold leading-tight text-white"
          style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}
        >
          {room.name}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-white/35">
            by <span className="text-white/55">{room.creator_name}</span>
          </span>

          {room.room_type === 'private' ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-400/70">
              <Lock size={9} />
              Private
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-white/35">
              <Users size={11} />
              {room.member_count}
            </span>
          )}
        </div>
      </div>

      {/* Hover reveal */}
      <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md ring-1 ring-white/20">
          Join Room
        </div>
      </div>
    </div>
  );
}
