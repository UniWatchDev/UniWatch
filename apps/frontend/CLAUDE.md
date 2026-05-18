@../../AGENTS.md
@AGENTS.md

# Frontend — Vite 8 + React 19

## File structure

```
src/
  main.tsx                 — entry point (createRoot, StrictMode)
  App.tsx                  — CookieAuthProvider + routes (lobby, rooms, auth pages)
  auth/                    — cookie auth: provider, context, useCookieAuth model, fetch helpers
  pages/                   — lobby, room, create/edit room, auth route screens + auth-page-shell
  home-page.tsx            — optional starter glass layout + `AuthPanel` + links to full auth routes
  protected-app-page.tsx   — cookie gate example (optional route)
  health-check.tsx         — frosted pill: gradient-ring + glow on ok
  auth-panel.tsx           — inline cookie auth demo (register / login / refresh / me / logout via contracts)
  package-verification.tsx — static probes of @repo/* + backend
  endpoint-explorer.tsx    — EndpointContract rows
  index.css                — Tailwind v4 + theme tokens + shared UI / glass utilities
  assets/
index.html                 — loads Cabinet Grotesk + Satoshi (Fontshare) + JetBrains Mono (Google)
```

## React 19

- React Compiler is enabled via `@rolldown/plugin-babel` + `reactCompilerPreset` in `vite.config.ts` — do **not** use `useMemo`, `useCallback`, or `React.memo` unless profiling proves a need.
- Use discriminated union state patterns (see `health-check.tsx` for `{ kind: 'idle' | 'loading' | 'ok' | 'error' }`).
- Composition over configuration. Components ~150 lines max.
- No `useEffect` for derived state — compute inline. `useEffect` is only for side effects like initial data fetching (see `notes-panel.tsx`).

## Tailwind v4

- CSS-first config via `@import 'tailwindcss'` in `index.css` — no `tailwind.config.js`.
- Integrated via `@tailwindcss/vite` plugin.
- Utility-first in markup. Extract reusable patterns into React components, not `@apply`.
- Glassmorphic palette: `--color-ink` (indigo-900), `--color-mute` (slate-500), `--color-violet`, `--color-coral`, `--color-sky`, `--color-mint` for status.
- Custom utilities: `.glass` (frosted card), `.gradient-text`, `.gradient-border`, `.ambient*`, `.display`, `.mono`, `.lift`, `.soft-scroll`.
- Animations: `.fade-up`, `.check-pop`, `.glow-pulse`, `.spin-slow`, plus keyframes `gradient-drift`, `float-a/b/c`.
- Light-only, desktop-only — no dark mode, no mobile breakpoints.

## API integration

- Each call site uses **native `fetch`** and validates directly against contract schemas — there is no shared fetch wrapper. Pattern:

  ```ts
  const body = createNoteContract.bodySchema.parse({ title, content });
  const response = await fetch(`${API_BASE_URL}${createNoteContract.path}`, {
    method: createNoteContract.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
  const note = createNoteContract.responseSchema.parse(await response.json());
  ```

- For routes with `:id`, validate params then substitute: `const params = contract.paramsSchema.parse({ id }); const path = contract.path.replace(':id', encodeURIComponent(params.id));`.
- Contracts imported from `@repo/contracts/health`, `@repo/contracts/notes`, `@repo/contracts/root`, `@repo/contracts/auth`.
- Types imported from `@repo/schemas/notes` (e.g. `Note`).
- Base URL hardcoded as `http://localhost:3000` in `@repo/consts/api.ts`.

## Vite config

- Plugins (order matters): `@vitejs/plugin-react` → `@rolldown/plugin-babel` (React Compiler) → `@tailwindcss/vite`.
- Path alias: `@/` → `src/`.
- `strictPort: true` — fails if port is taken rather than auto-incrementing.

## Environment variables

- `VITE_PORT` — dev/preview server port (default 5173, read in `vite.config.ts`).
- `VITE_API_BASE_URL` — defined in `.env` examples but not yet wired into call sites; today every `fetch` uses the hardcoded `API_BASE_URL` from `@repo/consts/api`.

## Commands

| Command                              | Purpose                      |
| ------------------------------------ | ---------------------------- |
| `pnpm --filter frontend dev`         | Start dev server (port 5173)                              |
| `pnpm --filter frontend build`       | `tsc -b` then `vite build`                                |
| `pnpm --filter frontend lint`        | ESLint (zero warnings)                                    |
| `pnpm --filter frontend check-types` | `tsc --noEmit`                                            |
| `pnpm --filter frontend preview`     | Serve the built `dist/` locally via `vite preview` (5173) |
| `pnpm --filter frontend start:prod`  | `vite preview --host 0.0.0.0` — binds all interfaces. For real production you'd serve `dist/` via a CDN/static host; this is a convenience runner. |
