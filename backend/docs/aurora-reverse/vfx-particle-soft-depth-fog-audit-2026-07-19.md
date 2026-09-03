# VFX particle soft-depth and fog audit

Date: 2026-07-19

Status: Aurora-first runtime and active retail shader contract recovered.
Shared Web implementation and fail-closed telemetry added; real WebGL and
fresh differential proof remain open.

## Source policy

- Aurora-first: yes.
- Primary evidence: the `nwn_retail.key` shader override set, static retail
  Windows and unstripped Linux `nwmain` disassembly, the saved NWN capture
  settings, and the existing Aurora particle draw decompilation.
- xoreos used: no.
- NWN or Toolset launched for this audit: no. The approved saved NWN MP4 remains
  the visual oracle.

## Source identity

- Retail `nwmain.exe` SHA-256:
  `3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a`.
- Retail `nwmain-linux` SHA-256:
  `6d19c39bc646af5ddbc333ff31797a4acd9019506bcb45ef1b93b1bd5925e700`.
- Saved-capture `settings.tml` SHA-256:
  `16683ba66c2fca8a12c827c89adefd083c535bed8ded83f9b8da916b691d3d2f`.
- `nwn_retail.key` SHA-256:
  `dc1a96582a44e614bcd55ce42abf119416848ba47a9ef2a8818b227832c7b37a`.
- `ovr.bif` SHA-256:
  `50f535858eb19b29b239ed3ad36e5566b677fce1a80661fa3e8c9d8eaba99ff3`.
- Active retail override `fsparticle` SHA-256:
  `acdea921e80243549205d86ffde2119af97a697443f27dcf6ee5e8798deb2816`.
- Active retail override `vsparticle` SHA-256:
  `be54c1637b70839f8972211b3afe9a67a722d9a0ebc1e97b9d4813f1e3ab9c20`.
- Active retail override `inc_common` SHA-256:
  `20ecd0437d31e26ee797c83422c83870d62c7f910ca3bffc2473553401575337`.
- Active retail override `inc_framebuffer` SHA-256:
  `4779a9fe01a4419a8a1e394ffddd095d9bbda743e2476277ebc38add23421686`.
- Active retail override `inc_standard` SHA-256:
  `ba71b3946a52552078db408e4949075f548f4cfc40ea29a89aba138d85545148`.
- Exact active override shader sources and alpha-discard evidence are recorded
  in
  `artifacts/vfx-particle-shaders-2026-07-19/active-retail-particle-shader-audit.json`.

## Capture profile admission

The saved NWN capture settings contain:

- `graphics.general.shader-quality = "Performance"`;
- `graphics.effects.high-quality = true`;
- `graphics.fbo.hdr-bloom.enabled = true`;
- dynamic contrast, sharpen, SSAO, and vibrance enabled.

Static retail disassembly closes the shader-quality mapping:

- `nwmain.exe:0x1406bdfb0-0x1406bdffc` maps string `Performance` to scalar
  value `1`;
- the same branch maps `High Quality` to `2`;
- all other values, including `Minimal`, map to `0`;
- the value is submitted through renderer setting slot `7`.

The particle shaders compile soft-depth and particle-fog behavior when
`SHADER_QUALITY_MODE > 0`. The saved oracle therefore uses the active
Performance path. Omitting those branches in Aurora Web is not an admissible
profile simplification for this proof.

## Retail override resolution

The first extraction used only `data/nwn_base.key`. That key contains one
`fsparticle`, one `vsparticle`, and one `inc_common`, all in
`base_shaders.bif`. Those older resources expose `particleSoften` and
`particleSizeMax`.

The retail installation also contains `data/nwn_retail.key`. Its single BIF is
`data/ovr.bif`, and it explicitly indexes replacement `fsparticle`,
`vsparticle`, `inc_common`, `inc_framebuffer`, and `inc_standard` resources.
The replacement fragment shader declares `uniform float particleSoftness`.

This is independently joined to runtime by the renderer binary:

- `GLRender::ConnectShaderData` queries `particleSoftness` and stores its
  location at program offset `+0x1d2c`;
- `GLRender::SetUniforms` reads Aurora float shader slot zero and uploads it to
  that location;
- `PartEmitter::RenderEmitter` writes the recovered soft-particle scalar to
  Aurora float shader slot zero immediately before binding the custom particle
  shader.

Therefore `particleSoften` plus `particleSizeMax` is a superseded base-shader
contract, not the active retail contract for the admitted capture profile.

## Recovered soft-particle shader contract

On non-mobile builds with shader quality above zero, the retail override
fragment shader directly consumes the runtime scalar:

```glsl
if (particleSoftness > 0.0) {
  FragmentColor.a *= sqr(clamp(
    (GetDepth(gl_FragCoord.xy * vPixelSize) + GetFragmentViewZ())
      * particleSoftness,
    0.0,
    1.0
  ));
}
```

The active `inc_framebuffer` reconstructs positive scene view depth as:

```glsl
nearClip /
  (1.0 - sampledDepth * (1.0 - nearClip / farClip))
```

The active `inc_common` reconstructs negative fragment view Z as:

```glsl
-nearClip /
  (1.0 - gl_FragCoord.z * (1.0 - nearClip / farClip))
```

This is a framebuffer-depth input lane. It is not equivalent to
`depthWrite = false`, alpha blending, texture alpha, or final-frame blur.

## Recovered runtime gate and size input

Static retail `nwmain.exe` disassembly recovers the pre-draw scalar path:

- `particleSoftness` is queried at `0x1400aebe9`, with the uniform location
  stored at shader-program offset `+0x1d2c`;
- `0x1400ba27c-0x1400ba2a2` uploads the changed scalar from global float slot
  zero;
- the generic slot writer is `0x1400b7c70`;
- the particle renderer writes slot zero at `0x1400640db`;
- the exact `0.2f` source constant is at `0x140d8296c`.

The value is disabled when:

- the source particle has the landed/splat-style bit `0x200`;
- render mode is `Billboard_to_Local_Z` (`1`);
- render mode is `Billboard_to_World_Z` (`2`);
- the maximum evaluated particle half-extent is non-positive.

Otherwise the pre-draw path computes:

```text
1.0 / min(maxHalfExtent * 0.2, 0.2)
```

This is the exact scalar consumed by the retail override. Unlike the
superseded base shader, the active path has no `0.01` lower clamp. For a
positive `maxHalfExtent < 0.01`, retaining that old clamp would visibly weaken
the depth fade. The canonical Web input must come from evaluated particle
dimensions, not texture dimensions, object scale, material opacity, or an
effect-specific tuning constant.

## Recovered particle-fog contract

The vertex shader computes:

```glsl
fFogFragCoord =
  fogEnabled == 0.0
    ? 0.0
    : (-vPosView.z - fogStart) * fogInvEndMinusStart;
```

The fragment shader treats blend lanes differently:

- Additive multiplies alpha by `1.0 - clamp(fFogFragCoord, 0.0, 1.0)`.
- Normal and other non-additive particle lanes mix RGB toward the gamma-space
  `fogColor` by the clamped fog amount.

Applying one generic RGB fog mix to all particles is incorrect. Omitting fog
entirely is also incorrect for the admitted Performance capture profile.

## Aurora Web defect before this change

The canonical particle renderer patched `MeshBasicMaterial` only to multiply
sampled alpha by the per-particle `auroraAlpha` attribute. It did not sample
the shared scene depth and did not apply the retail per-particle fog branch.

The bloom pass already owns a scene `DepthTexture`, camera near/far values, and
the source-backed raw-gamma particle composite stage. That makes it the correct
adapter boundary for supplying frame-scoped depth and fog uniforms, while the
particle material remains the shared implementation for VFX hosts and
placeables.

Consequences visible across the proof corpus include:

- hard particle/terrain intersections instead of soft disappearance;
- opaque or geometric-looking debris and smoke near the ground;
- additive tails remaining visible too far into fog;
- normal particles retaining the wrong RGB at distance;
- larger bright layers covering more of the viewport before bloom.

These are shared renderer defects. Their different visual symptoms do not
justify per-effect tuning.

## Implemented shared path

- Raw-gamma Normal and Additive particle materials now receive the settled
  scene depth, viewport size, projection range, and source area fog state.
- Perspective depth follows the exact retail override equations.
- The orthographic proof camera uses linear depth reconstruction so the proof
  route no longer silently disables soft particles.
- The raw-gamma target owns a separate depth attachment. Scene depth is copied
  into that attachment for depth testing while the particle shader samples the
  original scene depth texture, avoiding framebuffer feedback.
- `particleSoftness` now uses
  `1.0 / min(maxHalfExtent * 0.2, 0.2)` without the superseded lower clamp.
- Normal particles mix gamma-space RGB toward source fog; Additive particles
  attenuate alpha.
- Shader patch anchors fail explicitly if the Three shader structure changes.
- The raw-gamma depth attachment remains owned through render-target disposal.
- `particleShaderLedger` records the gate, disable reason, scalar, depth
  identity/source, fog branch, and shader patch status. Proof fails with
  `particle-shader-ledger-failed` when the contract is incomplete.

## Remaining implementation and proof

1. Keep Punch-Through and custom MTR shader programs in their existing
   dedicated lanes until separately audited.
2. The orthographic row50 proof route has passed a real WebGL preflight with
   zero GL errors. A separate real perspective-camera preflight remains open.
3. Fresh row50 proof v12 and its saved-NWN comparison are complete. The
   post-playback ledger was then corrected to retain representative rows per
   logical draw record, and v13 proves the corrected retained coverage.
4. Continue with row22, row210, AOE, and placeable representatives. Row50
   passes the runtime gate but remains `matched-with-gaps` visually.

## Proof result

- v12 Web MP4 SHA-256:
  `163cd403eb4eae0c196e5be4658c4400bf715fbf5b4da9e6e28cdb4d67554363`.
- v12 onset-aligned comparison SHA-256:
  `74a5043969a043f68e7747ec88df06f4112e34ae3ee511128c38d2980130159d`.
- v13 retains representative `Smoke`, `Smoke01`, and `sparks` shader-ledger
  samples through the clean post state; all admitted samples report bound
  scene depth, the expected blend-specific fog branch, and an applied shader.
- The proof gate establishes capture integrity and runtime contract coverage.
  It does not establish visual parity.

## Acceptance

1. Add red unit tests for the mode/splat/size gate, exact softening factor,
   depth reconstruction, and blend-specific fog behavior.
2. Add renderer integration tests proving frame-scoped depth/fog uniforms and
   telemetry on the raw-gamma Normal and Additive lanes.
3. Run focused frontend tests and a production build.
4. Run a real WebGL preflight and require settled assets, draw-ledger PASS,
   exact host graph, one playback, loop disabled, zero overlap, and no GL
   errors.
5. Capture exactly one fresh Aurora Web playback for the revision.
6. Reuse the approved saved NWN MP4 and publish an onset-aligned comparison.
7. Keep the visual verdict `matched-with-gaps` unless the comparison genuinely
   closes the remaining differences.
