import { z } from 'zod';

export const movieGenreSchema = z.enum([
  'action',
  'comedy',
  'drama',
  'horror',
  'thriller',
  'sci-fi',
  'documentary',
  'other'
]);

export const movieLanguageSchema = z.enum([
  'english',
  'hebrew',
  'arabic',
  'french',
  'spanish',
  'other'
]);

export const movieUploadStatusSchema = z.enum(['pending', 'ready', 'failed']);

export type MovieGenre = z.infer<typeof movieGenreSchema>;
export type MovieLanguage = z.infer<typeof movieLanguageSchema>;
export type MovieUploadStatus = z.infer<typeof movieUploadStatusSchema>;

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

export const createMovieSchema = z.strictObject({
  name: z.string().min(1),
  language: movieLanguageSchema,
  movie_actors: z.array(z.string()).optional(),
  director: z.string().min(1).optional(),
  rating: z.number().min(0).max(10).optional(),
  length: z.number().int().nonnegative().optional(),
  genre: movieGenreSchema.optional(),
  description: z.string().max(400).optional()
});

export type CreateMovieInput = z.infer<typeof createMovieSchema>;

export const updateMovieSchema = z.strictObject({
  name: z.string().min(1).optional(),
  language: movieLanguageSchema.optional(),
  movie_actors: z.array(z.string()).optional(),
  director: z.string().min(1).optional(),
  rating: z.number().min(0).max(10).optional(),
  length: z.number().int().nonnegative().optional(),
  genre: movieGenreSchema.optional(),
  description: z.string().max(400).optional()
});

export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;

export const movieResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  movie_actors: z.array(z.string()),
  director: z.string(),
  rating: z.number(),
  length: z.number(),
  genre: movieGenreSchema,
  language: movieLanguageSchema,
  description: z.string().nullable(),
  upload_status: movieUploadStatusSchema,
  in_catalog: z.boolean(),
  size_bytes: z.number().nullable(),
  mime_type: z.string().nullable(),
  duration_seconds: z.number().nullable(),
  file_uploaded_at: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  has_file: z.boolean(),
  file_deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export type MovieResponse = z.infer<typeof movieResponseSchema>;

export const moviesListSchema = z.array(movieResponseSchema);

export const movieIdParamsSchema = z.strictObject({
  id: objectId
});

export type MovieIdParams = z.infer<typeof movieIdParamsSchema>;

export const deleteMovieResponseSchema = z.object({
  success: z.boolean()
});

export type DeleteMovieResponse = z.infer<typeof deleteMovieResponseSchema>;

export const movieStreamResponseSchema = z.object({
  url: z.string().url(),
  expires_at: z.string()
});

export type MovieStreamResponse = z.infer<typeof movieStreamResponseSchema>;
