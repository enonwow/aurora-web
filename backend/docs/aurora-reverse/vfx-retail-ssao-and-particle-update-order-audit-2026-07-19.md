# VFX retail SSAO and particle update-order audit

Date: 2026-07-19

Status: primary-source audit complete; no implementation change justified by
this slice

## Scope

This Aurora-first audit separates two shared-runtime hypotheses from the
remaining visual gaps in the fresh row-50 comparison:

- whether Aurora advances newly spawned particles in their birth tick;
- whether missing retail SSAO can explain the oversized Web flash or the short
  Web particle column.

The saved approved NWN MP4 was reused for visual context. NWN and Toolset were
not launched. xoreos was not used.

## Particle update order

Primary source:
`C:\Projects\New Folder\export\decompiled_all.c`.

- Fountain tick `FUN_00a31288` calls shared lifetime update
  `FUN_00a2d9c4` at `decompiled_all.c:856959`.
- It then updates Motion Blur history and active-particle rotation at
  `decompiled_all.c:856961-856997`.
- The installed active-particle updater is called at
  `decompiled_all.c:856998`.
- Fountain allocation/reset follows later at
  `decompiled_all.c:857003-857128`.
- Explosion tick `FUN_00a31ca4` follows the same class order:
  lifetime update at `decompiled_all.c:857180`, existing-particle work at
  `decompiled_all.c:857181-857225`, and burst allocation/reset at
  `decompiled_all.c:857226-857263`.

Conclusion: Aurora updates particles that were active at tick entry before it
allocates the current tick's Fountain or Explosion particles. A newly reset
particle remains at its spawn state until the next tick. Aurora Web already
uses this order in
`backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts`.
Changing to spawn-before-update would be a regression and cannot be used to
shrink or reshape the current proof.

Aurora stores the runtime values in 32-bit float fields. Web already applies
float32 handling to the source-backed Fountain interval/accumulator path. Any
remaining JavaScript double precision in particle kinematics can cause small
long-tail drift, but it does not account for the first-frame screen-space
flash or the missing tall column.

## Retail SSAO order

Active retail shader resources:

- `fsfbssao`: SHA-256
  `98674a357fea91fbcec331a84eb66e0f60b4bfa3bee4d304560d0116ddb774bf`;
- `inc_postpr_ssao`: SHA-256
  `944c76f59f7e9bcaaae1d9f66a1f2b83cb57bed116fad2ee4ee06910f3f04671`;
- `vsfbssao`: base fallback, SHA-256
  `f68bed245a280f4e7c34189693c397942dea4a45fea906e5273222cb843a82c1`.

The active profile has `graphics.fbo.ssao.enabled=true`. The active fragment
shader performs an AO sample pass followed by two diagonal blur subvariants.

The symbolic retail `nwmain-linux` binary provides the ordering anchor:

- `Scene::RenderSinglePass()` is at `0x46e5f0`;
- it calls `Camera::DoFrameBufferEffects(0)` at `0x46f470` after the earlier
  opaque-scene stage and before later draw buckets;
- it calls `Camera::DoFrameBufferEffects(1)` at `0x46f189` near the end for
  bloom/postprocess.

Conclusion: SSAO can change receiver depth/contact, floor contrast, and the
scene beneath a VFX. It does not run as a particle-shape operator and therefore
cannot explain the oversized additive/normal particle flash, missing vertical
extent, or family trajectory differences. SSAO remains a scene-parity gap, not
a justified particle fix.

## Remaining causes of repeated visual gaps

The fresh row-50 v13 proof remains `matched-with-gaps`. Repeated differences
across the broad matrix currently come from a stack of shared and
family-specific boundaries:

1. Proof context is not yet camera/scene equivalent. Web uses a calibrated,
   not exact, camera transform and does not reproduce the complete retail area,
   source actor, local lights, or all receiver geometry.
2. Shared renderer parity is incomplete beyond the already corrected active
   shader precedence, RGBA path, normal/additive blend handling, soft depth,
   fog, bloom, and active type-4 color correction.
3. Emitter families still require their own closure packets for Fountain,
   Explosion, Motion Blur, Chunk, Linked/Lightning, P2P, AOE, beam, and
   placeable composition.
4. Retail RNG state is not available. Distribution and control flow can be
   source-correct while individual particle positions differ from a saved
   retail playback.
5. Several ten-fixture overview captures are historical and predate the latest
   global fixes. They remain comparison history, not evidence that every
   current effect has the same old defect.

The next implementation change must be tied to a recovered Aurora semantic or
an admitted retail/Toolset observation. Camera or postprocess calibration must
not be used to conceal a particle-runtime mismatch.
