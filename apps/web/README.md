# web

This app is the Next.js App Router surface in `agentbase`.

Use it when you want:

- a server-rendered product shell
- marketing or authenticated app pages backed by the same monorepo
- a place to validate how shared packages behave inside a Next.js app

## Local development

```sh
pnpm --filter web dev
```

The default local URL is [http://localhost:5172](http://localhost:5172) (port pinned in `package.json` scripts). The backend runs separately on `3000`.

## Important conventions

- Local imports should use the `@/` alias for `src/*`
- Keep metadata, page copy, and starter examples generic until a real product replaces them
- Shared code belongs in workspace packages, not copied between apps
- Follow the shared TypeScript and ESLint baselines rather than loosening the app in isolation

## When to edit this app

Change this app when the starter needs:

- a better Next.js reference surface
- metadata or App Router examples
- starter guidance for teams shipping server-rendered experiences
