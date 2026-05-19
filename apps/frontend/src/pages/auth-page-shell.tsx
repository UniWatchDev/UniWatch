import type { ReactNode } from 'react';

import { StarField } from '@/components/star-field';

export function AuthPageShell({
  children,
  maxWidth = 420
}: {
  readonly children: ReactNode;
  readonly maxWidth?: number;
}) {
  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <StarField />
      </div>
      <main
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10"
        style={{ minHeight: 'min(100%, 560px)' }}
      >
        <div className="w-full" style={{ maxWidth }}>
          {children}
        </div>
      </main>
    </div>
  );
}
