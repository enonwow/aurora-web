# Backend Rules

1. Every controller action must enforce backend authorization.
2. Every non-public action must explicitly define allowed roles (for example with `@Roles(...)`).
3. No role mapping means deny-by-default (`403`) for that action.
4. UI visibility is not a security boundary; authorization checks are mandatory on backend endpoints.
5. Action-specific capabilities must also be guarded by explicit permission checks (for example `@Permissions(...)`).

## Golden Commands (PowerShell-safe)

Use `npm.cmd` in this environment (Windows + PowerShell).

1. Install deps: `npm.cmd ci`
2. Unit tests: `npm.cmd run test:unit`
3. Regression/e2e gate: `npm.cmd run test:e2e`
4. Mutation tests (for logic/auth/guard/policy changes): `npm.cmd run test:mutation`

## Pre-merge Must-Pass Gate (Minimal)

Do not merge unless all required checks below pass:

1. `npm.cmd run test:unit`
2. `npm.cmd run test:e2e`
3. `npm.cmd run test:mutation` (only when changing logic/auth/guards/policies)
