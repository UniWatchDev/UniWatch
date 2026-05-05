# backend agent guide

Follow `../../AGENTS.md` for repo-wide standards.

## App purpose

NestJS 11 API starter. Should stay framework-clean and easy to extend into a real API.

## Structure

- `src/main.ts` — entrypoint: creates the Nest app, calls `configureApp()`, attaches Socket.IO via `IoAdapter` after HTTP setup, listens on `PORT`.
- `src/bootstrap.ts` — exports `configureApp(app, configService)`: applies `helmet()` with its full default **strict CSP**, **`cookie-parser`** (so `req.cookies` works consistently), `setGlobalPrefix('api')`, `enableCors`, and mounts Swagger at `/docs` **only when `NODE_ENV !== 'production'`** (Swagger ships inline scripts that would break under CSP, so it's gated rather than opting out of CSP). Shared between `main.ts` and the e2e suite so tests run against the same configured app.
- `src/app/app.module.ts` — root module with global `ZodValidationPipe`, `ZodSerializerInterceptor`, `HttpExceptionFilter`. Implements `NestModule.configure()` to wire `RequestIdMiddleware` via `consumer.apply(RequestIdMiddleware).forRoutes('{*splat}')` (Express v5–compatible wildcard; plain `'*'` is auto-converted but no longer advisable per the NestJS 11 migration guide).
- `src/app/app.controller.ts` / `src/app/app.dto.ts` / `src/app/app.service.ts` / `src/app/app.controller.spec.ts` — `GET /api` returns `{ message }` typed via `rootContract` + `RootResponseDto`.
- `src/utils/env.validation.ts` — Zod schema validating `NODE_ENV`, `PORT`, `CORS_ORIGIN`, JWT, auth TTLs, optional SMTP (`SMTP_HOST`, `SMTP_PORT`, …), and optional `APP_PUBLIC_ORIGIN` for reset links.
- `src/consts/` — shared constants (`errors.consts.ts` for error copy, `problem-types.consts.ts` for stable RFC 7807 `type` URIs, `status-titles.consts.ts` for HTTP status → title map). Add new backend-wide constants here, not inline in modules.
- `src/health/` — `GET /api/health` demo endpoint.
- `src/mail/` — `MailModule` + `MailService`: optional SMTP via `nodemailer`; sends verification and password-reset messages when `SMTP_HOST` is set.
- `src/auth/` — `AuthModule` + `AuthController` + `AuthService`: register / resend / forgot send email when SMTP is configured (`503` if send fails); when SMTP is on, **`debug` verification/reset tokens are never returned in JSON** (even if `AUTH_DEBUG_EMAIL_TOKENS`); with SMTP off, `AUTH_DEBUG_EMAIL_TOKENS` still exposes codes in JSON for local demos. `POST /auth/verify-email`, refresh (rotating refresh cookie), logout, `GET /me` behind `JwtAuthGuard` (access JWT includes `pv`), Zod DTOs in `auth.dto.ts`.
- `src/notes/` — demo in-memory CRUD at `/api/notes` (contracts + Zod DTOs).
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
