/** Copy and structured content for the starter landing surfaces (web + Vite). */

export const STARTER_EYEBROW =
  'AI-native · monorepo · production-ready' as const;

export const STARTER_NAME = 'Agentbase' as const;

export const STARTER_TAGLINE =
  'The production-grade AI starter codebase' as const;

export const STARTER_HEADLINE = 'Ship faster. Agents onboard.' as const;

export const STARTER_DECK =
  'A production-ready monorepo powered by Turborepo. Full-stack type safety, shared contracts, and AI-agent guidance built into every workspace.' as const;

export const STARTER_LEDE =
  'Agentbase is the monorepo baseline for teams shipping AI-native products. Schemas flow from API to UI through shared contracts, CLAUDE.md and AGENTS.md live in every workspace, and the first commit is production-grade.' as const;

export const STARTER_BYLINE = 'by Agentbase · v0.1 · Issue Nº 01' as const;

export const STARTER_PUBLICATION = 'The Agentbase Gazette' as const;

export const STARTER_VOLUME = 'Vol. I' as const;

export const STARTER_ISSUE = 'Nº 01' as const;

export const STARTER_ISSUE_DATE = 'April 2026' as const;

export const STARTER_EDITION = 'Next.js 16 edition' as const;

export const STARTER_META_DESCRIPTION =
  'Agentbase is the production-grade AI starter codebase. Every workspace ships a CLAUDE.md, every contract is type-safe, and pnpm dev wires the stack in one command.' as const;

export const STARTER_STATS = [
  { value: '8', label: 'shared packages', kicker: 'pkg' },
  { value: '100', suffix: '%', label: 'type-safe', kicker: 'ts' },
  { value: '0', label: 'config files', kicker: 'cfg' },
  { value: '3', label: 'apps wired', kicker: 'app' }
] as const;

export const STARTER_PITCH = [
  {
    title: 'Agent-native',
    body: 'CLAUDE.md + AGENTS.md in every workspace. Your assistants know the code on first clone.'
  },
  {
    title: 'One contract',
    body: 'Zod schemas flow from API to UI through shared endpoint contracts.'
  },
  {
    title: 'Production primitives',
    body: 'Strict TypeScript, ESLint flat-config, Prettier, and Turbo caching — enforced, not suggested.'
  }
] as const;

export type StarterStat = (typeof STARTER_STATS)[number];
export type StarterPitch = (typeof STARTER_PITCH)[number];
