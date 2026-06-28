export const ROOMS_ENDPOINT = '/api/rooms' as const;
export const ROOM_ENDPOINT = '/api/rooms/:id' as const;
export const ROOM_PREVIEW_ENDPOINT = '/api/rooms/:id/preview' as const;
export const ROOM_JOIN_ENDPOINT = '/api/rooms/:id/join' as const;
export const ROOM_LEAVE_ENDPOINT = '/api/rooms/:id/leave' as const;
export const ROOM_BLOCKED_USERS_ENDPOINT = '/api/rooms/:id/blocked-users' as const;
export const ROOM_BLOCKED_USER_ENDPOINT = '/api/rooms/:id/blocked-users/:userId' as const;
