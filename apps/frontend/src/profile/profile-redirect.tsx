import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { redirectToLogin } from '@/auth/auth-redirect';
import { useCookieAuth } from '@/auth/use-cookie-auth';

export function ProfileRedirect() {
  const navigate = useNavigate();
  const { sessionUser, loadMe } = useCookieAuth();

  useEffect(() => {
    let cancelled = false;

    async function go() {
      let resolved = sessionUser;
      if (resolved === null) {
        const result = await loadMe();
        if (cancelled) return;
        if (!result.ok) {
          redirectToLogin(navigate, { replace: true });
          return;
        }
        resolved = result.user;
      }
      void navigate(`/u/${encodeURIComponent(resolved.userName)}`, { replace: true });
    }

    void go();
    return () => {
      cancelled = true;
    };
  }, [loadMe, navigate, sessionUser]);

  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ background: 'var(--bg-primary)', minHeight: '50dvh' }}
    >
      <p className="mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Loading profile…
      </p>
    </div>
  );
}
