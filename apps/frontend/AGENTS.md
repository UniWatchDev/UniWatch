# frontend agent guide

Follow `../../AGENTS.md` for repo-wide standards.

## App purpose

Vite 8 + React 19 client-side starter surface. Keep it polished, generic, and useful as a baseline example.

## Structure

- `src/App.tsx` — glassmorphic single-viewport layout (gradient canvas + ambient blobs + frosted cards: hero, package verification, endpoint explorer, auth, health + pitch footer).
- `src/health-check.tsx` — frosted pill: auto-pings `healthContract`, gradient-ring glow on ok, latency display.
- `src/auth-panel.tsx` — frosted card: register (email verification), verify + resend, login (blocked until verified), refresh + `/me` + logout; `credentials: 'include'` + `@repo/contracts/auth`.
- `src/package-verification.tsx` — frosted card with runtime probes against each `@repo/*` export + live backend health with latency. Uses static imports (no dynamic import() at runtime, which Vite cannot resolve from variable paths).
- `src/endpoint-explorer.tsx` — frosted card listing every `EndpointContract` with gradient method badges + "Try" button; auto-runs GETs on mount, shows JSON response drawer inline.
- `src/index.css` — Tailwind v4 via `@import 'tailwindcss'`. Gradient canvas + ambient blurred blobs + frosted-glass card utility (`.glass`) + keyframes (`gradient-drift`, `float-*`, `check-pop`, `glow-pulse`).
- `index.html` — loads Cabinet Grotesk + Satoshi from Fontshare and JetBrains Mono from Google Fonts via `<link>` tags.

## Conventions

- Use the `@/` alias for local imports from `src/*`.
- React Compiler is enabled — skip manual memoization.
- Tailwind v4 CSS-first config — no `tailwind.config.js`, no `@apply`. Tokens live in `src/index.css` under `@theme inline`.
- API calls use **native `fetch`** at every call site. Validate inputs with `contract.bodySchema.parse()` / `contract.paramsSchema.parse()` before sending, and validate responses with `contract.responseSchema.parse(await response.json())`. No shared fetch wrapper — this keeps the migration path to React Query, RTK Query, or SWR clear.
- Visible copy lives in `@repo/consts/starter` (`STARTER_HEADLINE`, `STARTER_DECK`, `STARTER_STATS`, `STARTER_PITCH`). Update there, not inline. Exception: `index.html`'s `<title>` is static HTML and cannot import a TS const — update that file directly when renaming the starter.
- Layout targets viewport-fit (100dvh × 100vw, no page scroll, desktop-only). Internal scroll allowed inside cards.
- Aesthetic is soft glassmorphic — frosted cards, gradient accents (purple → coral → sky), ambient blurred blobs. Do not introduce hairline editorial chrome; that belongs to `apps/web`.
- Favor shared UI or shared config changes over local one-off patterns.
- If you change the visible starter surface, update `README.md` or this file when the workflow meaning changes.
