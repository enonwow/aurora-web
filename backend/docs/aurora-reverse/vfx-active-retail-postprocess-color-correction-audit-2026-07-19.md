# VFX active retail postprocess color-correction audit

Date: 2026-07-19

Status: Aurora-first active override contract recovered. Aurora Web uses the
superseded base color-correction branch and requires a shared postprocess fix.

## Source policy

- Aurora-first: yes.
- Primary evidence: active shader resources selected with
  `nwn_retail.key` precedence over `nwn_base.key`, the saved capture settings,
  and the existing retail framebuffer call-order disassembly.
- xoreos used: no.
- NWN or Toolset launched: no. The approved saved NWN MP4 remains the visual
  oracle.

## Active source identity

The generated source packet is:

`artifacts/vfx-postprocessing-2026-07-19/active-retail-postprocessing-shader-audit.json`

Required active override resources:

- `inc_postpr`, SHA-256
  `4a4ff91e2ff73c3f05df1bcf0868df305ae3e5f63846cea624275c91d3236b5b`;
- `inc_config`, SHA-256
  `8ae83f7fa429b2d646e7fe421edd25bdfb8c13724a56d5bdb2346b27ae258a8d`;
- `inc_tonemap`, SHA-256
  `d59921acbe17cf2e990b70acf2a69cf2f4624e93e3cc8d0f0ba58ef7bc683133`;
- `inc_postpr_dyn_c`, SHA-256
  `2be52629215d6233d7024b74853cf3fe90cccafb2a52c5b979c60dde11378a85`.

`fsfbpostpr`, `inc_postpr_shrp`, and `inc_postpr_vibr` remain base resources
because no replacement with those resrefs exists in `nwn_retail.key`. Their
includes still resolve through the active override set.

The previous audit enumerated both keys but selected duplicate resrefs from
`nwn_base.key` first. That ordering was not the runtime override contract and
must not be used as implementation authority.

## Recovered contract

The active `inc_config` declares:

```glsl
#define COLOR_CORRECTION_TYPE 4
```

The active `inc_postpr` executes sharpen, dynamic contrast, and vibrance for
the saved capture profile, then calls:

```glsl
ApplyColorTonemap(Color.rgb);
```

Type `4` enters the fallback branch of active `inc_tonemap`. For a color whose
maximum channel is above `1.0`, it preserves the maximum channel while
compressing the distance of the other channels from that maximum:

```text
maximum = max(rgb)
inverted = -rgb + maximum
modifier = 1 - ((maximum - 1) / maximum)^2
rgb = -(inverted * modifier) + maximum
```

This is not the type-`1` brightness-sum branch. It does not return
`vec3(1.0)` merely because `r + g + b >= 3.0`.

## Aurora Web defect

`auroraRetailBloomPass.ts` currently implements the type-`1` branch under the
name `auroraColorClamp` and applies it after vibrance. The pass therefore
collapses some HDR particle/bloom colors to white with the wrong channel
relationship.

Because this pass consumes the composed scene after all Normal and additive
particles, the defect repeats across effect VFX and canonical placeable VFX.
It can alter clipped cores, translucent bright layers, bloom color spread, and
late bright residue. It does not prove that all remaining visual differences
come from this branch.

## Implementation contract

1. Replace the type-`1` brightness-sum branch with the exact active type-`4`
   overflow-preserving formula.
2. Keep the existing source-backed order: sharpen, dynamic contrast, vibrance,
   active color correction.
3. Record color-correction type `4` and the active source hashes in runtime
   diagnostics.
4. Do not tune individual VFX colors, alpha, sizes, or bloom constants.

## Acceptance

1. Add a red unit test for a non-uniform HDR input, proving type `4` differs
   from type `1`.
2. Verify the generated fragment shader contains the active type-`4` formula
   and no brightness-sum early-white branch.
3. Run the focused renderer/observability tests and production build.
4. Run a real WebGL preflight and require zero shader/program errors.
5. Capture exactly one fresh Aurora Web row-50 playback for the revision.
6. Reuse the approved saved NWN MP4 and publish an onset-aligned comparison.
7. Keep the verdict `matched-with-gaps` unless the visual comparison closes
   the remaining geometry, camera, scene, SSAO, lighting, and RNG differences.

## Implemented and verified

- `auroraRetailBloomPass.ts` now applies the active retail type-`4`
  overflow-preserving correction and reports the type, mode, active
  `inc_config` hash, and active `inc_tonemap` hash.
- Focused postprocess, canonical-renderer, and observability tests pass
  `94/94`; frontend and backend production builds pass.
- A real WebGL preflight reported `glError=0`, empty shader/program logs,
  `colorCorrectionType=4`, and the two active source hashes listed above.
- Fresh Web proof v13 records exactly one deterministic playback, one trigger,
  no loop or overlap, settled assets, retained representative particle-shader
  coverage, an empty proof blocker manifest, and a clean post state.
- Web MP4 SHA-256:
  `55b987a617fe21295c2a4e3a08d69fdc055e8ce2f439f187e3c6e2c465a5ad34`.
- The approved saved NWN MP4 was reused without launching or recording NWN.
  The onset-aligned comparison MP4 SHA-256 is
  `25e9919c8fc794c9cbaf37c08e58bc035d1e3677e17e35baf331bfa6728034cd`;
  the contact-sheet SHA-256 is
  `202e2c5a7ca1d6ae8a06666a6d49fe0ab73dc4c0cc12c4e087cbf1698deba20c`.
- Comparison manifest:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row50-active-retail-color-correction-onset-aligned-v13-20260719.json`.

## Visual verdict

Status remains `matched-with-gaps`. The active postprocess source-selection
and type-`4` color-correction defects are closed globally. Row 50 still has a
larger clipped onset, a lower and less translucent early body, a more compact
peak, and stronger residue near the retail last-visible frame. Two unresolved
source tiles, local tile lights, exact camera, retail RNG, SSAO, and remaining
particle shape/timing semantics must not be attributed to color correction.
