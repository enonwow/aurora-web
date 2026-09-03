# VFX particle normal-blend gamma-domain audit

Date: 2026-07-19

Status: Aurora-first source contract recovered and implemented. Fresh visual
proof is `matched-with-gaps`; visual parity remains open.

## Source policy

- Aurora-first: yes.
- Primary evidence: retail `fsparticle`, `vsparticle`, `inc_common`, and
  `inc_standard` shader resources; Aurora particle draw/blend disassembly; and
  the retail bloom shader packet.
- xoreos used: no.
- NWN or Toolset launched for this audit: no. The approved saved NWN MP4 remains
  the visual oracle.

## Recovered shader contract

The active retail particle override set is recorded in
`artifacts/vfx-particle-shaders-2026-07-19/active-retail-particle-shader-audit.json`:

- `fsparticle` SHA-256
  `acdea921e80243549205d86ffde2119af97a697443f27dcf6ee5e8798deb2816`;
- `vsparticle` SHA-256
  `be54c1637b70839f8972211b3afe9a67a722d9a0ebc1e97b9d4813f1e3ab9c20`;
- `inc_common` SHA-256
  `20ecd0437d31e26ee797c83422c83870d62c7f910ca3bffc2473553401575337`;
- `inc_standard` SHA-256
  `ba71b3946a52552078db408e4949075f548f4cfc40ea29a89aba138d85545148`.

The ordinary material path explicitly converts source colors into linear space
with `ApplyColorSpace`, performs its lighting/material work there, and calls
`RevertColorSpace` before writing the fragment.

The particle path intentionally bypasses those conversions:

```glsl
VertexColor = vColor;
FragmentColor = VertexColor * texture2D(texUnit0, vVertexTexCoords.xy);
gl_FragColor = FragmentColor;
```

Its later branches can alter alpha for soft particles and additive fog or apply
fog to normal particles. The active particle main does not linearize, revert,
or clamp the sampled particle texture/vertex product before output.

## Recovered blend and bloom contract

Aurora particle draw evidence maps:

- Normal to `GL_SRC_ALPHA`, `GL_ONE_MINUS_SRC_ALPHA`;
- bucket 2 / Lighten to `GL_SRC_ALPHA`, `GL_ONE`.

The retail bloom threshold samples the already composed framebuffer directly as
`texFBColor`; it does not first convert a separate linear particle layer. The
final bloom apply uses `GL_ONE`, `GL_ONE_MINUS_SRC_ALPHA`.

Therefore the source-backed order for non-custom textured particles is:

1. ordinary scene shading returns display-gamma RGB to the scene framebuffer;
2. particle vertex RGB and `texUnit0` RGB are multiplied without
   `ApplyColorSpace`;
3. Normal and additive particle factors accumulate that raw result against the
   same display-gamma destination;
4. bloom and retail postprocessing consume the composed framebuffer.

WGL framebuffer-sRGB extension detection exists in the decompilation, but
extension availability is not used as the behavioral proof. The explicit
ordinary-shader conversion paired with the explicit particle-shader bypass and
the shared framebuffer/bloom inputs establishes the runtime contract.

## Aurora Web defect

The canonical renderer currently keeps only additive particles in the
source-backed raw-gamma lane. Normal particles instead:

1. convert packed particle vertex RGB to linear on the CPU;
2. sample an sRGB-decoded texture;
3. alpha-blend into the linear scene target;
4. convert the composed result back to gamma after blending.

Linear alpha blending is not equivalent to Aurora's gamma-domain alpha
blending. In particular, translucent white particles over a dark destination
become too bright in Aurora Web, and overlapping layers collapse into an
overexposed body. This is a shared renderer defect, so it repeats across VFX
families.

## Required implementation

- Tag non-custom Normal particles as raw-gamma particle draws.
- Preserve their packed vertex RGB and sample the exact texture with
  `NoColorSpace`, as already done for source-backed additive particles.
- Render the linear non-particle scene first.
- convert that scene once to Aurora display gamma;
- composite all raw-gamma Normal and additive particles in one transparent
  render list against the converted destination while preserving scene depth;
- feed that composed gamma framebuffer to bloom and postprocessing.
- Keep Punch-Through and custom MTR program lanes separate.
- Expose Normal/additive raw-gamma mesh counts and stage order in proof
  telemetry.

## Acceptance

1. Red/green unit tests must prove lane classification, raw packed vertex RGB,
   exact texture color-space handling, and stage order.
2. Focused frontend tests and build must pass.
3. Runtime preflight must report settled assets, draw PASS, one playback, no
   overlap, and the new gamma-composite stage.
4. Capture exactly one fresh Aurora Web playback for the revision.
5. Reuse the approved saved NWN MP4 and publish an onset-aligned comparison.
6. Report `matched-with-gaps` unless the visual comparison genuinely closes
   parity.

## Implementation

- `auroraVfxCanonicalRenderer.ts` preserves packed gamma RGB and exact
  `NoColorSpace` texture sampling for non-custom Normal and additive particles.
- `auroraRetailBloomPass.ts` renders the linear scene first, converts it once
  to Aurora display gamma, and composites Normal and additive particle meshes
  together against the shared scene depth before retail bloom/postprocessing.
- Punch-Through and custom material-program paths remain separate.
- Runtime telemetry reports both raw-gamma mesh counts and the stage order
  `linear_scene -> raw_gamma_vfx_composite -> retail_bloom ->
  retail_postprocess -> raw_gamma_output`.

## Verification

- Focused frontend tests passed `69/69`.
- The frontend production build passed.
- A real WebGL preflight reported one Normal mesh, one additive mesh, the
  `raw_gamma_vfx_composite` stage, and `glError=0`.
- Accepted Web proof v11 has matching frontend/backend build identity, settled
  assets, exact emitter/light host names, draw-ledger PASS, proof-gate PASS,
  one trigger, loop disabled, zero overlap, and a clean post state.
- The saved approved NWN MP4 SHA-256
  `a1a9df16a51579f01ac1399435ceb0c770b4887e684b7e4364198cabbeb84bd8`
  was reused without launching NWN.
- Accepted Web source WebM SHA-256 is
  `aab99ca1ccc55743c66d4f78c5f09381611d289de8eaee7a40892e1b33bc2937`.
- The deterministic CFR30 Web MP4, derived without retriggering the VFX, has
  SHA-256
  `7d2076a1e01262bcef507ae9dc04b5f4896e4e5b3ce345a0bae149eabe0fa181`.
- The onset-aligned comparison MP4 has SHA-256
  `a0268916785b3951b0a565a188dc21e5b66a1961257546ffe261b4bbf28c17fd`;
  its contact sheet has SHA-256
  `71fc9cdc19800068d4f63dc802cd8d022f9cf3a0a10af3f70e5d8b3a6b132217`.

The first exact-capture launcher attempt timed out before the route reached its
armed state. No start hook ran and no media was created, so it did not consume
a playback. Increasing the pre-playback wait allowed the one accepted capture.

The original MediaRecorder MP4 retained wall-clock timestamps despite carrying
316 deterministic states, producing about 20 seconds at about 15.75 fps. The
exporter now retimes deterministic captures with
`setpts=N/(FPS*TB)`, an explicit output rate, and the exact final frame count.
The v11 comparison uses the derived 315-frame, 30 fps, 10.5-second MP4 and does
not replay either runtime.

## Visual verdict

The correction is globally source-backed and closes the wrong linear Normal
blend path. It does not establish visual parity by itself. The fresh comparison
still shows:

- an oversized, clipped initial Web flash;
- a Web Normal layer that spreads across too much of the view during early
  expansion;
- a compact saturated Web peak instead of the taller translucent retail
  column;
- different scene exposure caused in part by two unresolved source tiles,
  missing local tile lights, and a calibrated rather than exact retail camera;
- remaining soft-particle depth, fog, light, bloom, postprocess, and retail RNG
  gaps.

The terminal tail is substantially closer and both runtimes reach a clean,
invisible post state. Status remains `matched-with-gaps`.
