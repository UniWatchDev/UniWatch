import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { CreateMovieInput, MovieGenre, MovieLanguage } from '@repo/schemas/movies';

import {
  MovieGenre as MovieGenreEnum,
  MovieUploadStatus,
  MovieRecord,
  type MovieDocument
} from '@/movies/movie.schema';

@Injectable()
export class MovieRepository {
  constructor(
    @InjectModel(MovieRecord.name) private readonly model: Model<MovieDocument>
  ) {}

  findAllForOwner(ownerId: string): Promise<MovieDocument[]> {
    return this.model.find({
      ownerId: new Types.ObjectId(ownerId),
      deleted_at: null
    });
  }

  findById(id: string): Promise<MovieDocument | null> {
    return this.model.findById(id);
  }

  findOwnedById(id: string, ownerId: string): Promise<MovieDocument | null> {
    return this.model.findOne({
      _id: id,
      ownerId: new Types.ObjectId(ownerId),
      deleted_at: null
    });
  }

  findOwnedByName(ownerId: string, name: string): Promise<MovieDocument | null> {
    return this.model.findOne({
      ownerId: new Types.ObjectId(ownerId),
      name: name.trim(),
      deleted_at: null
    });
  }

  findByGenre(ownerId: string, genre: MovieGenreEnum): Promise<MovieDocument[]> {
    return this.model.find({
      ownerId: new Types.ObjectId(ownerId),
      genre,
      deleted_at: null
    });
  }

  findDueForFilePurge(now: Date): Promise<MovieDocument[]> {
    return this.model.find({
      deleted_at: null,
      file_deleted_at: null,
      file_purge_at: { $lte: now },
      storage_key: { $ne: null }
    });
  }

  create(ownerId: string, data: CreateMovieInput): Promise<MovieDocument> {
    return new this.model({
      ownerId: new Types.ObjectId(ownerId),
      name: data.name,
      language: data.language,
      movie_actors: data.movie_actors ?? [],
      director: data.director ?? 'Unknown',
      rating: data.rating ?? 0,
      length: data.length ?? 0,
      genre: data.genre ?? MovieGenreEnum.OTHER,
      description: data.description ?? null,
      upload_status: MovieUploadStatus.PENDING
    }).save();
  }

  update(
    id: string,
    ownerId: string,
    data: Partial<{
      name: string;
      movie_actors: string[];
      director: string;
      rating: number;
      length: number;
      genre: MovieGenre;
      language: MovieLanguage;
      description: string | null;
      upload_status: MovieUploadStatus;
      storage_key: string | null;
      thumbnail_key: string | null;
      mime_type: string | null;
      size_bytes: number | null;
      duration_seconds: number | null;
      file_purge_at: Date | null;
      file_uploaded_at: Date | null;
      file_deleted_at: Date | null;
    }>
  ): Promise<MovieDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id, ownerId: new Types.ObjectId(ownerId), deleted_at: null },
      { $set: data },
      { returnDocument: 'after' }
    );
  }

  scheduleFilePurge(id: string, purgeAt: Date): Promise<MovieDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id, deleted_at: null, file_deleted_at: null },
      { $set: { file_purge_at: purgeAt } },
      { returnDocument: 'after' }
    );
  }

  markFileDeleted(id: string): Promise<MovieDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          file_deleted_at: new Date(),
          storage_key: null,
          thumbnail_key: null,
          mime_type: null,
          size_bytes: null
        }
      },
      { returnDocument: 'after' }
    );
  }

  softDelete(id: string, ownerId: string): Promise<MovieDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id, ownerId: new Types.ObjectId(ownerId), deleted_at: null },
      { $set: { deleted_at: new Date() } },
      { returnDocument: 'after' }
    );
  }
}
