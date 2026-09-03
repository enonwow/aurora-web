# Area creature construction audit v1

Date: 2026-08-13  
Status: `implemented_offline_primary_source_bound`; final exact-candidate
Toolset Save/Build/reopen and NWN certification remain open.

## Scope

This audit freezes the first bounded native `Creature Create` profile for Area
Update. It admits only `nw_chicken.UTC` and does not claim arbitrary creature
templates, creature property editing, inventory/equipment authoring, scripts,
variables, conversations, factions, or statistics editing.

## Primary Aurora authority

The source blueprint is the exact installed base-game resource resolved through
the production adapter:

- profile: `nwn-base-key-utc-nw-chicken-v1`;
- resource type: `2027`;
- file identity: `UTC `/`V3.2`, root struct `0xffffffff`;
- ResRef and Tag: `nw_chicken`, `NW_CHICKEN`;
- size: 3,078 bytes;
- root fields: 63;
- SHA-256:
  `c1b0e194bb08b3e3d2946025c1e2f950b91e4cb844a32ba3b744c51a1d822a4a`.

The production-adapter readback is retained at
`evidence/area-creature-construction-2026-08-13/base-utc-production-adapter-readback.json`.

The independent packed-instance oracle is the immutable installed
`Chapter1E.nwm`, SHA-256
`8bb113637cda7363e6918da6b413818c7aac6b01a620d98cec9310254babb13c`,
Area `map_m1q6b`, `Creature List` index `2`. Its GIT resource has SHA-256
`76037824b0fb87cb99c8c3eba53f8c63ba7882533830164bbaf668934be22d29`;
its paired GIC has SHA-256
`d526c23ff1ef9df4ab354088828b7e8827446f8796d1ee823b4c18bf341eafbe`.
The exact summary is retained at
`evidence/area-creature-construction-2026-08-13/retail-nwm-instance-readback.json`.

The already accepted live Toolset placement standard `AUR-S01-02` independently
proves the native `Creatures` palette action, type-`4` GIT/GIC pairing, Save,
and immediate parser readback for this object family. Its exact candidate was
`Dwarf Mercenary`; it supports the family operation, not the chicken-specific
field mapping. No new live mutation was needed to derive this bounded mapping.

No xoreos or other GPL source was used.

## Corpus convergence check

A read-only scan parsed 207 installed/user `.mod` and `.nwm` archives without
archive failures, inspected 5,343 GIT resources, and found 197 `nw_chicken`
instances. Thirty-eight instances retained every shared scalar source value
except the repeated native `MaxHitPoints 6 -> 4` materialization. Eleven of
those use the 28-entry skill list also present in the selected retail NWM
oracle. Edited script, conversation, appearance, faction, and statistics
variants were excluded rather than generalized.

## Frozen UTC-to-instance mapping

The admitted mapping is exact and fail-closed:

1. Validate all 63 UTC fields, types, list structures, and values.
2. Emit one type-`4` GIT creature struct and one same-index type-`4` GIC struct.
3. Convert scene coordinates to native coordinates with `scene * 10` and
   float32 rounding.
4. Emit orientation as float32 `cos(bearing)` and `-sin(bearing)`.
5. Omit blueprint-only `PaletteID` and `Comment` from GIT.
6. Convert `Wings:byte` and `Tail:byte` to `Wings_New:dword` and
   `Tail_New:dword`.
7. Add the observed instance defaults `IsImmortal=0`, `Lootable=0`,
   `StartingPackage=0`, and `DecayTime=0`.
8. Materialize `MaxHitPoints=4`; no general hit-point formula is inferred.
9. Preserve all 20 source skill ranks and append eight zero-rank type-`0`
   entries, producing the observed 28-entry list.
10. Preserve `FeatList`, `TemplateList`, `SpecAbilityList`, `ClassList`, and
    the empty `Equip_ItemList` exactly.
11. Emit GIC with only `Comment=""`.
12. Verify the exact appended GIT/GIC structures after serialization.

The resulting GIT instance has exactly 70 fields. Source digest, profile,
template, ResRef, Tag, GFF identity, field count, field types, field values,
list structures, finite transforms, local identity, family cardinality, and
same-index GIT/GIC readback all fail closed.

## Implementation

- Backend profile:
  `src/modules/areas/domain/area-creature-construction-profile.ts`.
- Source port and production adapter admit `creature` and resolve only the
  frozen base-key tuple.
- Draft projection admits only `creatures` + `creature` with the exact
  binary-free provenance tuple.
- The paired object writer constructs and verifies native type-`4` GIT/GIC
  additions while preserving source survivor order and all other families.
- The compiler resolves each immutable source tuple once, records it in the
  mutation receipt, and publishes ARE/GIT/GIC atomically.
- The frontend factory creates `nw_chicken` with the exact source identity;
  unrelated creature profiles remain rejected by the materializer.

## Automated verification checkpoint

- Focused backend regression: 5 suites, 409 tests passed.
- Focused frontend profile/factory regression: 2 files, 33 tests passed.
- Backend production build: passed.
- Frontend production build (`tsc -b && vite build`): passed.
- Backend creature-construction mutation scope: 292/292 killed, 100%, zero
  survived, timed out, uncovered, or errored. Report SHA-256:
  `a5f3301f5ce06ec9608f17add959da7bb2d33f0cb84870cf6bc377e30b7d23df`.
- Frontend creature-profile mutation scope: 25/25 killed, 100%, zero survived,
  timed out, or uncovered. Report SHA-256:
  `26c4bc99ee215fdeb72518399216b076eb499060f193dc8433acd4bf2b806a84`.
- The production adapter independently read the installed 3,078-byte source
  with the exact admitted digest and 63-field GFF identity.

## Remaining boundary

This is one Level-1 feature slice, not Areas product completion. Remaining
work includes the other four native Create families, arbitrary templates,
creature properties and nested inventories/equipment, final exact-candidate
Toolset/NWN certification, tile eligibility/rendering/joining, independent
PathConnect/WOK proof, and the declared 99-tileset matrix.
