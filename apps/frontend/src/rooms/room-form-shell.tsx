import type { ReactNode } from 'react';

import { StarField } from '@/components/star-field';

interface RoomFormShellProps {
  backLink: ReactNode;
  title: string;
  description: string;
  maxWidth?: number;
  children: ReactNode;
}

export function RoomFormShell({
  backLink,
  title,
  description,
  maxWidth = 760,
  children,
}: RoomFormShellProps) {
  return (
    <div className="room-form-page">
      <div className="room-form-page__backdrop" aria-hidden="true">
        <StarField titleVisible={false} />
      </div>
      <div className="room-form-page__inner" style={{ maxWidth }}>
        <header className="room-form-page__header">
          {backLink}
          <h1 className="display room-form-page__title">{title}</h1>
          <p className="room-form-page__description">{description}</p>
        </header>
        {children}
      </div>
    </div>
  );
}
