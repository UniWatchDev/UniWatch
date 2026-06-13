@../../AGENTS.md
@AGENTS.md

# Web — Next.js 16 App Router

## File structure

```
src/app/
  layout.tsx               — Server Component: root layout, uses offline-safe serif/sans/mono fallbacks via CSS variables
  page.tsx                 — Server Component: magazine-editorial layout
  health-check.tsx         — Client: auto-pings /api/health, dot + latency
  auth-panel.tsx           — Client: register + email verify/resend + login (blocked until verified) + session, consts/schemas + cookies
  notes-panel.tsx          — Client: full CRUD, styled as "Letters" column (optional; not on home page)
  package-verification.tsx — Client: static probes of every @repo/* export + live backend
  endpoint-explorer.tsx    — Client: every EndpointContract with Try button + JSON drawer
  globals.css              — Tailwind v4 + @theme inline (editorial tokens + keyframes)
  favicon.ico
```

## Server vs Client boundary

- `layout.tsx` and `page.tsx` are **Server Components** — no hooks, no interactivity.
- `health-check.tsx`, `auth-panel.tsx`, `notes-panel.tsx`, `package-verification.tsx`, and `endpoint-explorer.tsx` are **Client Components** (`'use client'`) — they own interactive state.
- Push `"use client"` boundaries down as far as possible.

## Next.js 16

- React Compiler enabled via `reactCompiler: true` in `next.config.ts` — no manual memoization.
- `transpilePackages`: `@repo/consts`, `@repo/schemas`, `@repo/contracts` — Next.js compiles these directly from source.
- Fetch data in Server Components, not with client-side hooks.
- Use App Router file conventions: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Use `generateMetadata` for dynamic SEO. Static metadata is exported from `layout.tsx`.
- Use framework components: `next/image`, `next/link`, `next/font`.

## Fonts

System font stacks are defined in `globals.css` and mapped to Tailwind via `@theme inline`:

- `--font-serif` → Georgia / Times stack
- `--font-sans` → system UI stack
- `--font-mono` and `--font-geist-mono` → monospace stack

## Tailwind v4

- PostCSS integration via `@tailwindcss/postcss` in `postcss.config.mjs`.
- Editorial palette in `globals.css` (`--color-paper`, `--color-ink`, `--color-rule`, `--color-mute`, `--color-accent`, status colors).
- Utilities: `.serif`, `.serif-text`, `.mono`, `.small-caps`, `.drop-cap`, `.link-underline`, `.editorial-scroll`.
- Animations: `.fade-up`, `.rule-draw`, `.spinner`, `.check-in`, `.dot-pulse`.
- Light-only; no dark mode for the starter surface.

## API integration

- Same pattern as frontend: native `fetch` at every call site with `contract.bodySchema.parse()` / `contract.paramsSchema.parse()` on inputs and `contract.responseSchema.parse()` on responses. No shared fetch wrapper.
- Contracts from `@repo/contracts`, types from `@repo/schemas`.
- `@repo/example` used in `package-verification.tsx` for runtime wiring proof — imports `verifyPackage` from `@repo/example/verify` and renders the `{ ok, source }` result alongside the other `@repo/*` checks.

## Environment variables

- `NEXT_PUBLIC_API_BASE_URL` — defined in `.env` examples but not yet wired into call sites; today every `fetch` uses the hardcoded `API_BASE_URL` from `@repo/consts/api`.
- `NEXT_PUBLIC_FRONTEND_URL` — defined in `.env` examples, not used in code.
- Port is pinned to `5172` via `cross-env PORT=5172` in `dev`, `start`, `preview`, and `start:prod` in `package.json` (override with `PORT` in the host env if your platform requires it).

## Commands

| Command                         | Purpose                             |
| ------------------------------- | ----------------------------------- |
| `pnpm --filter web dev`         | Start dev server (port 5172)                                                                      |
| `pnpm --filter web build`       | `next build`                                                                                      |
| `pnpm --filter web start`       | `next start` on port 5172 (no `NODE_ENV=production` — matches dev-style local start)              |
| `pnpm --filter web preview`     | Local prod rehearsal — `NODE_ENV=production`, port pinned to 5172                                 |
| `pnpm --filter web start:prod`  | Pure production — `NODE_ENV=production`, `PORT=5172` (override with `PORT` in the host env)      |
| `pnpm --filter web lint`        | ESLint (zero warnings)                                                                            |
| `pnpm --filter web check-types` | `tsc --noEmit`                                                                                    |
