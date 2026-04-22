---
name: typescript-with-lsp
description: Project overlay for the agentbase monorepo. Reinforces the global typescript-with-lsp skill with the strict TypeScript standards from CLAUDE.md/AGENTS.md. Use whenever editing TS/JS in this repo, especially before claiming work is done.
---

# TypeScript in the agentbase monorepo

This is the project-local extension of the global `typescript-with-lsp` skill. Read that skill for general LSP-vs-grep guidance; the rules below are non-negotiable for this repo.

## Project standards (from CLAUDE.md / AGENTS.md)

### TypeScript

- **Never use `any`** — use `unknown` with type guards.
- Use `import type` for type-only imports.
- Use `satisfies` for type validation while preserving literal types.
- Model states with **discriminated unions**, not optional fields.
- Use `as const` for literal tuples and objects.
- Honor the strict baseline in `packages/typescript-config/base.json` — do not disable `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, or other strict flags.

### Imports & file organization

- Order: external libs → `@repo/*` packages → `@/` local aliases → relative imports.
- One exported concept per file. Kebab-case filenames.
- No barrel files — use `package.json` exports maps.
- Feature folders over layers-by-type.
- Max ~300 lines per file. Max 3 function params (use an options object beyond that).

### Zod (when adding/editing schemas)

- Schemas live in `@repo/schemas`, shared across all apps.
- Use `.parse()` for typed output, `.safeParse()` when you need error handling.
- Infer types from schemas with `z.infer<typeof schema>` — never duplicate types manually.
- Compose with `.extend()`, `.pick()`, `.omit()`, `.partial()`.
- Use `z.discriminatedUnion()` for tagged unions.
- Use `z.strictObject()` to reject unknown keys.

### Dependencies

- Before adding a dependency, check if it exists in the monorepo or can be written in <20 lines.
- Shared deps belong in shared packages, not per-app.
- Use `pnpm` for all package operations. Never hand-edit lock files.

### Error handling

- Never swallow errors — every catch must log, rethrow, or handle meaningfully.
- Fail fast at system boundaries. Use typed error classes.
- Always handle promise rejections in async code.

## Verification command (the source of truth)

Before claiming work is complete:

```
pnpm lint && pnpm check-types && pnpm build
```

This is what gates a PR. `mcp__ide__getDiagnostics` is a useful preview but not a substitute — run the full command.

## Library work

Per the global skill, **`verify-library-with-context7`** first when touching libraries. The project explicitly calls this out in CLAUDE.md: "Always look up library docs via Context7 MCP before writing framework-specific code — even for React, Next.js, NestJS, Tailwind, Zod."

## Monorepo dependency flow

```
@repo/consts (leaf)
  └─▶ @repo/schemas (+ zod)
        └─▶ @repo/contracts
              └─▶ apps (frontend, web, backend)
```

When adding a new shared concept, place it as low in this chain as possible (closer to leaves). Turbo builds bottom-up via `^build` task deps.

## Why this matters

The strict TS baseline in `packages/typescript-config/base.json` catches whole classes of bugs at compile time. Loosening it locally (with `// @ts-expect-error` or `any`) defeats the purpose and lets bugs through to runtime. The discipline is the value.
