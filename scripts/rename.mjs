#!/usr/bin/env node
/**
 * Rename the starter from `agentbase` to your product name.
 *
 * Usage:
 *   node scripts/rename.mjs --name acme --display Acme [--tagline "The X platform"] [--apply]
 *
 * Without `--apply`, the script prints the planned changes and exits (dry-run).
 * Review the dry-run diff, then re-run with `--apply` to write. Commit to a clean
 * branch so you can `git diff` / `git restore` if anything looks wrong.
 *
 * What it does:
 *   - Replaces `Agentbase` → <Display>   in a curated list of files
 *   - Replaces `agentbase` → <name>      in the same list
 *   - Updates STARTER_NAME / STARTER_TAGLINE in packages/consts/src/starter/starter.consts.ts
 *
 * What it deliberately does NOT touch:
 *   - `@repo/*` scope (rename manually if you want a new scope — starter is designed to stay stable with `@repo/*`)
 *   - Marketing copy in STARTER_HEADLINE / STARTER_DECK / STARTER_LEDE / STARTER_PITCH — write your own
 *   - `node_modules`, `dist`, `.next`, `.turbo`, lockfiles
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { apply: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--apply') {
      out.apply = true;
      continue;
    }
    if (arg === '--name' || arg === '--display' || arg === '--tagline') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        fail(`Missing value for ${arg}`);
      }
      out[arg.slice(2)] = next;
      i += 1;
    }
  }
  if (!out.name) fail('Missing --name (e.g. --name acme)');
  if (!out.display) fail('Missing --display (e.g. --display Acme)');
  return out;
}

function fail(message) {
  console.error(`rename: ${message}`);
  console.error(
    'Usage: node scripts/rename.mjs --name <lower> --display <Proper> [--tagline "..."] [--apply]'
  );
  process.exit(1);
}

/**
 * Files where literal `agentbase` / `Agentbase` strings live.
 * Keep this list small and explicit — the script is only as safe as this list is accurate.
 */
const TARGET_FILES = [
  'package.json',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'apps/backend/README.md',
  'apps/backend/AGENTS.md',
  'apps/backend/CLAUDE.md',
  'apps/backend/src/main.ts',
  'apps/frontend/README.md',
  'apps/frontend/AGENTS.md',
  'apps/frontend/CLAUDE.md',
  'apps/frontend/index.html',
  'apps/web/README.md',
  'apps/web/AGENTS.md',
  'apps/web/CLAUDE.md',
  'packages/eslint-config/README.md',
  'packages/consts/src/starter/starter.consts.ts'
];

function replaceLiterals(content, { name, display }) {
  let next = content;
  // Order matters: replace Display (proper) first so the lowercase pass
  // doesn't catch the first letter of the Display replacement.
  next = next.replaceAll('Agentbase', display);
  next = next.replaceAll('agentbase', name);
  return next;
}

function replaceStarterConsts(content, { display, tagline }) {
  let next = content;
  next = next.replace(
    /export const STARTER_NAME = '[^']*' as const;/,
    `export const STARTER_NAME = '${display}' as const;`
  );
  if (tagline) {
    // Preserve multi-line vs single-line formatting of the original declaration.
    next = next.replace(
      /(export const STARTER_TAGLINE =[ \t]*\r?\n?[ \t]*)'[^']*'( as const;)/,
      `$1'${tagline.replaceAll("'", "\\'")}'$2`
    );
  }
  return next;
}

async function main() {
  const args = parseArgs();
  console.log(`rename: ${args.apply ? 'APPLYING' : 'DRY RUN'}`);
  console.log(`  agentbase → ${args.name}`);
  console.log(`  Agentbase → ${args.display}`);
  if (args.tagline) console.log(`  STARTER_TAGLINE → "${args.tagline}"`);
  console.log('');

  let touched = 0;
  for (const relPath of TARGET_FILES) {
    const abs = resolve(ROOT, relPath);
    let content;
    try {
      content = await readFile(abs, 'utf8');
    } catch (err) {
      console.warn(`  SKIP  ${relPath} (not found)`);
      continue;
    }

    let next = replaceLiterals(content, args);
    if (relPath.endsWith('starter.consts.ts')) {
      next = replaceStarterConsts(next, args);
    }

    if (next === content) {
      console.log(`  --    ${relPath}`);
      continue;
    }

    const changedLines = diffLineCount(content, next);
    console.log(`  EDIT  ${relPath}  (${changedLines} line${changedLines === 1 ? '' : 's'})`);
    touched += 1;

    if (args.apply) {
      await writeFile(abs, next, 'utf8');
    }
  }

  console.log('');
  console.log(
    `rename: ${args.apply ? 'wrote' : 'would touch'} ${touched} file${touched === 1 ? '' : 's'}.`
  );
  if (!args.apply) {
    console.log('        Re-run with --apply to write. Review the diff with `git diff` afterward.');
  } else {
    console.log('        Follow up manually:');
    console.log('         - edit STARTER_HEADLINE / STARTER_DECK / STARTER_LEDE / STARTER_PITCH');
    console.log('         - run `pnpm install && pnpm build && pnpm lint && pnpm check-types`');
  }
}

function diffLineCount(before, after) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  let diff = 0;
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i += 1) {
    if (beforeLines[i] !== afterLines[i]) diff += 1;
  }
  return diff;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
