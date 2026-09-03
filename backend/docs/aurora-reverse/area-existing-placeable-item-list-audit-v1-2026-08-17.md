# Existing Area Placeable `ItemList` audit v1

Date: 2026-08-17  
Status: source-closed implementation contract; runtime recertification pending

## Scope and authority

This audit covers mutation of the `ItemList` owned by one retained type-`9`
Area GIT Placeable. It does not promote creature inventory, store inventory,
equipment, ground-item placement, random inventory, or arbitrary UTI
authoring.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding Toolset binary SHA-256 is
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

## Recovered native lineage

The placed-Placeable lineage is unambiguous:

- `FUN_0063c180` constructs the placed Placeable and initializes its inventory
  with `FUN_0052bdc8(..., 2, 1)`;
- `FUN_0063d0d8` reads the placed instance and delegates its inventory to
  `FUN_0052a668`;
- `FUN_0063d3d8` writes the placed instance and calls `FUN_0052b55c` only when
  the in-memory inventory contains at least one item;
- `FUN_0052a668` reads `ItemList`, creates a full Area item through
  `FUN_0060636c`, invokes the item's native reader, and then reads
  `Repos_PosX` and `Repos_Posy` as Words;
- `FUN_0052b55c` creates `ItemList` structs in target order, invokes the full
  item writer, and appends `Repos_PosX` and `Repos_Posy` as Words.

The inventory mode is `2`. The generic reader/writer handles `Dropable` and
`Pickpocketable` only for mode `0`, and `Infinite` only for mode `3`.
Consequently none of those flags belongs to the placed-Placeable ItemList
profile. The historical web UI showing all three flags was not native
authority and must not drive serialization.

The full nested item struct is material. A parsed `resRef` summary can come
from nested `TemplateResRef`; it does not prove an `InventoryRes` reference
profile. Existing nested fields must therefore be cloned exactly. New entries
must be expanded from an immutable admitted UTI rather than synthesized from a
typed ResRef.

## Independent Toolset evidence

Accepted Stage 4 proof `AUR-S04-04` is retained under
`evidence/stage4-live-2026-07-16/s04-04-inventory-placeable/manifest.json`.
The positive save changed the selected Placeable from zero to one inventory
entry (`s03proofamuletr2`) while keeping object identity stable. The rollback
returned the exact count to zero and restored the Area counts. The separately
saved intermediate state proves `HasInventory=true` with no `ItemList`, so the
boolean and list cardinality are independent native state.

This evidence proves Toolset add/save/readback/rollback behavior. It does not
by itself certify the new web mutation path; fresh Toolset Save/Build and NWN
proof remains required by the parent Area program.

## Frozen mutation contract

Area detail exposes each source list entry with its zero-based native ordinal,
`TemplateResRef`, and repository coordinates. The frontend retains this array
as immutable Placeable inventory provenance. A target list entry is exactly
one of:

1. a retained source entry identified by its source ordinal, with unchanged
   item identity and optionally changed repository coordinates; or
2. a new immutable item blueprint identified by source profile, template
   ResRef, and SHA-256, with repository coordinates.

`Repos_PosX` and `Repos_Posy` are safe integers in `0..65535`. ResRefs use the
existing Aurora ASCII `0..16` contract, but an inventory entry cannot use the
empty ResRef. Source ordinals are unique in the target list. Reordering is
allowed; output struct type IDs are regenerated from target order. The source
GIT SHA-256 and source Placeable ordinal remain the outer optimistic lock.
Both the immutable source array and target array are bounded to 1024 entries
per Placeable mutation. A larger native list remains readable/preservable but
is not editable through this v1 mutation path.

For an existing entry the backend clones every nested item field exactly and
changes only the two repository Words. For a new entry the compiler resolves
the exact UTI through the admitted blueprint port, verifies its identity and
SHA-256, expands the native item-instance profile, and appends the two Words.
An empty target removes `ItemList`; a non-empty target replaces the one exact
native list or appends it when the source list is absent. GIC remains byte
identical.

The independent readback compares the complete candidate Placeable struct
against the exact admitted reconstruction. Missing or duplicate lists,
missing or duplicate repository fields, wrong field types, stale ordinals or
identities, duplicate source use, unsupported flags, unresolved or stale
blueprints, deletion collisions, and preservation drift fail closed.

The first new-item profile remains the already audited immutable
`nwn-base-key-uti-nw-cloth022-v1`. General arbitrary-UTI inventory admission is
not claimed by this slice.

## Completion boundary

Source closure requires focused backend and frontend tests, exact GIT/GIC
readback, mutation testing for the new validators and mutation paths, builds,
and a recorded program checkpoint. Global completion still requires the full
Area CRUD/tile matrix and fresh Toolset/NWN certification.
