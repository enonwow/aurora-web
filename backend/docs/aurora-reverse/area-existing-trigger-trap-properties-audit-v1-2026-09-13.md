# Existing Area Trigger trap-properties audit v1

Date: 2026-09-13  
Status: Aurora storage semantics source-closed; offline implementation verified

## Scope

This audit admits one exact all-or-nothing retained type-`1` Trigger tuple:

| Contract key | Native label | GFF type |
| --- | --- | --- |
| `trapDetectable` | `TrapDetectable` | `Byte` |
| `trapDetectDc` | `TrapDetectDC` | `Byte` |
| `trapDisarmable` | `TrapDisarmable` | `Byte` |
| `disarmDc` | `DisarmDC` | `Byte` |
| `trapFlag` | `TrapFlag` | `Byte` |
| `trapOneShot` | `TrapOneShot` | `Byte` |
| `trapType` | `TrapType` | `Byte` |

Every value is retained as an uninterpreted integer in `0..255`. The scope
does not infer Boolean semantics, DC rules, a `traps.2da` identity, palette
names, set/detect/disarm calculations, event dispatch, activation, faction
behavior, or NWN runtime behavior. It does not synthesize missing fields or
fall back to UTT storage.

## Primary Aurora authority

The primary decompilation is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The inspected executable is
`C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.

`FUN_00656720` is the common Trigger reader. Decompiled lines
`346055..346067` call the same native Byte reader `FUN_00aeed68` for the seven
case-sensitive labels above. The observed missing-field defaults are `1, 0,
1, 0, 0, 0, 0` respectively, but those defaults do not authorize field
synthesis for retained-instance editing.

`FUN_0065752c` is the common Trigger writer. Decompiled lines
`346129..346135` load each stored member as one byte and call the same native
Byte writer `FUN_00aefd1c` with the matching label. This closes native type,
label, common-object ownership, and whole-tuple order without relying on a
secondary implementation.

## Frozen Toolset and retail resource authority

The accepted `AUR-S01-08` Toolset placement proof is retained through
`evidence/area-trigger-construction-2026-08-13/native-toolset-instance-readback.json`.
Its exact type-`1` `TriggerList[0]` has 34 ordered fields and contains the
seven trap labels contiguously in native writer order after `Type` and before
the Trigger event scripts. The packed GIT digest is
`a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`.

The independently reread installed `newgeneric.UTT` evidence is retained at
`evidence/area-trigger-construction-2026-08-13/base-utt-production-adapter-readback.json`.
It confirms the same seven source labels in an exact 28-field `UTT `/`V3.2`
root with digest
`e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c`.
UTT evidence corroborates naming and construction provenance only; retained
GIT mutation authority must come from the exact placed instance.

## Contract and safety boundary

The HTTP/scene contract exposes the tuple only when every member exists once,
with exact case and exact `Byte` type. Immutable source provenance and editable
target state are detached. Missing, duplicated, wrong-case, wrongly typed,
out-of-range, partial, stale, unchanged, or extra-key values remain
`PRESERVE_ONLY` and cannot authorize a write.

The backend reparses the exact type-`1` ordinal, performs a whole-tuple compare-
and-swap, replaces only the seven existing entries in place, and requires
whole-candidate plus persisted readback. It may compose with independently
admitted Trigger identity, localized name, comment, scripts, transition,
variables, core properties, polygon, position, and deletion behavior in the
same revision-fenced atomic ARE/GIT/GIC/IFO transaction.

Existing authorization, permission, approved-token, request/object/property
budgets, optimistic concurrency, idempotency, journal, rollback/recovery,
atomic publication, and receipt behavior remain unchanged. No endpoint,
binary body, pagination, streaming, or chunking is added.

## Diagnosability and completion boundary

The additive low-cardinality event is
`area_trigger_trap_properties_cas.v1` with operations
`parse_source|plan|write|readback`, outcome, stable result code,
`changedFieldCount` (`1..7`), and duration. Tuple values, object IDs, ordinals,
hashes, paths, source/storage keys, raw fields or bytes, credentials, and host
paths are prohibited from routine logs and metric labels. Telemetry failure
cannot affect validation, mutation, rollback, recovery, or publication.

Offline acceptance requires strict all-or-nothing parser rejection, detached
source and target state, saved-draft/history cloning, visible raw controls,
Apply/Cancel/reopen/OK/local Save, projector/planner/writer and candidate/
persisted readback, preservation of unrelated resources, integration,
regression, capability-catalog coverage, and both production builds.

Guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen with
packed tuple readback, and targeted NWN behavior remain independent release
gates. This audit does not certify interpreted trap behavior, complete
Trigger, Area, tile, PathConnect, or 99-tileset-matrix completion.

## Resource/process statement

This audit used immutable decompilation, frozen retail resources, and accepted
Toolset readback evidence. No Docker command, container, service, watcher,
browser, Chrome, capture, Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used. No installed skill matches this
offline static-decompilation and TypeScript contract slice.

## Offline implementation checkpoint

Capability revision `2026-09-13.181` implements the exact seven-Byte tuple
from parser and dependency fingerprint through detached source/target state,
workspace/history/local-Save, immutable type-`1` ordinal planning, whole-tuple
CAS, in-place native writing, candidate and persisted readback, content-free
telemetry, and revision-fenced atomic ARE/GIT/GIC/IFO publication. The Trigger
Properties dialog exposes all seven raw `0..255` controls only for complete
canonical provenance; Apply, Cancel, reopen, OK, and local Save preserve the
immutable source while committing the separate target.

The affected backend unit suites pass `1,255/1,255`, Area Update integration
passes `88/88`, the affected frontend group passes `1,334/1,334`, full
regression-smoke passes `137/137`, full frontend unit passes `5,979/5,979`,
and both production builds pass. The global frontend gate also now preserves
the Placeable light `sourceModelHash` and no longer invents an unproven
`DoubleSide` material policy in its render-filter expectation.

The Level 4 Area program remains incomplete. Fresh guarded browser readback,
exact-candidate Toolset Save/Build/reopen, targeted NWN trap behavior, Trigger
rotation/runtime semantics, the uncaptured 99-tileset Add/Render and adjacency
matrix, independent PathConnect/WOK proof, and final certification remain
open. No runtime source profile or capture was created in this offline lane.
