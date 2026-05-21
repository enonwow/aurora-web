# MVP DM Demo Mode

## Goal
Provide a controlled runtime/demo mode for privileged GM/DM users without exposing full editor behavior.

## MVP Scope
1. Load and view areas in read-only runtime mode.
2. Allow privileged live actions (for example spawn creature) via backend command path.
3. Keep actions auditable and role-gated.

## Phase 1 DM Action (First Implementation)
1. DM places/spawns creature in runtime panel.
2. Frontend calls DM API controller with payload:
- area id/resref;
- creature `resref`;
- target position/rotation;
- optional metadata (issuer/session correlation id).
3. API validates role and payload, then enqueues Redis command for NWNX consumer.
4. NWNX consumer parses payload and triggers the mapped NWN script/method.

## Command Path (MVP)
1. DM user triggers runtime action in UI.
2. Backend validates role and payload.
3. Backend publishes command to Redis/NWNX integration lane.
4. NWN runtime consumes and executes command.

## Job vs Queue Message (Implementation Guidance)
1. Queue message:
- the actual command payload sent to Redis for NWNX execution;
- required for runtime action delivery.
2. Job record:
- optional backend tracking entity (status/timestamps/error reason/retry count);
- useful for diagnostics and admin observability, but can start minimal.
3. Minimal MVP recommendation:
- always send queue message;
- keep lightweight job record for traceability (`queued`, `sent`, `acknowledged`, `failed`).

## Permissions
1. DM mode is available only to privileged roles (`DMI/GMI`, and optionally `Administrator` by policy).
2. Standard builder roles do not access DM runtime actions.
3. Backend authorization is mandatory for every DM command.

## Non-Goals In MVP
1. No direct use of DM mode as production content publishing path.
2. No bypass of role checks through hidden UI routes.
3. No full gameplay admin suite beyond approved DM action set.

## Open Items
1. Final allowed DM action list for MVP (phase 1 starts with `spawn creature`).
2. Rate limits and abuse controls for DM command endpoints.
3. Minimum audit event schema for DM runtime actions.

## Related Documents
1. `mvp-vision-and-phases.md`
2. `mvp-authentication-and-authorization.md`
3. `mvp-local-draft-save-and-list-visibility.md`
