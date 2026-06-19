import { useEffect } from 'react';

import type { Member } from '@/types/room';

interface ForcePlayConfirmationModalProps {
  readonly open: boolean;
  readonly currentUserId: string | null;
  readonly unreadyMembers: ReadonlyArray<Member>;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

function memberLabel(member: Member, currentUserId: string | null): string {
  return member.id === currentUserId ? 'You' : member.name;
}

export function ForcePlayConfirmationModal({
  open,
  currentUserId,
  unreadyMembers,
  onCancel,
  onConfirm
}: ForcePlayConfirmationModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const unreadyCount = unreadyMembers.length;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-play-title"
      aria-describedby="force-play-description"
      onClick={onCancel}
    >
      <div
        className="card fade-up soft-scroll"
        style={{ maxWidth: 520, width: '100%', padding: 24, maxHeight: 'min(90dvh, 640px)', overflowY: 'auto' }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2
          id="force-play-title"
          className="display"
          style={{ margin: '0 0 12px', fontSize: 20, color: 'var(--text-primary)' }}
        >
          Force play anyway?
        </h2>

        <p id="force-play-description" style={{ margin: '0 0 16px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {unreadyCount === 1
            ? 'One viewer is still not ready. If you continue, the movie will start for everyone.'
            : `${String(unreadyCount)} viewers are still not ready. If you continue, the movie will start for everyone.`}
        </p>

        <div style={{ marginBottom: 18 }}>
          <p className="mono" style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-muted)' }}>
            Not ready
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {unreadyMembers.map((member) => (
              <li key={member.id}>{memberLabel(member, currentUserId)}</li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Force play
          </button>
        </div>
      </div>
    </div>
  );
}
