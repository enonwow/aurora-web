# Area placeable construction audit v1

Date: 2026-08-13  
Status: verified implementation authority for the bounded profile below  
Scope: construct one native `Placeable List` entry from the exact immutable
base-game `plc_watertrough.UTP` blueprint and a scene position/bearing

## Decision

Aurora Web may construct a new placeable only under this exact profile:

- profile: `nwn-base-key-utp-plc-watertrough-v1`;
- source family: `placeable`; scene family: `placeables`;
- resource: `plc_watertrough`, type `2044` (`UTP`);
- source SHA-256:
  `a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`;
- GFF identity: `UTP `/`V3.2`, root struct type `0xffffffff`;
- blueprint tag: `Water Trough`; native instance tag: `WaterTrough`;
- native GIT/GIC family and struct type: `Placeable List`, type `9`.

Arbitrary placeable templates, property overrides, inventory, scripts,
variables, visual transforms, HAK/module/custom source precedence, and tag
overrides are not admitted by this profile.

## Primary Aurora authority

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The recovered placeable lineage is:

- `FUN_0063aac4` initializes the common blueprint defaults;
- `FUN_0063ae68` reads common placeable blueprint fields;
- `FUN_0063b8a0` writes those common fields;
- `FUN_0063bf04` initializes the placeable-specific defaults;
- `FUN_0063bf74` reads `HasInventory`, `BodyBag`, `Static`, `Type`, `Useable`,
  `OnInvDisturbed`, and `OnUsed` after the common fields;
- `FUN_0063c0a8` writes the same placeable-specific profile;
- `FUN_0063d0d8` reads the instance `X`, `Y`, `Z`, and `Bearing`, plus paired
  GIC `Comment`;
- `FUN_0063d3d8` emits the complete common/placeable profile, the four
  placement floats, paired GIC `Comment`, and inventory only when present.

The implementation uses no xoreos or other GPL source.

## Immutable source and native instance evidence

The installed retail `nwn_base.key` readback is retained at
`evidence/area-placeable-construction-2026-08-13/base-utp-source-readback.json`.
It resolves exactly 1,771 bytes and reproduces the frozen digest. The admitted
blueprint has `Appearance=104`, `Portrait=po_plc_n02_`, `HasInventory=0`,
`Useable=0`, `Plot=0`, and `Comment=Water Trough`.

The native packed-module readback is retained at
`evidence/area-placeable-construction-2026-08-13/native-instance-readback.json`.
It independently binds the exact template to type-`9` GIT/GIC entries,
`PortraitId=462`, default `BodyBag=0`, `Static=1`, no inventory list, instance
tag `WaterTrough`, and the paired editor comment.

## Frozen mapping

The GIT entry copies the admitted common and placeable UTP values in Aurora
writer order, with these proven conversions and additions:

```text
Tag        = "WaterTrough"
PortraitId = word(462)
BodyBag    = byte(0)
Static     = byte(1)
X          = float32(scene.x * 10)
Y          = float32(scene.y * 10)
Z          = float32(scene.z * 10)
Bearing    = float32(scene.bearing)
```

`Portrait` and `PaletteID` are blueprint/editor inputs and are not emitted in
the GIT entry. No inventory list is emitted because the immutable profile has
`HasInventory=0`. The paired GIC entry contains only
`Comment = "Water Trough"`.

## Validation, diagnostics, and exit criteria

The boundary must reject drift in source profile, digest, ResRef, blueprint
tag, native instance tag, GFF identity, root type, field type/cardinality,
frozen field values, finite placement, or family identity. Additions remain
append-only after surviving source ordinals and share the global 1,024-object
update budget. Independent readback must verify the exact appended GIT/GIC
structs and family counts.

Unit, integration, round-trip, determinism, atomic-publication, persisted
readback, focused mutation, complete Area Update regression, and frontend
factory/draft gates are required. Product completion additionally requires
fresh Toolset Save/Build/reopen and NWN proof for the exact final candidate.

## Implementation and automated verification checkpoint

The bounded profile is implemented end to end through the frontend factory and
local draft, binary-free provenance contract, production `nwn_base.key`
adapter, update projector/compiler, paired GIT/GIC writer, independent
readback, and atomic snapshot publication.

Final automated evidence captured on 2026-08-13:

- the production adapter read exactly 1,771 bytes with SHA-256
  `a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`;
  the receipt is
  `evidence/area-placeable-construction-2026-08-13/base-utp-production-adapter-readback.json`;
- the focused writer suite passed 196 tests;
- the complete Area Update regression passed 14 suites and 213 tests;
- the focused frontend profile/factory/local-draft set passed three files and
  38 tests;
- backend build, backend `tsc --noEmit`, and frontend production build passed;
- backend mutation scope killed 214/214 mutants, with zero survived, timed out,
  uncovered, or errored; report SHA-256
  `e6f3cf9eb9e97949fc09a8f456f61607f348b60c3b1e9535ddd0b18a505c4f0f`;
- frontend mutation scope killed 19/19 mutants, with zero survived, timed out,
  or uncovered; report SHA-256
  `4814f67013cacc3d9265436bbbb74bc3cb297176f8744798f28825ddd5bd7cbc`.

This checkpoint is automated implementation evidence, not native completion.
Fresh exact-candidate Toolset Save/Build/reopen and NWN runtime evidence remains
mandatory before the placeable capability or the overall Area program can be
certified complete.
