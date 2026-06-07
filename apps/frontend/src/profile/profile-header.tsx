import { UserAvatar } from '@/components/user-avatar';
import type { ProfileIdentity } from '@/types/profile';

export interface ProfileHeaderProps {
  readonly identity: ProfileIdentity;
  readonly canEdit: boolean;
  readonly onEdit: () => void;
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProfileHeader({ identity, canEdit, onEdit }: ProfileHeaderProps) {
  return (
    <section className="card profile-header-card" style={{ overflow: 'hidden', padding: 0 }}>
      <div className="profile-banner-gradient" style={{ height: 120, position: 'relative' }}>
        {canEdit ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={onEdit}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: '6px 12px',
              fontSize: 13,
              background: 'rgba(0,0,0,0.35)',
              borderColor: 'var(--border-medium)'
            }}
          >
            <PencilIcon />
            Edit profile
          </button>
        ) : null}
      </div>
      <div style={{ padding: '0 24px 24px', marginTop: -48, position: 'relative' }}>
        <UserAvatar
          name={identity.displayName}
          avatarColor={identity.avatarColor}
          avatarId={identity.avatarId}
          size={96}
          ring
        />
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1
              className="display"
              style={{ margin: 0, fontSize: 28, color: 'var(--text-primary)' }}
              title={identity.email}
            >
              {identity.displayName}
            </h1>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: 'var(--accent-dim)',
                color: 'var(--accent-hover)',
                border: '1px solid rgba(245, 158, 11, 0.35)'
              }}
            >
              {identity.badge}
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-secondary)' }}>
            {identity.handle}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Member since {identity.memberSince}
          </p>
        </div>
      </div>
    </section>
  );
}
