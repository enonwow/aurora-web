# Existing Area Waypoint editor `Comment` audit v1

Date: 2026-09-01  
Status: source-closed; additive contract frozen; offline implementation verified; live proof pending

## Decision

Aurora Web may expose and mutate an existing Waypoint editor comment only
when the source Area contains one exact ordinal-paired GIT/GIC Waypoint:

- root list label `WaypointList` in both resources;
- Waypoint struct type `5` in both resources;
- identical GIT and GIC Waypoint-list cardinality;
- exactly one case-sensitive GIC `Comment : CExoString` on the matching
  immutable ordinal;
- a string containing at most 4,096 ECMAScript code units and no NUL code
  unit.

Empty and whitespace-only strings are valid and remain exact. There is no
trimming, normalization, silent truncation, field synthesis, GIT fallback, or
blueprint-Comment substitution. Missing, duplicated, wrong-case, wrongly
typed, over-budget, NUL-bearing, unpaired, or wrong-family storage is
`PRESERVE_ONLY`.

This slice changes Toolset editor text only. It does not authorize Waypoint
runtime behavior, transition/reference semantics, map-note behavior,
variables, appearance, localized text, template identity, or construction.
Those remain independent contracts.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |

No xoreos or other GPL source was inspected or used.

## Native paired-resource closure

Placed-Waypoint reader `FUN_00659970` begins at decompiled line `347595`.
It first reads the common type-`5` GIT state through `FUN_00658170`, then
reads placement and orientation. When both paired-resource arguments are
present, lines `347652..347655` read exact label `Comment` through
`FUN_00aef090` into the placed Waypoint member at `param_1 + 0x98`.

Reciprocal writer `FUN_00659bfc` begins at line `347723`. It writes the common
GIT state, placement, and orientation, then its paired-resource branch at
lines `347753..347754` writes the same `param_1 + 0x98` member under exact
label `Comment` through `FUN_00af0084`.

The native helper reader rejects a field whose native type ID is not `10` at
line `968176`. The helper writer can create a missing target as type ID `10`
at line `968955`; Aurora Web deliberately does not use that synthesis behavior
for a retained instance. It admits only one already-present exact field.
Independent GIT/GIC pairing fixtures bind `WaypointList` to struct type `5`
and make same-index cardinality part of the source contract.

## Frozen additive contract

Area detail may add `waypointMetadata.editorComment` only for admitted exact
paired provenance. The frontend deep-copies it under immutable
`source.waypointEditorComment` and authors a separate top-level
`waypointEditorComment` target.

A changed retained Waypoint adds one optional member beside independently
admitted Tag, LocalizedName, and Description mutations:

```json
{
  "kind": "waypoint",
  "sourceObjectId": "waypoint:0:nw_waypoint001:source",
  "sourceIndex": 0,
  "editorComment": {
    "expectedValue": " west route ",
    "value": " west route - reviewed "
  }
}
```

Expected and target values must both satisfy the bounded exact-string profile
and must differ. Planning reparses exact source GIT/GIC, requires one canonical
paired ordinal, verifies the exact source value, and rejects an out-of-range,
duplicate, stale, wrong-family, deletion-colliding, or malformed mutation.
Writing replaces only that GIC field in place. A comment-only pair mutation
keeps GIT bytes exact; independently admitted ARE or other object changes may
coexist in the same atomic candidate. Exact candidate and persisted paired
readback are mandatory before revision-fenced publication.

The existing request/object/property ceilings, authorization, permission,
approved-token, idempotency, optimistic-concurrency, fencing, journal,
rollback, recovery, and atomic ARE/GIT/GIC/IFO publication contracts remain
unchanged. No endpoint, binary body, pagination, chunking, or streaming is
added.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_waypoint_editor_comment_cas.v1` with bounded operations
`parse_source|plan|write|readback`, outcome, stable result code,
changed-field count, and duration. Comment contents, object IDs, ordinals,
hashes, paths, source/storage keys, raw fields/bytes, credentials, and host
paths are prohibited from routine event fields and metric labels. Telemetry
failure must never alter validation, mutation, transaction, rollback,
recovery, or publication.

Offline acceptance requires parser admission/rejection, fingerprint binding,
detached source and target state, deep cloning, visible
`ACTIVE_NOW`/`PRESERVE_ONLY` Comments UI, Apply/Cancel/reopen/OK/local Save,
projector/planner/writer/candidate readback, exact GIT preservation for the
comment-only pair mutation, coexistence with the other admitted Waypoint
mutations, atomic publication, regression coverage, capability-catalog
coverage, and both production builds.

The backend now parses the exact same-index type-`5` paired-GIC Comment,
retains it as detached Waypoint metadata, binds it into snapshot identity,
projects and replans one digest-bound CAS, performs a GIC-only field
replacement, verifies candidate and persisted readback, and publishes through
the existing revision-fenced transaction. The frontend validates and clones
the metadata, keeps immutable source separate from the editable target,
exposes the bounded Comments textarea, and preserves the distinction through
history, reset, Apply, Cancel, reopen, OK, and local Save.

Focused backend domain/parser/projector/planner/writer/candidate and atomic
publication tests pass. Focused frontend HTTP/mapper/draft/clone/domain/
provenance/facade/dialog tests pass, the complete frontend regression gate is
green, and both production builds pass under the repository's bounded process
policy. Capability revision `2026-09-01.144` records the exact lineage.

Fresh guarded browser Save/reopen and exact-candidate Toolset
Save/Build/reopen with packed GIC readback remain independent release gates.
The comment has no NWN runtime-behavior claim. This audit does not certify
complete Waypoint, Area, tile, or PathConnect functionality.

## Resource/process statement

This work used immutable decompilation, repository implementation, and
bounded offline verification only. No Docker command, container, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.
