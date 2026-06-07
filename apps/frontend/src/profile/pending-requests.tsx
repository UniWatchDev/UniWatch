import { UserAvatar } from '@/components/user-avatar';
import type { FriendRequest } from '@/types/profile';

export interface PendingRequestsProps {
  readonly requests: FriendRequest[];
  readonly onAccept: (id: string) => void;
  readonly onDecline: (id: string) => void;
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PendingRequests({ requests, onAccept, onDecline }: PendingRequestsProps) {
  if (requests.length === 0) return null;

  return (
    <section className="card" style={{ marginTop: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <BellIcon />
        <h2 className="display" style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
          {requests.length} pending friend request{requests.length === 1 ? '' : 's'}
        </h2>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requests.map((request) => (
          <li
            key={request.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              padding: '12px 0',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <UserAvatar name={request.name} avatarColor={request.avatarColor} size={40} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{request.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  @{request.username}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: 13 }}
                onClick={() => {
                  onAccept(request.id);
                }}
              >
                Accept
              </button>
              <button
                type="button"
                className="btn-danger"
                style={{ padding: '8px 16px', fontSize: 13 }}
                onClick={() => {
                  onDecline(request.id);
                }}
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
