import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

export const roomTypeSchema = z.enum(['public', 'private']);

export type RoomType = z.infer<typeof roomTypeSchema>;

export const createRoomSchema = z.strictObject({
  name: z.string().min(1),
  room_type: roomTypeSchema,
  movie: objectId.optional(),
  deactivate_at: z.string().datetime().optional(),
  password: z.string().optional(),
  description: z.string().optional(),
  movie_name: z.string().optional(),
  movie_description: z.string().optional()
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const roomStatusSchema = z.enum(['watching', 'preparing', 'ready']);

export type RoomStatus = z.infer<typeof roomStatusSchema>;

export const roomResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  room_type: roomTypeSchema,
  movie: z.string().nullable().optional(),
  creator: z.string(),
  description: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  allowed_users: z.array(z.string()),
  banned_users: z.array(z.string()).nullable().optional(),
  deactivate_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  status: roomStatusSchema.optional(),
  movie_name: z.string().nullable().optional(),
  movie_description: z.string().nullable().optional(),
  creator_name: z.string().optional(),
  member_count: z.number().optional()
});

export type RoomResponse = z.infer<typeof roomResponseSchema>;

export const updateRoomSchema = createRoomSchema.partial();

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const deleteRoomResponseSchema = z.object({
  success: z.boolean()
});

export const roomPreviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  room_type: roomTypeSchema,
  has_password: z.boolean(),
  status: roomStatusSchema.optional(),
  creator_name: z.string().optional(),
  member_count: z.number().optional()
});

export type RoomPreview = z.infer<typeof roomPreviewSchema>;

export const joinRoomBodySchema = z.strictObject({
  password: z.string().optional()
});

export type JoinRoomBody = z.infer<typeof joinRoomBodySchema>;

export const joinRoomResponseSchema = z.object({ success: z.boolean() });

export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;

export type DeleteRoomResponse = z.infer<typeof deleteRoomResponseSchema>;

export const roomIdParamsSchema = z.strictObject({
  id: z.string().min(1)
});

export type RoomIdParams = z.infer<typeof roomIdParamsSchema>;
