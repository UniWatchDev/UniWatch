import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'node:crypto';

import type {
  ForgotPasswordBody,
  RegisterBody,
  ResetPasswordBody,
  ResendVerificationBody,
  VerifyEmailBody,
  VerifyEmailResponse
} from '@repo/schemas/auth';

import type {
  LoginBody,
  LoginResponse,
  LoginWithTokens
} from '@/auth/auth.dto';
import type { JwtAccessPayload } from '@/auth/auth.types';
import { MailService } from '@/mail/mail.service';
import type { Env } from '@/utils/env.validation';
import { parseDurationToMs } from '@/utils/parse-duration-ms';

type StoredUser = {
  userId: number;
  userName: string;
  phoneNumber: string;
  email: string;
  passwordHash: string;
  passwordVersion: number;
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

type PasswordResetChallenge = {
  userId: number;
  expiresAtMs: number;
};

const AUTH_RESEND_ACK_MESSAGE =
  'If an account exists for that email, next steps were recorded where applicable.';

type EmailVerificationDebug = {
  emailVerificationCode: string;
  emailVerificationExpiresAt: string;
};

type PasswordResetDebug = {
  passwordResetToken: string;
  passwordResetExpiresAt: string;
};

type RegisterResponseWithDebug = {
  userId: number;
  userName: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  debug: EmailVerificationDebug;
};

type AuthNonEnumeratingAckWithDebug = {
  ok: true;
  message: string;
  debug?: EmailVerificationDebug;
};

type ForgotPasswordAckWithDebug = {
  ok: true;
  message: string;
  debug?: PasswordResetDebug;
};

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
  /** opaque password-reset token → challenge */
  private readonly passwordResetByToken = new Map<string, PasswordResetChallenge>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService
  ) {}

  private useRealEmails(): boolean {
    return this.config.get('AUTH_USE_REAL_EMAILS', { infer: true });
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

  private revokeAllRefreshSessionsForUser(userId: number): void {
    for (const [token, session] of this.refreshByToken) {
      if (session.userId === userId) {
        this.refreshByToken.delete(token);
      }
    }
  }

  private clearPasswordResetForUser(userId: number): void {
    for (const [token, challenge] of this.passwordResetByToken) {
      if (challenge.userId === userId) {
        this.passwordResetByToken.delete(token);
      }
    }
  }

  private putPasswordReset(userId: number): { token: string; expiresAtIso: string } {
    const ttlMs = parseDurationToMs(
      this.config.get('AUTH_PASSWORD_RESET_EXPIRES_IN', { infer: true })
    );
    const token = randomBytes(32).toString('hex');
    const expiresAtMs = Date.now() + ttlMs;
    this.passwordResetByToken.set(token, { userId, expiresAtMs });
    return { token, expiresAtIso: new Date(expiresAtMs).toISOString() };
  }

  /**
   * Ensures the JWT was issued for the current password generation.
   * Call after signature verification (e.g. in `JwtAuthGuard`).
   */
  assertAccessTokenClaims(payload: JwtAccessPayload): void {
    if (typeof payload.pv !== 'number' || !Number.isFinite(payload.pv) || payload.pv < 0) {
      throw new UnauthorizedException('Invalid token');
    }
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId) || userId < 1) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = this.userByUserId.get(userId);
    if (!user || user.email !== payload.email) {
      throw new UnauthorizedException('Invalid token');
    }
    if (user.passwordVersion !== payload.pv) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async register(body: RegisterBody): Promise<RegisterResponseWithDebug> {
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
      passwordVersion: 0,
      createdAt,
      emailVerified: false
    };

    this.userByUserId.set(userId, row);
    this.userIdByEmail.set(emailKey, userId);
    this.userIdByUserName.set(userNameKey, userId);

    const { code, expiresAtIso } = this.putEmailVerification(emailKey);

    if (this.useRealEmails()) {
      try {
        await this.mail.sendEmailVerification(row.email, code, expiresAtIso);
      } catch {
        throw new ServiceUnavailableException(
          'Could not send verification email; try again later'
        );
      }
    }

    return {
      userId,
      userName: row.userName,
      phoneNumber: row.phoneNumber,
      email: row.email,
      createdAt: createdAt.toISOString(),
      emailVerified: false,
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

  async resendVerification(body: ResendVerificationBody): Promise<AuthNonEnumeratingAckWithDebug> {
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

    if (this.useRealEmails()) {
      try {
        await this.mail.sendEmailVerification(user.email, code, expiresAtIso);
      } catch {
        throw new ServiceUnavailableException(
          'Could not send verification email; try again later'
        );
      }
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

  async forgotPassword(body: ForgotPasswordBody): Promise<ForgotPasswordAckWithDebug> {
    const emailKey = body.email;
    const userId = this.userIdByEmail.get(emailKey);
    if (userId === undefined) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }
    const user = this.userByUserId.get(userId);
    if (!user || !user.emailVerified) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }

    this.clearPasswordResetForUser(userId);
    const { token, expiresAtIso } = this.putPasswordReset(userId);

    if (this.useRealEmails()) {
      try {
        await this.mail.sendPasswordReset(user.email, token, expiresAtIso);
      } catch {
        throw new ServiceUnavailableException(
          'Could not send password reset email; try again later'
        );
      }
    }

    return {
      ok: true,
      message: AUTH_RESEND_ACK_MESSAGE,
      debug: {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAtIso
      }
    };
  }

  async resetPassword(body: ResetPasswordBody): Promise<void> {
    const challenge = this.passwordResetByToken.get(body.token);
    if (challenge === undefined || Date.now() > challenge.expiresAtMs) {
      if (challenge !== undefined && Date.now() > challenge.expiresAtMs) {
        this.passwordResetByToken.delete(body.token);
      }
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = this.userByUserId.get(challenge.userId);
    if (!user) {
      this.passwordResetByToken.delete(body.token);
      throw new BadRequestException('Invalid or expired reset token');
    }

    this.passwordResetByToken.delete(body.token);
    user.passwordHash = await bcrypt.hash(body.newPassword, 12);
    user.passwordVersion += 1;
    this.revokeAllRefreshSessionsForUser(user.userId);
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
      {
        sub: String(user.userId),
        email: user.email,
        pv: user.passwordVersion
      },
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
      {
        sub: String(user.userId),
        email: user.email,
        pv: user.passwordVersion
      },
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
    this.assertAccessTokenClaims(payload);
    const userId = Number(payload.sub);
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
