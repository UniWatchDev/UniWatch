import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { Env } from '@/utils/env.validation';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService<Env, true>) {
    const host = this.config.get('SMTP_HOST', { infer: true }).trim();
    const port = this.config.get('SMTP_PORT', { infer: true });
    if (host.length === 0 || port === undefined) {
      this.transporter = null;
      return;
    }
    const user = this.config.get('SMTP_USER', { infer: true });
    const pass = this.config.get('SMTP_PASS', { infer: true });
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get('SMTP_SECURE', { infer: true }),
      auth:
        user.trim().length > 0 && pass.length > 0
          ? { user: user.trim(), pass }
          : undefined
    });
  }

  isSmtpConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendEmailVerification(
    to: string,
    code: string,
    expiresAtIso: string
  ): Promise<void> {
    if (this.transporter === null) {
      throw new Error('SMTP is not configured');
    }
    const from = this.config.get('SMTP_FROM', { infer: true }).trim();
    const text = [
      'Your email verification code is:',
      '',
      code,
      '',
      `This code expires at ${expiresAtIso} (UTC).`,
      '',
      'If you did not create an account, you can ignore this message.'
    ].join('\n');

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Verify your email',
        text
      });
    } catch (error) {
      const detail =
        error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
      this.logger.error(
        `Failed to send verification email to ${to}: ${error instanceof Error ? error.message : String(error)}`,
        detail
      );
      throw error;
    }
  }

  async sendPasswordReset(
    to: string,
    token: string,
    expiresAtIso: string
  ): Promise<void> {
    if (this.transporter === null) {
      throw new Error('SMTP is not configured');
    }
    const from = this.config.get('SMTP_FROM', { infer: true }).trim();
    const origin = this.config.get('APP_PUBLIC_ORIGIN', { infer: true }).trim().replace(/\/$/, '');
    const resetLine =
      origin.length > 0
        ? `Open this link to choose a new password (copy the full URL if needed):\n${origin}/?resetToken=${encodeURIComponent(token)}`
        : `Use this reset token in the app (expires ${expiresAtIso} UTC):\n\n${token}`;

    const text = [
      'You requested a password reset.',
      '',
      resetLine,
      '',
      `This reset request expires at ${expiresAtIso} (UTC).`,
      '',
      'If you did not request this, you can ignore this message.'
    ].join('\n');

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Password reset',
        text
      });
    } catch (error) {
      const detail =
        error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
      this.logger.error(
        `Failed to send password reset email to ${to}: ${error instanceof Error ? error.message : String(error)}`,
        detail
      );
      throw error;
    }
  }
}
