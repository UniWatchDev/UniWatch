import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCookieAuth } from '@/auth/use-cookie-auth';

export function RequireAuth({ children }: { readonly children: ReactNode }) {
  const { sessionUser, authInitialized } = useCookieAuth();

  if (!authInitialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (sessionUser === null) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
