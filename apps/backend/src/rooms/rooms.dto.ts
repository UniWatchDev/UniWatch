import { createZodDto } from 'nestjs-zod';
import {
  createRoomSchema,
  deleteRoomResponseSchema,
  roomIdParamsSchema,
  roomResponseSchema,
  updateRoomSchema
} from '@repo/schemas/rooms';

export type {
  CreateRoomInput,
  DeleteRoomResponse,
  RoomIdParams,
  RoomResponse,
  UpdateRoomInput
} from '@repo/schemas/rooms';

export class CreateRoomDto extends createZodDto(createRoomSchema) {}
export class UpdateRoomDto extends createZodDto(updateRoomSchema) {}
export class RoomResponseDto extends createZodDto(roomResponseSchema) {}
export class RoomIdParamsDto extends createZodDto(roomIdParamsSchema) {}
export class DeleteRoomResponseDto extends createZodDto(deleteRoomResponseSchema) {}
