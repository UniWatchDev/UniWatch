import { createZodDto } from 'nestjs-zod';
import {
  createMovieSchema,
  deleteMovieResponseSchema,
  movieIdParamsSchema,
  movieResponseSchema,
  movieStreamResponseSchema,
  updateMovieSchema
} from '@repo/schemas/movies';

export type { CreateMovieInput, MovieResponse, UpdateMovieInput } from '@repo/schemas/movies';

export class CreateMovieDto extends createZodDto(createMovieSchema) {}
export class UpdateMovieDto extends createZodDto(updateMovieSchema) {}
export class MovieResponseDto extends createZodDto(movieResponseSchema) {}
export class MovieIdParamsDto extends createZodDto(movieIdParamsSchema) {}
export class MovieStreamResponseDto extends createZodDto(movieStreamResponseSchema) {}
export class DeleteMovieResponseDto extends createZodDto(deleteMovieResponseSchema) {}
