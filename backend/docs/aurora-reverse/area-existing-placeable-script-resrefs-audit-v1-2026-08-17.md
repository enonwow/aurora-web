# Existing Placeable script ResRefs audit v1 — 2026-08-17

## Status and scope

This audit admits bounded storage mutation for the twelve remaining script
ResRef fields exposed by the existing Placeable Scripts UI. `OnUsed` remains
covered by its separate accepted contract. `OnDisarm` and `OnTrapTriggered`
remain outside this lane because they belong to the trap-property workflow.
`OnFailToOpen` is excluded because it is not part of the recovered placeable
writer profile below.

Offline status: verified. Primary Aurora reader/writer lineage, exact source
field profiles, cross-boundary contract, production mutation, focused tests,
atomic Area Update integration, builds, and mutation gates are complete. Fresh
exact-candidate Toolset Save/Build/reopen and event-specific NWN runtime proof
remain outside this offline checkpoint.

## Primary Aurora authority and GPL boundary

The sole behavioral authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos code, structure, or runtime conclusion is used. An older local
Placeable note was inspected and rejected as implementation authority because
it mixes native observations with xoreos references. This audit independently
derives every admitted field from the primary Aurora decompilation and native
fixtures.

`FUN_0063ae68` reads the common situated-object script ResRefs and
`FUN_0063b8a0` writes them through the native ResRef writer. The exact admitted
common fields are `OnClick`, `OnClosed`, `OnDamaged`, `OnDeath`, `OnHeartbeat`,
`OnLock`, `OnMeleeAttacked`, `OnOpen`, `OnSpellCastAt`, `OnUnlock`, and
`OnUserDefined` (decompiled lines 329804-329840 and 329897-329909).

`FUN_0063bf74` calls the common reader and then reads the placeable-specific
`OnInvDisturbed`; `FUN_0063c0a8` calls the common writer and then writes
`OnInvDisturbed` (lines 330044-330071 and 330079-330091). The placed-instance
reader/writer lineage is `FUN_0063d0d8` / `FUN_0063d3d8`.

## Exact admitted mapping

| Frontend slot | Metadata key | Native GIT field |
|---|---|---|
| `onClick` | `script.onClick` | `OnClick` |
| `onClosed` | `script.onClosed` | `OnClosed` |
| `onDamaged` | `script.onDamaged` | `OnDamaged` |
| `onDeath` | `script.onDeath` | `OnDeath` |
| `onHeartbeat` | `script.onHeartbeat` | `OnHeartbeat` |
| `onInvDisturbed` | `script.onInventoryDisturbed` | `OnInvDisturbed` |
| `onLock` | `script.onLock` | `OnLock` |
| `onMeleeAttacked` | `script.onMeleeAttacked` | `OnMeleeAttacked` |
| `onOpen` | `script.onOpen` | `OnOpen` |
| `onSpellCastAt` | `script.onSpellCastAt` | `OnSpellCastAt` |
| `onUnlock` | `script.onUnlock` | `OnUnlock` |
| `onUserDefined` | `script.onUserDefined` | `OnUserDefined` |

The exact `plc_watertrough.UTP` construction fixture contains one native ResRef
field for every admitted label, and the existing `OnUsed` live packet proves
the same native ResRef writer path with a non-empty script binding. These facts
admit storage mutation only; they do not claim runtime dispatch proof for every
event.

## Frozen mutation policy

Frontend provenance is presence-sensitive. An explicitly empty ResRef remains
writable provenance; an absent field remains preserve-only. One retained
placeable property mutation may combine any number of unique changed script
pairs with `OnUsed`, `Static`, and `Useable`.

Each script pair carries the canonical native field label, expected source
ResRef, and target ResRef. Both ResRefs must be empty or match
`[A-Za-z0-9_]{1,16}`. The planner resolves the immutable placeable ordinal and
checks the expected value against the exact parsed GIT. The writer requires
exactly one native `ResRef` field, replaces only that value, preserves GIC
bytes, and independently verifies the complete candidate struct.

Missing/duplicate fields, wrong native types, duplicate script labels, stale
source values, unchanged pairs, unsupported labels/families, invalid ResRefs,
deletion collisions, or readback drift fail closed. Property mutation counts
continue to count mutated placeable objects, not the number of fields.

## Completion boundary

Offline completion requires parser presence tests, frontend mapper/UI guards,
projector/planner/writer validation, combined mutation/readback tests, Area
Update integration, builds, and focused mutation testing with no active
survivors or uncovered mutants. Fresh exact-candidate Toolset Save/Build/reopen
proof remains mandatory. Runtime dispatch claims for individual events require
their own targeted NWN evidence.

## Offline verification checkpoint

The completed implementation uses one frozen field registry shared by the
projector, planner, and native writer. The parser preserves explicit empty
values, the frontend exposes only exact-instance slots, and Apply restores all
unproven script values before the scene mutation. The backend independently
rechecks source family, immutable ordinal, source metadata, ResRef syntax,
native field cardinality/type, expected value, deletion collision, and complete
candidate readback.

Verification completed on 2026-08-17:

- backend focused tests: 5/5 suites and 655/655 tests passed;
- frontend focused tests: 3/3 files and 27/27 tests passed;
- Area Update atomic integration: 1/1 suite and 20/20 tests passed;
- backend and frontend production builds passed; the frontend emitted only the
  existing Vite chunk-size warning;
- backend focused mutation: 202/202 active mutants killed, zero survived,
  timed out, or uncovered, 100%; report SHA-256
  `ccd0c5ce1504a221129ad0f6667f6fe93049f1b19d50ce04d064610d01e9a9ee`;
- frontend focused mutation: 96/96 active mutants killed, zero survived, timed
  out, or uncovered, 100%; report SHA-256
  `8e04b94f5872f071bab0775555aff6170348ce162b12f08597b8215842deb18e`.

The machine-readable checkpoint is
`backend/docs/aurora-reverse/evidence/area-existing-placeable-script-resrefs-2026-08-17/offline-verification-summary.json`.
No Toolset or NWN completion claim is made by this checkpoint.
