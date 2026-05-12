# agentbase

`agentbase` is a reusable Turborepo baseline for projects that want a strict TypeScript setup, a stricter shared ESLint baseline, and committed AI-agent guidance from the beginning.

It is intentionally generic. The goal is to clone this repo, rename the human-facing surfaces, and start building product-specific code on top of a stable monorepo foundation.

## What ships in the starter

### Apps

- `apps/frontend`: a Vite + React frontend for fast iteration and client-rendered UI
- `apps/web`: a Next.js App Router app for server-rendered product surfaces
- `apps/backend`: a NestJS API starter with the global `/api` prefix

### Shared packages

- `@repo/consts`: endpoint path strings and starter copy (leaf package)
- `@repo/schemas`: Zod 4 schemas + inferred types — `health`, `notes`, `root`, `errors` (RFC 7807 `ProblemDetails`)
- `@repo/contracts`: `EndpointContract<TResponse, TBody, TParams, TQuery>` objects pairing HTTP method + path + Zod schemas. Consumed by apps for both input validation and response parsing.
- `@repo/ui`: shared UI primitives and examples (currently unused)
- `@repo/eslint-config`: the repo's shared ESLint baseline
- `@repo/typescript-config`: shared TypeScript presets
- `@repo/example`: placeholder shared package wiring you can replace with domain code

### API integration pattern

Each app call site uses **native `fetch`** and validates directly against the contract's Zod schemas — no shared fetch wrapper. Inputs are parsed with `contract.bodySchema.parse()` / `contract.paramsSchema.parse()` before sending; responses are parsed with `contract.responseSchema.parse(await response.json())`. The backend uses the same `@repo/schemas` via `createZodDto()` from `nestjs-zod`, so types never drift between client and server.

## Baseline standards

- Strict TypeScript is centralized in `packages/typescript-config`
- Shared ESLint rules are centralized in `packages/eslint-config`
- Formatting is centralized through the root Prettier config
- Root and app-level agent guidance are committed so AI tools can work with the repo intentionally

## Getting started

```sh
pnpm install
pnpm dev
```

Common commands:

```sh
pnpm build
pnpm lint
pnpm check-types
pnpm format
```

### Running the stack in production mode

Two modes exist for non-dev runs:

```sh
pnpm preview     # build + run every app with NODE_ENV=production on localhost ports (prod rehearsal)
pnpm start:prod  # build + run every app in production mode (backend uses PORT from apps/backend/.env.production; web on 5172; Vite preview on 5173)
```

Filter to a single app:

```sh
pnpm turbo run preview --filter backend   # builds deps + app, then runs preview
pnpm --filter backend preview             # runs only the app's script (assumes already built)
```

Same flags apply to `start:prod`. The `preview` mode is the quickest way to smoke-test a production build locally before deploying; `start:prod` is what a Dockerfile CMD or Procfile should invoke.

> Note: `API_BASE_URL` is still hardcoded in `@repo/consts/api.ts`. Wire `VITE_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` through the call sites before relying on `start:prod` for a real deployment.

Run a single workspace with a filter:

```sh
pnpm turbo dev --filter=frontend
pnpm turbo dev --filter=web
pnpm turbo dev --filter=backend
```

## How to rename this starter

Most of the boring work is automated. The `agentbase` and `Agentbase` strings live in ~17 files (root configs, READMEs, agent docs, Swagger title, frontend HTML title, starter copy consts). The rename script handles the literal substitution; you only do the creative copywriting.

```sh
# Dry run — prints every file the script would touch.
node scripts/rename.mjs --name acme --display Acme --tagline "The Acme platform"

# When the dry run looks right:
node scripts/rename.mjs --name acme --display Acme --tagline "The Acme platform" --apply
```

After `--apply`:

1. Review with `git diff` — every change is a literal substitution, so anything unexpected is a bug in the script, not in your intent.
2. Edit the marketing copy in `packages/consts/src/starter/starter.consts.ts` that the script doesn't touch: `STARTER_HEADLINE`, `STARTER_DECK`, `STARTER_LEDE`, `STARTER_PITCH`, `STARTER_STATS`, etc.
3. Replace `@repo/example` with your real domain package and remove the demo `notes` module once your own modules take over.
4. Run `pnpm install && pnpm build && pnpm lint && pnpm check-types`.

The script deliberately does **not** rename the `@repo/*` scope — keeping it stable means future `git pull`s from the template stay ergonomic. If you truly want `@acme/*`, that's a separate manual refactor (and mostly a find-replace in `package.json` files + `tsconfig`/`next.config`/`vite.config` imports).

Keep the shared TypeScript, ESLint, Prettier, and agent-guidance layers as the source of truth instead of drifting per app.

## AI-agent readiness

This repo is designed to be agent-friendly:

- Root guidance lives in `AGENTS.md` and `CLAUDE.md`
- App-specific guidance lives next to each app
- Cursor rules live under `.cursor/rules`

If you change the repo structure, starter workflow, or baseline standards, update the docs and guidance in the same change.

## Notes

- Internal package scope stays `@repo/*` on purpose so the starter remains stable even when the product name changes.
- The starter aims to be generic, not complete. Expect to remove placeholder content as soon as your real product direction is clear.
