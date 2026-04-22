import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  PatchNoteInput
} from '@repo/schemas/notes';
import { randomUUID } from 'node:crypto';

@Injectable()
export class NotesService {
  private readonly notes = new Map<string, Note>();

  list(): Note[] {
    return [...this.notes.values()].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  get(id: string): Note {
    const note = this.notes.get(id);
    if (!note) {
      throw new NotFoundException(`Note with id "${id}" not found`);
    }
    return note;
  }

  create(data: CreateNoteInput): Note {
    const now = new Date().toISOString();
    const note: Note = {
      id: randomUUID(),
      title: data.title,
      content: data.content,
      createdAt: now,
      updatedAt: now
    };
    this.notes.set(note.id, note);
    return note;
  }

  update(id: string, data: UpdateNoteInput): Note {
    const existing = this.get(id);
    const updated: Note = {
      ...existing,
      title: data.title,
      content: data.content,
      updatedAt: new Date().toISOString()
    };
    this.notes.set(id, updated);
    return updated;
  }

  patch(id: string, data: PatchNoteInput): Note {
    const existing = this.get(id);
    const patched: Note = {
      ...existing,
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      updatedAt: new Date().toISOString()
    };
    this.notes.set(id, patched);
    return patched;
  }

  delete(id: string): { success: true } {
    if (!this.notes.has(id)) {
      throw new NotFoundException(`Note with id "${id}" not found`);
    }
    this.notes.delete(id);
    return { success: true };
  }
}
