import { useContext } from 'react';

import { CookieAuthContext } from '@/auth/cookie-auth-context-internal';
import type { CookieAuthModel } from '@/auth/use-cookie-auth-model';

export function useCookieAuth(): CookieAuthModel {
  const ctx = useContext(CookieAuthContext);
  if (ctx === null) {
    throw new Error('useCookieAuth must be used within CookieAuthProvider');
  }
  return ctx;
}
