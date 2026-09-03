# VFX shared MDL material-lighting Aurora-first audit (2026-08-07)

## Status and decision

Status: `source-backed-equation-boundary-adapter-permitted-parity-open`.

Aurora Web may implement one shared MDL material-lighting adapter for every
MDL mesh consumer, including tiles, placeables, creatures, and VFX chunk
models. It must not add per-VFX lighting corrections. This audit permits only
the source-proven diffuse/ambient/emissive boundary below; it does not prove
retail visual parity.

No xoreos source, code, comments, or documentation was used.

## Primary sources

- Active retail artifact:
  `artifacts/vfx-postprocessing-2026-07-19/active-retail-postprocessing-shader-audit.json`,
  SHA-256 `70c9a31c68e8f3fe4e93f39e7402c2da1962f720a1dd812a5408b84c0f2900b3`.
  It applies `nwn_retail.key` precedence over `nwn_base.key`.
- Active `inc_lighting.shd`: `sourceClass=active-retail-override`, SHA-256
  `8548ea59d662829521e0618edb1511fc2a88a3ecf7108ead86829b8f3d200bf8`.
- Active supporting includes: `inc_common` SHA-256
  `20ecd0437d31e26ee797c83422c83870d62c7f910ca3bffc2473553401575337`,
  `inc_material` SHA-256
  `e6b53caa87429237c32b37606b956f3b6fc20eeff69ddedd35a3128c0a3992ac`,
  and `inc_config` SHA-256
  `8ae83f7fa429b2d646e7fe421edd25bdfb8c13724a56d5bdb2346b27ae258a8d`.
- Local Aurora Toolset decompilation:
  `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
  admitted `nwtoolset.exe` SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.

Relevant local anchors:

- `FUN_00a5b99c`, lines `885300-885350` and `885388-885433`, reads MDL
  mesh textures, diffuse, ambient, specular, shininess, animated
  `selfillumcolor`, and alpha inputs.
- `FUN_00a5872c`, lines `883013-883238`, reads MDL light color, radius,
  multiplier, `ambientonly`, dynamic flags, shadow flag, and priority.
- `FUN_00a40b60`, lines `865289-865442`, uploads the legacy Toolset light
  color/position and quadratic attenuation lane; `FUN_00a41e50`, lines
  `866101-866425`, uploads selected active-light slots.
- `FUN_00a423d8`, lines `866432-866590`, computes a separate CPU-side light
  aggregate using `max(0, 1 - distance/radius) * multiplier`. That helper is
  not the MDL surface pixel-lighting equation and must not replace it.
- `FUN_00a707a8`, lines `899678-899917`, resolves the light arrays and texture
  uniforms; its admitted disassembly binds `vColor` at attribute slot `2` and
  `vStaticLightDir` at slot `6`.

## Exact equation boundary

The recovered source is active, but it is a conditional include rather than a
single fully bound draw variant. The artifact does not prove the complete
preprocessor define set or runtime values of every lighting uniform for every
material. Therefore the equations are exact only inside their stated branch.

For the `GAMMA_CORRECTION == 1` point-light branch, with
`d2 = dot(lightPosition - surfacePosition, lightPosition - surfacePosition)`
and `Q = abs(lightColor.a)`:

```text
if d2 > Q: contribution = 0
x = d2 / Q
attenuation = (1 - x) / (lightMaxIntensityInv + lightFalloffFactor * x)
```

A negative `lightColor.a` selects ambient contribution; a non-negative value
selects diffuse contribution. The basic diffuse branch multiplies attenuation
by `max(dot(normal, surfaceToLight), 0)`. The legacy
`GAMMA_CORRECTION == 0` branch instead uses:

```text
attenuation = 1 / (1 + lightQuadraticAtten * d2)
```

For the non-specular, non-subsurface baseline, after area and point lights are
accumulated, the material boundary is component-wise:

```text
ambient = accumulatedAmbient * materialFrontAmbient.rgb
diffuse = (accumulatedDiffuse + staticLight) * materialFrontDiffuse.rgb
total = materialFrontEmissive.rgb + ambient + diffuse
total = max(total, min(frontLightModelProductSceneColor.rgb
                       * materialFrontDiffuse.rgb, vec3(1)))
ColorIO.rgb *= total
```

The legacy branch clamps `total` to `[0, 1]` before multiplication. Gamma-space
conversion is also branch-controlled; active `inc_common` defines
`ApplyColorSpace(c) = sign(c) * abs(c)^2.2` only when gamma correction is on.
Light softening, normal/height-map occlusion, translucence, and subsurface
scattering can modify the basic diffuse term and are outside this baseline.

## Permitted shared adapter

One shared adapter may consume source-proven MDL material values, the area
ambient/diffuse contract, selected MDL light contracts, the receiver normal,
and an explicitly identified shader profile. It may implement the exact
branch above, preserve ambient-only light classification, and report every
unsupported branch in telemetry. Generic GLB vertex color must not be treated
as Aurora static lighting without provenance.

The adapter must not guess `lightMaxIntensityInv`, `lightFalloffFactor`, a
shader-quality mode, missing material values, or a static-light bake. It must
not use per-effect multipliers, Fireball-specific conditions, or object-type
copies of the same equation.

## Limits and parity boundary

- **Specular/PBR:** active `inc_config` selects GGX as the distribution model,
  while `inc_material` conditionally derives roughness, specularity,
  metallicness, environment response, Fresnel, and map fallbacks. The exact
  per-material define set, texture bindings, and environment inputs are not
  closed here. A Three.js PBR material is not an Aurora parity substitute.
- **Static lighting:** the shader exposes `staticLighting`, `vColor`,
  `VertexStaticLighting`, and `vStaticLightDir`, but this audit does not recover
  the static-light bake/recompute algorithm or prove that converted GLB colors
  carry that payload. Static lighting must remain provenance-gated.
- **Postprocess:** material lighting produces pre-postprocess scene color.
  Bloom, sharpen, dynamic contrast, vibrance, type-4 color correction, gamma,
  SSAO, fog, and exposure must remain separate passes with their own active
  profiles and proof.
- **Parity:** this source audit permits implementation of a shared adapter; it
  does not prove matched retail pixels, active-light ownership/order, complete
  material variants, static lighting, or final postprocessed output.

## Implemented shared subset

Implementation status: `implemented-source-backed-subset-proof-observed`.

Aurora Web now uses one adapter at
`frontend/src/modules/shared/adapters/three/auroraMdlSourceMaterialLighting.ts`
for lit Three materials carrying converter-backed
`format=aurora-mdl-material` metadata. The adapter restores the source MDL
diffuse color after texture loaders, then applies the component-wise
`ambient / diffuse` factor only to Three's accumulated indirect irradiance.
Direct light therefore remains multiplied by source diffuse while ambient
light is multiplied by source ambient. The same adapter is consumed by the
canonical VFX Chunk renderer, the placeable/model texture path, and the
standalone NWN comparison scene. There are no per-VFX or Fireball conditions.

The admitted ratio form cannot represent `ambient > 0` when the corresponding
source diffuse channel is zero. That input returns
`unsupported-zero-diffuse-channel` without installing a partial shader. An
unlit/custom material, missing source data, or unverified provenance is also
reported explicitly. Material-object identity is tracked independently of
copied `userData`, so a normal Three material clone reinstalls its shader hook
instead of producing a false `already-installed` result.

The comparison runner records visible unique-material counts for installed,
unsupported, missing-source, unverified-provenance, and zero-diffuse states.
Every non-installed visible proof receiver adds a blocker to the canonical
runtime proof gate. This closes false PASS behavior; it does not promote visual
parity. Focused verification on 2026-08-07 passed 162 tests and the production
frontend build. The project-wide mutation command reached its unrelated dry
run and stopped on the pre-existing `WorkspaceLayout` creature metadata
expectation before executing mutants; the focused VFX/material suites are
green.

Fresh row-22 Web proof
`v73-shared-mdl-material-lighting-20260807` records exactly one playback, no
loop or overlap, a clean post-roll, proof-gate PASS, and 12/12 visible unique
receiver materials installed through the shared adapter with zero material
blockers. Web MP4 SHA-256 is
`862d48cac88573b97bd93646d6ca97f72b732339ed5ddd03d964125e68d1787f`.
The saved NWN MP4 was reused without rerun, SHA-256
`f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983`.
The onset-aligned comparison MP4 SHA-256 is
`1fb03c7b2c9d91fbb872617debf14900583800e4a113ad8e03df0a344e13b6d5`.
Baseline mean RGB changed from v72 `39.977` to v73 `39.176`, proving that the
shared receiver equation affects the rendered scene. Exact camera, actors,
full room receivers, core VFX morphology, static lighting, SSAO, postprocess,
and retail RNG remain open, so this is diagnostic evidence rather than a
parity claim.
