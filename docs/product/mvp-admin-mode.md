# MVP Admin Mode

## Goal
Define minimal administrator capabilities required to operate `aurora-web` safely in MVP.

## MVP Scope
1. Access system settings panel.
2. Configure environment/project settings required by runtime:
- production project/module source path;
- role-scope configuration inputs;
- integration endpoints/secrets references (through secure config flow).
3. Access operational health/status indicators relevant to platform setup.
4. Initial implementation scope: edit API-layer configuration files through controlled admin actions.

## Permissions
1. Admin mode is restricted to `Administrator` role.
2. Admin actions are deny-by-default and enforced on backend.
3. Privileged config endpoints must require authenticated admin context.

## Non-Goals In MVP
1. No broad superuser bypass for all workflows.
2. No replacement of normal builder/editor role paths.
3. No direct forced publish path that skips validation and authorization.

## Audit And Safety
1. Admin setting changes should produce structured audit events (`who`, `when`, `what`).
2. Sensitive values must not be exposed in plain-text logs.
3. Production defaults remain safe (debug features disabled unless explicitly enabled by policy).

## Open Items
1. Final admin settings surface list for MVP.
2. Rollback policy for configuration mistakes.
3. Minimum approval flow for highest-risk config changes.
4. Final config-file format and safe write strategy (atomic write + backup).

## Related Documents
1. `mvp-authentication-and-authorization.md`
2. `mvp-vision-and-phases.md`
3. `../rules/README.md`
