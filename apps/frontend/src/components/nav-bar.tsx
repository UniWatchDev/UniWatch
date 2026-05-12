import { Link, useLocation } from 'react-router-dom';

export function NavBar() {
  const location = useLocation();
  const isRoom = location.pathname.startsWith('/room/');

  if (isRoom) return null;

  return (
    <nav className="navbar">
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 10l4.553-2.526A1 1 0 0121 8.382v7.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            className="display"
            style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700 }}
          >
            Uni-Watch
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" className="btn-ghost" style={{ padding: '7px 16px', fontSize: 13 }}>
            Rooms
          </Link>
          <Link
            to="/rooms/new"
            className="btn-primary"
            style={{ padding: '7px 16px', fontSize: 13, textDecoration: 'none' }}
          >
            + Create a room
          </Link>
        </div>
      </div>
    </nav>
  );
}
