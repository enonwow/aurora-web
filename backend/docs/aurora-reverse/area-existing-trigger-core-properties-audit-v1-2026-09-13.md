# Existing Area Trigger core-properties storage audit v1

Date: 2026-09-13  
Status: Aurora storage semantics source-closed; offline implementation verified

## Decision

Aurora Web may expose and mutate one complete retained Trigger core-properties
tuple on an exact type-`1` GIT `TriggerList` member:

| Contract key | Native GIT label | GFF type |
| --- | --- | --- |
| `autoRemoveKey` | `AutoRemoveKey` | 0 / `Byte` |
| `factionId` | `Faction` | 4 / `DWord` |
| `cursorId` | `Cursor` | 0 / `Byte` |
| `highlightHeight` | `HighlightHeight` | 8 / `Float` |
| `keyName` | `KeyName` | 10 / `CExoString` |
| `portraitId` | `PortraitId` | 2 / `Word` |
| `triggerType` | `Type` | 5 / `Int` |

The tuple is all-or-nothing and storage-first. `autoRemoveKey` is admitted only
as checkbox values `0|1`. `factionId`, `cursorId`, `portraitId`, and
`triggerType` remain uninterpreted numeric identifiers within their native
ranges. `highlightHeight` must be finite and exactly binary32. `keyName` is
exact, NUL-free, and bounded to 256 ECMAScript code units. No faction, cursor,
portrait, or Trigger-type label is inferred; no key inventory behavior,
highlight presentation, activation, or NWN runtime behavior is claimed.

## Immutable primary authority

The behavioral authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
Function inventory SHA-256 is
`394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`.
No xoreos or other GPL source was inspected or used.

Common Trigger reader `FUN_00656720`, address `0x00656720`, begins at
decompiled line `345687`. Lines `345862..345868` read `AutoRemoveKey`,
`Faction`, `Cursor`, and `HighlightHeight`; lines `345902..345984` read
`KeyName`; lines `346042..346053` read `PortraitId` and `Type`. Direct binary
inspection resolves both otherwise unnamed data references at `0x00c5b6eb`
and `0x00c5b824` to the exact NUL-terminated label `Type`.

Reciprocal writer `FUN_0065752c`, address `0x0065752c`, begins at line
`346102`. Lines `346119..346128` write the same seven members under the same
labels through the native Byte, DWord, Float, CExoString, Word, and Int
writers. The `PortraitId` reader has an older `Portrait : ResRef` fallback;
this contract deliberately admits only one exact present `PortraitId : Word`
on the placed GIT record and never rewrites or synthesizes that fallback.

Placed Trigger reader/writer `FUN_00657a88` / `FUN_00657de0` delegate the
common record before instance placement, orientation, Geometry, and paired-GIC
Comment handling. Accepted readback
`evidence/area-trigger-construction-2026-08-13/native-toolset-instance-readback.json`
binds the exact seven labels in physical order inside the 34-field type-`1`
placed Trigger. The immutable `newgeneric.UTT` adapter fixture independently
confirms the source fields used during admitted Trigger construction; the GIT
adapter intentionally materializes `PortraitId : Word` from the blueprint
portrait source.

Frozen `TDLGTRIGGEREDIT`, size `13240` at RVA `0x00BB62F8`, exposes
`cbTriggerType`, `cbFaction`, `eKeyName`, `xbAutoRemoveKey`, `cbCursor`,
`bPortraitSelect`, and `eHighlightHeight` plus their user-facing labels. This
corroborates one Trigger Properties/Advanced authoring surface but does not
prove numeric enum mappings or runtime behavior.

## Frozen additive contract

`AreaApiObjectPlacement` may add `triggerCoreProperties` only when all seven
exact fields occur exactly once on the same type-`1` Trigger. Missing,
duplicated, wrong-case, wrong-type, malformed, non-binary32, partial, or
over-budget storage omits the property and makes the controls
`PRESERVE_ONLY`.

The frontend deep-copies the admitted source tuple under immutable
`source.triggerCoreProperties` and authors a separate top-level
`triggerCoreProperties` target. A real change projects exactly one complete
compare-and-swap member:

```json
{
  "kind": "trigger",
  "sourceObjectId": "trigger:0:newgeneric:source",
  "sourceIndex": 0,
  "coreProperties": {
    "expectedValue": {
      "autoRemoveKey": 0,
      "factionId": 1,
      "cursorId": 0,
      "highlightHeight": 0,
      "keyName": "",
      "portraitId": 0,
      "triggerType": 0
    },
    "value": {
      "autoRemoveKey": 1,
      "factionId": 2,
      "cursorId": 3,
      "highlightHeight": 1.5,
      "keyName": "gate_key",
      "portraitId": 4,
      "triggerType": 1
    }
  }
}
```

Projection requires exact retained Trigger family and ordinal provenance.
Planning reparses the source GIT and rejects stale, unchanged, partial,
duplicate, deletion-colliding, or invalid state. Writing replaces the seven
existing fields in place, preserves physical order and every unrelated field,
and requires exact whole-candidate plus persisted readback. It may compose
with all independently admitted Trigger mutations in the same revision-fenced
atomic Area Update transaction.

Existing authorization, permission, approved-token, request/object/property
budgets, optimistic concurrency, idempotency, journal, rollback/recovery,
atomic ARE/GIT/GIC/IFO publication, and receipt behavior remain unchanged. No
endpoint, binary body, pagination, chunking, or streaming is added.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_trigger_core_properties_cas.v1` with operations
`parse_source|plan|write|readback`, outcome, stable result code,
`changedFieldCount` (`1..7`), and duration. Tuple values, object IDs, ordinals,
hashes, paths, source/storage keys, raw fields or bytes, credentials, and host
paths are prohibited from routine logs and metric labels. Telemetry failure
cannot affect validation, mutation, transaction, rollback, recovery, or
publication.

Offline acceptance requires strict parser rejection coverage, detached source
and target state, draft/history cloning, visible `ACTIVE_NOW`/`PRESERVE_ONLY`
raw controls, Apply/Cancel/reopen/OK/local Save, projector/planner/writer and
candidate/persisted readback, resource preservation, coexistence with other
Trigger mutations, integration, regression, capability-catalog coverage, and
both production builds.

Guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen with
packed GIT readback, and targeted NWN behavior remain independent release
gates. This audit does not certify the separate trap tuple, complete Trigger,
Area, tile, PathConnect, or 99-tileset-matrix completion.

## Offline implementation checkpoint — 2026-09-13

The exact seven-field tuple is now implemented across the retained Trigger
read, authoring, and revision-fenced write path. Backend coverage includes
strict all-or-nothing parsing and fingerprint identity, detached source/target
projection, immutable type-`1` ordinal planning, exact in-place CAS
replacement, whole-candidate and persisted readback, and content-free
best-effort telemetry. The Area Update transaction composes the tuple with
Trigger identity, scripts, transition storage, VarTable, polygon, and paired-
GIC Comment changes while preserving unrelated GIT fields and ARE/GIC/IFO
resources.

Frontend coverage includes exact HTTP validation, detached source and target
scene state, saved-draft and history cloning, raw `ACTIVE_NOW`/
`PRESERVE_ONLY` controls for all seven members, facade/viewport routing, and
one Apply/Cancel/reopen/OK/local-Save regression flow. Numeric faction,
cursor, portrait, and type values remain deliberately uninterpreted; the UI
does not invent enum names or runtime semantics.

The affected backend unit suites pass `1257/1257`, the complete Area Update
atomic-publication suite passes `88/88`, capability-catalog coverage passes
`14/14`, and the affected frontend unit suites pass `1324/1324`. Full
frontend regression-smoke passes `137/137`, and both production builds pass.
The full frontend unit gate passes `5947/5949`; the same two deterministic
failures remain outside this slice in the parallel Placeable render-package
shape and renderer material-side expectations.

Capability revision `2026-09-13.180` records this implementation while
retaining independent guarded-browser, Toolset Save/Build/reopen, and NWN
behavior gates. The next bounded Trigger implementation lane is the separate
trap-property profile. Wider Area completion still requires that profile,
the uncaptured 99-tileset Add/Render and adjacency matrix, independent
PathConnect/WOK proof, and final certification. No replacement runtime profile
or capture was produced while source files were changing.

## Resource/process statement

This audit used immutable decompilation, frozen retail resources, accepted
readback evidence, and direct read-only binary string inspection. No Docker
command, container, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.
No installed skill matches this offline static-decompilation and TypeScript
contract slice.
