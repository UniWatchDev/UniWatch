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

import type { LoginBody, LoginResponse, LoginWithTokens } from '@/auth/auth.dto';
import type { JwtAccessPayload } from '@/auth/auth.types';
import { UserRepository } from '@/auth/user.repository';
import { MailService } from '@/mail/mail.service';
import type { Env } from '@/utils/env.validation';
import { parseDurationToMs } from '@/utils/parse-duration-ms';

type RefreshSession = {
  userId: string;
  expiresAtMs: number;
};

type EmailVerificationChallenge = {
  code: string;
  expiresAtMs: number;
};

type PasswordResetChallenge = {
  userId: string;
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
  userId: string;
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
  // Ephemeral session state stays in memory (expires, not worth persisting)
  private readonly refreshByToken = new Map<string, RefreshSession>();
  private readonly emailVerificationByEmail = new Map<
    string,
    EmailVerificationChallenge
  >();
  private readonly passwordResetByToken = new Map<
    string,
    PasswordResetChallenge
  >();

  constructor(
    private readonly users: UserRepository,
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

  private revokeAllRefreshSessionsForUser(userId: string): void {
    for (const [token, session] of this.refreshByToken) {
      if (session.userId === userId) {
        this.refreshByToken.delete(token);
      }
    }
  }

  private clearPasswordResetForUser(userId: string): void {
    for (const [token, challenge] of this.passwordResetByToken) {
      if (challenge.userId === userId) {
        this.passwordResetByToken.delete(token);
      }
    }
  }

  private putPasswordReset(userId: string): {
    token: string;
    expiresAtIso: string;
  } {
    const ttlMs = parseDurationToMs(
      this.config.get('AUTH_PASSWORD_RESET_EXPIRES_IN', { infer: true })
    );
    const token = randomBytes(32).toString('hex');
    const expiresAtMs = Date.now() + ttlMs;
    this.passwordResetByToken.set(token, { userId, expiresAtMs });
    return { token, expiresAtIso: new Date(expiresAtMs).toISOString() };
  }

  async assertAccessTokenClaims(payload: JwtAccessPayload): Promise<void> {
    if (
      typeof payload.pv !== 'number' ||
      !Number.isFinite(payload.pv) ||
      payload.pv < 0
    ) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.users.findById(payload.sub);
    if (!user || user.email !== payload.email) {
      throw new UnauthorizedException('Invalid token');
    }
    if (user.passwordVersion !== payload.pv) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async register(body: RegisterBody): Promise<RegisterResponseWithDebug> {
    const existingEmail = await this.users.findByEmail(body.email);
    if (existingEmail) throw new ConflictException('Email already registered');

    const existingUserName = await this.users.findByUserName(body.userName);
    if (existingUserName) throw new ConflictException('Username already taken');

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await this.users.create({
      email: body.email,
      userName: body.userName,
      phoneNumber: body.phoneNumber,
      passwordHash
    });

    const userId = user._id.toString();
    const { code, expiresAtIso } = this.putEmailVerification(body.email);

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
      userId,
      userName: user.userName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      emailVerified: false,
      debug: {
        emailVerificationCode: code,
        emailVerificationExpiresAt: expiresAtIso
      }
    };
  }

  async verifyEmail(body: VerifyEmailBody): Promise<VerifyEmailResponse> {
    const pending = this.emailVerificationByEmail.get(body.email);
    if (
      pending === undefined ||
      Date.now() > pending.expiresAtMs ||
      pending.code !== body.code
    ) {
      if (pending !== undefined && Date.now() > pending.expiresAtMs) {
        this.emailVerificationByEmail.delete(body.email);
      }
      throw new BadRequestException('Invalid or expired verification code');
    }

    const user = await this.users.findByEmail(body.email);
    if (!user) {
      this.emailVerificationByEmail.delete(body.email);
      throw new BadRequestException('Invalid or expired verification code');
    }

    this.emailVerificationByEmail.delete(body.email);
    await this.users.markEmailVerified(user._id.toString());

    return {
      emailVerified: true,
      userId: user._id.toString(),
      userName: user.userName,
      email: user.email
    };
  }

  async resendVerification(
    body: ResendVerificationBody
  ): Promise<AuthNonEnumeratingAckWithDebug> {
    const user = await this.users.findByEmail(body.email);
    if (!user || user.emailVerified) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }

    const { code, expiresAtIso } = this.putEmailVerification(body.email);

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

  async forgotPassword(
    body: ForgotPasswordBody
  ): Promise<ForgotPasswordAckWithDebug> {
    const user = await this.users.findByEmail(body.email);
    if (!user || !user.emailVerified) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }

    const userId = user._id.toString();
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
      debug: { passwordResetToken: token, passwordResetExpiresAt: expiresAtIso }
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

    this.passwordResetByToken.delete(body.token);
    const newHash = await bcrypt.hash(body.newPassword, 12);
    await this.users.updatePassword(challenge.userId, newHash);
    this.revokeAllRefreshSessionsForUser(challenge.userId);
  }

  async login(body: LoginBody): Promise<LoginWithTokens> {
    const user = await this.users.findByIdentifier(body.identifier);
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

    const userId = user._id.toString();
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email: user.email, pv: user.passwordVersion },
      { expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }) }
    );

    const refreshToken = randomBytes(32).toString('hex');
    const refreshMs = parseDurationToMs(
      this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true })
    );
    this.refreshByToken.set(refreshToken, {
      userId,
      expiresAtMs: Date.now() + refreshMs
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId,
        userName: user.userName,
        email: user.email,
        emailVerified: user.emailVerified
      }
    };
  }

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

    const user = await this.users.findById(session.userId);
    if (!user || !user.emailVerified) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const userId = user._id.toString();
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email: user.email, pv: user.passwordVersion },
      { expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }) }
    );

    const refreshToken = randomBytes(32).toString('hex');
    const refreshMs = parseDurationToMs(
      this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true })
    );
    this.refreshByToken.set(refreshToken, {
      userId,
      expiresAtMs: Date.now() + refreshMs
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId,
        userName: user.userName,
        email: user.email,
        emailVerified: user.emailVerified
      }
    };
  }

  logout(refreshToken: string | undefined): void {
    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
      this.refreshByToken.delete(refreshToken);
    }
  }

  async getMeForJwtPayload(payload: JwtAccessPayload): Promise<LoginResponse> {
    await this.assertAccessTokenClaims(payload);
    const user = await this.users.findById(payload.sub);
    if (!user || !user.emailVerified) {
      throw new UnauthorizedException('Invalid token');
    }
    return {
      userId: user._id.toString(),
      userName: user.userName,
      email: user.email,
      emailVerified: user.emailVerified
    };
  }
}
