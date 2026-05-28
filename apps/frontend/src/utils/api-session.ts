/** Message when the API rejects the request due to missing or invalid auth cookies. */
export const SIGN_IN_REQUIRED_MESSAGE =
  'Sign in required - open Login, then try again.';

export function assertOkOrSession(response: Response): void {
  if (response.status === 401) {
    throw new Error(SIGN_IN_REQUIRED_MESSAGE);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)}`);
  }
}
