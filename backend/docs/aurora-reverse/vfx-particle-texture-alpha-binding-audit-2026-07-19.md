# VFX particle texture and alpha binding audit

Date: 2026-07-19

Scope: canonical Aurora particle texture sampling, row-50 smoke texture
identity, and the Aurora Web alpha-companion inference.

Status: the canonical renderer defect is fixed and covered by a focused
regression test. Fresh Web versus saved NWN visual proof remains required.

## Source policy

- Aurora-first: yes.
- Primary evidence: retail particle shader, row-50 source MDL, exact row-50
  TGA resources, and the saved approved row-50 NWN proof packet.
- xoreos used: no.
- NWN or Toolset launched for this audit: no.

## Retail shader contract

The active retail override is recovered from
`nwn_retail.key -> ovr.bif:fsparticle`, SHA-256
`acdea921e80243549205d86ffde2119af97a697443f27dcf6ee5e8798deb2816`.
The exact source and include identities are recorded in
`artifacts/vfx-particle-shaders-2026-07-19/active-retail-particle-shader-audit.json`.
Its particle-color path multiplies the evaluated vertex color by one full RGBA
sample from `texUnit0`. No second sampler and no resource-name suffix rule are
present in that active contract.

Therefore an emitter texture reference selects one exact RGBA texture:

`output RGBA = particle RGBA * texture2D(texUnit0, uv).RGBA`

Aurora Web must not infer `${textureReference}a` and bind it as a second alpha
map. A separately named resource ending in `a` remains an independent resource
unless the source emitter explicitly references it.

## Row-50 source evidence

The audited source model is
`evidence/vfx-nwn-broad-proof-2026-07-16/row50/sources/vim_negdeath.mdl`,
SHA-256
`9f46fed4f702d1e438ada87c400ea6c55b0590d2c279112188447e94b34a85b1`.

It contains distinct emitters that explicitly reference distinct textures:

- `Smoke` references `fxpa_smoke01`;
- `Smoke01` references `fxpa_smoke01a`;
- `souldust` references `fxpa_flare`;
- `sparks` references `fxpa_starbnw`.

The exact source textures are:

| Resource | SHA-256 | Dimensions | Channel observation |
| --- | --- | --- | --- |
| `fxpa_smoke01.tga` | `0c4feb3a55ec8e517f814fdbf4a7717a1e07c3362d725b7898abbe476c0e7cc1` | 128 x 128 RGBA | RGB is white; alpha ranges from 0 to 255 with 256 distinct values and mean 50.169 |
| `fxpa_smoke01a.tga` | `b409b5eb8d2f4c740a8afce03c5a0330da75af00fe71234b40321abb39286efe` | 256 x 256 RGBA | RGB is grayscale with mean 50.137; alpha is fully opaque |
| `fxpa_flare.tga` | `1897661d6d38eed400377575fb38239f66802a024b1e7f955a2dadcbfe138fe5` | source exact | grayscale, opaque |
| `fxpa_starbnw.tga` | `b57ee024acb85e46bc6c3a448d5d76812839cfae614bb77cd27a349681d0112c` | source exact | grayscale, opaque |

The old Aurora Web path bound `fxpa_smoke01` as the color map and
`fxpa_smoke01a` as its alpha map. That multiplied embedded smoke alpha by the
grayscale content of a different emitter's texture. The result could suppress
weak smoke-wave and translucent-column structure and was not Aurora behavior.

## Implementation decision

`frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`
now binds only the exact emitter texture as `map`. It does not set
`MeshBasicMaterial.alphaMap` from an inferred sibling resource. The existing
particle alpha shader continues to multiply the texture's embedded alpha by
the evaluated per-particle alpha.

Canonical mesh and material telemetry records:

- `auroraVfxCanonicalParticleTextureBinding=exact-texUnit0-rgba`;
- `auroraVfxCanonicalParticleAlphaSource=texUnit0-alpha-times-particle-alpha`;
- `auroraVfxCanonicalInferredAlphaCompanion=false`;
- the retail shader SHA-256 above.

This correction is in the shared canonical renderer, so effect VFX and
canonical placeable VFX inherit the same rule. The older explicitly
non-canonical placeable/creature preview scaffold still contains a companion
texture heuristic and must not be used as parity evidence; removing that debt
or replacing the scaffold with the canonical path is tracked separately.

## Verification

The focused test first failed on the old inferred `alphaMap`, then passed after
the renderer correction:

`npm.cmd test -- --run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts`

Result: 55/55 tests passed.

Fresh runtime proof is not claimed by this static and unit-test checkpoint.
The next accepted row-50 Web capture must pass
`aurora-vfx-runtime-observability/v1`, contain exactly one accepted playback,
reuse the saved approved NWN MP4, and publish an onset-aligned comparison.

That proof was captured as row-50 Web v5 and passed all observability gates
with one playback. Its exact-RGBA correction restored weaker smoke structure,
but the comparison still showed an oversized initial flash and a strong
Motion_Blur tail. A subsequent Aurora-first runtime audit corrected live mass
evaluation, the Explosion prior-tick one-shot guard, and the coarse 8 Hz proof
simulation profile. Therefore v5 proves this texture-binding correction but is
historical for the later runtime-tail state. See
`vfx-row50-runtime-tail-and-detonate-audit-2026-07-19.md`.

## Active profile follow-up

The active retail override exposes its depth-based fade through
`particleSoftness`; `particleSizeMax` and `particleSoften` belong to the
superseded `nwn_base.key` shader. The runtime scalar and active shader path are
closed separately in
`vfx-particle-soft-depth-fog-audit-2026-07-19.md`. Neither profile supports
restoring alpha-companion inference.
