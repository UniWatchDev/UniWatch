# frontend agent guide

Follow `../../AGENTS.md` for repo-wide standards.

## App purpose

Vite 8 + React 19 client-side starter surface. Keep it polished, generic, and useful as a baseline example.

## Structure

- `src/App.tsx` — `CookieAuthProvider` + `react-router-dom` routes: `/` lobby, `/app` (protected shell), `/room/:id`, `/rooms/new`, `/rooms/:id/edit`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/change-password`.
- `src/auth/` — cookie session auth: `cookie-auth-provider.tsx` (provider), `use-cookie-auth.ts` (`useCookieAuth` hook), `cookie-auth-context-internal.ts`, `use-cookie-auth-model.ts` (state + `fetch` via `@repo/contracts/auth`), `auth-fetch-helpers.ts`.
- `src/pages/` — route screens: lobby, room, create/edit room (create-room uses `POST /api/movies/resolve` + multipart upload + `POST /api/rooms`; edit-room can replace video and sync room/movie metadata), plus auth routes (`login`, `registration`, `verify-email-page`, `forgot-password-page`, `reset-password-page`, `change-password`) and shared `auth-page-shell.tsx` for those auth layouts.
- `src/pages/room.tsx` and `src/hooks/use-room-socket.ts` — realtime room view and Socket.IO client. The backend room state may include multiple live sockets per user; the UI should still treat `connectedUsers` as unique people, not one row per socket.
- `src/movies/` — shared movie upload UI/helpers (`movie-upload-field`, `movie-upload-progress`, `upload-movie-file`, `prepare-movie-for-room`, `movie-metadata-fields`, `format-movie-upload-age`, `recent-owned-movies`, `attach-room-movie`).
- `src/home-page.tsx` — optional glassmorphic starter layout (gradient canvas, package verification, endpoint explorer, `auth-panel.tsx` demo + links to `/login` / `/register`); not the default `/` route in `App.tsx`.
- `src/auth-panel.tsx` — frosted card: register (with first/last name), verify + resend, forgot + reset, login, refresh + `/me` + logout; `credentials: 'include'` + `@repo/contracts/auth`.
- `src/protected-app-page.tsx` — minimal shell: fetches `getAuthMeContract` with `credentials: 'include'`; redirects on `401`. Routed at **`/app`** from `App.tsx`.
- `src/main.tsx` — wraps the tree in `BrowserRouter`.
- `src/health-check.tsx` — frosted pill: auto-pings `healthContract`, gradient-ring glow on ok, latency display.
- `src/package-verification.tsx` — frosted card with runtime probes against each `@repo/*` export + live backend health with latency. Uses static imports (no dynamic import() at runtime, which Vite cannot resolve from variable paths).
- `src/endpoint-explorer.tsx` — frosted card listing `EndpointContract`s; auto-runs GETs on mount; note calls use `credentials: 'include'` for JWT-guarded APIs.
- `src/notes-panel.tsx` — notes CRUD against live API; uses `credentials: 'include'` so cookies reach **`/api/notes`** (JWT-guarded).
- `src/index.css` — Tailwind v4 via `@import 'tailwindcss'`. Uni-watch theme tokens (`.card`, `.input`, `.btn-*`, auth feedback) plus glass / ambient utilities where used.
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
