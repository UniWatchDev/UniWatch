import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

import { AUTH_ACCESS_COOKIE } from '@/auth/auth.consts';
import { AuthService } from '@/auth/auth.service';
import type { JwtAccessPayload } from '@/auth/auth.types';
import { UserRepository } from '@/auth/user.repository';
import { parseCookies } from '@/realtime/utils/parse-cookies';
import type { SocketUserInfo } from '@/realtime/realtime.types';

@Injectable()
export class SocketAuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly authService: AuthService,
    private readonly users: UserRepository
  ) {}

  /** Resolve the authenticated user behind a socket, or `null` if unauthorized. */
  async authenticate(socket: Socket): Promise<SocketUserInfo | null> {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const token = cookies[AUTH_ACCESS_COOKIE];
    if (!token) return null;

    try {
      const payload = await this.jwt.verifyAsync<JwtAccessPayload>(token);
      await this.authService.assertAccessTokenClaims(payload);
      const user = await this.users.findById(payload.sub);
      if (!user) return null;

      return { userId: payload.sub, userName: user.userName };
    } catch {
      return null;
    }
  }
}
