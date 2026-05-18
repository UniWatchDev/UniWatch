import { createZodDto } from 'nestjs-zod';
import {
  createRoomSchema,
  roomIdParamsSchema,
  roomResponseSchema
} from '@repo/schemas/rooms';

export type { CreateRoomInput, RoomResponse } from '@repo/schemas/rooms';

export class CreateRoomDto extends createZodDto(createRoomSchema) {}
export class RoomResponseDto extends createZodDto(roomResponseSchema) {}
export class RoomIdParamsDto extends createZodDto(roomIdParamsSchema) {}
