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
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}`);
    }
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
    void ping().then((r) => {
      if (!cancelled) setState(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    setState({ kind: 'loading' });
    setState(await ping());
  }

  const isOk = state.kind === 'ok' && state.status === 'ok';

  return (
    <button
      type="button"
      onClick={() => void refresh()}
      className="group flex w-full items-center gap-3 rounded-2xl border border-white/50 bg-white/40 px-4 py-3.5 backdrop-blur-md transition hover:border-white/70"
    >
      <span
        className={`relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
          isOk
            ? 'glow-pulse bg-emerald-400'
            : state.kind === 'loading'
              ? 'bg-slate-300'
              : 'bg-rose-400'
        }`}
      >
        {isOk && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className="display text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-violet)]">
          api/health
        </p>
        <p className="mono text-[14px] font-semibold text-[color:var(--color-ink)]">
          {state.kind === 'loading' && 'checking…'}
          {state.kind === 'ok' && state.status}
          {state.kind === 'error' && 'offline'}
        </p>
      </div>
      <span className="mono text-[13px] text-[color:var(--color-mute)]">
        {state.kind === 'ok' ? `${String(state.latencyMs)}ms` : ''}
      </span>
    </button>
  );
}
