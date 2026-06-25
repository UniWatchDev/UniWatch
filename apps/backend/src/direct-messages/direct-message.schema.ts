import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'direct_messages' })
export class DirectMessageRecord {
  /** Canonical sorted pair: `${minId}_${maxId}`. Computed before insert. */
  @Prop({ required: true })
  conversationId!: string;

  @Prop({ type: Types.ObjectId, ref: 'UserRecord', required: true })
  from!: Types.ObjectId;

  @Prop({ required: true, maxlength: 500 })
  content!: string;
}

export type DirectMessageDocument = HydratedDocument<DirectMessageRecord> & {
  createdAt: Date;
};

export const DirectMessageSchema = SchemaFactory.createForClass(DirectMessageRecord);

DirectMessageSchema.index({ conversationId: 1, createdAt: -1 });
