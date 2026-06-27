import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { listRoomsContract } from '@repo/contracts/rooms';
import { API_BASE_URL } from '@repo/consts/api';
import { RoomClosedLobbyNotice } from '@/components/room-closed-lobby-notice';
import { StarField } from '@/components/star-field';
import { FeaturedRoomHero } from '@/components/featured-room-hero';
import { CinemaRoomCard } from '@/components/cinema-room-card';
import type { RoomResponse, RoomStatus } from '@/types/room';
import { Search } from 'lucide-react';
import { ActiveUsersSidebar } from '@/lobby/active-users-sidebar';

const REFRESH_INTERVAL_MS = 2_000;

type FilterStatus = RoomStatus | 'all';

const STATUS_SECTIONS: { status: RoomStatus; label: string; emoji: string }[] = [
  { status: 'watching', label: 'Watching Now', emoji: '🔴' },
  { status: 'ready', label: 'Ready to Watch', emoji: '🎬' },
  { status: 'waiting', label: 'Waiting', emoji: '⏳' },
];

const FILTER_BUTTONS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Watching', value: 'watching' },
  { label: 'Ready', value: 'ready' },
  { label: 'Waiting', value: 'waiting' },
];

type LobbyLocationState = {
  roomClosedMessage?: string;
};

export function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LobbyLocationState | null;
  const [roomClosedMessage, setRoomClosedMessage] = useState<string | null>(
    () => locationState?.roomClosedMessage ?? null
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dismissRoomClosedNotice = () => {
    setRoomClosedMessage(null);
    void navigate('.', { replace: true, state: {} });
  };

  const fetchRooms = async (signal: AbortSignal) => {
    const res = await fetch(`${API_BASE_URL}${listRoomsContract.path}`, {
      method: listRoomsContract.method,
      headers: { Accept: 'application/json' },
      credentials: 'include',
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
    return listRoomsContract.responseSchema.parse(await res.json());
  };

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetchRooms(controller.signal)
        .then((data) => {
          if (!cancelled) {
            setRooms(data);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled && !(err instanceof DOMException && err.name === 'AbortError')) {
            setError(err instanceof Error ? err.message : 'Failed to load rooms');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, []);

  const filtered = rooms.filter((r) => {
    const q = query.toLowerCase();
    const matchesQuery =
      r.name.toLowerCase().includes(q) ||
      (r.movie_name?.toLowerCase().includes(q) ?? false) ||
      (r.description?.toLowerCase().includes(q) ?? false);
    const matchesFilter = filter === 'all' || r.status === filter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="relative min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <StarField />

      <div className="lobby-content relative z-10 flex gap-6 mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <div style={{ flex: 1, minWidth: 0 }}>

        {roomClosedMessage !== null && (
          <RoomClosedLobbyNotice
            message={roomClosedMessage}
            onDismiss={dismissRoomClosedNotice}
          />
        )}

        {/* Hero */}
        <FeaturedRoomHero onCreateRoom={() => { void navigate('/rooms/new'); }} />

        {/* Toolbar */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Row 1 on mobile: search + create button */}
          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1" style={{ maxWidth: 400 }}>
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                className="input w-full text-sm"
                style={{ padding: '8px 12px 8px 34px', minWidth: 220 }}
                type="search"
                placeholder="Search rooms & movies..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); }}
              />
            </div>
          </div>

          {/* Row 2 on mobile: filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_BUTTONS.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => { setFilter(btn.value); }}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
                style={{
                  border: filter === btn.value
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border-medium)',
                  background: filter === btn.value ? 'var(--accent-dim)' : 'transparent',
                  color: filter === btn.value ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div
            className="flex items-center justify-center py-24 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Loading rooms…
          </div>
        ) : error !== null ? (
          <div className="flex items-center justify-center py-24 text-sm text-red-400">
            {error}
          </div>
        ) : filter !== 'all' ? (
          /* Flat grid for filtered view */
          <>
            <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} room{filtered.length !== 1 ? 's' : ''} found
            </p>
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <RoomGrid rooms={filtered} />
            )}
          </>
        ) : (
          /* Status-grouped sections for "All" */
          <>
            {STATUS_SECTIONS.map(({ status, label, emoji }) => {
              const sectionRooms = filtered.filter((r) => r.status === status);
              if (sectionRooms.length === 0) return null;
              return (
                <section key={status} className="mb-10">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-base">{emoji}</span>
                    <h2 className="cinema-section-title">{label}</h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {sectionRooms.length}
                    </span>
                  </div>
                  <RoomGrid rooms={sectionRooms} />
                </section>
              );
            })}

            {filtered.length === 0 && <EmptyState />}
          </>
        )}
      </div>
      </div>
      <ActiveUsersSidebar />
    </div>
  );
}

function RoomGrid({ rooms }: { rooms: RoomResponse[] }) {
  return (
    <div
      className="grid gap-3 sm:gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}
    >
      {rooms.map((room, i) => (
        <div
          key={room.id}
          className="fade-up"
          style={{ animationDelay: `${String(i * 40)}ms` }}
        >
          <CinemaRoomCard room={room} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="mb-3 text-4xl">🎬</span>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        No rooms here yet. Create one and invite friends!
      </p>
    </div>
  );
}
