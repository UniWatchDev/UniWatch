import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { PublicProfile } from '@repo/schemas/profile';
import type { FriendPresence } from '@repo/schemas/realtime';

import { PresetAvatar } from '@/components/preset-avatar';
import { apiSearchUsers } from '@/friends/friend-api';
import { useFriendContext } from '@/friends/use-friend-context';

function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: isOnline ? '#4ade80' : '#475569',
        flexShrink: 0,
        display: 'inline-block'
      }}
      aria-hidden
    />
  );
}

function FriendRow({ friend, onDm }: { friend: FriendPresence; onDm: (id: string) => void }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid var(--border-subtle)'
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <PresetAvatar avatarId={friend.avatarId} size={34} />
        <OnlineDot isOnline={friend.isOnline} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {friend.userName}
        </p>
        {friend.currentRoomName !== undefined ? (
          <button
            type="button"
            onClick={() => {
              if (friend.currentRoomId !== undefined) {
                void navigate(`/room/${friend.currentRoomId}`);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--accent)',
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}
          >
            In {friend.currentRoomName}
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
            {friend.isOnline ? 'Online' : 'Offline'}
          </p>
        )}
      </div>
      <button
        type="button"
        title="Message"
        onClick={() => { onDm(friend.userId); }}
        style={{
          background: 'none',
          border: '1px solid var(--border-medium)',
          borderRadius: 6,
          padding: '4px 8px',
          color: 'var(--text-muted)',
          fontSize: 12,
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        💬
      </button>
    </div>
  );
}

function SearchResult({ profile, onSent }: { profile: PublicProfile; onSent: () => void }) {
  const { friends, sendFriendRequest, addFriendLocally } = useFriendContext();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const isFriend = friends.some((f) => f.userId === profile.userId);

  const send = useCallback(async () => {
    setState('sending');
    try {
      await sendFriendRequest(profile.userId);
      addFriendLocally(profile);
      setState('sent');
      onSent();
    } catch {
      setState('error');
    }
  }, [addFriendLocally, onSent, profile, sendFriendRequest]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid var(--border-subtle)'
      }}
    >
      <PresetAvatar avatarId={profile.avatarId} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {profile.userName}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
          {profile.firstName}
        </p>
      </div>
      {isFriend ? (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Friends</span>
      ) : state === 'sent' ? (
        <span style={{ fontSize: 11, color: '#4ade80' }}>Sent!</span>
      ) : state === 'error' ? (
        <span style={{ fontSize: 11, color: 'var(--coral)' }}>Error</span>
      ) : (
        <button
          type="button"
          className="btn-primary"
          style={{ padding: '4px 10px', fontSize: 12 }}
          disabled={state === 'sending'}
          onClick={() => { void send(); }}
        >
          {state === 'sending' ? '…' : 'Add'}
        </button>
      )}
    </div>
  );
}

export function LobbyFriendSidebar() {
  const { friends, pendingRequests, openDm, respondToRequest } = useFriendContext();
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onlineFirst = [...friends].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return 0;
  });

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
      {/* Search bar */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="input w-full"
          style={{ padding: '8px 12px', fontSize: 13 }}
          type="search"
          placeholder="Find users..."
          value={searchQ}
          onChange={(e) => { handleSearchChange(e.target.value); }}
        />
        {searchQ.trim().length >= 2 && (
          <div style={{ marginTop: 8 }}>
            {searching && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Searching…</p>
            )}
            {!searching && searchResults.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No users found</p>
            )}
            {searchResults.map((p) => (
              <SearchResult
                key={p.userId}
                profile={p}
                onSent={() => {
                  setSearchQ('');
                  setSearchResults([]);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)'
            }}
          >
            Requests ({pendingRequests.length})
          </h3>
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

      {/* Friends list */}
      <div>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)'
          }}
        >
          Friends ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Search for users above to add friends.
          </p>
        ) : (
          onlineFirst.map((f) => (
            <FriendRow key={f.userId} friend={f} onDm={openDm} />
          ))
        )}
      </div>
    </aside>
  );
}

