import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_ROOMS } from '@/data/mock-data';

interface EditableField {
  name: boolean;
  password: boolean;
  movieFile: boolean;
  movieName: boolean;
  movieDescription: boolean;
  isPrivate: boolean;
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

export function EditRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const room = MOCK_ROOMS.find((r) => r.id === id);

  const [form, setForm] = useState({
    name: room?.name ?? '',
    password: '',
    movieFile: null as File | null,
    movieName: room?.movieName ?? '',
    movieDescription: room?.movieDescription ?? '',
    isPrivate: room?.isPrivate ?? false,
  });

  const [editing, setEditing] = useState<EditableField>({
    name: false,
    password: false,
    movieFile: false,
    movieName: false,
    movieDescription: false,
    isPrivate: false,
  });

  const [drafts, setDrafts] = useState({ ...form });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 18 }}>Room not found.</p>
        <button className="btn-primary" onClick={() => { void navigate('/'); }}>Back to Lobby</button>
      </div>
    );
  }

  const startEdit = (field: keyof EditableField) => {
    setDrafts({ ...form });
    setEditing((prev) => ({ ...prev, [field]: true }));
  };

  const saveEdit = (field: keyof EditableField) => {
    setForm({ ...drafts });
    setEditing((prev) => ({ ...prev, [field]: false }));
  };

  const cancelEdit = (field: keyof EditableField) => {
    setDrafts({ ...form });
    setEditing((prev) => ({ ...prev, [field]: false }));
  };

  const handleDeleteConfirmed = () => {
    // In the future: call DELETE API, then navigate
    void navigate('/');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setDrafts((prev) => ({ ...prev, movieFile: file }));
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 16px',
      }}
    >
      <div className="card fade-up" style={{ width: '100%', maxWidth: 560, padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => { void navigate(`/room/${room.id}`); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 20,
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-body)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Room
          </button>
          <h1 className="display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Edit Room
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)' }}>
            Update your room settings. Click the pencil icon to edit a field.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Room name */}
          <EditRow
            label="Room name"
            isEditing={editing.name}
            displayValue={form.name}
            onEdit={() => { startEdit('name'); }}
            onSave={() => { saveEdit('name'); }}
            onCancel={() => { cancelEdit('name'); }}
          >
            <input
              className="input"
              type="text"
              value={drafts.name}
              onChange={(e) => { setDrafts((p) => ({ ...p, name: e.target.value })); }}
              maxLength={60}
              autoFocus
            />
          </EditRow>

          {/* Visibility */}
          <EditRow
            label="Visibility"
            isEditing={editing.isPrivate}
            displayValue={form.isPrivate ? '🔒 Private' : '🌐 Public'}
            onEdit={() => { startEdit('isPrivate'); }}
            onSave={() => { saveEdit('isPrivate'); }}
            onCancel={() => { cancelEdit('isPrivate'); }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              {(['public', 'private'] as const).map((v) => {
                const isActive = v === 'private' ? drafts.isPrivate : !drafts.isPrivate;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setDrafts((p) => ({ ...p, isPrivate: v === 'private' })); }}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-medium)',
                      borderRadius: 8,
                      background: isActive ? 'var(--accent-dim)' : 'var(--bg-input)',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                    }}
                  >
                    {v === 'public' ? '🌐 Public' : '🔒 Private'}
                  </button>
                );
              })}
            </div>
          </EditRow>

          {/* Password */}
          <EditRow
            label="Password"
            isEditing={editing.password}
            displayValue={form.password ? '••••••••' : 'Not set'}
            onEdit={() => { startEdit('password'); }}
            onSave={() => { saveEdit('password'); }}
            onCancel={() => { cancelEdit('password'); }}
          >
            <input
              className="input"
              type="password"
              placeholder="Enter a new password"
              value={drafts.password}
              onChange={(e) => { setDrafts((p) => ({ ...p, password: e.target.value })); }}
              maxLength={64}
              autoFocus
            />
          </EditRow>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Movie file */}
          <EditRow
            label="Movie file"
            isEditing={editing.movieFile}
            displayValue={form.movieFile ? form.movieFile.name : 'No file uploaded'}
            onEdit={() => { startEdit('movieFile'); }}
            onSave={() => { saveEdit('movieFile'); }}
            onCancel={() => { cancelEdit('movieFile'); }}
          >
            <div
              onClick={() => { fileInputRef.current?.click(); }}
              style={{
                padding: '16px',
                border: '2px dashed var(--border-medium)',
                borderRadius: 10,
                cursor: 'pointer',
                textAlign: 'center',
                background: drafts.movieFile ? 'var(--accent-dim)' : 'transparent',
                borderColor: drafts.movieFile ? 'var(--accent)' : 'var(--border-medium)',
                transition: 'all 200ms ease',
              }}
            >
              <p style={{ fontSize: 13, color: drafts.movieFile ? 'var(--text-primary)' : 'var(--text-muted)', margin: 0 }}>
                {drafts.movieFile ? `${drafts.movieFile.name} (${(drafts.movieFile.size / 1024 / 1024).toFixed(1)} MB)` : 'Click to upload a new video'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              aria-label="Upload movie file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </EditRow>

          {/* Movie name */}
          <EditRow
            label="Movie name"
            isEditing={editing.movieName}
            displayValue={form.movieName}
            onEdit={() => { startEdit('movieName'); }}
            onSave={() => { saveEdit('movieName'); }}
            onCancel={() => { cancelEdit('movieName'); }}
          >
            <input
              className="input"
              type="text"
              value={drafts.movieName}
              onChange={(e) => { setDrafts((p) => ({ ...p, movieName: e.target.value })); }}
              maxLength={120}
              autoFocus
            />
          </EditRow>

          {/* Movie description */}
          <EditRow
            label="Movie description"
            isEditing={editing.movieDescription}
            displayValue={form.movieDescription || 'No description'}
            onEdit={() => { startEdit('movieDescription'); }}
            onSave={() => { saveEdit('movieDescription'); }}
            onCancel={() => { cancelEdit('movieDescription'); }}
          >
            <textarea
              className="input"
              value={drafts.movieDescription}
              onChange={(e) => { setDrafts((p) => ({ ...p, movieDescription: e.target.value })); }}
              maxLength={400}
              rows={3}
              autoFocus
            />
          </EditRow>

          {/* Delete section */}
          <div
            style={{
              marginTop: 16,
              padding: '20px',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.04)',
            }}
          >
            <h4
              style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#f87171' }}
            >
              Danger zone
            </h4>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
              Permanently delete this room and remove all participants. This cannot be undone.
            </p>
            {showDeleteConfirm ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-danger"
                  onClick={handleDeleteConfirmed}
                  style={{ flex: 1 }}
                >
                  <TrashIcon />
                  Yes, delete room
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => { setShowDeleteConfirm(false); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn-danger"
                onClick={() => { setShowDeleteConfirm(true); }}
              >
                <TrashIcon />
                Delete Room
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditRow({
  label,
  isEditing,
  displayValue,
  onEdit,
  onSave,
  onCancel,
  children,
}: {
  label: string;
  isEditing: boolean;
  displayValue: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 10,
        border: isEditing ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
        background: isEditing ? 'rgba(124,58,237,0.04)' : 'var(--bg-elevated)',
        transition: 'border-color 200ms ease, background 200ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: isEditing ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
            }}
          >
            {label}
          </p>
          {isEditing ? (
            <div style={{ marginTop: 8 }}>{children}</div>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: displayValue === 'No description' || displayValue === 'Not set' || displayValue === 'No file uploaded'
                  ? 'var(--text-muted)'
                  : 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayValue}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: isEditing ? 2 : 0 }}>
          {isEditing ? (
            <>
              <IconButton
                onClick={onSave}
                title="Save"
                color="var(--accent-hover)"
                hoverBg="var(--accent-dim)"
              >
                <CheckIcon />
              </IconButton>
              <IconButton
                onClick={onCancel}
                title="Cancel"
                color="var(--text-muted)"
                hoverBg="var(--border-subtle)"
              >
                <XIcon />
              </IconButton>
            </>
          ) : (
            <IconButton
              onClick={onEdit}
              title={`Edit ${label}`}
              color="var(--text-muted)"
              hoverBg="var(--border-subtle)"
            >
              <PencilIcon />
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  title,
  color,
  hoverBg,
  children,
}: {
  onClick: () => void;
  title: string;
  color: string;
  hoverBg: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); }}
      onMouseLeave={() => { setHovered(false); }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 7,
        border: '1px solid var(--border-medium)',
        background: hovered ? hoverBg : 'transparent',
        color,
        cursor: 'pointer',
        transition: 'all 150ms ease',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
