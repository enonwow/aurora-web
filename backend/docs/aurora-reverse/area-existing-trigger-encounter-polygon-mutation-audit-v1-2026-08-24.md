# Existing Area Trigger/Encounter polygon mutation audit v1

Date: 2026-08-24  
Status: verified static implementation authority; fresh application-candidate
browser, Toolset, and NWN proof remains open  
Scope: replace the complete local `Geometry` list of one retained Trigger or
Encounter while preserving its origin, orientation/spawn profile, every other
GIT field, and the paired GIC entry

## Decision

Aurora Web may expose and atomically replace the complete local polygon of an
existing `TriggerList` or `Encounter List` entry addressed by immutable source
family and ordinal. The mutation is a whole-list compare-and-swap pair:

- `expectedGeometry` is the exact retained ordered float32 point list;
- `geometry` is the complete target ordered point list;
- both lists contain `3..1024` points;
- every coordinate is finite and representable as finite float32;
- the implicit XY closure has nonzero signed area;
- the target must differ from the expected list after float32 projection.

The 1024-point ceiling is an Aurora Web request/resource budget, not a claim
about a native engine maximum. Lists beyond it stay preserved and are not
editable through this v1 mutation.

For a Trigger, the exact native list is `Geometry : List` of type-`3` structs
with one float each named `PointX`, `PointY`, and `PointZ`. For an Encounter,
it is a list of type-`1` structs with one float each named `X`, `Y`, and `Z`.
The list is implicitly closed; no duplicate closing point is added.

Trigger origin and `XOrientation`/`YOrientation`/`ZOrientation` remain exact.
Encounter origin remains exact and the admitted v1 target must contain exactly
one empty `SpawnPointList`. Populated spawn-point semantics remain outside this
contract. Geometry replacement may coexist with a position-only mutation for
the same retained object because the two mutations target disjoint native
fields. It may not coexist with deletion of that object.

## Primary Aurora evidence

The primary source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
The installed Toolset executable retained for the existing vtable binding is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
SHA-256
`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
Both hashes were re-read on 2026-08-24. No executable or retained evidence was
mutated.

### Trigger lineage

- `FUN_00657a88`, decompiled lines 346276-346432, reads `Geometry`, obtains its
  full list count, iterates the list in ordinal order, reads `PointX`,
  `PointY`, and `PointZ`, and appends each three-float record to the instance
  member list at `+0x88`.
- `FUN_00657de0`, lines 346620-346651, creates one `Geometry` list, iterates
  that complete member list from index zero to its stored count, creates a
  type-`3` struct for each entry, and writes `PointX`, `PointY`, and `PointZ`.
- The same writer separately emits the three origin and three orientation
  floats before the list and the paired GIC `Comment` through its separate
  output lane. Replacing only the member-list value therefore has an exact
  whole-list serialization boundary without changing those fields.

### Encounter lineage

- `FUN_0055e1f8`, decompiled lines 215585-215786, reads the complete
  `Geometry` list in ordinal order as three-float records and independently
  reads `SpawnPointList` into a different instance member list at `+0x16c`.
- `FUN_0055e71c`, lines 215809-215876, creates one `Geometry` list, iterates the
  complete geometry member list at `+0x88`, creates type-`1` structs, and
  writes exact `X`, `Y`, and `Z` floats. It then independently creates and
  serializes `SpawnPointList` as type-`2` structs.
- The origin triple, geometry, spawn points, and paired GIC comment are
  distinct writer lanes. A geometry-only replacement therefore need not
  synthesize or reinterpret spawn behavior.

The paired-list/vtable bindings remain those independently established in the
existing position audits: Trigger vtable `0x00c5c76c` maps writer slot `+0x3c`
to `FUN_00657de0` and reader slot `+0x40` to `FUN_00657a88`; Encounter vtable
`0x00c15634` maps the same slots to `FUN_0055e71c` and `FUN_0055e1f8`.

No xoreos or other GPL implementation source was used.

## Retained native evidence

The retained packed fixture and accepted polygon placement proof already bind
the exact source shapes and implicit closure:

- `codex_npc_item_live_20260713.mod`, SHA-256
  `2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`;
- exact `demo.git`, SHA-256
  `a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`;
- accepted proof root
  `backend/docs/aurora-reverse/evidence/polygon-placement-live-standard-2026-07-14/`.

The native records contain four finite points for both families, and the live
Toolset placement proof saved and read back four-point polygons with nonzero
area and implicit closure. This is authority for exact list structure and
persistence. It is retained evidence, not fresh proof of the web-produced
candidate.

## Frozen application contract

1. Query projection exposes immutable native-local float32 point order for
   retained Trigger and Encounter entries. It does not convert these values
   into world or tile coordinates in the FE-BE contract.
2. The frontend keeps immutable source geometry separate from the editable
   target. Rendering converts local native units to scene tile units only at
   the presentation boundary (`local / 10`) and adds the retained object
   origin; serialization never consumes rendered coordinates.
3. The update planner identifies the target by exact family plus source
   ordinal and requires a complete source/target CAS pair. Missing, duplicate,
   wrong-family, stale, wrong-type, non-finite, degenerate, unchanged, or
   over-budget lists fail closed with
   `422 AREA_UPDATE_OBJECT_MUTATION_INVALID`.
4. The writer replaces exactly one `Geometry` field and preserves field order,
   object list order, struct type, origin, Trigger orientation, Encounter empty
   spawn list, every unrelated GIT field, and paired GIC bytes.
5. Independent candidate and persisted readback compare every float32 target
   point in order and prove all unrelated fields and pair cardinalities remain
   unchanged.
6. Receipts add `polygonUpdatedCounts` and `totalPolygonUpdated`; diagnostics
   and telemetry may include only family, source ordinal, point counts, stage,
   result code, and bounded expected/actual classifications. Raw coordinates,
   ResRefs, bytes, content keys, and host paths are not telemetry labels.
7. The mutation remains part of the existing fenced, idempotent, journaled,
   recoverable Area Update transaction and its atomic ARE/GIT/GIC/IFO
   publication. No standalone write path is introduced.

## Test and proof gates

Required offline implementation gates are domain validation, parser/query
projection, strict frontend response validation, draft round-trip, whole-list
CAS planning, GIT/GIC round-trip, deterministic serialization, candidate
readback, atomic publication integration, UI regression smoke, and production
builds. Required negative cases include wrong family/ordinal, stale expected
point, missing/duplicate/wrong-type Geometry, wrong point struct/field,
non-finite or float32-overflow coordinates, fewer than three or more than 1024
points, zero-area target, duplicate mutation, unchanged target, deletion
collision, non-empty Encounter spawn list, and response/request budget excess.

Fresh browser edit/Save/reopen, exact-candidate Toolset Save/Build/reopen, and
NWN trigger/encounter behavior remain release blockers. The source contract
does not claim Trigger activation, Encounter spawning, pathing, or runtime
traversability.

## Offline implementation result

The source-closed v1 slice is implemented through the complete offline Area
Update path:

- the strict GIT parser and Area repository expose only exact type-`3` Trigger
  and type-`1` Encounter polygons, retaining family and immutable source
  ordinal;
- backend and frontend domains independently enforce finite float32 values,
  `3..1024` points, exact key shape, native-local coordinate space, nonzero XY
  area, and ordered whole-list equality;
- the workspace keeps immutable source and editable target polygons separate,
  deep-clones both in history snapshots, and admits edits only for retained
  source-provenant Trigger/Encounter objects;
- the editor supports ordered point update, add, remove, source reset,
  Apply/OK/Cancel, camera-bound placement, and the shared undo/redo commit path;
- the Three.js guide renders the complete closed polygon in world space using
  presentation-only `native_local / 10` conversion and the established scene
  axis mapping; it never feeds presentation coordinates into serialization;
- the projector, planner, candidate compiler, GIT/GIC pair writer, candidate
  validator, persisted readback, receipt, and atomic publication transaction
  carry one exact family/ordinal-bound polygon CAS without changing ARE, GIC,
  IFO, origin, orientation, spawn-list, or unrelated GIT bytes;
- API receipts expose bounded per-family and total updated counts without
  logging coordinates or resource identifiers.

Accepted resource-bounded gates on 2026-08-24 are 1,650/1,650 assertions in the
seven directly impacted backend unit suites, 1/1 focused atomic-publication
integration assertion, 172/172 assertions in twelve directly impacted frontend
unit suites, 1/1 dedicated frontend regression-smoke assertion, 12/12 immutable
capability-catalog assertions, and passing backend and frontend production
builds. The capability row is consequently
`verified/implemented/blocked`, not release-available.

No managed service, browser, capture, Toolset, or NWN process was started or
stopped for this offline checkpoint. Fresh application-candidate browser
Save/reopen, exact-candidate Toolset Save/Build/reopen, and NWN Trigger and
Encounter behavior remain mandatory and must be attached before the release
state can become available.

The repository-wide shared-worktree gates are not claimed green. The complete
frontend unit run passed 3,313/3,315 assertions; both failures are in the
concurrently changing Placeable/VFX payload and material-side expectations.
The complete frontend regression-smoke run passed 82/84 assertions; both
failures are stale Door transition UI expectations. The complete bounded
backend unit run passed 4,732/4,736 assertions. Its one Area failure was an
outdated application-service fixture missing the already-required tile
production-admission port and now passes 4/4 after repair; the other three
failures are in concurrent VFX/lighting proof contracts. None of these broad
failures occurred in the polygon path, but they remain repository-level debt.
