# Existing Area Creature `ItemList` audit v1

Date: 2026-08-26  
Status: offline implementation verified; browser and native recertification pending

## Scope and decision

Aurora Web may replace the ordered `ItemList` of one retained type-`4` Area
GIT Creature. The bounded slice admits retained full item structs and one
exact immutable `nw_cloth022` UTI blueprint. It does not admit
`Equip_ItemList`, random inventory, arbitrary UTI authoring, item-property
editing, or NWN item-use behavior.

The implementation must preserve the complete GIT Creature struct outside the
one admitted list and keep the paired GIC byte-identical. Missing or ambiguous
native structure is a blocker, not a request to synthesize a fallback.

## Primary Aurora authority

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, size `30,366,020` bytes,
SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was inspected or used.

The recovered lineage is:

1. `FUN_00536090` constructs the Creature and calls
   `FUN_0052bdc8(puVar5 + 0x33, '\0', 1)` at line `195421`. The inventory
   mode byte is therefore exactly `0`.
2. `FUN_0053ab24` is the already verified existing Creature GIT reader. After
   transform and embedded Creature payload reads, it calls
   `FUN_0052a668(piVar1, param_2, local_38)` at line `197532`, where
   `piVar1 = param_1 + 0x33`.
3. `FUN_0053ae80` is the matching existing Creature GIT writer. When inventory
   or equipment is non-empty it calls
   `FUN_0052b55c((int *)(param_1 + 0xcc), param_2, param_3)` at line
   `197594`.
4. `FUN_0052a668`, starting at line `188786`, reads `ItemList`, constructs a
   full Area item with `FUN_0060636c`, invokes the full item reader, and then
   reads `Repos_PosX` and `Repos_Posy` as Words. For mode `0` it reads
   optional `Dropable` and `Pickpocketable` Bytes. `Infinite` is read only in
   mode `3`.
5. `FUN_0052b55c`, starting at line `189445`, creates `ItemList` child structs
   in target order, invokes the full item writer, appends both repository
   Words, and emits `Dropable=1` or `Pickpocketable=1` only for set mode-`0`
   flags. It never emits `Infinite` for a Creature.

The same generic functions also process `Equip_ItemList`, whose child struct
type is an equipment slot mask. That observation is recorded but does not
authorize equipment mutation in this slice.

## Independent Toolset evidence

Accepted Stage 4 proof `AUR-S04-03` is retained under
`evidence/stage4-live-2026-07-16/s04-03-item-npc-inventory/manifest.json`,
SHA-256
`cddc9f6084a1f80080829f1ede9a15731980215b9a31cd16a257ea8a8e9cae27`.
The native inventory drag/drop moved the exact `nw_cloth022` ground item into
the Creature at `(60.9686, 54.5207)`, tag `NW_DWARFMERC001`:

- Area ground items changed `3 -> 2` while Creature inventory changed
  `0 -> 1`;
- the saved entry was `nw_cloth022`, repository `(0, 0)`, with both mode-`0`
  flags false;
- rollback restored ground items `2 -> 3`, Creature inventory `1 -> 0`, and
  the baseline object counts;
- the accepted bridge used no global cursor, mouse, or keyboard input.

Positive and rollback raw GIT summary SHA-256 values are respectively
`bd536b9e367109597b297cf2c35f25a72348d710ae21a24134e2d74a73827eb2`
and
`7fadfaa19217ed31dd87736e99880e5796e9eba9149f4571c6b82f852b61ecea`.
This proof establishes native Toolset semantics and the exact first admitted
item identity. It does not certify the future web-produced candidate.

## Frozen mutation contract

Area detail exposes a zero-based `sourceIndex` for every parsed native
Creature inventory entry. The frontend retains the exact array as immutable
`source.creatureInventoryItems` and edits
`creatureProperties.inventoryItems`.

Each immutable source entry contains exactly `sourceIndex`, non-empty
`resRef`, `x`, `y`, `dropable`, and `pickpocketable`. Each target entry is one
of:

1. a retained source entry with the same `sourceIndex` and `resRef`, with
   editable repository coordinates and mode-`0` flags; or
2. a new entry with exact `itemResRef`, `itemSourceObjectKey`,
   `itemSourceFingerprint`, `resRef`, repository coordinates, and mode-`0`
   flags for the admitted immutable UTI.

ResRefs use ASCII `[A-Za-z0-9_]`, length `1..16`. Coordinates are safe
integers in `0..65535`; the two flags are booleans. `Infinite` and the alias
`droppable` are rejected. Source ordinals may occur at most once in the
target. Both arrays are bounded to 1024 entries. Target order is significant
and regenerates sequential child struct type IDs `0..n-1`.

The expected list is an optimistic compare-and-swap value in addition to the
outer source GIT SHA-256 and immutable Creature ordinal. The backend reparses
the exact native list and requires:

- an absent `ItemList` for an empty source list, or exactly one list otherwise;
- exactly one full nested item identity `TemplateResRef` per entry;
- exactly one Word each for `Repos_PosX` and `Repos_Posy`;
- at most one canonical `Dropable` Byte and one canonical
  `Pickpocketable` Byte, where absence is false and a present value must be
  exactly `1`;
- no `Infinite`, `Droppable`, or duplicate list/field aliases.

A retained entry clones its complete nested item struct, replaces the two
repository Words, removes both mode-`0` flag fields, and appends only those
whose target value is true. A new entry resolves and verifies the exact
`nwn-base-key-uti-nw-cloth022-v1` source with SHA-256
`606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6`,
expands its complete native item instance, appends the repository Words, and
emits only true mode-`0` flags.

An empty target removes `ItemList`; a non-empty target replaces or appends the
one canonical list. The candidate receives an independent exact whole-struct
readback. Wrong family, missing provenance, malformed values, stale expected
entries, duplicate source selection, unresolved blueprint, deletion
collision, GIC drift, or any preservation mismatch fails closed with stable
`422 AREA_UPDATE_OBJECT_MUTATION_INVALID` diagnostics.

## Completion boundary

Source closure and the bounded offline implementation are complete for retained
Creature `ItemList`. The backend now validates the exact expected/target pair,
projects it from the draft, reparses native source state, clones retained item
structs, expands only the admitted immutable UTI, writes the canonical ordered
list, preserves GIC, and independently verifies candidate readback. The
frontend now maps and detaches exact source entries, keeps immutable source
provenance through clone/draft flows, validates the editable target at the Area
workspace boundary, and exposes only the admitted mode-`0` controls. Applying
the dialog no longer rewrites source metadata used by optimistic comparison.

The accepted bounded offline gate on 2026-08-26 is:

1. six backend unit suites with 726/726 assertions;
2. the Area Update atomic-publication integration suite with 30/30 assertions;
3. nine grouped frontend unit files with 257/257 assertions plus the Creature
   mapper suite with 6/6 assertions;
4. the Creature properties regression smoke with 1/1 assertion flow;
5. passing backend and frontend production builds; the frontend build reports
   only the pre-existing large-chunk advisory.

The hash-bound packet is
`output/proof/area-existing-creature-item-list-offline-audit-2026-08-26/verification.json`.
No Docker engine, container, managed service, browser, capture, Toolset, NWN,
or mutation-test process was started for this verification.

This does not activate `Equip_ItemList`, random inventory, arbitrary UTI
authoring, or nested item-property editing. Browser interaction evidence and a
fresh exact-candidate Toolset Save/Build/reopen plus NWN certification remain
required before native completion can be claimed. Product completion also
requires the remaining object properties and families, the full 99-tileset
matrix, and independent PathConnect/WOK proof.
