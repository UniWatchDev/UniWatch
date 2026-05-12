import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@repo/consts/api';
import {
  createNoteContract,
  deleteNoteContract,
  listNotesContract,
  updateNoteContract
} from '@repo/contracts/notes';
import type { Note } from '@repo/schemas/notes';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

export function NotesPanel() {
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
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      const data = listNotesContract.responseSchema.parse(
        await response.json()
      );
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish() {
    if (!newTitle.trim()) return;
    setError(null);
    try {
      const body = createNoteContract.bodySchema.parse({
        title: newTitle,
        content: newContent || ' - '
      });
      const response = await fetch(
        `${API_BASE_URL}${createNoteContract.path}`,
        {
          method: createNoteContract.method,
          headers: JSON_HEADERS,
          body: JSON.stringify(body)
        }
      );
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      createNoteContract.responseSchema.parse(await response.json());
      setNewTitle('');
      setNewContent('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to publish');
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
        headers: JSON_HEADERS,
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      updateNoteContract.responseSchema.parse(await response.json());
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to update');
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
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      deleteNoteContract.responseSchema.parse(await response.json());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to delete');
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <p className="display text-[15px] font-semibold uppercase tracking-wider text-[color:var(--color-violet)]">
          Notes playground
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="mono text-[12px] text-[color:var(--color-mute)] hover:text-[color:var(--color-violet)]"
        >
          {loading ? '…' : '↻ sync'}
        </button>
      </div>

      {/* Create form */}
      <div className="mt-3 flex gap-2 rounded-xl border border-white/50 bg-white/40 p-2.5 backdrop-blur-md">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => {
            setNewTitle(e.target.value);
          }}
          placeholder="Title"
          className="display w-32 min-w-0 rounded-md border-0 bg-white/60 px-2.5 py-1.5 text-[13px] font-semibold outline-none placeholder:font-normal placeholder:text-[color:var(--color-mute)] focus:bg-white"
        />
        <input
          type="text"
          value={newContent}
          onChange={(e) => {
            setNewContent(e.target.value);
          }}
          placeholder="Content"
          className="min-w-0 flex-1 rounded-md border-0 bg-white/60 px-2.5 py-1.5 text-[13px] outline-none placeholder:text-[color:var(--color-mute)] focus:bg-white"
        />
        <button
          type="button"
          onClick={() => void publish()}
          className="display rounded-md px-3.5 py-1.5 text-[12px] font-semibold text-white"
          style={{
            background:
              'linear-gradient(135deg, var(--color-violet), var(--color-coral))'
          }}
        >
          Save
        </button>
      </div>

      {error && (
        <p className="mono mt-1.5 text-[12px] text-rose-600" role="alert">
          {error}
        </p>
      )}

      <ul className="mt-2.5 flex-1 space-y-2 overflow-y-auto pr-1 soft-scroll">
        {notes.length === 0 && !error && !loading && (
          <li className="display rounded-xl border border-dashed border-white/60 bg-white/20 py-6 text-center text-[14px] italic text-[color:var(--color-mute)]">
            No notes yet. Publish the first one.
          </li>
        )}
        {notes.map((note, i) => (
          <li
            key={note.id}
            className="fade-up group rounded-xl border border-white/50 bg-white/40 px-3.5 py-2.5 backdrop-blur-md transition hover:border-white/70 hover:bg-white/60"
            style={{ animationDelay: `${String(Math.min(i, 6) * 40)}ms` }}
          >
            {editingId === note.id ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                  }}
                  className="display rounded-md bg-white/70 px-2.5 py-1.5 text-[13px] font-semibold outline-none focus:bg-white"
                />
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                  }}
                  className="rounded-md bg-white/70 px-2.5 py-1.5 text-[12px] outline-none focus:bg-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveEdit(note.id)}
                    className="display rounded-md px-3 py-1 text-[12px] font-semibold text-white"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-violet), var(--color-coral))'
                    }}
                  >
                    save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                    }}
                    className="mono text-[12px] text-[color:var(--color-mute)] hover:text-[color:var(--color-ink)]"
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="display truncate text-[14px] font-semibold leading-tight text-[color:var(--color-ink)]">
                    {note.title}
                  </p>
                  <p className="truncate text-[12px] leading-tight text-[color:var(--color-mute)]">
                    {note.content}
                  </p>
                </div>
                <div className="flex shrink-0 items-baseline gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(note.id);
                      setEditTitle(note.title);
                      setEditContent(note.content);
                    }}
                    className="mono text-[11px] uppercase tracking-wider text-[color:var(--color-violet)] hover:brightness-125"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(note.id)}
                    className="mono text-[11px] uppercase tracking-wider text-[color:var(--color-mute)] hover:text-rose-500"
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
