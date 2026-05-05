import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    /** Refresh cookie lifetime (opaque refresh token TTL), e.g. `7d`. */
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  /**
   * When true, register / resend-verification may include a `debug` object with the
   * 6-digit email code (local demos only — never enable in production).
   */
  AUTH_DEBUG_EMAIL_TOKENS: z
    .string()
    .optional()
    .default('false')
    .transform((value) => value === 'true' || value === '1' || value === 'yes'),
  /** TTL for email verification codes (e.g. `15m`, `24h`). */
  AUTH_EMAIL_VERIFICATION_EXPIRES_IN: z.string().default('15m'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /**
   * CORS allowed origins. `*` allows all (dev default). For production, set a
   * comma-separated list of exact origins, e.g. `https://app.example.com,https://admin.example.com`.
   */
  CORS_ORIGIN: z.string().default('*')
});

export type Env = z.infer<typeof envSchema>;

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
