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

## Environment files

Runtime config is read from **one** file under `apps/backend/`, matching `NODE_ENV`:

- **Development:** `.env.development` — copy `apps/backend/env.development.template` if you are setting up from scratch
- **Production:** `.env.production` — copy `apps/backend/env.production.template` and fill host-specific values

Both `.env.*` filenames are gitignored. The `env.*.template` files are committed references only — Nest does not load them.

`pnpm --filter backend build && pnpm --filter backend start:prod` uses `.env.production`. For a quick local prod rehearsal on port 3000, use `pnpm --filter backend preview`.

## Important conventions

- Local imports should use the `@/` alias for `src/*`
- API routes are expected to sit behind `/api`
- If response text or endpoint shape changes, update both unit and e2e tests in the same change
- Auth verification/reset responses always include the code/token in JSON; set `AUTH_USE_REAL_EMAILS=true` to also send mail via Resend
- Keep backend modules generic until the starter is renamed for a real product

## Curated movie catalog

Room create/edit pickers list **`GET /api/movies/catalog`** — ready movies with `in_catalog: true`. Personal uploads from `GET /api/movies` are not shown in the catalog tab.

To add a catalog title manually:

1. Upload the source file (and optional thumbnail) to R2 under keys such as `movies/{ownerId}/{movieId}/source.mp4`.
2. Seed a Mongo record (sets `upload_status: ready`, `in_catalog: true`):

```sh
pnpm --filter backend seed:catalog-movie -- \
  --mongodb-uri "$MONGODB_URI" \
  --owner-id "<app-owner-user-id>" \
  --name "Example title" \
  --language english \
  --storage-key "movies/<ownerId>/<movieId>/source.mp4" \
  --thumbnail-key "movies/<ownerId>/<movieId>/thumb.svg" \
  --mime-type video/mp4 \
  --size-bytes 12345678
```

Add `--dry-run` to print the document without writing. Catalog movies are streamable by any logged-in user when attached to a room.

Admins (emails in `ADMIN_EMAILS`, synced to `users.isAdmin` on startup/login) can also publish via **`POST /api/admin/catalog/movies`**, list via **`GET /api/admin/catalog/movies`**, and unpublish or edit metadata via **`PATCH /api/admin/catalog/movies/:id`**. `/api/auth/me` includes `isAdmin: true` for admin sessions.

## When to edit this app

Change this app when the starter needs:

- a better backend module example
- stronger validation, auth, or service patterns
- baseline API behavior for projects built from this template
