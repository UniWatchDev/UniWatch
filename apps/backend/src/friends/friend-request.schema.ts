import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

@Schema({ timestamps: true, collection: 'friend_requests' })
export class FriendRequestRecord {
  @Prop({ type: Types.ObjectId, ref: 'UserRecord', required: true })
  from!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserRecord', required: true })
  to!: Types.ObjectId;

  @Prop({ required: true, enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status!: FriendRequestStatus;
}

export type FriendRequestDocument = HydratedDocument<FriendRequestRecord> & {
  createdAt: Date;
  updatedAt: Date;
};

export const FriendRequestSchema = SchemaFactory.createForClass(FriendRequestRecord);

// Prevent duplicate requests; fast inbox query
FriendRequestSchema.index({ from: 1, to: 1 }, { unique: true });
FriendRequestSchema.index({ to: 1, status: 1 });
