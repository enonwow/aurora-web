# Existing Area Trigger transition storage audit v1

Date: 2026-09-02  
Status: source-closed; test-first implementation pending

## Decision

Aurora Web may expose and mutate one complete raw transition-storage tuple on
an exact retained type-`1` GIT Trigger:

| Contract key | Native GIT label | GFF type |
| --- | --- | --- |
| `linkedTo` | `LinkedTo` | 10 / `CExoString` |
| `linkedToFlags` | `LinkedToFlags` | 0 / `Byte` |
| `loadScreenId` | `LoadScreenID` | 2 / `Word` |

The tuple is all-or-nothing and storage-only. `linkedToFlags` remains an
uninterpreted `0..255` integer, `loadScreenId` remains an uninterpreted
`0..65535` integer, and `linkedTo` is preserved exactly with a product ceiling
of 256 ECMAScript code units and no NUL. The implementation must not infer a
destination kind, resolve or validate a destination object, claim a loading-
screen catalog row, normalize text, synthesize a missing member, or claim NWN
traversal behavior.

## Immutable primary authority

The sole behavioral authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was inspected or used.

Common Trigger reader `FUN_00656720` begins at decompiled line `345687`.
Lines `345902..346035` read exact `KeyName` and then exact `LinkedTo` through
the CExoString reader `FUN_00aef090`. Lines `346036..346040` read
`LinkedToFlags` through the Byte reader `FUN_00aeed68` and `LoadScreenID`
through the Word reader `FUN_00aeedc4`. Reciprocal writer `FUN_0065752c`
begins at line `346102`; lines `346123..346126` write the same three members
under the same exact labels through `FUN_00af0084`, `FUN_00aefd1c`, and
`FUN_00aefd88`.

Placed Trigger reader/writer `FUN_00657a88` / `FUN_00657de0` delegate to that
common record before handling instance position, orientation, paired-GIC
Comment, and Geometry. Independent accepted readback
`evidence/area-trigger-construction-2026-08-13/native-toolset-instance-readback.json`
binds exact type-`1` `TriggerList[0]`, the physical order of all three fields,
and the 34-field placed Trigger record. The immutable `newgeneric.UTT` adapter
fixture independently supplies the same labels and storage types. These facts
prove storage lineage and round-trip shape, not transition execution.

Frozen Toolset resource text exposes `Destination Type`, `Loading Screen`,
`eLinkedToChange`, `rbLinkedToSomethingClick`,
`rbLinkedToNothingClick`, and `bSetupAreaTransitionClick`. This corroborates a
dedicated transition UI path but does not establish the numeric enum or
runtime meaning. Those meanings remain blocked pending exact native and NWN
proof.

## Frozen additive contract

`AreaApiObjectPlacement` may add `triggerTransitionStorage` only when all
three exact fields occur exactly once on the same type-`1` Trigger struct.
Case-insensitive duplicates, wrong case, wrong type, malformed values, an
over-budget string, or a partial tuple omit the property and make the control
`PRESERVE_ONLY`.

The frontend deep-copies the admitted source tuple under immutable
`source.triggerTransitionStorage` and authors a separate
`triggerTransitionStorage` target. A real change projects exactly one
complete compare-and-swap member:

```json
{
  "kind": "trigger",
  "sourceObjectId": "trigger:0:newgeneric:source",
  "sourceIndex": 0,
  "transitionStorage": {
    "expectedValue": {
      "linkedTo": "old_destination",
      "linkedToFlags": 1,
      "loadScreenId": 0
    },
    "value": {
      "linkedTo": "new_destination",
      "linkedToFlags": 1,
      "loadScreenId": 7
    }
  }
}
```

Projection requires exact retained Trigger family and ordinal provenance.
Planning reparses the source GIT, validates the complete expected tuple, and
rejects stale, unchanged, partial, duplicate, deletion-colliding, or invalid
state. Writing replaces the three existing fields in place, preserves their
physical order and every unrelated field, and requires exact candidate plus
persisted readback. It may compose with every independently admitted Trigger
mutation in the same atomic transaction.

The paired GIC, ARE, IFO, Geometry, orientation, and unrelated resources stay
byte-stable for a transition-only edit. Existing endpoint, authorization,
permission, approved-token, request/object/property ceilings, optimistic
concurrency, idempotency, revision fencing, journal, rollback/recovery,
atomic ARE/GIT/GIC/IFO publication, and receipt behavior remain unchanged. No
endpoint, binary body, pagination, chunking, or streaming is added.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_trigger_transition_storage_cas.v1` with operations
`parse_source|plan|write|readback`, outcome, stable result code,
`changedFieldCount` (`1..3`), and duration. Transition values, object IDs,
ordinals, hashes, paths, source/storage keys, raw fields or bytes,
credentials, and host paths are prohibited from routine event fields and
metric labels. A telemetry failure cannot affect validation, mutation,
transaction, rollback, recovery, or publication.

Offline acceptance requires exact parser rejection coverage, detached source
and target state, saved-draft and history cloning, visible
`ACTIVE_NOW`/`PRESERVE_ONLY` raw controls, Apply/Cancel/reopen/OK/local Save,
projector/planner/writer/candidate and persisted readback, GIC/ARE/IFO
preservation, coexistence with other admitted Trigger changes, integration,
regression, capability-catalog coverage, and both production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GIT readback, and NWN traversal/loading-screen behavior remain
independent release gates. This audit does not certify the numeric
`LinkedToFlags` meaning, target validity, complete Trigger authoring, or the
wider Area/tile program.

## Resource/process statement

This audit used immutable decompilation, frozen retail resources, and accepted
readback evidence only. No Docker command, container, service, watcher,
browser, Chrome, capture, Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used. No installed skill matches this
offline static-decompilation and TypeScript contract slice.
