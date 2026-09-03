# VFX Row 28 Falling Meteor Aurora Decompilation Audit

## Standalone source-world-space re-audit — 2026-08-21

Fresh visual review still rejects the trigger-aligned `v19` capture despite
its coarse lifecycle, energy, and centroid gates. The follow-up `v20` and
`v21` captures also falsify the proposed whole-subtree `0.1` correction: they
collapse the falling bodies and impact field into a narrow cluster and require
an unsupported radiance compensation from `14` to `334`.

The source and decompilation establish two distinct composition contracts:

- the standalone VFX renderer consumes Aurora source positions, particle
  positions, particle sizes, and nested Chunk positions directly in its proof
  scene's world space;
- a caller embedding source MDL content into a production Area may apply that
  caller's explicit Area composition transform at the boundary, but the VFX
  renderer must not infer or select that transform by asset identity or asset
  class.

The exact source provides independent scale anchors. `OmenEmitter02` and
`OmenEmitter03` are offset by approximately `+8.248` and `-8.135`, while the
proof receiver is `13 x 7.2` world units. The `fx_meteor` Ring grows from
`0.5` to `17`. Aurora's rectangular emitter path in `FUN_00a28334` converts
the `xSize=1000` field to an approximately `+/-5` world-unit spawn extent via
the final `0.0001` factor. The particle draw path in `FUN_00a2e250` uses the
resulting particle position and size as draw geometry without a later `0.1`
model conversion. The nested Chunk draw path in `FUN_00a31070`
(`decompiled_all.c:856838-856881`) updates and renders the child model at the
particle position/orientation without a second draw-time size multiply. Exact
Toolset disassembly closes the missing earlier step: `FUN_00a28a38` at
`nwtoolset.exe:0x00a28a68-0x00a28a7a` passes its third scalar argument to the
new live model through virtual slot `+0xd8` before starting `impact`. The
caller supplies the sampled Chunk particle size in that argument. The model is
therefore already uniformly scaled when `FUN_00a31070` draws it.

Aurora Web therefore keeps the standalone proof root and Chunk particle
positions at identity scale, while each live Chunk model instance receives the
particle's sampled X size as a uniform scalar. Nested model runtime content is
a child of that model instance and inherits the same scalar. The proof host
records that contract but does not mutate root geometry, positions, motion,
particle sizes, or PointLight ranges. The production Area composition helper
remains an explicit caller boundary and is not invoked by the standalone VFX
proof runner. No VFX row, constant, resref, filename, node name, tile,
creature, placeable, or asset-class branch selects either behavior.

The immutable `v19` through `v22` artifacts remain retained as rejected
evidence. A fresh MP4, trigger-aligned comparison MP4, and frame sheet after
the generic Chunk initialization correction are still required before any
parity classification can change.

## Chunk model initialization scale correction — 2026-08-22

The earlier conclusion that Chunk particle size was intentionally ignored was
wrong because it considered only the later draw routine. The exact instruction
sequence is:

- `0x00a28a68`: push `0`;
- `0x00a28a6a`: push the function's third scalar argument (`[ebp+0x10]`);
- `0x00a28a6d-0x00a28a74`: call virtual slot `+0xd8` on the live model;
- `0x00a28a7d-0x00a28a9a`: start animation `impact` with rate `1.0`.

This proves an initialization-time uniform model scale. It does not authorize
scaling the VFX root, emitter rectangle, Chunk position, or any unrelated
asset. The canonical renderer now multiplies the cloned model template scale
by the contract-carried `particle.scale.x` for every Chunk particle through one
generic data-driven path. The existing X/Y particle scale values remain
observable; X is the uniform model scalar because the native call transports
one scalar. Invalid non-finite input falls back to identity and negative input
is clamped to zero at the validated renderer boundary.

Machine-readable evidence:
`evidence/vfx-nwn-web-row28/calibration-v15-chunk-model-init-scale/chunk-model-init-scale-re-audit-summary.json`.

The first identity-bound capture after this correction (`v23c`) passed runtime
observability but was rejected by the lifecycle validator: Web onset moved to
`+0.500 s`, outside the native `+0.333 s +/- 1 frame` gate. The old
`+0.206734 s` host delay was calibrated before the missing Chunk scale was
restored and is not present in `FUN_00a28a38`. The subsequent
`calibration-v16-chunk-init-scale-timing` candidate removed that delay but
retained an image-fitted playback rate. The exact retail-client audit below
supersedes that candidate: row 28 is dispatched at source rate `1.0`, not
`1045/768`.

## Exact retail-client animation-rate and trigger-anchor correction — 2026-08-22

The installed retail client was audited read-only at exact addresses:

- `nwmain.exe` SHA-256:
  `3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a`;
- `CNWCVisualEffect::LoadVisualEffect` at `0x140872770` preserves its numeric
  source-row argument at object offset `+0x180`;
- the playback branch at `0x1408731ae` selects rate `0.8` only for source row
  `40` and selects rate `1.0` for every other row, including target row `28`;
- all three visual-effect dispatch sites call the animation wrapper through
  vtable slot `+0x80`, transporting that selected rate in `xmm2`.

Machine-readable evidence is bound at
`evidence/vfx-nwn-web-row28/calibration-v18-client-animation-rate/client-animation-playback-audit.json`.
The proof fixture therefore replays source time at exactly `1.0x` with no host
delay. The former `1045/768` rate was an endpoint image fit and is rejected as
an Aurora semantic.

This result also exposes the former native trigger anchor as circular. Frame
`57` (`4.75 s`) had been inferred by subtracting the Web/source visible-onset
interval from native onset. With the retail source clock recovered, the
documented source-event alignment is frame `49` (`4.083333 s`): the first MDL
`detonate` event at source `1.0 s` aligns to immutable NWN strong-impact frame
`61`. The MP4 has no trigger audio and its engine log has no sub-second input
timestamp, so this remains an explicit source-event inference, not a claimed
direct observation. The final visual verdict must still come from the fresh
trigger-aligned MP4 and frame sheet.

No production runtime branch was added for row 28, its constant, resref,
filename, node name, asset type, tile, creature, or placeable. The recovered
rate and inferred trigger anchor are immutable proof-profile data only.

## Post-audit implementation note — 2026-08-21

The worktree now implements the audit's generic remediation path: animation
root mesh/transform tracks are parsed and transported, mesh alpha is a separate
material controller lane, canonical source geometry is bound to the model
graph, and proof static branches are source-derived. No production branch was
added for row 28, its VFX constant, resref, filename, or model/node-name
pattern. Runtime proof remains unclaimed until the active Node/Chrome safety
hold is lifted and the fixture/tests/captures can be regenerated.

## Post-audit simulation-cadence correction — 2026-08-21

The row-28 proof fixture previously derived its emitter simulation step from
`3.3 seconds / 99 animation ticks`, producing a fixed `1/30`-second runtime
step. That coupling is not supported by Aurora's emitter update path:
`FUN_00a31288` and `FUN_00a31ca4` consume caller-provided delta time, while
the model animation duration and controller-key times are expressed
independently in seconds.

The repository's existing broad retail-proof profile already defines
`RETAIL_PROOF_SIMULATION_STEP_SECONDS = 1 / 60`. The exact proof workstation
also records `graphics.video.vsync.mode = "adaptive"` in `settings.tml`, and
`Win32_VideoController.CurrentRefreshRate` reports `60` Hz. These facts do not
establish a global fixed NWN engine rate; they do establish the deterministic
simulation cadence appropriate for replaying this immutable capture on its
source workstation.

The row-28 fixture now simulates at 60 Hz and serializes every second state
frame (30 Hz) so the browser payload remains bounded. At source time
`1.333333` seconds, each of the two arbitrary Fountain/Chunk emitters now has
26 active particles instead of 20 under the former 30 Hz proof step. The
change is driven by a proof-profile cadence and the generic Aurora accumulator
algorithm. It does not inspect a VFX row, constant, resref, filename, or node
name to select behavior.

Date: 2026-08-21
Scope: `VFX_FNF_METEOR_SWARM`, source row 28, `vff_rainmeteor`
Policy: Aurora-first; no xoreos or other GPL secondary source was used

## Executive Verdict

**The missing falling stones have a confirmed implementation cause.**

The exact retail `vff_rainmeteor.mdl` contains six animated falling-body mesh
pairs. Each `RockLarg*` body owns a position controller that moves it from
approximately Aurora Z `15.35..16.68` to the ground interval
`-1.19..0.14`. Each body and its `Cylinder*` child also owns a mesh-alpha
controller that remains at `1` through descent and changes to `0` immediately
after impact.

Aurora Web preserves the twelve base mesh nodes but drops their animation
controllers. The proof route then renders with no admitted static host-graph
branches and the proof gate explicitly expects none. Consequently the current
proof can pass timing, energy, and particle-ledger checks while omitting the
source-authoritative falling bodies.

Status:

- **GO** for a generic model-node animation and mesh-material-lane repair;
- **NO-GO** for accepting the existing `v6a` proof;
- **NO-GO** for full retail parity until a fresh semantic proof passes.

## Exact Evidence Binding

### Installed Aurora Toolset binary

- path:
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`;
- size: `12,201,984` bytes;
- SHA-256:
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.

The binary hash matches the currently approved project Toolset binary.

### Local decompiler export

- path: `C:/Projects/New Folder/export/decompiled_all.c`;
- size: `30,366,020` bytes;
- SHA-256:
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The export is stable and matches the prior VFX audit hash. It still lacks a
reproducible generation-session lineage manifest. Decompiler observations in
this audit are therefore classified as stable local primary-candidate evidence,
not as a newly reproduced Ghidra session. The exact retail model bytes and the
accepted native NWN oracle independently corroborate the behavior required for
this repair.

### Exact source model

- path:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/sources/vff_rainmeteor.mdl`;
- size: `118,120` bytes;
- SHA-256:
  `ea57f0346166314602d9d473873cedde791f9911ef90722c114481a0b6ebf29b`;
- format: binary Aurora MDL;
- selected animation: `impact`;
- animation length: `3.299999952316284` seconds.

Machine-readable controller evidence is saved at:

`backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/aurora-decompilation-audit-v1/mesh-animation-controller-inventory.json`.

## Source Model Findings

The binary animation root contains six falling-body pairs. Controller type `8`
is the standard node-position lane. Controller type `128` is mesh alpha, which
the Aurora mesh parser maps to runtime target offset `0x80`.

| Body | Descent interval | Start Z | End Z | Alpha-to-zero time | Child mesh |
| --- | ---: | ---: | ---: | ---: | --- |
| `RockLarg` | `0.0000..1.0667` | `15.9752` | `-0.5691` | `1.1000` | `Cylinder01` |
| `RockLarg05` | `0.2000..1.2667` | `16.6826` | `0.1382` | `1.3000` | `Cylinder06` |
| `RockLarg03` | `0.5000..1.5667` | `15.3550` | `-1.1894` | `1.6000` | `Cylinder04` |
| `RockLarg01` | `0.9333..2.0000` | `15.4237` | `-1.1207` | `2.0333` | `Cylinder02` |
| `RockLarg02` | `1.2000..2.2667` | `16.5250` | `-0.0193` | `2.3000` | `Cylinder03` |
| `RockLarg04` | `1.7667..2.8333` | `16.3238` | `-0.2205` | `2.8667` | `Cylinder05` |

The tracks establish staggered meteors, downward motion, ground arrival, and
post-impact disappearance directly from source data. No asset-specific runtime
rule is needed or permitted.

The `fx_meteor` child resource is a separate Chunk/nested-runtime lane. Its
fixture GLB contains only an `emitter_proxy`, and the manifest correctly marks
the source static-geometry count as zero. Its `Ring`, `sparks`, `Smoke`, and
`Metorflame` runtime contributes nested visual stages; it does not replace the
six `RockLarg*` falling bodies.

## Aurora Runtime Semantics From Decompilation

The stable local Toolset export shows one shared model-animation mechanism:

1. `FUN_00a18dc4` indexes 12-byte controller metadata records.
2. `FUN_00a18ddc`, `FUN_00a18ea8`, `FUN_00a190ac`, and `FUN_00a19728`
   evaluate scalar, vector, and orientation tracks.
3. `FUN_00a1999c` writes or blends the evaluated value at
   `targetObject + targetOffset`.
4. `FUN_00a19b60` applies every controller record for the selected animation.
5. `FUN_00a19bf0`, `FUN_00a19c1c`, `FUN_00a19c50`, `FUN_00a19c7c`, and
   `FUN_00a19ca8` run node-specific work and the same shared controller pass.

Relevant decompiler-export ranges are
`decompiled_all.c:844645-845128`. This is model-node behavior, not an emitter
or VFX-row specialization.

The mesh parser at `decompiled_all.c:885301-885528` maps `alpha`, `alphakey`,
and `alphabezierkey` through the direct/key/Bezier helpers to target offset
`0x80`. This exactly matches controller type `128` in all twelve row-28 body
and child-mesh animation nodes.

`FUN_00a28a38` separately initializes each live Chunk model and starts its
`impact` animation. That confirms the nested runtime lane, but it does not
remove or supersede the parent phase model's animated mesh nodes.

## Confirmed Aurora Web Loss Chain

### 1. Binary parser omits animation-root mesh nodes

`parseAuroraBinaryMdlVfxSource()` in
`backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts`:

- collects base-root emitters, lights, transform nodes, and static geometry;
- collects animation-root emitter passes;
- collects animation-root light tracks;
- does not collect animation-root transform or static-geometry tracks;
- returns the base transform/static nodes unchanged.

The relevant implementation is at lines `1169-1195`, with emitter-only
animation collection at `2189-2275` and light-only animation collection at
`2360-2442`.

The current payload proves the loss:

- static-geometry nodes: `12`;
- transform nodes: `2`;
- static-geometry nodes with `animationTracks`: `0`;
- transform nodes with `animationTracks`: `0`.

### 2. The transport contract drops static-geometry tracks again

`collectAuroraModelGraphPayloadFromSourceModels()` in
`backend/src/modules/catalog/application/catalog.application.service.ts`:

- copies static-geometry identity and bind transform but not animation tracks
  at lines `9099-9110`;
- copies `animationTracks` into the general node graph only when
  `node.nodeKind === "transform"` at lines `9125-9127`.

This would still discard mesh animation even after a parser-only repair.

The separate static-geometry transport type in
`backend/src/modules/catalog/domain/template.types.ts` also has no animation or
mesh-material track fields. The general node DTO permits transform animation
tracks but not mesh alpha.

### 3. Geometry and graph are not supplied together

`attachCanonicalSourceModelGeometry()` in
`frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`
requires both a source-model template and a non-empty model graph. It returns
immediately when either is missing.

The row-28 comparison route supplies `sourceModel` but does not supply
`modelGraph` at `frontend/src/modules/vfx/dev/NwnVfxComparisonRunner.tsx:1330-1346`.

The production workspace canonical call supplies `modelGraph` but does not
supply `sourceModel` at
`frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:17448-17460`.

Therefore neither route gives the canonical geometry composer the complete
source contract.

### 4. The GLB contains geometry only

`vff_rainmeteor.glb` contains:

- `12` mesh nodes;
- `12` meshes;
- `0` glTF animations.

This is valid for the current split contract: GLB provides vertices while the
Aurora graph provides hierarchy and animation. It also means there is no glTF
animation fallback when the Aurora controllers are dropped.

### 5. Renderer transform support is incomplete for this source

The canonical model-graph renderer already accepts animation tracks on any
node presented to it and can evaluate position, orientation, and uniform scale.
It cannot use tracks that never reach it.

It also has no mesh-alpha animation lane. A position-only correction would
restore descent but leave the source `alpha 1 -> 0` lifecycle unimplemented.
Mesh alpha must stay separate from particle alpha and must drive the material
instances belonging to the animated source mesh node.

### 6. The proof gate is blind to the missing source geometry

`buildNwnVfxComparisonExpectedHostGraph()` hardcodes
`staticBranches: []` at
`frontend/src/modules/vfx/dev/NwnVfxComparisonRunner.tsx:728-735`.

The accepted `v6a` summary consequently reports:

- expected static branches: `[]`;
- allowed transient static branches: `[]`;
- attached static branches: `[]`;
- host graph status: `pass`.

The proof therefore verified particles, nested Chunk runtime, timing, and
aggregate image metrics while never requiring the falling-body mesh lane.

## Root-Cause Classification

| Finding | Confidence | Effect |
| --- | --- | --- |
| Animation-root mesh position tracks are dropped by the binary parser. | Confirmed | Six falling bodies never receive their descent motion. |
| Static-geometry animation tracks are dropped by catalog transport. | Confirmed | A parser-only correction would not reach the frontend. |
| Proof and production routes do not supply source geometry and model graph together. | Confirmed | Canonical geometry composition cannot run as designed. |
| Mesh-alpha tracks are neither transported nor rendered. | Confirmed | Source impact disappearance/fade cannot match Aurora. |
| Proof host graph hardcodes zero static branches. | Confirmed | Missing falling bodies do not block proof acceptance. |
| Remaining particle/material/postprocess differences cause the absence of stones. | Disproved as primary cause | They may affect final visual calibration, but the authoritative body animation is already missing earlier in the pipeline. |

## Required Generic Repair Boundary

The correction must be generic and identity-neutral:

1. Parse transform controllers from every animation-root model node, including
   mesh nodes, and attach them to the matching base node by source node identity.
2. Preserve mesh-material controller records separately, including alpha target
   offset `0x80` and future self-illumination tracks.
3. Transport animation tracks for every contract-permitted node kind. Remove
   the transform-only transport gate.
4. Deliver the source geometry template and source model graph together to the
   canonical renderer in comparison and production paths.
5. Evaluate the selected Aurora animation before source-mesh render and apply
   mesh alpha to isolated per-instance materials.
6. Derive proof static branches from the source graph/profile. Do not hardcode
   an empty list.
7. Require semantic descent and body-to-impact continuity in proof, so aggregate
   brightness and duration cannot substitute for missing bodies.
8. Prove identity neutrality with renamed arbitrary fixture/model/node
   identities. Do not branch on row 28, `VFX_FNF_METEOR_SWARM`,
   `vff_rainmeteor`, `RockLarg`, or any naming pattern.

## Acceptance Impact

The existing `v6a` proof remains immutable evidence but is reclassified as
`failed-semantic-component-missing`. It cannot be promoted after documentation
changes alone.

A replacement proof is admissible only after:

- the six source-driven descent intervals are represented by generic runtime
  behavior;
- the source mesh alpha lifecycle is applied;
- the static host graph is non-empty and settled;
- the fresh Web MP4 visibly contains falling bodies before their impacts;
- the side-by-side MP4 and frame sheet include descent-focused samples;
- the semantic validator passes body, trajectory, impact continuity, and
  post-impact stages.

## Claim Boundary

This audit establishes why the falling stones are absent and closes the
implementation knowledge gap for generic model-node controller preservation.
It does not claim complete Aurora renderer parity, exact material parity,
camera shake, exact retail RNG, or pixel identity. The local decompiler export
still needs a separately bound reproducible Ghidra session before it can support
a complete decompilation-lineage claim.
