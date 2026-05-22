import { FriendCard } from '@/profile/friend-card';
import type { ProfileFriend } from '@/types/profile';

export interface FriendsPanelProps {
  readonly friends: ProfileFriend[];
  readonly onRemove: (id: string) => void;
}

export function FriendsPanel({ friends, onRemove }: FriendsPanelProps) {
  if (friends.length === 0) {
    return (
      <p style={{ margin: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        No friends yet. Accept a request to get started.
      </p>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 16,
        padding: 20
      }}
    >
      {friends.map((friend) => (
        <FriendCard key={friend.id} friend={friend} onRemove={onRemove} />
      ))}
    </div>
  );
}
