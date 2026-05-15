import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request, Response } from 'express';

import {
  AUTH_CONTROLLER_PATH,
  AUTH_ROUTE_FORGOT_PASSWORD,
  AUTH_ROUTE_LOGIN,
  AUTH_ROUTE_LOGOUT,
  AUTH_ROUTE_ME,
  AUTH_ROUTE_REFRESH,
  AUTH_ROUTE_REGISTER,
  AUTH_ROUTE_RESEND_VERIFICATION,
  AUTH_ROUTE_RESET_PASSWORD,
  AUTH_ROUTE_VERIFY_EMAIL
} from '@repo/consts/auth';

import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from '@/auth/auth.consts';
import {
  AuthNonEnumeratingAckDto,
  ForgotPasswordAckDto,
  ForgotPasswordDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  RegisterResponseDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifyEmailResponseDto,
  type AuthNonEnumeratingAck,
  type ForgotPasswordAck,
  type LoginResponse,
  type RegisterResponse,
  type VerifyEmailResponse
} from '@/auth/auth.dto';
import { AuthService } from '@/auth/auth.service';
import '@/auth/auth.types';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import type { Env } from '@/utils/env.validation';
import { parseDurationToMs } from '@/utils/parse-duration-ms';

@ApiTags('auth')
@Controller(AUTH_CONTROLLER_PATH)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>
  ) {}

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string }
  ): void {
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const accessMs = parseDurationToMs(
      this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true })
    );
    const refreshMs = parseDurationToMs(
      this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true })
    );

    res.cookie(AUTH_ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: accessMs
    });
    res.cookie(AUTH_REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: refreshMs
    });
  }

  private clearAuthCookies(res: Response): void {
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const cookieBase = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/'
    };
    res.clearCookie(AUTH_ACCESS_COOKIE, cookieBase);
    res.clearCookie(AUTH_REFRESH_COOKIE, cookieBase);
  }

  private readRefreshCookie(req: Request): string | undefined {
    const jar: unknown = req.cookies;
    if (jar === null || typeof jar !== 'object') {
      return undefined;
    }
    const record = jar as Record<string, unknown>;
    const value = record[AUTH_REFRESH_COOKIE];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  @Post(AUTH_ROUTE_REGISTER)
  @HttpCode(201)
  @ZodResponse({
    status: 201,
    description: 'User registered; response includes verification debug code',
    type: RegisterResponseDto
  })
  register(@Body() body: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(body);
  }

  @Post(AUTH_ROUTE_LOGIN)
  @HttpCode(200)
  @ZodResponse({
    status: 200,
    description:
      'Login success; body uses `identifier` (email or username) + password. Sets HttpOnly access and refresh cookies.',
    type: LoginResponseDto
  })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<LoginResponse> {
    const result = await this.authService.login(body);
    this.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
    return result.user;
  }

  @Post(AUTH_ROUTE_REFRESH)
  @HttpCode(200)
  @ZodResponse({
    status: 200,
    description:
      'New access + rotated refresh token; cookies updated. Old refresh token is invalid.',
    type: LoginResponseDto
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<LoginResponse> {
    const raw = this.readRefreshCookie(req);
    if (raw === undefined) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Missing or invalid refresh token');
    }

    try {
      const result = await this.authService.refresh(raw);
      this.setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
      return result.user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.clearAuthCookies(res);
      }
      throw error;
    }
  }

  @Get(AUTH_ROUTE_ME)
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ZodResponse({
    status: 200,
    description:
      'Current user from access JWT (HttpOnly access_token cookie set at login/refresh)',
    type: LoginResponseDto
  })
  getMe(@Req() req: Request): LoginResponse {
    const payload = req.authPayload;
    if (payload === undefined) {
      throw new UnauthorizedException('Missing or invalid access token');
    }
    return this.authService.getMeForJwtPayload(payload);
  }

  @Post(AUTH_ROUTE_LOGOUT)
  @HttpCode(204)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    this.authService.logout(this.readRefreshCookie(req));
    this.clearAuthCookies(res);
  }

  @Post(AUTH_ROUTE_VERIFY_EMAIL)
  @HttpCode(200)
  @ZodResponse({
    status: 200,
    description: 'Email verified when code matches',
    type: VerifyEmailResponseDto
  })
  verifyEmail(@Body() body: VerifyEmailDto): VerifyEmailResponse {
    return this.authService.verifyEmail(body);
  }

  @Post(AUTH_ROUTE_RESEND_VERIFICATION)
  @HttpCode(202)
  @ZodResponse({
    status: 202,
    description: 'Non-enumerating ack with debug code when applicable',
    type: AuthNonEnumeratingAckDto
  })
  async resendVerification(
    @Body() body: ResendVerificationDto
  ): Promise<AuthNonEnumeratingAck> {
    return await this.authService.resendVerification(body);
  }

  @Post(AUTH_ROUTE_FORGOT_PASSWORD)
  @HttpCode(202)
  @ZodResponse({
    status: 202,
    description: 'Non-enumerating ack with debug token when applicable',
    type: ForgotPasswordAckDto
  })
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<ForgotPasswordAck> {
    return await this.authService.forgotPassword(body);
  }

  @Post(AUTH_ROUTE_RESET_PASSWORD)
  @HttpCode(204)
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(body);
  }
}
