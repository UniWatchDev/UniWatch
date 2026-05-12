@../../AGENTS.md
@AGENTS.md

# Backend — NestJS 11

Committed env shape: `env.development.template` / `env.production.template` (copy to gitignored `.env.development` / `.env.production`). Nest loads only `.env.${NODE_ENV}`.

## File structure

```
src/
  main.ts                — entrypoint: creates the app, calls configureApp(), listens on PORT
  bootstrap.ts           — configureApp(app, configService): full-strength helmet (including strict CSP), cookie-parser, /api prefix, CORS; mounts Swagger at /docs only when NODE_ENV !== 'production'. Shared by main.ts and the e2e suite so tests run against the same configured app.
  app/
    app.module.ts          — root module: ConfigModule loads `apps/backend/.env.${NODE_ENV}` only (isGlobal), global JwtModule (`global: true`), global pipe/interceptor/filter, NestModule.configure() wires RequestIdMiddleware via consumer.apply(...).forRoutes('{*splat}')
    app.controller.ts      — GET / → { message: "agentbase backend is running" } (RootResponseDto)
    app.controller.spec.ts — unit test for AppController.getRoot()
    app.service.ts         — getHello()
    app.dto.ts             — RootResponseDto extends createZodDto(rootResponseSchema)
  utils/
    env.validation.ts      — Zod schema for NODE_ENV, PORT, CORS_ORIGIN, JWT_* env, used by ConfigModule
    parse-duration-ms.ts   — parses compact duration strings (`15m`, `7d`) to milliseconds (cookie maxAge)
  consts/
    errors.consts.ts            — GENERIC_500_TITLE/DETAIL, VALIDATION_FAILED_TITLE + DEV/PROD_DETAIL, ZOD_SERIALIZATION_DEV_DETAIL
    problem-types.consts.ts     — stable RFC 7807 `type` URIs (`/problems/validation-failed`, `/problems/internal-error`, `/problems/http-error`)
    status-titles.consts.ts     — STATUS_TITLES (pre-computed Map<number,string>) + DEFAULT_STATUS_TITLE
  filters/
    http-exception.filter.ts — @Catch() everything; emits ProblemDetails JSON (RFC 7807) with a stable `type` URI and (when available) a `traceId`. In production: redacts unexpected-error detail, redacts 5xx `HttpException` detail, strips Zod validation issues, and strips the `errors` array from `HttpException` responses. The server log always carries the full truth (Zod issues, stack trace, original detail). Guards against double-writes with `response.headersSent`. Uses a length-capped `safeStringify` for hostile values.
  middleware/
    request-id.middleware.ts — reads `x-request-id` (if present and safe: `[A-Za-z0-9._-]{1,128}`) or generates a fresh UUID. Sets `req.id` for controllers/filter, echoes the id in the `x-request-id` response header so clients + logs can correlate.
  health/
    health.module.ts         — HealthModule
    health.controller.ts     — GET /api/health → { status: 'ok' | 'error' }
    health.service.ts        — random 50/50 boolean (demo only)
    health.service.spec.ts   — unit test for the random health probe
    health.dto.ts            — HealthResponseDto extends createZodDto(healthResponseSchema)
  notes/
    notes.module.ts      — NotesModule
    notes.controller.ts  — 6 CRUD endpoints at /api/notes
    notes.service.ts     — in-memory Map<string, Note>, UUID keys, ISO timestamps
    notes.dto.ts         — CreateNoteDto, UpdateNoteDto, PatchNoteDto, NoteDto, DeleteNoteResponseDto, NoteIdParamsDto
  auth/
    auth.module.ts       — AuthModule
    auth.controller.ts   — POST register, login, refresh, logout; GET me; paths from `@repo/consts/auth`; HttpOnly cookies + JwtAuthGuard
    auth.service.ts      — in-memory users + refresh sessions; bcrypt + JwtService
    auth.dto.ts          — nestjs-zod DTOs wrapping `@repo/schemas/auth`
    auth.consts.ts       — cookie names for access / refresh tokens
    auth.types.ts        — JwtAccessPayload + global `Express.Request` merge (`authPayload`)
test/
  app.e2e-spec.ts        — supertest e2e suite: verifies /api prefix, x-request-id echo + UUID fallback + unsafe-id rejection, ProblemDetails shape + traceId propagation, Swagger served at /docs, auth register/login/refresh/me/logout
  jest-e2e.setup.ts      — sets JWT_* env defaults so e2e can boot without a real `.env`
  jest-e2e.json          — Jest config for the e2e suite (forceExit, moduleNameMapper for @repo/schemas/* subpaths, ts-jest via tsconfig.spec.json)
```

## Global providers (app/app.module.ts)

Three global providers registered via DI tokens:

- `APP_PIPE` → `ZodValidationPipe` (from `nestjs-zod`) — validates request bodies against Zod-backed DTOs.
- `APP_INTERCEPTOR` → `ZodSerializerInterceptor` (from `nestjs-zod`) — serializes responses per Zod schemas.
- `APP_FILTER` → `HttpExceptionFilter` (custom) — catches **all** exceptions and emits responses shaped as `ProblemDetails` (`@repo/schemas/errors`, RFC 7807). Every response carries a stable `type` URI and (when middleware set it) a `traceId`. Handles `ZodValidationException` (400; dev = detail + `errors` array of Zod issues, prod = generic detail + no issues), `ZodSerializationException` (500, always logged at error level — treat as P1 in alerting), `HttpException` (status always preserved; dev = full title + detail + errors, prod = 4xx detail kept as app-authored, 5xx **title forced to canonical `STATUS_TITLES` entry** + detail redacted + `errors` stripped), and unknown errors (500). Injects `ConfigService<Env>` to detect `NODE_ENV==='production'`. The server log keeps the full truth (Zod issues, stack, original detail) regardless of redaction. Uses `safeStringify` (length-capped at 2 KB) to stay throw-safe against hostile values and to bound log size. Guards against double-response with `response.headersSent`. Path in `instance` has the query string stripped to avoid PII/secret leakage.

## Request correlation

`RequestIdMiddleware` (wired via `AppModule.configure()`) runs on every route:

- Reads the incoming `x-request-id` header if it matches `[A-Za-z0-9._-]{1,128}` (safe for logs and headers); otherwise generates a fresh `randomUUID()`.
- Sets `req.id` so controllers and the filter can read it.
- Echoes the id back to the client as the `x-request-id` response header.
- The filter copies `req.id` into `ProblemDetails.traceId` and prefixes it in every log line (`[trace=<id>]`), so a user-reported error id maps 1:1 to a server log entry — critical once prod redaction hides the original detail.

## Validation pattern

1. Zod schemas live in `@repo/schemas` (shared with frontend/web).
2. DTOs in `src/<module>/<module>.dto.ts` extend `createZodDto(schema)` from `nestjs-zod`.
3. The global `ZodValidationPipe` validates incoming request bodies **and path params** against these DTOs automatically — use `@Param() params: SomeIdParamsDto` instead of custom pipes.
4. `@ZodResponse` decorator on handlers declares response types for Swagger docs and response serialization.
5. For `:id` routes: `NoteIdParamsDto` (from `noteIdParamsSchema` in `@repo/schemas/notes`) replaces the prior `ParseUUIDPipe` — same schema used by the contract on the client side.

Always check Context7 for current NestJS + nestjs-zod patterns before writing validation code.

## Env config

`ConfigModule.forRoot` loads a single file: `apps/backend/.env.${NODE_ENV}` (e.g. `.env.development`, `.env.production`). E2E sets `process.env` in `test/jest-e2e.setup.ts` when no `.env.test` is present.

`utils/env.validation.ts` validates with Zod:

- `NODE_ENV` — enum `'development' | 'production' | 'test'` (default: `'development'`)
- `PORT` — coerced integer, 1–65535 (default: `3000`)
- `CORS_ORIGIN` — string, default `'*'` (allow all). Comma-separated allowlist for production, e.g. `https://app.example.com,https://admin.example.com`.
- `JWT_SECRET` — string, min length 32 (symmetric signing key for access JWTs)
- `JWT_ACCESS_EXPIRES_IN` — string, default `15m` (passed to `JwtService.signAsync`)
- `JWT_REFRESH_EXPIRES_IN` — string, default `7d` (opaque refresh cookie TTL)

Fails fast at startup with formatted error messages on invalid config.

## Security baseline (bootstrap.ts)

- `helmet()` sets standard security headers including a strict **Content-Security-Policy**. CSP is safe to keep on because Swagger UI (which ships inline scripts/styles) is **never mounted in production** — the gate lives in `bootstrap.ts`: `if (NODE_ENV !== 'production') mountSwagger(app)`.
- `enableCors({ origin, credentials: true })` where `origin` is derived from `CORS_ORIGIN`: `*` → allow all, otherwise a comma-separated allowlist → exact-match list.
- No rate limiter, no compression, no body-size override — starter stays minimal. Teams add `@nestjs/throttler` / `compression` as their product requires.

## NestJS patterns

- Module → Controller → Service separation. One module per domain feature.
- Dependency injection everywhere — never manual `new` for services.
- Controllers are thin (5–15 lines per handler). Business logic lives in services.
- Guards for auth (not middleware). Interceptors for cross-cutting concerns.

## API surface

- Global prefix: `/api` (set in `bootstrap.ts` via `configureApp()`).
- Swagger UI at `/docs` — **non-production only** (gated in `bootstrap.ts` so helmet's CSP can stay strict in prod). Uses `cleanupOpenApiDoc` from `nestjs-zod`.
- CORS enabled globally.

### Endpoints

| Method | Path             | Handler                      | Description                                   |
| ------ | ---------------- | ---------------------------- | --------------------------------------------- |
| GET    | `/api`           | `AppController.getRoot`      | `{ message: 'agentbase backend is running' }` |
| GET    | `/api/health`    | `HealthController.getHealth` | `{ status: 'ok' \| 'error' }` (random demo)   |
| POST   | `/api/auth/register` | `AuthController.register` | Register user (`email` + `userName` unique; **phone may repeat**); returns public profile JSON |
| POST   | `/api/auth/login`    | `AuthController.login`    | Body `{ identifier, password }` where `identifier` is **email or username**; JSON user + HttpOnly `access_token` + `refresh_token` cookies |
| POST   | `/api/auth/refresh`  | `AuthController.refresh`  | Reads `refresh_token` cookie; returns JSON user + new cookies; **rotates** refresh (old token invalid) |
| GET    | `/api/auth/me`       | `AuthController.getMe`    | Requires HttpOnly `access_token` cookie; returns `{ userId, userName, email }` |
| POST   | `/api/auth/logout`   | `AuthController.logout`   | Revokes refresh session when cookie present; clears auth cookies (`204`) |
| GET    | `/api/notes`     | `NotesController.list`       | List all notes (sorted by createdAt desc)     |
| GET    | `/api/notes/:id` | `NotesController.get`        | Get note by UUID                              |
| POST   | `/api/notes`     | `NotesController.create`     | Create note (`{ title, content }`)            |
| PUT    | `/api/notes/:id` | `NotesController.update`     | Full replace (`{ title, content }`)           |
| PATCH  | `/api/notes/:id` | `NotesController.patch`      | Partial update (optional title/content)       |
| DELETE | `/api/notes/:id` | `NotesController.delete`     | Delete, returns `{ success: true }`           |

Notes storage is an in-memory `Map` — resets on restart. Auth users and refresh sessions are in-memory `Map`s — resets on restart.

## Commands

| Command                             | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| `pnpm --filter backend dev`         | Start with watch mode (port 3000)         |
| `pnpm --filter backend build`       | Build via NestJS CLI                      |
| `pnpm --filter backend preview`     | Local prod rehearsal — `NODE_ENV=production`, port pinned to 3000 |
| `pnpm --filter backend start:prod`  | Pure production — `NODE_ENV=production`, expects `PORT` from env |
| `pnpm --filter backend lint`        | ESLint (zero warnings)                    |
| `pnpm --filter backend check-types` | `tsc --noEmit`                            |
| `pnpm --filter backend test`        | Run unit tests (Jest)                     |
| `pnpm --filter backend test:cov`    | Tests with coverage                       |
| `pnpm --filter backend test:e2e`    | End-to-end tests (supertest)              |
