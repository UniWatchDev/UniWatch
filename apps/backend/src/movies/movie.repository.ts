import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { MovieGenre, MovieRecord, type MovieDocument } from '@/movies/movie.schema';

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

  findByGenre(ownerId: string, genre: MovieGenre): Promise<MovieDocument[]> {
    return this.model.find({
      ownerId: new Types.ObjectId(ownerId),
      genre,
      deleted_at: null
    });
  }

  create(
    ownerId: string,
    data: {
      name: string;
      movie_actors?: string[];
      director: string;
      rating: number;
      length: number;
      genre: string;
      language: string;
    }
  ): Promise<MovieDocument> {
    return new this.model({
      ...data,
      ownerId: new Types.ObjectId(ownerId)
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
      genre: string;
      language: string;
    }>
  ): Promise<MovieDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id, ownerId: new Types.ObjectId(ownerId), deleted_at: null },
      { $set: data },
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
