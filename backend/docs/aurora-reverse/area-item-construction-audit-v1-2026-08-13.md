# Area ground-item construction audit v1

Date: 2026-08-13  
Status: verified implementation authority for the bounded profile below  
Scope: construct one native Area ground-item `List` entry from the exact
immutable base-game `nw_cloth022.UTI` blueprint and a scene position/bearing

## Decision

Aurora Web may construct a new ground item only under this exact profile:

- profile: `nwn-base-key-uti-nw-cloth022-v1`;
- source family: `item`; scene family: `items`;
- resource: `nw_cloth022`, type `2025` (`UTI`);
- source SHA-256:
  `606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6`;
- GFF identity: `UTI `/`V3.2`, root struct type `0xffffffff`;
- blueprint and native instance tag: `NW_CLOTH022`;
- native GIT/GIC family and struct type: root `List`, type `0`.

Arbitrary item templates, stacks, costs, identity/name overrides, item
properties, inventory/equipment movement, plot/stolen/identified/cursed edits,
appearance/color/armor-part edits, variables, custom sources, and draft-supplied
bytes or paths are not admitted by this profile.

## Primary Aurora authority

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The recovered item lineage is:

- `FUN_00511e30` initializes common item defaults;
- `FUN_00604db8` reads the UTI common fields, item properties, base-item model
  parts, armor parts, and colors;
- `FUN_00605b0c` writes the same item profile and emits the paired legacy
  byte/extended word representation for armor parts;
- `FUN_0060636c` constructs the Area item instance with vtable `0x00c48e5c`;
- `FUN_006077a8` reads the five placement floats, paired GIC `Comment`, item
  profile, property list, and generic instance fields;
- `FUN_00607ccc` writes placement first, paired comment, complete item profile,
  optional properties, and generic instance fields.

The Area root lineage remains `FUN_00569cd4`/`FUN_0056a958`: ground items use
the five-character root label `List`, never inventory `ItemList`, and type-`0`
GIT/GIC structs. No xoreos or other GPL source was used.

## Immutable source and native instance evidence

The installed retail source readback is retained at
`evidence/area-item-construction-2026-08-13/base-uti-source-readback.json`.
It resolves exactly 1,420 bytes, 40 root fields, and the frozen digest. The
profile is base item `16`, stack `1`, cost `1`, identified, not stolen or plot,
has an empty `PropertiesList`, and carries the fixed commoner's-outfit armor
parts and six colors.

The independent packed-module instance is retained at
`evidence/area-item-construction-2026-08-13/native-instance-readback.json`.
It binds the exact template to type-`0` GIT/GIC records and demonstrates the
writer-only defaults and armor compatibility fields. The immutable packed
module is
`C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_npc_item_live_20260713.mod`,
SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.

## Frozen mapping

The GIT entry begins with:

```text
XPosition    = float32(scene.x * 10)
YPosition    = float32(scene.y * 10)
ZPosition    = float32(scene.z * 10)
XOrientation = float32(cos(scene.bearing))
YOrientation = float32(-sin(scene.bearing))
```

It then emits the item fields in Aurora writer order. `Cursed=0` is emitted
from the default although it is absent from the exact UTI. For each of the 19
armor parts (`RFoot`, `LFoot`, `RShin`, `LShin`, `LThigh`, `RThigh`, `Pelvis`,
`Torso`, `Belt`, `Neck`, `RFArm`, `LFArm`, `RBicep`, `LBicep`, `RShoul`,
`LShoul`, `RHand`, `LHand`, and `Robe`) the writer emits both
`ArmorPart_<part>:byte` and the native at-most-16-character
`xArmorPart_<part>:word`. `Robe=0` is a default absent from the UTI. The six
color bytes follow, then an empty `PropertiesList`.

`PaletteID` and blueprint `Comment` are not written into GIT. The paired GIC
record contains only `Comment = "1"`.

## Validation and exit criteria

The boundary must reject drift in source profile, digest, ResRef/tag, GFF
identity, root type, exact field type/cardinality/value profile, non-empty
properties, finite placement, or family identity. Additions remain append-only
after surviving source ordinals and share the global 1,024-object update budget.
Independent readback must verify exact appended GIT/GIC structs and counts.

Unit, round-trip, determinism, compiler, atomic-publication, persisted-readback,
focused mutation, complete Area Update regression, frontend factory/draft, and
production build gates are required. Product completion additionally requires
fresh exact-candidate Toolset Save/Build/reopen and NWN runtime evidence.

## Implementation and automated verification checkpoint

The bounded profile is implemented end to end through the frontend factory and
local draft, binary-free provenance contract, production `nwn_base.key`
adapter, update projector/compiler, paired GIT/GIC writer, independent
readback, and atomic snapshot publication.

Automated evidence captured on 2026-08-13:

- the production adapter read exactly 1,420 bytes and 40 fields with SHA-256
  `606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6`;
  the receipt is
  `evidence/area-item-construction-2026-08-13/base-uti-production-adapter-readback.json`;
- the focused writer suite passed 252 tests;
- the complete Area Update regression passed 14 suites and 226 tests;
- the focused frontend profile/factory/local-draft set passed three files and
  40 tests;
- backend build and backend `tsc --noEmit` passed;
- backend mutation scope killed 281/281 tested mutants, with zero survived,
  timed out, uncovered, or errored; report SHA-256
  `289e6d15a35c6bc691d940cdb412fc1b708a553e155a27a05036d460e3c6e5c6`;
- frontend mutation scope killed 22/22 mutants, with zero survived, timed out,
  or uncovered; report SHA-256
  `0ff22309c77defe3cf095de3361c0a974fd8494391814a347697ee1f87e76461`.

The global frontend production build initially failed on unrelated dirty-tree
VFX proof-loader work. A later same-day repository-wide rerun after that work
settled passed `tsc -b && vite build`; the Ground Item slice neither caused nor
claimed the intervening fix.

This checkpoint is automated implementation evidence, not native completion.
Fresh exact-candidate Toolset Save/Build/reopen and NWN runtime evidence remains
mandatory before the item capability or the overall Area program can be
certified complete.
