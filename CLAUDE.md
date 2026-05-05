@AGENTS.md

## Environment variables

| App      | Variable                   | Default       | Source                                                                                                     |
| -------- | -------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| backend  | `NODE_ENV`                 | `development` | Zod-validated at startup (`env.validation.ts`)                                                             |
| backend  | `PORT`                     | `3000`        | Zod-validated at startup                                                                                   |
| backend  | `CORS_ORIGIN`              | `*`           | Zod-validated. `*` allows all; comma-separated list for production (e.g. `https://app.example.com`)         |
| backend  | `JWT_SECRET`               | —             | Required, ≥32 chars                                                                                        |
| backend  | `JWT_ACCESS_EXPIRES_IN`    | `15m`         | Zod-validated                                                                                              |
| backend  | `JWT_REFRESH_EXPIRES_IN`   | `7d`          | Zod-validated                                                                                              |
| backend  | `AUTH_DEBUG_EMAIL_TOKENS`  | `false`       | When `true` **and SMTP is off**, register/resend may include `debug.emailVerificationCode`; forgot may include `debug.passwordResetToken`. When **SMTP is on**, codes/tokens are email-only (never in JSON). |
| backend  | `AUTH_EMAIL_VERIFICATION_EXPIRES_IN` | `15m` | TTL for 6-digit email verification codes                                                            |
| backend  | `AUTH_PASSWORD_RESET_EXPIRES_IN` | `1h` | TTL for opaque forgot-password reset tokens                                                            |
| backend  | `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | (optional) | When `SMTP_HOST` is set, verification + reset emails are sent via `nodemailer`; `SMTP_FROM` + `SMTP_PORT` required. |
| backend  | `APP_PUBLIC_ORIGIN`        | empty         | Optional `https://…` base for password-reset links in email (no trailing slash). |
| frontend | `VITE_PORT`                | `5173`        | Read in `vite.config.ts`                                                                                   |
| frontend | `VITE_API_BASE_URL`        | —             | Defined in `.env` examples but **not wired** — call sites use hardcoded `API_BASE_URL` from `@repo/consts` |
| web      | `NEXT_PUBLIC_API_BASE_URL` | —             | Defined in `.env` examples but **not wired** — same hardcoded constant                                     |
| web      | `NEXT_PUBLIC_FRONTEND_URL` | —             | Defined in `.env` examples, not used in code                                                               |

**Note:** `API_BASE_URL` is hardcoded as `http://localhost:3000` in `@repo/consts/api.ts`. The env vars in `.env.*.example` files are placeholders for when the starter is productionized.

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
