import { InternalServerErrorException } from '@nestjs/common';
import type { Request } from 'express';

import '@/auth/auth.types';

/** `JwtAuthGuard` must run before handlers that call this. */
export function getAuthenticatedUserId(req: Request): string {
  const sub = req.authPayload?.sub;
  if (sub === undefined) {
    throw new InternalServerErrorException('Missing auth subject');
  }
  return sub;
}
