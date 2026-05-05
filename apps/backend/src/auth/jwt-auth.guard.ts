import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { AUTH_ACCESS_COOKIE } from '@/auth/auth.consts';
import { AuthService } from '@/auth/auth.service';
import type { JwtAccessPayload } from '@/auth/auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.readAccessToken(req);
    if (token === undefined) {
      throw new UnauthorizedException('Missing or invalid access token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token);
      this.authService.assertAccessTokenClaims(payload);
      req.authPayload = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Missing or invalid access token');
    }
  }

  private readAccessToken(req: Request): string | undefined {
    const jar: unknown = req.cookies;
    if (jar === null || typeof jar !== 'object') {
      return undefined;
    }
    const record = jar as Record<string, unknown>;
    const value = record[AUTH_ACCESS_COOKIE];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
