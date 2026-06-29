import {
  MOVIES_ENDPOINT,
  MOVIES_CATALOG_ENDPOINT,
  MOVIE_ENDPOINT,
  MOVIE_RESOLVE_ENDPOINT,
  MOVIE_STREAM_ENDPOINT,
  MOVIE_UPLOAD_ENDPOINT
} from '@repo/consts/movies';
import {
  createMovieSchema,
  deleteMovieResponseSchema,
  movieIdParamsSchema,
  movieResponseSchema,
  moviesListSchema,
  movieStreamResponseSchema,
  updateMovieSchema,
  type CreateMovieInput,
  type DeleteMovieResponse,
  type MovieIdParams,
  type MovieResponse,
  type MovieStreamResponse,
  type UpdateMovieInput
} from '@repo/schemas/movies';
import type { EndpointContract } from '../shared/endpoint.js';

export const listMoviesContract: EndpointContract<MovieResponse[]> = {
  method: 'GET',
  path: MOVIES_ENDPOINT,
  responseSchema: moviesListSchema
};

export const listCatalogMoviesContract: EndpointContract<MovieResponse[]> = {
  method: 'GET',
  path: MOVIES_CATALOG_ENDPOINT,
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
