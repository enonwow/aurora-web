# VFX Broad Proof Matrix

## Purpose

This matrix selects ten retail fixtures that exercise materially different
Aurora VFX paths. It is an implementation and proof queue, not a claim that
all ten cases already have parity evidence.

The 2026-07-16 proof round is now complete for all ten selected fixtures. The
result is `comparison-ready-open-parity-gaps`, not a visual-parity promotion.
The canonical current packet is
`evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/broad-nwn-vs-aurora-web-comparison-manifest-pixel-aligned-v3.json`.

The execution rules are defined by
`vfx-proof-standard-2026-07-13.md`. In particular, fire-and-forget effects are
triggered exactly once, duration values are identical in NWN and Aurora Web,
and an Aurora Web result without a visible NWN/Aurora reference remains
diagnostic-only.

## Selected fixtures

| # | Retail fixture | Category and coverage | Lifecycle contract | Current oracle state |
| --- | --- | --- | --- | --- |
| 1 | `visualeffects.2da#68` `VFX_IMP_HEALING_M`, `vim_heal04` | Control impact: Fountain, Motion Blur, normal billboards, atlas textures, and source light | Fire-and-forget, one trigger | Reuse `nwn-row68-one-trigger.mp4`; current NWN/Web comparison exists. Never rerun NWN for crops or revised analysis. |
| 2 | `visualeffects.2da#44` `VFX_IMP_ACID_S`, `vim_explacid` | Axis-sensitive impact: Motion Blur, `Aligned_to_Particle_Dir`, Fountain, and reflected orientation/culling | Fire-and-forget, one trigger | Saved NWN MP4 reused. The 2026-07-19 v5 Web proof dispatches both `t=0` Explosion events, renders all three emitters, and includes the source-backed target actor with scripted facing. The 60 fps timeline-normalized comparison is `matched-with-gaps`, not parity. |
| 3 | `visualeffects.2da#50` `VFX_IMP_DEATH`, `vim_negdeath` | Mixed impact: Explosion plus Fountain, normal and additive blending, Motion Blur, gravity, source light, and `Imp_Impact_Node` actor attachment | Fire-and-forget, one trigger | Saved NWN MP4 reused without rerun. Accepted Web v3 has 315 deterministic frames at 30 fps, one trigger, no loop/overlap, passing observability gates, clean post state, and stable attachment to the source-backed actor `Impact` node. The onset-aligned comparison is `matched-with-gaps`, not parity; v2 is explicitly rejected. |
| 4 | `visualeffects.2da#22` `VFX_FNF_FIREBALL`, `vff_explfire` | Area/FNF event: Explosion, Fountain, `detonate`, world-Z ring, Motion Blur, source light, and Chunk model `fx_rockchunksml` | Fire-and-forget, one trigger | Reuse `nwn-row22-one-trigger.mp4`. Current packet remains diagnostic until camera, scene, scale, and current Web output are matched; do not rerun NWN. |
| 5 | `visualeffects.2da#210` `VFX_BEAM_FIRE`, `progfx.2da#601`, `vim_rayfire` | Targeted beam: `EffectBeam`, two Lightning/Linked emitters, source and target anchors, and body-node attachment | Temporary duration `20.0 s` in both runtimes | Saved NWN MP4 reused without rerun. Accepted Web v2 has 690 deterministic frames at 30 fps, one trigger, no loop/overlap, `postDurationHidden=true`, and an empty proof blocker manifest. The onset-aligned NWN/Web comparison is `matched-with-gaps`, not parity. |
| 6 | `visualeffects.2da#216` `VFX_BEAM_FIRE_LASH`, `progfx.2da#607`, `vim_lashfire` | P2P beam: Linked Fountain strips, P2P target mapping, gravity, source/target anchors, and ordinary billboards | Temporary duration `20.0 s` in both runtimes | Valid NWN MP4 saved under `evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn`; one trigger, exact `20.0 s` input, expected-end marker, and wall-clock timeline. |
| 7 | `visualeffects.2da#181` `VFX_IMP_MIRV`, `progfx.2da#900`, `vpr_magmisl` | ProgFX projectile/MIRV: Type `P`, Type 10 scheduler, projectile model, trail emitters, and projectile light | Fire-and-forget native MIRV invocation, one trigger | Saved approved NWN recapture reused without rerun. Direct retail-client disassembly proves the path-4 owner formula and a `625 ms` duration at the exact `3 m` Web fixture distance. The current Web packet has one trigger, no loop/overlap, passing technical observability gates, and a clean post state, but its own visual readiness is `diagnostic-only` with camera, scene, and owner-target blockers. The attempted endpoint-aligned v3 is rejected because NWN `lastVisibleVideoSeconds` is a global pixel threshold, not an owner endpoint PTS. Current v4 is a threshold-visible diagnostic only; temporal, endpoint, and pixel parity remain unproven. The first module-context MP4 remains invalid evidence. |
| 8 | `visualeffects.2da#1` `VFX_DUR_DARKNESS`, `vdr_darkness` | Object duration: Single scheduler, `Billboard_to_World_Z`, normal blend, attachment lifecycle, and negative source light | Temporary duration `20.0 s` in both runtimes | Valid NWN MP4 saved under `evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn`; start, steady state, removal, fade, and post baseline are present. |
| 9 | `vfx_persistent.2da#0` `VFX_PER_FOGACID`, `vps_fogacid` | Persistent AOE: footprint ownership, repeated model instances, normal alpha fog, world-Z billboards, heartbeat lifecycle, and area bounds | Temporary AOE duration `20.0 s` in both runtimes | Valid native-AOE NWN MP4 saved under `evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn`; one trigger, exact `20.0 s` input, expected-end marker, and post baseline. |
| 10 | Placeable `plc_t04` | Full placeable composition: two static meshes, two Fountain emitters, Normal render modes, Lighten and Normal blends, two 4x4 atlases, and `on/off` animations; source contains no light node | Placeable, one declared animation/state transition | Reuse the admitted retail reference packet when hashes and context match. Existing Web material is historical after renderer changes; capture a fresh current Web result without replaying NWN. |

## Why these ten

The set deliberately avoids spending slots on color-only variants. Together it
covers all four `visualeffects.2da` families used here (`F`, `D`, `B`, and `P`),
the persistent-AOE table, and a placeable-hosted source model. It also covers
Fountain, Explosion, Single, Lightning, Linked, P2P, Motion Blur, world-Z and
particle-direction alignment, Chunk geometry, source lights, negative lights,
atlas playback, target/body-node attachment, duration removal, and full static
model composition.

## Aurora-first execution order

For every fixture that lacks a complete packet:

1. Admit and hash the retail `2da`, MDL, texture/TXI/MTR, and owner context.
2. Audit the corresponding Aurora/decompilation behavior and write the expected
   parser, scheduler, transform, material, light, and lifecycle contract.
3. Bring implementation and deterministic tests to that source contract.
4. Prepare one clean NWN module/scene and a trigger ledger. Do not launch the
   effect until capture readiness is verified.
5. Record one NWN MP4 with one trigger, or reuse the saved MP4 listed above.
6. Record the current Aurora Web result under the matched fixture contract.
7. Publish synchronized MP4/frame comparisons and list every remaining visual
   difference. Web-only material stays diagnostic-only.

## Current proof result

- Aurora Web validation: `evidence/vfx-nwn-broad-proof-2026-07-16/aurora-web-proof-validation.json`; ten fixtures valid.
- Full comparison set: `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-10-fixture-full-set-pixel-aligned-v3.mp4`.
- Comparison overview: `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-10-fixture-overview-pixel-aligned-v3.mp4`.
- Comparison contact sheet: `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-10-fixture-contact-sheet-pixel-aligned-v3.png`.
- Per-fixture findings: `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/README-pixel-aligned-v3.md`.
- All saved NWN/Aurora oracles were reused without rerunning NWN.
- All nine Web VFX captures have one playback, no loop, no overlap, and no diagnostic geometry.
- The fresh `plc_t04` v44 capture is a persistent-placeable lifecycle, with three source instances and no repeated fire-and-forget trigger.
- Duration fixtures `row210`, `row216`, `row1`, and `aoe0` preserve the exact 20-second effect contract plus proof margins.
- Final synchronization uses the first pixel-visible frame in each encoded Web MP4; it does not assume requested capture fps equals encoded fps.
- The current row210 proof is
  `row210/aurora-web/aurora-web-row210-one-trigger-lightning-radius-post-duration-observability-v2-20260719.mp4`.
  Its accepted comparison is
  `comparisons/nwn-vs-aurora-web-row210-lightning-radius-post-duration-onset-aligned-v2-20260719.mp4`;
  v1 is retained as rejected historical telemetry.

## Row22 current repair proof - 2026-07-18

- The latest Web proof is
  `evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v61.mp4`.
- It is a deterministic 187-frame capture at 12 fps, exactly one trigger, no
  loop, no overlap and diagnostics disabled. Monotonic `renderAt(n / 12)`
  capture reaches runtime frame `300/300`, zero particles, and clean post-roll
  without wall-clock slowdown changing proof time.
- The saved NWN oracle
  `evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4` was reused; NWN was
  not launched or recorded again.
- The lifecycle-aligned comparison is
  `evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v61-source-scene-onset-aligned.mp4`.
- The still comparison
  `evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v61.png`
  uses exact onset-relative pairs at `t+0.00`, `t+0.25`, and `t+0.75`;
  independently selected last-visible frames are not synchronized proof.
- Fixed globally: Chunk model textures use glTF `flipY=false`; billboard
  textures are unchanged. The MDL-to-GLB converter already applies the
  Aurora-to-Three vertex conversion, so the proof scene applies no second
  model transform.
- Fixed globally: a child emitter without an Aurora inherit flag evaluates
  from its owner's birth-world history. `smoke04` is the original emitter in
  `fx_rockchunksml.mdl`; only Web's former transform behavior was wrong.
- Fixed globally: normal non-custom particles convert Aurora packed-gamma
  color to the linear scene lane, while raw additive particles retain source
  values. Atlas checkpoints advance at most one native step and discard
  overshoot, preventing MainExplode from wrapping frame 15 to a late frame 0.
- The v61 Web saturated span is `1.000 s`, improved from v60 `1.167 s`, but
  remains `+0.417 s` longer than the saved NWN span of `0.583 s`.
- Source-backed non-fix: the Chunk template is not scaled by emitter particle
  size because native Toolset assembly passes only model position and
  orientation to the Chunk instance.
- Source-backed proof scene: four exact floor/rug receivers, 14 exact source
  textures, and saved-ARE global moon ambient/diffuse lighting.
- Collision evidence: 1200 WOK queries, 185 applied hits, 1015 native no-hits,
  and all eight Chunk particles landed.
- Open: exact camera pose, owner/target creatures, tile-local lights, and
  retail wall/ceiling fade, plus the remaining bright tail at `t+0.75`.
  The comparison remains diagnostic-only and must not be promoted to parity.

## Row44 target actor and capture-timeline proof - 2026-07-19

- Primary script evidence in `vb44shot.nss` proves that the target faces the
  source immediately before the single impact call. The proof fixture maps
  Aurora forward `(0, -1)` to the positive-Z front of direct model
  `c_yinnkeep`, with supermodel `a_ba` and animation `pause1`.
- The fresh Web v5 capture has one trigger, no loop, zero overlap, diagnostics
  disabled, one source-backed target actor, and passing identity, host-graph,
  asset-settlement, draw-ledger, playback-guard, and proof-gate reports.
- The saved NWN MP4 was reused without launching NWN. The current comparison is
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row44-exact-base-scene-target-actor-visible-onset-aligned-v5-20260719.mp4`.
- The accepted raw Web MP4 contains deterministic 60 Hz render steps in an
  approximately 32.36 fps container. The comparison uses a separately hashed,
  frame-order-preserving 60 fps derivative; no runtime was replayed.
- Timeline correction removes the false long-tail finding. Remaining visible
  gaps are the oversized and overbright Web burst, the broader and more
  circular late cloud, incomplete source room coverage, omitted source/player,
  local-light parity, and exact camera parity.

## Row210 Lightning-radius repair proof - 2026-07-19

- Aurora-first binary inspection recovered
  `OmenEmitter04.lightningRadius=0.04` from controller `0xD4` in the retail
  `vim_rayfire.mdl`; the binary parser previously preserved only
  `lightningScale` at `0xD8`.
- The parser now preserves Lightning controllers `0xD0/0xD4/0xD8` as
  `lightningDelay`, `lightningRadius`, and `lightningScale`.
- The accepted fresh Web proof is
  `evidence/vfx-nwn-broad-proof-2026-07-16/row210/aurora-web/aurora-web-row210-one-trigger-lightning-radius-post-duration-observability-v2-20260719.mp4`.
- It has 690 deterministic frames at 30 fps, one trigger, no loop, zero
  overlap, a two-second baseline, the exact twenty-second effect duration,
  terminal `postDurationHidden=true`, and a clean post state with zero drawn
  particles and zero visible frames.
- The saved NWN MP4 was reused without launching NWN. The onset-aligned
  comparison and manifest are
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row210-lightning-radius-post-duration-onset-aligned-v2-20260719.mp4`
  and
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row210-lightning-radius-post-duration-onset-aligned-v2-20260719.json`.
- Remaining gaps are source-flare saturation/shape, broad linked-layer width,
  the absent retail actor/room scene, and material/bloom/postprocess parity.

## Row210 post-duration observability reconciliation - 2026-07-19

The saved Web frame `row210/aurora-web/aurora-web-row210-one-trigger-native-lightning-radius-observability-v1-20260719.frame.json` is retained as historical evidence but is rejected by the revised local observability gate. Its final comparison sample was visibly clean (`drawParticles=0`, `visibleFrameCount=0`) while it reported `completed=true` and `postDurationHidden=false`. The report did not consistently describe the runner's post state. The accepted v2 replacement records `postDurationHidden=true`, passes the complete observability gate, and is indexed by the v2 comparison manifest above. The saved NWN oracle remains unchanged and was not rerun.

## Row44 animation-origin Explosion repair proof - 2026-07-19

- Aurora-first audit:
  `vfx-animation-origin-event-boundary-audit-2026-07-19.md`.
- The shared selected-animation scanner retains the recovered normal forward
  interval `(previous,current]` and now marks only the first playback interval
  as including animation time zero. Duplicate model-header callbacks remain
  duplicate trace entries while each Explosion consumes one latch.
- The row-44 retail model contains two `event 0 detonate` rows and two
  Explosion emitters. Before this repair, `sparks` and `acid` both peaked at
  zero particles; the regenerated fixture peaks at `30` and `50`.
- The proof fixture uses a `1/60 s` simulation step because both Explosion
  emitters have `lifeExp=0.1 s`. Regression also requires a non-zero
  previous/current Motion Blur segment and positive post-start acid size.
- The accepted Web proof is
  `evidence/vfx-nwn-broad-proof-2026-07-16/row44/aurora-web/aurora-web-row44-one-trigger-animation-origin-60fps-observability-v2-20260719.mp4`.
  Runtime identity, host graph, five assets, 82 draw-ledger records,
  single-playback guard, post-duration hiding, and proof gate all pass.
- The saved NWN oracle was reused without launching NWN. The corrected
  first-visible-frame comparison and manifest are
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row44-animation-origin-60fps-visible-onset-aligned-v3-20260719.mp4`
  and
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row44-animation-origin-60fps-visible-onset-aligned-v3-20260719.json`.
- Remaining gaps are the overexposed and symmetric early Web starburst, the
  missing retail actor/room occlusion and environmental receivers, the
  unresolved sub-frame burst-to-cloud transition, bloom/material response,
  camera, footprint, and lifecycle-tail timing. Status remains
  `matched-with-gaps`; no pixel-parity claim is made.

## Post-proof implementation queue

1. Close the remaining `row1` scene, camera, creature-receiver, local-light,
   textured-footprint versus negative-light reach, and material/postprocess
   gaps. Integer timer truncation, same-frame removal/update order, no
   overshoot carry, and the `23.625 s` post-removal boundary are now
   implemented and covered by a fresh observability-gated single-playback
   proof. The signed-ambient pixel response remains outside the permitted
   implementation boundary.
2. Bring `row210` source-flare saturation/shape, broad linked-layer width, and
   material/bloom response to retail while adding the exact actor/room proof
   scene. Native Lightning radius, attachment, phase motion, and duration are
   now source-backed and freshly proven.
3. Close scale, bloom, footprint, scene/occlusion, burst-to-cloud timing, and
   decay gaps in `row68`, `row44`, `row50`, and `row22`. Row44 animation-origin
   dispatch and 60 fps short-lifetime proof sampling are now fixed globally.
   Row50's `Imp_Impact_Node` position is now resolved through the reusable
   object-attachment adapter; its bloom, phase cadence, shape, and late
   souldust tail remain open.
4. Bring `plc_t04` flame plume width and luminance closer to the saved retail oracle while preserving the full static placeable composition.
5. Close the remaining scene, anchor, lighting, and material gaps for `row216`; its native phase owner and full-3D smooth lash geometry are implemented.
6. Close the remaining shared particle silhouette, alpha/HDR, source-light, bloom, exact-camera, source-player, and hash-bound temporal-observation gaps for `row181`; its native Type 10 path-4 formula and `625 ms` three-metre Web fixture result are source-closed and must not be retuned from visibility thresholds.
7. Close exact retail RNG, walkmesh grounding, sound, scene/occlusion, and material gaps for `aoe0`; its 20-owner footprint, density, scheduling, and phase motion are implemented and have a fresh single-playback comparison.
