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
  AGENTS.md        Agent instructions
  README.md        Project overview
  LICENSE          BSD 2-Clause
  src/             TypeScript source
    vesta.ts       Core game module
    vesta.test.ts  Tests
  package.json     Node/TypeScript config
  tsconfig.json    TypeScript compiler config
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
- After making changes, run `npm run check` and `npm test` to verify
- Keep PRs/commits small and focused
