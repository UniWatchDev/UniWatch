import { createZodDto } from 'nestjs-zod';
import {
  catalogMovieIdParamsSchema,
  catalogMovieResponseSchema,
  createCatalogMovieSchema,
  updateCatalogMovieSchema,
  uploadCatalogMovieBodySchema
} from '@repo/schemas/admin';

export class CreateCatalogMovieDto extends createZodDto(createCatalogMovieSchema) {}
export class UpdateCatalogMovieDto extends createZodDto(updateCatalogMovieSchema) {}
export class UploadCatalogMovieDto extends createZodDto(uploadCatalogMovieBodySchema) {}
export class CatalogMovieIdParamsDto extends createZodDto(catalogMovieIdParamsSchema) {}
export class CatalogMovieResponseDto extends createZodDto(catalogMovieResponseSchema) {}
