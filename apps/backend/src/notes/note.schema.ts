import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { randomUUID } from 'node:crypto';

@Schema({ timestamps: true })
export class NoteRecord {
  @Prop({ type: String, default: () => randomUUID() })
  declare _id: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  content!: string;
}

export type NoteDocument = HydratedDocument<NoteRecord> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const NoteSchema = SchemaFactory.createForClass(NoteRecord);
