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

export type MovieGenre = z.infer<typeof movieGenreSchema>;
export type MovieLanguage = z.infer<typeof movieLanguageSchema>;

export const createMovieSchema = z.strictObject({
  name: z.string().min(1),
  movie_actors: z.array(z.string()).optional().default([]),
  director: z.string().min(1),
  rating: z.number().min(0).max(10),
  length: z.number().int().positive(),
  genre: movieGenreSchema,
  language: movieLanguageSchema
});

export type CreateMovieInput = z.infer<typeof createMovieSchema>;

export const updateMovieSchema = z.strictObject({
  name: z.string().min(1).optional(),
  movie_actors: z.array(z.string()).optional(),
  director: z.string().min(1).optional(),
  rating: z.number().min(0).max(10).optional(),
  length: z.number().int().positive().optional(),
  genre: movieGenreSchema.optional(),
  language: movieLanguageSchema.optional()
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
  created_at: z.string(),
  updated_at: z.string()
});

export type MovieResponse = z.infer<typeof movieResponseSchema>;

export const movieIdParamsSchema = z.strictObject({
  id: z.string().min(1)
});

export type MovieIdParams = z.infer<typeof movieIdParamsSchema>;
