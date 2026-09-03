# VFX row181 proof-scene source audit (2026-08-13)

## Scope

This audit closes the source scene and source-to-target axis for the fresh
Aurora Web comparison of `visualeffects.2da` row 181, `VFX_IMP_MIRV`.
It does not claim final visual parity. The saved one-trigger NWN video remains
the behavioral oracle.

## Aurora-first evidence

- Approved NWN oracle:
  `row181/nwn-recapture-2/nwn-row181-one-trigger-approved-recapture.mp4`,
  SHA-256
  `b6106159ad902a281fa245331bf92a366b1199a650c2d2a71909f569e71ed7c6`.
- Exact captured module:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_vb_r181b.mod`,
  SHA-256
  `4ed1a443d4382e0e2b6de58a89b2d1da1376e0dc58b475238b1bd4603e2f42a4`.
- Exact Area source pack:
  `row181/nwn-recapture-2/source-scene/enon-test-effect-row181-exact-module-source-pack-20260813`.
- `enon_test_effect.are` SHA-256:
  `f2e52a1f014ff5e9b4eab6998dad0b1ddc3d9b17e44bd7e717a16bf83c056061`.
- `enon_test_effect.git` SHA-256:
  `bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6`.
- `tin01.set` resolves from `q_tilesets.hak`; all four referenced tile
  instances resolve to exact models (`4/4`, zero unresolved).
- No xoreos source was used.

## Source geometry

`module.ifo` places the first PC at `(9.5, 3.8, 0)` with forward `(0, 1)`.
The GIT places `effect_test` / `nw_innkeeper` at `(9.5, 6.8, 0)`.
`vb181shot.nss` turns both objects toward each other and applies exactly one
instant `VFX_IMP_MIRV` from the PC to `effect_test`.

The proof scene is therefore normalized around the source:

- source: Aurora `(0, 0, 0)`;
- target: Aurora `(0, 3, 0)`;
- target actor: `nw_innkeeper`, appearance 233, `c_yinnkeep` with `a_ba`,
  sampled at `pause1`;
- source actor: explicitly omitted because its exact BIC appearance requires
  the appearance-part and PLT assembly contract.

With the canonical `C=(x,z,y)` conversion, source-to-target becomes Three
`+Z`. The complete proof frame applies the production Area X reflection once;
that reflection does not change this longitudinal axis.

## Decision

The historical isolated row181 fixture rotated the three-metre path into a
horizontal comparison axis. That representation is not valid for a full
source-scene comparison. The generated row181 fixture now preserves the exact
module direction and carries the exact HAK-backed four-tile scene, source ARE
lighting, and target actor.

Regression:
`node backend/scripts/test-vfx-broad-row181-source-scene-fixture.mjs`.

