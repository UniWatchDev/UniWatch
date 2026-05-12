import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface FormState {
  name: string;
  password: string;
  movieFile: File | null;
  movieName: string;
  movieDescription: string;
  isPrivate: boolean;
}

export function CreateRoom() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>({
    name: '',
    password: '',
    movieFile: null,
    movieName: '',
    movieDescription: '',
    isPrivate: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Room name is required.';
    if (form.isPrivate && !form.password.trim()) next.password = 'Password is required for private rooms.';
    if (!form.movieName.trim()) next.movieName = 'Movie name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // In the future: POST to API, then navigate to the new room
    void navigate('/');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    set('movieFile', file);
    if (file && !form.movieName) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
      set('movieName', nameWithoutExt);
    }
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
      <div
        className="card fade-up"
        style={{ width: '100%', maxWidth: 520, padding: '32px' }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => { void navigate('/'); }}
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
            Back to Lobby
          </button>
          <h1 className="display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Create a room
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)' }}>
            Set up your watch party in seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Room name */}
          <FormField label="Room name" error={errors.name}>
            <input
              className="input"
              type="text"
              placeholder="e.g. Movie Night 🍿"
              value={form.name}
              onChange={(e) => { set('name', e.target.value); }}
              maxLength={60}
            />
          </FormField>

          {/* Visibility toggle */}
          <div>
            <label style={labelStyle}>Visibility</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <ToggleButton
                active={!form.isPrivate}
                onClick={() => { set('isPrivate', false); }}
                icon="🌐"
                label="Public"
              />
              <ToggleButton
                active={form.isPrivate}
                onClick={() => { set('isPrivate', true); }}
                icon="🔒"
                label="Private"
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {form.isPrivate
                ? 'Only people with the password can join.'
                : 'Anyone can see and join this room from the lobby.'}
            </p>
          </div>

          {/* Password (private only) */}
          {form.isPrivate && (
            <FormField label="Password" error={errors.password}>
              <input
                className="input"
                type="password"
                placeholder="Enter a room password"
                value={form.password}
                onChange={(e) => { set('password', e.target.value); }}
                maxLength={64}
              />
            </FormField>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

          {/* Movie upload */}
          <div>
            <label style={labelStyle}>
              Movie file
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(optional)</span>
            </label>
            <div
              onClick={() => { fileInputRef.current?.click(); }}
              style={{
                marginTop: 6,
                padding: '20px',
                border: '2px dashed var(--border-medium)',
                borderRadius: 10,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'border-color 200ms ease, background 200ms ease',
                background: form.movieFile ? 'var(--accent-dim)' : 'transparent',
                borderColor: form.movieFile ? 'var(--accent)' : 'var(--border-medium)',
              }}
            >
              {form.movieFile ? (
                <div>
                  <p style={{ fontSize: 24, margin: '0 0 6px' }}>🎬</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    {form.movieFile.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    {(form.movieFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 24, margin: '0 0 6px' }}>📁</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 2px' }}>
                    Click to upload a video file
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    MP4, MKV, AVI, MOV supported
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              aria-label="Upload movie file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Movie name */}
          <FormField label="Movie name" error={errors.movieName}>
            <input
              className="input"
              type="text"
              placeholder="e.g. Inception (2010)"
              value={form.movieName}
              onChange={(e) => { set('movieName', e.target.value); }}
              maxLength={120}
            />
          </FormField>

          {/* Movie description */}
          <FormField label="Movie description" optional>
            <textarea
              className="input"
              placeholder="A short description of what you're watching…"
              value={form.movieDescription}
              onChange={(e) => { set('movieDescription', e.target.value); }}
              maxLength={400}
              rows={3}
            />
          </FormField>

          {/* Submit */}
          <button className="btn-primary" type="submit" style={{ marginTop: 4, padding: '12px 24px', fontSize: 15, width: '100%' }}>
            Create Room
          </button>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: boolean | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {optional && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(optional)</span>}
      </label>
      <div style={{ marginTop: 6 }}>{children}</div>
      {error && <p style={{ marginTop: 4, fontSize: 12, color: '#f87171' }}>{error}</p>}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 16px',
        border: active ? '2px solid var(--accent)' : '1px solid var(--border-medium)',
        borderRadius: 8,
        background: active ? 'var(--accent-dim)' : 'var(--bg-input)',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 200ms ease',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
};
