'use client';

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

function randomTitle() {
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `note ${String(n)}`;
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
        title: randomTitle(),
        content: 'Drafted via the Contracts explorer.'
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
        content: `edited at ${new Date().toISOString()}`
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
  firstNoteId: string | undefined
): Promise<RowResult> {
  if (row.needsId && !firstNoteId) {
    return { kind: 'error', message: 'no note available — create one first' };
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

const METHOD_TINT: Record<HttpMethod, string> = {
  GET: 'text-[color:var(--color-ink)]',
  POST: 'text-[color:var(--color-ok)]',
  PATCH: 'text-[color:var(--color-warn)]',
  DELETE: 'text-[color:var(--color-fail)]'
};

export function EndpointExplorer() {
  const [results, setResults] = useState<Record<string, RowResult>>(() =>
    Object.fromEntries(ROWS.map((r) => [r.id, { kind: 'idle' }]))
  );
  const [expanded, setExpanded] = useState<string | null>(null);
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
            // ignore parse miss
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
      if (row.id === 'list-notes') {
        try {
          const parsed = JSON.parse(result.body) as Note[];
          setFirstNoteId(parsed[0]?.id);
        } catch {
          // ignore
        }
      } else if (row.id === 'create-note' || row.id === 'patch-note') {
        try {
          const parsed = JSON.parse(result.body) as Note;
          setFirstNoteId(parsed.id);
        } catch {
          // ignore
        }
      } else if (row.id === 'delete-note') {
        setFirstNoteId(undefined);
      }
    }
    setResults((prev) => ({ ...prev, [row.id]: result }));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <p className="mono small-caps text-[10px] text-[color:var(--color-accent)]">
          / The Contracts
        </p>
        <p className="mono text-[10px] text-[color:var(--color-mute)]">
          live from @repo/contracts
        </p>
      </div>
      <div className="mt-2 h-px w-full origin-left bg-[color:var(--color-rule)] rule-draw" />
      <ul className="mt-2 flex-1 space-y-0.5 overflow-y-auto editorial-scroll">
        {ROWS.map((row, i) => {
          const res = results[row.id] ?? { kind: 'idle' };
          const isOpen = expanded === row.id;
          const disabled = row.needsId && !firstNoteId;
          return (
            <li
              key={row.id}
              className="fade-up border-b border-[color:var(--color-rule)]"
              style={{ animationDelay: `${String(i * 50)}ms` }}
            >
              <div className="flex items-baseline gap-2 py-1.5">
                <span
                  className={`mono w-14 text-[10px] font-semibold ${METHOD_TINT[row.method]}`}
                >
                  {row.method}
                </span>
                <span className="mono flex-1 truncate text-[11px] text-[color:var(--color-ink)]">
                  {row.path}
                </span>
                <span className="mono w-14 text-right text-[10px] text-[color:var(--color-mute)]">
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
                  className="serif-text link-underline italic text-[12px] text-[color:var(--color-accent)] disabled:text-[color:var(--color-mute)] disabled:no-underline"
                  title={disabled ? 'create a note first' : undefined}
                >
                  Try →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(isOpen ? null : row.id);
                  }}
                  className="mono w-3 text-[10px] text-[color:var(--color-mute)] hover:text-[color:var(--color-ink)]"
                  aria-label={isOpen ? 'collapse' : 'expand'}
                >
                  {isOpen ? '−' : '+'}
                </button>
              </div>
              {isOpen && res.kind !== 'idle' && res.kind !== 'loading' && (
                <div className="mb-2 max-h-28 overflow-y-auto border-l-2 border-[color:var(--color-accent-soft)] bg-[color:var(--color-rule)]/30 px-2 py-1.5 editorial-scroll">
                  {res.kind === 'ok' ? (
                    <pre className="mono whitespace-pre-wrap text-[10px] leading-snug text-[color:var(--color-ink)]">
                      {res.body}
                    </pre>
                  ) : (
                    <p className="mono text-[10px] text-[color:var(--color-fail)]">
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
