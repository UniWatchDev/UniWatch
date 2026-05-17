'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { API_BASE_URL } from '@repo/consts/api';
import { getAuthMeContract } from '@repo/contracts/auth';
import type { LoginResponse } from '@repo/schemas/auth';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; user: LoginResponse }
  | { status: 'error' };

export default function ProtectedAppPage() {
  const router = useRouter();
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
          router.replace('/');
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
  }, [router]);

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[color:var(--color-paper)] text-[color:var(--color-ink)]">
        <p className="mono small-caps text-[12px] text-[color:var(--color-mute)]">
          Checking session…
        </p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[color:var(--color-paper)] px-8 text-center text-[color:var(--color-ink)]">
        <p className="mono text-[12px] text-[color:var(--color-fail)]">
          Could not load your session.
        </p>
        <Link
          className="mono border border-[color:var(--color-ink)] px-3 py-1 text-[11px] text-[color:var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
          href="/"
        >
          ← Home
        </Link>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh w-dvw grid-rows-[auto_1fr] gap-4 overflow-hidden bg-[color:var(--color-paper)] px-14 pb-6 pt-4 text-[color:var(--color-ink)]">
      <header className="flex items-baseline justify-between border-b border-[color:var(--color-ink)] pb-3">
        <p className="mono small-caps text-[12px] text-[color:var(--color-accent)]">
          / Protected app
        </p>
        <Link
          className="mono small-caps text-[11px] text-[color:var(--color-mute)] underline-offset-2 hover:text-[color:var(--color-ink)] hover:underline"
          href="/"
        >
          Masthead
        </Link>
      </header>
      <section className="min-h-0 border-t-2 border-[color:var(--color-ink)] pt-4">
        <p className="mono small-caps text-[10px] text-[color:var(--color-mute)]">
          GET /api/auth/me
        </p>
        <pre className="mono editorial-scroll mt-3 max-h-[min(70vh,560px)] overflow-auto border border-[color:var(--color-rule)] bg-[color:var(--color-paper)] p-4 text-[11px] leading-relaxed text-[color:var(--color-ink)]">
          {JSON.stringify(state.user, null, 2)}
        </pre>
      </section>
    </main>
  );
}
