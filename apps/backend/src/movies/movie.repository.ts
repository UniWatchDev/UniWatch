import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MovieGenre, MovieRecord, type MovieDocument } from '@/movies/movie.schema';

@Injectable()
export class MovieRepository {
  constructor(
    @InjectModel(MovieRecord.name) private readonly model: Model<MovieDocument>
  ) {}

  findAll(): Promise<MovieDocument[]> {
    return this.model.find({ deleted_at: null });
  }

  findById(id: string): Promise<MovieDocument | null> {
    return this.model.findById(id);
  }

  findByGenre(genre: string): Promise<MovieDocument[]> {
    return this.model.find({
      genre: genre as MovieGenre,
      deleted_at: null
    } as unknown as Parameters<Model<MovieDocument>['find']>[0]);
  }

  create(data: {
    name: string;
    movie_actors?: string[];
    director: string;
    rating: number;
    length: number;
    genre: string;
    language: string;
  }): Promise<MovieDocument> {
    return new this.model(data).save();
  }

  update(id: string, data: Partial<{ name: string; movie_actors: string[]; director: string; rating: number; length: number; genre: string; language: string }>): Promise<MovieDocument | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  softDelete(id: string): Promise<MovieDocument | null> {
    return this.model.findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true });
  }
}
