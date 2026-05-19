import type { ReactNode } from 'react';

import { CookieAuthContext } from '@/auth/cookie-auth-context-internal';
import { useCookieAuthModel } from '@/auth/use-cookie-auth-model';

export function CookieAuthProvider({ children }: { readonly children: ReactNode }) {
  const value = useCookieAuthModel();
  return <CookieAuthContext.Provider value={value}>{children}</CookieAuthContext.Provider>;
}
