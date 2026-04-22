# backend

This app is the NestJS API starter in `agentbase`.

It gives the monorepo a backend surface with:

- the global `/api` route prefix
- environment validation
- Swagger UI at `/docs` (OpenAPI generated from Zod DTOs via `nestjs-zod`)
- unit and e2e test wiring
- shared lint and TypeScript standards from the workspace

## Local development

```sh
pnpm --filter backend dev
```

## Common commands

```sh
pnpm --filter backend build
pnpm --filter backend test
pnpm --filter backend test:e2e
pnpm --filter backend lint
pnpm --filter backend check-types
```

## Important conventions

- Local imports should use the `@/` alias for `src/*`
- API routes are expected to sit behind `/api`
- If response text or endpoint shape changes, update both unit and e2e tests in the same change
- Keep backend modules generic until the starter is renamed for a real product

## When to edit this app

Change this app when the starter needs:

- a better backend module example
- stronger validation, auth, or service patterns
- baseline API behavior for projects built from this template
