import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRoomContract, updateRoomContract, deleteRoomContract } from '@repo/contracts/rooms';
import { getAuthMeContract } from '@repo/contracts/auth';
import { API_BASE_URL } from '@repo/consts/api';
import type { RoomResponse } from '@repo/schemas/rooms';

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

type EditableField = 'name' | 'password' | 'movieFile' | 'movieName' | 'movieDescription' | 'isPrivate';

interface DraftState {
  name: string;
  password: string;
  movieFile: File | null;
  movieName: string;
  movieDescription: string;
  isPrivate: boolean;
}

async function fetchRoom(id: string): Promise<RoomResponse> {
  const path = getRoomContract.path.replace(':id', encodeURIComponent(id));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
  return getRoomContract.responseSchema.parse(await res.json());
}

async function fetchCurrentUserId(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${getAuthMeContract.path}`, {
      headers: { Accept: 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) return null;
    const me = getAuthMeContract.responseSchema.parse(await res.json());
    return me.userId;
  } catch {
    return null;
  }
}

export function EditRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [drafts, setDrafts] = useState<DraftState>({
    name: '',
    password: '',
    movieFile: null,
    movieName: '',
    movieDescription: '',
    isPrivate: false,
  });
  const [editing, setEditing] = useState<Record<EditableField, boolean>>({
    name: false,
    password: false,
    movieFile: false,
    movieName: false,
    movieDescription: false,
    isPrivate: false,
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([fetchRoom(id), fetchCurrentUserId()])
      .then(([r, userId]) => {
        if (cancelled) return;
        setRoom(r);
        setCurrentUserId(userId);
        setDrafts({
          name: r.name,
          password: '',
          movieFile: null,
          movieName: r.movie_name ?? '',
          movieDescription: r.movie_description ?? '',
          isPrivate: r.room_type === 'private',
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load room');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!loading && room && currentUserId !== null && currentUserId !== room.creator) {
      void navigate(`/room/${room.id}`, { replace: true });
    }
  }, [loading, room, currentUserId, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (loadError || !room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 18 }}>{loadError ?? 'Room not found.'}</p>
        <button className="btn-primary" onClick={() => { void navigate('/rooms'); }}>Back to Lobby</button>
      </div>
    );
  }

  const isOwner = currentUserId !== null && currentUserId === room.creator;

  const startEdit = (field: EditableField) => {
    setEditing((prev) => ({ ...prev, [field]: true }));
    setApiError(null);
  };

  const cancelEdit = (field: EditableField) => {
    setEditing((prev) => ({ ...prev, [field]: false }));
    setDrafts((prev) => ({
      ...prev,
      name: room.name,
      movieName: room.movie_name ?? '',
      movieDescription: room.movie_description ?? '',
      isPrivate: room.room_type === 'private',
      password: '',
    }));
  };

  const saveField = async (field: EditableField) => {
    if (!id) return;
    setSaving(true);
    setApiError(null);
    try {
      const path = updateRoomContract.path.replace(':id', encodeURIComponent(id));
      let patchBody: Record<string, unknown> = {};
      if (field === 'name') patchBody = { name: drafts.name };
      else if (field === 'isPrivate') {
        if (drafts.isPrivate && !room.password && !drafts.password.trim()) {
          setApiError('A password is required before making a room private.');
          setSaving(false);
          return;
        }
        patchBody = {
          room_type: drafts.isPrivate ? 'private' : 'public',
          ...(drafts.isPrivate && drafts.password.trim() ? { password: drafts.password.trim() } : {}),
        };
      }
      else if (field === 'password') {
        if (!drafts.password.trim()) {
          setApiError('Password cannot be empty for a private room.');
          setSaving(false);
          return;
        }
        patchBody = { password: drafts.password };
      }
      else if (field === 'movieName') patchBody = { movie_name: drafts.movieName || null };
      else if (field === 'movieDescription') patchBody = { movie_description: drafts.movieDescription || null };

      const body = updateRoomContract.bodySchema.parse(patchBody);
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: updateRoomContract.method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${String(res.status)}: ${text}`);
      }
      const updated = updateRoomContract.responseSchema.parse(await res.json());
      setRoom(updated);
      setEditing((prev) => ({ ...prev, [field]: false }));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!id) return;
    setDeleting(true);
    setApiError(null);
    try {
      const path = deleteRoomContract.path.replace(':id', encodeURIComponent(id));
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: deleteRoomContract.method,
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${String(res.status)}: ${text}`);
      }
      void navigate('/rooms');
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to delete room');
      setDeleting(false);
    }
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
            {isOwner
              ? 'Update your room settings. Click the pencil icon to edit a field.'
              : 'You can view this room\'s settings, but only the owner can edit them.'}
          </p>
        </div>

        {apiError && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              fontSize: 13,
              color: '#f87171',
            }}
          >
            {apiError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Room name */}
          <EditRow
            label="Room name"
            isEditing={editing.name}
            displayValue={room.name}
            canEdit={isOwner}
            saving={saving}
            onEdit={() => { startEdit('name'); }}
            onSave={() => { void saveField('name'); }}
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
            displayValue={room.room_type === 'private' ? '🔒 Private' : '🌐 Public'}
            canEdit={isOwner}
            saving={saving}
            onEdit={() => { startEdit('isPrivate'); }}
            onSave={() => { void saveField('isPrivate'); }}
            onCancel={() => { cancelEdit('isPrivate'); }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              {drafts.isPrivate && !room.password && (
                <input
                  className="input"
                  type="password"
                  placeholder="Set a password (required for private rooms)"
                  value={drafts.password}
                  onChange={(e) => { setDrafts((p) => ({ ...p, password: e.target.value })); }}
                  maxLength={64}
                  autoComplete="new-password"
                />
              )}
            </div>
          </EditRow>

          {/* Password - only for private rooms */}
          {room.room_type === 'private' && <EditRow
            label="Password"
            isEditing={editing.password}
            displayValue={room.password != null ? 'Password set' : 'No password'}
            canEdit={isOwner}
            saving={saving}
            onEdit={() => { startEdit('password'); }}
            onSave={() => { void saveField('password'); }}
            onCancel={() => { cancelEdit('password'); }}
          >
            <input
              className="input"
              type="password"
              placeholder="Enter a new password"
              value={drafts.password}
              onChange={(e) => { setDrafts((p) => ({ ...p, password: e.target.value })); }}
              maxLength={64}
              autoComplete="new-password"
              autoFocus
            />
          </EditRow>}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Movie file */}
          <EditRow
            label="Movie file"
            isEditing={editing.movieFile}
            displayValue={drafts.movieFile ? drafts.movieFile.name : 'No file uploaded'}
            canEdit={isOwner}
            saving={saving}
            onEdit={() => { startEdit('movieFile'); }}
            onSave={() => { setEditing((p) => ({ ...p, movieFile: false })); }}
            onCancel={() => { setEditing((p) => ({ ...p, movieFile: false })); setDrafts((p) => ({ ...p, movieFile: null })); }}
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
                {drafts.movieFile
                  ? `${drafts.movieFile.name} (${(drafts.movieFile.size / 1024 / 1024).toFixed(1)} MB)`
                  : 'Click to upload a new video'}
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
            displayValue={room.movie_name ?? 'No movie set'}
            canEdit={isOwner}
            saving={saving}
            onEdit={() => { startEdit('movieName'); }}
            onSave={() => { void saveField('movieName'); }}
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
            displayValue={room.movie_description ?? 'No description'}
            canEdit={isOwner}
            saving={saving}
            onEdit={() => { startEdit('movieDescription'); }}
            onSave={() => { void saveField('movieDescription'); }}
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

          {/* Danger zone - owner only */}
          {isOwner && (
            <div
              style={{
                marginTop: 16,
                padding: '20px',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.04)',
              }}
            >
              <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#f87171' }}>
                Danger zone
              </h4>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                Permanently delete this room and remove all participants. This cannot be undone.
              </p>
              {showDeleteConfirm ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-danger"
                    onClick={() => { void handleDeleteConfirmed(); }}
                    disabled={deleting}
                    style={{ flex: 1, opacity: deleting ? 0.7 : 1 }}
                  >
                    <TrashIcon />
                    {deleting ? 'Deleting…' : 'Yes, delete room'}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => { setShowDeleteConfirm(false); }}
                    disabled={deleting}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="btn-danger" onClick={() => { setShowDeleteConfirm(true); }}>
                  <TrashIcon />
                  Delete Room
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditRow({
  label,
  isEditing,
  displayValue,
  canEdit,
  saving,
  onEdit,
  onSave,
  onCancel,
  children,
}: {
  label: string;
  isEditing: boolean;
  displayValue: string;
  canEdit: boolean;
  saving: boolean;
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
                color:
                  displayValue === 'No description' ||
                  displayValue === 'Not set' ||
                  displayValue === 'No file uploaded' ||
                  displayValue === 'No movie set'
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

        {canEdit && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: isEditing ? 2 : 0 }}>
            {isEditing ? (
              <>
                <IconButton onClick={onSave} title="Save" color="var(--accent-hover)" hoverBg="var(--accent-dim)" disabled={saving}>
                  <CheckIcon />
                </IconButton>
                <IconButton onClick={onCancel} title="Cancel" color="var(--text-muted)" hoverBg="var(--border-subtle)" disabled={saving}>
                  <XIcon />
                </IconButton>
              </>
            ) : (
              <IconButton onClick={onEdit} title={`Edit ${label}`} color="var(--text-muted)" hoverBg="var(--border-subtle)">
                <PencilIcon />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  title,
  color,
  hoverBg,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  color: string;
  hoverBg: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
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
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 150ms ease',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
