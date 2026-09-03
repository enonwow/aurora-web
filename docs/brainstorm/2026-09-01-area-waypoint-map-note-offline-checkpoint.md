# Area Waypoint map-note vector offline checkpoint

Date: 2026-09-01  
Checkpoint: 213  
Status: offline implementation verified; live proof pending

## Outcome

Aurora Web now preserves and edits the exact retained type-`5` Waypoint
`HasMapNote : Byte`, `MapNote : CExoLocString`, and
`MapNoteEnabled : Byte` members as one atomic vector. Exact reciprocal Aurora
reader/writer ownership and frozen Waypoint Properties Advanced-tab resources
are source-closed. The admitted localized member is unsigned inline language-
0 printable ASCII with a 4,096-byte ceiling; unsupported storage remains
preserve-only.

The implementation covers parser admission, dependency-fingerprint binding,
snapshot clone/hash, draft projection, immutable-ordinal CAS planning,
three-field in-place GIT replacement, candidate readback, and revision-fenced
atomic publication with exact GIC/IFO preservation. The frontend covers the
strict HTTP contract, detached source and target, workspace validation/history
clone, provenance reduction, facade routing, the three Advanced-tab controls,
and Cancel/Apply/reopen/OK/local Save.

## Verification

- backend domain/parser `14/14`, projector `9/9`, bounded persistence `3/3`;
- candidate compiler `1/1` and atomic publication `1/1`;
- backend production build passed;
- frontend transport/mapper/draft/domain/facade/properties `1075/1075`;
- Waypoint Properties dialog `2/2`;
- real Workspace Cancel/Apply/reopen/OK/local-Save regression `1/1`;
- frontend production build passed.

The default non-isolated Jest transform exceeded the repository's 1 GB heap
while loading the very large historic planner/writer suites. It was not
retried or given more memory. The required assertions were moved to the
repository's isolated bounded configuration and passed in seconds. No process
was left running.

## Evidence and release boundary

Primary reverse evidence, immutable hashes, exact native fields, the frozen
contract, and telemetry restrictions are recorded in
`backend/docs/aurora-reverse/area-existing-waypoint-map-note-audit-v1-2026-09-01.md`.
Capability revision `2026-09-01.145` binds the implementation and tests.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
packed GIT readback, and separate NWN runtime map-pin proof remain release
gates. `Appearance`, target/reference runtime semantics, the remaining
Waypoint matrix, complete Area CRUD, 99-tileset rendering/linking, and
PathConnect/WOK remain open.

## Resource statement

This checkpoint used one bounded local test/build process at a time. It did
not run Docker, containers, services, watchers, browsers, Chrome, capture,
Toolset/NWN, mutation tests, sub-agents, xoreos, or other GPL source.
