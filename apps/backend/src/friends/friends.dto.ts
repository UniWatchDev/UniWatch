import { createZodDto } from 'nestjs-zod';

import { publicProfileSchema } from '@repo/schemas/profile';
import {
  friendActionSuccessSchema,
  friendRequestIdParamsSchema,
  friendRequestResponseSchema,
  friendUserIdParamsSchema,
  respondFriendRequestBodySchema,
  sendFriendRequestBodySchema,
  sendFriendRequestResponseSchema
} from '@repo/schemas/friends';

export type {
  FriendActionSuccess,
  FriendRequestIdParams,
  FriendRequestResponse,
  FriendUserIdParams,
  RespondFriendRequestBody,
  SendFriendRequestBody,
  SendFriendRequestResponse
} from '@repo/schemas/friends';
export type { PublicProfile } from '@repo/schemas/profile';

export class PublicProfileDto extends createZodDto(publicProfileSchema) {}
export class SendFriendRequestBodyDto extends createZodDto(sendFriendRequestBodySchema) {}
export class SendFriendRequestResponseDto extends createZodDto(sendFriendRequestResponseSchema) {}
export class FriendRequestResponseDto extends createZodDto(friendRequestResponseSchema) {}
export class RespondFriendRequestBodyDto extends createZodDto(respondFriendRequestBodySchema) {}
export class FriendRequestIdParamsDto extends createZodDto(friendRequestIdParamsSchema) {}
export class FriendUserIdParamsDto extends createZodDto(friendUserIdParamsSchema) {}
export class FriendActionSuccessDto extends createZodDto(friendActionSuccessSchema) {}
