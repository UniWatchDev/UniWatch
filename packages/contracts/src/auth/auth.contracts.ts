import {
  AUTH_FORGOT_PASSWORD_ENDPOINT,
  AUTH_LOGIN_ENDPOINT,
  AUTH_ME_ENDPOINT,
  AUTH_REFRESH_ENDPOINT,
  AUTH_REGISTER_ENDPOINT,
  AUTH_RESEND_VERIFICATION_ENDPOINT,
  AUTH_RESET_PASSWORD_ENDPOINT,
  AUTH_VERIFY_EMAIL_ENDPOINT
} from '@repo/consts/auth';
import {
  authNonEnumeratingAckSchema,
  forgotPasswordAckSchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  registerResponseSchema,
  resendVerificationBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
  verifyEmailResponseSchema,
  type AuthNonEnumeratingAck,
  type ForgotPasswordAck,
  type ForgotPasswordBody,
  type LoginBody,
  type LoginResponse,
  type RegisterBody,
  type RegisterResponse,
  type ResendVerificationBody,
  type ResetPasswordBody,
  type VerifyEmailBody,
  type VerifyEmailResponse
} from '@repo/schemas/auth';
import { z } from 'zod';
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

/** POST `/api/auth/verify-email` — `{ email, code }`; 200 when code is valid. */
export const verifyEmailAuthContract: EndpointContract<
  VerifyEmailResponse,
  VerifyEmailBody
> = {
  method: 'POST',
  path: AUTH_VERIFY_EMAIL_ENDPOINT,
  responseSchema: verifyEmailResponseSchema,
  bodySchema: verifyEmailBodySchema
};

/**
 * POST `/api/auth/resend-verification` — `{ email }`; 202 + non-enumerating ack.
 * Optional `debug` when `AUTH_DEBUG_EMAIL_TOKENS` and an unverified account exists.
 */
export const resendVerificationAuthContract: EndpointContract<
  AuthNonEnumeratingAck,
  ResendVerificationBody
> = {
  method: 'POST',
  path: AUTH_RESEND_VERIFICATION_ENDPOINT,
  responseSchema: authNonEnumeratingAckSchema,
  bodySchema: resendVerificationBodySchema
};

/**
 * POST `/api/auth/forgot-password` — `{ email }`; 202 + non-enumerating ack.
 * Optional `debug.passwordResetToken` when `AUTH_DEBUG_EMAIL_TOKENS` and a verified account exists.
 */
export const forgotPasswordAuthContract: EndpointContract<
  ForgotPasswordAck,
  ForgotPasswordBody
> = {
  method: 'POST',
  path: AUTH_FORGOT_PASSWORD_ENDPOINT,
  responseSchema: forgotPasswordAckSchema,
  bodySchema: forgotPasswordBodySchema
};

/** POST `/api/auth/reset-password` — `{ token, newPassword }`; 204 No Content. */
export const resetPasswordAuthContract: EndpointContract<
  unknown,
  ResetPasswordBody
> = {
  method: 'POST',
  path: AUTH_RESET_PASSWORD_ENDPOINT,
  responseSchema: z.unknown(),
  bodySchema: resetPasswordBodySchema
};
