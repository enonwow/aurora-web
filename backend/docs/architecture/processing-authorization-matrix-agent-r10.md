# Processing Authorization Matrix (Agent R10)

## Scope
This matrix defines authorization for new processing endpoints:
- `processing/placeable`
- `processing/creature`
- `processing/area`

It is aligned with current backend auth primitives:
- Roles: `viewer`, `builder`, `dm`, `admin`
- Permissions: `scene.read`, `asset.preview`, `scene.edit`, `asset.place`, `asset.delete`, `dm.spawn_creature`, `dm.spawn_vfx`, `admin.config.write`, `admin.user.manage`
- Decorators: `@Roles(...)`, `@Permissions(...)`

## Minimal Policy Defaults (Deny-by-default)
1. Every non-public processing route MUST declare `@Roles(...)`.
2. Missing `@Roles` or `@Roles()` with empty list is forbidden (`403 FORBIDDEN_ROLE`) by `AccessGuard`.
3. Every action beyond plain read SHOULD declare explicit `@Permissions(...)`.
4. Class-level defaults are allowed, but sensitive actions MUST override/add method-level permissions.
5. If an operation does not map to an existing permission, deny access until a new permission is introduced and wired in `auth.policy.ts`.

## Role Baseline
- `viewer`: read-only (`scene.read`, `asset.preview`)
- `builder`: editing placement (`scene.read`, `scene.edit`, `asset.place`, `asset.delete`)
- `dm`: gameplay spawning (`scene.read`, `dm.spawn_creature`, `dm.spawn_vfx`)
- `admin`: builder-like + admin management (`scene.read`, `scene.edit`, `asset.place`, `asset.delete`, `admin.*`)

## Processing Operation Matrix
| Processing resource | Operation | Endpoint shape (proposed) | Roles (`@Roles`) | Permissions (`@Permissions`) | Notes |
|---|---|---|---|---|---|
| `placeable` | List jobs/templates | `GET /processing/placeable` | `viewer,builder,dm,admin` | `scene.read` | Safe read metadata |
| `placeable` | Get job/result | `GET /processing/placeable/:jobId` | `viewer,builder,dm,admin` | `scene.read` | Read-only details |
| `placeable` | Preview output | `GET /processing/placeable/:jobId/preview` | `viewer,builder,dm,admin` | `asset.preview` | Aligns with visual preview semantics |
| `placeable` | Start processing | `POST /processing/placeable` | `builder,admin` | `scene.edit` | Creates/modifies derived scene assets |
| `placeable` | Apply/place result | `POST /processing/placeable/:jobId/apply` | `builder,admin` | `asset.place` | Mutating placement |
| `placeable` | Delete/cancel job/result | `DELETE /processing/placeable/:jobId` | `builder,admin` | `asset.delete` | Mutating removal |
| `creature` | List jobs/templates | `GET /processing/creature` | `viewer,builder,dm,admin` | `scene.read` | Safe read metadata |
| `creature` | Get job/result | `GET /processing/creature/:jobId` | `viewer,builder,dm,admin` | `scene.read` | Read-only details |
| `creature` | Preview output | `GET /processing/creature/:jobId/preview` | `viewer,builder,dm,admin` | `asset.preview` | Read-only preview |
| `creature` | Start creature processing/spawn plan | `POST /processing/creature` | `dm,admin` | `dm.spawn_creature` | DM domain action |
| `creature` | Apply spawn | `POST /processing/creature/:jobId/apply` | `dm,admin` | `dm.spawn_creature` | Keep same permission for apply |
| `creature` | Delete/cancel job/result | `DELETE /processing/creature/:jobId` | `dm,admin` | `dm.spawn_creature` | No dedicated delete permission for DM today |
| `area` | List jobs/templates | `GET /processing/area` | `viewer,builder,dm,admin` | `scene.read` | Safe read metadata |
| `area` | Get job/result | `GET /processing/area/:jobId` | `viewer,builder,dm,admin` | `scene.read` | Read-only details |
| `area` | Preview output | `GET /processing/area/:jobId/preview` | `viewer,builder,dm,admin` | `asset.preview` | Read-only preview |
| `area` | Start area processing | `POST /processing/area` | `builder,admin` | `scene.edit` | Area-level transformation |
| `area` | Apply processed area | `POST /processing/area/:jobId/apply` | `builder,admin` | `asset.place` | Writes area composition |
| `area` | Delete/cancel job/result | `DELETE /processing/area/:jobId` | `builder,admin` | `asset.delete` | Mutating removal |

## Decorator Profiles (ready to copy)

### `processing/placeable`
- Controller default (read): `@Roles(...ALL_ROLES)` + `@Permissions("scene.read")`
- Method overrides:
  - `POST /`: `@Roles("builder", "admin")` + `@Permissions("scene.edit")`
  - `POST /:jobId/apply`: `@Roles("builder", "admin")` + `@Permissions("asset.place")`
  - `DELETE /:jobId`: `@Roles("builder", "admin")` + `@Permissions("asset.delete")`
  - `GET /:jobId/preview`: `@Permissions("asset.preview")`

### `processing/creature`
- Controller default (read): `@Roles(...ALL_ROLES)` + `@Permissions("scene.read")`
- Method overrides:
  - `POST /`: `@Roles("dm", "admin")` + `@Permissions("dm.spawn_creature")`
  - `POST /:jobId/apply`: `@Roles("dm", "admin")` + `@Permissions("dm.spawn_creature")`
  - `DELETE /:jobId`: `@Roles("dm", "admin")` + `@Permissions("dm.spawn_creature")`
  - `GET /:jobId/preview`: `@Permissions("asset.preview")`

### `processing/area`
- Controller default (read): `@Roles(...ALL_ROLES)` + `@Permissions("scene.read")`
- Method overrides:
  - `POST /`: `@Roles("builder", "admin")` + `@Permissions("scene.edit")`
  - `POST /:jobId/apply`: `@Roles("builder", "admin")` + `@Permissions("asset.place")`
  - `DELETE /:jobId`: `@Roles("builder", "admin")` + `@Permissions("asset.delete")`
  - `GET /:jobId/preview`: `@Permissions("asset.preview")`

## Consistency Rules
1. Do not rely on role-only checks for mutable operations; always add permission checks.
2. Keep `@Roles` and `@Permissions` both present on non-trivial write methods.
3. If introducing `PATCH`/`PUT` methods, map them as mutating (`scene.edit` minimum).
4. If future processing needs dedicated controls, add new permissions (e.g. `processing.job.manage`) instead of overloading unrelated ones.

## Open Gap (current model)
`dm` role has no delete-specific permission. For `processing/creature` cancellation/removal we currently reuse `dm.spawn_creature` as minimum viable policy. If finer control is required, introduce a new permission and update `ROLE_PERMISSIONS`.
