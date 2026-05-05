import { createZodDto } from 'nestjs-zod';

import {
  type LoginResponse,
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  registerResponseSchema
} from '@repo/schemas/auth';

export type {
  LoginBody,
  LoginResponse,
  RegisterBody,
  RegisterResponse
} from '@repo/schemas/auth';

export {
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  registerResponseSchema
};

export class RegisterDto extends createZodDto(registerBodySchema) {}

export class RegisterResponseDto extends createZodDto(registerResponseSchema) {}

export class LoginDto extends createZodDto(loginBodySchema) {}

export class LoginResponseDto extends createZodDto(loginResponseSchema) {}

export type LoginWithTokens = {
  accessToken: string;
  refreshToken: string;
  user: LoginResponse;
};
