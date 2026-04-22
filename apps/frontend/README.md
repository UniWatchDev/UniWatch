# frontend

This app is the Vite + React surface in `agentbase`.

Use it when you want:

- a fast local UI sandbox
- a place to prototype dashboard or client-heavy interfaces
- a lightweight frontend that still shares the monorepo's TypeScript, ESLint, and package conventions

## Local development

```sh
pnpm --filter frontend dev
```

## Important conventions

- Local imports should use the `@/` alias for `src/*`
- Shared code should come from workspace packages such as `@repo/contracts`, `@repo/schemas`, and `@repo/consts` (these are actively consumed; `@repo/ui` ships but is currently unused)
- Keep this app starter-oriented and generic until a real product replaces the placeholder content
- Let the shared ESLint and TypeScript configs drive standards instead of adding ad hoc per-app drift

## When to edit this app

Change this app when the starter needs:

- a stronger client-side example surface
- frontend-specific tooling updates
- shared UI verification from a Vite environment
