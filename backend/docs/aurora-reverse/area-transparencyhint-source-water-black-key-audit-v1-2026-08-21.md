# Area `transparencyhint` source-water black-key audit v1 (2026-08-21)

Status: source-asset-backed renderer defect diagnosis. The admitted correction
is limited to requiring bitmap evidence before Aurora Web installs its own
near-black color-key shader. This audit does not claim recovered retail
`transparencyhint` shader semantics.

## Question

Why does exact `atj02` group `ShipDocked01_2x2` expose large black surfaces
after the renderer-owned extent fill has already been moved below the authored
water planes?

This depends on an Aurora source material field, so source and decompiled
evidence were inspected before implementation. No xoreos source was used.

## Immutable inputs

- matrix plan id
  `d8564bfb48b247052a92c158ad34050c04a423be43655bf75aff3df3bde88283`;
- exact chunk `atj02-group-chunk-0007`, definition fingerprint
  `a0a577f1b3965d01827117f0c2f6e5cccb8df9402b8364978c2e26d640458d6f`;
- rejected exact canvas SHA-256
  `0400b57abfd4d620cb3624dd63db83c65c9356a1537f2d78fd5d301ecca26069`;
- expanded diagnostic state SHA-256
  `f987b875cbd769e637464100d03b08f0f2639e85b7acecf6710a4ec6d88098d6`;
- independent rejection SHA-256
  `93180881729dad1086243169e38d29536c59b76c32fb68b3b36bb3ea8bb21341`,
  code `DECLARED_WATER_TERRAIN_RENDERED_AS_BLACK_VOID`;
- exact source texture `atj01_water01`, object SHA-256
  `b787acb8a73c0afd8664b095681e67f7b5c82b7201cb5ab8187607cb880955d3`.

## Source and derived-model findings

All four group member models contain an authored `atj01_water01` surface:

- `atj01_u17_01`: `Plane494`;
- `atj01_v17_01`: `Plane492`;
- `atj01_u16_01`: `Plane496`;
- `atj01_v16_01`: `Plane491`.

The two `v` water planes cover the full tile. Runtime evidence binds all four
materials to ready texture id `3a91c32d2d0f770f135e3e58`, with no missing
material maps. The extent fill is at `Y=-0.118`, below each water surface at
`Y=-0.1`. Source black crop meshes in the two `v` models are classified as
hidden all-black geometry and are not the visible black surface.

The exact water bitmap decodes as 64x64 `tpc-dxt1`, has no alpha, RGB channel
range `55..99`, and has zero pixels at or below the renderer's source
near-black threshold of 12 in every RGB channel. It is a dark opaque water
texture, not a black-key atlas.

Unlike the previously proven `CaravelFloating_3x1` water material, these four
source meshes declare `transparencyhint 1`. Their source-preserving GLBs carry
`alphaMode=MASK`, `alphaCutoff=0.1`, base color `(1,1,1,1)`, source alpha 1,
and the original `transparencyHint=1` metadata.

The decompiled retail parser at
`C:/Projects/New Folder/export/decompiled_all.c:885353-885357` proves that
`transparencyhint` is parsed into the source mesh/material state at offset
`0xe0`. No recovered use site in the inspected decompilation establishes that
every opaque bitmap with this field uses black color-keying, nor a retail
luminance threshold.

## Aurora Web defect

Aurora Web currently treats this condition as sufficient for black-keying:

1. decoded texture has no alpha;
2. `transparencyhint > 0`.

It then installs a browser-owned shader that discards every fragment whose
linear-space luminance is at most `0.1`. The water's ordinary dark colors fall
inside that broad linear threshold even though the source bitmap contains no
near-black key pixels. Discarded water exposes the black renderer backing. The
expanded runtime state confirms all four water materials are consequently in
`cutout` mode with `alphaTest=0.1`.

## Admitted implementation rule

`transparencyhint` may select Aurora Web's near-black color-key path only when
all of the following are true:

1. the decoded bitmap is opaque;
2. `transparencyhint > 0`;
3. sampled RGBA source pixels contain at least one actual near-black pixel,
   defined as `R <= 12 && G <= 12 && B <= 12`.

When source pixel evidence is missing or contains no near-black pixel, the
material remains opaque. The shader threshold must use the corresponding
near-black maximum-channel threshold in linear space; it must not use broad
scene luminance. The rule is asset-identity-neutral and does not branch on
`atj02`, water names, group ids, tile ids, or model resrefs.

## Required regression and proof

- Preserve black-key cutout for an opaque texture containing exact black
  pixels and `transparencyhint=1`.
- Keep a dark opaque texture with RGB range above 12 opaque even when
  `transparencyhint=1`.
- Record sampled near-black coverage in material diagnostics.
- Keep focused placeable texture mapping, terrain material, and water extent
  regressions green.
- Re-capture exact `atj02-group-chunk-0007` from fresh requested state.
- Accept only if all declared water surfaces are visibly non-black, every
  contract is settled, no failed/bridge tile remains, and the five exact
  artifacts receive an independent visual review.

## Non-claims

This audit does not prove retail water animation, UV scrolling, reflection,
refraction, blending, TXI semantics, or a retail implementation of
`transparencyhint`. It removes an unsupported Aurora Web inference that was
destroying visible source-authored pixels.
