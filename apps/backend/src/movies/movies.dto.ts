import { createZodDto } from 'nestjs-zod';
import {
  createMovieSchema,
  movieIdParamsSchema,
  movieResponseSchema,
  updateMovieSchema
} from '@repo/schemas/movies';

export type { CreateMovieInput, MovieResponse, UpdateMovieInput } from '@repo/schemas/movies';

export class CreateMovieDto extends createZodDto(createMovieSchema) {}
export class UpdateMovieDto extends createZodDto(updateMovieSchema) {}
export class MovieResponseDto extends createZodDto(movieResponseSchema) {}
export class MovieIdParamsDto extends createZodDto(movieIdParamsSchema) {}
