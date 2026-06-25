# Vesta Project — Agent Instructions

## Language

Use English only unless explicitly asked otherwise.

## Source of Truth (Precedence Order)

When resolving contradictions between files, this order decides:

1. **README.md** — project overview and planned features
2. **AGENTS.md** — these agent conventions
3. **Code (`src/`)** — implementation follows README

## Project Structure

```
vesta/
  AGENTS.md               Agent instructions
  README.md               Project overview
  LICENSE                 BSD 2-Clause
  src/                    TypeScript source
    vesta.ts              Core game module
    vesta.test.ts         Tests
  tsconfig.json           TypeScript compiler config
  tsconfig.web.json       Web-specific TS config (compiles to web/core/)
  scripts/
    strip-exports.mjs     Post-process ESM → classic globals
  web/
    core/                 Compiled + stripped globals (generated)
    game.js, board.js, ...
  package.json            Node/TypeScript config
```

## Conventions

- TypeScript with strict types
- No external dependencies beyond URD
- No comments in code
- Every function must be pure
- Use named exports only
- Every public function must have a matching unit test
- Test files sit next to source files with `.test.ts` suffix
- Run tests with `node --test`
- Run type checks with `tsc --noEmit` via `npm run check`

## Workflow

- Before editing, read the file first
- After making changes, run `npm run compile` (regenerates `web/core/vesta.js`), then `npm run check` and `npm test` to verify
- After changing web/ JS code, always run `npm test && npm run bake` to verify both the source and the bundled output
- Keep PRs/commits small and focused
- When told to upgrade dependencies to their latest LTS, browse online to find current versions — don't rely on internal knowledge

## Commands

- `/knead` — Review all modified/new files for integrity, consistency, and correctness. Cross-check function signatures between TS and web JS, verify no dead references or drift, check script load order, and report any issues found.
- `/bumpver [major|minor|patch]` — Bump the version in `package.json`. Defaults to `patch` if no argument given. Parse the semver, increment the appropriate segment, write it back.
- `/gitdiff` — Run `git diff HEAD`, analyze the changes, and propose a commit message of under 10 lines total. If the version was bumped in the diff, prefix the first line with `vx.y.z: `. Do not stage or commit.
