import { createZodDto } from 'nestjs-zod';
import {
  completeUploadRequestSchema,
  completeUploadResponseSchema,
  createMovieSchema,
  deleteMovieResponseSchema,
  movieIdParamsSchema,
  movieResponseSchema,
  movieStreamResponseSchema,
  presignUploadRequestSchema,
  presignUploadResponseSchema,
  updateMovieSchema
} from '@repo/schemas/movies';

export type { CreateMovieInput, MovieResponse, UpdateMovieInput } from '@repo/schemas/movies';

export class CreateMovieDto extends createZodDto(createMovieSchema) {}
export class UpdateMovieDto extends createZodDto(updateMovieSchema) {}
export class MovieResponseDto extends createZodDto(movieResponseSchema) {}
export class MovieIdParamsDto extends createZodDto(movieIdParamsSchema) {}
export class MovieStreamResponseDto extends createZodDto(movieStreamResponseSchema) {}
export class DeleteMovieResponseDto extends createZodDto(deleteMovieResponseSchema) {}
export class PresignUploadRequestDto extends createZodDto(presignUploadRequestSchema) {}
export class PresignUploadResponseDto extends createZodDto(presignUploadResponseSchema) {}
export class CompleteUploadRequestDto extends createZodDto(completeUploadRequestSchema) {}
export class CompleteUploadResponseDto extends createZodDto(completeUploadResponseSchema) {}
