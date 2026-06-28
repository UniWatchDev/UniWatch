import { useCallback, useRef, useState } from 'react';

import type { ActiveUser } from '@repo/schemas/profile';

import { PresetAvatar } from '@/components/preset-avatar';
import { useCookieAuth } from '@/auth/use-cookie-auth';
import { apiSearchUsers } from '@/friends/friend-api';
import { useFriendContext } from '@/friends/use-friend-context';
import { ActiveUserRow } from '@/lobby/active-user-row';
import { useActiveUsers } from '@/lobby/use-active-users';

type FilterMode = 'all' | 'in-room';

function SectionHeader({ label }: { label: string }) {
  return (
    <h3
      style={{
        margin: '12px 0 4px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)'
      }}
    >
      {label}
    </h3>
  );
}

export function ActiveUsersSidebar() {
  const { sessionUser } = useCookieAuth();
  const { pendingRequests, respondToRequest, socketConnected } = useFriendContext();
  const { users, loading } = useActiveUsers(socketConnected);
  const selfUserId = sessionUser?.userId;

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<ActiveUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQ(q);
    if (searchTimeout.current !== null) clearTimeout(searchTimeout.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(() => {
      apiSearchUsers(q.trim())
        .then((results) => {
          setSearchResults(results);
        })
        .catch(() => {
          setSearchResults([]);
        })
        .finally(() => {
          setSearching(false);
        });
    }, 350);
  }, []);

  const friends = users.filter((u) => u.friendshipStatus === 'friend');
  const strangers = users.filter((u) => u.friendshipStatus !== 'friend');

  const applyFilter = (list: ActiveUser[]) =>
    filter === 'in-room' ? list.filter((u) => u.currentRoom !== null) : list;

  const visibleFriends = applyFilter(friends);
  const visibleStrangers = applyFilter(strangers);
  const totalOnline = users.length;

  const showList = searchQ.trim().length < 2;

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        borderLeft: '1px solid var(--border-subtle)',
        padding: '0 0 0 16px',
        maxHeight: 'calc(100dvh - 140px)',
        overflowY: 'auto'
      }}
      className="soft-scroll"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12
        }}
      >
        <span
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}
        >
          Active Users
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-muted)',
            borderRadius: 10,
            padding: '2px 8px',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {totalOnline} online
        </span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          className="input w-full"
          style={{ padding: '8px 12px', fontSize: 13 }}
          type="search"
          placeholder="Find users…"
          value={searchQ}
          onChange={(e) => { handleSearchChange(e.target.value); }}
        />
        {searchQ.trim().length >= 2 && (
          <div style={{ marginTop: 8 }}>
            {searching && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Searching…
              </p>
            )}
            {!searching && searchResults.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                No users found
              </p>
            )}
            {searchResults.map((u) => (
              <ActiveUserRow key={u.userId} user={u} isSelf={u.userId === selfUserId} />
            ))}
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <SectionHeader label={`Requests (${String(pendingRequests.length)})`} />
          {pendingRequests.map((req) => (
            <div
              key={req.requestId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <PresetAvatar avatarId={req.fromAvatarId} size={30} />
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {req.fromUserName}
              </p>
              <button
                type="button"
                title="Accept"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16
                }}
                onClick={() => { void respondToRequest(req.requestId, 'accept'); }}
              >
                ✓
              </button>
              <button
                type="button"
                title="Decline"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16
                }}
                onClick={() => { void respondToRequest(req.requestId, 'reject'); }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      {showList && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {(['all', 'in-room'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setFilter(mode); }}
              style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 12,
                border: '1px solid var(--border-medium)',
                background: filter === mode ? 'var(--accent)' : 'transparent',
                color: filter === mode ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: filter === mode ? 700 : 400
              }}
            >
              {mode === 'all' ? 'All' : 'In a room'}
            </button>
          ))}
        </div>
      )}

      {/* Active users list */}
      {showList && (
        <>
          {loading && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Loading…
            </p>
          )}

          {!loading && visibleFriends.length > 0 && (
            <>
              <SectionHeader label="Friends" />
              {visibleFriends.map((u) => (
                <ActiveUserRow key={u.userId} user={u} isSelf={u.userId === selfUserId} />
              ))}
            </>
          )}

          {!loading && visibleStrangers.length > 0 && (
            <>
              <SectionHeader label="People" />
              {visibleStrangers.map((u) => (
                <ActiveUserRow key={u.userId} user={u} isSelf={u.userId === selfUserId} />
              ))}
            </>
          )}

          {!loading && visibleFriends.length === 0 && visibleStrangers.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0' }}>
              {filter === 'in-room'
                ? 'No one is in a room right now.'
                : 'No one is online right now.'}
            </p>
          )}
        </>
      )}
    </aside>
  );
}
