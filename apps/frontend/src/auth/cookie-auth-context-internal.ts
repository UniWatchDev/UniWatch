import { createContext } from 'react';

import type { CookieAuthModel } from '@/auth/use-cookie-auth-model';

export const CookieAuthContext = createContext<CookieAuthModel | null>(null);
