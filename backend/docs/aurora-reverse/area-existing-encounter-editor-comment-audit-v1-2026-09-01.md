# Existing Area Encounter editor Comment audit v1

Date: 2026-09-01  
Status: offline implementation and focused verification complete; live proof pending

## Decision

Aurora Web may expose and mutate an existing Encounter editor comment only
when the source Area contains one exact ordinal-paired GIT/GIC Encounter:

- root list label `Encounter List` in both resources;
- Encounter struct type `7` in both resources;
- identical GIT and GIC Encounter-list cardinality;
- exactly one case-sensitive GIC `Comment : CExoString` on the matching
  immutable ordinal;
- a string containing at most 4,096 ECMAScript code units and no NUL code
  unit.

Empty and whitespace-only strings are valid and remain exact. There is no
trimming, normalization, silent truncation, field synthesis, GIT fallback, or
blueprint-Comment substitution. Missing, duplicated, wrong-case, wrongly
typed, over-budget, NUL-bearing, unpaired, or wrong-family storage is
`PRESERVE_ONLY`.

This slice changes only Toolset editor text. It does not authorize Encounter
runtime behavior, variables, creature-list or spawn-point changes, template
identity, or arbitrary Encounter creation.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |

No xoreos or other GPL source was inspected or used.

## Native paired-resource closure

Placed-Encounter reader `FUN_0055e1f8` begins at decompiled line `215585`.
It reads the common type-`7` GIT state, origin, type-`1` Geometry, and type-`2`
SpawnPointList independently. When both paired-resource arguments are present,
lines `215741..215744` read exact label `Comment` through `FUN_00aef090` into
the placed Encounter comment member at `param_1 + 0xa8`.

Reciprocal writer `FUN_0055e71c` begins at line `215809`. After writing the
common GIT state, origin, Geometry, and SpawnPointList, its paired-resource
branch at lines `215872..215874` writes the same `param_1 + 0xa8` member under
exact label `Comment` through `FUN_00af0084`.

The native helper reader rejects any field whose type ID is not `10` at line
`968176`. The writer creates a missing helper target as type ID `10` at line
`968955`; Aurora Web deliberately does not use that creation behavior for a
retained instance and admits only one already-present exact field. The
independent construction audit binds both same-index lists to struct type `7`
and confirms that native instances may contain an empty paired GIC struct, so
absence remains preserve-only rather than synthesized.

## Frozen additive contract

Area detail may add `encounterMetadata.editorComment` only for admitted exact
paired provenance. The frontend deep-copies it under immutable
`source.encounterEditorComment` and authors a separate
`encounterProperties.comments` target.

A changed retained Encounter adds one optional member to its existing property
mutation:

```json
{
  "kind": "encounter",
  "sourceObjectId": "encounter:0:x2_custom:source",
  "sourceIndex": 0,
  "editorComment": {
    "expectedValue": " west gate ",
    "value": " west gate - reviewed "
  }
}
```

Expected and target values must both satisfy the bounded exact-string profile
and must differ. Planning reparses exact source GIT/GIC, requires one canonical
paired ordinal, verifies the exact source value, and rejects an out-of-range,
duplicate, stale, wrong-family, deletion-colliding, or malformed mutation.
Writing replaces only that GIC field in place. Comment-only updates require
GIT, ARE, and IFO byte identity; combined independently admitted Encounter
property, origin, or polygon changes remain atomic. Exact candidate and
persisted paired readback are mandatory before revision-fenced publication.

The existing request/object/property ceilings, authorization, permission,
approved-token, idempotency, optimistic-concurrency, fencing, journal,
rollback, recovery, and atomic ARE/GIT/GIC/IFO publication contracts remain
unchanged. No endpoint, binary body, pagination, chunking, or streaming is
added.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_encounter_editor_comment_cas.v1` with bounded operations
`parse_source|plan|write|readback`, outcome, stable result code,
changed-field count, and duration. Comment contents, object IDs, ordinals,
hashes, paths, source/storage keys, raw fields/bytes, credentials, and host
paths are prohibited from routine event fields and metric labels. Telemetry
failure must never alter validation, mutation, transaction, rollback,
recovery, or publication.

Offline acceptance requires parser admission/rejection, detached source and
target state, deep cloning, visible `ACTIVE_NOW`/`PRESERVE_ONLY` Comments UI,
Apply/Cancel/reopen/OK/local Save, projector/planner/writer/candidate readback,
comment-only GIT/ARE/IFO preservation, coexistence with the other admitted
Encounter mutations, atomic publication, regression, capability-catalog
coverage, and both production builds.

Fresh guarded browser Save/reopen and exact-candidate Toolset Save/Build/reopen
with packed GIC readback remain independent release gates. The comment has no
NWN runtime-behavior claim. This audit does not certify complete Encounter,
Area, tile, or PathConnect functionality.

## Offline implementation and verification

The backend now parses the exact same-index type-`7` paired-GIC Comment,
retains it as detached Encounter metadata, binds it into snapshot identity,
projects and replans one digest-bound CAS, performs a GIC-only field
replacement for comment-only changes, verifies candidate and persisted
readback, and publishes through the existing revision-fenced transaction.
The frontend validates and clones the metadata, keeps immutable
`source.encounterEditorComment` separate from
`encounterProperties.comments`, exposes the bounded Comments textarea, and
preserves the distinction through history, reset, Apply, Cancel, reopen, OK,
and local Save.

Resource-safe focused verification completed as follows:

- projector `626/626`, planner `421/421`, pair writer `975/975`, candidate
  compiler `167/167`, capability catalog `13/13`, and Area Update atomic
  publication `76/76`;
- the dedicated backend domain profile passes `4/4`; the general parser's two
  new Encounter pairing/rejection assertions pass, while that independently
  non-green suite retains its two pre-existing ground-item metadata failures;
- focused frontend HTTP, mapper, authoring, and scene-mutation suites pass
  `474/474`; dedicated domain/provenance suites pass `8/8`; and the Encounter
  Apply/Cancel/reopen/OK/local-Save regression passes `1/1`;
- backend and frontend production builds both pass.

Immutable Area capability revision `2026-09-01.134` records the implementation
and the remaining browser/native proof blockers. No live proof was attempted.

## Resource/process statement

This work used immutable decompilation, repository implementation, and bounded
offline verification only.
No Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. No installed skill matches this offline static-decompilation
and TypeScript contract slice.
