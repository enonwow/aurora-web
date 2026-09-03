# Dynamic Item nested inventory construction audit v1

Date: 2026-08-30  
Status: source-closed; offline implementation verified; live Toolset/NWN proof pending

## Scope

This audit freezes the native contract required to construct a new Area ground
Item from an effective UTI whose `ItemList` or `Equip_ItemList` is non-empty.
It extends `area-item-dynamic-template-construction-audit-v1-2026-08-30.md`.

The reviewed Aurora source is the frozen local decompilation
`C:\Projects\New Folder\export\decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
No xoreos or other GPL source was used.

## Aurora evidence

- `FUN_006485c0` constructs the UTI inventory member with native mode `1`.
- `FUN_00648878` reads the UTI common Item payload and then calls the
  reference-list reader `FUN_0052ad40`.
- `FUN_00648ec8` writes the UTI common Item payload and, when inventory is
  non-empty, calls the reference-list writer `FUN_0052b920`.
- `FUN_006077a8` reads an Area ground Item and calls the embedded-list reader
  `FUN_0052a668`.
- `FUN_00607ccc` writes placement, the paired GIC `Comment`, the common Item
  payload, and then calls the embedded-list writer `FUN_0052b55c` when the
  inventory is non-empty.
- `FUN_0060636c` constructs an embedded Item with position defaults
  `(-1, -1, -1)`; the common object defaults provide orientation `(0, 1)`.

The native reference grammar is therefore:

- `ItemList`: sequential child struct type `0..n-1`; exactly
  `InventoryRes: ResRef`, `Repos_PosX: Word`, `Repos_Posy: Word`.
- `Equip_ItemList`: one child per admitted one-hot slot mask; exactly
  `EquippedRes: ResRef`. Native writing walks the eighteen internal slots in
  ascending order and emits masks `0x1` through `0x20000`.
- Mode `1` emits none of the mode-`0` `Dropable`/`Pickpocketable` flags and none
  of the mode-`3` `Infinite` flag.

The Area GIT representation replaces every reference with the full common Item
instance. `ItemList` children retain the repository coordinates. Equipped
children retain the slot-mask struct type and have no repository coordinates.
Nested inventory is expanded recursively by the same native Item writer.
Wrapper-only UTI `PaletteID` and `Comment` fields are not copied into embedded
children. Only the root UTI `Comment` becomes the paired root GIC comment.

## Admitted deterministic profile

Aurora Web admits only the canonical mode-`1` grammar above. It rejects
duplicate labels, additional reference-entry fields, non-sequential
`ItemList` struct types, duplicate or unordered equipment slots, invalid
ResRefs, and dependency identity mismatches.

Every referenced ResRef must resolve to the exact current effective UTI winner.
Each dependency is retained with immutable SHA-256 and bytes. Its
`TemplateResRef` must equal the requested ResRef and its `ModelType` is derived
from the same effective `baseitems.2da` snapshot used for the root Item.

The dependency graph is expanded depth-first in source order and returned as a
deduplicated first-discovery closure. Repeated references may reuse one frozen
dependency payload. Cycles fail closed.

Project resource-safety bounds (not claims about Aurora engine maxima):

- maximum recursion depth: 8 dependency edges from the root;
- maximum reference occurrences: 1024;
- maximum unique effective UTI dependencies: 256;
- maximum cumulative unique dependency bytes: 16 MiB;
- maximum bytes per root or dependency UTI: 1 MiB.

The writer revalidates the entire closure, rejects missing and unused
dependencies, repeats the cycle and budget checks, and performs deterministic
readback through the existing paired GIT/GIC mutation contract.

## Diagnostics and proof gates

Telemetry `area_dynamic_item_blueprint_copy.v1` reports
`nestedInventoryState=expanded` for a successfully admitted non-empty closure.
Stable telemetry codes distinguish dependency identity, count/byte budget,
dependency BaseItem, and paired-profile rejection. Detailed fail-closed writer
diagnostics additionally distinguish missing or extra dependencies, digest or
resource-type mismatch, malformed reference grammar, cycles, depth,
occurrence, unique-count, and cumulative-byte violations.

Offline verification currently passes `17/17` dynamic writer/readback
assertions, `142/142` candidate-compiler assertions, `63/63` effective-template
repository assertions, `13/13` capability-catalog assertions, and the bounded
backend production build. Final completion additionally requires one fresh
coordinated Aurora Toolset/NWN proof window under the repository proof-capture
safety contract. No live proof is claimed by this audit yet.
