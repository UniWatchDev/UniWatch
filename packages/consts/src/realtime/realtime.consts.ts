// Socket.IO event names shared by the backend gateway and frontend clients.
// Keeping them here prevents the two sides from drifting on a typo'd literal.

export const REALTIME_CLIENT_EVENTS = {
  join: 'room:join',
  leave: 'room:leave',
  message: 'room:message',
  movieUpdated: 'room:movie-updated',
  playbackUpdate: 'room:playback-update',
  readyUpdate: 'room:ready-update',
  kickUser: 'room:kick-user',
  blockUser: 'room:block-user',
  // friend events
  friendRequestSend: 'friend:request-send',
  friendRequestRespond: 'friend:request-respond',
  friendRemove: 'friend:remove',
  dmSend: 'dm:send'
} as const;

export const REALTIME_SERVER_EVENTS = {
  connectionAck: 'connection:ack',
  roomState: 'room:state',
  presenceChanged: 'room:presence-changed',
  userJoined: 'room:user-joined',
  userLeft: 'room:user-left',
  messageReceived: 'room:message-received',
  movieUpdated: 'room:movie-updated',
  playbackChanged: 'room:playback-changed',
  roomClosed: 'room:closed',
  roomKicked: 'room:kicked',
  roomBanned: 'room:banned',
  error: 'room:error',
  // friend events
  friendRequestReceived: 'friend:request-received',
  friendRequestAccepted: 'friend:request-accepted',
  friendOnline: 'friend:online',
  friendOffline: 'friend:offline',
  friendJoinedRoom: 'friend:joined-room',
  friendLeftRoom: 'friend:left-room',
  dmReceived: 'dm:received'
} as const;

/** Default copy emitted on `room:closed` when the host deletes a room. */
export const ROOM_CLOSED_MESSAGE = 'The host has closed this room.' as const;

/** Default copy emitted on `room:kicked` when the host removes a viewer. */
export const ROOM_KICKED_MESSAGE =
  'The host removed you from this room. You can rejoin with the room link.' as const;

/** Default copy when a viewer is banned or tries to rejoin a banned room. */
export const ROOM_BANNED_MESSAGE =
  'The host banned you from this room. You cannot rejoin until they unblock you.' as const;

export type RealtimeClientEvent =
  (typeof REALTIME_CLIENT_EVENTS)[keyof typeof REALTIME_CLIENT_EVENTS];

export type RealtimeServerEvent =
  (typeof REALTIME_SERVER_EVENTS)[keyof typeof REALTIME_SERVER_EVENTS];
