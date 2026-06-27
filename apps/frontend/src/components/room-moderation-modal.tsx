import { useEffect } from 'react';

export type RoomModerationAction = 'kick' | 'block';

interface RoomModerationModalProps {
  readonly open: boolean;
  readonly action: RoomModerationAction;
  readonly memberName: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function RoomModerationModal({
  open,
  action,
  memberName,
  onCancel,
  onConfirm
}: RoomModerationModalProps) {
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

  const isKick = action === 'kick';
  const title = isKick ? 'Kick from room?' : 'Ban from room?';
  const description = isKick
    ? `Remove ${memberName} from this room? They can rejoin with the room link.`
    : `Ban ${memberName} from this room? They cannot rejoin until you unblock them.`;
  const confirmLabel = isKick ? 'Kick user' : 'Ban user';

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-moderation-title"
      aria-describedby="room-moderation-description"
      onClick={onCancel}
    >
      <div
        className="card fade-up"
        style={{ maxWidth: 440, width: '100%', padding: 24 }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2
          id="room-moderation-title"
          className="display"
          style={{ margin: '0 0 12px', fontSize: 20, color: 'var(--text-primary)' }}
        >
          {title}
        </h2>

        <p
          id="room-moderation-description"
          style={{ margin: '0 0 20px', color: 'var(--text-secondary)', lineHeight: 1.5 }}
        >
          {description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={isKick ? 'btn-primary' : 'btn-danger'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
