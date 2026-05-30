import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { Types } from 'mongoose';

import type {
  ChangePasswordBody,
  ForgotPasswordBody,
  RegisterBody,
  ResetPasswordBody,
  ResendVerificationBody,
  VerifyEmailBody,
  VerifyEmailResponse
} from '@repo/schemas/auth';
import { avatarPresetIdSchema, type UpdateProfileBody } from '@repo/schemas/profile';

import type {
  LoginBody,
  LoginResponse,
  LoginWithTokens,
  RegisterResponse
} from '@/auth/auth.dto';
import type { JwtAccessPayload } from '@/auth/auth.types';
import { RefreshSessionRepository } from '@/auth/refresh-session.repository';
import { UserRepository } from '@/auth/user.repository';
import type { UserDocument } from '@/auth/user.schema';
import { MailService } from '@/mail/mail.service';
import type { Env } from '@/utils/env.validation';
import { isDuplicateKeyError } from '@/utils/is-duplicate-key-error';
import { parseDurationToMs } from '@/utils/parse-duration-ms';

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

type RegisterResponseWithDebug = RegisterResponse & { debug: EmailVerificationDebug };

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

function normalizedRegisterLastName(last: string | undefined): string | undefined {
  return last !== undefined && last.length > 0 ? last : undefined;
}

function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function isValidObjectIdString(value: string): boolean {
  return Types.ObjectId.isValid(value) && new Types.ObjectId(value).toString() === value;
}

function userToLoginResponse(doc: UserDocument): LoginResponse {
  const userId = doc._id.toString();
  return {
    userId,
    userName: doc.userName,
    firstName: doc.firstName,
    ...(doc.lastName !== undefined && doc.lastName.length > 0
      ? { lastName: doc.lastName }
      : {}),
    email: doc.email,
    phoneNumber: doc.phoneNumber,
    emailVerified: doc.emailVerified,
    isProfilePrivate: doc.isProfilePrivate,
    avatarId: avatarPresetIdSchema.parse(doc.avatarId),
    createdAt: doc.createdAt.toISOString()
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UserRepository,
    private readonly refreshSessions: RefreshSessionRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService
  ) {}

  private useRealEmails(): boolean {
    return this.config.get('AUTH_USE_REAL_EMAILS', { infer: true });
  }

  private authDebug(message: string): void {
    if (!this.config.get('AUTH_DEBUG_LOG', { infer: true })) {
      return;
    }
    this.logger.debug(message);
  }

  private async issueNewSession(doc: UserDocument): Promise<LoginWithTokens> {
    const userId = doc._id.toString();
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email: doc.email,
        pv: doc.passwordVersion
      },
      {
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true })
      }
    );

    const refreshToken = randomBytes(32).toString('hex');
    const refreshMs = parseDurationToMs(
      this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true })
    );
    const expiresAt = new Date(Date.now() + refreshMs);
    await this.refreshSessions.createSession(userId, hashOpaqueToken(refreshToken), expiresAt);

    return {
      accessToken,
      refreshToken,
      user: userToLoginResponse(doc)
    };
  }

  /**
   * Ensures the JWT was issued for the current password generation.
   * Call after signature verification (e.g. in `JwtAuthGuard`).
   */
  async assertAccessTokenClaims(payload: JwtAccessPayload): Promise<void> {
    if (typeof payload.pv !== 'number' || !Number.isFinite(payload.pv) || payload.pv < 0) {
      throw new UnauthorizedException('Invalid token');
    }
    const sub = payload.sub;
    if (!isValidObjectIdString(sub)) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.users.findById(sub);
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

    const existingEmail = await this.users.findByEmail(emailKey);
    if (existingEmail) {
      this.authDebug('register_fail: email_conflict');
      throw new ConflictException('Email already registered');
    }
    const existingUserName = await this.users.findByUserName(userNameKey);
    if (existingUserName) {
      this.authDebug('register_fail: username_conflict');
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const lastNameStored = normalizedRegisterLastName(body.lastName);
    const code = generateSixDigitCode();
    const ttlMs = parseDurationToMs(
      this.config.get('AUTH_EMAIL_VERIFICATION_EXPIRES_IN', { infer: true })
    );
    const emailVerificationExpiresAt = new Date(Date.now() + ttlMs);

    let doc: UserDocument;
    try {
      doc = await this.users.create({
        email: emailKey,
        userName: body.userName,
        firstName: body.firstName,
        ...(lastNameStored !== undefined ? { lastName: lastNameStored } : {}),
        phoneNumber: body.phoneNumber,
        passwordHash,
        emailVerificationCode: code,
        emailVerificationExpiresAt
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException('Email or username already in use');
      }
      this.logger.error(err instanceof Error ? err.message : 'User create failed');
      throw new ServiceUnavailableException('Could not complete registration; try again later');
    }

    const expiresAtIso = emailVerificationExpiresAt.toISOString();

    if (this.useRealEmails()) {
      try {
        await this.mail.sendEmailVerification(doc.email, code, expiresAtIso);
      } catch (err) {
        this.logger.error(
          err instanceof Error ? err.message : 'sendEmailVerification failed'
        );
        throw new ServiceUnavailableException(
          'Could not send verification email; try again later'
        );
      }
    }

    const userId = doc._id.toString();
    this.authDebug('register_ok');
    return {
      userId,
      userName: doc.userName,
      firstName: doc.firstName,
      ...(lastNameStored !== undefined ? { lastName: lastNameStored } : {}),
      phoneNumber: doc.phoneNumber,
      email: doc.email,
      createdAt: doc.createdAt.toISOString(),
      emailVerified: false,
      debug: {
        emailVerificationCode: code,
        emailVerificationExpiresAt: expiresAtIso
      }
    };
  }

  async verifyEmail(body: VerifyEmailBody): Promise<VerifyEmailResponse> {
    const emailKey = body.email;
    const user = await this.users.findByEmail(emailKey);
    if (
      user === null ||
      user.emailVerificationCode === undefined ||
      user.emailVerificationExpiresAt === undefined
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    if (Date.now() > user.emailVerificationExpiresAt.getTime()) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    if (user.emailVerificationCode !== body.code) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const updated = await this.users.markEmailVerified(user._id.toString());
    if (!updated) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    return {
      emailVerified: true,
      userId: updated._id.toString(),
      userName: updated.userName,
      email: updated.email
    };
  }

  async resendVerification(body: ResendVerificationBody): Promise<AuthNonEnumeratingAckWithDebug> {
    const emailKey = body.email;
    const user = await this.users.findByEmail(emailKey);
    if (user === null || user.emailVerified) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }

    const code = generateSixDigitCode();
    const ttlMs = parseDurationToMs(
      this.config.get('AUTH_EMAIL_VERIFICATION_EXPIRES_IN', { infer: true })
    );
    const expiresAt = new Date(Date.now() + ttlMs);
    const updated = await this.users.setEmailVerificationChallenge(
      user._id.toString(),
      code,
      expiresAt
    );
    if (!updated) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }

    const expiresAtIso = expiresAt.toISOString();

    if (this.useRealEmails()) {
      try {
        await this.mail.sendEmailVerification(updated.email, code, expiresAtIso);
      } catch (err) {
        this.logger.error(
          err instanceof Error ? err.message : 'sendEmailVerification failed'
        );
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
    const user = await this.users.findByEmail(emailKey);
    if (user === null || !user.emailVerified) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }

    const ttlMs = parseDurationToMs(
      this.config.get('AUTH_PASSWORD_RESET_EXPIRES_IN', { infer: true })
    );
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlMs);
    const tokenHash = hashOpaqueToken(token);
    const updated = await this.users.setPasswordResetChallenge(
      user._id.toString(),
      tokenHash,
      expiresAt
    );
    if (!updated) {
      return { ok: true, message: AUTH_RESEND_ACK_MESSAGE };
    }

    const expiresAtIso = expiresAt.toISOString();

    if (this.useRealEmails()) {
      try {
        await this.mail.sendPasswordReset(updated.email, token, expiresAtIso);
      } catch (err) {
        this.logger.error(err instanceof Error ? err.message : 'sendPasswordReset failed');
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
    const tokenHash = hashOpaqueToken(body.token);
    const user = await this.users.findByPasswordResetTokenHash(tokenHash);
    if (
      user === null ||
      user.passwordResetExpiresAt === undefined ||
      Date.now() > user.passwordResetExpiresAt.getTime()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const newHash = await bcrypt.hash(body.newPassword, 12);
    const updated = await this.users.completePasswordReset(user._id.toString(), newHash);
    if (!updated) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.refreshSessions.deleteAllForUser(user._id.toString());
  }

  async login(body: LoginBody): Promise<LoginWithTokens> {
    const user = await this.users.findByIdentifier(body.identifier);
    if (user === null) {
      this.authDebug('login_fail: unknown_identifier');
      throw new UnauthorizedException('Invalid email, username, or password');
    }
    const passwordOk = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordOk) {
      this.authDebug('login_fail: bad_password');
      throw new UnauthorizedException('Invalid email, username, or password');
    }
    if (!user.emailVerified) {
      this.authDebug('login_fail: email_not_verified');
      throw new UnauthorizedException('Email not verified');
    }

    this.authDebug('login_ok');
    return this.issueNewSession(user);
  }

  async changePassword(
    payload: JwtAccessPayload,
    body: ChangePasswordBody
  ): Promise<LoginWithTokens> {
    await this.assertAccessTokenClaims(payload);
    const sub = payload.sub;
    const user = await this.users.findById(sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    const currentOk = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(body.newPassword, 12);
    const updated = await this.users.updatePassword(user._id.toString(), newPasswordHash);
    if (!updated) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.refreshSessions.deleteAllForUser(user._id.toString());

    return this.issueNewSession(updated);
  }

  /**
   * Rotates the refresh token and issues a new access JWT.
   * The previous refresh token is invalidated (one-time use).
   */
  async refresh(oldRefreshToken: string): Promise<LoginWithTokens> {
    const tokenHash = hashOpaqueToken(oldRefreshToken);
    const session = await this.refreshSessions.findByTokenHash(tokenHash);
    if (session === null) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    if (Date.now() > session.expiresAt.getTime()) {
      await this.refreshSessions.deleteByTokenHash(tokenHash);
      throw new UnauthorizedException('Invalid or expired session');
    }

    await this.refreshSessions.deleteByTokenHash(tokenHash);

    const user = await this.users.findById(session.userId.toString());
    if (user === null) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    return this.issueNewSession(user);
  }

  /** Revokes the refresh session when the client sends a known refresh token. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
      await this.refreshSessions.deleteByTokenHash(hashOpaqueToken(refreshToken));
    }
  }

  /** Resolves the current user from an access JWT payload (must match stored user). */
  async getMeForJwtPayload(payload: JwtAccessPayload): Promise<LoginResponse> {
    await this.assertAccessTokenClaims(payload);
    const user = await this.users.findById(payload.sub);
    if (!user || user.email !== payload.email) {
      throw new UnauthorizedException('Invalid token');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }
    return userToLoginResponse(user);
  }

  async updateMe(payload: JwtAccessPayload, body: UpdateProfileBody): Promise<LoginResponse> {
    await this.assertAccessTokenClaims(payload);
    const updated = await this.users.updateProfile(payload.sub, {
      firstName: body.firstName,
      lastName: body.lastName,
      phoneNumber: body.phoneNumber,
      isProfilePrivate: body.isProfilePrivate,
      avatarId: body.avatarId
    });
    if (updated === null || updated.email !== payload.email) {
      throw new UnauthorizedException('Invalid token');
    }
    if (!updated.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }
    return userToLoginResponse(updated);
  }
}
