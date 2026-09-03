# VFX proof-scene HAK precedence closure audit

Date: 2026-08-13

Status: implemented and verified for the row 44, row 50, and AOE0 broad-proof
fixtures.

## Scope and policy

- Aurora-first: yes.
- Primary evidence: the exact approved MOD files, their packed `module.ifo`,
  ARE/GIT resources, ordered HAK lists, and the selected `tin01.set` resource.
- xoreos used: no.
- NWN and Toolset launched: no. Existing approved NWN recordings were reused.

## Failed assumption

The older proof source packs resolved `tin01.set` only through
`nwn_base.key`. That selected base tiles 107 and 147 but left both instances
of tile 364 unresolved. The resulting two-tile scene was not the exact module
scene and could not be used to judge effect shape, occlusion, or local light
spill.

The exact modules do not use base-only resource precedence. Their packed
`module.ifo` contains 59 ordered HAK entries, including `q_tilesets`. The
selected HAK is:

- `C:\Users\enonw\Documents\Neverwinter Nights\hak\q_tilesets.hak`;
- HAK SHA-256:
  `9ba5addfc0999d5c6788869f4da4b30505b7b6679570ced634c3e5abd9e745bd`;
- selected `tin01.set` SHA-256:
  `684211cb424cf55304ac1ec4df2f66bb84f86ff33c9963f4ed7506b3bdd4d93d`;
- parsed SET tile count: 475.

The selected SET maps tile 364 to `gin01_h01_08`. Both previously missing
instances therefore resolve from exact module precedence rather than a visual
substitute.

## Implemented contract

`prepare-vfx-web-broad-proof-fixtures.ts` now consumes fresh source packs
generated from the exact row 44, row 50, and AOE0 modules. Each fixture:

1. preserves the exact MOD/ARE/GIT identity;
2. resolves all four source tile instances;
3. records `admittedTileCount=4` and `unresolvedTileCount=0`;
4. retains the two tile-364 transforms and their source orientation;
5. exposes source-backed tile lights from the resolved tile MDLs;
6. does not apply a two-tile mesh filter.

The source packs are under:

- `evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/source-scene/enon-test-effect-row44-exact-module-source-pack-20260813`;
- `evidence/vfx-nwn-broad-proof-2026-07-16/row50/nwn/source-scene/enon-test-effect-row50-exact-module-source-pack-20260813`;
- `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/source-scene/enon-test-effect-aoe0-exact-module-source-pack-20260813`.

## Verification

The row 44 and row 50 source-scene fixture regressions were changed test-first
from the obsolete 2/4 expectation to 4/4. They failed against the old packs
and pass after regeneration. The shared comparison-context fixture gate also
passes for all seven broad fixtures. Resource validation reports no unresolved
scene tile; unresolved sound and `ProgFX` references remain separate runtime
dependencies.

This closes the proof-scene tile/HAK gap. It does not claim exact retail camera,
source-player appearance, RNG, material, bloom, or postprocess parity.
