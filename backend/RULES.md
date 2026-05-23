# Backend Rules

1. Every controller action must enforce backend authorization.
2. Every non-public action must explicitly define allowed roles (for example with `@Roles(...)`).
3. No role mapping means deny-by-default (`403`) for that action.
4. UI visibility is not a security boundary; authorization checks are mandatory on backend endpoints.
5. Action-specific capabilities must also be guarded by explicit permission checks (for example `@Permissions(...)`).
