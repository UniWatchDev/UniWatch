import {
  AUTH_PATCH_ME_ENDPOINT,
  USERS_BY_USERNAME_ENDPOINT
} from '@repo/consts/profile';
import {
  getUserProfileResponseSchema,
  updateProfileBodySchema,
  userProfileSchema,
  userNameParamsSchema
} from '@repo/schemas/profile';
import type {
  GetUserProfileResponse,
  UpdateProfileBody,
  UserProfile,
  UserNameParams
} from '@repo/schemas/profile';
import type { EndpointContract } from '../shared/endpoint.js';

/** PATCH `/api/auth/me` — update own profile fields. */
export const patchAuthMeContract: EndpointContract<UserProfile, UpdateProfileBody> = {
  method: 'PATCH',
  path: AUTH_PATCH_ME_ENDPOINT,
  responseSchema: userProfileSchema,
  bodySchema: updateProfileBodySchema
};

/** GET `/api/users/:userName` — visitor-safe profile + `viewerIsOwner`. */
export const getUserByUserNameContract: EndpointContract<
  GetUserProfileResponse,
  void,
  UserNameParams
> = {
  method: 'GET',
  path: USERS_BY_USERNAME_ENDPOINT,
  responseSchema: getUserProfileResponseSchema,
  paramsSchema: userNameParamsSchema
};
