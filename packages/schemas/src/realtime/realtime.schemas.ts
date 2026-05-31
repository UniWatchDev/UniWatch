import { z } from 'zod';

// ---------------------------------------------------------------------------
// Leaf schemas
// ---------------------------------------------------------------------------

export const connectedUserSchema = z.object({
  userId: z.string(),
  socketId: z.string(),
  joinedAt: z.string().datetime(),
  userName: z.string(),
  color: z.string()
});

export type ConnectedUser = z.infer<typeof connectedUserSchema>;

export const realtimeChatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  userName: z.string(),
  color: z.string(),
  content: z.string().min(1).max(2000),
  timestamp: z.string().datetime()
});

export type RealtimeChatMessage = z.infer<typeof realtimeChatMessageSchema>;

/** Schema only — no playback events are wired yet. */
export const playbackStateSchema = z.object({
  movieId: z.string().nullable(),
  isPlaying: z.boolean(),
  positionSec: z.number().nonnegative(),
  updatedAt: z.string().datetime()
});

export type PlaybackState = z.infer<typeof playbackStateSchema>;

// ---------------------------------------------------------------------------
// In-memory room state (backend only — never persisted to MongoDB)
// ---------------------------------------------------------------------------

export const realtimeRoomStateSchema = z.object({
  roomId: z.string(),
  connectedUsers: z.array(connectedUserSchema),
  /** Capped at the last 100 messages. */
  messages: z.array(realtimeChatMessageSchema),
  playback: playbackStateSchema
});

export type RealtimeRoomState = z.infer<typeof realtimeRoomStateSchema>;

// ---------------------------------------------------------------------------
// Client → Server payloads (strict — reject unknown keys)
// ---------------------------------------------------------------------------

export const joinRoomPayloadSchema = z.strictObject({
  roomId: z.string().min(1)
});

export type JoinRoomPayload = z.infer<typeof joinRoomPayloadSchema>;

export const leaveRoomPayloadSchema = z.strictObject({
  roomId: z.string().min(1)
});

export type LeaveRoomPayload = z.infer<typeof leaveRoomPayloadSchema>;

export const sendMessagePayloadSchema = z.strictObject({
  roomId: z.string().min(1),
  content: z.string().min(1).max(2000)
});

export type SendMessagePayload = z.infer<typeof sendMessagePayloadSchema>;

// ---------------------------------------------------------------------------
// Server → Client payloads
// ---------------------------------------------------------------------------

export const userJoinedEventSchema = z.object({
  userId: z.string(),
  roomId: z.string(),
  userName: z.string(),
  color: z.string()
});

export type UserJoinedEvent = z.infer<typeof userJoinedEventSchema>;

export const roomStateEventSchema = z.object({
  connectedUsers: z.array(connectedUserSchema),
  messages: z.array(realtimeChatMessageSchema),
  playback: playbackStateSchema
});

export type RoomStateEvent = z.infer<typeof roomStateEventSchema>;

export const userLeftEventSchema = z.object({
  userId: z.string(),
  roomId: z.string()
});

export type UserLeftEvent = z.infer<typeof userLeftEventSchema>;

export const roomErrorEventSchema = z.object({
  message: z.string()
});

export type RoomErrorEvent = z.infer<typeof roomErrorEventSchema>;

// ---------------------------------------------------------------------------
// Constant
// ---------------------------------------------------------------------------

export const REALTIME_MAX_MESSAGES = 100;
