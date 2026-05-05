import { createZodDto } from 'nestjs-zod';

import type { LoginResponse } from '@repo/schemas/auth';
import {
  authNonEnumeratingAckSchema,
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  registerResponseSchema,
  resendVerificationBodySchema,
  verifyEmailBodySchema,
  verifyEmailResponseSchema
} from '@repo/schemas/auth';

export type {
  AuthNonEnumeratingAck,
  LoginBody,
  LoginResponse,
  RegisterBody,
  RegisterResponse,
  ResendVerificationBody,
  VerifyEmailBody,
  VerifyEmailResponse
} from '@repo/schemas/auth';

export {
  authNonEnumeratingAckSchema,
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  registerResponseSchema,
  resendVerificationBodySchema,
  verifyEmailBodySchema,
  verifyEmailResponseSchema
};

export class RegisterDto extends createZodDto(registerBodySchema) {}

export class RegisterResponseDto extends createZodDto(registerResponseSchema) {}

export class LoginDto extends createZodDto(loginBodySchema) {}

export class LoginResponseDto extends createZodDto(loginResponseSchema) {}

export class VerifyEmailDto extends createZodDto(verifyEmailBodySchema) {}

export class VerifyEmailResponseDto extends createZodDto(
  verifyEmailResponseSchema
) {}

export class ResendVerificationDto extends createZodDto(
  resendVerificationBodySchema
) {}

export class AuthNonEnumeratingAckDto extends createZodDto(
  authNonEnumeratingAckSchema
) {}

export type LoginWithTokens = {
  accessToken: string;
  refreshToken: string;
  user: LoginResponse;
};
