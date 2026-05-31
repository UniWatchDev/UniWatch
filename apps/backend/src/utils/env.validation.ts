import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  /** Refresh cookie lifetime (opaque refresh token TTL), e.g. `7d`. */
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  /**
   * Real email delivery via Resend SMTP.
   * Defaults to `false` in development/test and `true` in production when omitted.
   */
  AUTH_USE_REAL_EMAILS: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      return value === 'true' || value === '1' || value === 'yes';
    }),
  /** TTL for email verification codes (e.g. `15m`, `24h`). */
  AUTH_EMAIL_VERIFICATION_EXPIRES_IN: z.string().default('15m'),
  /** TTL for opaque password-reset tokens (e.g. `1h`, `24h`). */
  AUTH_PASSWORD_RESET_EXPIRES_IN: z.string().default('1h'),
  MONGODB_URI: z
    .string()
    .min(1)
    .refine(
      (value) => {
        try {
          const u = new URL(value);
          return u.protocol === 'mongodb:' || u.protocol === 'mongodb+srv:';
        } catch {
          return false;
        }
      },
      { message: 'Must be a valid mongodb:// or mongodb+srv:// URL' }
    ),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /**
   * CORS allowed origins. `*` allows all (dev default). For production, set a
   * comma-separated list of exact origins, e.g. `https://app.example.com,https://admin.example.com`.
   */
  CORS_ORIGIN: z.string().default('*'),
  /**
   * When real emails are enabled, outbound mail uses SMTP. Requires the full
   * Resend SMTP block (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).
   */
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.preprocess(
    (value) =>
      value === undefined || value === null || value === '' ? undefined : value,
    z.coerce.number().int().min(1).max(65535).optional()
  ),
  /** TLS for SMTP (port 465 often uses `true`). */
  SMTP_SECURE: z
    .string()
    .optional()
    .default('false')
    .transform((value) => value === 'true' || value === '1' || value === 'yes'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  /** From address when SMTP is enabled (e.g. `Agentbase <noreply@example.com>`). */
  SMTP_FROM: z.string().default(''),
  /**
   * Optional public web origin for password-reset links in email (e.g. `https://app.example.com`).
   * No trailing slash. If empty, the email contains the raw token only.
   */
  APP_PUBLIC_ORIGIN: z.string().default(''),
  /**
   * When `true`, `AuthService` emits high-level `Logger.debug` events (no secrets).
   * Defaults to `false`.
   */
  AUTH_DEBUG_LOG: z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? false
        : value === 'true' || value === '1' || value === 'yes',
    z.boolean()
  ),
  /** Window (ms) for `/api/auth/*` rate limiting (see `ThrottlerModule` in `app.module.ts`). */
  AUTH_THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  /** Max requests per client IP per TTL window on throttled `/api/auth/*` routes. */
  AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(60),
  /**
   * Object storage backend. Defaults to in-memory in development/test and S3 in production.
   * Set to `s3` locally when exercising MinIO or AWS (see `env.development.template`).
   */
  STORAGE_DRIVER: z.enum(['memory', 's3']).optional(),
  /** S3-compatible object storage (MinIO locally, AWS S3 in production). */
  S3_ENDPOINT: z.url().default('http://127.0.0.1:9000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1).default('uniwatch-media'),
  S3_ACCESS_KEY_ID: z.string().min(1).default('minioadmin'),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default('minioadmin'),
  S3_FORCE_PATH_STYLE: z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? true
        : value === 'true' || value === '1' || value === 'yes',
    z.boolean()
  ),
  MOVIE_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(1_073_741_824),
  MOVIE_ALLOWED_MIMES: z
    .string()
    .default('video/mp4,video/quicktime')
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
    ),
  MOVIE_FILE_TTL_HOURS: z.coerce.number().int().positive().default(24),
  MOVIE_STREAM_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().default(900)
});

const envSchema = baseEnvSchema
  .superRefine((data, ctx) => {
    const origin = data.APP_PUBLIC_ORIGIN.trim();
    if (origin.length > 0 && !isValidHttpUrl(origin)) {
      ctx.addIssue({
        code: 'custom',
        message: 'APP_PUBLIC_ORIGIN must be a valid http(s) URL or empty',
        path: ['APP_PUBLIC_ORIGIN']
      });
    }

    if (data.AUTH_USE_REAL_EMAILS !== true) {
      return;
    }

    if (data.SMTP_HOST.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'SMTP_HOST is required when AUTH_USE_REAL_EMAILS is true',
        path: ['SMTP_HOST']
      });
    }
    if (data.SMTP_PORT === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'SMTP_PORT is required when AUTH_USE_REAL_EMAILS is true',
        path: ['SMTP_PORT']
      });
    }
    if (data.SMTP_USER.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'SMTP_USER is required when AUTH_USE_REAL_EMAILS is true',
        path: ['SMTP_USER']
      });
    }
    if (data.SMTP_PASS.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'SMTP_PASS is required when AUTH_USE_REAL_EMAILS is true',
        path: ['SMTP_PASS']
      });
    }
    if (data.SMTP_FROM.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'SMTP_FROM is required when AUTH_USE_REAL_EMAILS is true',
        path: ['SMTP_FROM']
      });
    }
  })
  .transform((data) => ({
    ...data,
    AUTH_USE_REAL_EMAILS:
      data.AUTH_USE_REAL_EMAILS ?? data.NODE_ENV === 'production'
  }));

export type Env = z.infer<typeof envSchema>;

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'env';
        return `${path}: ${issue.message}`;
      })
      .join(', ');

    throw new Error(`Environment validation failed: ${issues}`);
  }

  return result.data;
}
