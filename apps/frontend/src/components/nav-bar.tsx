import { Link, useLocation } from 'react-router-dom';

import { useCookieAuth } from '@/auth/use-cookie-auth';
import { UserAvatar } from '@/components/user-avatar';
import { hashUserIdToColor } from '@/utils/avatar-color';

const AUTH_PATH_PREFIXES = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/change-password'
] as const;

function isAuthPath(pathname: string): boolean {
  return AUTH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function NavBar() {
  const location = useLocation();
  const isRoom = location.pathname.startsWith('/room/');
  const onAuthPage = isAuthPath(location.pathname);
  const { sessionUser, logout } = useCookieAuth();

  if (isRoom) return null;

  const navDisplayName =
    sessionUser !== null
      ? sessionUser.firstName.trim() || sessionUser.userName
      : '';

  return (
    <nav className="navbar">
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            flexShrink: 0,
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

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <Link to="/" className="btn-ghost" style={{ padding: '7px 16px', fontSize: 13 }}>
              Rooms
            </Link>

            {sessionUser !== null ? (
              <>
                {!onAuthPage ? (
                  <Link
                    to="/rooms/new"
                    className="btn-primary"
                    style={{ padding: '7px 16px', fontSize: 13, textDecoration: 'none' }}
                  >
                    + Create a room
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)' }}
                  onClick={() => {
                    void logout();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                {!onAuthPage ? (
                  <Link
                    to="/rooms/new"
                    className="btn-primary"
                    style={{ padding: '7px 16px', fontSize: 13, textDecoration: 'none' }}
                  >
                    + Create a room
                  </Link>
                ) : null}
                <Link to="/register" className="btn-ghost" style={{ padding: '7px 16px', fontSize: 13 }}>
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  className="btn-primary"
                  style={{ padding: '7px 16px', fontSize: 13, textDecoration: 'none' }}
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {sessionUser !== null ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <Link
                to="/profile"
                title={`${sessionUser.email} · @${sessionUser.userName}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textDecoration: 'none',
                  padding: '4px 8px',
                  borderRadius: 8,
                  transition: 'background 150ms ease'
                }}
                className="nav-profile-link"
              >
                <UserAvatar
                  name={navDisplayName}
                  avatarColor={hashUserIdToColor(sessionUser.userId)}
                  size={32}
                />
                <span
                  className="display"
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    maxWidth: 'min(200px, 30vw)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {navDisplayName}
                </span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
