import { useLocation } from 'react-router-dom';

import { useCookieAuth } from '@/auth/use-cookie-auth';
import { NavBrand } from '@/nav/nav-brand';
import { NavGuestActions } from '@/nav/nav-guest-actions';
import { NavPrimaryLinks } from '@/nav/nav-primary-links';
import { isAuthPath, shouldHideNav } from '@/nav/nav-paths';
import { NavUserMenu } from '@/nav/nav-user-menu';
import { ThemeToggleButton } from '@/theme/theme-toggle-button';

export function NavBar() {
  const { pathname } = useLocation();
  const { sessionUser } = useCookieAuth();

  if (shouldHideNav(pathname)) {
    return null;
  }

  const onAuthPage = isAuthPath(pathname);
  const isSignedIn = sessionUser !== null;
  const showCreateRoom = !onAuthPage;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-zone navbar-zone--start">
          <NavBrand />
        </div>

        <div className="navbar-zone navbar-zone--center">
          <NavPrimaryLinks showCreateRoom={showCreateRoom} />
        </div>

        <div className="navbar-zone navbar-zone--end">
          <div className="app-header-actions">
            {isSignedIn ? <NavUserMenu user={sessionUser} /> : <NavGuestActions onAuthPage={onAuthPage} />}
            <ThemeToggleButton />
          </div>
        </div>
      </div>
    </header>
  );
}
