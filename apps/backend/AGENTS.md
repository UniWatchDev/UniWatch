# backend agent guide

Follow `../../AGENTS.md` for repo-wide standards.

## App purpose

NestJS 11 API starter. Should stay framework-clean and easy to extend into a real API.

## Structure

- `src/main.ts` — entrypoint: creates the Nest app, calls `configureApp()`, attaches Socket.IO via `IoAdapter` after HTTP setup, listens on `PORT`.
- `src/bootstrap.ts` — exports `configureApp(app, configService)`: applies `helmet()` with its full default **strict CSP**, **`cookie-parser`** (so `req.cookies` works consistently), `setGlobalPrefix('api')`, `enableCors`, and mounts Swagger at `/docs` **only when `NODE_ENV !== 'production'`** (Swagger ships inline scripts that would break under CSP, so it's gated rather than opting out of CSP). Shared between `main.ts` and the e2e suite so tests run against the same configured app.
- `src/app/app.module.ts` — root module with global `ZodValidationPipe`, `ZodSerializerInterceptor`, `HttpExceptionFilter`. `ConfigModule` loads **`apps/backend/.env.${NODE_ENV}`** only (paths resolved from `app.module.ts` so Turbo/monorepo cwd does not skip env files). Implements `NestModule.configure()` to wire `RequestIdMiddleware` via `consumer.apply(RequestIdMiddleware).forRoutes('{*splat}')` (Express v5–compatible wildcard; plain `'*'` is auto-converted but no longer advisable per the NestJS 11 migration guide).
- `src/app/app.controller.ts` / `src/app/app.dto.ts` / `src/app/app.service.ts` / `src/app/app.controller.spec.ts` — `GET /api` returns `{ message }` typed via `rootContract` + `RootResponseDto`.
- `src/utils/env.validation.ts` — Zod schema validating `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `MONGODB_URI`, JWT, auth TTLs, `AUTH_USE_REAL_EMAILS`, optional SMTP (`SMTP_HOST`, `SMTP_PORT`, …), and optional `APP_PUBLIC_ORIGIN` for reset links.
- `src/consts/` — shared constants (`errors.consts.ts` for error copy, `problem-types.consts.ts` for stable RFC 7807 `type` URIs, `status-titles.consts.ts` for HTTP status → title map). Add new backend-wide constants here, not inline in modules.
- `src/health/` — `GET /api/health` demo endpoint.
- `src/mail/` — `MailModule` + `MailService`: **Resend** over SMTP (`nodemailer`) when `AUTH_USE_REAL_EMAILS=true`; env shape in `env.development.template` / `env.production.template`. `503` if send fails.
- `src/auth/` — `AuthModule` + `AuthController` + `AuthService`: auth state is **MongoDB-authoritative** (`users` collection + `refresh_sessions` with hashed refresh tokens; email verification and password-reset challenges live on the user document). Register / resend / forgot return verification/reset payloads in JSON for debugging when `AUTH_USE_REAL_EMAILS` is false (development default); real Resend SMTP only when `AUTH_USE_REAL_EMAILS=true` (`503` if send fails). `POST /auth/verify-email`, refresh (rotating refresh cookie), logout, `POST /auth/change-password`, `GET /me` use `JwtAuthGuard` + HttpOnly cookies; access JWT `sub` is the user’s Mongo `_id` string and `pv` is `passwordVersion`. `JwtAuthGuard` is exported for other modules. Zod DTOs in `auth.dto.ts`.
- `src/notes/` — CRUD at `/api/notes` backed by MongoDB (`NoteRepository` / `NoteRecord`); **`JwtAuthGuard`** on the controller (send `Cookie` / `credentials: 'include'` from browsers).
- `src/movies/` — movies domain (Mongo + contracts); **`JwtAuthGuard`** on the controller.
- `src/rooms/` — rooms domain (Mongo + contracts); **`JwtAuthGuard`** on the controller.
- `src/realtime/` — `RealtimeModule` + `RealtimeGateway`: Socket.IO demo handler (`ping` → `pong` event).
- `src/filters/` — `HttpExceptionFilter` that catches all exceptions and responds with RFC 7807 `ProblemDetails` from `@repo/schemas/errors`. Each response carries a stable `type` URI (`/problems/validation-failed` | `/problems/internal-error` | `/problems/http-error`) and a `traceId` from `RequestIdMiddleware`. Production-aware: redacts unexpected-error detail, redacts 5xx `HttpException` detail, **forces 5xx `HttpException` title to the canonical `STATUS_TITLES` entry** (prevents custom-error-name leaks via `throw new HttpException({ error: 'Postgres: secret_xyz' }, 500)`), strips Zod validation issues, strips the `errors` array from `HttpException` responses, and strips the query string from `instance`. Dev keeps all detail + issues + custom titles. The server log always has the full truth tagged with `[trace=<id>]` — use the id a user reports to find the matching log line. `response.headersSent` is checked before writing, and `safeStringify` caps output at 2 KB.
- `src/middleware/request-id.middleware.ts` — per-request correlation id, read from `x-request-id` (validated) or generated via `randomUUID()`. Echoed back as `x-request-id` on the response. Wired in `AppModule.configure()`.

## Conventions

- Use the `@/` alias for local imports from `src/*`.
- API routes live behind the global `/api` prefix.
- DTOs extend `createZodDto(schema)` from `nestjs-zod`, with schemas from `@repo/schemas`.
- `@ZodResponse` decorator on every handler for Swagger + response serialization.
- `:id` path params use a Zod-backed DTO (`NoteIdParamsDto`) via `@Param()`, validated by the global `ZodValidationPipe` — no `ParseUUIDPipe`.
- All errors leave the API as `ProblemDetails` JSON. Throw `HttpException` subclasses with a meaningful status; the filter handles shaping.
- When route output or endpoint behavior changes, update tests in the same change.
- Keep examples generic and starter-friendly until a product-specific domain model replaces them.
- Always check Context7 for current NestJS patterns before writing new modules or validation code.
