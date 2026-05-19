'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { API_BASE_URL } from '@repo/consts/api';
import {
  createNoteContract,
  deleteNoteContract,
  listNotesContract,
  updateNoteContract
} from '@repo/contracts/notes';
import type { Note } from '@repo/schemas/notes';

import {
  SIGN_IN_REQUIRED_MESSAGE,
  assertOkOrSession
} from '@/utils/api-session';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

export function NotesPanel() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}${listNotesContract.path}`, {
        method: listNotesContract.method,
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      assertOkOrSession(response);
      const data = listNotesContract.responseSchema.parse(
        await response.json()
      );
      setNotes(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed to load';
      setError(msg);
      if (msg === SIGN_IN_REQUIRED_MESSAGE) {
        router.replace('/?login=1');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish() {
    if (!newTitle.trim()) return;
    setError(null);
    try {
      const body = createNoteContract.bodySchema.parse({
        title: newTitle,
        content: newContent || '—'
      });
      const response = await fetch(
        `${API_BASE_URL}${createNoteContract.path}`,
        {
          method: createNoteContract.method,
          credentials: 'include',
          headers: JSON_HEADERS,
          body: JSON.stringify(body)
        }
      );
      assertOkOrSession(response);
      createNoteContract.responseSchema.parse(await response.json());
      setNewTitle('');
      setNewContent('');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed to publish';
      setError(msg);
      if (msg === SIGN_IN_REQUIRED_MESSAGE) {
        router.replace('/?login=1');
      }
    }
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      const params = updateNoteContract.paramsSchema.parse({ id });
      const body = updateNoteContract.bodySchema.parse({
        title: editTitle,
        content: editContent
      });
      const path = updateNoteContract.path.replace(
        ':id',
        encodeURIComponent(params.id)
      );
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: updateNoteContract.method,
        credentials: 'include',
        headers: JSON_HEADERS,
        body: JSON.stringify(body)
      });
      assertOkOrSession(response);
      updateNoteContract.responseSchema.parse(await response.json());
      setEditingId(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed to update';
      setError(msg);
      if (msg === SIGN_IN_REQUIRED_MESSAGE) {
        router.replace('/?login=1');
      }
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const params = deleteNoteContract.paramsSchema.parse({ id });
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
      deleteNoteContract.responseSchema.parse(await response.json());
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed to delete';
      setError(msg);
      if (msg === SIGN_IN_REQUIRED_MESSAGE) {
        router.replace('/?login=1');
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <p className="mono small-caps text-[10px] text-[color:var(--color-accent)]">
          / Letters
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="mono text-[10px] text-[color:var(--color-mute)] hover:text-[color:var(--color-ink)]"
        >
          {loading ? '…' : '↻ reload'}
        </button>
      </div>
      <div className="mt-2 h-px w-full origin-left bg-[color:var(--color-rule)] rule-draw" />

      {/* Compact create form */}
      <div className="mt-2 flex gap-1.5 border-b border-[color:var(--color-rule)] pb-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => {
            setNewTitle(e.target.value);
          }}
          placeholder="Title of the letter"
          className="serif-text w-1/3 min-w-0 border-b border-[color:var(--color-rule)] bg-transparent px-0 py-1 text-[13px] italic placeholder:text-[color:var(--color-mute)] focus:border-[color:var(--color-ink)] focus:outline-none"
        />
        <input
          type="text"
          value={newContent}
          onChange={(e) => {
            setNewContent(e.target.value);
          }}
          placeholder="—"
          className="min-w-0 flex-1 border-b border-[color:var(--color-rule)] bg-transparent px-0 py-1 text-[12px] placeholder:text-[color:var(--color-mute)] focus:border-[color:var(--color-ink)] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void publish()}
          className="serif-text link-underline italic text-[12px] text-[color:var(--color-accent)]"
        >
          Publish →
        </button>
      </div>

      {error && (
        <p
          className="mono mt-1.5 text-[10px] text-[color:var(--color-fail)]"
          role="alert"
        >
          {error}
        </p>
      )}

      <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1 editorial-scroll">
        {notes.length === 0 && !error && !loading && (
          <li className="serif-text py-3 text-center text-[12px] italic text-[color:var(--color-mute)]">
            No letters published. Be the first.
          </li>
        )}
        {notes.map((note, i) => (
          <li
            key={note.id}
            className="group fade-up border-b border-dotted border-[color:var(--color-rule)] pb-1.5"
            style={{ animationDelay: `${String(Math.min(i, 8) * 40)}ms` }}
          >
            {editingId === note.id ? (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                  }}
                  className="serif-text border-b border-[color:var(--color-rule)] bg-transparent px-0 py-0.5 text-[13px] italic focus:border-[color:var(--color-ink)] focus:outline-none"
                />
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                  }}
                  className="border-b border-[color:var(--color-rule)] bg-transparent px-0 py-0.5 text-[11px] focus:border-[color:var(--color-ink)] focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveEdit(note.id)}
                    className="serif-text link-underline italic text-[11px] text-[color:var(--color-accent)]"
                  >
                    Save →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                    }}
                    className="mono text-[10px] text-[color:var(--color-mute)] hover:text-[color:var(--color-ink)]"
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <div className="min-w-0 flex-1">
                  <p className="serif-text truncate text-[13px] italic leading-tight text-[color:var(--color-ink)]">
                    {note.title}
                  </p>
                  <p className="truncate text-[11px] leading-tight text-[color:var(--color-mute)]">
                    {note.content}
                  </p>
                </div>
                <div className="flex shrink-0 items-baseline gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(note.id);
                      setEditTitle(note.title);
                      setEditContent(note.content);
                    }}
                    className="mono text-[9px] uppercase tracking-wider text-[color:var(--color-mute)] hover:text-[color:var(--color-ink)]"
                  >
                    edit
                  </button>
                  <span className="text-[color:var(--color-rule)]">·</span>
                  <button
                    type="button"
                    onClick={() => void remove(note.id)}
                    className="mono text-[9px] uppercase tracking-wider text-[color:var(--color-mute)] hover:text-[color:var(--color-fail)]"
                  >
                    del
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
