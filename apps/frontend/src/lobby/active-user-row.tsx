import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ActiveUser } from '@repo/schemas/profile';

import { PresetAvatar } from '@/components/preset-avatar';
import { useFriendContext } from '@/friends/use-friend-context';

type Props = {
  user: ActiveUser;
};

export function ActiveUserRow({ user }: Props) {
  const navigate = useNavigate();
  const { openDm, sendFriendRequest } = useFriendContext();
  const [addState, setAddState] = useState<'idle' | 'sending' | 'error'>('idle');

  const handleAdd = useCallback(() => {
    if (addState !== 'idle') return;
    setAddState('sending');
    sendFriendRequest(user.userId)
      .then(() => undefined)
      .catch(() => {
        setAddState('error');
      });
  }, [addState, sendFriendRequest, user.userId]);

  const handleJoin = useCallback(() => {
    if (user.currentRoom !== null) {
      void navigate(`/room/${user.currentRoom.roomId}`);
    }
  }, [navigate, user.currentRoom]);

  const isPendingSent =
    user.friendshipStatus === 'pending_sent' || addState === 'sending';

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
      <div style={{ flexShrink: 0 }}>
        <PresetAvatar avatarId={user.avatarId} size={34} />
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
          {user.firstName}{' '}
          <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
            @{user.userName}
          </span>
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
            flexWrap: 'wrap'
          }}
        >
          {user.friendshipStatus === 'none' && user.mutualFriendsCount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {user.mutualFriendsCount} mutual
            </span>
          )}
          {user.currentRoom !== null && (
            <button
              type="button"
              onClick={handleJoin}
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
              🎬 {user.currentRoom.roomName}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {user.currentRoom?.roomType === 'public' && (
          <button
            type="button"
            onClick={handleJoin}
            style={{
              background: 'none',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              padding: '3px 7px',
              color: 'var(--accent)',
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            Join
          </button>
        )}

        {user.friendshipStatus === 'friend' ? (
          <button
            type="button"
            title="Message"
            onClick={() => { openDm(user.userId); }}
            style={{
              background: 'none',
              border: '1px solid var(--border-medium)',
              borderRadius: 6,
              padding: '4px 8px',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            💬
          </button>
        ) : isPendingSent ? (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              padding: '4px 8px'
            }}
          >
            Pending…
          </span>
        ) : addState === 'error' ? (
          <span style={{ fontSize: 11, color: 'var(--coral)', padding: '4px 8px' }}>
            Error
          </span>
        ) : (
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={handleAdd}
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
}
