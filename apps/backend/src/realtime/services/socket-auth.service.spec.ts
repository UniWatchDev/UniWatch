import type { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

import type { AuthService } from '@/auth/auth.service';
import type { UserRepository } from '@/auth/user.repository';
import { SocketAuthService } from '@/realtime/services/socket-auth.service';

describe('SocketAuthService', () => {
  let jwt: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;
  let authService: jest.Mocked<Pick<AuthService, 'assertAccessTokenClaims'>>;
  let users: jest.Mocked<Pick<UserRepository, 'findById'>>;
  let service: SocketAuthService;

  function socketWithCookie(cookie?: string): Socket {
    return { handshake: { headers: cookie === undefined ? {} : { cookie } } } as unknown as Socket;
  }

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn() };
    authService = { assertAccessTokenClaims: jest.fn() };
    users = { findById: jest.fn() };
    service = new SocketAuthService(
      jwt as unknown as JwtService,
      authService as unknown as AuthService,
      users as unknown as UserRepository
    );
  });

  it('returns null when no access cookie is present', async () => {
    const result = await service.authenticate(socketWithCookie());

    expect(result).toBeNull();
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('resolves the authenticated user for a valid token', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@a.com', pv: 1 } as never);
    authService.assertAccessTokenClaims.mockResolvedValue(undefined as never);
    users.findById.mockResolvedValue({ userName: 'Ada' } as never);

    const result = await service.authenticate(socketWithCookie('access_token=abc.def.ghi'));

    expect(result).toEqual({ userId: 'user-1', userName: 'Ada' });
  });

  it('returns null when the token fails verification', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('bad token'));

    const result = await service.authenticate(socketWithCookie('access_token=expired'));

    expect(result).toBeNull();
  });

  it('returns null when claim assertion fails', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@a.com', pv: 1 } as never);
    authService.assertAccessTokenClaims.mockRejectedValue(new Error('stale pv'));

    const result = await service.authenticate(socketWithCookie('access_token=abc'));

    expect(result).toBeNull();
  });

  it('returns null when the user no longer exists', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@a.com', pv: 1 } as never);
    authService.assertAccessTokenClaims.mockResolvedValue(undefined as never);
    users.findById.mockResolvedValue(null as never);

    const result = await service.authenticate(socketWithCookie('access_token=abc'));

    expect(result).toBeNull();
  });
});
