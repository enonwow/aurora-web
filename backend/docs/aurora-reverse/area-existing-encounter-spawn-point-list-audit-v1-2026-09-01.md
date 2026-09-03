# Existing Area Encounter ordered `SpawnPointList` CAS audit v1

Date: 2026-09-01  
Status: primary-source storage semantics closed; offline implementation complete; live proof pending  
Scope: add, edit, remove, and reorder the complete native spawn-point vector
of one retained, stationary type-`7` Area Encounter

## Decision

Aurora Web may expose one exact retained `SpawnPointList` as immutable source
provenance plus a detached complete target vector. The admitted mutation uses
full compare-and-swap semantics and may add, edit, remove, or reorder entries.
It replaces only the existing top-level list value at the same physical field
position. Every target entry is serialized canonically as a type-`2` struct
with exactly four ordered float fields:

```text
X, Y, Z, Orientation
```

All four values are finite exact IEEE-754 binary32 numbers. Coordinates remain
in native GIT Area units and orientation remains the native serialized float;
the web contract does not relabel it as a Toolset UI angle or infer a runtime
heading convention. The list is capped at 1024 entries.

This slice does not admit an Encounter origin transform in the same mutation
when the source or target spawn-point list is non-empty. Native evidence proves
that origin and spawn points are serialized independently, but it does not yet
prove whether a Toolset move intentionally rewrites spawn-point positions.
The existing transform lane therefore remains fail-closed for populated lists.
Creature selection, spawn scheduling, runtime pathing, polygon semantics, and
NWN spawning behavior are outside this storage-only authority.

## Immutable Aurora evidence

The primary source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
The symbol index is
`C:/Projects/New Folder/export/functions.tsv`, SHA-256
`394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`.
No xoreos or other GPL source was inspected or used.

The recovered placed-Encounter lineage is exact:

- `FUN_0055e1f8`, address `0x0055e1f8`, size `1206`, lines
  `215585..215786`, first invokes the common Encounter reader, then reads the
  origin and `Geometry`, opens exact list label `SpawnPointList`, retains its
  physical count and order, and reads `X`, `Y`, `Z`, and `Orientation` from
  every entry;
- the reader initializes a rotation value, converts the serialized
  `Orientation` through the native rotation helper, constructs one spawn-point
  object with the three serialized coordinates, and appends it to the
  Encounter-owned vector;
- `FUN_0055e71c`, address `0x0055e71c`, size `503`, lines
  `215809..215876`, invokes the reciprocal common writer, writes origin and
  Geometry, opens exact `SpawnPointList`, creates one struct with native type
  ID `2` per retained vector element, and emits the four exact labels in order
  through the native float writer;
- paired GIC `Comment` is read and written after this GIT list through a
  distinct lane, so a list-only mutation does not require a GIC change;
- the independently retained PE binding maps Encounter vtable `0x00c15634`
  reader slot `+0x40` to `0x0055e1f8` and writer slot `+0x3c` to
  `0x0055e71c`.

The direct reader/writer pair is implementation authority for exact storage
shape, list order, entry type, labels, native field types, and separation from
origin, Geometry, common Encounter fields, and paired GIC. It does not by
itself prove user-visible Toolset angle presentation or runtime spawn behavior.

## Existing evidence boundary

The retained native construction fixture and the earlier read-only corpus scan
contain only empty Encounter spawn-point lists. The scan covered 176 packed
modules and 4,529 GIT resources with no extraction or parse failure. That is
evidence that empty lists are common in the available local corpus, not
authority to reject the populated grammar recovered from Aurora.

The accepted construction readback remains at
`backend/docs/aurora-reverse/evidence/area-encounter-construction-2026-08-13/native-toolset-instance-readback.json`.
Its exact empty list is not a populated-list round-trip proof.

## Frozen web contract

Immutable source provenance is:

```text
encounterSpawnPoints.expectedEntries[] =
  { sourceIndex, nativeX, nativeY, nativeZ, orientation }
```

`sourceIndex` is contiguous physical order. The detached target omits source
indices and contains the same four binary32 values. `propertyMutations`
contains a complete pair:

```text
spawnPoints = { expectedEntries, entries }
```

The expected vector must exactly match a fresh parse of the retained source.
The target may have a different count and order but must be valid and changed.
An empty target retains the exact top-level `SpawnPointList` field with an
empty list, matching the placed writer. Missing, duplicate, wrong-case,
wrong-type, wrong-entry-type, wrong-field-count/order, non-finite,
non-binary32, stale, unchanged, over-budget, wrong-family, out-of-range,
duplicate-mutation, or deletion-colliding input fails closed with
`AREA_UPDATE_OBJECT_MUTATION_INVALID`.

The writer preserves top-level field order, every unrelated GIT member,
Geometry, CreatureList, paired GIC, ARE, IFO, resource order, and the existing
atomic publication/recovery boundary. Candidate and persisted readback must
reproduce the exact target vector.

## Offline implementation result

Capability revision `2026-09-01.137` implements the frozen boundary end to
end. The backend now parses and fingerprints immutable provenance, projects
one detached complete target, replans against a fresh raw GIT, rejects stale
source vectors, writes the canonical type-`2` list, composes property and
stationary transform readback expectations correctly, verifies the compiled
candidate, and publishes one exact ARE/GIT/GIC/IFO revision with persisted
readback. The frontend transport, mapper, workspace boundary, independent
clone/history state, polygon-properties authoring shell, scene facade, and
viewport expose edit/add/remove/reorder without aliasing source provenance.

Resource-bounded accepted gates are:

- `25/25` Encounter SpawnPointList domain plus capability-catalog assertions;
- `2/2` focused parser assertions, `630/630` projector assertions, `424/424`
  raw-GIT planner assertions, `979/979` pair-writer assertions, and `168/168`
  candidate-compiler assertions;
- `77/77` Area Update atomic-publication assertions, including exact
  persisted two-entry SpawnPointList readback with unchanged GIC and IFO;
- `1083/1083` focused frontend domain, transport, mapper, workspace, clone,
  authoring, facade/port, and real Workspace Apply/Cancel/reopen/OK/local-Save
  assertions;
- both production builds.

The full backend Area parser file has `325` passing assertions and two
independent pre-existing Item-metadata expectation failures involving
`comments/cost/palette/script.*`. Both focused SpawnPointList parser cases pass;
the unrelated dirty-worktree failures were not modified or misreported as
part of this checkpoint.

## Diagnostics and proof boundary

The additive low-cardinality event is
`area_encounter_spawn_point_list_cas.v1`. It records only operation, outcome,
stable result code, changed-entry count, and duration. Coordinates,
orientation values, object IDs, ordinals, paths, hashes, source keys, and raw
fields or bytes are prohibited from routine telemetry.

No Toolset/NWN process, browser, service, Chrome process, capture, Docker
command, mutation test, sub-agent, xoreos source, or other GPL source was used
for this audit. Browser Save/reopen, exact Toolset Save/Build/reopen with
populated-list readback, rollback, independent validated `TScrollBox` capture,
and NWN spawn behavior are `missing` proof points. They remain release gates
and this audit must not be reported as runtime certification.

## Acceptance gates

The offline gates—domain boundaries, malformed GFF parsing, canonical writer
round-trip, stale CAS rejection, structural CRUD, composition, candidate and
persisted readback, frontend transport/mapper/workspace/history, and the real
Apply/Cancel/reopen/OK/local-Save regression—are satisfied. Product completion
still requires a fresh profile-bound Toolset transaction with exact before/
after/rollback readback and a task-appropriate NWN runtime observation under
the canonical proof workflow.
