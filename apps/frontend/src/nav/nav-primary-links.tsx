export interface NavPrimaryLinksProps {
  readonly showCreateRoom: boolean;
}

export function NavPrimaryLinks({ showCreateRoom }: NavPrimaryLinksProps) {
  if (!showCreateRoom) return null;
  return (
    <nav className="navbar-primary" aria-label="Primary">
    </nav>
  );
}
