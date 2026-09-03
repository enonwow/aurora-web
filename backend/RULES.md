# Backend Rules

1. Every controller action must enforce backend authorization.
2. Every non-public action must explicitly define allowed roles (for example with `@Roles(...)`).
3. No role mapping means deny-by-default (`403`) for that action.
4. UI visibility is not a security boundary; authorization checks are mandatory on backend endpoints.
5. Action-specific capabilities must also be guarded by explicit permission checks (for example `@Permissions(...)`).
6. For an explicitly requested security review, threat model, or secure-by-default change, use the installed `security-best-practices` skill for TypeScript/NestJS guidance.
7. For an explicitly requested repository threat-modeling task, use the installed `security-threat-model` skill and record the trust boundaries, assets, abuse paths, and mitigations in the requested Markdown deliverable.
8. Changes to authentication, authorization, uploads, module/blob delivery, path handling, or public/static routes require focused security tests in addition to the ordinary test gate.
9. Before starting any non-trivial task, the owning backend context must check the available skills and use each relevant one when it can materially improve implementation, diagnosis, verification, or delivery. Do not invoke unrelated skills merely because they are installed.
10. Mutation tests are optional and must not be run unless the user explicitly requests them in the current task. They are not a completion or pre-merge requirement for logic, auth, guard, or policy changes.
11. Local agent test runs use at most two Jest workers and the repository test scripts' 1 GB Node heap cap. Agents must not bypass those scripts with bare Jest/npx/npm-exec commands, must use focused one-shot tests during iteration, and must not use `test:watch` for bounded verification.
12. Long-running backend processes must remain attached to an owning supervisor and be terminated as an exact process tree. Only one backend-family service may run for the repository, regardless of alias or port.
13. Use the repository `start:dev` script for a required backend watcher. Its managed service runner enforces the backend-family lock, caps the managed Node heap at 1 GB, and owns cleanup; do not bypass it with direct Nest CLI startup.
14. Only one browser proof capture may run repository-wide. Capture scripts that launch Chrome must use the global proof-capture lock and a bounded renderer-process count.

## Golden Commands (PowerShell-safe)

Use `npm.cmd` in this environment (Windows + PowerShell).

1. Install deps: `npm.cmd ci`
2. Unit tests: `npm.cmd run test:unit`
3. Regression/e2e gate: `npm.cmd run test:e2e`
4. Optional mutation tests (explicit user opt-in and `AURORA_MUTATION_TESTS=1` only): `npm.cmd run test:mutation`

## Pre-merge Must-Pass Gate (Minimal)

Do not merge unless all required checks below pass:

1. `npm.cmd run test:unit`
2. `npm.cmd run test:e2e`

Mutation tests are not part of the pre-merge gate unless the user explicitly
requests them for the current task.
