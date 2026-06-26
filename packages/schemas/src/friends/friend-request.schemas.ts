import { z } from 'zod';

import { mongoObjectIdStringSchema, publicProfileSchema } from '../profile/profile.schemas.js';

export const friendRequestStatusSchema = z.enum(['pending', 'accepted', 'rejected']);
export type FriendRequestStatus = z.infer<typeof friendRequestStatusSchema>;

/** Server → client: a pending incoming request in my inbox. */
export const friendRequestResponseSchema = z.strictObject({
  requestId: z.string().min(1),
  from: publicProfileSchema,
  createdAt: z.string().datetime()
});
export type FriendRequestResponse = z.infer<typeof friendRequestResponseSchema>;

/** POST /api/friends/requests body. */
export const sendFriendRequestBodySchema = z.strictObject({
  targetUserId: mongoObjectIdStringSchema
});
export type SendFriendRequestBody = z.infer<typeof sendFriendRequestBodySchema>;

/** POST /api/friends/requests 201 response. */
export const sendFriendRequestResponseSchema = z.strictObject({
  requestId: z.string().min(1)
});
export type SendFriendRequestResponse = z.infer<typeof sendFriendRequestResponseSchema>;

/** PATCH /api/friends/requests/:requestId body. */
export const respondFriendRequestBodySchema = z.strictObject({
  action: z.enum(['accept', 'reject'])
});
export type RespondFriendRequestBody = z.infer<typeof respondFriendRequestBodySchema>;

/** PATCH /api/friends/requests/:requestId path params. */
export const friendRequestIdParamsSchema = z.strictObject({
  requestId: z.string().min(1)
});
export type FriendRequestIdParams = z.infer<typeof friendRequestIdParamsSchema>;

/** DELETE /api/friends/:userId path params. */
export const friendUserIdParamsSchema = z.strictObject({
  userId: mongoObjectIdStringSchema
});
export type FriendUserIdParams = z.infer<typeof friendUserIdParamsSchema>;

/** 204 response shape for unfriend / reject. */
export const friendActionSuccessSchema = z.strictObject({ success: z.literal(true) });
export type FriendActionSuccess = z.infer<typeof friendActionSuccessSchema>;
