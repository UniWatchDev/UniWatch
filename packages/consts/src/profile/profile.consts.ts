/** Nest `@Controller()` segment (app uses global prefix `api`). */
export const USERS_CONTROLLER_PATH = 'users' as const;

/** PATCH — update own profile (requires access cookie). */
export const AUTH_PATCH_ME_ENDPOINT = '/api/auth/me' as const;

/** GET — public profile card by username (requires access cookie). */
export const USERS_BY_USERNAME_ENDPOINT = '/api/users/:userName' as const;
