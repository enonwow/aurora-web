# Area store construction audit v1

Date: 2026-08-13  
Status: `implemented_offline_primary_source_bound`; final exact-candidate
Toolset Save/Build/reopen and NWN certification remain open.

## Scope

This audit freezes the first bounded native `Store Create` profile for Area
Update. It admits only the installed `x2_merc_dye.UTM` blueprint and its exact
ordered set of 55 installed UTI dependencies. It does not claim arbitrary
merchant templates, property editing, inventory editing, scripts, variables,
pricing authoring, or custom sources.

## Primary Aurora authority

The source blueprint is the exact installed base-game resource resolved through
the production adapter:

- profile: `nwn-base-key-utm-x2-merc-dye-v1`;
- resource type: `2051`;
- file identity: `UTM `/`V3.2`, root struct `0xffffffff`;
- ResRef and Tag: `x2_merc_dye`;
- size: 6,004 bytes;
- root fields: 17;
- SHA-256:
  `99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2`.

The root UTM contains five ordered store buckets with type IDs
`[0, 4, 2, 3, 1]`. Bucket four contains 55 ordered `InventoryRes` entries.
Entries 33 and 54 omit `Infinite`; the other entries retain it. Each dependency
is an installed 1,085-byte resource of type `2025`. The ordered identity tuple
set has SHA-256
`301639573ddc3bcdbf894d3c0f39ae79aeb271f7ac1f72b75e45081c14f4e2df`.

The exact production-adapter readback is retained at
`evidence/area-store-construction-2026-08-13/base-utm-production-adapter-readback.json`.

## Native Toolset authority

Accepted live standard `AUR-S01-06` selected `Dye Store`, placed exactly one
`x2_merc_dye` store, changed the store count from zero to one, saved, parsed the
result, and restored `Objects` selection mode. The retained module is
`codex_npc_item_live_20260713.mod`, 192,847 bytes, SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.

The native Area `demo` has a type-`11` store at `StoreList[0]`. Its GIT has
SHA-256 `a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`;
its paired GIC has SHA-256
`535d1ab4a0c1c22795b867e225437506dd20a905ede1f98e85aa1efcdc61c26d`.
The exact readback is retained at
`evidence/area-store-construction-2026-08-13/native-toolset-instance-readback.json`.

No xoreos or other GPL source was used.

## Frozen UTM-to-instance mapping

The admitted mapping is exact and fail-closed:

1. Validate the UTM identity, 17 ordered fields, types, values, five buckets,
   and the exact 55-entry repository manifest.
2. Resolve every referenced UTI through the same immutable base-key reader.
3. Validate each dependency's resource type, byte digest, exact UTI GFF
   identity, 18 ordered fields, template identity, and position in the ordered
   aggregate.
4. Emit one type-`11` GIT store and one same-index type-`11` GIC companion.
5. Convert scene coordinates with `scene * 10` and float32 rounding.
6. Emit store orientation as normalized float32 `cos(bearing)` and
   `-sin(bearing)`.
7. Retain the first 14 UTM fields in GIT and omit blueprint-only `ID` and
   `Comment`.
8. Replace every repository `InventoryRes` reference with the native embedded
   item instance: fixed inventory transform, UTI fields through `ModelPart1`,
   derived `xModelPart1:word`, `PropertiesList`, repository coordinates, and
   optional `Infinite`.
9. Omit UTI-only `PaletteID` and `Comment` from embedded items.
10. Emit GIC with only `Comment="Sample Dye Store"`.
11. Verify the exact appended GIT/GIC structures after serialization.

The native Toolset produced 33 sub-micro float residues in nested item
`XOrientation` fields, at most `2.3301325e-9`; 22 values were exact zero.
Normalizing values whose float32 absolute magnitude is below `1e-6` makes the
generated and native semantic structures identical, both with SHA-256
`346bf0b9691619d216399803826a17d3541378264066dc56949298987b650177`.
This normalization applies only to the known nested orientation residue and
does not weaken identity, digest, field, or inventory validation.

## Implementation

- Backend profile:
  `src/modules/areas/domain/area-store-construction-profile.ts`.
- The source port and production base-key adapter resolve the exact root UTM
  plus the immutable ordered dependency closure.
- Draft projection admits only `stores` + `store` with the exact binary-free
  provenance tuple.
- The paired writer constructs and verifies native type-`11` GIT/GIC additions
  while preserving every unrelated object-family entry.
- The compiler carries dependency bytes only inside the backend boundary,
  records count and ordered-set digest in the receipt, and atomically publishes
  ARE/GIT/GIC.
- The frontend factory creates a local store draft with the exact UTM source
  identity; it never transports blueprint bytes or dependency bytes.

## Automated verification checkpoint

- Focused backend regression: 5 suites, 488 tests passed.
- Focused frontend profile/factory regression: 2 files, 34 tests passed.
- Backend production build: passed.
- Frontend production build (`tsc -b && vite build`): passed.
- Backend Store-construction mutation scope: 378/378 killed, 100%, zero
  survived, timed out, uncovered, or errored. Report SHA-256:
  `d28d9c785cd22ee2def14b19847f965242ae648de62d05a76b734e57aee51988`.
- Frontend Store-profile mutation scope: 28/28 killed, 100%, zero survived,
  timed out, uncovered, or errored. Report SHA-256:
  `6150d28db18d3ef4bbb5f0ec1a2a8eb1cfc6fb4dad93f7ec3b80b333d124fe24`.
- The production adapter independently read the exact installed 6,004-byte
  UTM and all 55 admitted UTI resources.

## Remaining boundary

This is one Level-1 feature slice, not Areas product completion. Remaining
work includes the other three native Create families, arbitrary templates,
object properties/scripts/inventories, full Area CRUD transaction closure,
final exact-candidate Toolset/NWN certification, tile eligibility/rendering and
joining, independent PathConnect/WOK proof, and the declared 99-tileset matrix.
