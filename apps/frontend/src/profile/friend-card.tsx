import { UserAvatar } from '@/components/user-avatar';
import type { ProfileFriend } from '@/types/profile';

export interface FriendCardProps {
  readonly friend: ProfileFriend;
  readonly canRemove: boolean;
  readonly onRemove: (id: string) => void;
}

function statusLabel(status: ProfileFriend['status']): string {
  if (status === 'active') return 'Active';
  if (status === 'away') return 'Away';
  return 'Offline';
}

function statusColor(status: ProfileFriend['status']): string {
  if (status === 'active') return '#4ade80';
  if (status === 'away') return '#fbbf24';
  return '#64748b';
}

export function FriendCard({ friend, canRemove, onRemove }: FriendCardProps) {
  return (
    <article
      className="card"
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center'
      }}
    >
      <UserAvatar name={friend.name} avatarColor={friend.avatarColor} size={64} />
      <div>
        <p className="display" style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>
          {friend.name}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          @{friend.username}
        </p>
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor(friend.status)
          }}
        />
        {statusLabel(friend.status)}
      </span>
      {canRemove ? (
        <button
          type="button"
          className="btn-danger"
          style={{ width: '100%', padding: '8px 16px', fontSize: 13 }}
          onClick={() => {
            onRemove(friend.id);
          }}
        >
          Remove
        </button>
      ) : null}
    </article>
  );
}
