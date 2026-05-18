import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
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

  async findAllForOwner(ownerId: string): Promise<Note[]> {
    const docs = await this.model
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 });
    return docs.map(toNote);
  }

  async findById(id: string): Promise<NoteDocument | null> {
    return this.model.findById(id);
  }

  async findOwnedById(id: string, ownerId: string): Promise<Note | null> {
    const doc = await this.model.findOne({
      _id: id,
      ownerId: new Types.ObjectId(ownerId)
    });
    return doc ? toNote(doc) : null;
  }

  async create(ownerId: string, data: CreateNoteInput): Promise<Note> {
    const doc = await new this.model({
      ...data,
      ownerId: new Types.ObjectId(ownerId)
    }).save();
    return toNote(doc);
  }

  async update(
    id: string,
    ownerId: string,
    data: UpdateNoteInput
  ): Promise<Note | null> {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, ownerId: new Types.ObjectId(ownerId) },
      { $set: { title: data.title, content: data.content } },
      { returnDocument: 'after' }
    );
    return doc ? toNote(doc) : null;
  }

  async patch(
    id: string,
    ownerId: string,
    data: PatchNoteInput
  ): Promise<Note | null> {
    const set: Partial<{ title: string; content: string }> = {};
    if (data.title !== undefined) set.title = data.title;
    if (data.content !== undefined) set.content = data.content;
    const doc = await this.model.findOneAndUpdate(
      { _id: id, ownerId: new Types.ObjectId(ownerId) },
      { $set: set },
      { returnDocument: 'after' }
    );
    return doc ? toNote(doc) : null;
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const result = await this.model.findOneAndDelete({
      _id: id,
      ownerId: new Types.ObjectId(ownerId)
    });
    return result !== null;
  }
}
