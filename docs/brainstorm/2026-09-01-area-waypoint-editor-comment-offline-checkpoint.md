# Area Waypoint editor Comment offline checkpoint

Date: 2026-09-01  
Checkpoint: 212  
Status: offline implementation verified; live proof pending

## Outcome

Aurora Web now preserves and edits the exact retained type-`5` Waypoint
paired-GIC `Comment : CExoString` through the complete Area Update path. The
admitted profile preserves empty and whitespace-only strings exactly, rejects
NUL, and applies a 4,096-ECMAScript-code-unit product budget. Missing,
ambiguous, wrong-case, wrongly typed, unpaired, or over-budget native storage
remains preserve-only.

The implementation covers exact GIT/GIC ordinal pairing, parse and dependency-
fingerprint binding, immutable snapshot clone/hash, draft projection,
source-GIC-digest-bound CAS planning, GIC-only in-place field replacement,
candidate readback, and revision-fenced atomic publication. The frontend
covers the additive HTTP contract, detached source and editable target,
draft validation/history cloning, provenance reducer, scene mutation facade,
viewport routing, and the active Comments textarea in the Aurora-shaped
Waypoint Properties shell. Cancel, Apply, reopen, OK, and local Save retain
immutable provenance.

## Verification

- 36/36 bounded backend assertions passed across the dedicated Comment
  domain/parser/projector suites and capability catalog;
- the new planner and pair-writer assertions passed 2/2, including exact GIT
  byte preservation for a Comment-only pair mutation;
- the candidate-compiler readback assertion and atomic-publication assertion
  each passed; the latter verifies exact paired-GIC value plus unchanged GIT
  and module IFO;
- 1,062/1,062 frontend HTTP/mapper/draft/clone assertions and 20/20 focused
  domain/provenance/facade/properties/dialog assertions passed;
- the complete frontend regression gate passed 135/135, including Waypoint
  Cancel/Apply/reopen/OK/local Save;
- backend and frontend production builds passed.

The complete backend candidate file retains one unrelated pre-existing
Waypoint-transform/item-deletion expectation failure when run without the
targeted filter. The earlier full frontend unit observation retains the same
two unrelated placeable/renderer expectation failures. No new Waypoint
Comment assertion failed after implementation.

## Evidence and release boundary

Primary reverse evidence, immutable hashes, native reader/writer ownership,
the frozen contract, and observability restrictions are recorded in
`backend/docs/aurora-reverse/area-existing-waypoint-editor-comment-audit-v1-2026-09-01.md`.
Catalog revision `2026-09-01.144` binds this slice to its automated tests.

Fresh guarded browser Save/reopen and exact-candidate Toolset
Save/Build/reopen with packed GIC readback remain independent release gates.
The field is editor-only, so this checkpoint makes no NWN runtime-behavior
claim. It does not certify the remaining Waypoint matrix, full Area CRUD, tile
rendering, the 99-tileset matrix, PathConnect/WOK, or overall program
completion.

## Resource statement

This checkpoint used one bounded local test/build process at a time. It did
not run Docker, containers, services, watchers, browsers, Chrome, capture,
Toolset/NWN, mutation tests, sub-agents, xoreos, or any other GPL source.
