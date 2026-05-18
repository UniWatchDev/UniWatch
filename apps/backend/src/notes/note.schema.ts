import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';

import { UserRecord } from '@/auth/user.schema';

@Schema({ timestamps: true })
export class NoteRecord {
  @Prop({ type: String, default: () => randomUUID() })
  declare _id: string;

  @Prop({ type: Types.ObjectId, ref: UserRecord.name, required: true })
  ownerId!: Types.ObjectId;

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

NoteSchema.index({ ownerId: 1, createdAt: -1 });
