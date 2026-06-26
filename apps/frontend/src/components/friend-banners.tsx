import { useNavigate } from 'react-router-dom';

import { PresetAvatar } from '@/components/preset-avatar';
import { useFriendContext } from '@/friends/use-friend-context';

export function FriendBanners() {
  const { banner, dismissBanner, openDm, respondToRequest } = useFriendContext();
  const navigate = useNavigate();

  if (banner === null) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 340,
        width: '100%',
        pointerEvents: 'auto'
      }}
    >
      <div
        className="card fade-up"
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          borderLeft: '3px solid var(--accent)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)'
        }}
      >
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          {banner.kind === 'request-received' && (
            <PresetAvatar avatarId={banner.fromAvatarId} size={40} />
          )}
          {banner.kind === 'request-accepted' && (
            <PresetAvatar avatarId={banner.friendAvatarId} size={40} />
          )}
          {banner.kind === 'joined-room' && (
            <span style={{ fontSize: 24 }}>🎬</span>
          )}
          {banner.kind === 'dm' && (
            <span style={{ fontSize: 24 }}>💬</span>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {banner.kind === 'request-received' && (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Friend request
              </p>
              <p style={{ margin: '2px 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                <strong>{banner.fromUserName}</strong> wants to be friends
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={() => {
                    void respondToRequest(banner.requestId, 'accept');
                    dismissBanner();
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={() => {
                    void respondToRequest(banner.requestId, 'reject');
                    dismissBanner();
                  }}
                >
                  Decline
                </button>
              </div>
            </>
          )}

          {banner.kind === 'request-accepted' && (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                New friend!
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                You and <strong>{banner.friendUserName}</strong> are now friends
              </p>
            </>
          )}

          {banner.kind === 'joined-room' && (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {banner.friendUserName} joined a room
              </p>
              <p style={{ margin: '2px 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                Watching in <em>{banner.roomName}</em>
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={() => {
                  void navigate(`/room/${banner.roomId}`);
                  dismissBanner();
                }}
              >
                Join them
              </button>
            </>
          )}

          {banner.kind === 'dm' && (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {banner.fromUserName}
              </p>
              <p
                style={{
                  margin: '2px 0 10px',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {banner.content}
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={() => {
                  openDm(banner.fromUserId);
                  dismissBanner();
                }}
              >
                Reply
              </button>
            </>
          )}
        </div>

        {/* Dismiss */}
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={dismissBanner}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: 0
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
