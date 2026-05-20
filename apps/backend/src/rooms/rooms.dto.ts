import { createZodDto } from 'nestjs-zod';
import {
  createRoomSchema,
  deleteRoomResponseSchema,
  joinRoomBodySchema,
  joinRoomResponseSchema,
  roomIdParamsSchema,
  roomPreviewSchema,
  roomResponseSchema,
  updateRoomSchema
} from '@repo/schemas/rooms';

export type {
  CreateRoomInput,
  DeleteRoomResponse,
  JoinRoomBody,
  JoinRoomResponse,
  RoomIdParams,
  RoomPreview,
  RoomResponse,
  UpdateRoomInput
} from '@repo/schemas/rooms';

export class CreateRoomDto extends createZodDto(createRoomSchema) {}
export class UpdateRoomDto extends createZodDto(updateRoomSchema) {}
export class RoomResponseDto extends createZodDto(roomResponseSchema) {}
export class RoomIdParamsDto extends createZodDto(roomIdParamsSchema) {}
export class DeleteRoomResponseDto extends createZodDto(deleteRoomResponseSchema) {}
export class RoomPreviewDto extends createZodDto(roomPreviewSchema) {}
export class JoinRoomBodyDto extends createZodDto(joinRoomBodySchema) {}
export class JoinRoomResponseDto extends createZodDto(joinRoomResponseSchema) {}
