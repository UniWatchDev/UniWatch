import { createZodDto } from 'nestjs-zod';

import {
  activeUserSchema,
  getUserProfileResponseSchema,
  publicProfileSchema,
  updateProfileBodySchema,
  userNameParamsSchema,
  userProfileSchema,
  userSearchQuerySchema
} from '@repo/schemas/profile';

export type {
  ActiveUser,
  GetUserProfileResponse,
  PublicProfile,
  UpdateProfileBody,
  UserNameParams,
  UserProfile,
  UserSearchQuery,
  UserSearchResponse
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

export class PublicProfileDto extends createZodDto(publicProfileSchema) {}

export class ActiveUserDto extends createZodDto(activeUserSchema) {}

export class UserSearchQueryDto extends createZodDto(userSearchQuerySchema) {}
