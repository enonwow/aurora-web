# Frontend Rules

1. TDD first: write tests before implementation for each feature.
2. Tests are maintained only in dedicated test directories under `frontend/tests/**`.
3. `frontend/src/**` is for production code only (no `*.test.*` files inside `src`).
4. Minimum split for tests:
   - unit: `frontend/tests/unit/**`
   - integration (when needed): `frontend/tests/integration/**`
   - e2e/regression/perf (when needed): dedicated subfolders in `frontend/tests/**`
   - regression smoke: `frontend/tests/regression-smoke/**` must cover critical flows (auth, role gates, logout cleanup, key UI guards)
5. Coverage scope excludes non-behavior files:
   - entrypoints (for example `src/main.tsx`)
   - type-only declaration/contract files (for example `src/modules/**/contracts.ts`, `*.d.ts`)
6. Active design review is required:
   - do not auto-agree with product or UX assumptions
   - raise logical risks early and propose alternatives with trade-offs
   - prefer short design discussions before implementation when architecture/UX impact is non-trivial
7. Mutation tests are mandatory for logic changes:
   - run `npm.cmd run test:mutation` for feature branches that modify business logic, state handling, auth, scene, or layout behavior
   - do not merge if mutation quality regresses (mutation score must be >= current baseline or improved)
   - for survived mutants in changed modules: add/adjust tests before merge (no "known survivors" without explicit documented exception)

## Golden Commands (PowerShell-safe)

Use `npm.cmd` in this environment (Windows + PowerShell).

1. Install deps: `npm.cmd ci`
2. Unit tests: `npm.cmd run test:unit`
3. Regression smoke: `npm.cmd run test:regression`
4. Mutation tests (when rule #7 applies): `npm.cmd run test:mutation`

## Pre-merge Must-Pass Gate (Minimal)

Do not merge unless all required checks below pass:

1. `npm.cmd run test:unit`
2. `npm.cmd run test:regression`
3. `npm.cmd run test:mutation` (only when changing business logic/state/auth/scene/layout behavior)
