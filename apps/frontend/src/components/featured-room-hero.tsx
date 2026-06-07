import { useNavigate } from 'react-router-dom';
import type { RoomResponse } from '@repo/schemas/rooms';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Users } from 'lucide-react';

interface FeaturedRoomHeroProps {
  rooms: RoomResponse[];
  onCreateRoom: () => void;
}

function pickFeatured(rooms: RoomResponse[]): RoomResponse | null {
  return (
    rooms.find((r) => r.status === 'watching') ??
    rooms.find((r) => r.status === 'ready') ??
    null
  );
}

export function FeaturedRoomHero({ rooms, onCreateRoom }: FeaturedRoomHeroProps) {
  const featured = pickFeatured(rooms);

  if (featured === null) {
    return <CreateRoomHero onCreateRoom={onCreateRoom} />;
  }

  return <ActiveRoomHero room={featured} onCreateRoom={onCreateRoom} />;
}

function ActiveRoomHero({
  room,
  onCreateRoom,
}: {
  room: RoomResponse;
  onCreateRoom: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="relative mb-10 overflow-hidden rounded-2xl"
      style={{ minHeight: 280 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.28) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 30%, rgba(249, 115, 22, 0.18) 0%, transparent 50%),
            linear-gradient(160deg, #100f20 0%, #0d0d1a 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.75) 40%, transparent 100%)',
        }}
      />

      <div
        className="relative z-10 flex flex-col justify-end p-8"
        style={{ minHeight: 280 }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-red-500/40 bg-red-500/20 font-mono text-[10px] tracking-widest text-red-400"
          >
            ● LIVE NOW
          </Badge>
          {(room.member_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-white/40">
              <Users size={12} />
              {room.member_count} watching
            </span>
          )}
        </div>

        {room.movie_name !== null && room.movie_name !== undefined && (
          <p
            className="mb-1 text-sm uppercase tracking-[0.2em] text-white/40"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {room.movie_name}
          </p>
        )}

        <h2
          className="mb-2 text-3xl font-bold leading-tight text-white"
          style={{ fontFamily: 'var(--font-display)', maxWidth: 480 }}
        >
          {room.name}
        </h2>

        {room.description !== null && room.description !== undefined && (
          <p className="mb-5 max-w-sm text-sm text-white/45 line-clamp-2">
            {room.description}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            onClick={() => { void navigate(`/room/${room.id}`); }}
          >
            <Play size={14} fill="currentColor" />
            Join Room
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.05)' }}
            onClick={onCreateRoom}
          >
            <Plus size={14} />
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateRoomHero({ onCreateRoom }: { onCreateRoom: () => void }) {
  return (
    <div
      className="relative mb-10 flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl group"
      style={{
        minHeight: 200,
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#0d0d1a',
      }}
      onClick={onCreateRoom}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCreateRoom(); }}
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(124, 58, 237, 0.1) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
        style={{ border: '1px solid rgba(124,58,237,0.3)' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl transition-all"
          style={{
            border: '1px solid rgba(124,58,237,0.3)',
            background: 'rgba(124,58,237,0.1)',
            color: '#a78bfa',
          }}
        >
          <Plus size={24} />
        </div>
        <div>
          <p
            className="text-lg font-bold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Start Watching Together
          </p>
          <p className="mt-1 text-sm text-white/40">
            Create a room, upload a movie, invite friends
          </p>
        </div>
      </div>
    </div>
  );
}
