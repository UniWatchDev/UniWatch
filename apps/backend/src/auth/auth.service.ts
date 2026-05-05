import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'node:crypto';

import type {
  AuthNonEnumeratingAck,
  LoginBody,
  LoginResponse,
  LoginWithTokens,
  RegisterBody,
  RegisterResponse,
  ResendVerificationBody,
  VerifyEmailBody,
  VerifyEmailResponse
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
  emailVerified: boolean;
};

type RefreshSession = {
  userId: number;
  expiresAtMs: number;
};

type EmailVerificationChallenge = {
  code: string;
  expiresAtMs: number;
};

const AUTH_RESEND_ACK_MESSAGE =
  'If an account exists for that email, next steps were recorded where applicable.';

function generateSixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

@Injectable()
export class AuthService {
  private nextUserId = 1;
  private readonly userByUserId = new Map<number, StoredUser>();
  /** lowercase userName → userId */
  private readonly userIdByUserName = new Map<string, number>();
  /** email → userId */
  private readonly userIdByEmail = new Map<string, number>();
  /** opaque refresh token → session */
  private readonly refreshByToken = new Map<string, RefreshSession>();
  /** lowercase email → pending verification */
  private readonly emailVerificationByEmail = new Map<
    string,
    EmailVerificationChallenge
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>
  ) {}

  private debugEmailTokens(): boolean {
    return this.config.get('AUTH_DEBUG_EMAIL_TOKENS', { infer: true });
  }

  private putEmailVerification(emailKey: string): {
    code: string;
    expiresAtIso: string;
  } {
    const code = generateSixDigitCode();
    const ttlMs = parseDurationToMs(
      this.config.get('AUTH_EMAIL_VERIFICATION_EXPIRES_IN', { infer: true })
    );
    const expiresAtMs = Date.now() + ttlMs;
    this.emailVerificationByEmail.set(emailKey, { code, expiresAtMs });
    return { code, expiresAtIso: new Date(expiresAtMs).toISOString() };
  }

  async register(body: RegisterBody): Promise<RegisterResponse> {
    const emailKey = body.email;
    const userNameKey = body.userName.toLowerCase();

    if (this.userIdByEmail.has(emailKey)) {
      throw new ConflictException('Email already registered');
    }
    if (this.userIdByUserName.has(userNameKey)) {
      throw new ConflictException('Username already taken');
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
      createdAt,
      emailVerified: false
    };

    this.userByUserId.set(userId, row);
    this.userIdByEmail.set(emailKey, userId);
    this.userIdByUserName.set(userNameKey, userId);

    const { code, expiresAtIso } = this.putEmailVerification(emailKey);

    const base: RegisterResponse = {
      userId,
      userName: row.userName,
      phoneNumber: row.phoneNumber,
      email: row.email,
      createdAt: createdAt.toISOString(),
      emailVerified: false
    };

    if (!this.debugEmailTokens()) {
      return base;
    }

    return {
      ...base,
      debug: {
        emailVerificationCode: code,
        emailVerificationExpiresAt: expiresAtIso
      }
    };
  }

  verifyEmail(body: VerifyEmailBody): VerifyEmailResponse {
    const emailKey = body.email;
    const pending = this.emailVerificationByEmail.get(emailKey);
    if (
      pending === undefined ||
      Date.now() > pending.expiresAtMs ||
      pending.code !== body.code
    ) {
      if (pending !== undefined && Date.now() > pending.expiresAtMs) {
        this.emailVerificationByEmail.delete(emailKey);
      }
      throw new BadRequestException('Invalid or expired verification code');
    }

    const userId = this.userIdByEmail.get(emailKey);
    if (userId === undefined) {
      this.emailVerificationByEmail.delete(emailKey);
      throw new BadRequestException('Invalid or expired verification code');
    }

    const user = this.userByUserId.get(userId);
    if (!user || user.email !== emailKey) {
      this.emailVerificationByEmail.delete(emailKey);
      throw new BadRequestException('Invalid or expired verification code');
    }

    this.emailVerificationByEmail.delete(emailKey);
    user.emailVerified = true;

    return {
      emailVerified: true,
      userId: user.userId,
      userName: user.userName,
      email: user.email
    };
  }

  resendVerification(body: ResendVerificationBody): AuthNonEnumeratingAck {
    const emailKey = body.email;
    const userId = this.userIdByEmail.get(emailKey);
    if (userId === undefined) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }
    const user = this.userByUserId.get(userId);
    if (!user || user.emailVerified) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }

    const { code, expiresAtIso } = this.putEmailVerification(emailKey);
    if (!this.debugEmailTokens()) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }
    return {
      ok: true,
      message: AUTH_RESEND_ACK_MESSAGE,
      debug: {
        emailVerificationCode: code,
        emailVerificationExpiresAt: expiresAtIso
      }
    };
  }

  async login(body: LoginBody): Promise<LoginWithTokens> {
    const key = body.identifier;
    const userId = key.includes('@')
      ? this.userIdByEmail.get(key)
      : this.userIdByUserName.get(key);
    if (userId === undefined) {
      throw new UnauthorizedException('Invalid email, username, or password');
    }
    const user = this.userByUserId.get(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid email, username, or password');
    }
    const passwordOk = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid email, username, or password');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
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
      email: user.email,
      emailVerified: user.emailVerified
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
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
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
      email: user.email,
      emailVerified: user.emailVerified
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
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }
    return {
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      emailVerified: user.emailVerified
    };
  }
}
