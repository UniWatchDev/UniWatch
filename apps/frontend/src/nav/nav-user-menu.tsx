import { Link, useNavigate } from 'react-router-dom';

import { LOGIN_AUTH_REQUIRED_PATH } from '@/auth/auth-redirect';
import { useCookieAuth } from '@/auth/use-cookie-auth';
import { SignOutIcon } from '@/components/sign-out-icon';
import { UserAvatar } from '@/components/user-avatar';
import { sessionDisplayName } from '@/nav/session-display-name';
import type { LoginResponse } from '@repo/schemas/auth';

export interface NavUserMenuProps {
  readonly user: LoginResponse;
}

export function NavUserMenu({ user }: NavUserMenuProps) {
  const navigate = useNavigate();
  const { logout } = useCookieAuth();
  const firstName = sessionDisplayName(user);

  async function signOut() {
    const result = await logout();
    if (result.ok) {
      void navigate(LOGIN_AUTH_REQUIRED_PATH, { replace: true });
    }
  }

  return (
    <div className="navbar-user-menu">
      <Link
        to="/profile"
        title={`${user.email} · @${user.userName}`}
        className="nav-profile-link"
      >
        <UserAvatar
          name={firstName}
          avatarId={user.avatarId}
          avatarColor="var(--accent)"
          size={32}
        />
        <span className="navbar-user-text">
          <span className="navbar-user-greeting display">Hi, {firstName}</span>
          <span className="navbar-user-handle">@{user.userName}</span>
        </span>
      </Link>
      <button
        type="button"
        className="btn-ghost nav-sign-out"
        aria-label="Sign out"
        title="Sign out"
        onClick={() => {
          void signOut();
        }}
      >
        <SignOutIcon />
      </button>
    </div>
  );
}
