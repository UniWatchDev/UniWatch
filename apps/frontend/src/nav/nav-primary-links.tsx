import { Link, NavLink } from 'react-router-dom';

export interface NavPrimaryLinksProps {
  readonly showCreateRoom: boolean;
}

function primaryLinkClass(isActive: boolean): string {
  return isActive ? 'btn-ghost navbar-link navbar-link--active' : 'btn-ghost navbar-link';
}

export function NavPrimaryLinks({ showCreateRoom }: NavPrimaryLinksProps) {
  return (
    <nav className="navbar-primary" aria-label="Primary">
      <NavLink to="/" end className={({ isActive }) => primaryLinkClass(isActive)}>
        Rooms
      </NavLink>
      {showCreateRoom ? (
        <Link to="/rooms/new" className="btn-primary navbar-link navbar-link--cta">
          + Create a room
        </Link>
      ) : null}
    </nav>
  );
}
