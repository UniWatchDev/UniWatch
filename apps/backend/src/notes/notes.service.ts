import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateNoteInput,
  Note,
  PatchNoteInput,
  UpdateNoteInput
} from '@repo/schemas/notes';
import { NoteRepository } from '@/notes/note.repository';

@Injectable()
export class NotesService {
  constructor(private readonly notes: NoteRepository) {}

  list(): Promise<Note[]> {
    return this.notes.findAll();
  }

  async get(id: string): Promise<Note> {
    const note = await this.notes.findById(id);
    if (!note) throw new NotFoundException(`Note with id "${id}" not found`);
    return note;
  }

  create(data: CreateNoteInput): Promise<Note> {
    return this.notes.create(data);
  }

  async update(id: string, data: UpdateNoteInput): Promise<Note> {
    const note = await this.notes.update(id, data);
    if (!note) throw new NotFoundException(`Note with id "${id}" not found`);
    return note;
  }

  async patch(id: string, data: PatchNoteInput): Promise<Note> {
    const note = await this.notes.patch(id, data);
    if (!note) throw new NotFoundException(`Note with id "${id}" not found`);
    return note;
  }

  async delete(id: string): Promise<{ success: true }> {
    const deleted = await this.notes.delete(id);
    if (!deleted) throw new NotFoundException(`Note with id "${id}" not found`);
    return { success: true };
  }
}
