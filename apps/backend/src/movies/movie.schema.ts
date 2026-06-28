import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

import { UserRecord } from '@/auth/user.schema';

export enum MovieGenre {
  ACTION = 'action',
  COMEDY = 'comedy',
  DRAMA = 'drama',
  HORROR = 'horror',
  THRILLER = 'thriller',
  SCI_FI = 'sci-fi',
  DOCUMENTARY = 'documentary',
  OTHER = 'other'
}

export enum MovieLanguage {
  ENGLISH = 'english',
  HEBREW = 'hebrew',
  ARABIC = 'arabic',
  FRENCH = 'french',
  SPANISH = 'spanish',
  OTHER = 'other'
}

export enum MovieUploadStatus {
  PENDING = 'pending',
  READY = 'ready',
  FAILED = 'failed'
}

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'movies'
})
export class MovieRecord {
  @Prop({ type: Types.ObjectId, ref: UserRecord.name, required: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: [String], default: [] })
  movie_actors!: string[];

  @Prop({ required: true, default: 'Unknown' })
  director!: string;

  @Prop({ required: true, default: 0 })
  rating!: number;

  @Prop({ required: true, default: 0 })
  length!: number;

  @Prop({ required: true, enum: MovieGenre, default: MovieGenre.OTHER })
  genre!: MovieGenre;

  @Prop({ required: true, enum: MovieLanguage })
  language!: MovieLanguage;

  @Prop({ type: String, default: null })
  description?: string | null;

  @Prop({ required: true, enum: MovieUploadStatus, default: MovieUploadStatus.PENDING })
  upload_status!: MovieUploadStatus;

  @Prop({ type: String, default: null })
  storage_key?: string | null;

  @Prop({ type: String, default: null })
  thumbnail_key?: string | null;

  @Prop({ type: String, default: null })
  mime_type?: string | null;

  @Prop({ type: Number, default: null })
  size_bytes?: number | null;

  @Prop({ type: Number, default: null })
  duration_seconds?: number | null;

  @Prop({ type: Date, default: null })
  file_purge_at?: Date | null;

  @Prop({ type: Date, default: null })
  file_uploaded_at?: Date | null;

  @Prop({ type: Date, default: null })
  file_deleted_at?: Date | null;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;

  @Prop({ type: Boolean, default: false })
  in_catalog!: boolean;

  /** True for titles managed via admin catalog tools (including hidden entries). */
  @Prop({ type: Boolean, default: false })
  is_catalog_entry!: boolean;
}

export type MovieDocument = HydratedDocument<MovieRecord> & {
  created_at: Date;
  updated_at: Date;
};

export const MovieSchema = SchemaFactory.createForClass(MovieRecord);

MovieSchema.index(
  { ownerId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } }
);
MovieSchema.index({ file_purge_at: 1, file_deleted_at: 1 });
MovieSchema.index({ in_catalog: 1, upload_status: 1, deleted_at: 1 });
