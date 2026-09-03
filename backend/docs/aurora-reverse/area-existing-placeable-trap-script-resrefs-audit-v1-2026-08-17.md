# Existing Placeable trap script ResRefs audit v1 — 2026-08-17

## Status and scope

This audit admits bounded storage mutation for the existing Placeable trap
script fields `OnDisarm` and `OnTrapTriggered`. It does not admit any other
trap flag, DC, type, or runtime event-dispatch claim.

Offline status: verified. Primary Aurora storage lineage, exact native field
profiles, the cross-boundary contract, production mutation, focused tests,
atomic Area Update integration, builds, and mutation gates are complete. Fresh
exact-candidate Toolset Save/Build/reopen and event-specific NWN runtime proof
remain outside this offline checkpoint.

## Primary Aurora authority and GPL boundary

The sole behavioral authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos code, structure, or runtime conclusion is used.

The common situated-object reader `FUN_0063ae68` reads `OnDisarm` and
`OnTrapTriggered` through the native ResRef reader at decompiled lines 329813
and 329831. The matching writer `FUN_0063b8a0` writes them through the native
ResRef writer at lines 329900 and 329906. The placed-instance placeable
reader/writer lineage is `FUN_0063d0d8` / `FUN_0063d3d8`, which reaches the
common situated-object serialization through the placeable reader/writer.

The exact admitted `plc_watertrough.UTP` construction fixture contains one
native `ResRef` field named `OnDisarm` and one named `OnTrapTriggered`. This
closes the storage-profile question only.

## Exact admitted mapping

| Frontend trap field | Metadata key | Native GIT field |
|---|---|---|
| `onDisarmScript` | `script.onDisarm` | `OnDisarm` |
| `onTrapTriggeredScript` | `script.onTrapTriggered` | `OnTrapTriggered` |

Frontend provenance is presence-sensitive. An explicit empty string is a
proven native field value; absence or a non-string value remains
preserve-only. The UI may enable only the two exact proven script inputs. All
other trap controls remain preserve-only in this slice.

## Frozen mutation policy

The existing placeable property mutation gains an optional `trapScripts`
collection. Each entry carries one canonical native field, expected source
ResRef, and target ResRef. Entries are unique, ordered by the frozen mapping,
and contain only actual changes. ResRefs are empty or 1..16 ASCII letters,
digits, or underscores.

The planner resolves the immutable placeable ordinal and compares every
expected value with the exact parsed source GIT. The writer requires exactly
one native `ResRef`, replaces only its value, preserves all other GIT fields
and every GIC byte, and independently verifies the complete candidate struct.

Missing/partial/duplicate fields, wrong native types, unsupported labels,
invalid ResRefs, stale or unchanged values, family mismatch, deletion
collision, or readback drift fail closed. Property counts remain per mutated
placeable object rather than per field.

## Completion boundary

Offline completion requires parser presence tests, frontend mapper and
per-field UI/Apply guards, projector/planner/writer negative and combined
round-trip tests, Area Update integration, builds, and focused mutation tests
with no survivors or uncovered mutants. Fresh exact-candidate Toolset
Save/Build/reopen remains mandatory. Any event-dispatch claim requires separate
targeted NWN runtime evidence.

## Offline verification checkpoint

The completed implementation uses one frozen two-field registry across the
projector, planner, and native writer. The parser preserves explicit empty
values; the frontend records immutable, presence-sensitive provenance, enables
only the two exact script fields, and restores every unproven trap property at
Apply time. The backend independently rechecks family, immutable ordinal,
source metadata, ResRef syntax, native field cardinality/type, expected value,
deletion collision, GIC preservation, and complete candidate readback.

Verification completed on 2026-08-17:

- backend focused tests: 5/5 suites and 697/697 tests passed;
- frontend focused tests: 4/4 files and 35/35 tests passed;
- Area Update atomic integration: 1/1 suite and 20/20 tests passed;
- backend and frontend production builds passed; the frontend emitted only the
  existing Vite chunk-size warning;
- backend focused mutation: 214/214 active mutants killed, zero survived,
  timed out, or uncovered, 100%; report SHA-256
  `223d8e980bf8020640eb3d3771452d5ec4ef1e1142ccec6d9415aef6625af098`;
- frontend focused mutation: 81/81 active mutants killed, zero survived, timed
  out, or uncovered, 100%; report SHA-256
  `499555c17798901cb079dcab6c9a7e5f2f2b1771e529c92f27709a38c857cc3d`.

The machine-readable checkpoint is
`backend/docs/aurora-reverse/evidence/area-existing-placeable-trap-script-resrefs-2026-08-17/offline-verification-summary.json`.
No Toolset or NWN completion claim is made by this checkpoint.
