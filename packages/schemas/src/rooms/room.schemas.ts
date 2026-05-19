import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

export const roomTypeSchema = z.enum(['public', 'private']);

export type RoomType = z.infer<typeof roomTypeSchema>;

export const createRoomSchema = z.strictObject({
  name: z.string().min(1),
  movie: objectId,
  room_type: roomTypeSchema,
  deactivate_at: z.string().datetime(),
  password: z.string().optional(),
  description: z.string().optional()
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const roomResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  room_type: roomTypeSchema,
  movie: z.string(),
  creator: z.string(),
  description: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  allowed_users: z.array(z.string()),
  banned_users: z.array(z.string()).nullable().optional(),
  deactivate_at: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

export type RoomResponse = z.infer<typeof roomResponseSchema>;

export const roomIdParamsSchema = z.strictObject({
  id: z.string().min(1)
});

export type RoomIdParams = z.infer<typeof roomIdParamsSchema>;
