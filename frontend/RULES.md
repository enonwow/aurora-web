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
7. Mutation tests are optional and explicit opt-in only:
   - do not run Stryker or `npm.cmd run test:mutation` unless the user explicitly requests mutation testing in the current task
   - business logic, state handling, auth, scene, and layout changes require focused unit and regression coverage, not mutation testing
   - mutation score is not a completion or pre-merge gate unless the user explicitly requests it for the current task
8. Frontend architecture is hexagonal per context (`frontend/ARCHITECTURE.md`):
   - use `domain`, `application`, `ports`, `adapters`, `ui/components` layering
   - React components must call facades from `application` and must not import adapters directly
9. New external dependencies for business flows must be introduced via ports:
   - define interface in `src/modules/<context>/ports/**`
   - implement in `adapters/**`
   - compose/select adapter near the UI boundary
10. Cross-context access must go through explicit public contracts/facades, not internal file reach-through imports.
11. Aurora reverse-engineering parity rules must be codified as domain constraints plus tests:
   - `doors` are not movable via generic transform flows
   - `doors` do not participate in generic `visualTransform` editing
   - multi-selection transform must be blocked if selection contains `doors`
   - add unit + regression coverage for these constraints before merge
12. Aurora window-shell policy is mandatory (`frontend/AURORA_WINDOW_SHELLS_POLICY.md`):
   - mirror Aurora property-window structure first (tabs/groups/labels/layout)
   - activate behaviors incrementally using explicit states: `ACTIVE_NOW`, `PRESERVE_ONLY`, `POST_MVP_DISABLED`
   - unsupported controls must be visible and non-destructive (no silent payload mutation/loss)
13. Single-agent execution is the default:
   - use subagents only when the user explicitly requests delegation or parallel agent work
   - use at most two concurrent agents unless the user explicitly sets a higher limit
   - each delegated slice must keep TDD + regression discipline from rules `#1` and `#4`
14. Skill-driven browser and visual verification is required for user-visible changes:
   - use the installed `playwright` skill for changed critical UI flows, especially workspace/viewport, Three.js, model, VFX, sound, modal, import, save, and reopen behavior
   - add or update an automated browser scenario when the changed behavior is not adequately covered by unit or regression tests
   - for Aurora parity or rendering work, capture and review a comparable visual result; use the `screenshot` skill only when an OS-level capture is needed, otherwise prefer the browser/Playwright capture path
   - do not mark viewport, model, texture, lighting, VFX, or sound behavior as complete solely from static checks
15. Before starting any non-trivial task, the owning frontend context must check the available skills and use each relevant one when it can materially improve implementation, diagnosis, verification, or delivery. Do not invoke unrelated skills merely because they are installed.
16. Local agent test runs use at most two Vitest workers and the repository test scripts' 1 GB Node heap cap. Agents must not bypass those scripts with bare Vitest/npx/npm-exec commands, must use focused one-shot tests during iteration, and must not use `test:watch` for bounded verification.
17. Vite and browser-proof servers must remain attached to an owning supervisor and be terminated as an exact process tree. Only one frontend-family service may run for the repository, regardless of alias or port.
18. Use the repository `dev` script when a Vite server is required. Its managed service runner enforces the frontend-family lock, caps the managed Node heap at 1 GB, and owns cleanup; do not bypass it with direct Vite startup.
19. Only one browser proof capture may run repository-wide. Capture scripts that launch Chrome must use the global proof-capture lock and a bounded renderer-process count.

## Golden Commands (PowerShell-safe)

Use `npm.cmd` in this environment (Windows + PowerShell).

1. Install deps: `npm.cmd ci`
2. Unit tests: `npm.cmd run test:unit`
3. Regression smoke: `npm.cmd run test:regression`
4. Optional mutation tests (explicit user opt-in and `AURORA_MUTATION_TESTS=1` only): `npm.cmd run test:mutation`

## Pre-merge Must-Pass Gate (Minimal)

Do not merge unless all required checks below pass:

1. `npm.cmd run test:unit`
2. `npm.cmd run test:regression`

Mutation tests are not part of the pre-merge gate unless the user explicitly
requests them for the current task.
