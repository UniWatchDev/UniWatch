import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Match names used by the backend (`apps/backend/src/auth/auth.consts.ts`). */
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

/**
 * Fast redirect when neither auth cookie is present. Cookie presence does not
 * guarantee a valid session — `/app` still validates via `GET /api/auth/me`.
 */
export function middleware(request: NextRequest) {
  const hasAccess = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  const hasRefresh = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  if (hasAccess || hasRefresh) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.searchParams.set('login', '1');
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/app', '/app/:path*']
};
