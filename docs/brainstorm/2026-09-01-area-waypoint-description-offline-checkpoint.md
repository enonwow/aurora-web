# Area Waypoint Description offline checkpoint

Date: 2026-09-01  
Checkpoint: 211  
Status: offline implementation verified; live proof pending

## Outcome

Aurora Web now preserves and edits the exact retained type-`5` Waypoint
`Description` CExoLocString through the complete Area Update path. The admitted
profile is intentionally narrow: unsigned `0xffffffff` string reference,
empty or one language-`0` printable-ASCII entry, and a 4,096-byte product
budget. Every unsupported native shape remains preserve-only.

The implementation covers backend parse, immutable snapshot clone/hash,
draft projection, provenance-bound CAS planning, exact in-place GIT writing,
candidate readback, and revision-fenced atomic publication while preserving
GIC and IFO bytes. The frontend covers the additive HTTP contract, detached
source storage and editable target, draft validation/history cloning,
provenance reducers, scene mutation facade/viewport port, and an Aurora-shaped
Waypoint Properties shell with Basic, Advanced, Description, and Comments
tabs. Cancel, Apply, reopen, OK, and local Save retain immutable provenance.

## Verification

- backend Description domain/parser/projector focused tests: 22 passed;
- backend planner/writer/new candidate Description paths: passed; the complete
  candidate file retains one unrelated pre-existing item-deletion expectation
  failure;
- backend Area Update atomic publication: 83 passed;
- backend production build: passed;
- frontend focused Description/HTTP/mapper/draft/clone/dialog/facade tests:
  1,064 passed across 9 files;
- frontend Workspace Waypoint regression: 1 passed;
- frontend production build: passed.

An earlier full frontend unit observation still contains the two unrelated
known failures in `httpPlaceableApiPort.test.ts` and
`WorkspaceCanvasViewport.renderFilter.test.ts`. No new Waypoint Description
test failed after implementation.

## Evidence and release boundary

Primary reverse evidence, hashes, field semantics, UI evidence, the frozen
contract, and the observability restrictions are recorded in
`backend/docs/aurora-reverse/area-existing-waypoint-description-audit-v1-2026-09-01.md`.
Catalog revision `2026-09-01.143` binds this slice to its automated tests.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed readback, and NWN presentation remain independent release gates.
This checkpoint does not certify the full Waypoint matrix, full Area CRUD,
tile rendering, the 99-tileset matrix, PathConnect/WOK, or overall program
completion.

## Resource statement

This checkpoint used one bounded local test/build process at a time. It did
not run Docker, containers, services, watchers, browsers, Chrome, capture,
Toolset/NWN, mutation tests, sub-agents, xoreos, or any other GPL source.
