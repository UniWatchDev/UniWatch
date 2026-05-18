# agentbase agent guide

## Purpose

Reusable monorepo baseline — not a product-specific app. Keep the starter generic, easy to rename, and safe to extend.

## Workspace map

### Apps

- `apps/frontend` — Vite 8 + React 19 client (port 5173 via `VITE_PORT`)
- `apps/web` — Next.js 16 App Router (port 5172 hardcoded in scripts); home at `/`, cookie-gated **`/app`** (client `GET /api/auth/me`, redirect on `401`), auth panel includes forgot/reset like Vite.
- `apps/backend` — NestJS 11 API under `/api` prefix (port 3000 via `PORT` env, Swagger UI at `/docs`). Loads `apps/backend/.env.${NODE_ENV}` only; copy `env.development.template` / `env.production.template` into gitignored `.env.development` / `.env.production` when bootstrapping. Auth and **`/api/notes`**, **`/api/movies`**, **`/api/rooms`** require a logged-in session (HttpOnly JWT cookies; use `credentials: 'include'` from browsers).
- `apps/mobile` — empty placeholder

### Shared packages

- `@repo/consts` — string constants: `API_BASE_URL`, endpoint paths (`/api`, `/api/auth/*` including register/login/refresh/me/logout/verify/resend/forgot/reset, `/api/health`, `/api/notes`, `/api/notes/:id`), starter copy. Leaf package, no internal deps.
- `@repo/schemas` — Zod 4 schemas and inferred types. Subpaths: `/auth`, `/health`, `/notes`, `/root`, `/errors` (RFC 7807 `problemDetailsSchema`). Notes exports include `noteIdParamsSchema` for UUID path params.
- `@repo/contracts` — typed `EndpointContract<TResponse, TBody, TParams, TQuery>` objects. Each contract attaches `responseSchema` plus any of `bodySchema`/`paramsSchema`/`querySchema` as real Zod schemas from `@repo/schemas`. Subpaths: `/auth`, `/health`, `/notes`, `/root`. Depends on `@repo/consts`, `@repo/schemas`, `zod`.
- `@repo/ui` — React components (button, card, code). Not currently consumed by any app.
- `@repo/eslint-config` — ESLint 9 flat configs: `base`, `node`, `react-internal`, `next-js`.
- `@repo/typescript-config` — TS configs: `base.json`, `node.json`, `nextjs.json`, `vite.json`, `react-library.json`.
- `@repo/example` — placeholder shared package. Exports `EXAMPLE_VERSION` (root), `EXAMPLE_MESSAGE` (`/message`), and `verifyPackage()` (`/verify`). Frontend and web import `verifyPackage` in their `package-verification` components as runtime proof that workspace wiring works end-to-end.

### Dependency flow

```
@repo/consts (leaf)
  └─▶ @repo/schemas (+ zod)
        └─▶ @repo/contracts
              └─▶ apps (frontend, web, backend)
```

Packages build bottom-up. Turbo handles ordering via `^build` task deps.

### Integration pattern

The full-stack contract chain works like this:

1. `@repo/consts` defines endpoint path strings (`/api`, `/api/auth/*`, `/api/health`, `/api/notes`, `/api/notes/:id`).
2. `@repo/schemas` defines Zod schemas and infers types (`Note`, `HealthResponse`, auth register/login/verify/resend shapes, `CreateNoteInput`, `NoteIdParams`, `RootResponse`, `ProblemDetails`).
3. `@repo/contracts` combines consts + schemas into `EndpointContract` objects with `method`, `path`, `responseSchema`, and optional `bodySchema`/`paramsSchema`/`querySchema` (see `/auth`, `/health`, `/notes`, `/root` subpaths).
4. Backend: DTOs extend `createZodDto(schema)` from `nestjs-zod`, reusing the same `@repo/schemas`. Global `ZodValidationPipe` validates `@Body()` and `@Param()` with those DTOs; `ZodSerializerInterceptor` validates responses. `HttpExceptionFilter` emits all errors as `ProblemDetails`.
5. Frontend + web: each call site uses native `fetch()` and validates directly against the contract's schemas — e.g. `contract.bodySchema.parse(input)` before `JSON.stringify`, then `contract.responseSchema.parse(await response.json())`. No shared fetch wrapper — keeps the path clear for integrating React Query / RTK Query / SWR later.

## Non-negotiables

- Preserve shared TypeScript, ESLint, and Prettier baselines — never weaken per-app.
- Prefer changes in shared packages over per-app drift.
- Keep human-facing copy generic (this is a starter template).
- When structure or workflow changes, update `README.md`, `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules` in the same change.
- Do not rename `@repo/*` scopes unless explicitly asked.

## Repository hygiene

- Do not commit pnpm’s content-addressable cache (`.pnpm-store/`). It is gitignored; rely on `pnpm-lock.yaml` and `pnpm install`.

## Renaming the starter (automated)

When a team clones this starter for a real product, run `node scripts/rename.mjs --name <lower> --display <Proper> --tagline "..."` (add `--apply` to write). The script handles literal `agentbase`/`Agentbase` substitution across the ~17 files that need it, plus `STARTER_NAME` / `STARTER_TAGLINE`. Agents performing a rename should:

1. Invoke the script first. Review the dry-run output.
2. Run with `--apply`, then inspect `git diff`.
3. Hand-edit marketing copy (`STARTER_HEADLINE`, `STARTER_DECK`, `STARTER_LEDE`, `STARTER_PITCH`, `STARTER_STATS`) in `packages/consts/src/starter/starter.consts.ts`.
4. Leave the `@repo/*` scope alone (intentional, per the point above).

If a rename touches files beyond `scripts/rename.mjs`'s `TARGET_FILES` list, update the script — don't hand-edit the same drift twice.

## Commands

| Command             | Scope | Purpose                                  |
| ------------------- | ----- | ---------------------------------------- |
| `pnpm dev`          | all   | Start all apps in watch mode via Turbo   |
| `pnpm build`        | all   | Build all packages and apps (bottom-up)  |
| `pnpm preview`      | all   | Build, then run every app in local production rehearsal mode (`NODE_ENV=production`, localhost ports same as dev) |
| `pnpm start:prod`   | all   | Build, then run every app in pure production mode (no port defaults — expects `PORT`/env vars from the hosting environment) |
| `pnpm lint`         | all   | Lint everything (zero warnings enforced) |
| `pnpm check-types`  | all   | Type-check everything                    |
| `pnpm format`       | all   | Format all files with Prettier           |
| `pnpm format:check` | all   | Check formatting without writing         |

Filter to a single app with either route:

- `pnpm turbo run preview --filter backend` — orchestrated: builds deps + app first, then starts. Good for one-off local rehearsals.
- `pnpm --filter backend preview` — direct: runs only the app's own `preview` script; assumes the app and its deps are already built. Good for tight iteration.

Same filters apply to `start:prod`.

Single app: `pnpm --filter <name> <script>` (e.g. `pnpm --filter backend dev`).

## Working style

- Use app-local `@/` alias for imports from `src/*` in frontend, web, and backend.
- Keep docs concise, actionable, and written for the next team that clones this starter.
- Do not rename internal `@repo/*` package scopes unless explicitly requested.
- Look up library docs via Context7 MCP before writing framework-specific code.
