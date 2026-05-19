import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import type { CreateMovieInput, MovieResponse, UpdateMovieInput } from '@repo/schemas/movies';
import type { MovieDocument } from '@/movies/movie.schema';
import { MovieRepository } from '@/movies/movie.repository';

function toResponse(doc: MovieDocument): MovieResponse {
  return {
    id: doc._id.toString(),
    name: doc.name,
    movie_actors: doc.movie_actors,
    director: doc.director,
    rating: doc.rating,
    length: doc.length,
    genre: doc.genre,
    language: doc.language,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString()
  };
}

@Injectable()
export class MoviesService {
  constructor(private readonly movies: MovieRepository) {}

  async list(ownerId: string): Promise<MovieResponse[]> {
    const docs = await this.movies.findAllForOwner(ownerId);
    return docs.map(toResponse);
  }

  async get(id: string, ownerId: string): Promise<MovieResponse> {
    const owned = await this.movies.findOwnedById(id, ownerId);
    if (owned) return toResponse(owned);
    const raw = await this.movies.findById(id);
    if (raw && !raw.deleted_at) {
      throw new ForbiddenException('You do not have access to this movie');
    }
    throw new NotFoundException(`Movie "${id}" not found`);
  }

  async create(ownerId: string, data: CreateMovieInput): Promise<MovieResponse> {
    const doc = await this.movies.create(ownerId, data);
    return toResponse(doc);
  }

  async update(
    id: string,
    ownerId: string,
    data: UpdateMovieInput
  ): Promise<MovieResponse> {
    const set: Partial<{
      name: string;
      movie_actors: string[];
      director: string;
      rating: number;
      length: number;
      genre: string;
      language: string;
    }> = {};
    if (data.name !== undefined) set.name = data.name;
    if (data.movie_actors !== undefined) set.movie_actors = data.movie_actors;
    if (data.director !== undefined) set.director = data.director;
    if (data.rating !== undefined) set.rating = data.rating;
    if (data.length !== undefined) set.length = data.length;
    if (data.genre !== undefined) set.genre = data.genre;
    if (data.language !== undefined) set.language = data.language;
    const doc = await this.movies.update(id, ownerId, set);
    if (doc) return toResponse(doc);
    return await this.assertExistsAndOwnedOrThrow(id);
  }

  async delete(id: string, ownerId: string): Promise<{ success: true }> {
    const doc = await this.movies.softDelete(id, ownerId);
    if (doc) return { success: true };
    return await this.assertExistsAndOwnedOrThrow(id);
  }

  private async assertExistsAndOwnedOrThrow(id: string): Promise<never> {
    const raw = await this.movies.findById(id);
    if (raw && !raw.deleted_at) {
      throw new ForbiddenException('You do not have access to this movie');
    }
    throw new NotFoundException(`Movie "${id}" not found`);
  }
}
