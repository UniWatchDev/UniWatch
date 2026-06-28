import { z } from 'zod';

import { createMovieSchema, movieIdParamsSchema, movieResponseSchema } from '../movies/movie.schemas.js';

export const createCatalogMovieSchema = createMovieSchema
  .pick({ name: true, language: true, description: true })
  .extend({
    storage_key: z.string().trim().min(1, 'storage_key is required'),
    thumbnail_key: z.string().trim().min(1, 'thumbnail_key is required'),
    mime_type: z.string().trim().min(1, 'mime_type is required'),
    size_bytes: z.number().int().positive(),
    duration_seconds: z.number().int().positive().optional(),
  });

export type CreateCatalogMovieInput = z.infer<typeof createCatalogMovieSchema>;

export const uploadCatalogMovieBodySchema = createMovieSchema.pick({
  name: true,
  language: true,
  description: true
});

export type UploadCatalogMovieBody = z.infer<typeof uploadCatalogMovieBodySchema>;

export const updateCatalogMovieSchema = z
  .strictObject({
    in_catalog: z.boolean().optional(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(400).nullable().optional(),
  })
  .refine(
    (value) =>
      value.in_catalog !== undefined ||
      value.name !== undefined ||
      value.description !== undefined,
    { message: 'Provide at least one field to update' }
  );

export type UpdateCatalogMovieInput = z.infer<typeof updateCatalogMovieSchema>;

export const catalogMovieIdParamsSchema = movieIdParamsSchema;

export type CatalogMovieIdParams = z.infer<typeof catalogMovieIdParamsSchema>;

export const catalogMovieResponseSchema = movieResponseSchema;
