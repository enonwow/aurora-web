# MVP Login Panel And Test User Bootstrap

## Goal
Provide a clean login experience on frontend and a minimal backend user bootstrap for early MVP testing.

## Frontend Scope (MVP)
1. Dedicated login screen with:
- `email or username`;
- `password`;
- `Sign in` action;
- clear error state (invalid credentials, account disabled).
2. Session state handling:
- loading state during sign-in;
- authenticated redirect to main workspace;
- unauthenticated users cannot access protected routes.
3. Basic UX quality:
- clear branding/header;
- visible environment label (`dev`/`test`/`prod` when available);
- logout action in authenticated shell.

## Backend Scope (MVP)
1. Authentication endpoints:
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
2. Minimal user storage for bootstrap phase:
- seed `3-4` test users;
- assign roles (`Local Builder`, `Server Builder`, `DMI/GMI`, `Administrator`) as needed for tests.
3. Password handling:
- store hashed passwords only;
- no plaintext credentials in repository docs or logs.
4. Session/token handling:
- short-lived access session;
- invalidation on logout.

## Bootstrap Policy (MVP)
1. Test users are manually curated for early integration tests.
2. No self-registration flow in MVP.
3. No bulk user management UI required in MVP.
4. Admin can rotate/reset test credentials through controlled backend/admin flow.
5. Full user-management expansion is lower priority and can be finalized after core architecture milestones.

## Security Requirements
1. Backend remains source of truth for auth and role checks.
2. Protected endpoints must reject unauthenticated requests.
3. Failed login attempts must return safe errors (no user-enumeration leaks).
4. Auth events should be logged at operational level (success/failure without sensitive payload).

## Test Requirements
1. Unit tests:
- credential verification path;
- token/session lifecycle path.
2. Integration tests:
- login success for each seeded role;
- login failure path;
- route guard behavior for unauthenticated access.
3. Regression smoke:
- login -> open workspace -> logout -> verify access revoked.

## Related Documents
1. `mvp-authentication-and-authorization.md`
2. `mvp-local-draft-save-and-list-visibility.md`
3. `mvp-admin-mode.md`
