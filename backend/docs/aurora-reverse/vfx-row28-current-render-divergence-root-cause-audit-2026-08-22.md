# VFX Row 28 Current Render Divergence Root-Cause Audit

Date: 2026-08-22  
Scope: current asset-neutral `VFX_FNF_METEOR_SWARM` implementation and saved
post-change Aurora Web diagnostics  
Policy: Aurora-first; no xoreos or other GPL secondary source was used

## Executive verdict

The main remaining missing-falling-stone defect has a confirmed generic cause.
The source-model texture-binding adapter applies the TXI state of an unrelated
material dependency to a mesh whose selected diffuse texture has no TXI.

For `vff_rainmeteor.glb`, each `RockLarg*` mesh selects `chunk64`. `chunk64` has
no TXI in the proof manifest. The same glTF material metadata also contains the
model-wide dependency list, including `fxpa_flame02`. The binding resolver scans
that broad list after failing to find a TXI for `chunk64` and returns the
`fxpa_flame02` binding. That binding is `decal + additive + proceduretype cycle`.
Consequently every falling rock is incorrectly converted from an ordinary
textured model material into an unlit white additive transparent material with
depth writes disabled.

This is not a row-28-only condition and must not be repaired with one. It is a
generic ownership error between resource dependencies and per-material TXI
state.

Status:

- **GO** for an asset-neutral exact-texture/TXI binding repair;
- **NO-GO** for accepting the current visual result;
- **NO-GO** for a radiance or bloom calibration change before the material
  ownership defect is repaired and recaptured;
- **NO-GO** for claiming a fresh proof from the currently saved artifacts.

## Confirmed source contract

The current `vff_rainmeteor.glb` contains two material definitions:

1. `Aurora material chunk64`
   - selected texture: `chunk64`;
   - diffuse: `[0.8, 0.8, 0.8]`;
   - ambient: `[0.2, 0.2, 0.2]`;
   - alpha: `1`;
   - used by all six `RockLarg*` meshes.
2. `Aurora material fxpa_flame02`
   - selected texture: `fxpa_flame02`;
   - used by all six `Cylinder*` meshes.

The fixture manifest has no TXI binding for `chunk64`. It has the following
source TXI state for `fxpa_flame02`:

- `proceduretype cycle`;
- `numx 4`, `numy 4`, `fps 32`;
- `blending additive`;
- `decal 1`.

Therefore the additive/decal lane belongs to the `fxpa_flame02` cylinder
material. It does not belong to `chunk64` or to the `RockLarg*` material.

## Exact implementation failure

### 1. Converter metadata separates the selected texture only syntactically

`aurora-mdl-ascii-to-glb.converter.ts` writes both values into every glTF
material:

- exact `textureReference` from the primitive;
- model-wide `textureReferences` from all source dependencies.

The broad list is valid as resource-discovery metadata, but it is not a list of
equivalent material bindings.

Relevant implementation:

- `resolveMaterialForPrimitive`, lines 3262-3290;
- `buildAuroraMaterial`, lines 3293-3325;
- especially the model-wide `textureReferences` write at line 3323 and the
  exact `textureReference` write at line 3324.

### 2. The frontend resolver treats dependencies as binding candidates

`resolveAuroraTextureBindingForMaterial` in
`placeableThreeAssetLoader.ts`, lines 3616-3644, concatenates:

- `resolveMaterialTextureReferences(material)`, which contains the exact
  selected texture;
- `resolveMaterialTextureReferenceList(material)`, which contains the broad
  model dependency list.

It returns the first reference that has a TXI binding. For a `chunk64` rock the
sequence is effectively:

1. `chunk64` — no TXI binding, continue;
2. `fxpa_flame02` — TXI binding exists, return it.

This result is then passed to `applyAuroraTextureTxiStateToMaterial`, lines
3678-3779. The unrelated binding sets:

- `transparent = true`;
- `depthWrite = false`;
- `blending = THREE.AdditiveBlending`;
- additive-decal raw-gamma material classification.

### 3. Saved post-change telemetry proves the leak is active

The saved diagnostic frame is:

`evidence/vfx-nwn-web-row28/calibration-v26-emitter-transform-diagnostics/row28-direct-emitter-diagnostics-t1_333.frame.json`.

Evidence hashes:

- current source GLB: `faa1f18c2b431dd0fbb60f9bbcd42450ed3b0f80433be844ec80cc164b337629`;
- current manifest: `414c35898ce9bf5d29e5291894ab090032dc6c66f07393eff727c8f87d0850aa`;
- current payload: `fba6d5115d50e587a274d0343e88a61af87214cc5e140c2f5c7f4b2fa0a8e4cd`;
- saved `v26` frame JSON:
  `736fec5f4ff7e13558158f674fa97650e63753b5589de3f99f3aa0bf7dbb5923`.

All six `RockLarg*` meshes bind the expected 16x16 `chunk64` image, but carry
the state of the unrelated flame TXI:

| Meshes | Selected map | Blending | Transparent | Depth write | Material color |
| --- | --- | --- | --- | --- | --- |
| `RockLarg`, `RockLarg01` ... `RockLarg05` | 16x16 `chunk64` | Three additive (`2`) | `true` | `false` | `#ffffff` |

At source time `1.333333`, four rock bodies correctly have mesh alpha `1` and
two correctly have mesh alpha `0`. The alpha controller is therefore working;
the visible bodies are being rendered through the wrong material lane.

This telemetry closes the causal chain:

`model-wide dependency list` -> `unrelated TXI selected` ->
`rock material becomes additive/decal` -> `no ordinary shaded falling-stone
silhouette`.

## Rejected primary causes

The following earlier or tempting explanations are not the current primary
cause:

1. **Dropped animation-root geometry tracks**
   - Historical and confirmed in the earlier row-28 audit, but now repaired.
   - Current payload transports `RockLarg*` position tracks and mesh-alpha
     tracks.
   - Saved telemetry reports `animation-track-applied`.
2. **Missing source geometry**
   - Current source GLB contains all six `RockLarg*` and six `Cylinder*`
     meshes, and the active frame reports all twelve.
3. **Whole-VFX scale**
   - The proof root is identity apart from the single production-coordinate X
     mirror. The earlier whole-subtree `0.1` hypothesis was rejected.
4. **Chunk model initialization scale**
   - The current generic `particle.scale.x` uniform model initialization is
     supported by `nwtoolset.exe:0x00a28a68-0x00a28a7a` and is not the cause of
     the root falling-rock material failure.
5. **Rectangular emitter extent conversion**
   - `FUN_00a28334`, `decompiled_all.c:853157-853213`, applies evaluated
     emitter X/Y axes and the final `0.0001` scale. The current runtime uses
     that generic path. The large root `Ring`/`Flame01` position changes are
     source animation keys, not the `xSize` rectangle sampler.
6. **Missing root Ring or Flame draw data**
   - At source time `1.333333`, the payload contains four `Ring` records, up to
     size `14.25`, and ten `Flame01` Motion_Blur records, including size
     `6 x 12.5` and a previous/current segment of about `1.49` units.
7. **Motion_Blur endpoint geometry coefficients**
   - The current endpoint-pair geometry uses the recovered full-3D segment
     normalization, full X size per side, Y cap at `0.25`, and trailing alpha
     `min(sizeX / segmentLength, 1)`. Those match the existing primary-source
     audit of `FUN_00a2e250`.

These findings do not prove final Ring/Flame pixel parity. They show that the
current data and topology are present and that the confirmed material ownership
failure must be removed before further visual calibration is meaningful.

## Required asset-neutral repair

The repair must be based on texture/material ownership only:

1. Resolve TXI from the material's actually selected texture reference or from
   the exact selected `THREE.Texture` identity.
2. Never use model-wide dependency references as substitutes for the selected
   material texture.
3. If the selected texture has no TXI, return no TXI binding. Do not fall
   through to another dependency merely because that dependency has a TXI.
4. Retain the broad dependency list only for asset acquisition and settlement.
5. Emit diagnostics containing both selected texture reference and applied TXI
   reference; a mismatch must fail the material contract.
6. Add no checks for VFX row, constant, resref, model name, node name, texture
   name, tile, creature, placeable, fixture, or proof profile.

The smallest safe implementation is to make the exact selected texture path
authoritative in `resolveAuroraTextureBindingForMaterial`. A separate converter
cleanup may rename or relocate the broad dependency list, but the runtime must
remain safe even when consuming older GLBs that still contain it.

## Required regression coverage

Add a generic two-material fixture:

- material A selects `ordinary_diffuse`, which has no TXI;
- material B selects `effect_diffuse`, which has additive/decal TXI;
- both materials carry the same model-wide dependency list.

Required assertions:

- material A stays non-additive, non-decal, depth-writing, and does not enter
  the raw-gamma additive VFX list;
- material B receives only its exact TXI and enters the expected additive lane;
- reversing material order does not change either result;
- adding additional unrelated TXI dependencies does not change either result;
- the selected texture reference always equals the applied TXI reference when
  a TXI is applied.

The row-28 regression should then assert generically derived outcomes:

- all `RockLarg*` meshes bind `chunk64` without an unrelated TXI;
- all `Cylinder*` meshes bind `fxpa_flame02` with its source cycle/additive/decal
  state;
- mesh alpha remains per-node and animation-driven.

## Proof status and closure criteria

The current saved artifacts are diagnostics, not a final proof of the current
implementation:

- the neutral retail captures predate the final source additive/decal material
  change;
- the newest `v26` image is a direct no-bloom diagnostic at only one source
  time;
- there is no fresh accepted post-repair Aurora Web MP4, trigger-aligned
  comparison MP4, or post-repair frame sheet.

After the exact-texture/TXI binding repair and focused tests, closure requires:

1. one resource-guarded backend family, one frontend family, and one capture;
2. a fresh exact-profile Aurora Web one-trigger MP4;
3. the immutable saved NWN MP4 reused without another NWN run;
4. a trigger-aligned NWN-versus-Web MP4;
5. a comparison frame sheet covering pre-onset, first impact, dynamic peak,
   falling bodies, late impacts, and clean post-roll;
6. zero unexpected failed assets, bridge tiles, placeholder geometry, or proof
   blockers;
7. a human verdict of `GOOD`, `CLOSE`, or `BAD` based on the new frame sheet.

No radiance, bloom, timing, or scale change should be accepted from the stale
images. If a mismatch remains after this repair, it must be re-audited from the
fresh material-correct capture.

## Post-repair capture and verdict — 2026-08-22

The shared resolver repair is implemented without asset-identity selection.
`resolveAuroraTextureBindingForMaterial` now accepts a TXI binding only when
the binding resolves to the material's actually selected `THREE.Texture`.
Model-wide dependency references and a lone unrelated binding are no longer
fallback material owners. Generic two-material regressions cover both the
exact selected binding and the no-unrelated-singleton-fallback case.

Focused verification passed:

- the texture-mapping suite: `48/48`;
- the VFX frontend suite: `385/385` across 15 files;
- the frontend production build;
- the asset-identity-neutral gate across 10 controlled surfaces.

Fresh deterministic capture `v26-material-txi-ownership` records exactly one
trigger, no loop, 108 frames at 12 fps, matching frontend/backend build
identity, settled assets, passing host/draw/shader/runtime gates, and clean
post-roll. Its active material telemetry reports six raw-gamma additive VFX
meshes: the six `fxpa_flame02` Cylinder materials. The `chunk64` Rock materials
are now ordinary opaque, depth-writing materials. This confirms that the
material-ownership defect is closed.

The immutable visual validator rejected the capture before promotion:

- observed bright onset: `+0.4166667 s`;
- expected source-clock onset: `+0.5040509 s`;
- tolerance: `0.0833333 s`;
- excess beyond tolerance: `0.0040509 s`.

The threshold was not widened. Supplemental execution of the same immutable
frame metric reports visual-anchor energy `-74.49%` relative to the native
anchor and an X-centroid error of about `-49 px`, which would also reject the
candidate if the first gate were bypassed.

Human review of the fresh trigger-aligned frame sheet is **BAD**:

- at `+1.000 s`, Web is dominated by one large dark falling body while NWN
  shows multiple ground impacts;
- at `+1.333 s`, NWN has a frame-filling white-orange peak while Web has a
  weak ring and small distributed points;
- at `+3.000 s`, Web still emits a large ring while NWN contains only late
  residual fire bodies.

The rejected but truthful diagnostic artifacts are retained under
`evidence/vfx-nwn-web-row28/comparison-v26-material-txi-ownership-diagnostic-bad`.
They are explicitly labelled as rejected and are not accepted proof.

The next Aurora-first audit boundary is generic source-model additive/decal
contribution, root `Flame01` Motion_Blur visibility/energy, impact-event to
nested Chunk lifecycle composition, and deterministic capture frame-to-source
clock labelling. No further radiance, scale, bloom, or lifecycle mutation is
authorized from the aggregate image difference alone.

## Reflected-parent Motion Blur winding repair — 2026-08-24

The production Area renderer introduces a coordinate-system mirror with a
negative parent determinant. The generic Motion Blur builder emitted the same
triangle order for positive and negative determinants, so restored `Flame01`
trail geometry was back-facing and culled in the actual Area path.

`resolveMotionBlurParticleBasis` now transports a `reverseWinding` decision
derived only from the parent transform determinant. Triangle indices reverse
for reflected parents. No VFX row, constant, resref, filename, node, texture,
fixture, or proof profile selects this behavior. A generic Z-up regression
below the production mirror verifies the repaired front face.

Focused verification passed: canonical renderer `86/86`, focused frontend VFX
`385/385`, the frontend production build, and the asset-identity-neutral gate
across 10 controlled surfaces. Fresh capture `v27-motion-blur-winding` showed
the previously culled high-energy trail contribution, but failed the immutable
onset gate and remained visually **BAD**. It is rejected diagnostic evidence.

## NWN EE random-stream audit — 2026-08-24

The native oracle comes from NWN Enhanced Edition, so the installed retail
client, not the 32-bit Aurora Toolset, is the random-stream authority:

- `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwmain.exe`;
- size `21071872` bytes;
- SHA-256
  `3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a`.

Direct static disassembly identifies the client random function at
`0x140c7ed00` and seed entry at `0x140c7ed2c`:

```text
state = state * 0x343fd + 0x269ec3
result = (state >> 16) & 0x7fff
```

The Web VFX runtime instead used the Toolset-derived `0x015a4e35`, then `+1`
sequence. That sequence was valid Toolset evidence, but the wrong contract for
an NWN EE runtime comparison.

The NWN EE function is called from particle code: exported
`PartEmitter::AnimateParticles` is at `0x140061210`; construction at
`0x140060680` reaches common particle reset `0x140066450`, including random
velocity calls at `0x1400664c6` and `0x1400664dc`. Further emitter calls occur
at `0x1400624b3`, `0x140062590`, `0x14006260d`, `0x14006267a`,
`0x1400654b3`, `0x140065963`, `0x14006599a`, and `0x14006610c`.
Emitter vtable slot 32 resolves to Explosion `0x1400647c0`, Fountain
`0x140064b30`, and Single `0x140065cd0`. The wind grid
`0x1400f1e00..0x1400f2070` calls the same function at `0x1400f1ec0`.

This establishes a generic engine contract: NWN EE proof uses NWN EE MSVC
`rand15` for emitter, nested placement, and wind sampling.

### Asset-neutral implementation

- `AuroraDeterministicRngAlgorithm` distinguishes `aurora-rand15` and
  `nwn-ee-msvc-rand15`.
- Production VFX runtime and the shared emitter stream select the NWN EE
  algorithm as their engine target.
- AoE placement and wind use the same NWN EE sequence.
- VFX cache identity is versioned to `v2` and contains the algorithm.
- The proof-profile source bindings include runtime state, AoE placement,
  wind, and cache identity.
- No asset, node, texture, fixture, or proof identity selects the algorithm.

The deterministic regression binds seed 42 to state/output pairs
`11519557/175`, then `26255348/400`. Focused runtime/AoE/wind tests passed
`107/107`; application-service tests passed `47/47`; the backend production
build passed under the repository 1 GB heap cap; and the identity-neutral gate
passed across 10 controlled surfaces. Broad `test:vfx:unit` exceeded the
enforced 1 GB heap; the cap was not raised and no parallel replacement ran.

## Fresh NWN EE RNG capture and verdict — v28

The regenerated fixture binds the corrected algorithm:

- `payload.json`: `66648711` bytes, SHA-256
  `2c8faf3bde25a6003620a5bcd69f39f16e39d4540c8adf642e488a223e7b0cbb`;
- `fx_meteor.runtime.json`: `10447968` bytes, SHA-256
  `8bb6488de142de04f6a4144ad8a8a5ed1e91c8ba17ed8747a4f4add275f053aa`;
- manifest SHA-256
  `414c35898ce9bf5d29e5291894ab090032dc6c66f07393eff727c8f87d0850aa`.

Profile `proof-profile-v34.json` binds capture tag `v28-nwn-ee-rng`, composite
runtime digest
`775c37bdc05e3167b307e32e8e528e9668849be28de847f51286af472af84525`,
and profile SHA-256
`4a8122bca32459d4117ec799b0c49caf2867ffd96cf5343b46e7e3d348370aa4`.

Exactly one guarded Web capture recorded one trigger, no loop, 108 frames at
12 fps over 9 seconds, matching build identity, settled assets, passing active
runtime gates, and clean post-roll. Services and capture Chrome were stopped;
ports 3000, 5173, and 9786 and all locks were verified free.

Fresh Web MP4:

- size `969367` bytes;
- SHA-256
  `580be90da13a170bf9d2e36add35480f59ed46e8fda3ef504d57b6ebd7afab0a`;
- path
  `evidence/vfx-nwn-web-row28/web-v28-nwn-ee-rng/aurora-web-row28-one-trigger-v28-nwn-ee-rng.mp4`.

The immutable validator rejected the candidate: onset `+0.4166667 s` versus
expected `+0.5040509 s`, exceeding the one-frame tolerance by `0.0040509 s`.
Supplemental metrics report visual-anchor energy error `-74.66995%` and
centroid delta `[-51.656 px, +35.736 px]`.

Human review of the trigger-aligned MP4 and contact sheet is **BAD**:

- at `+0.500 s`, NWN is quiet while Web already raises broad orange energy;
- at `+1.000 s`, NWN has several broad impact disks while Web is dominated by
  one dark falling body and small edge particles;
- at `+1.333 s`, NWN reaches a frame-filling white-orange peak while Web has a
  weak distributed flare;
- at `+1.667 s`, Web clips a flare near the top/right instead of reproducing
  the centered native impact shells;
- at `+3.000 s`, Web produces a large late blast from the left while NWN has
  only small residual fire bodies.

The rejected comparison is retained under
`evidence/vfx-nwn-web-row28/comparison-v28-nwn-ee-rng-diagnostic` and is not
promoted as accepted proof.

The historical native MP4 does not expose the shared NWN thread-local random
state at the trigger. NWN consumes that global stream across engine systems;
choosing a seed only to resemble this image would be image fitting, not a
recovered contract. The fixture seed remains arbitrary and deterministic. The
algorithm/distribution is corrected, but exact particle placement is not
claimed.

The next Aurora-first boundary remains generic: source-model `impact` clock
and Cylinder contribution, root-to-nested Chunk event phase composition,
source-node transforms below the production mirror, and deterministic
frame-to-source-clock labelling. No change may be selected by VFX identity or
by tile, creature, placeable, fixture, profile, filename, node, or texture.
