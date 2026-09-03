# Area Waypoint ordered VarTable offline checkpoint

Date: 2026-09-01  
Checkpoint: 214  
Status: offline implementation verified; live proof pending

## Outcome

Aurora Web now preserves and edits the exact ordered `VarTable` owned by a
retained type-`5` Waypoint. Primary Aurora common reader/writer paths establish
the physical list and its exact entry members: `Name : CExoString`,
`Type : DWord`, and type-dependent `Value : Int|Float|CExoString`. Frozen
Waypoint Properties resources establish the native `Variables...` control.
No secondary GPL source was consulted.

The admitted shared-variable profile preserves order, duplicate names, empty
names, and empty string values. It accepts at most 1,024 entries; NUL-free
names up to 64 code units; NUL-free string values up to 4,096 code units; at
most 1 MiB of aggregate text; signed 32-bit integers; and finite values exactly
representable as IEEE-754 binary32. An absent list is editable as an empty
table, and an empty target removes `VarTable`. Unsupported or malformed
storage remains preserve-only.

The implementation covers parser admission, dependency-fingerprint binding,
snapshot clone/hash, draft projection, immutable-ordinal full-table CAS,
ordered in-place GIT replacement/removal, candidate readback, and
revision-fenced atomic publication with exact GIC/IFO preservation. The
frontend covers the strict HTTP contract, detached source and target, workspace
validation/history clone, provenance reduction, facade routing, the native
`Variables... (count)` editor with add/edit/remove/reorder, and
Cancel/Apply/reopen/OK/local Save.

## Verification

- backend domain/parser/projector/persistence: `21/21`;
- candidate compiler: `1/1`;
- atomic publication: `1/1` with exact GIC and IFO byte preservation;
- backend production build passed;
- frontend focused transport/mapper/draft/domain/facade/properties/dialog/clone:
  `1081/1081`;
- real Workspace Cancel/Apply/reopen/OK/local-Save regression: `1/1`;
- frontend production build passed.

All checks used repository-bounded one-shot runners with one worker. No process
was left running.

## Evidence and release boundary

Primary reverse evidence, immutable hashes, the exact storage grammar,
admission boundary, and telemetry restrictions are recorded in
`backend/docs/aurora-reverse/area-existing-waypoint-variable-table-audit-v1-2026-09-01.md`.
Capability revision `2026-09-01.146` binds the implementation and tests.
Observability is bound to `area_waypoint_variable_table_cas.v1`.

Fresh guarded browser Save/reopen and exact-candidate Toolset
Save/Build/reopen with packed GIT readback remain release gates. Waypoint
`Appearance`, target/reference runtime semantics, the remaining Waypoint
matrix, complete Area CRUD, 99-tileset rendering/linking, and PathConnect/WOK
remain open. This checkpoint does not promote Waypoint authoring or the Area
program to complete.

## Resource statement

This checkpoint used one bounded local test/build process at a time. It did
not run Docker, containers, services, watchers, browsers, Chrome, capture,
Toolset/NWN, mutation tests, sub-agents, xoreos, or other GPL source.
