import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@repo/consts/api';
import { healthContract } from '@repo/contracts/health';
import {
  createNoteContract,
  deleteNoteContract,
  listNotesContract,
  patchNoteContract
} from '@repo/contracts/notes';
import type { Note } from '@repo/schemas/notes';

import { assertOkOrSession } from '@/utils/api-session';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface EndpointRow {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  needsId: boolean;
  autoRun: boolean;
  run: (firstNoteId?: string) => Promise<unknown>;
}

const ROWS: readonly EndpointRow[] = [
  {
    id: 'health',
    name: 'health',
    method: 'GET',
    path: healthContract.path,
    needsId: false,
    autoRun: true,
    run: async () => {
      const response = await fetch(`${API_BASE_URL}${healthContract.path}`, {
        method: healthContract.method,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      return healthContract.responseSchema.parse(await response.json());
    }
  },
  {
    id: 'list-notes',
    name: 'list notes',
    method: 'GET',
    path: listNotesContract.path,
    needsId: false,
    autoRun: true,
    run: async () => {
      const response = await fetch(`${API_BASE_URL}${listNotesContract.path}`, {
        method: listNotesContract.method,
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      assertOkOrSession(response);
      return listNotesContract.responseSchema.parse(await response.json());
    }
  },
  {
    id: 'create-note',
    name: 'create note',
    method: 'POST',
    path: createNoteContract.path,
    needsId: false,
    autoRun: false,
    run: async () => {
      const body = createNoteContract.bodySchema.parse({
        title: `note ${String(Math.floor(Math.random() * 9000 + 1000))}`,
        content: 'Drafted from the explorer.'
      });
      const response = await fetch(
        `${API_BASE_URL}${createNoteContract.path}`,
        {
          method: createNoteContract.method,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(body)
        }
      );
      assertOkOrSession(response);
      return createNoteContract.responseSchema.parse(await response.json());
    }
  },
  {
    id: 'patch-note',
    name: 'patch note',
    method: 'PATCH',
    path: patchNoteContract.path,
    needsId: true,
    autoRun: false,
    run: async (firstNoteId) => {
      if (!firstNoteId) throw new Error('create a note first');
      const params = patchNoteContract.paramsSchema.parse({ id: firstNoteId });
      const body = patchNoteContract.bodySchema.parse({
        content: `edited ${new Date().toISOString()}`
      });
      const path = patchNoteContract.path.replace(
        ':id',
        encodeURIComponent(params.id)
      );
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: patchNoteContract.method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(body)
      });
      assertOkOrSession(response);
      return patchNoteContract.responseSchema.parse(await response.json());
    }
  },
  {
    id: 'delete-note',
    name: 'delete note',
    method: 'DELETE',
    path: deleteNoteContract.path,
    needsId: true,
    autoRun: false,
    run: async (firstNoteId) => {
      if (!firstNoteId) throw new Error('create a note first');
      const params = deleteNoteContract.paramsSchema.parse({ id: firstNoteId });
      const path = deleteNoteContract.path.replace(
        ':id',
        encodeURIComponent(params.id)
      );
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: deleteNoteContract.method,
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      assertOkOrSession(response);
      return deleteNoteContract.responseSchema.parse(await response.json());
    }
  }
];

type RowResult =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; latencyMs: number; body: string }
  | { kind: 'error'; message: string };

async function tryRow(
  row: EndpointRow,
  firstNoteId?: string
): Promise<RowResult> {
  if (row.needsId && !firstNoteId) {
    return { kind: 'error', message: 'create a note first' };
  }
  const start = performance.now();
  try {
    const result = await row.run(firstNoteId);
    return {
      kind: 'ok',
      latencyMs: Math.round(performance.now() - start),
      body: JSON.stringify(result, null, 2)
    };
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'request failed'
    };
  }
}

const METHOD_GRADIENT: Record<HttpMethod, string> = {
  GET: 'from-sky-400 to-indigo-500',
  POST: 'from-emerald-400 to-teal-500',
  PATCH: 'from-amber-400 to-orange-500',
  DELETE: 'from-rose-500 to-pink-600'
};

export function EndpointExplorer() {
  const [results, setResults] = useState<Record<string, RowResult>>(() =>
    Object.fromEntries(ROWS.map((r) => [r.id, { kind: 'idle' }]))
  );
  const [expanded, setExpanded] = useState<string | null>('health');
  const [firstNoteId, setFirstNoteId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function runAuto() {
      for (const row of ROWS) {
        if (!row.autoRun) continue;
        setResults((prev) => ({ ...prev, [row.id]: { kind: 'loading' } }));
        const result = await tryRow(row, firstNoteId);
        if (result.kind === 'ok' && row.id === 'list-notes') {
          try {
            const parsed = JSON.parse(result.body) as Note[];
            if (parsed.length > 0 && parsed[0]) setFirstNoteId(parsed[0].id);
          } catch {
            // ignore
          }
        }
        setResults((prev) => ({ ...prev, [row.id]: result }));
      }
    }
    void runAuto();
  }, [firstNoteId]);

  async function handleTry(row: EndpointRow) {
    setResults((prev) => ({ ...prev, [row.id]: { kind: 'loading' } }));
    setExpanded(row.id);
    const result = await tryRow(row, firstNoteId);
    if (result.kind === 'ok') {
      try {
        const parsed = JSON.parse(result.body) as unknown;
        if (row.id === 'list-notes' && Array.isArray(parsed)) {
          const first = (parsed as Note[])[0];
          setFirstNoteId(first?.id);
        } else if (
          (row.id === 'create-note' || row.id === 'patch-note') &&
          parsed &&
          typeof parsed === 'object' &&
          'id' in parsed
        ) {
          setFirstNoteId((parsed as Note).id);
        } else if (row.id === 'delete-note') {
          setFirstNoteId(undefined);
        }
      } catch {
        // ignore
      }
    }
    setResults((prev) => ({ ...prev, [row.id]: result }));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <p className="display text-[15px] font-semibold tracking-wider uppercase text-[color:var(--color-violet)]">
          Endpoint playground
        </p>
        <p className="mono text-[12px] text-[color:var(--color-mute)]">
          @repo/contracts · live
        </p>
      </div>
      <ul className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1 soft-scroll">
        {ROWS.map((row, i) => {
          const res = results[row.id] ?? { kind: 'idle' };
          const isOpen = expanded === row.id;
          const disabled = row.needsId && !firstNoteId;
          return (
            <li
              key={row.id}
              className="fade-up overflow-hidden rounded-xl border border-white/50 bg-white/40 backdrop-blur-md"
              style={{ animationDelay: `${String(i * 50)}ms` }}
            >
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <span
                  className={`mono inline-flex w-[70px] justify-center rounded-md bg-gradient-to-br ${METHOD_GRADIENT[row.method]} px-2 py-1 text-[11px] font-bold text-white`}
                >
                  {row.method}
                </span>
                <span className="mono flex-1 truncate text-[13px] text-[color:var(--color-ink)]">
                  {row.path}
                </span>
                <span className="mono w-14 text-right text-[11px] text-[color:var(--color-mute)]">
                  {res.kind === 'ok'
                    ? `${String(res.latencyMs)}ms`
                    : res.kind === 'loading'
                      ? '…'
                      : ''}
                </span>
                <button
                  type="button"
                  onClick={() => void handleTry(row)}
                  disabled={res.kind === 'loading' || disabled}
                  className="display rounded-md px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-violet), var(--color-coral))'
                  }}
                  title={disabled ? 'create a note first' : undefined}
                >
                  {res.kind === 'loading' ? 'calling…' : 'Try'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(isOpen ? null : row.id);
                  }}
                  className="mono w-4 text-[13px] text-[color:var(--color-mute)] hover:text-[color:var(--color-violet)]"
                  aria-label={isOpen ? 'collapse' : 'expand'}
                >
                  {isOpen ? '−' : '+'}
                </button>
              </div>
              {isOpen && res.kind !== 'idle' && res.kind !== 'loading' && (
                <div className="max-h-32 overflow-y-auto border-t border-white/40 bg-white/30 px-3.5 py-2.5 soft-scroll">
                  {res.kind === 'ok' ? (
                    <pre className="mono whitespace-pre-wrap text-[12px] leading-snug text-[color:var(--color-ink)]">
                      {res.body}
                    </pre>
                  ) : (
                    <p className="mono text-[12px] text-rose-600">
                      {res.message}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
