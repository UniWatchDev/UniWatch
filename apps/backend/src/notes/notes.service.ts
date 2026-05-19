import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
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

  list(ownerId: string): Promise<Note[]> {
    return this.notes.findAllForOwner(ownerId);
  }

  async get(id: string, ownerId: string): Promise<Note> {
    const owned = await this.notes.findOwnedById(id, ownerId);
    if (owned) return owned;
    const raw = await this.notes.findById(id);
    if (raw) {
      throw new ForbiddenException('You do not have access to this note');
    }
    throw new NotFoundException(`Note with id "${id}" not found`);
  }

  create(ownerId: string, data: CreateNoteInput): Promise<Note> {
    return this.notes.create(ownerId, data);
  }

  async update(id: string, ownerId: string, data: UpdateNoteInput): Promise<Note> {
    const note = await this.notes.update(id, ownerId, data);
    if (note) return note;
    return await this.assertExistsAndOwnedOrThrow(id);
  }

  async patch(id: string, ownerId: string, data: PatchNoteInput): Promise<Note> {
    const note = await this.notes.patch(id, ownerId, data);
    if (note) return note;
    return await this.assertExistsAndOwnedOrThrow(id);
  }

  async delete(id: string, ownerId: string): Promise<{ success: true }> {
    const deleted = await this.notes.delete(id, ownerId);
    if (deleted) return { success: true };
    return await this.assertExistsAndOwnedOrThrow(id);
  }

  private async assertExistsAndOwnedOrThrow(id: string): Promise<never> {
    const raw = await this.notes.findById(id);
    if (raw) {
      throw new ForbiddenException('You do not have access to this note');
    }
    throw new NotFoundException(`Note with id "${id}" not found`);
  }
}
