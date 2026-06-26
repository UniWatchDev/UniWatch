/** NestJS @Controller() path segment (no /api prefix — that's global). */
export const FRIENDS_CONTROLLER_PATH = 'friends' as const;

/** GET /api/friends — friend list  |  DELETE /api/friends/:userId — unfriend */
export const FRIENDS_ENDPOINT = '/api/friends' as const;

/** DELETE /api/friends/:userId */
export const FRIEND_ENDPOINT = '/api/friends/:userId' as const;

/** GET /api/friends/requests — inbox  |  POST /api/friends/requests — send request */
export const FRIENDS_REQUESTS_ENDPOINT = '/api/friends/requests' as const;

/** PATCH /api/friends/requests/:requestId — respond to request */
export const FRIEND_REQUEST_ENDPOINT = '/api/friends/requests/:requestId' as const;
