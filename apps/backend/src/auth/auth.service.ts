import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import type {
  LoginBody,
  LoginResponse,
  LoginWithTokens,
  RegisterBody,
  RegisterResponse
} from '@/auth/auth.dto';
import type { JwtAccessPayload } from '@/auth/auth.types';
import type { Env } from '@/utils/env.validation';
import { parseDurationToMs } from '@/utils/parse-duration-ms';

type StoredUser = {
  userId: number;
  userName: string;
  phoneNumber: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

type RefreshSession = {
  userId: number;
  expiresAtMs: number;
};

@Injectable()
export class AuthService {
  private nextUserId = 1;
  private readonly userByUserId = new Map<number, StoredUser>();
  /** lowercase userName → userId */
  private readonly userIdByUserName = new Map<string, number>();
  /** email → userId */
  private readonly userIdByEmail = new Map<string, number>();
  /** E.164 phone → userId */
  private readonly userIdByPhoneNumber = new Map<string, number>();
  /** opaque refresh token → session */
  private readonly refreshByToken = new Map<string, RefreshSession>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>
  ) {}

  async register(body: RegisterBody): Promise<RegisterResponse> {
    const emailKey = body.email;
    const userNameKey = body.userName.toLowerCase();
    const phoneKey = body.phoneNumber;

    if (this.userIdByEmail.has(emailKey)) {
      throw new ConflictException('Email already registered');
    }
    if (this.userIdByUserName.has(userNameKey)) {
      throw new ConflictException('Username already taken');
    }
    if (this.userIdByPhoneNumber.has(phoneKey)) {
      throw new ConflictException('Phone number already registered');
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const userId = this.nextUserId++;
    const createdAt = new Date();

    const row: StoredUser = {
      userId,
      userName: body.userName,
      phoneNumber: body.phoneNumber,
      email: body.email,
      passwordHash,
      createdAt
    };

    this.userByUserId.set(userId, row);
    this.userIdByEmail.set(emailKey, userId);
    this.userIdByUserName.set(userNameKey, userId);
    this.userIdByPhoneNumber.set(phoneKey, userId);

    return {
      userId,
      userName: row.userName,
      phoneNumber: row.phoneNumber,
      email: row.email,
      createdAt: createdAt.toISOString()
    };
  }

  async login(body: LoginBody): Promise<LoginWithTokens> {
    const userId = this.userIdByEmail.get(body.email);
    if (userId === undefined) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const user = this.userByUserId.get(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const passwordOk = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: String(user.userId), email: user.email },
      {
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true })
      }
    );

    const refreshToken = randomBytes(32).toString('hex');
    const refreshMs = parseDurationToMs(
      this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true })
    );
    this.refreshByToken.set(refreshToken, {
      userId: user.userId,
      expiresAtMs: Date.now() + refreshMs
    });

    const userPayload: LoginResponse = {
      userId: user.userId,
      userName: user.userName,
      email: user.email
    };

    return {
      accessToken,
      refreshToken,
      user: userPayload
    };
  }

  /**
   * Rotates the refresh token and issues a new access JWT.
   * The previous refresh token is invalidated (one-time use).
   */
  async refresh(oldRefreshToken: string): Promise<LoginWithTokens> {
    const session = this.refreshByToken.get(oldRefreshToken);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    if (Date.now() > session.expiresAtMs) {
      this.refreshByToken.delete(oldRefreshToken);
      throw new UnauthorizedException('Invalid or expired session');
    }

    this.refreshByToken.delete(oldRefreshToken);

    const user = this.userByUserId.get(session.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: String(user.userId), email: user.email },
      {
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true })
      }
    );

    const refreshToken = randomBytes(32).toString('hex');
    const refreshMs = parseDurationToMs(
      this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true })
    );
    this.refreshByToken.set(refreshToken, {
      userId: user.userId,
      expiresAtMs: Date.now() + refreshMs
    });

    const userPayload: LoginResponse = {
      userId: user.userId,
      userName: user.userName,
      email: user.email
    };

    return {
      accessToken,
      refreshToken,
      user: userPayload
    };
  }

  /** Revokes the refresh session when the client sends a known refresh token. */
  logout(refreshToken: string | undefined): void {
    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
      this.refreshByToken.delete(refreshToken);
    }
  }

  /** Resolves the current user from an access JWT payload (must match stored user). */
  getMeForJwtPayload(payload: JwtAccessPayload): LoginResponse {
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId) || userId < 1) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = this.userByUserId.get(userId);
    if (!user || user.email !== payload.email) {
      throw new UnauthorizedException('Invalid token');
    }
    return {
      userId: user.userId,
      userName: user.userName,
      email: user.email
    };
  }
}
