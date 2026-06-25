import { USERS_SEARCH_ENDPOINT } from '@repo/consts/profile';
import {
  publicProfileSchema,
  userSearchQuerySchema,
  type PublicProfile,
  type UserSearchQuery
} from '@repo/schemas/profile';
import type { EndpointContract } from '../shared/endpoint.js';

export const searchUsersContract: EndpointContract<PublicProfile[], void, void, UserSearchQuery> = {
  method: 'GET',
  path: USERS_SEARCH_ENDPOINT,
  responseSchema: publicProfileSchema.array(),
  querySchema: userSearchQuerySchema
};
