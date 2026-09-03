# VFX placeable plc_t04 v52 gap audit

Date: 2026-07-20

Status: guarded Aurora Web execution proof accepted; visual parity remains
matched-with-gaps

## Source policy

- Rules-first and Aurora-first: applied.
- Primary runtime sources: the admitted Aurora Toolset decompilation and active
  retail shader audits referenced below.
- Retail visual source: the already saved NWN MP4. NWN and Toolset were not
  launched or recorded again.
- xoreos used: no.

## Why broad VFX comparisons still differ

Passing the canonical host, asset, draw, shader, playback, and proof gates
establishes that Aurora Web executed the requested source-backed graph. Those
gates do not by themselves establish matched pixels.

The repeated visible gaps have three distinct classes:

1. Proof-context gaps: the saved NWN `plc_t04` oracle contains two persistent
   placeables in the bakery scene, with retail camera, area geometry, local
   lighting, exposure, and framebuffer history. The v52 Web proof contains one
   isolated placeable on a neutral backdrop. It is valid for morphology and
   lifecycle review, but not for pixel-parity promotion.
2. Shared renderer gaps: exact retail scene integration is still open for
   camera, local tile lights, complete receiver geometry, SSAO, and any
   remaining framebuffer behavior not covered by the admitted particle shader,
   bloom, and active type-4 color-correction audits.
3. Family-specific gaps: Fountain, Explosion, Motion Blur, Chunk, Linked,
   Lightning, P2P, beam, AOE, and persistent placeable emitters carry distinct
   source fields and runtime branches. A shared renderer correction does not
   close every family-specific scheduler, shape, attachment, or retirement
   question. Retail RNG state is also absent from saved captures, so exact
   particle placement cannot be inferred from a deterministic Web seed.

Historical broad-matrix captures that predate the latest global corrections
must not be used to judge the current renderer.

## Blend and atlas adjudication

`source-mdl-placeable-emitter-blend-parity-2026-07-11.md` records the Toolset
disassembly that maps authored `Lighten` to blend bucket 2 and recovers
`glBlendFunc(GL_SRC_ALPHA, GL_ONE)`. The current render contract and Three.js
adapter apply those exact factors. Blend mode is therefore not an open
hypothesis for the v52 `OmenEmitter240` lane.

The source `fire!02` emitter authors atlas frames 0 through 24 on a 4 by 4
texture. The current runtime preserves the raw frame range and the texture
sampler address mode handles the out-of-range cells. The
`VFX_ATLAS_FRAME_RANGE_OUT_OF_BOUNDS` diagnostic is source provenance, not
permission to clamp or retune the emitter. The current checkpoint scheduler
uses the source-backed one-step advancement already recorded in
`vfx-implementation-checklist.md`.

Neither atlas diagnostic justifies a visual tweak to `plc_t04`.

## Runtime diagnostics correction

The canonical placeable texture-settlement status formerly read the first
timeline frame's root marker after an async texture refresh. A persistent VFX
can have an empty first frame while all requested textures are loaded and
bound, which produced the contradictory v51 state `missing` despite complete
asset settlement.

The shared placeable host now reports `applied` when every requested canonical
texture URL settled. Renderer draw, shader, and proof ledgers remain independent
acceptance gates. The focused regression first reproduced the old `missing`
result and then passed after the correction.

This is a diagnostics correction. It does not claim a visual parity change.

## Accepted v52 Web packet

Runtime identity:

- commit: `02b4a79693a6-dirty-2f08562569738faa`;
- frontend/backend source digest:
  `sha256:2f08562569738faa43437e80c70426aefcc8129fef9701a74f5330a9b0fac4fe`.

Acceptance facts:

- host graph PASS with static nodes `Plane25`, `Rectangle121` and emitters
  `fire!02`, `OmenEmitter240`;
- asset settlement PASS for 6 dependencies;
- draw ledger PASS with 22 visible records at the static checkpoint;
- particle shader ledger PASS for the Normal smoke and additive flame lanes;
- one playback trigger, loop disabled, zero overlap, 10-second duration;
- final proof gate PASS with an empty blocker manifest;
- texture status `applied`, 5 of 5 DOM texture requests settled.

Artifacts and SHA-256:

- `evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-t04-canonical-host-v52-current-global-renderer.png`
  - `6e2b847e06093326f43a1710b0f0b7cf3764a428578f86e5a252351f12cd8c3d`
- `evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-t04-canonical-host-v52-current-global-renderer.mp4`
  - `b2512fd2c5b50426c510299faa7ba81feea3f1abd83bfb04eb5821ab9a3d0421`
- `evidence/vfx-placeable-post-debt-2026-07-14/post-debt-plc-t04-canonical-host-v52-current-global-renderer.frame.json`
  - `3986227d28dad8a3415491921b5f7efb4394d0a0043d33dddcac7a1686f6f573`

## Saved-NWN comparison

The saved retail oracle was reused without another NWN launch:

- `artifacts/source-mdl-emitter-oracle/retail-source-mdl-emitter-plc-t04-ovens-removed.mp4`
  - `1599bd2d42a4f9dfd1a3806332b5939ef4cedb6cb5700572298d254bf65f27c8`

Diagnostic comparison:

- `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-left-vs-aurora-web-right-plc_t04-v52-current-global-renderer-diagnostic-20260720.mp4`
  - `4eb6c27606469ebd5db1e8a15e8f8ae66e94ddacca8ae97a79b512f1230fb509`
- `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-left-vs-aurora-web-right-plc_t04-v52-current-global-renderer-diagnostic-t5-20260720.png`
  - `c6ff61f0130191c61ec2ab136042d4960effae2cc64d27a6c1aa163eaef4d4bf`

Visible review:

- both sides retain the dark static center authored by the source placeable;
- the Web plume is brighter, paler, softer, and less integrated with the
  receiver scene;
- the context mismatch prevents attributing those differences solely to the
  particle renderer.

The comparison is diagnostic-only and cannot be promoted to matched parity.

## Next source-backed closure order

1. Rebuild the Web proof context around the source bakery geometry, matched
   target scale, saved-area lighting, and the closest source-backed camera.
2. Reuse the same saved NWN MP4 and publish raw plus context-normalized
   comparisons; do not rerecord or retrigger NWN.
3. If the plume still differs under the matched context, audit the remaining
   framebuffer and emitter-family semantics before changing code.
4. Recapture representative effects from each VFX family after a global
   correction. Do not infer broad parity from one passing effect.

