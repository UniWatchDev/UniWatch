# web agent guide

Follow `../../AGENTS.md` for repo-wide standards.

## App purpose

Next.js 16 App Router server-rendered starter surface. Use for generic starter examples that model metadata, layout, and product-shell patterns.

## Structure

- `src/app/layout.tsx` — Server Component: root layout. Loads Fraunces (display serif, italic, SOFT+WONK+opsz axes), Geist Sans (body), Geist Mono, IBM Plex Mono (mono/numerals) via `next/font`.
- `src/app/page.tsx` — Server Component: Magazine-editorial layout (masthead → hero + by-the-numbers stats → endpoint explorer + session → health + pitch footer).
- `src/app/health-check.tsx` — Client Component: auto-pings `healthContract`, renders dot + latency.
- `src/app/auth-panel.tsx` — Client Component: register / login / refresh / me / logout via `@repo/contracts/auth`, `credentials: 'include'`, editorial column chrome (same pattern as Vite `auth-panel`).
- `src/app/notes-panel.tsx` — Client Component: full CRUD styled as a "Letters to the Editor" column (not mounted on the home page; kept for reuse).
- `src/app/package-verification.tsx` — Client Component: runtime checks via static imports of each `@repo/*` package + live backend health.
- `src/app/endpoint-explorer.tsx` — Client Component: lists every `EndpointContract` with a "Try →" button, auto-runs GETs on mount, shows JSON response inline.
- `src/app/globals.css` — Tailwind v4 via `@import 'tailwindcss'` + `@theme inline`. Editorial palette (`--color-paper`, `--color-ink`, `--color-rule`, `--color-accent`) + keyframes (`fade-up`, `rule-draw`, `check-in`, `dot-pulse`).

## Conventions

- Use the `@/` alias for local imports from `src/*`.
- Server Components by default — push `"use client"` boundaries down.
- React Compiler enabled — no manual memoization.
- Tailwind v4 via PostCSS (`@tailwindcss/postcss`) — no `tailwind.config.js`. Tokens live in `globals.css` under `@theme inline`.
- `@repo/*` packages are transpiled via `transpilePackages` in `next.config.ts`.
- Visible copy lives in `@repo/consts/starter` (`STARTER_HEADLINE`, `STARTER_DECK`, `STARTER_LEDE`, `STARTER_STATS`, `STARTER_PITCH`). Update there, not inline.
- Layout targets viewport-fit (100dvh × 100vw, no page scroll, desktop-only). Internal scroll allowed inside cards.
- Aesthetic is editorial magazine — serif italic headlines, mono figures, hairline rules. Do not introduce rounded card chrome or gradients.
- If the starter's structure or visible examples change, update this file and the app README.
