import { Link } from 'react-router-dom';

export interface EditProfileModalProps {
  readonly onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        className="card fade-up"
        style={{ maxWidth: 420, width: '100%', padding: 24 }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
      >
        <h2
          id="edit-profile-title"
          className="display"
          style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--text-primary)' }}
        >
          Edit profile
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
          Profile editing is coming soon. You can update your password in the meantime.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/change-password" className="btn-primary" style={{ textDecoration: 'none' }}>
            Change password
          </Link>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
