# MVP Authentication And Authorization

## Goal
Define the MVP access model for `aurora-web` so that each user can only access the workflows and data they are allowed to use.

## Scope
1. Authentication: confirm user identity before access to protected features.
2. Authorization: enforce role-based access for modules, projects, and operations.
3. List visibility separation: role-gate access to `Production Areas` and `Local Drafts`.
4. Save target policy in MVP: editor `Save` writes local drafts only.
5. Login panel and test-user bootstrap scope are defined in `mvp-login-panel-and-test-user-bootstrap.md`.

## Role Model (MVP v0)
The project uses three role groups.

### Role Group 1: Local Builder
1. Works only with own `Local Drafts`.
2. Does not see `Production Areas` list in UI.
3. Cannot access production catalog endpoints.
4. Cannot delete production areas.
5. Cannot use GM/DM privileged operations.
6. `Save` always writes local draft.

### Role Group 2: Server Builder
1. Sees two lists/tabs:
- `Production Areas`;
- `Local Drafts`.
2. Can browse and open production areas.
3. `Save` still writes local draft in MVP.
4. Opening a production area uses `copy-on-open` working-copy behavior (user-owned local draft), not shared direct write.
5. Direct production publish policy is an open decision (not assumed in MVP).
6. Cannot access system administration settings by default.
7. Production area deletion is not granted by default.

### Role Group 3: Operations And Administration
This group contains privileged sub-roles:

1. `DMI/GMI` sub-role:
- access to privileged runtime operation panels/features (DMA/GM style features);
- not available to standard users.

2. `Administrator` sub-role:
- access to system settings only (for example project path configuration for role scopes);
- responsible for critical platform configuration;
- this role handles settings management for the project.
- detailed admin surface is defined in `mvp-admin-mode.md`.

### DM/GM Runtime Mode
1. DM/GM privileged runtime actions are defined in `mvp-dm-demo-mode.md`.
2. DM runtime actions require backend role enforcement per command.
3. DM runtime access does not imply unrestricted editor or admin rights.

## Permission Boundaries
1. `Local Drafts` and `Production Areas` must be treated as separate authorization targets.
2. Feature visibility in UI must match permissions, but server checks are the source of truth.
3. Every API endpoint must validate identity and role permissions.
4. Privileged actions must fail closed (deny by default).
5. Production catalog/list endpoints must deny unauthorized users even if they call backend directly.

## Deletion Policy (MVP)
1. Area deletion is restricted and not available to standard role flows.
2. Deletion operations are executed only by authorized maintainers through explicit workflow.
3. Local draft deletion is allowed only for draft owner data in local workspace.

## Security Implementation Requirements
1. Use short-lived authenticated sessions/tokens with rotation/expiration strategy.
2. Enforce authorization in backend handlers, not only in frontend routing.
3. MVP requires authorization-failure telemetry and basic operational logging.
4. Full privileged audit trail (`who/when/what` for all critical actions) is planned for post-MVP.
5. Keep debug privilege paths disabled in production unless explicitly enabled for authorized admin workflows.
6. Test bootstrap users must use hashed passwords and controlled credential rotation.

## Contract And Testing Requirements
1. Define a permission contract per endpoint/action (`who can call what`).
2. Add role-based integration tests for allow/deny behavior.
3. Add regression tests for permission leaks (role escalation, unauthorized path access).
4. Add telemetry for authorization failures (without exposing sensitive data).
5. Add explicit negative tests for production-list endpoint access from `Local Builder`.
6. Add role-based tests for export endpoint (`local draft export allowed`, `production-list leakage denied`).

## Open Items For Next Design Step
1. Final naming for role groups and sub-roles in UI.
2. Post-MVP policy for any direct production publish path (MVP baseline stays local-draft save + export flow).
3. Final mapping between role permissions and concrete endpoint list.
4. Final local-draft storage format and quota policy.
5. Final seed-user provisioning method for each environment.
