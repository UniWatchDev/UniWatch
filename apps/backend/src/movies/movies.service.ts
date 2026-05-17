import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateMovieInput, MovieResponse, UpdateMovieInput } from '@/movies/movies.dto';
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

  async list(): Promise<MovieResponse[]> {
    const docs = await this.movies.findAll();
    return docs.map(toResponse);
  }

  async get(id: string): Promise<MovieResponse> {
    const doc = await this.movies.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundException(`Movie "${id}" not found`);
    return toResponse(doc);
  }

  async create(data: CreateMovieInput): Promise<MovieResponse> {
    const doc = await this.movies.create(data);
    return toResponse(doc);
  }

  async update(id: string, data: UpdateMovieInput): Promise<MovieResponse> {
    const set: Partial<{ name: string; movie_actors: string[]; director: string; rating: number; length: number; genre: string; language: string }> = {};
    if (data.name !== undefined) set.name = data.name;
    if (data.movie_actors !== undefined) set.movie_actors = data.movie_actors;
    if (data.director !== undefined) set.director = data.director;
    if (data.rating !== undefined) set.rating = data.rating;
    if (data.length !== undefined) set.length = data.length;
    if (data.genre !== undefined) set.genre = data.genre;
    if (data.language !== undefined) set.language = data.language;
    const doc = await this.movies.update(id, set);
    if (!doc) throw new NotFoundException(`Movie "${id}" not found`);
    return toResponse(doc);
  }

  async delete(id: string): Promise<{ success: true }> {
    const doc = await this.movies.softDelete(id);
    if (!doc) throw new NotFoundException(`Movie "${id}" not found`);
    return { success: true };
  }
}
