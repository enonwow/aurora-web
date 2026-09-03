# Existing Area Store inventory audit v1

Date: 2026-08-31  
Status: offline implementation complete; guarded browser and native live proof pending  
Scope: retained-subset mutation of the five native inventory repositories owned
by one retained type-`11` Area Store

## Decision

Aurora Web may expose the complete five-bucket inventory of one retained Store
when the native GIT shape and the exact effective `baseitems.2da` source are both
admitted. A target may remove or reorder retained entries inside their existing
bucket and may change each retained entry's `Infinite` state. The backend
re-packs every changed bucket deterministically with Aurora's 10-by-10,
row-major, multi-page repository algorithm before writing it.

This first bounded inventory slice does not create a new embedded Item, change
an Item identity or BaseItem, move an Item between Store buckets, edit an
embedded Item property, or accept client-authored repository coordinates.
Those operations require separate immutable UTI provenance and admission.

The exact outer `StoreList` is one list with five child structs in physical
order and type order `[0, 4, 2, 3, 1]`. Each bucket is either empty or contains
exactly one canonical `ItemList : List`. A non-empty ItemList contains at most
1,024 entries across all buckets. Every child has its zero-based physical
ordinal as struct type and exactly one canonical:

- non-empty `TemplateResRef : ResRef` matching `[A-Za-z0-9_]{1,16}`;
- `BaseItem : Int` naming a physical row of the bound `baseitems.2da`;
- `Repos_PosX : Word` and exact native spelling `Repos_Posy : Word`;
- optional `Infinite : Byte` with value exactly `1`.

`Dropable`, `Droppable`, `Pickpocketable`, `InventoryRes`, duplicate or aliased
control fields, an explicit zero-valued `Infinite`, an invalid bucket/list
shape, an unavailable BaseItem row, or missing/non-positive/out-of-grid
`InvSlotWidth` or `InvSlotHeight` keeps the inventory preserve-only. All other
embedded Item members remain opaque and byte-semantically preserved.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was inspected or used.

The recovered lineage is:

1. The common Store constructor `FUN_0063fe2c` allocates five inventory objects
   at offsets `0x8c`, `0x90`, `0x94`, `0x98`, and `0x9c`, each in inventory
   mode `3`.
2. The mode constructor `FUN_0052bdc8` gives mode `3` a 10-by-10 repository,
   up to 255 pages, a primary Item list, and no equipment list.
3. The GIT reader `FUN_00640e10` dispatches bucket type IDs `0`, `1`, `2`, `3`,
   and `4` to those five repositories and delegates to the complete embedded
   Item reader `FUN_0052a668`.
4. `FUN_0052a668` reads `ItemList`, the complete embedded Item, `Repos_PosX`
   and exact `Repos_Posy` Words. In mode `3`, only an optional non-zero
   `Infinite` Byte sets the infinite bit; mode-`0` Dropable/Pickpocketable
   flags are not part of Store storage.
5. The GIT writer `FUN_00641280` always emits bucket structs in canonical type
   order `[0, 4, 2, 3, 1]` and delegates each inventory to `FUN_0052b55c`.
6. `FUN_0052b55c` calls `FUN_0052d000` before serialization, emits sequential
   target ordinals, writes the complete embedded Item, appends both repository
   Words, and emits `Infinite : Byte = 1` only for a true mode-`3` bit.
7. `FUN_0052d000` rebuilds the repository by iterating the retained Item vector
   in order and reinserting every entry through `FUN_00529a94`.
8. `FUN_00529a94` resolves the Item's BaseItem dimensions and delegates to
   `FUN_00529d1c`, which scans pages, then rows, then columns for the first free
   rectangle. The written X is the column; the written Y is
   `page * 10 + row`. Consequently target order is significant and repository
   coordinates are derived output, not independent editable state.
9. The UTM reference reader/writer pair `FUN_00640f14` / `FUN_0064138c` uses
   the same five buckets and packing semantics but stores `InventoryRes`
   references. It is construction authority only and does not authorize
   retained GIT entries to be replaced from a loose ResRef.

First-party fixtures remain the independently accepted Store construction
readbacks:

- native type-`11` Store instance readback SHA-256
  `18f0b6108ce77b1206743ac74b11b6f647611417ac38e56092f76a418881095e`;
- immutable base UTM adapter readback SHA-256
  `ed3dfdf2b95fab58f8caf1ea311918715c29f242a302a4a298db874b4b1bf123`.

They confirm the five bucket IDs, 55 full embedded GIT Item instances, exact
UTM reference materialization, and optional `Infinite` omission.

## Additive contract v1

Area detail may add `storeMetadata.inventory` only when exact storage and the
effective BaseItem table are admitted:

```text
{
  expectedBuckets: [{
    bucketTypeId,
    entries: [{sourceIndex,resRef,baseItemId,slotWidth,slotHeight,x,y,infinite}]
  }],
  tableSha256,
  tableRowCount
}
```

`expectedBuckets` always has five entries in `[0,4,2,3,1]` order.
`sourceIndex` is the zero-based physical ordinal inside that bucket.
`slotWidth`/`slotHeight` are immutable dimensions bound from the effective
BaseItem row. `x` and `y` are immutable compare-and-swap evidence only. The
frontend detaches this value under immutable `source.storeInventory` and authors
`storeProperties.inventoryBuckets` as five lists of retained entries containing
only `{sourceIndex,resRef,baseItemId,infinite}`.

A changed Store projects one optional mutation member:

```text
inventory: {
  expectedBuckets,
  buckets,
  tableSha256,
  tableRowCount
}
```

Every target entry must select an existing source entry exactly once, remain in
its source bucket, and retain its ResRef and BaseItem. Target order and
`infinite` are editable. At least one removal, reorder, or flag change is
required.

Planning re-resolves the effective BaseItem table and requires its digest,
row count, physical rows, and `InvSlotWidth/InvSlotHeight` values to match the
draft provenance. Each changed bucket is packed row-major across 10-by-10
pages with a maximum encoded Y of 2,549. A target that cannot be packed in 255
pages fails closed.

Writing clones each retained embedded Item struct, replaces only its sequential
child type, derived repository Words, and canonical optional `Infinite`, and
preserves every other embedded field. Empty target buckets remain canonical
empty bucket structs. Candidate and persisted readback must reproduce the
complete five-bucket target, including derived coordinates.

## Budgets, diagnostics, and proof

The complete inventory is capped at 1,024 entries and remains within the
existing 256-KiB JSON mutation envelope. No endpoint, streaming, chunking, or
major contract version changes.

Diagnostics use `area_store_inventory_cas.v1` with bounded operation,
outcome, stable result code, bucket count, entry count, changed-entry count,
and duration. ResRefs, BaseItem IDs, object identities, ordinals, table hashes,
paths, source/storage keys, coordinates, dimensions, raw fields/bytes,
credentials, and host paths are prohibited from event fields and labels. A
telemetry sink failure must not affect validation, writing, rollback, recovery,
or publication.

Required offline evidence is exact parser admission/rejection, BaseItem-table
binding, packer parity vectors, domain and HTTP validation, projector CAS,
writer clone/remove/reorder/flag/repack behavior, unrelated-field and paired
GIC preservation, candidate and persisted readback, deterministic output,
frontend mapping/provenance/workspace/draft/materializer coverage, visible
active/preserve-only UI states, and Save/reopen regression coverage.

Fresh guarded browser evidence and exact-candidate Toolset Save/Build/reopen
remain separate completion gates. Gameplay-visible commerce behavior requires
fresh NWN evidence. This offline lane uses no Docker command, service, watcher,
browser, capture, Chrome, Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source.

## Implementation checklist

1. `[complete]` Freeze additive FE/BE and telemetry contracts.
2. `[complete]` Add tested exact raw storage, table binding, mutation, and packer domains.
3. `[complete]` Parse and publish only complete canonical five-bucket provenance.
4. `[complete]` Project and plan immutable-ordinal Store inventory CAS.
5. `[complete]` Clone, repack, write, and independently read back the candidate.
6. `[complete]` Wire frontend adapter, mapper, workspace, draft, UI, and local persistence.
7. `[complete]` Pass focused backend/frontend unit, regression, and production-build gates.
8. `[pending]` Capture guarded browser Save/reopen evidence.
9. `[pending]` Capture exact-candidate Toolset Save/Build/reopen evidence.

## Offline closure checkpoint

Capability catalog revision `2026-08-31.117` records this retained-inventory
slice while keeping Store authoring `partial` and release `blocked`. Fresh
bounded backend verification passes eight suites with `1162/1162` assertions;
the complete candidate-compiler coverage includes seven content-free telemetry
events and catalog-dimension drift rejection. Fresh focused frontend
verification passes seven files with `915/915` assertions, and the Store
Apply/Cancel/OK regression passes `1/1`. Backend and frontend production builds
pass; the frontend retains only its pre-existing large-chunk advisory.

The wider one-worker frontend unit gate completes `5086/5088`. Its two
deterministic failures reproduce independently in untouched Placeable/rendering
lanes: a stale `renderPackage` expected shape and a stale `DoubleSide` material
expectation. Neither failing test imports or exercises Store inventory, and
both focused retained-inventory gates remain green. No Docker command, service,
watcher, browser, capture, Chrome, Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used.
