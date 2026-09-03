# VFX row 210 Lightning / Type 7 runtime audit

Date: 2026-07-19

Scope: `visualeffects.2da#210` (`VFX_BEAM_FIRE`) and its
`progfx.2da#601` Type 7 owner.

Status: source-backed Lightning and the retail-model attachment profile are
implemented. The accepted v2 Web proof is compared with the saved NWN oracle
and is `matched-with-gaps`; visual parity is not claimed.

## Source policy

- Aurora-first: yes.
- Primary implementation evidence: Aurora Toolset decompilation, retail client
  decompilation, retail KEY/BIF resources, and the saved single-trigger NWN
  recording.
- xoreos used: no.
- NWN or Toolset launched for this audit: no.

## Retail source contract

The checked source manifest is
`evidence/vfx-nwn-broad-proof-2026-07-16/row210/source-manifest.json`.

- `visualeffects.2da#210`: `VFX_BEAM_FIRE`, `Type_FD=B`,
  `ProgFX_Duration=601`.
- `progfx.2da#601`: Type `7`, model `vim_rayfire`, start animation
  `cast01`.
- `vim_rayfire.mdl` SHA-256:
  `88a338e61c6dae67e43a02cb6aa4bd2395532487b680252964e9d2ca4d04fba8`.
- Source emitter graph:
  - `OmenEmitter03`: `Lightning`, `Linked`, `Lighten`, `fxpa_white`,
    evaluated point-count slot `3`, `sizeStart=sizeEnd=0.05`,
    binary controllers `208=0`, `212=0`, `216=0`.
  - `handbal`: `Fountain`, `Normal`, `Lighten`, `fxpa_flare`,
    `birthrate=100`, `lifeExp=0.5`, `sizeStart=0.5`, `sizeEnd=0`.
  - `OmenEmitter04`: `Lightning`, `Linked`, `Lighten`, `fxpa_white`,
    evaluated point-count slot `65`, `sizeStart=sizeEnd=0.01`,
    binary controllers `208=0`, `212=0.04`, `216=0.1`, corresponding to
    `lightningDelay`, `lightningRadius`, and `lightningScale`.
- Both Lightning emitters own a direct child reference at approximately
  source-local `Y=5.99712`.

## Aurora Lightning runtime evidence

The relevant Toolset decompilation is
`C:\Projects\New Folder\export\decompiled_all.c`.

- Lines `857546-858085` reconcile the active/free point lists to the evaluated
  slot at emitter offset `+0x58`.
- A zero evaluated point count or missing target pointer at runtime offset
  `+0x194` clears active points.
- The first active point is the evaluated source position and the last active
  point is the evaluated reference/target position.
- During the `lightningDelay` window, cached points are transformed from the
  previous source-target frame instead of being regenerated.
- After the delay expires, Aurora rebuilds intermediate points. The independent
  `lightningRadius` midpoint pass is recovered at lines `855229-855305`;
  `lightningScale` contributes a separate signed orthogonal jitter pass.
- The model's `birthrate` slot is therefore a point count for Lightning, not a
  Fountain particles-per-second rate.

These facts are represented by `syncLightningTargetParticles()` in
`backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts`. The binary MDL
parser now preserves all three Lightning controllers `0xD0/0xD4/0xD8`; the
previous parser preserved only `0xD8` and silently dropped the retail
`lightningRadius=0.04` midpoint amplitude.

## Aurora Type 7 attachment evidence

The retail client anchors were previously recovered for the same Type 7 beam
family and recorded in
`evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row216-reattach-rotationarc-pfh0-camera-anchor-calibrated-20260716-audit.json`:

- beam attach: `nwmain-linux:0x815a70`;
- `ReattachReference`: `nwmain-linux:0x43fc50`;
- rotation arc: `nwmain-linux:0x5b7070`;
- model-part lookup: `nwmain-linux:0x43c5b0`;
- linked render: `nwmain-linux:0x4ad4c0/0x4af4a0`.

Type 7 attaches the live beam model to the source and target model parts,
reattaches the beam references to the target, and rotates the beam root from
its current world Z direction toward target minus source. The row-only
`targetRef` is not a resolved attachment and must not synthesize a target
position.

The saved broad proof uses the same capture module, source character, target
creature, three-metre object separation, and `BODY_NODE_CHEST` request as the
already source-backed Type 7 attachment profile:

- source object position `(9.5, 3.8, 0)`;
- target object position `(9.5, 6.8, 0)`;
- normalized Web object positions `(0, 0, 0)` and `(0, 3, 0)`;
- source model `pfh0`, resolved from the captured BIC;
- target model `c_yinnkeep`;
- source and target attachment nodes resolved from their retail model graphs,
  not object origins.

## Retail visual oracle

Accepted NWN media:

- `row210/nwn/nwn-row210-one-trigger.mp4`;
- SHA-256
  `808fe520f277c490d3bf723562c7e3fc38f5d2b25323a79bef557ce8dec05a6c`;
- exactly one trigger;
- requested duration `20.0` seconds;
- validated visible interval and post state.

The oracle visibly contains:

- a broad orange linked layer;
- a narrower bright moving Lightning layer;
- a source flare/particle cluster;
- source and target attachment at the two actor bodies;
- continuous motion throughout the temporary effect.

The recording does not expose the engine's exact RNG seed. Deterministic Web
proof seeds remain replay metadata, not a retail seed claim.

## Implemented state

The product Lightning scheduler, linked draw lane, Type 7 attachment resolver,
rotation-arc root transform, and retail-model `effectBeamAttachment` are active
for `row210`. The regenerated fixture preserves:

- `OmenEmitter03`: 3 active points and 2 linked segments;
- `OmenEmitter04`: 65 active points and 64 linked segments;
- `OmenEmitter04.lightningRadius=0.04`;
- `handbal`: visible source particles.

The fixed-time diagnostic
`row210/aurora-web/preflight/aurora-web-row210-lightning-radius-retail-camera-t2-diagnostic-20260719.png`
shows the recovered midpoint zigzag. Its frontend build identity is
`02b4a79693a6747fdeb9f792405de027390494c6-dirty-42ddd3d52a257574`;
runtime observability reports a passing host graph, settled assets, passing
draw ledger, one trigger, no loop, zero overlap, and an empty proof blocker
manifest.

This fixed-time frame is diagnostic evidence, not the accepted proof. The old
Web recording predates the correction and observability contract.

The accepted current Web proof is:

- `row210/aurora-web/aurora-web-row210-one-trigger-lightning-radius-post-duration-observability-v2-20260719.mp4`;
- SHA-256
  `e2f31f41878defeb1844e751f9a762c0403198d9802c3470f41adbd236e1f578`;
- deterministic `690`-frame capture at `30` fps over `23.0` seconds;
- one trigger, `loop=false`, `overlapCount=0`, and requested duration
  `20.0` seconds;
- identified frontend and backend builds, passing canonical host graph,
  settled assets, passing draw ledger, and an empty blocker manifest;
- terminal `phase=post`, `drawParticles=0`, `visibleFrameCount=0`, and
  `postDurationHidden=true`;
- debug overlay disabled in the final proof profile.

The onset-aligned comparison reuses the saved NWN MP4 without launching or
recording NWN:

- `comparisons/nwn-vs-aurora-web-row210-lightning-radius-post-duration-onset-aligned-v2-20260719.mp4`;
- `comparisons/nwn-vs-aurora-web-row210-lightning-radius-post-duration-onset-aligned-v2-20260719-contact-sheet.png`;
- `comparisons/row210-lightning-radius-post-duration-onset-aligned-v2-20260719.json`.

The comparison confirms the one-trigger lifecycle, twenty-second duration,
clean post state, source flare, broad linked layer, narrow Lightning layer, and
midpoint displacement. Open visual gaps remain: the Web source flare is larger,
rounder, and more saturated; its broad orange layer is thinner; the fixture
lacks retail actors, room geometry, occlusion, and the exact retail camera; and
material, bloom, postprocess, and retail RNG parity remain unproved.

## 2026-08-13 current-runtime re-audit

The row210 fixture was regenerated from the current shared runtime after the
Type 7 live-host work. No NWN or Toolset process was launched and the saved NWN
oracle was not replayed. The guarded fixed-time Web capture is:

- `row210/aurora-web/preflight/vfx-broad-row210-time-2-current-type7-host-20260813.png`;
- SHA-256
  `77ac3a20f11e45d5803e85cc34d0d469783ee717f14138a903ae7f93de2f703a`;
- `frameIndex=16/161`, `drawParticles=99`, three emitter meshes;
- runtime identity ready, canonical host graph pass, assets settled, draw and
  particle-shader ledgers pass, and an empty proof blocker manifest;
- no playback hook was called by the static capture harness.

The durable static comparison is
`row210/comparison/nwn-vs-aurora-web-row210-static-current-type7-host-20260813.png`
with SHA-256
`721ef5b42108daecced412c9bf250e3113c87c3a3babf387f363e04cef6f3ac3`.
It uses `row210/nwn/validated-steady.png` from the already saved one-trigger
NWN packet; it is not a new NWN run.

The primary decompilation was re-read at `FUN_00a2db4c`,
`decompiled_all.c:855229-855305`, and the Lightning update call site,
`decompiled_all.c:857594-857873`. The implementation preserves all visible
source-backed parts of that route:

- evaluated point-list reconciliation and target-required clearing;
- delay-window reprojection of cached points;
- source rectangle and target endpoint writes;
- normalized source-to-target axis, Aurora's `(-y,z,-x)` first transverse
  basis, and the cross-product second basis;
- recursive midpoint order, including the native distance-zero calls;
- sign draw before magnitude draw for both midpoint axes and the later
  `lightningScale` pass;
- source-scale multiplication and the independent radius and scale amplitudes.

A fixed ROI measurement, used only as a review aid and not as pixel-parity
evidence, gives a median bright-path width divided by path length of `0.0321`
for the saved NWN frame and `0.0352` for current Web. The narrower white lane
measures `0.0245` versus `0.0208`. These values do not support changing the
shared Lightning geometry from the current Aurora source contract.

Conclusion: no missing row210 Lightning runtime branch was found and no
image-tuned implementation change is authorized. The remaining visible gap is
comparison context: Web has no source/target actors, room, actor occlusion, or
matched retail camera. The current frame therefore remains diagnostic-only,
not a parity claim. A future proof may close that gap by supplying the exact
actor/scene/camera contract; it must not compensate by changing Lightning
radius, scale, point count, flare lifetime, or linked width.

## Implementation contract

1. Reuse the retail-model Type 7 attachment profile for both `row210` and
   `row216`.
2. Preserve source row/model/texture hashes and exact emitter graph.
3. At a settled runtime frame, require:
   - `OmenEmitter03`: 3 active points, 2 linked segment draw records;
   - `OmenEmitter04`: 65 active points, 64 linked segment draw records;
   - `handbal`: visible source particles;
   - both Lightning lanes: `linked_textured_quad`;
   - source and target node paths and model hashes in attachment telemetry.
4. Keep one Web playback, no loop, no overlap, and one saved comparison against
   the existing NWN MP4.
5. Do not claim pixel parity. Remaining camera, host-actor occlusion, scene,
   bloom/material, and retail RNG differences must stay explicit.
