import { Plus } from 'lucide-react';

interface FeaturedRoomHeroProps {
  onCreateRoom: () => void;
}

export function FeaturedRoomHero({ onCreateRoom }: FeaturedRoomHeroProps) {
  return <CreateRoomHero onCreateRoom={onCreateRoom} />;
}

function CreateRoomHero({ onCreateRoom }: { onCreateRoom: () => void }) {
  return (
    <div
      className="relative mb-10 flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl group"
      style={{
        minHeight: 200,
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#100d08',
      }}
      onClick={onCreateRoom}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCreateRoom(); }}
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, var(--accent-dim) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
        style={{ border: '1px solid var(--accent-dim)' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl transition-all"
          style={{
            border: '1px solid var(--accent-dim)',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
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
