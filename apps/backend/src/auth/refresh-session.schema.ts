import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'refresh_sessions' })
export class RefreshSessionRecord {
  @Prop({ type: Types.ObjectId, ref: 'UserRecord', required: true, index: true })
  userId!: Types.ObjectId;

  /** SHA-256 hex of the opaque refresh cookie value. */
  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export type RefreshSessionDocument = HydratedDocument<RefreshSessionRecord> & {
  createdAt: Date;
  updatedAt: Date;
};

export const RefreshSessionSchema = SchemaFactory.createForClass(RefreshSessionRecord);

RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
