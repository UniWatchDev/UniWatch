import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { StarField } from '@/components/star-field';
import { AppUtilityBar } from '@/components/app-utility-bar';

function AuthBrand() {
  return (
    <Link
      to="/"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        marginBottom: 24,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, var(--accent-hover), var(--accent))',
          flexShrink: 0,
          boxShadow: '0 4px 16px var(--accent-glow)',
        }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
        style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
      >
        Uni-Watch
      </span>
    </Link>
  );
}

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
        <StarField titleVisible={false} />
      </div>
      <AppUtilityBar />
      <main
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6"
        style={{ minHeight: 'min(100%, 560px)' }}
      >
        <div className="flex w-full flex-col items-center" style={{ maxWidth }}>
          <AuthBrand />
          {children}
        </div>
      </main>
    </div>
  );
}
