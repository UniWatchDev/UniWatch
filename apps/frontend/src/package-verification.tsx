import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@repo/consts/api';
import { STARTER_NAME } from '@repo/consts/starter';
import { healthContract } from '@repo/contracts/health';
import { noteSchema } from '@repo/schemas/notes';
import { verifyPackage } from '@repo/example/verify';

type RowKind = 'pending' | 'ok' | 'warn' | 'fail';

interface Row {
  name: string;
  purpose: string;
  kind: RowKind;
  meta?: string;
}

interface Check {
  name: string;
  purpose: string;
  symbol: string;
  probe: () => boolean;
}

const PACKAGE_CHECKS: Check[] = [
  {
    name: '@repo/consts',
    purpose: 'endpoint paths + copy',
    symbol: 'STARTER_NAME',
    probe: () => typeof STARTER_NAME === 'string' && STARTER_NAME.length > 0
  },
  {
    name: '@repo/schemas',
    purpose: 'zod contracts',
    symbol: 'noteSchema',
    probe: () => typeof noteSchema.parse === 'function'
  },
  {
    name: '@repo/contracts',
    purpose: 'typed endpoints',
    symbol: 'healthContract',
    probe: () =>
      healthContract.method === 'GET' &&
      typeof healthContract.responseSchema.parse === 'function'
  },
  {
    name: '@repo/example',
    purpose: 'demo wiring',
    symbol: 'verifyPackage',
    probe: () => typeof verifyPackage === 'function' && verifyPackage().ok
  }
];

const BACKEND_ROW: Row = {
  name: 'api/health',
  purpose: 'NestJS backend',
  kind: 'pending'
};

export function PackageVerification() {
  const [rows, setRows] = useState<Row[]>(() => [
    ...PACKAGE_CHECKS.map(
      (c): Row => ({ name: c.name, purpose: c.purpose, kind: 'pending' })
    ),
    BACKEND_ROW
  ]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      for (let i = 0; i < PACKAGE_CHECKS.length; i += 1) {
        const check = PACKAGE_CHECKS[i];
        if (!check) continue;
        let row: Row;
        try {
          const ok = check.probe();
          row = {
            name: check.name,
            purpose: check.purpose,
            kind: ok ? 'ok' : 'fail',
            meta: ok ? check.symbol : 'missing'
          };
        } catch (err) {
          row = {
            name: check.name,
            purpose: check.purpose,
            kind: 'fail',
            meta: err instanceof Error ? err.message : 'probe failed'
          };
        }
        await new Promise((r) => setTimeout(r, 120));
        if (cancelled) return;
        setRows((prev) => prev.map((r, idx) => (idx === i ? row : r)));
      }

      const start = performance.now();
      try {
        const response = await fetch(`${API_BASE_URL}${healthContract.path}`, {
          method: healthContract.method,
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
        healthContract.responseSchema.parse(await response.json());
        const ms = Math.round(performance.now() - start);
        if (cancelled) return;
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === PACKAGE_CHECKS.length
              ? { ...BACKEND_ROW, kind: 'ok', meta: `${String(ms)}ms` }
              : r
          )
        );
      } catch {
        if (cancelled) return;
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === PACKAGE_CHECKS.length
              ? { ...BACKEND_ROW, kind: 'warn', meta: 'offline' }
              : r
          )
        );
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const okCount = rows.filter((r) => r.kind === 'ok').length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <p className="display text-[15px] font-semibold tracking-wider uppercase text-[color:var(--color-violet)]">
          Systems online
        </p>
        <p className="mono text-[12px] text-[color:var(--color-mute)]">
          {okCount}/{rows.length}
        </p>
      </div>
      <ul className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1 soft-scroll">
        {rows.map((r, i) => (
          <li
            key={r.name}
            className="fade-up flex items-center gap-2.5 rounded-xl border border-white/50 bg-white/40 px-3.5 py-2.5 backdrop-blur-md"
            style={{ animationDelay: `${String(i * 60)}ms` }}
          >
            <StatusBadge kind={r.kind} />
            <div className="min-w-0 flex-1">
              <p className="display text-[14px] font-semibold leading-tight text-[color:var(--color-ink)]">
                {r.name}
              </p>
              <p className="truncate text-[12px] leading-tight text-[color:var(--color-mute)]">
                {r.purpose}
              </p>
            </div>
            <span className="mono text-[11px] text-[color:var(--color-mute)]">
              {r.meta ?? '…'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ kind }: { kind: RowKind }) {
  if (kind === 'pending') {
    return (
      <span className="spin-slow inline-block h-4 w-4 rounded-full border-2 border-[color:var(--color-soft)] border-t-[color:var(--color-violet)]" />
    );
  }
  if (kind === 'ok') {
    return (
      <span
        className="check-pop inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{
          background:
            'linear-gradient(135deg, var(--color-violet), var(--color-coral))'
        }}
      >
        ✓
      </span>
    );
  }
  if (kind === 'warn') {
    return (
      <span className="check-pop inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-white">
        !
      </span>
    );
  }
  return (
    <span className="check-pop inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white">
      ×
    </span>
  );
}
