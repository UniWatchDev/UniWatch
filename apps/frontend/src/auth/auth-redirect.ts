import type { NavigateFunction } from 'react-router-dom';

export const LOGIN_AUTH_REQUIRED_QUERY = 'auth=required' as const;

export const LOGIN_AUTH_REQUIRED_PATH = `/login?${LOGIN_AUTH_REQUIRED_QUERY}` as const;

export function redirectToLogin(
  navigate: NavigateFunction,
  options?: { readonly replace?: boolean }
): void {
  void navigate(LOGIN_AUTH_REQUIRED_PATH, { replace: options?.replace ?? false });
}
