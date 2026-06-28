import type { ReactNode } from 'react';

interface RoomFormBackLinkProps {
  onClick: () => void;
  children: ReactNode;
}

export function RoomFormBackLink({ onClick, children }: RoomFormBackLinkProps) {
  return (
    <button type="button" className="room-form-back-link" onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      {children}
    </button>
  );
}
