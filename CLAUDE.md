@AGENTS.md

## Environment variables

| App      | Variable                   | Default       | Source                                                                                                     |
| -------- | -------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| backend  | `NODE_ENV`                 | `development` | Zod-validated at startup (`env.validation.ts`)                                                             |
| backend  | `PORT`                     | `3000`        | Zod-validated at startup                                                                                   |
| backend  | `CORS_ORIGIN`              | `*`           | Zod-validated. `*` allows all; with **HttpOnly cookies**, production must use a **comma-separated list of exact origins** (never `*`). |
| backend  | `AUTH_THROTTLE_TTL_MS` / `AUTH_THROTTLE_LIMIT` | `60000` / `60` | Window + max hits per IP for throttled `/api/auth/*` routes (see `ThrottlerModule` in `app.module.ts`). |
| backend  | `AUTH_DEBUG_LOG`           | `false`       | When `true`, `AuthService` logs high-level debug events only (no passwords, codes, or reset tokens). |
| backend  | `MONGODB_URI`              | —             | **Required** at startup. `mongodb://` or `mongodb+srv://`. Copy `apps/backend/env.development.template` → `.env.development`. |
| backend  | `JWT_SECRET`               | —             | Required, ≥32 chars                                                                                        |
| backend  | Auth `userId` in JSON      | —             | Responses use Mongo **ObjectId** string (24 hex chars), not numeric ids. |
| backend  | `JWT_ACCESS_EXPIRES_IN`    | `15m`         | Zod-validated                                                                                              |
| backend  | `JWT_REFRESH_EXPIRES_IN`   | `7d`          | Zod-validated                                                                                              |
| backend  | `AUTH_EMAIL_VERIFICATION_EXPIRES_IN` | `15m` | TTL for 6-digit email verification codes                                                            |
| backend  | `AUTH_PASSWORD_RESET_EXPIRES_IN` | `1h` | TTL for opaque forgot-password reset tokens                                                            |
| backend  | `AUTH_USE_REAL_EMAILS` | `false` in development / `true` in production | Enables real Resend delivery when `true`; JSON responses always include the verification/reset debug payloads. Set to `false` to skip SMTP delivery and save API calls. |
| backend  | `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | (optional when `AUTH_USE_REAL_EMAILS=false`) | When real delivery is enabled, verification + reset email is sent via **nodemailer** over **Resend SMTP** by default (`smtp.resend.com`, user `resend`, pass = Resend API key). See [Resend + Nodemailer](https://resend.com/docs/send-with-nodemailer-smtp). |
| backend  | `APP_PUBLIC_ORIGIN`        | empty         | Optional `https://…` base for password-reset links in email (no trailing slash). |
| backend  | `STORAGE_DRIVER`           | in-memory in dev/test; `s3` in production | `memory` \| `s3`. Set `s3` in `.env.development` for local R2 uploads. |
| backend  | `S3_BUCKET`                | `uniwatch-dev` / `uniwatch-production` | Cloudflare R2 bucket per environment when object storage is active. |
| backend  | `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | — | R2 S3 API: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`. Required when `STORAGE_DRIVER=s3` or `NODE_ENV=production`. |
| backend  | `S3_FORCE_PATH_STYLE`      | `true`        | Use `true` for R2 (path-style avoids TLS handshake errors). |
| frontend | `VITE_PORT`                | `5173`        | Read in `vite.config.ts`                                                                                   |
| frontend | `VITE_API_BASE_URL`        | —             | Defined in `.env` examples but **not wired** — call sites use hardcoded `API_BASE_URL` from `@repo/consts` |
| web      | `NEXT_PUBLIC_API_BASE_URL` | —             | Defined in `.env` examples but **not wired** — same hardcoded constant                                     |
| web      | `NEXT_PUBLIC_FRONTEND_URL` | —             | Defined in `.env` examples, not used in code                                                               |

**Note:** `API_BASE_URL` is hardcoded as `http://localhost:3000` in `@repo/consts/api.ts`. Backend env shape lives in `apps/backend/env.development.template` and `apps/backend/env.production.template` (copy to gitignored `.env.development` / `.env.production`).

## Verification

Run before claiming work is complete:

```
pnpm lint && pnpm check-types && pnpm build
```

Do not commit `.pnpm-store/` (pnpm’s local cache); it is gitignored — see **Repository hygiene** in `AGENTS.md`.

## Code standards

### TypeScript

- Never use `any` — use `unknown` with type guards.
- Use `import type` for type-only imports.
- Use `satisfies` for type validation while preserving literal types.
- Model states with discriminated unions, not optional fields.
- Use `as const` for literal tuples and objects.
- Honor the strict baseline in `packages/typescript-config/base.json` — do not disable `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, or other strict flags.

### Imports and file organization

- Order: external libs → `@repo/*` packages → `@/` local aliases → relative imports.
- One exported concept per file. Kebab-case filenames.
- No barrel files — use `package.json` exports maps instead.
- Feature folders over layers-by-type.
- Max ~300 lines per file. Max 3 function params (use an options object beyond that).

### Dependencies

- Before adding a dependency, check if it exists in the monorepo or can be written in <20 lines.
- Shared deps belong in shared packages, not per-app.
- Use `pnpm` for all package operations. Never hand-edit lock files.

### Zod

- Schemas live in `@repo/schemas`, shared across all apps.
- Use `.parse()` for typed output, `.safeParse()` when you need error handling.
- Infer types from schemas with `z.infer<typeof schema>` — never duplicate types manually.
- Compose with `.extend()`, `.pick()`, `.omit()`, `.partial()`.
- Use `z.discriminatedUnion()` for tagged unions.
- Use `z.strictObject()` to reject unknown keys (already used for note input schemas).

### Context7

Always look up library docs via Context7 MCP before writing framework-specific code — even for React, Next.js, NestJS, Tailwind, Zod. Training data may not reflect recent API changes.

### Error handling

- Never swallow errors — every catch must log, rethrow, or handle meaningfully.
- Fail fast at system boundaries. Use typed error classes.
- Always handle promise rejections in async code.
