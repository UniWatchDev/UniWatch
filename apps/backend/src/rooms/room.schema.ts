import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export enum RoomType {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

export enum RoomStatus {
  WATCHING = 'watching',
  PREPARING = 'preparing',
  READY = 'ready'
}

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'rooms'
})
export class RoomRecord {
  @Prop({ required: true })
  name!: string;

  @Prop({ type: String, default: null })
  password?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'UserRecord', required: true })
  creator!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MovieRecord', default: null })
  movie?: Types.ObjectId | null;

  @Prop({ required: true, enum: RoomType })
  room_type!: RoomType;

  @Prop({ required: true, enum: RoomStatus, default: RoomStatus.PREPARING })
  status!: RoomStatus;

  @Prop({ type: String, default: null })
  description?: string | null;

  @Prop({ type: String, default: null })
  movie_name?: string | null;

  @Prop({ type: String, default: null })
  movie_description?: string | null;

  @Prop({ type: String, default: null })
  creator_name?: string | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'UserRecord' }], default: [] })
  allowed_users!: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'UserRecord' }], default: [] })
  banned_users!: Types.ObjectId[];

  @Prop({ required: true })
  deactivate_at!: Date;

  @Prop({ type: Date, default: null })
  deactivated_at?: Date | null;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;
}

export type RoomDocument = HydratedDocument<RoomRecord> & {
  created_at: Date;
  updated_at: Date;
};

export const RoomSchema = SchemaFactory.createForClass(RoomRecord);
