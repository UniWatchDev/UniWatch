/** Routes where the main app chrome is reduced (full-screen experiences). */
const NAV_HIDDEN_PREFIXES = ['/room/'] as const;

/** Auth flows — hide redundant sign-in CTAs and optional create-room. */
export const AUTH_PATH_PREFIXES = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/change-password'
] as const;

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function shouldHideNav(pathname: string): boolean {
  return NAV_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
