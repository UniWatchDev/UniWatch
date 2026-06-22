import { createZodDto } from 'nestjs-zod';
import {
  blockedUserSchema,
  blockedUsersResponseSchema,
  createRoomSchema,
  deleteRoomResponseSchema,
  joinRoomBodySchema,
  joinRoomResponseSchema,
  roomBlockedUserParamsSchema,
  roomIdParamsSchema,
  roomPreviewSchema,
  roomResponseSchema,
  updateRoomSchema
} from '@repo/schemas/rooms';

export type {
  BlockedUser,
  BlockedUsersResponse,
  CreateRoomInput,
  DeleteRoomResponse,
  JoinRoomBody,
  JoinRoomResponse,
  RoomBlockedUserParams,
  RoomIdParams,
  RoomPreview,
  RoomResponse,
  UpdateRoomInput
} from '@repo/schemas/rooms';

export class CreateRoomDto extends createZodDto(createRoomSchema) {}
export class UpdateRoomDto extends createZodDto(updateRoomSchema) {}
export class RoomResponseDto extends createZodDto(roomResponseSchema) {}
export class RoomIdParamsDto extends createZodDto(roomIdParamsSchema) {}
export class RoomBlockedUserParamsDto extends createZodDto(roomBlockedUserParamsSchema) {}
export class DeleteRoomResponseDto extends createZodDto(deleteRoomResponseSchema) {}
export class RoomPreviewDto extends createZodDto(roomPreviewSchema) {}
export class JoinRoomBodyDto extends createZodDto(joinRoomBodySchema) {}
export class JoinRoomResponseDto extends createZodDto(joinRoomResponseSchema) {}
export class BlockedUserDto extends createZodDto(blockedUserSchema) {}
export class BlockedUsersResponseDto extends createZodDto(blockedUsersResponseSchema) {}
