import { Link } from 'react-router-dom';

export interface NavGuestActionsProps {
  readonly onAuthPage: boolean;
}

export function NavGuestActions({ onAuthPage }: NavGuestActionsProps) {
  if (onAuthPage) {
    return null;
  }

  return (
    <nav className="navbar-actions" aria-label="Account">
      <Link to="/register" className="btn-ghost navbar-link">
        Sign Up
      </Link>
      <Link to="/login" className="btn-primary navbar-link navbar-link--cta">
        Sign In
      </Link>
    </nav>
  );
}
