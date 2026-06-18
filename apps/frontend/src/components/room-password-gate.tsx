import type { RoomPreview } from '@repo/schemas/rooms';

interface RoomPasswordGateProps {
  preview: RoomPreview;
  passwordInput: string;
  passwordError: string | null;
  joining: boolean;
  onPasswordChange: (value: string) => void;
  onJoin: () => void;
  onBack: () => void;
}

export function RoomPasswordGate({
  preview,
  passwordInput,
  passwordError,
  joining,
  onPasswordChange,
  onJoin,
  onBack
}: RoomPasswordGateProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--bg-primary)' }}>
      <div className="card fade-up" style={{ width: '100%', maxWidth: 380, padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 36 }}>🔒</span>
          <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 4px' }}>
            {preview.name}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            {preview.has_password ? 'This room is password protected.' : 'This is a private room.'}
          </p>
        </div>
        {passwordError !== null && (
          <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#f87171' }}>
            {passwordError}
          </div>
        )}
        {preview.has_password && (
          <input
            className="input"
            type="password"
            placeholder="Enter room password"
            value={passwordInput}
            autoComplete="current-password"
            autoFocus
            onChange={(e) => {
              onPasswordChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onJoin();
            }}
            style={{ marginBottom: 12 }}
          />
        )}
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: 14, opacity: joining ? 0.7 : 1 }}
          disabled={joining || (preview.has_password && passwordInput.length === 0)}
          onClick={onJoin}
        >
          {joining ? 'Joining…' : 'Join Room'}
        </button>
        <button
          className="btn-ghost"
          style={{ width: '100%', marginTop: 8, padding: '8px', fontSize: 13 }}
          onClick={onBack}
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
