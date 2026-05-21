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
