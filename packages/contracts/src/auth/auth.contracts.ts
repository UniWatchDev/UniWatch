import {
  AUTH_LOGIN_ENDPOINT,
  AUTH_ME_ENDPOINT,
  AUTH_REGISTER_ENDPOINT,
  AUTH_REFRESH_ENDPOINT
} from '@repo/consts/auth';
import {
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  registerResponseSchema,
  type LoginBody,
  type LoginResponse,
  type RegisterBody,
  type RegisterResponse
} from '@repo/schemas/auth';
import type { EndpointContract } from '../shared/endpoint.js';

/** POST `/api/auth/register` — JSON body; 201 + user profile (no cookies). */
export const registerAuthContract: EndpointContract<
  RegisterResponse,
  RegisterBody
> = {
  method: 'POST',
  path: AUTH_REGISTER_ENDPOINT,
  responseSchema: registerResponseSchema,
  bodySchema: registerBodySchema
};

/** POST `/api/auth/login` — JSON `{ identifier, password }` (`identifier` = email or username); 200 + user JSON + HttpOnly auth cookies. */
export const loginAuthContract: EndpointContract<LoginResponse, LoginBody> = {
  method: 'POST',
  path: AUTH_LOGIN_ENDPOINT,
  responseSchema: loginResponseSchema,
  bodySchema: loginBodySchema
};

/**
 * POST `/api/auth/refresh` — no JSON body; uses `refresh_token` cookie.
 * 200 + user JSON + rotated cookies.
 */
export const refreshAuthContract: EndpointContract<LoginResponse, void> = {
  method: 'POST',
  path: AUTH_REFRESH_ENDPOINT,
  responseSchema: loginResponseSchema
};

/**
 * GET `/api/auth/me` — no JSON body; uses `access_token` cookie + JWT guard.
 */
export const getAuthMeContract: EndpointContract<LoginResponse> = {
  method: 'GET',
  path: AUTH_ME_ENDPOINT,
  responseSchema: loginResponseSchema
};
