import { createZodDto } from 'nestjs-zod';

import {
  getUserProfileResponseSchema,
  updateProfileBodySchema,
  userNameParamsSchema,
  userProfileSchema
} from '@repo/schemas/profile';

export type {
  GetUserProfileResponse,
  PublicProfile,
  UpdateProfileBody,
  UserNameParams,
  UserProfile
} from '@repo/schemas/profile';

export {
  getUserProfileResponseSchema,
  updateProfileBodySchema,
  userNameParamsSchema,
  userProfileSchema
};

export class UpdateProfileDto extends createZodDto(updateProfileBodySchema) {}

export class UserProfileDto extends createZodDto(userProfileSchema) {}

export class UserNameParamsDto extends createZodDto(userNameParamsSchema) {}

export class GetUserProfileResponseDto extends createZodDto(getUserProfileResponseSchema) {}
