import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '@repo/consts/api';
import { getAuthMeContract } from '@repo/contracts/auth';
import type { LoginResponse } from '@repo/schemas/auth';

type LoadState = { status: 'loading' } | { status: 'ok'; user: LoginResponse } | { status: 'error' };

export function ProtectedAppPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const response = await fetch(`${API_BASE_URL}${getAuthMeContract.path}`, {
          method: getAuthMeContract.method,
          credentials: 'include',
          headers: { Accept: 'application/json' }
        });
        if (response.status === 401) {
          void navigate('/', { replace: true });
          return;
        }
        if (!response.ok) {
          if (!cancelled) {
            setState({ status: 'error' });
          }
          return;
        }
        const user = getAuthMeContract.responseSchema.parse(await response.json());
        if (!cancelled) {
          setState({ status: 'ok', user });
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error' });
        }
      }
    }

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[color:var(--color-canvas)] text-[color:var(--color-ink)]">
        <p className="mono text-[13px] text-[color:var(--color-mute)]">Checking session…</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[color:var(--color-canvas)] px-6 text-center text-[color:var(--color-ink)]">
        <p className="mono text-[13px] text-red-700">Could not load your session.</p>
        <Link
          className="display rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-medium text-[color:var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
          to="/"
        >
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-[color:var(--color-canvas)] px-6 py-8 text-[color:var(--color-ink)]">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <p className="display text-[16px] font-semibold">Protected app</p>
        <Link
          className="mono text-[12px] font-medium text-[color:var(--color-violet)] underline-offset-4 hover:underline"
          to="/"
        >
          Home
        </Link>
      </header>
      <main className="mx-auto mt-8 w-full max-w-2xl">
        <div className="glass rounded-3xl p-6">
          <p className="mono text-[11px] uppercase tracking-wider text-[color:var(--color-mute)]">
            GET /api/auth/me
          </p>
          <pre className="mono soft-scroll mt-3 max-h-[min(60vh,480px)] overflow-auto rounded-2xl border border-white/15 bg-black/30 p-4 text-[12px] leading-relaxed text-emerald-100/95">
            {JSON.stringify(state.user, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  );
}
