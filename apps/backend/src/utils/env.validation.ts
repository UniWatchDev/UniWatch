import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    /** Refresh cookie lifetime (opaque refresh token TTL), e.g. `7d`. */
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  /** TTL for email verification codes (e.g. `15m`, `24h`). */
  AUTH_EMAIL_VERIFICATION_EXPIRES_IN: z.string().default('15m'),
  /** TTL for opaque password-reset tokens (e.g. `1h`, `24h`). */
  AUTH_PASSWORD_RESET_EXPIRES_IN: z.string().default('1h'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /**
   * CORS allowed origins. `*` allows all (dev default). For production, set a
   * comma-separated list of exact origins, e.g. `https://app.example.com,https://admin.example.com`.
   */
  CORS_ORIGIN: z.string().default('*'),
  /**
   * When set (non-empty), outbound mail uses SMTP. Requires `SMTP_FROM` and `SMTP_PORT`.
   * Leave empty for local/CI (no verification email is sent; configure SMTP for real delivery).
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
  APP_PUBLIC_ORIGIN: z.string().default('')
});

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
  const result = envSchema.superRefine((data, ctx) => {
    const host = data.SMTP_HOST.trim();
    if (host.length === 0) {
      return;
    }
    if (data.SMTP_PORT === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'SMTP_PORT is required when SMTP_HOST is set',
        path: ['SMTP_PORT']
      });
    }
    if (data.SMTP_FROM.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'SMTP_FROM is required when SMTP_HOST is set',
        path: ['SMTP_FROM']
      });
    }
    const origin = data.APP_PUBLIC_ORIGIN.trim();
    if (origin.length > 0 && !isValidHttpUrl(origin)) {
      ctx.addIssue({
        code: 'custom',
        message: 'APP_PUBLIC_ORIGIN must be a valid http(s) URL or empty',
        path: ['APP_PUBLIC_ORIGIN']
      });
    }
  }).safeParse(config);

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
