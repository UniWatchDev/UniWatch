import { z } from 'zod';

import { mongoObjectIdStringSchema } from '../profile/profile.schemas.js';

/** A single persisted DM message (used in GET /api/dm/:userId response). */
export const directMessageSchema = z.strictObject({
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  fromUserId: z.string().min(1),
  content: z.string().min(1).max(500),
  createdAt: z.string().datetime()
});
export type DirectMessage = z.infer<typeof directMessageSchema>;

/** Socket.IO client→server payload for dm:send. */
export const sendDmPayloadSchema = z.strictObject({
  targetUserId: mongoObjectIdStringSchema,
  content: z.string().min(1).max(500)
});
export type SendDmPayload = z.infer<typeof sendDmPayloadSchema>;

/** GET /api/dm/:userId path params. */
export const dmUserIdParamsSchema = z.strictObject({
  userId: mongoObjectIdStringSchema
});
export type DmUserIdParams = z.infer<typeof dmUserIdParamsSchema>;
