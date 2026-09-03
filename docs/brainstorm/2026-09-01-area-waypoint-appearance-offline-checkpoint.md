# Area Waypoint Appearance offline checkpoint

Date: 2026-09-01  
Checkpoint: 215  
Status: offline implementation verified; live proof pending

## Outcome

Aurora Web now preserves and edits the exact `Appearance : Byte` owned by a
retained type-`5` Waypoint. Primary Aurora decompilation establishes that the
byte is a physical row ordinal in the strongest effective `waypoint.2da`, that
the selected row's `RESREF` supplies the presentation model, and that the
native selector displays `STRREF` text while retaining the physical row
identity. No secondary GPL source was consulted.

The backend resolves one module/ordered-HAK/vanilla effective table, exposes a
strict digest-bound physical-row catalog, attaches immutable table provenance
only when the retained source row is selectable, projects one changed Byte
CAS, revalidates the current descriptor and target row, and changes only the
canonical GIT field. Malformed, absent, duplicated, wrongly cased, wrongly
typed, stale, blank/reserved, out-of-table, or stale-digest input fails closed.

The frontend transports and validates detached provenance, loads one complete
256-row-bounded selector page for the retained digest, ignores stale
asynchronous results, displays physical row/name/model identity, preserves the
source independently from the editable target, and materializes only a row in
the admitted catalog. Older source-only drafts remain preserve-only instead
of inventing a target.

## Verification

- backend focused bounded suites: `58/58` assertions across table parsing,
  source parsing/binding, catalog HTTP/service/repository, hydration,
  projection, planning/persistence, candidate validation, capability catalog,
  and atomic publication;
- atomic publication changed the GIT `Appearance : Byte` and ARE candidate
  while preserving exact GIC and IFO bytes;
- backend production build passed at the fixed 1 GiB Node heap;
- frontend focused selector/HTTP/draft/dialog/facade/clone tests: `13/13`;
- frontend complete workspace-draft boundary plus clone slice: `613/613`;
- frontend production build passed at the fixed 1 GiB Node heap.

The normal type-checking Jest configuration exceeded its fixed 1 GiB heap
during initialization before assertions. Verification used the repository's
one-worker isolated bounded Jest configuration without raising that cap. All
commands were one-shot and no process was left running.

## Evidence and release boundary

Primary reverse evidence, immutable artifact hashes, retail table contents,
the exact storage grammar, admission boundary, and telemetry restrictions are
recorded in
`backend/docs/aurora-reverse/area-existing-waypoint-appearance-audit-v1-2026-09-01.md`.
Capability revision `2026-09-01.147` binds the implementation and tests.
Observability is bound to `area_waypoint_appearance_cas.v1`.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GIT readback, and NWN presentation of every admitted selected row
remain release gates. Target/reference runtime behavior, the remaining
Waypoint property matrix, complete Area CRUD, 99-tileset rendering/linking,
and PathConnect/WOK proof also remain open. This checkpoint does not promote
Waypoint authoring or the Area program to complete.

## Resource statement

This checkpoint used one bounded local test/build process at a time. It did
not run Docker, containers, services, watchers, browsers, Chrome, capture,
Toolset/NWN, mutation tests, sub-agents, xoreos, or other GPL source.
