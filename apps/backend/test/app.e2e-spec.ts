import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomBytes } from 'node:crypto';

import {
  AUTH_CHANGE_PASSWORD_ENDPOINT,
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
import { AUTH_PATCH_ME_ENDPOINT } from '@repo/consts/profile';
import { forgotPasswordAckSchema } from '@repo/schemas/auth';
import { getUserProfileResponseSchema } from '@repo/schemas/profile';
import { movieResponseSchema, movieStreamResponseSchema } from '@repo/schemas/movies';
import { noteSchema } from '@repo/schemas/notes';
import { roomResponseSchema } from '@repo/schemas/rooms';

import { AppModule } from '@/app/app.module';
import {
  authNonEnumeratingAckSchema,
  loginResponseSchema,
  registerResponseSchema,
  verifyEmailResponseSchema,
  type LoginResponse
} from '@/auth/auth.dto';
import { configureApp } from '@/bootstrap';
import type { Env } from '@/utils/env.validation';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function getEmailVerificationCode(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const debug = value['debug'];
  if (!isRecord(debug)) {
    return undefined;
  }
  const code = debug['emailVerificationCode'];
  return typeof code === 'string' ? code : undefined;
}

function getPasswordResetToken(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const debug = value['debug'];
  if (!isRecord(debug)) {
    return undefined;
  }
  const token = debug['passwordResetToken'];
  return typeof token === 'string' ? token : undefined;
}

function uniqueRegisterBody(prefix: string): {
  firstName: string;
  userName: string;
  phoneNumber: string;
  email: string;
  password: string;
  lastName?: string;
} {
  const id = `${String(Date.now())}${randomBytes(4).toString('hex')}`;
  const phoneSuffix = randomBytes(4).readUInt32BE(0) % 100_000_000;
  return {
    firstName: 'Test',
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
  const parsed: unknown = registerResponseSchema.parse(regRes.body as unknown);
  if (!isRecord(parsed) || typeof parsed['emailVerified'] !== 'boolean') {
    throw new Error('register response should include emailVerified');
  }
  const code = getEmailVerificationCode(parsed);
  if (code === undefined) {
    throw new Error('register response should include a debug verification code');
  }
  const emailVerified = parsed['emailVerified'];
  expect(emailVerified).toBe(false);
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
    }).compile();

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
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('pd');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);

    const response = await agent
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
    expect(body.firstName).toBe(registerBody.firstName);
    expect(body.email).toBe(registerBody.email.toLowerCase());
    expect(typeof body.userId).toBe('string');
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
    expect(me.firstName).toBe(registerBody.firstName);
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

  it('auth: register accepts optional lastName and echoes it in the response', async () => {
    const agent = request.agent(app.getHttpServer());
    const base = uniqueRegisterBody('ln');
    const regRes = await agent
      .post(AUTH_REGISTER_ENDPOINT)
      .send({ ...base, lastName: 'Smith' })
      .expect(201);
    const parsed = registerResponseSchema.parse(regRes.body as unknown);
    expect(parsed.firstName).toBe(base.firstName);
    expect(parsed.lastName).toBe('Smith');
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

  it('auth: change-password rejects wrong current password', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('cw');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);
    await agent
      .post(AUTH_CHANGE_PASSWORD_ENDPOINT)
      .send({ currentPassword: 'wrongpassword', newPassword: 'Newpass1a' })
      .expect(401);
  });

  it('auth: change-password succeeds and allows login with new password', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('cx');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);
    const changeRes = await agent
      .post(AUTH_CHANGE_PASSWORD_ENDPOINT)
      .send({ currentPassword: registerBody.password, newPassword: 'Newpass1a' })
      .expect(200);
    loginResponseSchema.parse(changeRes.body as unknown);
    await agent.get(AUTH_ME_ENDPOINT).expect(200);
    await agent.post(AUTH_LOGOUT_ENDPOINT).expect(204);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: 'Newpass1a'
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
    const forgotParsed: unknown = forgotPasswordAckSchema.parse(forgotRes.body as unknown);
    const resetToken = getPasswordResetToken(forgotParsed);
    if (resetToken === undefined) {
      throw new Error('forgot-password response should include a debug reset token');
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

  it('domain: movie + room respect JWT ownership; stranger gets 403; notes mutation is owner-only', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('dom');
    await registerAndVerifyEmail(agent, registerBody);
    const loginRes = await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);
    const me = loginResponseSchema.parse(loginRes.body as unknown);

    const movieRes = await agent
      .post('/api/movies')
      .send({
        name: `E2E Movie ${String(Date.now())}`,
        language: 'english',
        director: 'Director',
        rating: 8,
        length: 120,
        genre: 'drama'
      })
      .expect(201);
    const movie = movieResponseSchema.parse(movieRes.body as unknown);
    expect(movie.upload_status).toBe('pending');
    expect(movie.has_file).toBe(false);

    const tinyMp4 = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32
    ]);
    const uploaded = await agent
      .post(`/api/movies/${movie.id}/upload`)
      .attach('file', tinyMp4, { filename: 'tiny.mp4', contentType: 'video/mp4' })
      .expect(200);
    const uploadedMovie = movieResponseSchema.parse(uploaded.body as unknown);
    expect(uploadedMovie.upload_status).toBe('ready');
    expect(uploadedMovie.has_file).toBe(true);
    expect(uploadedMovie.file_uploaded_at).toEqual(expect.any(String));

    const streamRes = await agent.get(`/api/movies/${movie.id}/stream`).expect(200);
    movieStreamResponseSchema.parse(streamRes.body as unknown);

    const deactivateAt = new Date(Date.now() + 86_400_000).toISOString();
    const roomRes = await agent
      .post('/api/rooms')
      .send({
        name: 'E2E Room',
        movie: movie.id,
        room_type: 'public',
        deactivate_at: deactivateAt
      })
      .expect(201);
    const room = roomResponseSchema.parse(roomRes.body as unknown);
    expect(room.creator).toBe(me.userId);
    expect(room.status).toBe('waiting');

    const stranger = request.agent(app.getHttpServer());
    const other = uniqueRegisterBody('dom2');
    await registerAndVerifyEmail(stranger, other);
    await stranger
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: other.email,
        password: other.password
      })
      .expect(200);

    await stranger.get(`/api/rooms/${room.id}`).expect(403);
    await stranger.delete(`/api/rooms/${room.id}`).expect(403);

    await agent.delete(`/api/rooms/${room.id}`).expect(200);

    const noteRes = await agent
      .post('/api/notes')
      .send({ title: 'Private', content: 'Body' })
      .expect(201);
    const note = noteSchema.parse(noteRes.body as unknown);

    await stranger
      .put(`/api/notes/${note.id}`)
      .send({ title: 'Hacked', content: 'No' })
      .expect(403);
  });

  it('domain: owner can attach an existing movie to a room later', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('rmv');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);

    const movieRes = await agent
      .post('/api/movies')
      .send({
        name: `Later Attached Movie ${String(Date.now())}`,
        language: 'english',
        director: 'Director'
      })
      .expect(201);
    const movie = movieResponseSchema.parse(movieRes.body as unknown);

    const roomRes = await agent
      .post('/api/rooms')
      .send({
        name: 'Room Without Movie',
        room_type: 'public'
      })
      .expect(201);
    const room = roomResponseSchema.parse(roomRes.body as unknown);
    expect(room.movie ?? null).toBeNull();

    const patchRes = await agent
      .patch(`/api/rooms/${room.id}`)
      .send({ movie: movie.id })
      .expect(200);
    const updated = roomResponseSchema.parse(patchRes.body as unknown);
    expect(updated.movie).toBe(movie.id);
    expect(updated.movie_name).toBe(movie.name);
    expect(updated.status).toBe('waiting');
  });

  it('domain: movie resolve is idempotent; explicit create rejects duplicate names', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('mvr');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);

    const movieName = `Resolve Movie ${String(Date.now())}`;
    const movieBody = {
      name: movieName,
      language: 'english' as const,
      director: 'Director'
    };

    const created = await agent.post('/api/movies/resolve').send(movieBody).expect(201);
    const first = movieResponseSchema.parse(created.body as unknown);

    const reused = await agent.post('/api/movies/resolve').send(movieBody).expect(200);
    const second = movieResponseSchema.parse(reused.body as unknown);
    expect(second.id).toBe(first.id);

    await agent.post('/api/movies').send(movieBody).expect(409);

    const tinyMp4 = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32
    ]);
    await agent
      .post(`/api/movies/${first.id}/upload`)
      .attach('file', tinyMp4, { filename: 'tiny.mp4', contentType: 'video/mp4' })
      .expect(200);

    const deactivateAt = new Date(Date.now() + 86_400_000).toISOString();
    const roomRes = await agent
      .post('/api/rooms')
      .send({
        name: 'Resolve Flow Room',
        movie: first.id,
        room_type: 'public',
        deactivate_at: deactivateAt
      })
      .expect(201);
    const room = roomResponseSchema.parse(roomRes.body as unknown);
    expect(room.movie).toBe(first.id);
  });

  it('auth: refresh without cookies returns 401', async () => {
    await request(app.getHttpServer()).post(AUTH_REFRESH_ENDPOINT).expect(401);
  });

  it('auth: PATCH me updates profile and rejects unknown keys', async () => {
    const agent = request.agent(app.getHttpServer());
    const registerBody = uniqueRegisterBody('pm');
    await registerAndVerifyEmail(agent, registerBody);
    await agent
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: registerBody.email,
        password: registerBody.password
      })
      .expect(200);

    const patchRes = await agent
      .patch(AUTH_PATCH_ME_ENDPOINT)
      .send({
        firstName: 'Patched',
        lastName: '',
        phoneNumber: registerBody.phoneNumber,
        isProfilePrivate: true,
        avatarId: 'coral-popcorn'
      })
      .expect(200);
    const patched = loginResponseSchema.parse(patchRes.body as unknown);
    expect(patched.firstName).toBe('Patched');
    expect(patched.lastName).toBeUndefined();
    expect(patched.isProfilePrivate).toBe(true);
    expect(patched.avatarId).toBe('coral-popcorn');
    expect(patched.phoneNumber).toMatch(/^\+9725\d{8}$/);
    expect(patched.createdAt).toEqual(expect.any(String));

    await agent
      .patch(AUTH_PATCH_ME_ENDPOINT)
      .send({
        firstName: 'Patched',
        lastName: '',
        phoneNumber: registerBody.phoneNumber,
        isProfilePrivate: true,
        avatarId: 'coral-popcorn',
        userName: 'hacker'
      })
      .expect(400);

    await agent
      .patch(AUTH_PATCH_ME_ENDPOINT)
      .send({
        firstName: 'Patched',
        lastName: '',
        phoneNumber: registerBody.phoneNumber,
        isProfilePrivate: true,
        avatarId: 'not-a-preset'
      })
      .expect(400);
  });

  it('auth: GET user by username respects private profile for strangers', async () => {
    const owner = request.agent(app.getHttpServer());
    const ownerBody = uniqueRegisterBody('own');
    await registerAndVerifyEmail(owner, ownerBody);
    const ownerLogin = await owner
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: ownerBody.email,
        password: ownerBody.password
      })
      .expect(200);
    const ownerMe = loginResponseSchema.parse(ownerLogin.body as unknown);

    await owner
      .patch(AUTH_PATCH_ME_ENDPOINT)
      .send({
        firstName: 'Owner',
        lastName: 'User',
        phoneNumber: ownerBody.phoneNumber,
        isProfilePrivate: true,
        avatarId: 'sky-star'
      })
      .expect(200);

    const stranger = request.agent(app.getHttpServer());
    const strangerBody = uniqueRegisterBody('str');
    await registerAndVerifyEmail(stranger, strangerBody);
    await stranger
      .post(AUTH_LOGIN_ENDPOINT)
      .send({
        identifier: strangerBody.email,
        password: strangerBody.password
      })
      .expect(200);

    const privateView = await stranger
      .get(`/api/users/${encodeURIComponent(ownerMe.userName)}`)
      .expect(200);
    const privateParsed = getUserProfileResponseSchema.parse(privateView.body as unknown);
    expect(privateParsed.viewerIsOwner).toBe(false);
    expect(privateParsed.profile.isProfilePrivate).toBe(true);
    expect(privateParsed.profile.userName).toBe(ownerMe.userName);
    expect(privateParsed.profile.firstName).toBe('Owner');
    expect(privateParsed.profile.avatarId).toBe('sky-star');

    await owner
      .patch(AUTH_PATCH_ME_ENDPOINT)
      .send({
        firstName: 'Owner',
        lastName: 'User',
        phoneNumber: ownerBody.phoneNumber,
        isProfilePrivate: false,
        avatarId: 'sky-star'
      })
      .expect(200);

    const publicView = await stranger
      .get(`/api/users/${encodeURIComponent(ownerMe.userName)}`)
      .expect(200);
    const publicParsed = getUserProfileResponseSchema.parse(publicView.body as unknown);
    expect(publicParsed.profile.isProfilePrivate).toBe(false);

    const ownerView = await owner
      .get(`/api/users/${encodeURIComponent(ownerMe.userName)}`)
      .expect(200);
    const ownerParsed = getUserProfileResponseSchema.parse(ownerView.body as unknown);
    expect(ownerParsed.viewerIsOwner).toBe(true);
  });
});

describe('Backend bootstrap (e2e, production mode)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    const realConfig = app.get(ConfigService<Env, true>);
    const prodConfig = {
      get: (key: keyof Env): Env[keyof Env] => {
        if (key === 'NODE_ENV') {
          return 'production';
        }
        if (key === 'AUTH_USE_REAL_EMAILS') {
          return false;
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
