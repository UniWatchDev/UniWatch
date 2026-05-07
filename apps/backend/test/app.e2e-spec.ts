import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomBytes } from 'node:crypto';

import {
  AUTH_FORGOT_PASSWORD_ENDPOINT,
  AUTH_LOGIN_ENDPOINT,
  AUTH_LOGOUT_ENDPOINT,
  AUTH_ME_ENDPOINT,
  AUTH_REFRESH_ENDPOINT,
  AUTH_REGISTER_ENDPOINT,
  AUTH_RESEND_VERIFICATION_ENDPOINT,
  AUTH_RESET_PASSWORD_ENDPOINT,
  AUTH_VERIFY_EMAIL_ENDPOINT
} from '@repo/consts/auth';
import { forgotPasswordAckSchema } from '@repo/schemas/auth';

import { AppModule } from '@/app/app.module';
import {
  authNonEnumeratingAckSchema,
  loginResponseSchema,
  registerResponseSchema,
  verifyEmailResponseSchema,
  type LoginResponse
} from '@/auth/auth.dto';
import { configureApp } from '@/bootstrap';
import { MailService } from '@/mail/mail.service';
import type { Env } from '@/utils/env.validation';

/** Captured by e2e MailService mock (`overrideProvider`) — never exposed via HTTP. */
const e2eVerificationCodeByEmail = new Map<string, string>();
const e2ePasswordResetTokenByEmail = new Map<string, string>();

function createE2eMailService(): MailService {
  return {
    isSmtpConfigured(): boolean {
      return true;
    },
    sendEmailVerification(
      to: string,
      code: string,
      expiresAtIso: string
    ): Promise<void> {
      void expiresAtIso;
      e2eVerificationCodeByEmail.set(to.toLowerCase(), code);
      return Promise.resolve();
    },
    sendPasswordReset(
      to: string,
      token: string,
      expiresAtIso: string
    ): Promise<void> {
      void expiresAtIso;
      e2ePasswordResetTokenByEmail.set(to.toLowerCase(), token);
      return Promise.resolve();
    }
  } as MailService;
}

function uniqueRegisterBody(prefix: string): {
  userName: string;
  phoneNumber: string;
  email: string;
  password: string;
} {
  const id = `${String(Date.now())}${randomBytes(4).toString('hex')}`;
  const phoneSuffix = randomBytes(4).readUInt32BE(0) % 100_000_000;
  return {
    userName: `${prefix}${id}`,
    phoneNumber: `05${String(phoneSuffix).padStart(8, '0')}`,
    email: `${prefix}${id}@example.com`,
    password: 'Secret1a'
  };
}

async function registerAndVerifyEmail(
  agent: ReturnType<typeof request.agent>,
  registerBody: ReturnType<typeof uniqueRegisterBody>
): Promise<void> {
  const regRes = await agent
    .post(AUTH_REGISTER_ENDPOINT)
    .send(registerBody)
    .expect(201);
  const parsed = registerResponseSchema.parse(regRes.body as unknown);
  expect(parsed.emailVerified).toBe(false);
  const code = e2eVerificationCodeByEmail.get(registerBody.email.toLowerCase());
  if (code === undefined) {
    throw new Error('e2e mail mock should have captured verification code');
  }
  const verifyRes = await agent
    .post(AUTH_VERIFY_EMAIL_ENDPOINT)
    .send({ email: registerBody.email, code })
    .expect(200);
  verifyEmailResponseSchema.parse(verifyRes.body as unknown);
}

describe('Backend bootstrap (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(MailService)
      .useValue(createE2eMailService())
      .compile();

    app = moduleFixture.createNestApplication();
    const configService = app.get(ConfigService<Env, true>);
    configureApp(app, configService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the root under the /api prefix', async () => {
    const response = await request(app.getHttpServer()).get('/api').expect(200);
    expect(response.body).toEqual({
      message: 'agentbase backend is running'
    });
  });

  it('does not serve the root at / (global /api prefix in effect)', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  it('echoes x-request-id from the RequestIdMiddleware', async () => {
    const incoming = 'trace-abc-123';
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .set('x-request-id', incoming);

    expect(response.headers['x-request-id']).toBe(incoming);
  });

  it('generates a UUID when x-request-id is missing', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');
    expect(typeof response.headers['x-request-id']).toBe('string');
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('rejects an over-long incoming x-request-id and generates a fresh one', async () => {
    const tooLong = 'a'.repeat(200);
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .set('x-request-id', tooLong);

    expect(response.headers['x-request-id']).not.toBe(tooLong);
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('returns a ProblemDetails payload with traceId on a thrown HttpException', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/notes/not-a-uuid')
      .set('x-request-id', 'trace-xyz');

    expect(response.status).toBe(400);
    const body = response.body as Record<string, unknown>;
    expect(typeof body['type']).toBe('string');
    expect((body['type'] as string).startsWith('/problems/')).toBe(true);
    expect(typeof body['title']).toBe('string');
    expect(body['status']).toBe(400);
    expect(body['instance']).toBe('/api/notes/not-a-uuid');
    expect(body['traceId']).toBe('trace-xyz');
  });

  it('serves Swagger UI at /docs in non-production mode', async () => {
    const response = await request(app.getHttpServer()).get('/docs');
    expect([200, 301]).toContain(response.status);
  });

  it('sets a strict Content-Security-Policy header (helmet default CSP)', async () => {
    const response = await request(app.getHttpServer()).get('/api');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'self'"
    );
  });

  it('auth: login is rejected until email is verified', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('nv');
    await agent.post(AUTH_REGISTER_ENDPOINT).send(registerBody).expect(201);
    const loginRes = await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(401);
    const body = loginRes.body as Record<string, unknown>;
    expect(body['detail']).toBe('Email not verified');
  });

  it('auth: resend-verification returns non-enumerating ack for unknown email', async () => {
    const res = await request(app.getHttpServer())
      .post(AUTH_RESEND_VERIFICATION_ENDPOINT)
      .send({ email: 'nobody-at-all@example.com' })
      .expect(202);
    authNonEnumeratingAckSchema.parse(res.body as unknown);
  });

  it('auth: register, verify email, login, and refresh with cookie jar', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('u');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);
    const refreshRes = await agent.post(AUTH_REFRESH_ENDPOINT).expect(200);
    const body: LoginResponse = loginResponseSchema.parse(
      refreshRes.body as unknown
    );
    expect(body.userName).toBe(registerBody.userName);
    expect(body.email).toBe(registerBody.email.toLowerCase());
    expect(typeof body.userId).toBe('number');
    expect(body.emailVerified).toBe(true);
  });

  it('auth: GET /me without cookies returns 401', async () => {
    await request(app.getHttpServer()).get(AUTH_ME_ENDPOINT).expect(401);
  });

  it('auth: GET /me after login returns the same user shape', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('m');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);
    const meRes = await agent.get(AUTH_ME_ENDPOINT).expect(200);
    const me: LoginResponse = loginResponseSchema.parse(meRes.body as unknown);
    expect(me.userName).toBe(registerBody.userName);
    expect(me.email).toBe(registerBody.email.toLowerCase());
    expect(me.emailVerified).toBe(true);
  });

  it('auth: logout clears session and cookies (refresh then fails)', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('l');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);
    await agent.post(AUTH_LOGOUT_ENDPOINT).expect(204);
    await agent.post(AUTH_REFRESH_ENDPOINT).expect(401);
  });

  it('auth: two accounts may share the same phone number', async () => {
    const agent = request.agent(app.getHttpServer());
    const sharedPhone = `05${String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0')}`;
    const first = uniqueRegisterBody('p');
    const second = uniqueRegisterBody('q');
    await agent
      .post(AUTH_REGISTER_ENDPOINT)
      .send({ ...first, phoneNumber: sharedPhone })
      .expect(201);
    await agent
      .post(AUTH_REGISTER_ENDPOINT)
      .send({ ...second, phoneNumber: sharedPhone })
      .expect(201);
  });

  it('auth: login accepts username as identifier after verify', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('c');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.userName,
        password: registerBody.password
      })
      .expect(200);
  });

  it('auth: forgot-password returns non-enumerating ack for unknown email', async () => {
    const res = await request(app.getHttpServer())
      .post(AUTH_FORGOT_PASSWORD_ENDPOINT)
      .send({ email: 'nobody-forgot@example.com' })
      .expect(202);
    forgotPasswordAckSchema.parse(res.body as unknown);
  });

  it('auth: forgot + reset revokes refresh, bumps pv (old /me + refresh fail), login with new password works', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('fp');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);

    const forgotRes = await agent
      .post(AUTH_FORGOT_PASSWORD_ENDPOINT)
      .send({ email: registerBody.email })
      .expect(202);
    forgotPasswordAckSchema.parse(forgotRes.body as unknown);
    const resetToken = e2ePasswordResetTokenByEmail.get(
      registerBody.email.toLowerCase()
    );
    if (resetToken === undefined) {
      throw new Error('e2e mail mock should have captured password reset token');
    }

    await agent
      .post(AUTH_RESET_PASSWORD_ENDPOINT)
      .send({ token: resetToken, newPassword: 'Secret2b' })
      .expect(204);

    await agent.get(AUTH_ME_ENDPOINT).expect(401);
    await agent.post(AUTH_REFRESH_ENDPOINT).expect(401);

    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: 'Secret2b'
      })
      .expect(200);
    const meAfter = await agent.get(AUTH_ME_ENDPOINT).expect(200);
    loginResponseSchema.parse(meAfter.body as unknown);
  });

  it('auth: refresh without cookies returns 401', async () => {
    await request(app.getHttpServer()).post(AUTH_REFRESH_ENDPOINT).expect(401);
  });
});

describe('Backend bootstrap (e2e, production mode)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(MailService)
      .useValue(createE2eMailService())
      .compile();

    app = moduleFixture.createNestApplication();
    const realConfig = app.get(ConfigService<Env, true>);
    const prodConfig = {
      get: (key: keyof Env): Env[keyof Env] => {
        if (key === 'NODE_ENV') {
          return 'production';
        }
        return realConfig.get(key, { infer: true });
      }
    } as unknown as ConfigService<Env, true>;
    configureApp(app, prodConfig);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does NOT serve Swagger UI in production', async () => {
    const response = await request(app.getHttpServer()).get('/docs');
    expect(response.status).toBe(404);
  });

  it('still serves the API under /api in production', async () => {
    const response = await request(app.getHttpServer()).get('/api').expect(200);
    expect(response.body).toEqual({
      message: 'agentbase backend is running'
    });
  });
});
