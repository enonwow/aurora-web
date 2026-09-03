# Existing Area Trigger editor Comment audit v1

Date: 2026-09-02  
Status: source-closed and offline-verified; fresh browser and Toolset proof pending

## Decision

Aurora Web may expose and mutate an existing Trigger editor comment only when
the source Area contains one exact ordinal-paired GIT/GIC Trigger:

- root list label `TriggerList` in both resources;
- Trigger struct type `1` in both resources;
- identical GIT and GIC Trigger-list cardinality;
- exactly one case-sensitive GIC `Comment : CExoString` on the matching
  immutable ordinal;
- a string containing at most 4,096 ECMAScript code units and no NUL code
  unit.

Empty and whitespace-only strings are valid and remain exact. There is no
trimming, normalization, silent truncation, field synthesis, GIT fallback, or
UTT blueprint-Comment substitution. Missing, duplicated, wrong-case, wrongly
typed, over-budget, NUL-bearing, unpaired, or wrong-family storage is
`PRESERVE_ONLY`.

This slice changes Toolset editor text only. It does not authorize Trigger
runtime behavior, scripts, variables, links, trap behavior, activation,
template identity, arbitrary Trigger creation, or blueprint propagation.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| accepted Trigger instance readback | `f5aaef10530e5c2b5ed01f78b3a7ecd3f5442cde0c694a234ae81d1f1451fd6f` |

No xoreos or other GPL source was inspected or used.

## Native paired-resource closure

Placed-Trigger reader `FUN_00657a88` begins at decompiled line `346276`.
After reading common type-`1` GIT state and origin/orientation, its paired-
resource branch at lines `346338..346341` reads exact label `Comment` through
`FUN_00aef090` into the placed Trigger member at `param_1 + 0xa8`. It then
reads the independent type-`3` Geometry list.

Reciprocal writer `FUN_00657de0` begins at line `346620`. After writing common
GIT state and origin/orientation, lines `346635..346637` write the same
`param_1 + 0xa8` member to the paired resource under exact label `Comment`
through `FUN_00af0084`; Geometry is written separately afterward.

The native helper reader rejects a field whose type ID is not `10` at
decompiled line `968176`. The writer creates a missing helper target as type
ID `10` near line `968955`; Aurora Web deliberately does not use that native
creation behavior for a retained instance and admits only one already-present
exact field.

Independent accepted readback at
`evidence/area-trigger-construction-2026-08-13/native-toolset-instance-readback.json`
binds Area `demo`, `TriggerList[0]`, same-index GIT/GIC struct type `1`, and one
GIC field `{ label: "Comment", type: "cexostring", value: "" }`. Its GIT and
GIC resource SHA-256 values are respectively
`a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`
and `535d1ab4a0c1c22795b867e225437506dd20a905ede1f98e85aa1efcdc61c26d`.

## Frozen additive contract

Area detail may add `triggerMetadata.editorComment` only for admitted exact
paired provenance. The frontend deep-copies it under immutable
`source.triggerEditorComment` and authors a separate
`triggerEditorComment` target presented by Trigger Properties.

A changed retained Trigger adds one optional member to its existing property
mutation:

```json
{
  "kind": "trigger",
  "sourceObjectId": "trigger:0:newgeneric:source",
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
GIT, ARE, and IFO byte identity; independently admitted Trigger Tag,
TemplateResRef, LocalizedName, origin, or polygon changes may compose in the
same atomic transaction. Exact candidate and persisted paired readback are
mandatory before revision-fenced publication.

The existing request/object/property ceilings, authorization, permission,
approved-token, idempotency, optimistic-concurrency, fencing, journal,
rollback, recovery, and atomic ARE/GIT/GIC/IFO publication contracts remain
unchanged. No endpoint, binary body, pagination, chunking, or streaming is
added.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_trigger_editor_comment_cas.v1` with bounded operations
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
Trigger mutations, atomic publication, regression, capability-catalog
coverage, and both production builds.

Fresh guarded browser Save/reopen and exact-candidate Toolset Save/Build/reopen
with packed GIC readback remain independent release gates. The comment has no
NWN runtime-behavior claim. This audit does not certify complete Trigger,
Area, tile, or PathConnect functionality.

## Offline implementation and verification

The bounded retained-instance lane is implemented end to end. Backend parsing
retains exact same-index `TriggerList` GIT/GIC provenance, projection detaches
the expected value, planning reparses both source resources and enforces exact
ordinal CAS, the writer replaces only the admitted GIC `Comment`, and candidate
plus persisted readback precede revision-fenced ARE/GIT/GIC/IFO publication.
The frontend carries immutable source and editable target values through the
HTTP boundary, scene mapping, saved drafts, clone/history, facade and viewport
ports, the visible Trigger Properties dialog, and one atomic Apply/Cancel/
reopen/OK/Ctrl+S flow. Telemetry reports only the bounded
`triggerEditorCommentChanged` flag.

Verification completed without a live runtime:

- eight relevant backend suites: `2,317/2,317` assertions;
- full Area Update atomic-publication integration: `88/88` assertions;
- affected frontend group: `1,289/1,289` assertions;
- full frontend regression-smoke: `46/46` files and `137/137` assertions;
- capability catalog revision `2026-09-02.176`: `14/14` assertions;
- backend and final frontend production builds: passed.

The full frontend unit gate executes `5,840` assertions and passes `5,838`.
Its two deterministic failures are outside this slice and remain visible as
shared dirty-tree blockers: the Placeable HTTP render-package expected shape
is stale against the current Placeable contract, and one render-filter test
expects `THREE.DoubleSide` while the current material reports `FrontSide`.
The same two files reproduce in isolation (`130/132`). No Trigger Comment
assertion fails, and this audit does not silently classify the global gate as
green.

## Immutable runtime binding

The final source is bound to immutable runtime profile v30, built at
`2026-09-02T16:47:19.043Z`. Its 1,831 files and 30,979,373 bytes produce
runtime digest
`1ca79a5263a3ae55a174a39f6e6e5e90dad0fad821cc50057cf184237669aad7`.
Profile SHA-256 is
`3b3126e52a87297d3010fb706142cb60c85704e0b8171e1f2f18fe545563170b`,
source-manifest SHA-256 is
`21507a7685470ae00586c591a24c68314b3af64c446418c63b22621fb992747c`,
and canonical runtime-binding SHA-256 is
`cb0a31f52881b0f5849c3bcd0df3982253e95a602c00da71bee6df17111ce61b`.

Replacement plan
`984f3a2415f3029481058748c270dec5df39d897d132230a96f561a1f6e7b68e`
explicitly replaces v29, validates `ready` with verified runtime-source
identity, and remains `0/3380`. It contains 99 tilesets, 53,700 rows, 45,031
required Add/Render rows, 44,692 connection rows, 9,100 group rows, 8,669
named-blocked rows, and zero accepted PathConnect rows. Active-plan file
SHA-256 is
`aa7d1c4f2c55114b439622be3fbc0c1486a64b8e35dbaa7853352cfbc0b55188`.
This immutable binding is readiness metadata, not visual acceptance.

## Resource/process statement

This audit used immutable decompilation and accepted readback evidence only.
No Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. No installed skill matches this offline static-decompilation
and TypeScript contract slice.
