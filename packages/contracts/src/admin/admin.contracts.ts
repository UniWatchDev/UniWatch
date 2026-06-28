import {
  ADMIN_CATALOG_MOVIE_ENDPOINT,
  ADMIN_CATALOG_MOVIES_ENDPOINT,
  ADMIN_CATALOG_MOVIES_UPLOAD_ENDPOINT
} from '@repo/consts/admin';
import {
  catalogMovieIdParamsSchema,
  catalogMovieResponseSchema,
  createCatalogMovieSchema,
  updateCatalogMovieSchema,
  uploadCatalogMovieBodySchema,
  type CatalogMovieIdParams,
  type CreateCatalogMovieInput,
  type UpdateCatalogMovieInput,
  type UploadCatalogMovieBody
} from '@repo/schemas/admin';
import { moviesListSchema, type MovieResponse } from '@repo/schemas/movies';
import type { EndpointContract } from '../shared/endpoint.js';

export const listAdminCatalogMoviesContract: EndpointContract<MovieResponse[]> = {
  method: 'GET',
  path: ADMIN_CATALOG_MOVIES_ENDPOINT,
  responseSchema: moviesListSchema
};

export const createCatalogMovieContract: EndpointContract<
  MovieResponse,
  CreateCatalogMovieInput
> = {
  method: 'POST',
  path: ADMIN_CATALOG_MOVIES_ENDPOINT,
  responseSchema: catalogMovieResponseSchema,
  bodySchema: createCatalogMovieSchema
};

export const updateCatalogMovieContract: EndpointContract<
  MovieResponse,
  UpdateCatalogMovieInput,
  CatalogMovieIdParams
> = {
  method: 'PATCH',
  path: ADMIN_CATALOG_MOVIE_ENDPOINT,
  responseSchema: catalogMovieResponseSchema,
  bodySchema: updateCatalogMovieSchema,
  paramsSchema: catalogMovieIdParamsSchema
};

export const uploadCatalogMovieContract: EndpointContract<
  MovieResponse,
  UploadCatalogMovieBody
> = {
  method: 'POST',
  path: ADMIN_CATALOG_MOVIES_UPLOAD_ENDPOINT,
  responseSchema: catalogMovieResponseSchema,
  bodySchema: uploadCatalogMovieBodySchema
};
