import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { listRoomsContract } from '@repo/contracts/rooms';
import { API_BASE_URL } from '@repo/consts/api';
import { RoomCard } from '@/components/room-card';
import { StarField } from '@/components/star-field';
import type { RoomResponse, RoomStatus } from '@/types/room';

const REFRESH_INTERVAL_MS = 5_000;

type FilterStatus = RoomStatus | 'all';

export function Lobby() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    const matchesQuery =
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      (r.movie_name?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
      (r.description?.toLowerCase().includes(query.toLowerCase()) ?? false);
    const matchesFilter = filter === 'all' || r.status === filter;
    return matchesQuery && matchesFilter;
  });

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Watching', value: 'watching' },
    { label: 'Preparing', value: 'preparing' },
    { label: 'Ready', value: 'ready' },
  ];

  return (
    <>
      <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)' }}>
        {/* Hero */}
        <StarField />

        {/* Main content */}
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px 48px',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            <h2
              className="display"
              style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}
            >
              Rooms
            </h2>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                void navigate('/rooms/new');
              }}
            >
              + Create a room
            </button>
          </div>

          {/* Search + filters */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 28,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {/* Search input */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              >
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                className="input"
                type="search"
                placeholder="Search rooms or movies…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                style={{ paddingLeft: 36 }}
              />
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {filterButtons.map((btn) => (
                <button
                  type="button"
                  key={btn.value}
                  onClick={() => {
                    setFilter(btn.value);
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    border:
                      filter === btn.value
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border-medium)',
                    background: filter === btn.value ? 'var(--accent-dim)' : 'transparent',
                    color: filter === btn.value ? 'var(--accent-hover)' : 'var(--text-muted)',
                    transition: 'all 200ms ease',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Room grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--text-muted)', fontSize: 15 }}>
              Loading rooms…
            </div>
          ) : error !== null ? (
            <div style={{ textAlign: 'center', padding: '64px 16px', color: '#f87171', fontSize: 15 }}>
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 16px',
                color: 'var(--text-muted)',
                fontSize: 15,
              }}
            >
              <p style={{ fontSize: 32, marginBottom: 12 }}>🎬</p>
              <p>No rooms found. Try a different search or create one!</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}
            >
              {filtered.map((room, i) => (
                <div
                  key={room.id}
                  className="fade-up"
                  style={{ animationDelay: `${String(i * 50)}ms` }}
                >
                  <RoomCard room={room} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
