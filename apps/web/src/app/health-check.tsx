'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@repo/consts/api';
import { healthContract } from '@repo/contracts/health';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; status: string; latencyMs: number }
  | { kind: 'error'; message: string };

async function ping(): Promise<HealthState> {
  const start = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}${healthContract.path}`, {
      method: healthContract.method,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
    const data = healthContract.responseSchema.parse(await response.json());
    return {
      kind: 'ok',
      status: data.status,
      latencyMs: Math.round(performance.now() - start)
    };
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'unreachable'
    };
  }
}

export function HealthCheck() {
  const [state, setState] = useState<HealthState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void ping().then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    setState({ kind: 'loading' });
    const result = await ping();
    setState(result);
  }

  return (
    <button
      type="button"
      onClick={() => void refresh()}
      className="flex w-full items-baseline gap-2 text-left"
    >
      <Dot state={state} />
      <span className="mono small-caps text-[10px] text-[color:var(--color-mute)]">
        api/health
      </span>
      <span className="mono flex-1 text-[11px] text-[color:var(--color-ink)]">
        {state.kind === 'loading' && 'checking…'}
        {state.kind === 'ok' && state.status}
        {state.kind === 'error' && 'offline'}
      </span>
      <span className="mono text-[10px] text-[color:var(--color-mute)]">
        {state.kind === 'ok' ? `${String(state.latencyMs)}ms` : ''}
      </span>
    </button>
  );
}

function Dot({ state }: { state: HealthState }) {
  if (state.kind === 'loading') {
    return (
      <span className="spinner inline-block h-2.5 w-2.5 rounded-full border border-[color:var(--color-rule)] border-t-[color:var(--color-ink)]" />
    );
  }
  if (state.kind === 'ok' && state.status === 'ok') {
    return (
      <span className="dot-pulse inline-block h-2 w-2 rounded-full bg-[color:var(--color-ok)]" />
    );
  }
  if (state.kind === 'ok') {
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--color-warn)]" />
    );
  }
  return (
    <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--color-fail)]" />
  );
}
