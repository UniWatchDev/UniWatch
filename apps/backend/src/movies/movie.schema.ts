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

  @Prop({ required: true })
  director!: string;

  @Prop({ required: true })
  rating!: number;

  @Prop({ required: true })
  length!: number;

  @Prop({ required: true, enum: MovieGenre })
  genre!: MovieGenre;

  @Prop({ required: true, enum: MovieLanguage })
  language!: MovieLanguage;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;
}

export type MovieDocument = HydratedDocument<MovieRecord> & {
  created_at: Date;
  updated_at: Date;
};

export const MovieSchema = SchemaFactory.createForClass(MovieRecord);

MovieSchema.index({ ownerId: 1, name: 1 }, { unique: true });
