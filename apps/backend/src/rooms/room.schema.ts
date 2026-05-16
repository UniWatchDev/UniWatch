import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { UserRecord } from '@/auth/user.schema';
import { MovieRecord } from '@/movies/movie.schema';

export enum RoomType {
  PUBLIC = 'public',
  PRIVATE = 'private'
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

  @Prop({ type: Types.ObjectId, ref: UserRecord.name, required: true })
  creator!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'lobbies' })
  lobby?: Types.ObjectId;

  @Prop({ required: true, enum: RoomType })
  room_type!: RoomType;

  @Prop({ type: Types.ObjectId, ref: MovieRecord.name, required: true })
  movie!: Types.ObjectId;

  @Prop({ type: String, default: null })
  description?: string | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: UserRecord.name }], default: [] })
  allowed_users!: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: UserRecord.name }], default: null })
  banned_users?: Types.ObjectId[] | null;

  @Prop({ required: true })
  deactivate_at!: Date;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;
}

export type RoomDocument = HydratedDocument<RoomRecord> & {
  created_at: Date;
  updated_at: Date;
};

export const RoomSchema = SchemaFactory.createForClass(RoomRecord);
