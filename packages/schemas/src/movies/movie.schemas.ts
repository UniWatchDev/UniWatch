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

export const movieUploadStatusSchema = z.enum([
  'pending',
  'uploading',
  'processing',
  'ready',
  'failed'
]);

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
  size_bytes: z.number().nullable(),
  mime_type: z.string().nullable(),
  duration_seconds: z.number().nullable(),
  file_uploaded_at: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  has_file: z.boolean(),
  hls_prefix: z.string().nullable(),
  playback_url: z.string().nullable(),
  available_qualities: z.array(z.number()),
  error_message: z.string().nullable(),
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

// ---------------------------------------------------------------------------
// Direct-to-R2 presigned upload + async processing
// ---------------------------------------------------------------------------

export const presignUploadRequestSchema = z.strictObject({
  file_name: z.string().min(1, 'File name is required'),
  file_type: z.string().min(1, 'File type is required'),
  file_size: z.number().int().positive('File size must be positive')
});

export type PresignUploadRequest = z.infer<typeof presignUploadRequestSchema>;

export const presignUploadResponseSchema = z.object({
  video_id: z.string(),
  upload_url: z.string().url(),
  object_key: z.string(),
  expires_in: z.number().int().positive()
});

export type PresignUploadResponse = z.infer<typeof presignUploadResponseSchema>;

export const completeUploadRequestSchema = z.strictObject({
  room_id: objectId
});

export type CompleteUploadRequest = z.infer<typeof completeUploadRequestSchema>;

export const completeUploadResponseSchema = z.object({
  id: z.string(),
  upload_status: movieUploadStatusSchema
});

export type CompleteUploadResponse = z.infer<typeof completeUploadResponseSchema>;
