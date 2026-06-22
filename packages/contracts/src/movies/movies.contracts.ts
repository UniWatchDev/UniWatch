import {
  MOVIES_ENDPOINT,
  MOVIE_COMPLETE_UPLOAD_ENDPOINT,
  MOVIE_ENDPOINT,
  MOVIE_PRESIGN_UPLOAD_ENDPOINT,
  MOVIE_RESOLVE_ENDPOINT,
  MOVIE_STREAM_ENDPOINT,
  MOVIE_UPLOAD_ENDPOINT
} from '@repo/consts/movies';
import {
  completeUploadRequestSchema,
  completeUploadResponseSchema,
  createMovieSchema,
  deleteMovieResponseSchema,
  movieIdParamsSchema,
  movieResponseSchema,
  moviesListSchema,
  movieStreamResponseSchema,
  presignUploadRequestSchema,
  presignUploadResponseSchema,
  updateMovieSchema,
  type CompleteUploadRequest,
  type CompleteUploadResponse,
  type CreateMovieInput,
  type DeleteMovieResponse,
  type MovieIdParams,
  type MovieResponse,
  type MovieStreamResponse,
  type PresignUploadRequest,
  type PresignUploadResponse,
  type UpdateMovieInput
} from '@repo/schemas/movies';
import type { EndpointContract } from '../shared/endpoint.js';

export const listMoviesContract: EndpointContract<MovieResponse[]> = {
  method: 'GET',
  path: MOVIES_ENDPOINT,
  responseSchema: moviesListSchema
};

export const getMovieContract: EndpointContract<MovieResponse, void, MovieIdParams> = {
  method: 'GET',
  path: MOVIE_ENDPOINT,
  responseSchema: movieResponseSchema,
  paramsSchema: movieIdParamsSchema
};

export const createMovieContract: EndpointContract<MovieResponse, CreateMovieInput> = {
  method: 'POST',
  path: MOVIES_ENDPOINT,
  responseSchema: movieResponseSchema,
  bodySchema: createMovieSchema
};

/** Idempotent create — returns an existing owned movie when the name already exists. */
export const resolveMovieContract: EndpointContract<MovieResponse, CreateMovieInput> = {
  method: 'POST',
  path: MOVIE_RESOLVE_ENDPOINT,
  responseSchema: movieResponseSchema,
  bodySchema: createMovieSchema
};

export const updateMovieContract: EndpointContract<
  MovieResponse,
  UpdateMovieInput,
  MovieIdParams
> = {
  method: 'PATCH',
  path: MOVIE_ENDPOINT,
  responseSchema: movieResponseSchema,
  bodySchema: updateMovieSchema,
  paramsSchema: movieIdParamsSchema
};

export const deleteMovieContract: EndpointContract<
  DeleteMovieResponse,
  void,
  MovieIdParams
> = {
  method: 'DELETE',
  path: MOVIE_ENDPOINT,
  responseSchema: deleteMovieResponseSchema,
  paramsSchema: movieIdParamsSchema
};

/** Multipart upload — body validated server-side; response matches `movieResponseSchema`. */
export const uploadMovieContract: EndpointContract<MovieResponse, void, MovieIdParams> = {
  method: 'POST',
  path: MOVIE_UPLOAD_ENDPOINT,
  responseSchema: movieResponseSchema,
  paramsSchema: movieIdParamsSchema
};

/** Request a short-lived presigned PUT URL for direct client → R2 upload. */
export const presignUploadContract: EndpointContract<
  PresignUploadResponse,
  PresignUploadRequest,
  MovieIdParams
> = {
  method: 'POST',
  path: MOVIE_PRESIGN_UPLOAD_ENDPOINT,
  responseSchema: presignUploadResponseSchema,
  bodySchema: presignUploadRequestSchema,
  paramsSchema: movieIdParamsSchema
};

/** Signal the original upload finished; kicks off async HLS processing. */
export const completeUploadContract: EndpointContract<
  CompleteUploadResponse,
  CompleteUploadRequest,
  MovieIdParams
> = {
  method: 'POST',
  path: MOVIE_COMPLETE_UPLOAD_ENDPOINT,
  responseSchema: completeUploadResponseSchema,
  bodySchema: completeUploadRequestSchema,
  paramsSchema: movieIdParamsSchema
};

export const streamMovieContract: EndpointContract<
  MovieStreamResponse,
  void,
  MovieIdParams
> = {
  method: 'GET',
  path: MOVIE_STREAM_ENDPOINT,
  responseSchema: movieStreamResponseSchema,
  paramsSchema: movieIdParamsSchema
};
