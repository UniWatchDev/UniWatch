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
  blockUser: 'room:block-user'
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
  videoProcessing: 'room:video-processing',
  videoProgress: 'room:video-progress',
  videoPlayable: 'room:video-playable',
  videoReady: 'room:video-ready',
  videoFailed: 'room:video-failed',
  roomClosed: 'room:closed',
  error: 'room:error'
} as const;

/** Default copy emitted on `room:closed` when the host deletes a room. */
export const ROOM_CLOSED_MESSAGE = 'The host has closed this room.' as const;

export type RealtimeClientEvent =
  (typeof REALTIME_CLIENT_EVENTS)[keyof typeof REALTIME_CLIENT_EVENTS];

export type RealtimeServerEvent =
  (typeof REALTIME_SERVER_EVENTS)[keyof typeof REALTIME_SERVER_EVENTS];
