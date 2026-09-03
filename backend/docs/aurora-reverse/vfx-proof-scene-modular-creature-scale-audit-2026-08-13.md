# VFX proof-scene modular creature scale audit (2026-08-13)

## Scope and pre-flight classification

- Scope: the row 216 exact-BIC source actor rendered at about half the retail
  actor height after the shared Type 7 camera correction.
- Aurora semantic classification: source model units and proof-scene actor
  presentation are relevant, so this is an Aurora-first task.
- Primary evidence: the saved row 216 retail/NWN capture, exact BIC and ordered
  HAK lineage, the exact `pfh0` and `c_yinnkeep` model graphs, and the existing
  decompilation-backed Area model-space contract.
- xoreos was not used.

## Evidence

1. The fresh row 216 Web preflight reported source actor bounds
   `0.345563 x 0.966171 x 0.339055`, while the direct target actor was restored
   to its source-model height `1.9428`.
2. The shared catalog preview normalization target is
   `objectRadius * PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR`, or
   `0.24 * 4 = 0.96` for this hidden actor runtime. The measured modular actor
   height is therefore the catalog-normalized preview size, not an Aurora
   creature scale.
3. `NwnVfxProofSceneActorLoader` invoked the production object renderer with
   `renderAreaGeometry=false`. That selects the normalized catalog branch for
   both direct and part-based models.
4. The direct `c_yinnkeep` actor concealed the error because its immutable
   source-model height (`1.9428`) was applied after loading. The exact modular
   BIC actor has no single direct geometry model from which to copy that field,
   so it retained the synthetic `0.96` preview normalization.
5. The row 216 exact host graphs place the animated source `Impact` at about
   `z=1.2716` and target `Impact` at about `z=1.4343`. This independently rules
   out a retail semantic in which the source adult human is intentionally a
   `0.96`-high actor.
6. A rejected diagnostic candidate switched the hidden actor renderer to
   `renderAreaGeometry=true`. All observability gates passed, but the source
   actor height became `0.185938`. This proves that the Area tile-space scale is
   also the wrong presentation domain for the comparison scene.
7. The comparison scene and its camera express the saved source-to-target
   distance as `3` world units for the retail three-metre separation. Actor
   source models therefore need their source-model units preserved: neither
   catalog normalization nor the Area tile-space conversion belongs here.

## Resolution

- The shared object renderer now accepts an explicit creature-only
  `source-model-units` presentation mode. Its default behavior is unchanged.
- Every VFX proof-scene actor selects this mode while retaining
  `renderAreaGeometry=false`, so model geometry bypasses both catalog
  normalization and Area tile-space scaling.
- An explicit immutable `sourceBoundsHeight` remains a post-load correction
  only when the exact source model provides that evidence.
- No row-specific multiplier and no VFX emitter tuning were added.

## Diagnostics and acceptance

Actor roots expose:

- `auroraVfxProofSceneActorRendererSpace=source-model-units`;
- `auroraVfxProofSceneActorBoundsScaleMode=immutable-source-bounds-height` for
  an exact direct-model bounds override, or
  `source-model-units` for source-scaled modular actors.

## Accepted proof result

The fresh static preflight and the only admitted Web playback both pass every
runtime observability gate. The accepted source-model-unit actor bounds are:

- exact BIC modular source (`pfh0`):
  `0.6650314598 x 1.8593826232 x 0.6525071678`;
- exact GIT target (`c_yinnkeep`):
  `0.8497455824 x 1.9428 x 0.6911406933`.

This closes the synthetic actor-scale defect. It does not claim that the two
different authored creature models have identical bounds.

Accepted artifacts:

- static preflight:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/preflight/vfx-broad-row216-time-2-modular-actor-source-model-units-20260813.png`;
- one-trigger Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/aurora-web-row216-one-trigger-source-model-units-native-camera-20260813.mp4`,
  SHA-256
  `c8c16f5dd3c457db18054f9dad70b509659ab856c22736b057a5c9b8d9665b04`;
- reused NWN oracle MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/nwn-row216-one-trigger.mp4`,
  SHA-256
  `0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67`;
- onset-aligned comparison:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/comparison/nwn-vs-aurora-web-row216-source-model-units-native-camera-onset-aligned-20260813.mp4`,
  SHA-256
  `2aebbe68a6b4fa15049801d4e17b09e4643e4a784ca0486c5e0b1be7f8c622bf`;
- immutable comparison manifest:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/comparison/nwn-vs-aurora-web-row216-source-model-units-native-camera-onset-aligned-20260813.json`,
  SHA-256
  `f7d75a2046246963ffc6faba677be3a079c1b31ae4e0e1aa09ceb3793f04304d`.

The Web playback has `triggerCount=1`, `loop=false`, `overlapCount=0`, an
exact requested duration of 20 seconds, a 24-second capture window, and a
clean post-duration frame. NWN was not launched or recaptured.

## Remaining visual gap

The paired contact sheet confirms that source and target actors now occupy
comparable world and projected scales, and that the two authored lash strands
retain their asymmetric vertical ordering without mirroring. The Web additive
envelope remains broader and more laterally circular than the tighter,
vertically elongated NWN envelope. Scene materials, actor animation phase and
occlusion, and environmental light spill also remain visibly different. Those
differences remain open and must be resolved from Aurora evidence before any
further particle or material correction.
