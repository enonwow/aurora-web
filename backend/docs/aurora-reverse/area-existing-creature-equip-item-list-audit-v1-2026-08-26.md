# Existing Area Creature `Equip_ItemList` retained-subset audit v1

Date: 2026-08-26  
Status: source-closed contract and offline implementation verified; native recertification pending

## Scope and decision

Aurora Web may replace one retained type-`4` Area GIT Creature
`Equip_ItemList` with a canonical subset of its exact existing equipment. The
bounded slice permits removal and mode-`0` `Dropable`/`Pickpocketable` flag
editing while keeping the native equipment slot and embedded item identity
immutable. It does not admit a new equipped item, slot reassignment, arbitrary
UTI authoring, item-property editing, random equipment, or `Infinite`.

The complete Creature struct outside this one list must be preserved, and the
paired GIC must remain byte-identical. Missing, aliased, duplicated,
noncanonical, or ambiguous native structure is a blocker rather than input for
repair or synthesis.

## Primary Aurora authority

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, size `30,366,020` bytes,
SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was inspected or used.

The recovered full-item lineage is:

1. `FUN_00536090` constructs the Creature and calls the generic inventory
   constructor with mode byte `0` at line `195421`.
2. `FUN_0053ab24` calls generic full-item reader `FUN_0052a668` for an existing
   Area GIT Creature at line `197532`.
3. `FUN_0052a668`, beginning at line `188786`, opens exact
   `Equip_ItemList` at line `188870`. It reads each child struct type and maps
   only the one-hot masks `0x1` through `0x20000` to 18 fixed internal slots.
   An unrecognized mask is not installed. A later duplicate replaces the
   earlier internal slot, which makes duplicate physical slots unsuitable for
   lossless web mutation and therefore fail-closed.
4. The same reader constructs a complete Area item and invokes its full reader
   at line `188969`. In mode `0` it reads optional `Dropable` and
   `Pickpocketable` Bytes at lines `188970..188978`. `Infinite` is consulted
   only in mode `3` at lines `188980..188983`. Equipment has no repository
   `Repos_PosX`/`Repos_Posy` fields.
5. `FUN_0053ae80` calls generic full-item writer `FUN_0052b55c` for existing
   Creature GIT output at line `197594`.
6. `FUN_0052b55c`, beginning at line `189445`, opens `Equip_ItemList` only
   when at least one internal equipment slot is populated. It iterates the 18
   internal slots in ascending order and maps them back to child struct types
   `0x1..0x20000` at lines `189491..189545`. It invokes the complete item
   writer at line `189547` and emits only true mode-`0` `Dropable` and
   `Pickpocketable` fields at lines `189548..189554`. `Infinite` is emitted only
   in mode `3` at lines `189556..189557`.

This proves the native storage mapping, slot cardinality, canonical output
order, full embedded-item preservation requirement, and flag behavior. It does
not prove UI equipability rules, runtime combat/application behavior, or that
an arbitrary item may be inserted into an arbitrary slot.

## Frozen mutation contract

Area detail exposes a zero-based physical `sourceIndex` for each exact
`creatureMetadata.equipItemListMutationEntries` member. The frontend retains a detached
immutable list as `source.creatureEquippedItems` and edits
`creatureProperties.equippedItems` only when this provenance is complete.

Each source entry contains exactly:

- `sourceIndex`: the zero-based physical native list ordinal;
- `resRef`: one exact embedded `TemplateResRef`, ASCII `[A-Za-z0-9_]`, length
  `1..16`;
- `slotMask`: one of the 18 one-hot values `0x1..0x20000`;
- boolean `dropable` and `pickpocketable`.

Source ordinals must be sequential and slot masks unique. The source array is
bounded to 18 entries. Exact empty provenance requires native list absence;
an explicit empty native list, duplicate physical list, duplicate slot, wrong
case/type, `EquippedRes` fallback, `Droppable`, `Infinite`, noncanonical false
Byte, or missing `TemplateResRef` suppresses mutation provenance.

Each target entry contains the same five keys and must select exactly one source
ordinal. `sourceIndex`, `resRef`, and `slotMask` are immutable; only the two
flags may change. A source ordinal and slot mask may appear at most once. The
target must be in strictly ascending `slotMask` order to match the native
writer. Omitting an entry removes that equipped item; an empty target removes
the native list. Adding entries, changing slot, arbitrary target order,
unknown keys, aliases, random fields, and `Infinite` fail closed.

The backend reparses and compares the complete physical source list, clones
the complete embedded item struct for each selected retained entry, removes
the two canonical flag fields, and appends each only when true. It replaces
each child struct type with the immutable slot mask and emits entries in
ascending mask order. Every unrelated Creature field and all GIC bytes remain
unchanged, and an independent whole-struct candidate readback is mandatory.

## Offline implementation verification

The frozen contract is implemented through the complete Area Update path:

1. `area-creature-equipment.ts` owns the 18-mask allowlist and strict source
   and target validation.
2. `aurora-gff-area-parser.ts` publishes mutation provenance only for the exact
   canonical source shape while retaining loose display metadata separately.
3. `area-update-draft-projector.ts` and
   `area-existing-object-deletion-planner.ts` project changed equipment pairs
   and enforce optimistic comparison against the complete physical source
   list. Inventory and equipment may be changed independently or together in
   one Creature mutation.
4. `aurora-gff-area-object-pair-writer.ts` clones every retained embedded item,
   emits the immutable slot as the child struct type, writes only true
   `Dropable` and `Pickpocketable` Bytes, removes an empty target list, and
   preserves the paired GIC exactly.
5. `area-update-candidate.compiler.ts` resolves no blueprint for an
   equipment-only mutation and still requires the shared whole-candidate
   validation/readback and atomic publication boundary.
6. Frontend scene projection, immutable workspace cloning, property-draft
   admission, application provenance helpers, workspace materialization, and
   the Creature property window expose the exact retained subset as
   `ACTIVE_NOW`. Slot and item identity remain read-only; only flag editing and
   removal are available. Malformed or loose-only sources remain
   `PRESERVE_ONLY`.

The accepted bounded offline gate is six backend unit suites with `1760/1760`
assertions, the Area Update atomic-publication integration suite with `30/30`
assertions, nine focused frontend suites with `224/224` assertions, the
Creature property regression flow included in that frontend set, and passing
backend and frontend production builds. No Docker engine, container, managed
service, browser, capture, Toolset, NWN, or mutation-test process was started
for this verification. The hash-bound packet is
`output/proof/area-existing-creature-equip-item-list-offline-audit-2026-08-26/verification.json`.

## Completion boundary

This audit closes the storage contract and its offline implementation only.
Browser Save/reopen, exact-candidate Toolset Save/Build/reopen, and NWN runtime
certification remain separate gates. New equipment admission, slot
reassignment, item compatibility, arbitrary item-property authoring, random
equipment, and runtime behavior require additional Aurora-first evidence
before implementation may expand. The Creature family and the full Area
program therefore remain incomplete.
