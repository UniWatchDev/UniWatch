import { USERS_ACTIVE_ENDPOINT, USERS_SEARCH_ENDPOINT } from '@repo/consts/profile';
import {
  getActiveUsersResponseSchema,
  userSearchQuerySchema,
  type ActiveUser,
  type UserSearchQuery
} from '@repo/schemas/profile';
import type { EndpointContract } from '../shared/endpoint.js';

export const searchUsersContract: EndpointContract<ActiveUser[], void, void, UserSearchQuery> = {
  method: 'GET',
  path: USERS_SEARCH_ENDPOINT,
  responseSchema: getActiveUsersResponseSchema,
  querySchema: userSearchQuerySchema
};

export const getActiveUsersContract: EndpointContract<ActiveUser[]> = {
  method: 'GET',
  path: USERS_ACTIVE_ENDPOINT,
  responseSchema: getActiveUsersResponseSchema
};
