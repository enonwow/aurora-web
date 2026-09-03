# Existing Area Placeable `TrapType` and effective `traps.2da` audit v1

Date: 2026-08-19  
Status: source-closed contract; current offline implementation verified; live browser and native recertification pending

## Scope and authority

This audit covers mutation of one retained type-`9` Area GIT Placeable
`TrapType : Byte` and the editor projection of `SetDC`, `DetectDCMod`, and
`DisarmDCMod` from the same physical row of the effective `traps.2da`.
It does not add GIT fields for those three derived values, author trap scripts,
change trap trigger/damage behavior, or certify a new Toolset/NWN candidate.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding Toolset binary SHA-256 is
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
The independently extracted retail `base_2da.bif/traps.2da` has SHA-256
`3b281c0d9ca5887d65e5bc0be55e8cde34a89271f1cbed34a003968a63e662ba`
and 48 physical rows. No xoreos or other GPL source was inspected or used.

## Recovered native lineage

The placed-Placeable reader lineage `FUN_0063d0d8 -> FUN_0063bf74 ->
FUN_0063ae68` reads `TrapType` through the native `Byte` reader into the
situated-object byte at offset `0x93`. The symmetric writer lineage
`FUN_0063d3d8 -> FUN_0063c0a8 -> FUN_0063b8a0` writes the same byte under the
exact label `TrapType`.

`FUN_00717df0` opens `traps.2da`, iterates physical rows in increasing ordinal
order, resolves each `TrapName`, and stores that physical ordinal as the UI
item value. In the same loop it reads `SetDC`, `DetectDCMod`, and
`DisarmDCMod` into parallel row-indexed arrays. `FUN_00718930` uses the
selected physical item value to display the three row-derived values.
Separately, `FUN_0068a42c` resolves `TrapName` by a supplied row index. This
closes the identity: the native `TrapType` byte is a physical `traps.2da` row
ordinal, not a web-only enum or a label string.

The retail table independently confirms the complete 0..47 row sequence and
shows that the current seven-option frontend list is neither complete nor in
physical-row order. It must be replaced, not extended by guesses.

## Effective-table rule

Aurora resolves one effective `traps.2da` resource by ordinary resource
precedence. The admitted web contract therefore binds every editable source
and target to one immutable descriptor:

```text
resourceName = traps.2da
sourceObjectKey
sourceLayer = module | hak | vanilla
sha256
sizeBytes
rowCount
```

No weaker table is row-merged into the winner. A supported table is exactly
`2DA V2.0`, contains `TrapName`, `SetDC`, `DetectDCMod`, and `DisarmDCMod`, has
1..256 physical rows, and every row has decimal values within the native byte
domain `0..255` for all three derived columns. `TrapName` is an optional
unsigned StrRef used for display only; display falls back to the bounded row
label and then `Row N`. Missing, malformed, over-budget, duplicate-authority,
or stale table data keeps the entire control preserve-only.

## Frozen cross-boundary contract

Area detail carries exact, presence-sensitive `TrapType` provenance. It is
editable only when exactly one canonical `TrapType : Byte` is present and its
value identifies a supported physical row in the retained effective table.
The frontend deep-copies the descriptor and exact current-row provenance. Area
detail carries one bounded, digest-bound catalog for the Area, rather than
duplicating rows per Placeable, and exposes all authoritative physical rows in
order.
`Set DC`, `Detect DC Mod. when set by Rogue`, and `Disarm DC Mod. when set by
Rogue` are read-only projections of the selected row and are never mutation
targets.

The optional changed pair is exactly:

```json
{
  "trapType": {
    "expectedValue": 0,
    "value": 3,
    "tableSha256": "<64 lowercase hex>",
    "tableRowCount": 48
  }
}
```

Projection admits only a changed pair bound to exact `aurora_git` Placeable
provenance and the immutable family ordinal. Planning reparses the canonical
native byte and rejects absent, duplicate, wrong-case, wrong-type, stale,
unchanged, invalid-row, cross-family, reordered, unknown-key, or
deletion-colliding mutations. Compilation re-resolves the authoritative table
descriptor and selected physical row and rejects digest, row-count, or row
availability drift.

The pair writer changes only the existing `TrapType : Byte`, preserves every
other GIT field and every GIC byte, and requires exact whole-struct and receipt
readback. The existing Area draft version, authorization, idempotency, atomic
pair-write, recovery, and request budgets remain unchanged. The descriptor is
constant-size. The optional Area-level catalog contains at most 256 ordered
entries and no binary data; it uses the existing Area-detail envelope and adds
no endpoint, pagination, streaming, or chunking.

## Tests, diagnostics, and completion boundary

TDD must cover the table parser/descriptor, precedence, bounded Area-detail
catalog, strict HTTP contract, parser provenance, projection/planning/compiler/writer,
frontend mapping/materialization, all 48 retail rows, stale-table recovery,
disabled unsupported profiles, Apply/OK/Cancel, clone/snapshot/undo, complete
GIT/GIC readback, builds, and regression smoke. Dedicated backend/frontend
mutation runs are optional and require an explicit user request.

Fail-closed diagnostics must identify the Placeable object ID, source ordinal,
native field, expected/actual digest, expected/actual row count, and requested
physical row without putting raw paths or high-cardinality values into metric
labels.

Offline implementation does not replace a fresh exact-candidate Toolset
Save/Build/reopen, packed readback, or NWN certification.

The offline implementation gate completed on 2026-08-19:

- backend focused `TrapType`/effective-table suites: 1472/1472 passed;
- backend full unit suite: 3897/3897 passed;
- backend E2E suite: 113/113 passed;
- frontend full unit suite: 2751/2751 passed;
- backend and frontend production builds passed;
- effective `traps.2da` Stryker gate: 335 killed, 0 survived,
  0 no-coverage, 100%;
- backend `TrapType` Stryker gate: 147 killed, 0 survived,
  0 no-coverage, 100%;
- frontend `TrapType` Stryker gate: 287 killed, 0 survived,
  0 no-coverage, 100%.

These results close implementation verification only. A fresh exact-candidate
Toolset/NWN proof remains a separate required recertification gate.

## Current Area CRUD closure — 2026-08-26

The retained-Placeable lane is now closed through the current saved-workspace
and atomic Area Update boundaries. Saved drafts must carry one valid dense
effective catalog plus exact immutable `aurora_git` Placeable family, source
ordinal, `TrapType : Byte` provenance, catalog digest, and row count. The
editable `trapTypeRow` must resolve to a physical catalog row, while `setDc`,
`detectDcModWhenSetByRogue`, and `disarmDcModWhenSetByRogue` must equal the
three derived values from that same row. Missing, malformed, stale,
wrong-family, unproven, out-of-range, unknown-row, and derivation-incoherent
states fail closed.

The atomic-publication integration changes only the retained `TrapType :
Byte`, verifies the complete candidate and receipt, and proves paired GIC and
IFO byte identity. The dedicated frontend regression proves the physical row
and all three read-only projections through Apply followed by OK, a separate
Cancel, another OK, reopen, and local Save while immutable expected-value
provenance remains unchanged.

The current bounded verification is nine backend unit suites with `1849/1849`
assertions, the Area Update integration suite with `37/37` assertions, and
seven frontend unit/regression suites with `422/422` assertions. Backend and
frontend production builds pass; the frontend build retains only its existing
large-chunk advisory. Capability catalog revision `2026-08-26.59` records the
exact audit and separate browser/Toolset/NWN blockers. Mutation testing was
not run because it is optional and was not explicitly requested.

No Docker engine, container, managed service, watcher, browser, capture,
Chrome, Toolset, or NWN process was started for this closure. Consequently,
fresh admitted browser readback, exact-candidate Toolset Save/Build/reopen,
packed readback, and NWN runtime behavior remain open proof gates and are not
claimed by the offline results.
