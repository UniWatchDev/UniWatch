import { createZodDto } from 'nestjs-zod';

import type { LoginResponse } from '@repo/schemas/auth';
import { userProfileSchema } from '@repo/schemas/profile';
import {
  authNonEnumeratingAckSchema,
  changePasswordBodySchema,
  forgotPasswordAckSchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  registerResponseSchema,
  resendVerificationBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
  verifyEmailResponseSchema
} from '@repo/schemas/auth';

export type {
  AuthNonEnumeratingAck,
  ChangePasswordBody,
  ForgotPasswordAck,
  ForgotPasswordBody,
  LoginBody,
  LoginResponse,
  RegisterBody,
  RegisterResponse,
  ResendVerificationBody,
  ResetPasswordBody,
  VerifyEmailBody,
  VerifyEmailResponse
} from '@repo/schemas/auth';

export {
  authNonEnumeratingAckSchema,
  changePasswordBodySchema,
  forgotPasswordAckSchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  registerResponseSchema,
  resendVerificationBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
  verifyEmailResponseSchema
};

export class RegisterDto extends createZodDto(registerBodySchema) {}

export class RegisterResponseDto extends createZodDto(registerResponseSchema) {}

export class LoginDto extends createZodDto(loginBodySchema) {}

export class LoginResponseDto extends createZodDto(userProfileSchema) {}

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

export class ForgotPasswordDto extends createZodDto(forgotPasswordBodySchema) {}

export class ForgotPasswordAckDto extends createZodDto(forgotPasswordAckSchema) {}

export class ResetPasswordDto extends createZodDto(resetPasswordBodySchema) {}

export class ChangePasswordDto extends createZodDto(changePasswordBodySchema) {}

export type LoginWithTokens = {
  accessToken: string;
  refreshToken: string;
  user: LoginResponse;
};
