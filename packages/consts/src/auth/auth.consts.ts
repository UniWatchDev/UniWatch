/** Nest `@Controller()` segment (app uses global prefix `api`). */
export const AUTH_CONTROLLER_PATH = 'auth' as const;

export const AUTH_ROUTE_REGISTER = 'register' as const;
export const AUTH_ROUTE_LOGIN = 'login' as const;
export const AUTH_ROUTE_REFRESH = 'refresh' as const;
export const AUTH_ROUTE_ME = 'me' as const;
export const AUTH_ROUTE_LOGOUT = 'logout' as const;

/** POST — create account (JSON body). */
export const AUTH_REGISTER_ENDPOINT = '/api/auth/register' as const;

/** POST — credentials; sets HttpOnly access + refresh cookies. */
export const AUTH_LOGIN_ENDPOINT = '/api/auth/login' as const;

/** POST — rotate refresh session; updates cookies. */
export const AUTH_REFRESH_ENDPOINT = '/api/auth/refresh' as const;

/** GET — current user (requires access cookie + valid JWT). */
export const AUTH_ME_ENDPOINT = '/api/auth/me' as const;

/** POST — revoke refresh session when present; clears auth cookies. */
export const AUTH_LOGOUT_ENDPOINT = '/api/auth/logout' as const;
