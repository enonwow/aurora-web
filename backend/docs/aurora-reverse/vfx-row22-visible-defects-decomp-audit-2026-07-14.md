# Row 22 VFX visible-defects and Aurora decomp audit

## Verdict

`VFX_FNF_FIREBALL` (row 22) is **implemented substantially further but still
does not pass visual NWN parity**. The current artifact is
`web-row22-one-trigger-v61.mp4`: exactly one deterministic 12 fps playback,
no loop, no overlap, and no diagnostic capsule or receiver plane. It proves
the current Web runtime/render integration; it does not prove a matched
camera, complete environment, owner/target, or final image.

## 2026-07-18 current proof and follow-up audit

The saved NWN MP4 was reused without rerunning NWN. The current Web recorder
captures 187 monotonic `renderAt(n / 12)` frames after one start call, so a
heavy proof scene cannot stretch or truncate the VFX timeline according to
wall-clock rendering performance. Validation reaches runtime frame `300/300`,
zero active particles, and a clean post-roll.

Current artifacts:

* Web MP4:
  `evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v61.mp4`
* Web validation:
  `evidence/vfx-nwn-web-row22/web/validated-summary-v61.json`
* lifecycle still comparison:
  `evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v61.png`
* onset-aligned video comparison:
  `evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v61-source-scene-onset-aligned.mp4`

The source-backed Web scene now includes the exact four saved-area floor/rug
receivers, 14 exact source textures, and moon ambient/diffuse values decoded
from `enon_test_effect.are`. It intentionally omits owner/target creatures,
tile-local lights, and retail wall/ceiling fade. The exact saved NWN camera
pose is not recovered, so this packet remains
`diagnostic-only-single-playback-open-context-gaps`.

Global implementation findings:

* Chunk model textures are cloned for model binding with `flipY=false`.
  The MDL-to-GLB converter already writes glTF UV orientation as `1-v`;
  particle billboard textures retain their existing source path.
* The MDL-to-GLB converter already applies `C=(x,z,y)` to model vertices.
  Applying another proof-scene transform was disproven and removed.
* `FUN_00a31070` renders a Chunk model at particle position/orientation without
  a second draw-time particle-size multiply. A later exact-instruction
  re-audit of `FUN_00a28a38` at `nwtoolset.exe:0x00a28a68-0x00a28a7a`
  establishes that the sampled particle size is applied uniformly to the live
  model during initialization, before `impact` starts. The Web model lane now
  multiplies template scale by the contract-carried X size for every Chunk.
* `smoke04` is an original child emitter in retail `fx_rockchunksml.mdl`, not
  a Web-only emitter. For a child without `inherit`, `inheritLocal`, or
  `inheritPart`, Web now evaluates each emitted smoke particle from the Chunk
  particle's birth-world transform. Historical smoke no longer follows the
  Chunk's current position.
* Standard non-custom particle vertex colors now convert Aurora's packed-gamma
  bytes to the linear Three scene lane before the retail gamma output pass.
  The source `SRC_ALPHA/ONE` additive lane remains raw, matching its separate
  recovered path.
* Atlas animation now follows the native single-step checkpoint update at
  `decompiled_all.c:856638-856685`: at most one frame advances when the
  checkpoint threshold is crossed, and elapsed overshoot is dropped. The
  row-22 MainExplode terminal particle remains on frame 15 and then expires;
  it no longer wraps to frame 0 as a late flame.
* A completed non-loop playback removes its particle tail instead of freezing
  the final live frame.
* Row 22 now records 1200 source WOK queries, 185 applied hits, 1015 native
  no-hits, and landed Chunk ids 1 through 8.

The synchronized lifecycle comparison still shows a broader/longer saturated
core in Web. The saturated span improved from `1.167 s` in v60 to `1.000 s`
in v61, versus `0.583 s` in the saved NWN recording. The remaining `+0.417 s`
delta is open and the audit does not justify source-incompatible tuning:

* the duplicate `0.033333` callbacks coalesce in the byte latch;
* the distinct `0.133333` callback follows empty ticks and is accepted by the
  recovered `+0xe4` / `+0x198` guard, yielding two active Ring and
  MainExplode particles;
* atlas V coordinates match the recovered native formula
  `v0=1-(row+1)/yGrid`, `v1=1-row/yGrid`;
* source `lifeExp`, atlas FPS, and frame range remain unmodified; only the
  previously incorrect catch-up/checkpoint behavior was repaired.

The remaining visual delta must be reassessed after reconstructing the exact
camera, tile-local lights, subjects, and retail area fade. It is not evidence
for deleting a detonate event, shortening source lifetime, or flipping the
particle atlas.

## Post-fix status

The table below supersedes the v3 implementation observations, without
reclassifying any artifact as visual parity proof:

| Concern | Current source-backed state | Remaining acceptance condition |
| --- | --- | --- |
| Animation callbacks | Model-header events are no longer broadcast as emitter-local rows. `detonate` is dispatched only to Explosion family runtimes and same-tick duplicate rows remain subject to the one-byte native latch. | Compare active count and ring chronology against the saved NWN recording with a matched camera. |
| Chunk material and child model | `fx_rockchunksml` runs its original parsed `smoke04` child runtime per live Chunk particle. Child particles without an inherit flag retain their birth-world transform instead of following the moving Chunk. The exact `fxpa_dirt` texture is bound with glTF `flipY=false`. Row 22 records `1200` WOK queries, `185` applied hits, `1015` native no-hits, and eight landed Chunk ids. | Compare trajectory, count, and contact silhouette under a matched camera and complete retail scene. |
| Atlas and color pipeline | Atlas checkpoints advance one native step and drop overshoot; MainExplode exits on terminal frame 15. Standard packed-gamma vertex colors enter the linear scene lane, while source additive particles retain raw values. | Compare the remaining saturated tail under matched scene lighting before changing any source lifespan, event, or atlas range. |
| Proof-only geometry | v7 uses `diagnostics=0`; neither capsule nor receiver is in the MP4. | Keep proof geometry out of visual comparisons. v6 remains separate receiver-light diagnostic evidence. |
| World-Z basis and diagnostic view | Native mode 2 starts with Aurora's identity X/Y quad. The `aurora-z-up` adapter now maps that quad to Three X/Z, and the diagnostic runner looks down Three Y instead of Three Z. | Recover a signed retail camera pose; the diagnostic top view is not an NWN camera claim. |
| Render modes | Mode 4 retains the recovered camera/world-Z split; mode 5 preserves particle orientation. Mode 6 now uses native camera-plane projection, `2 * sizeX` width, `sizeY / 4` caps, and previous-end alpha. | Validate each mode against a dedicated retail oracle; row 22 alone cannot close modes 0-6. |
| Particle shader | Retail `fsparticle` and `inc_common` are recovered from `base_shaders.bif`; AlphaDiscard uses runtime uniform `fAlphaDiscardValue`, not a literal cutoff. | Recover the runtime uniform write and soft-particle depth path before treating Punch-Through as parity. |

The current visual comparison is
`backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v61.png`.
Its three frame pairs are extracted at the same onset-relative offsets:
`t+0.00`, `t+0.25`, and `t+0.75`.
Its camera is inferred from the saved frame, not a recovered NWN camera matrix.
NWN was not rerun.

The saved v3 NWN/Web comparison visibly contained three independent defects:

| Visible symptom | Finding | Status |
| --- | --- | --- |
| Multiple expanding waves, on a visually wrong plane | The v3 pipeline sent the animation event list to every emitter. Ring then consumed the `0.033333` and `0.133333` latches as separate bursts. The fixed World-Z path and proof camera also differed from the saved NWN camera. | Historical defect; event scope is structurally repaired, visual result still unproven |
| No retail-looking earth chunks | The v3 GLB carried no bound `fxpa_dirt`, did not execute `smoke04`, and had no scene collision context. The white fragments were an untextured preview mesh. | Historical defect; source texture and child runtime repaired, collision/shader parity open |
| Grey rounded rectangle in the middle | This was a proof-harness capsule named `vfx_proof_target_scale_reference`, not an Aurora VFX resource. | Historical defect; disabled by default |

## Evidence scope

This audit reuses the single saved NWN recording. It does not rerun NWN.
Historical v3-v6 artifacts remain evidence of earlier implementations. v7 is
the only current post-debt visual MP4.

* NWN oracle: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4`
* NWN onset still: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger-validated-onset.png`
* Current Web recording: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v7.mp4`
* Current Web validation: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/validated-summary-v7.json`
* Current comparison: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v7.json`
* Current payload: `frontend/public/dev-fixtures/vfx-nwn-web-row22/payload.json`
* Retail MDL source: `vff_explfire.mdl`, parsed from the retail fixture.
* Native source of truth: `C:\Projects\New Folder\export\decompiled_all.c`.

`nwn/summary.json` is retained as a raw invalid-capture manifest: its log byte
offset became stale after rotation and it names unrelated row-68 paths.
`nwn/validated-summary.json` and `nwn/trigger-ledger-reconciled.json` are the
authoritative oracle lineage: they validate the saved MP4, reconcile exactly
one intentional/observed trigger, and retain the single-trigger run marker.
`nwn/preflight.json` also retains an older descriptive source block
(`vim_heal04`/healing) and is not an effect-identity authority. Its recorded
SHA-256 for `nwn/scripts/vfx22shot.nss` matches the retained script, whose
single logged invocation is `EffectVisualEffect(VFX_FNF_FIREBALL)` applied at
the first-PC location. That script, the parsed row-22 source label, and the
reconciled log establish the captured effect identity.

The historical v3 Web peak contains a large grey capsule and white polygonal
fragments that are absent from the NWN still. Current v7 removes that harness
geometry, uses source TGA files, exercises the corrected World-Z and
Motion-Blur paths, and applies the row-22 WOK contacts. It remains evidence of
open gaps rather than a passing visual comparison.

## 1. Ring waves and direction

### Retail source facts

The `Ring` node in `vff_explfire.mdl` is an `Explosion` emitter with:

* `render Billboard_to_World_Z`
* `blend Lighten`
* `texture fxpa_ringwave`
* static `lifeExp 0.4`, `velocity 0`, `spread 0`, `sizeStart 0.5`,
  `sizeEnd 17`, `alphaStart 1`, `alphaEnd 0.1`
* a 2x2 atlas, 12 fps, frames 0 through 3.

The `impact` animation contains `detonate` rows at time 0, twice at
`0.0333333015`, and at `0.1333329976`. The duplicated same-time callback is
not proof of two retail bursts: native Aurora uses a one-byte callback latch.

### Native Aurora behavior recovered from decompilation

* `FUN_00a25c9c` at `decompiled_all.c:852370-852375` writes byte `+0xe4 = 1`
  when the detonate callback fires.
* `FUN_00a31ca4` at `decompiled_all.c:857226-857272` checks that one latch,
  creates its evaluated particle count, then clears `+0xe4`.
* `FUN_00a294ec` at `decompiled_all.c:853807-853951` maps
  `Billboard_to_World_Z` to render mode 2.
* `FUN_00a2e250` from `decompiled_all.c:855862` has a dedicated mode-2
  basis/quaternion path. It is not the same branch as camera-facing or
  emitter-oriented billboards.
* Its mode-2 branch at `855884-855911` seeds an identity basis before the
  particle rotation is combined and vertices are emitted at `856701-856765`.
* `Aligned_to_World_Z` maps to mode 4 at `853902-853916`. In the per-particle
  route, `FUN_00a2e250:856598-856602` preserves the camera-derived first
  vector and overwrites only the second one with global Z. The Web adapter now
  mirrors that distinction and refreshes it with the live camera; row 22 does
  not exercise mode 4, so this remains structurally verified rather than a
  retail visual claim.
  The identity quad is native X/Y with a native-Z normal; `C=(x,z,y)` therefore
  maps that plane to Three X/Z, with a Three-Y normal.

This proves same-tick callback coalescing in the client. Aurora Web now keeps
header events model-scoped and routes `detonate` only to Explosion family
runtimes. Exact retail callback registration still needs the matched capture
acceptance item.

### Historical v3 Web behavior

`backend/src/modules/vfx/application/vfx.application.service.ts` passes the
matching model-animation event list into every emitter runtime. The runtime
coalesces the two callbacks at `0.033333`, but treats `0.033333` and
`0.133333` as distinct latches. The saved payload records two active Ring
particles after the second time, each at a different size. The effect is
therefore visibly stacked.

The historical frontend branch rendered `Billboard_to_World_Z` using a Three
X/Y quad after the local `(x, y, z) -> (x, z, y)` conversion. That changed the
native source plane. The repaired `aurora-z-up` branch maps its source X/Y
quad through `C` and applies the reflected native-Z rotation axis, yielding a
Three X/Z quad. The runner's previous side view made the corrected plane nearly
edge-on; its current source-axis diagnostic camera looks down Three Y. This is
not a recovered retail camera matrix.

### Required repair gate

1. Compare the repaired model-scope event route against saved NWN active-count
   chronology.
2. Capture or recover a matched NWN camera pose before judging direction,
   thickness, or silhouette visually.

## 2. Missing earth chunks

### Retail source facts

`Chunkssml` is an `Explosion` emitter with:

* `render Normal`, `blend Normal`, `texture NULL`
* `chunkName fx_rockchunksml`
* `birthrate 4`, `lifeExp 5`, `mass 1`, `velocity 8`, `randvel 3`
* `spread 2.7925300598`, `particleRot 5`, `bounceCoefficient 0.4`,
  `bounce true`, and size `0.04`.

The referenced chunk model contains a `Rocksml` trimesh and a nested
`smoke04` emitter. Its material dependencies include `fxpa_dirt` and
`fxpa_smoke01`.

### Native Aurora behavior recovered from decompilation

`FUN_00a31070` at `decompiled_all.c:856838-856881` resolves a per-particle
model pointer, calls the model update virtual method, derives orientation from
the particle rotation axis and angle, and calls the model orientation/render
path. This is a loaded model-particle route, not a generic billboard or an
untextured substitute mesh.

### Historical v3 Web behavior

The fixture generator only packages `fxpa_Explode1`, `fxpa_Smoke01`,
`fxpa_flstrk`, and `fxpa_ringwave`. It does not package `fxpa_dirt` for
`fx_rockchunksml`. The produced `fx_rockchunksml.glb` has no `images` or
`textures` entries, and the nested `smoke04` effect is stored only as metadata
instead of being run. The renderer itself labels the GLB route as a local
preview, not canonical retail rendering.

The payload also has zero `collisionQueries` and zero `collisionResults` for
`Chunkssml`, while carrying the diagnostic
`VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED`. The visual proof plane is not an
Aurora area collision service. Consequently the source `bounce` bit cannot
produce retail ground interaction in this proof.

The `0.133333` event is also currently applied to Chunkssml, yielding two
four-particle bursts, eight chunk particles total. That is another consequence
of the unresolved event ownership issue.

### Required repair gate

1. Preserve the model-particle update/orientation path while validating the
   source texture and nested runtime against retail behavior.
2. Supply the selected Aurora area collision context for `bounce`, and prove
   a collision result rather than a visible decorative plane.
3. Compare event count, spread, trajectory, material, and contact against the
   saved NWN packet under a matched camera. v7 supplies the current Web side,
   but the saved NWN overexposure prevents a visual count claim.

## 3. Grey rectangle/capsule

`frontend/src/modules/vfx/dev/NwnVfxComparisonRunner.tsx:143-166` creates:

```ts
target.name = "vfx_proof_target_scale_reference";
```

It uses `THREE.CapsuleGeometry` and is intentionally added to the scene by the
proof runner. It is neither in row 22 nor in `vff_explfire.mdl`, and it does
not appear in the saved NWN oracle.

It is now an explicit off-by-default calibration overlay under `diagnostics=1`.
A VFX parity proof must contain only the oracle-equivalent scene context.

## Proof classification and next capture

Classify `web-row22-one-trigger-v7.mp4` as:

`single-playback runtime/render/collision evidence with open visual parity gaps`

It must not be cited as a passing VFX parity proof. Do not rerecord NWN for
this fixture. The next Web capture is justified only after another meaningful
implementation repair or a recovered matched camera/environment; reuse the
existing NWN MP4 unless the scenario itself changes.
