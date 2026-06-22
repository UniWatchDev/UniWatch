import { z } from 'zod';

import { roomStatusSchema } from '../rooms/room.schemas.js';

// ---------------------------------------------------------------------------
// Leaf schemas
// ---------------------------------------------------------------------------

// Re-exported so realtime consumers can keep importing the room status enum
// from a single place without duplicating the literal union.
export { roomStatusSchema };

export const connectedUserSchema = z.object({
  userId: z.string(),
  socketIds: z.array(z.string()).min(1),
  joinedAt: z.string().datetime(),
  userName: z.string(),
  color: z.string(),
  isReady: z.boolean()
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

export const playbackStateSchema = z.object({
  movieId: z.string().nullable(),
  isPlaying: z.boolean(),
  positionSec: z.number().nonnegative(),
  playbackRate: z.number().positive(),
  updatedAt: z.string().datetime()
});

export type PlaybackState = z.infer<typeof playbackStateSchema>;

export const countdownStateSchema = z.object({
  active: z.boolean(),
  endsAt: z.string().datetime().nullable()
});

export type CountdownState = z.infer<typeof countdownStateSchema>;

// ---------------------------------------------------------------------------
// In-memory room state (backend only — never persisted to MongoDB)
// ---------------------------------------------------------------------------

export const realtimeRoomStateSchema = z.object({
  roomId: z.string(),
  status: roomStatusSchema,
  connectedUsers: z.array(connectedUserSchema),
  /** Capped at the last 100 messages. */
  messages: z.array(realtimeChatMessageSchema),
  playback: playbackStateSchema,
  countdown: countdownStateSchema,
  publishedDurationSec: z.number().nonnegative().nullable()
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

export const roomMovieUpdatedPayloadSchema = z.strictObject({
  roomId: z.string().min(1),
  movieId: z.string().min(1)
});

export type RoomMovieUpdatedPayload = z.infer<typeof roomMovieUpdatedPayloadSchema>;

export const roomPlaybackUpdatePayloadSchema = z.strictObject({
  roomId: z.string().min(1),
  movieId: z.string().min(1),
  isPlaying: z.boolean(),
  positionSec: z.number().nonnegative(),
  playbackRate: z.number().positive(),
  force: z.boolean().optional(),
  /** When true with isPlaying:false, resets the watch session (position 0, all unready). */
  ended: z.boolean().optional()
});

export type RoomPlaybackUpdatePayload = z.infer<typeof roomPlaybackUpdatePayloadSchema>;

export const roomReadyUpdatePayloadSchema = z.strictObject({
  roomId: z.string().min(1),
  isReady: z.boolean()
});

export type RoomReadyUpdatePayload = z.infer<typeof roomReadyUpdatePayloadSchema>;

export const roomModerateUserPayloadSchema = z.strictObject({
  roomId: z.string().min(1),
  targetUserId: z.string().min(1)
});

export type RoomModerateUserPayload = z.infer<typeof roomModerateUserPayloadSchema>;

// ---------------------------------------------------------------------------
// Server → Client payloads
// ---------------------------------------------------------------------------

export const userJoinedEventSchema = z.object({
  userId: z.string(),
  roomId: z.string(),
  userName: z.string(),
  color: z.string(),
  isReady: z.boolean()
});

export type UserJoinedEvent = z.infer<typeof userJoinedEventSchema>;

export const roomStateEventSchema = z.object({
  status: roomStatusSchema,
  connectedUsers: z.array(connectedUserSchema),
  messages: z.array(realtimeChatMessageSchema),
  playback: playbackStateSchema,
  countdown: countdownStateSchema,
  publishedDurationSec: z.number().nonnegative().nullable()
});

export type RoomStateEvent = z.infer<typeof roomStateEventSchema>;

/** Slim presence update — no playback or chat history (avoids join/leave stutter). */
export const roomPresenceChangedEventSchema = z.object({
  roomId: z.string(),
  status: roomStatusSchema,
  connectedUsers: z.array(connectedUserSchema),
  countdown: countdownStateSchema
});

export type RoomPresenceChangedEvent = z.infer<typeof roomPresenceChangedEventSchema>;

export const roomMovieUpdatedEventSchema = z.strictObject({
  roomId: z.string(),
  movieId: z.string(),
  movieName: z.string().optional()
});

export type RoomMovieUpdatedEvent = z.infer<typeof roomMovieUpdatedEventSchema>;

export const roomPlaybackChangedEventSchema = z.strictObject({
  roomId: z.string(),
  actorUserId: z.string().nullable(),
  playback: playbackStateSchema
});

export type RoomPlaybackChangedEvent = z.infer<typeof roomPlaybackChangedEventSchema>;

export const userLeftEventSchema = z.object({
  userId: z.string(),
  roomId: z.string()
});

export type UserLeftEvent = z.infer<typeof userLeftEventSchema>;

export const roomErrorEventSchema = z.object({
  message: z.string()
});

export type RoomErrorEvent = z.infer<typeof roomErrorEventSchema>;

export const roomClosedEventSchema = z.strictObject({
  roomId: z.string(),
  message: z.string()
});

export type RoomClosedEvent = z.infer<typeof roomClosedEventSchema>;

// ---------------------------------------------------------------------------
// Async video processing lifecycle (server → client)
// ---------------------------------------------------------------------------

export const videoProcessingEventSchema = z.strictObject({
  roomId: z.string(),
  videoId: z.string()
});

export type VideoProcessingEvent = z.infer<typeof videoProcessingEventSchema>;

export const videoProgressEventSchema = z.strictObject({
  roomId: z.string(),
  videoId: z.string(),
  percent: z.number().min(0).max(100)
});

export type VideoProgressEvent = z.infer<typeof videoProgressEventSchema>;

export const videoReadyEventSchema = z.strictObject({
  roomId: z.string(),
  videoId: z.string(),
  playbackUrl: z.string(),
  availableQualities: z.array(z.number())
});

export type VideoReadyEvent = z.infer<typeof videoReadyEventSchema>;

export const videoPlayableEventSchema = z.strictObject({
  roomId: z.string(),
  videoId: z.string(),
  playbackUrl: z.string(),
  availableQualities: z.array(z.number()),
  partial: z.literal(true)
});

export type VideoPlayableEvent = z.infer<typeof videoPlayableEventSchema>;

export const videoFailedEventSchema = z.strictObject({
  roomId: z.string(),
  videoId: z.string(),
  errorMessage: z.string()
});

export type VideoFailedEvent = z.infer<typeof videoFailedEventSchema>;

// ---------------------------------------------------------------------------
// Constant
// ---------------------------------------------------------------------------

export const REALTIME_MAX_MESSAGES = 100;
