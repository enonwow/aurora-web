# Existing Placeable lock `Byte` fields audit v1 — 2026-08-17

## Status and scope

This audit admits bounded storage mutation for six explicit native lock fields
on a retained `aurora_git` Placeable: `Locked`, `Lockable`, `AutoRemoveKey`,
`KeyRequired`, `OpenLockDC`, and `CloseLockDC`. It does not admit `KeyName`,
lock/unlock event dispatch, key inventory consumption, script execution, door
lock properties, or any other situated-object property.

Status: primary Aurora storage lineage, exact native field identities/types,
Toolset control labels, the accepted retail profile, the additive
cross-boundary contract, production mutation, and automated offline
verification are complete. Fresh exact-candidate native proof remains open.

## Primary authority and GPL boundary

The behavioral authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos code, structure, or runtime conclusion is used.

The common situated-object reader `FUN_0063ae68` reads the six fields through
the native byte reader at decompiled lines 329660-329691. The matching common
writer `FUN_0063b8a0` writes the same six fields through the native byte writer
at lines 329870-329879. The placed Placeable instance reaches that common
lineage through `FUN_0063d0d8` / `FUN_0063d3d8`.

The Toolset resource report at
`C:/Projects/nwn-last-city/Aurora/reverse/refs/Tooling/nwtoolset_rcdata_report.json`
binds the visible controls `Locked`, `Can be relocked`, `Auto Remove Key`,
`Key required to unlock or relock`, `Open Lock DC`, and `Close Lock DC` to the
lock panel. The exact `plc_watertrough.UTP` retail fixture contains one native
`Byte` for every admitted label with values `0`, `0`, `0`, `0`, `18`, and `0`
respectively.

## Exact mapping and value policy

| Frontend lock field | Area metadata key | Native GIT field | Value |
|---|---|---|---|
| `locked` | `locked` | `Locked` | boolean byte |
| `canRelock` | `lockable` | `Lockable` | boolean byte |
| `autoRemoveKeyAfterUse` | `autoRemoveKey` | `AutoRemoveKey` | boolean byte |
| `keyRequiredToUnlockOrLock` | `keyRequired` | `KeyRequired` | boolean byte |
| `openLockDc` | `openLockDc` | `OpenLockDC` | integer byte `0..255` |
| `closeLockDc` | `closeLockDc` | `CloseLockDC` | integer byte `0..255` |

Presence is mandatory provenance. Explicit `false` and `0` are valid source
values; absence, a wrong primitive type, or an out-of-range DC remains
preserve-only. `KeyName` is a native `CExoString`, not a `Byte`, and remains
outside this contract until its own bounded string policy is proven.

## Frozen mutation contract

The frontend stores proven source fields under optional
`source.placeableLockSettings` and editable values under
`placeableProperties.lockSettings`. The update projector emits only changed
pairs in the frozen table order:

```json
{
  "kind": "placeable",
  "sourceObjectId": "plc:0:plc_watertrough:...",
  "lockFields": [
    { "field": "Locked", "expectedValue": false, "value": true },
    { "field": "OpenLockDC", "expectedValue": 18, "value": 24 }
  ]
}
```

The collection is non-empty, contains unique supported labels, and may combine
with the previously admitted Placeable property/script members. The backend
resolves one immutable Placeable ordinal, requires one exact native `Byte` per
entry, verifies the expected source value, writes a boolean as `0`/`1` or a DC
as its exact integer byte, preserves every other GIT field and every GIC byte,
and independently verifies the complete candidate struct.

## Fail-closed and completion boundary

Missing, empty, partial, duplicate, unsupported, wrongly typed, non-boolean,
non-integer, or out-of-range entries fail closed. Missing, duplicate, or
wrongly typed native fields, stale provenance, unchanged targets, unsupported
families, duplicate object mutations, deletion collisions, or readback drift
also fail closed with bounded object/field diagnostics. Counts remain per
mutated Placeable object.

Offline completion requires parser/mapper presence tests, per-field frontend
UI and Apply guards, projector/planner/writer negative and combined round-trip
tests, Area Update integration, production builds, and focused mutation tests
with no survivors or uncovered mutants. Fresh exact-candidate Toolset
Save/Build/reopen remains mandatory. No NWN lock behavior claim is made by the
storage contract.

## Offline verification checkpoint

Verification completed on 2026-08-17:

- backend parser/projector/planner/writer/compiler verification passed 5/5
  suites and 790/790 tests;
- frontend mapper/provenance/property-section/dialog verification passed 4/4
  files and 50/50 tests;
- Area Update atomic-publication integration passed 1/1 suite and 20/20
  tests;
- backend and frontend production builds passed; the frontend emitted only the
  existing Vite chunk-size warning;
- backend mutation killed 351/351 active mutants, with 96 ignored by the
  frozen mutation policy and zero survived, timed out, or uncovered. The
  report is 1,525,608 bytes with SHA-256
  `58d2719ad94c9da961e5abdff7c59d33c1833f5afd7497e97facc5574f11c53f`;
- frontend mutation killed 122/122 active mutants, with 48 ignored by the
  frozen mutation policy and zero survived, timed out, or uncovered. The
  report is 297,330 bytes with SHA-256
  `162e64da377578ec3a53bff58e3fc1ff012f3f23631e86d17db37f7bdd1b804b`.

The immutable machine-readable checkpoint is
`backend/docs/aurora-reverse/evidence/area-existing-placeable-lock-byte-fields-2026-08-17/offline-verification-summary.json`.
This closes only the bounded offline storage lane. Fresh Toolset
Save/Build/reopen remains pending, and no NWN lock behavior is claimed.
