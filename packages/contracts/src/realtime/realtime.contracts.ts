import { REALTIME_CLIENT_EVENTS, REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';
import {
  joinRoomPayloadSchema,
  leaveRoomPayloadSchema,
  realtimeChatMessageSchema,
  roomClosedEventSchema,
  roomErrorEventSchema,
  roomKickedEventSchema,
  roomBannedEventSchema,
  roomModerateUserPayloadSchema,
  roomMovieUpdatedEventSchema,
  roomMovieUpdatedPayloadSchema,
  roomPlaybackChangedEventSchema,
  roomPlaybackUpdatePayloadSchema,
  roomPresenceChangedEventSchema,
  roomReadyUpdatePayloadSchema,
  roomStateEventSchema,
  sendMessagePayloadSchema,
  userJoinedEventSchema,
  userLeftEventSchema,
  type JoinRoomPayload,
  type LeaveRoomPayload,
  type RealtimeChatMessage,
  type RoomClosedEvent,
  type RoomErrorEvent,
  type RoomKickedEvent,
  type RoomBannedEvent,
  type RoomModerateUserPayload,
  type RoomMovieUpdatedEvent,
  type RoomMovieUpdatedPayload,
  type RoomPlaybackChangedEvent,
  type RoomPlaybackUpdatePayload,
  type RoomPresenceChangedEvent,
  type RoomReadyUpdatePayload,
  type RoomStateEvent,
  type SendMessagePayload,
  type UserJoinedEvent,
  type UserLeftEvent
} from '@repo/schemas/realtime';
import type { z } from 'zod';

export type SocketEventDirection = 'client-to-server' | 'server-to-client';

/**
 * The socket equivalent of {@link EndpointContract}: it ties an event name to
 * its direction and the Zod schema that validates its payload, so both sides of
 * the wire validate against the same source of truth.
 */
export type SocketEventContract<TPayload> = {
  event: string;
  direction: SocketEventDirection;
  payloadSchema: z.ZodType<TPayload>;
};

export type SocketEventPayload<C> =
  C extends SocketEventContract<infer P> ? P : never;

// ---------------------------------------------------------------------------
// Client -> Server
// ---------------------------------------------------------------------------

export const joinRoomContract: SocketEventContract<JoinRoomPayload> = {
  event: REALTIME_CLIENT_EVENTS.join,
  direction: 'client-to-server',
  payloadSchema: joinRoomPayloadSchema
};

export const leaveRoomContract: SocketEventContract<LeaveRoomPayload> = {
  event: REALTIME_CLIENT_EVENTS.leave,
  direction: 'client-to-server',
  payloadSchema: leaveRoomPayloadSchema
};

export const sendMessageContract: SocketEventContract<SendMessagePayload> = {
  event: REALTIME_CLIENT_EVENTS.message,
  direction: 'client-to-server',
  payloadSchema: sendMessagePayloadSchema
};

export const movieUpdatedRequestContract: SocketEventContract<RoomMovieUpdatedPayload> = {
  event: REALTIME_CLIENT_EVENTS.movieUpdated,
  direction: 'client-to-server',
  payloadSchema: roomMovieUpdatedPayloadSchema
};

export const playbackUpdateContract: SocketEventContract<RoomPlaybackUpdatePayload> = {
  event: REALTIME_CLIENT_EVENTS.playbackUpdate,
  direction: 'client-to-server',
  payloadSchema: roomPlaybackUpdatePayloadSchema
};

export const readyUpdateContract: SocketEventContract<RoomReadyUpdatePayload> = {
  event: REALTIME_CLIENT_EVENTS.readyUpdate,
  direction: 'client-to-server',
  payloadSchema: roomReadyUpdatePayloadSchema
};

export const kickUserContract: SocketEventContract<RoomModerateUserPayload> = {
  event: REALTIME_CLIENT_EVENTS.kickUser,
  direction: 'client-to-server',
  payloadSchema: roomModerateUserPayloadSchema
};

export const blockUserContract: SocketEventContract<RoomModerateUserPayload> = {
  event: REALTIME_CLIENT_EVENTS.blockUser,
  direction: 'client-to-server',
  payloadSchema: roomModerateUserPayloadSchema
};

// ---------------------------------------------------------------------------
// Server -> Client
// ---------------------------------------------------------------------------

export const roomStateContract: SocketEventContract<RoomStateEvent> = {
  event: REALTIME_SERVER_EVENTS.roomState,
  direction: 'server-to-client',
  payloadSchema: roomStateEventSchema
};

export const presenceChangedContract: SocketEventContract<RoomPresenceChangedEvent> = {
  event: REALTIME_SERVER_EVENTS.presenceChanged,
  direction: 'server-to-client',
  payloadSchema: roomPresenceChangedEventSchema
};

export const userJoinedContract: SocketEventContract<UserJoinedEvent> = {
  event: REALTIME_SERVER_EVENTS.userJoined,
  direction: 'server-to-client',
  payloadSchema: userJoinedEventSchema
};

export const userLeftContract: SocketEventContract<UserLeftEvent> = {
  event: REALTIME_SERVER_EVENTS.userLeft,
  direction: 'server-to-client',
  payloadSchema: userLeftEventSchema
};

export const messageReceivedContract: SocketEventContract<RealtimeChatMessage> = {
  event: REALTIME_SERVER_EVENTS.messageReceived,
  direction: 'server-to-client',
  payloadSchema: realtimeChatMessageSchema
};

export const movieUpdatedEventContract: SocketEventContract<RoomMovieUpdatedEvent> = {
  event: REALTIME_SERVER_EVENTS.movieUpdated,
  direction: 'server-to-client',
  payloadSchema: roomMovieUpdatedEventSchema
};

export const playbackChangedContract: SocketEventContract<RoomPlaybackChangedEvent> = {
  event: REALTIME_SERVER_EVENTS.playbackChanged,
  direction: 'server-to-client',
  payloadSchema: roomPlaybackChangedEventSchema
};

export const roomErrorContract: SocketEventContract<RoomErrorEvent> = {
  event: REALTIME_SERVER_EVENTS.error,
  direction: 'server-to-client',
  payloadSchema: roomErrorEventSchema
};

export const roomClosedContract: SocketEventContract<RoomClosedEvent> = {
  event: REALTIME_SERVER_EVENTS.roomClosed,
  direction: 'server-to-client',
  payloadSchema: roomClosedEventSchema
};

export const roomKickedContract: SocketEventContract<RoomKickedEvent> = {
  event: REALTIME_SERVER_EVENTS.roomKicked,
  direction: 'server-to-client',
  payloadSchema: roomKickedEventSchema
};

export const roomBannedContract: SocketEventContract<RoomBannedEvent> = {
  event: REALTIME_SERVER_EVENTS.roomBanned,
  direction: 'server-to-client',
  payloadSchema: roomBannedEventSchema
};
