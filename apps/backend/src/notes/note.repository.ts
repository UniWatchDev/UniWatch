import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type {
  CreateNoteInput,
  Note,
  PatchNoteInput,
  UpdateNoteInput
} from '@repo/schemas/notes';
import { NoteRecord, type NoteDocument } from '@/notes/note.schema';

function toNote(doc: NoteDocument): Note {
  return {
    id: doc._id,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}

@Injectable()
export class NoteRepository {
  constructor(
    @InjectModel(NoteRecord.name) private readonly model: Model<NoteDocument>
  ) {}

  async findAll(): Promise<Note[]> {
    const docs = await this.model.find().sort({ createdAt: -1 });
    return docs.map(toNote);
  }

  async findById(id: string): Promise<Note | null> {
    const doc = await this.model.findById(id);
    return doc ? toNote(doc) : null;
  }

  async create(data: CreateNoteInput): Promise<Note> {
    const doc = await new this.model(data).save();
    return toNote(doc);
  }

  async update(id: string, data: UpdateNoteInput): Promise<Note | null> {
    const doc = await this.model.findByIdAndUpdate(
      id,
      { $set: { title: data.title, content: data.content } },
      { new: true }
    );
    return doc ? toNote(doc) : null;
  }

  async patch(id: string, data: PatchNoteInput): Promise<Note | null> {
    const set: Partial<{ title: string; content: string }> = {};
    if (data.title !== undefined) set.title = data.title;
    if (data.content !== undefined) set.content = data.content;
    const doc = await this.model.findByIdAndUpdate(id, { $set: set }, { new: true });
    return doc ? toNote(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id);
    return result !== null;
  }
}
