/** Routes that show the site footer. */
const FOOTER_SHOWN_PATHS = ['/', '/rooms', '/about', '/privacy'] as const;

export function shouldShowFooter(pathname: string): boolean {
  return (
    (FOOTER_SHOWN_PATHS as readonly string[]).includes(pathname) ||
    pathname.startsWith('/u/')
  );
}

/** Routes where the main app chrome is reduced (full-screen experiences, auth flows). */
const NAV_HIDDEN_PREFIXES = [
  '/room/',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/change-password',
] as const;

/** Auth flows - hide redundant sign-in CTAs and optional create-room. */
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
