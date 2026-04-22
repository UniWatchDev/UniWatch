'use client';

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <p className="mono small-caps text-[11px] text-[color:var(--color-accent)]">
          / Systems
        </p>
        <p className="mono text-[10px] text-[color:var(--color-mute)]">
          runtime check
        </p>
      </div>
      <div className="mt-2 h-px w-full origin-left bg-[color:var(--color-rule)] rule-draw" />
      <ul className="mt-2 flex-1 space-y-1.5 overflow-y-auto pr-1 editorial-scroll">
        {rows.map((r, i) => (
          <li
            key={r.name}
            className="fade-up flex items-baseline gap-2 border-b border-dotted border-[color:var(--color-rule)] pb-1.5"
            style={{ animationDelay: `${String(i * 60)}ms` }}
          >
            <StatusGlyph kind={r.kind} />
            <span className="serif-text text-[13px] leading-tight">
              {r.name}
            </span>
            <span className="flex-1 truncate text-[11px] text-[color:var(--color-mute)]">
              — {r.purpose}
            </span>
            <span className="mono text-[10px] text-[color:var(--color-mute)]">
              {r.meta ?? ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusGlyph({ kind }: { kind: RowKind }) {
  if (kind === 'pending') {
    return (
      <span className="inline-flex h-3 w-3 items-center justify-center">
        <span className="spinner h-2.5 w-2.5 rounded-full border border-[color:var(--color-rule)] border-t-[color:var(--color-ink)]" />
      </span>
    );
  }
  if (kind === 'ok') {
    return (
      <span className="mono check-in inline-block w-[22px] text-[10px] text-[color:var(--color-ok)]">
        [ok]
      </span>
    );
  }
  if (kind === 'warn') {
    return (
      <span className="mono check-in inline-block w-[22px] text-[10px] text-[color:var(--color-warn)]">
        [..]
      </span>
    );
  }
  return (
    <span className="mono check-in inline-block w-[22px] text-[10px] text-[color:var(--color-fail)]">
      [!]
    </span>
  );
}
