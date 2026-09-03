# Aurora VFX decompilation versus implementation audit - 2026-07-16

## Verdict

Aurora Web has a substantial source-backed VFX implementation, but it does not
yet have full Aurora/NWN VFX parity. The parser, dependency graph, four named
emitter-family architecture, deterministic runtime, render contract, canonical
Three adapter, custom MTR source graph, PLT path, Chunk lane, WOK parser, and
strict proof gate are real implementation. They are not merely a preview.

This audit found and repaired fifteen current implementation defects:

1. Draw-wrapper argument `3` was still treated as an unknown enum in part of
   the stack. The approved Toolset binary maps it to `GL_TRIANGLES` (`0x0004`)
   and calls non-indexed `glDrawArrays`.
2. One frontend adapter inverted `renderorder`. The native comparator orders a
   lower signed 16-bit value first when depth and referenced-object keys tie.
3. MTR `sample_framebuffer` lanes 5/6 were transported but not executed by the
   browser render graph.
4. The visual-correlation gate still required the obsolete
   `diagnostic_pending` draw-route marker after the enum was recovered.
5. The catalog projection dropped model-scoped animation events even though the
   unified MDL parser preserved them; the events now remain on
   `auroraModelGraph` instead of being copied onto every emitter.
6. The Three adapter still mapped the source short directly to
   `Object3D.renderOrder`. It now carries a scene-instance context key, consumes
   Three's camera-depth render-item key, and applies the native contextual
   comparator to opaque and transparent VFX queues.
7. Catalog-packaged bounce emitters had no production area-instance collision
   context. Areas now carry deduplicated source-precedence ASCII WOK resources
   and exact tile instances; the workspace replays only `bounce=true` payloads
   through the backend runtime with the object's Aurora placement and visual
   transform before replacing canonical runtime frames.
8. Chunk child runtimes were sought generically without the native start
   contract. The approved Toolset binary proves `impact`, rate `1.0`, once on
   particle activation; mismatched child payloads are now rejected.
9. The MDL-to-GLB converter marked ordinary model meshes as both
   `KHR_materials_unlit` and `doubleSided=true`. Converter v14 now preserves
   the native lit, cull-enabled default; the row-22 retail Chunk GLB was
   regenerated from its exact source model.
10. ProgFX Type 7 `EffectBeam` treated each emitter's saved child `OmenRef`
    position as the live P2P target and omitted the source model's full parent
    transform. The symbolic retail client proves a different path: attach the
    beam root to the source node, reattach active model references to the
    external target node, rotate root `zdir` to `target-source`, then play the
    Param2 animation. Type 7 now has a typed owner and a separate runtime lane.
11. The Web `Linked` particle lane rendered a flat strip with half-width
    `size.x * 0.5` and no endpoint basis. Native `PartEmitter::RenderEmitter`
    doubles its already halved X size back to full `size.x` on each side and
    applies a second camera-plane basis at `size.y * 0.25` to both endpoints.
    The renderer now reproduces both source-backed axes.
12. The new `Linked` vertices were then wound a second time after their source
    points and camera bases had already been converted into Three space. With
    native culling still on `THREE.FrontSide`, both linked strips faced away
    from the camera and disappeared; only the separate Normal flare quads made
    the lash look like a dotted arc. The duplicate reflection is removed and
    the final Three-space triangles are camera-front-facing.
13. A later Type 7 revision read `AttachBeam` in isolation and removed the beam
    root arc. The complete attach path proves that `Gob::ReattachReference`
    derives the current world `zdir`, calls `RotationArc(zdir,target-source)`,
    and writes `qArc * qRoot`. A follow-up lifecycle audit proves this write is
    transient: the next `CAurBehaviorAttach::Control` copies the live source
    part orientation directly and does not reapply the arc. Both states are
    now covered with a non-identity attach arc.
14. The row216 proof guessed the player skeleton as `pmh0`. The exact capture
    BIC has `Gender=1`, `Appearance_Type=6`, and `Phenotype=0`, resolving the
    source to retail `pfh0`; the fixture now asserts both BIC and MDL hashes.
15. Attachment lookup used a flat global `.find()` by node name. Native
    `FindPart` at `0x43c5b0` performs case-insensitive pre-order DFS and returns
    the first duplicate name. The resolver now preserves that traversal.

The remaining work is not one undifferentiated blocker. It falls into three
groups:

- implementation still required: broader Chunk material and remaining family
  semantics;
- platform policy required: geometry-shader and custom skinned-shader handling
  in WebGL;
- proof required: matched Aurora/NWN captures for each family, render mode,
  Chunk/material case, PLT, and framebuffer MTR.

No missing proof blocks continued implementation. No current fixture may be
called canonical parity until its strict evidence packet passes.

## 2026-07-18 ProgFX Type 10 follow-up

The row-181 projectile lane is no longer proof-manifest motion. Retail
`nwmain.exe` creates one `CNWCProjectile`; Type 10 `Param4=4` selects path
style 4. Aurora Web now parses all five parameters, applies the recovered
`log` travel-time formula, moves the emitter owner before each runtime tick,
preserves old particles in world space, and releases the owner at the
destination. The old whole-group `groupMotion` proof workaround is removed.

The 2026-08-13 direct client re-audit corrected the old helper classification:
`0x140c946b0` is `logf`, not a random-number source. The canonical formula is
`1.5 + 3*logf(distance)` followed by integer-millisecond truncation of
`distance/speed*1000`. The shared trajectory contract is v2 and contains no
synthetic `randomUnit`. The exact row-181 three-metre fixture therefore lasts
`625 ms`. The current Web fixture accepts this source-backed implementation
result. The attempted owner-endpoint video alignment is rejected because the
saved NWN `lastVisibleVideoSeconds` value is only a global pixel-threshold
sample, not a projectile endpoint event. Current v4 remains a diagnostic-only
visible-window comparison with open temporal, owner-target, particle
silhouette, material, local-light, camera, and source-player gaps. See
`vfx-progfx-type10-log-timing-correction-audit-2026-08-13.md` and
`vfx-row181-owner-endpoint-proof-audit-2026-08-13.md`.

The exact binary addresses, implementation files, tests, capture geometry, and
fresh saved-NWN-versus-Web packet are recorded in
`vfx-progfx-type10-projectile-audit-2026-07-18.md`. Motion/lifecycle are closed
for this fixture; particle material, bloom, and scene-light response remain
open, so the packet is not a parity claim.

The same follow-up closed a source-light mapping defect. `ambientonly` is
parsed at model-light `+0xb4` by `FUN_00a5872c`; `FUN_00a4cd58`
(`874699-874721`) copies that field exactly to active-light selector `+0x68`.
`FUN_00a40b60` uses it to choose local ambient color versus local diffuse
color while preserving position and radius attenuation. Aurora Web no longer
maps `ambientOnly=true` to a global `THREE.AmbientLight`. A shared Three shader
adapter now uses radius-attenuated indirect diffuse irradiance without
normal-facing or specular response for canonical VFX, placeable source-MDL
lights, and creature source-MDL lights. The fresh row-181 timeline records one
light with radius `5` and intensity `1.5` during owner life and zero after
arrival. Real-browser WebGL validation passed with empty shader logs on a
diagnostic receiver; matched NWN receiver/material calibration and pixel
response remain open.

## Evidence boundary

- Read-only decompilation oracle:
  `C:\Projects\New Folder\export\decompiled_all.c`
  - bytes: `30,366,020`
  - lines: `988,611`
  - SHA-256:
    `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- Approved Toolset binary:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`
  - bytes: `12,201,984`
  - SHA-256:
    `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`
- Audited retail runtime binary:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe`
  - bytes: `21,071,872`
  - SHA-256:
    `3B7CB1252E0EDB2CE22D7971F333AADE027039AE30A45B4BC64732C3E6BEC73A`
- Symbolic retail Linux client used for the Type 7 beam call graph:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\linux-x86\nwmain-linux`
  - bytes: `26,557,296`
  - SHA-256:
    `6D19C39BC646AF5DDBC333FF31797A4ACD9019506BCB45EF1B93B1BD5925E700`
- Editable implementation: `C:\Projects\aurora-web`.
- Existing NWN MP4 files were not rerun or replaced.
- Historical proof JSON and payloads are immutable evidence of their recorded
  revision. Stale fields inside those files do not describe the current code.

## Native anchors rechecked

| Native anchor | Recovered contract | Current implementation |
| --- | --- | --- |
| `FUN_00a2e250`, `decompiled_all.c:856771-856808` | Punch selects a separate shader; particles draw `activeCount * 6` through wrapper argument `3`. | Punch `fAlphaDiscardValue=0.2` is source-backed. The draw wrapper is now recorded as non-indexed `GL_TRIANGLES`. |
| `FUN_00a31288`, `857000-857129`; `nwtoolset.exe:0x00b908cc-0x00b908fb` | Fountain converts normal/trail counts with Aurora's temporary x87 truncate-toward-zero helper and resets the whole normal accumulator. | Recovered normal and trail scheduler is implemented with truncation. |
| `FUN_00a31ca4`, `857152-857297` | Explosion consumes the detonate latch once and uses the truncated evaluated `birthrate` directly as its burst-loop count; `lifeExp` is not a count multiplier. | Backend runtime and shared frontend source-MDL/placeable presentation now agree. The frontend no longer multiplies by lifetime or applies the historical 48-particle cap. See `vfx-explosion-burst-count-frontend-parity-audit-2026-08-13.md`. |
| MTR parser, `868848-868873`; scene queue `0x00a7df69-0x00a7dfeb`; queue consumer `0x00a7d509-0x00a7d586` | `twosided`, `sample_framebuffer`, and `volumetric` belong to material state. Non-volumetric `twosided` selects wrapper argument 1, which disables state 3 (`GL_CULL_FACE`); argument 0 uses the canonical enabled `GL_BACK` lane. The wrapper does not modify `glFrontFace`. | Material ownership and exact wrapper cull state are preserved. Textured particles still apply the later native `twosidedtex` live-read. |
| Scene classification, `908278-908329`, `908377-908441` | `sample_framebuffer=1` and volumetric select lane 5; value `2` selects lane 6. | Backend and frontend preserve the lane; the browser now executes base, lane 5, lane 6, then bloom. |
| `FUN_00a7fb8c`, `908970-909001` | Primary key is draw depth. When depth and referenced-object context tie, lower signed short at source `+0x140` sorts first. | The final Three render lists now use a versioned Aurora queue record, camera-depth key, scene-instance context key and signed-short tie-break. Different contexts retain no invented `renderorder` relation. |
| `FUN_00a7b8bc`, `906871-906915` | Static WOK traversal runs first. Dynamic traversal is selected only when query-helper field zero is `0`; VFX constructs it as `1`. | Exact row-22 area profile uses static-only WOK contacts. General scene/runtime wiring and native AABB/BSP traversal are open. |
| `FUN_00a28a38`, `853365-853375`; `nwtoolset.exe:0x00a28a38-0x00a28a9a` | A live Chunk model starts `impact` once at activation, playback rate `1.0`, with raw trailing arguments `1,0`. | The backend carries the exact contract; the frontend rejects a generic/mismatched nested runtime and evaluates the matching runtime from particle age. |
| `CNWCVisualEffectOnObject::LoadVisualEffect` `0x81882b`; `ReAttachVisualEffect` `0x8170a0`; `Gob::AttachToObject` `0x43e0e0`; `CAurBehaviorAttachNoOrientation::Control` `0x4a2bd0` | `OrientWithGround` selects object-attachment behavior: zero follows position while preserving the VFX quaternion through mode 3; nonzero follows both part position and quaternion through mode 0. | Shared object attachment resolves the source row value, applies the matching world/local transform policy, preserves scale, fails closed on missing values, and reports policy telemetry. |
| `CNWCVisualEffectOnObject::ReAttachVisualEffect` `0x8170a0`; target virtual probes through `CGameObject::AsNWCPlaceable` and `CGameObject::AsNWCDoor` | Creature slots resolve to Gob root/`impact`/`head`; placeables resolve exact-prefix `_ground`/`_impact`/`_head_hit`; doors resolve exact-prefix `grnd`/`impc`/`hhit`. `Imp_HeadCon_Node` is not the general `headconjure` node. | Shared object attachment selects the target namespace explicitly, requires exact placeable/door prefixes, updates the anchor after host animation sampling, and reports target kind, prefix, source column, requested/resolved node, world transform, and orientation policy. |
| `FUN_00a72894`, `900982+`; `FUN_00a5e54c`, `887101+`; `FUN_00a471d0`, `870224+` | Ordinary model drawing starts with internal state 5, culling, depth test and depth writes enabled; material-specific branches can override them. | Converter v14 emits ordinary source meshes lit and single-sided. Row-22 `fxpa_dirt.txi` has no overriding material directive. |
| `nwmain.exe:0x1400bbff6-0x1400bbfff`, `0x140597180-0x140597223`, `0x140597850-0x140597872` | Renderer obtains `CWorldTimer` time-of-day, stores it as an integer millisecond uniform input, advances one millisecond per elapsed real millisecond, and wraps at `Mod_MinPerHour * 1,440,000`. Zero minutes per hour clamps to one. | Areas carry a source-hashed `module.ifo` clock contract. The Three scene seeds from `Mod_StartHour`, advances by animation delta, wraps at the native period, and uploads the integer tick. |
| `FUN_00a294ec`, `853807-854022` and `FUN_00a2e250`, `855370+` | Render modes 0 through 6 are distinct native branches. | Seven branches are separated. Each still needs a signed, matched visual oracle; some coefficients remain source-incomplete. |
| `CNWCVisualEffectOnObject::LoadBeam` `0x8137f0`; `AttachBeam` `0x815a70`; `ApplyBeam` `0x815b60`; `Gob::ReattachReference` `0x43fc50`; `CAurBehaviorAttach::Control` `0x4a2810`; `RotationArc` `0x5b7070` | Type 7 loads Param1 as a model, attaches its root to the source body node, reattaches active internal references to the target node and writes `RotationArc(zdir,target-source) * qRoot` once. On the next control tick the attach behavior overwrites the Gob with the live source-part position/orientation. | Parser types Param1/Param2. Runtime preserves the attach-time arc only at frame zero, follows the live source transform afterward, composes the complete MDL hierarchy, and prevents local child references from replacing the external target. |
| `PartEmitter::RenderEmitter` `0x4ad4c0`; `RenderLinked` `0x4af4a0`; `FUN_00a2e250`, `856418-856765` | Linked projects the source-to-next-active-particle segment onto two camera axes. Its transverse basis is scaled by full `size.x` per side; its longitudinal endpoint basis is scaled by `size.y * 0.25`. | Canonical Linked geometry now carries both bases, native width/cap coefficients and UVs. Because source positions and camera bases are already converted to Three space, the final triangles use Three camera-front-facing winding without a second reflection. |

## Current implementation matrix

| Area | State | Classification | Remaining action |
| --- | --- | --- | --- |
| `visualeffects.2da`, ProgFX and phase scheduling | Source rows, constructor context, phases, dependencies, sounds and client-event metadata are preserved. | Implemented architecture | Complete the retail case matrix and capture evidence. |
| ASCII/binary MDL emitters | Transforms, controllers, timelines, events, render/blend tokens, textures, Chunk refs and material refs are transported. | Strong structural coverage | Continue source-token coverage audits; do not infer unknown tokens. |
| Event ownership | Animation-header events are model-scoped and `detonate` is routed only to Explosion emitters. | Repaired | Capture callback chronology; no code blocker. |
| Unknown families | Unknown token resolves to `Unknown`, never silently to Lightning. | Repaired | Add a source mapping only when a native class/path is recovered. |
| Fountain | Native truncated normal/trail scheduler and deterministic RNG are implemented. | Source-backed, proof pending | Retail runtime tick dump and matched capture. |
| Explosion | Detonate latch, truncated `birthrate` count, wind registration and burst path exist. Canonical runtime and source-MDL/placeable rendering now share the count contract. | Source-backed structure; count mismatch repaired, visual proof pending | Retail timing/callback chronology and matched visual comparison remain required. |
| Single | Native truncated active gate, non-pooled inactive destruction, max-one lifecycle, loop-age reset and one-pass P2P motion are implemented. | Source-backed scheduler, proof pending | Matched retail tick/capture remains required for visual parity. |
| P2P | Gravity and Bezier branches require real target context and preserve recovered update order. | Source-backed structure, proof pending | Retail target mapping and tick dump. |
| ProgFX Type 7 beam owner | `EffectBeam` resolves the linked Type 7 row, Param1 model and Param2 animation. Attach-time current-root-Z arc rotation, its first-control overwrite, a per-time live-host resolver, external reference reattachment, native first-match DFS and the full emitter hierarchy are explicit. | Retail-client-disassembly-backed; current comparison has open parity gaps | Regenerate the static row216 candidate and one-playback Web proof against the saved retail oracle. |
| Lightning | Target-required fixed-point lifecycle, truncated count, delay cache, native axes, radius-bounded midpoint recursion and spacing-bounded scale jitter are implemented. The 2026-08-13 row210 re-audit found no missing native branch and retained the shared implementation unchanged. | Source-backed scheduler; current row210 static proof is diagnostic-only | Exact actor/scene/camera context and matched visual capture remain required; do not image-tune Lightning around their absence. |
| Coordinates/orientation | Shared `C=(x,z,y)` and reflected axis-angle `-C*axis` are used by particles, model nodes, lights, Chunks and WOK nodes. | Structurally repaired | Matched cardinal-axis and orientation proof. |
| Object attachment and target-node namespace | Source `OrientWithGround=0` follows the selected object part position through the no-orientation behavior; nonzero follows position and quaternion through full attach. Scale is not inherited. Creature, placeable, and door node names use distinct native namespaces. | Primary-retail-disassembly-backed and implemented in the shared resolver; row-68 creature/head proof v22 is current | Produce matched nonzero-orientation, exact-prefix placeable, and exact-prefix door visual fixtures; multi-slot composition remains fail-closed until represented by the canonical host graph. |
| Render modes 0..6 | Normal, local/world Z, Linked, aligned modes and Motion Blur use separate geometry paths. Linked and Motion Blur now reproduce their recovered two-axis width/cap coefficients. | Structurally implemented | One source-backed oracle per mode; finish any coefficients that remain unproven. |
| Particle topology | Six vertices per textured particle/segment and non-indexed `GL_TRIANGLES` route are explicit. Linked uses the next active particle plus native transverse and longitudinal camera-plane bases. | Repaired and source-backed | Regenerate only future payloads; do not rewrite historical proof files. |
| Blend/Punch/culling | Normal and bucket 2 factors, Punch `0.2`, depth lanes, `twosidedtex`, Three-space camera-front-facing particle winding, and exact MTR `twosided` wrapper culling are implemented. | Source-backed | Matched visual proof remains open; source/test evidence is not pixel parity. |
| `renderorder` | Signed int16, camera-depth primary key and scene-instance contextual tie-break are implemented for canonical VFX meshes in opaque and transparent Three queues. | Repaired, visual proof pending | Capture a matched overlapping-emitter oracle before claiming final pixel over/under parity. |
| MTR texture slots | Explicit slots `0..15`, bound flags, environment samplers and legacy fallback are supported. Canonical Chunk instances route inline source-MDL slots plus packaged MTR/SHD/TXI sidecars through the same shared model-material adapter. | Implemented shared material path | Produce matched material proof with additional retail fixtures. |
| TXI `proceduretype cycle` | Texture-owned state, strict native threshold, dropped residual time, modulo atlas frame and one update per global renderer frame are shared by placeables, doors, items, creatures and canonical VFX Chunk instances. | Primary-decompilation-backed shared runtime | Produce matched visual proof with an exact multi-frame TXI cycle fixture; row 22 is not evidence for this path. |
| Custom SHD graph | Recursive source graph, includes, parameters, attributes and named uniforms are transported and compiled. | Implemented for unskinned VS/FS; unsupported GS and skinned programs fail closed with distinct reasons | Keep `geometry-shader-unsupported` and `skinned-mesh-binding-unavailable` refusal until the native contract can be executed; never silently install a generic custom program. |
| Framebuffer lanes 5/6 | Separate color/depth targets execute base, lane 5, lane 6 and bloom without read/write feedback. | Implemented, browser proof pending | Run one flowmap fixture proof against a saved Aurora/NWN oracle. |
| `worldtimerTimeOfDay` | Toolset keeps the uniform at initialized zero; retail runtime writes `CWorldTimer` time-of-day in milliseconds. `module.ifo` supplies `Mod_MinPerHour` and `Mod_StartHour`. | Source-backed runtime input implemented | Produce a matched flowmap capture; implementation evidence is not visual parity. |
| Bloom | Retail shader resources, defaults, downscale profile and final blend factors are recovered and implemented. | Source-backed, visual proof pending | Matched HDR/bloom capture. |
| PLT | `.plt` identity, target palette context, 15 slots, deterministic active-retail RGBA palette tables, native row orientation, palette alpha, generated target, sampler state, decoder and cache partitioning are implemented. | Source-backed generated-target implementation | Produce known-color matched retail visual output; implementation is no longer blocked on palette source or sampler semantics. |
| Chunk model lane | Chunk refs resolve to model particles; `impact` starts once at activation; child emitter runtime, ordinary lit/single-sided/depth defaults and orientation are carried. Inline source-MDL slots and packaged MTR/SHD/TXI sidecars now use the shared model-material adapter with explicit partial/missing telemetry and no guessed single-texture fallback. | Source-backed shared material transport | Finish broader scene integration and produce matched visual proof. |
| WOK collision | All sampled ASCII records parse; row-22 static contacts run with Aurora response ordering. Production areas select module/HAK/vanilla WOK by source precedence, deduplicate geometry, place tile instances at `(col+0.5,row+0.5,height)*10`, replay bounce emitters with the full object transform, and traverse decoded source AABB trees with native direction masks, child order, leaf selection, and endpoint shortening. | Production source-AABB scene runtime implemented; visual proof pending | Native world-scene BSP construction is not serialized; broader static-part profiles and a matched scene-collision capture remain. |
| Placeable-hosted VFX | Source hierarchy, models, emitters, lights, MTR state, replay command, VFX payload, static WOK collision and module clock are connected. | Scene-instance WOK and CWorldTimer inputs implemented | Produce matched visual proof. |
| Retail parity gate | Ten required fixture families and eight evidence lanes are enforced. | Correctly closed | Populate real evidence; never promote tests or screenshots alone. |

## Repairs made in this audit

### 1. Particle draw route

`FUN_00a7814c(buffer, 3, activeCount * 6, 0)` is now represented as:

- `route=non_indexed_draw_arrays`;
- `indexed=false`;
- `glPrimitiveMode=GL_TRIANGLES`;
- `glPrimitiveModeEnum=0x0004`;
- approved Toolset binary provenance.

The correlation runner and its self-test now require this confirmed contract,
not the historical unknown-enum marker.

### 2. `renderorder`

- ASCII/source values are normalized to signed 16-bit.
- The frontend adapter no longer computes `default - renderorder` or writes the
  emitter short directly to `Object3D.renderOrder`.
- Every canonical textured or Chunk renderable receives
  `aurora-vfx-draw-queue/v1`, including lane key, scene-instance referenced
  object context, signed-short value and dynamic camera-depth provenance.
- The installed opaque and transparent comparators use depth first and compare
  lower `renderorder` only when depth, lane and non-empty context tie.
- Equal-depth entries from different scene-object contexts return no invented
  order relation. Non-VFX and cross-lane entries retain Three's standard
  fallback sorting.
- This is source/contract proof for the recovered comparator. Final visual
  over/under parity still requires a saved or newly planned matched NWN oracle
  with controlled overlapping emitters.

### 3. MTR framebuffer execution

The browser pass now:

1. hides lane 5/6 and renders the base `mainscene` snapshot;
2. binds base color/depth to lane 5 and renders the next snapshot;
3. binds that result to lane 6;
4. renders the combined scene to the bloom input;
5. preserves one source frame value across repeated draws.

Separate targets prevent sampling the framebuffer currently being written.
This is a meaningful implementation repair, but unit tests are not a visual
parity proof.

### 4. MTR slots and time uniforms

- `texUnit0..15` and `texture0Bound..15` are populated from explicit MTR slots.
- Explicit slots win over the legacy Three material fallback.
- Toolset upload `0x00a736e5` reads `DAT_00ccc068`, but the approved Toolset
  binary contains no writer; `FUN_00a72ddc` only zeroes the containing block.
- Retail `nwmain.exe:0x1400bbff6` calls `0x140597180`, stores the returned
  time-of-day at `0x14128ea28`, and uploads it at `0x1400b88c2-0x1400b88d2`.
- `0x14059719c-0x140597223` proves millisecond units. The setter at
  `0x140597850-0x140597872` proves a day period of
  `Mod_MinPerHour * 1,440,000 ms` and the native zero-to-one clamp.
- Aurora Web parses `Mod_MinPerHour` and `Mod_StartHour` from the canonical
  `module.ifo`, seeds the same integer domain, advances by the render-loop
  animation delta, and never treats the absolute browser wall clock as source
  truth.

### 5. MTR `twosided` cull wrapper

- Scene classification reads MTR `twosided` at `+0x181` and `volumetric` at
  `+0x188`. It enqueues wrapper argument `1` only when `twosided != 0` and
  `volumetric == 0`; otherwise the primary wrapper argument remains `0`.
- The queue consumer processes argument `1` by disabling state slot `3`, which
  is the recovered `GL_CULL_FACE` slot. Argument `0` uses the normal
  cull-enabled `GL_BACK` lane. The queue restores enabled `GL_BACK` after the
  front-cull companion lane.
- This wrapper calls `glCullFace`, not `glFrontFace`; front-face winding is not
  modified by this branch.
- `FUN_00a2e250` later live-reads emitter `twosidedtex` at source `+0x138` and
  enables or disables state `3` again. The canonical particle renderer therefore
  keeps `twosidedtex` as the final particle-material side owner instead of
  inventing `MTR twosided OR twosidedtex` behavior.
- Exact source packet:
  `evidence/vfx-mtr-twosided-2026-07-16/aurora-mtr-twosided-source-contract.json`.

### 6. Chunk child scheduler and ordinary model defaults

- `FUN_00a28a38` calls model animation `impact` once when the Chunk particle is
  activated, at playback rate `1.0`; the two remaining raw integer arguments
  are preserved as `1,0` without inventing names for them.
- The frontend attaches a nested source runtime only when every selected
  runtime animation is `impact`, then evaluates it from particle age. A
  generic `default` payload now reports a mismatch instead of rendering.
- Renderer initialization enables internal state 5, `GL_CULL_FACE`,
  `GL_DEPTH_TEST` and depth writes. The ordinary static-mesh route retains
  those defaults; a material-specific branch can disable state 5 and additive
  material can disable depth writes.
- `fxpa_dirt.txi` contains only downsample limits, so converter v14 regenerates
  `fx_rockchunksml.glb` without `KHR_materials_unlit` and with
  `doubleSided=false`. This closes the row-22 default model slice, not every
  custom material or visual parity claim.
- Exact source packet:
  `evidence/vfx-chunk-impact-material-2026-07-16/aurora-chunk-impact-material-source-contract.json`.

### 7. ProgFX Type 7 beam attachment and row216 proof

- The symbolic retail Linux client exposes non-stripped names for
  `CNWCVisualEffectOnObject::LoadBeam`, `AttachBeam`, `ApplyBeam`,
  `Gob::ReattachReference` and `RotationArc`.
- `LoadBeam` reads Param1 as the model. `ApplyBeam` calls `AttachBeam`, then
  plays Param2. `AttachBeam` attaches the beam model to the source object/body
  node with mode `0` and calls `ReattachReference` for the target object/node.
- `ReattachReference` traverses reference parts, attaches their live referenced
  objects to the external target with mode `0`, computes `target-source`, calls
  `RotationArc(currentRootZDir,targetDelta)`, and writes
  `qArc * qRoot`. The saved `OmenRef` local position is not the live Type 7
  target after this operation.
- `CAurBehaviorAttach::Control` at `0x4a2810` overwrites that root orientation
  with the live source-part orientation on the next control tick. The root arc
  is not recomputed during normal beam playback.
- Aurora Web now types Type 7 Param1/Param2, requires an explicit beam
  attachment context, evaluates the complete model parent hierarchy, bakes the
  recovered root transform into world-space emitter simulation, and keeps the
  generic child-reference path unchanged for non-Type-7 P2P.
- `CAurBehaviorAttach::UpdateGobPosition` at `0x49f470` and its control path at
  `0x4a2810` fetch live part position and orientation every frame. The current
  runtime accepts a source-backed per-time attachment resolver. The row216
  fixture still resolves only exact base-model nodes and freezes both host
  parts because the saved oracle does not expose active actor animation state;
  production actor-animation integration remains open.
- `Gob::FindPart` at `0x43c5b0` is a case-insensitive pre-order DFS. Retail
  `pfh0.mdl` contains two `Impact` parts; the first DFS match is the line-199
  node used by the fixture. A flat name lookup is not a general substitute.
- The exact capture character is `avriemail461.bic` SHA-256
  `5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0`.
  Its fields resolve `pfh0.mdl` SHA-256
  `1da54afc5ff270c8c7decc61829df0595c6568d70cdef75026f63d8e94362f51`.
- The current row216 evidence uses one Web trigger and the saved NWN MP4. The
  effect runs for exactly 20 seconds. Proof camera distance was calibrated from
  the same three-metre floor anchors without changing VFX geometry. Scale is
  now comparable, but the Web fixture omits both host actors and the steady
  shape remains more regular and closed; visual parity is not established.
- Web proof:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/aurora-web-row216-one-trigger-aurora-first-reattach-rotationarc-pfh0-camera-anchor-calibrated-20260716.mp4`.
- Matched comparison:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row216-reattach-rotationarc-pfh0-camera-anchor-calibrated-20260716.mp4`.
- Targeted audit packet:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/row216-reattach-rotationarc-pfh0-camera-anchor-calibrated-20260716-audit.json`.

### 8. Native Linked width and endpoint geometry

- The symbolic retail client exposes `PartEmitter::RenderEmitter()` at
  `0x4ad4c0` and the `RenderLinked()` entry at `0x4af4a0`.
- In `FUN_00a2e250`, the base X/Y values first become half-sizes. The Linked
  branch then multiplies X by `2.0` and Y by `0.5`, yielding a transverse
  offset of full `size.x` and a longitudinal endpoint offset of
  `size.y * 0.25`.
- For normalized camera-plane projections `a=dot(A,segment)` and
  `b=dot(B,segment)`, native geometry builds transverse `A*b-B*a` and
  longitudinal `A*a+B*b`. Both are applied to every segment from the current
  particle to the next active particle.
- The previous Web strip used only `cross(cameraNormal,segment)` at
  `size.x * 0.5`, making its total width four times narrower and omitting the
  endpoint extension. The canonical renderer and its six-vertex regression
  fixture now preserve the recovered geometry without claiming pixel parity.
- A fresh static preflight exposed a second defect after that width repair:
  both Linked triangle normals pointed away from the proof camera while the
  Normal flare quads pointed toward it. Source positions and camera bases had
  already passed through the Aurora-to-Three coordinate conversion, so the
  Linked lane's extra winding reflection was a duplicate. Removing it makes
  both Linked strips camera-front-facing under the native cull-enabled lane;
  the continuous `fxpa_white` core is visible again.
- The symbolic Linux client also closes two tempting but incorrect diagnoses.
  `PartEmitter::Initialize` enables age/lifetime interpolation for ordinary
  emitters; the ordinal/active-count branch belongs to Lightning. The
  projected-length alpha attenuation belongs to Motion Blur mode 6, not
  Linked mode 3. Neither behavior may be copied into row216 to tune its proof.
- The saved NWN capture used HDR bloom followed by framebuffer effect 2 with
  sharpen, dynamic contrast and vibrance enabled. Exact shader sources and the
  capture values are recovered in
  `artifacts/vfx-postprocessing-2026-07-19/active-retail-postprocessing-shader-audit.json`.
  Their native order is sharpen, dynamic contrast, vibrance. Dynamic contrast
  also consumes live area-light direction and point-light uniforms, so the
  proof profile remains explicitly open until those runtime inputs are mapped;
  no midpoint is guessed from the image.

### 9. Historical row216 proof after Linked front-face repair

- Aurora Web was recorded once after the winding repair: one trigger,
  `loop=false`, diagnostics off, 20-second effect in a 24-second capture.
- Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/aurora-web-row216-one-trigger-aurora-first-linked-frontface-20260716.mp4`.
- The saved NWN oracle was reused without launching or recording NWN:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/nwn-row216-one-trigger.mp4`.
- Side-by-side MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row216-linked-frontface-20260716.mp4`.
- Contact sheet:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row216-linked-frontface-20260716-contact-sheet.png`.
- Result: both Web Linked cores are now continuous and visible. Remaining
  differences are a much thinner Web core, regularly spaced Normal flare
  beads, weaker/wider-lobe mismatch, unmatched scene/camera context and the
  incomplete capture postprocess profile. This is a repaired implementation
  proof with open parity gaps, not a canonical parity claim.

### 10. Fountain reset axes and rand15 modulo correction

- `FUN_00a28334`, `decompiled_all.c:853157-853216`, confirms that evaluated
  `xSize` and `ySize` feed signed integer magnitudes on runtime emitter X/Y
  axes and receive the final `0.0001` multiplier. The existing rectangle unit
  conversion is retained.
- `FUN_00a264c0`, `853002-853151`, applies spread as a quaternion rotation
  around local X followed by local Z. Before emitter orientation, the native
  forward direction is
  `(sin(azimuth)*sin(tilt), -cos(azimuth)*sin(tilt), cos(tilt))`.
  The previous Web spherical expression was rotated 90 degrees in local XY.
- Native spread uses `rand15 % (trunc(spread*0.5*100)+1)` and
  `rand15 % 628`. Native `randvel` reset jitter uses
  `rand15 % trunc(randvel*100)` and a second random integer's low bit for the
  sign. Normalized-float buckets are removed from these reset paths.
- Focused runtime regression is `78/78` passing and the backend build passes.
- A static `plc_t04` preflight passed before one fresh Web recording. The
  comparison reuses the saved NWN MP4 and is documented in
  `evidence/vfx-placeable-post-debt-2026-07-14/post-debt-enon-bakery-plc-t04-10s-8fps-proof-v47-aurora-spread-axis.md`.
- The synchronized frame confirms that the dark star-shaped center exists in
  NWN as well as Web. Color, plume silhouette, scene/postprocess and visible
  instance-count gaps remain open, so this is not canonical parity.

### 11. Row22 Chunk placeholder repair and native scale audit

- The mixed textured/Chunk renderer created an orange wireframe diagnostic box
  whenever the textured draw count was zero, even if valid Chunk model
  instances remained. The diagnostic is now emitted only when both textured
  draws and Chunk models are absent.
- Focused regression:
  `frontend/tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts`,
  `does not add a diagnostic box when only mixed-package chunk models remain`.
  The canonical renderer suite passes `47/47`.
- Native `nwtoolset.exe` assembler at `0x00A31070` passes particle position to
  the Chunk model through virtual slot `+0x58` and axis-angle orientation
  through slot `+0x5c`. It does not pass emitter `sizeStart` or `sizeEnd`.
  The imported `fx_rockchunksml` template scale therefore remains `1,1,1`;
  multiplying it by the emitter size would be an unsupported visual guess.
- Fresh Aurora Web MP4, exactly one trigger, no loop, no diagnostic geometry:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row22/aurora-web/aurora-web-row22-one-trigger-20260717-placeholder-fix-cdp-v55.mp4`.
  It contains 112 deterministic frames at 8 fps over 14 seconds and has SHA256
  `31cef4afab5842273902491abfcb28cdbf204f746a25c5210c763459291c9882`.
- The saved NWN oracle was reused without rerunning NWN:
  `evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4`.
- Fresh synchronized comparison:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row22-20260717-placeholder-fix-cdp-v55-pixel-aligned.mp4`.
  The comparison SHA256 is
  `37ef72df6d1f1c0fcc8e603b9921040bf258d28713c4fedee3547f2805642a97`.
- Result: the orange rectangle is gone. Parity remains open because the saved
  NWN oracle contains the retail area floor and two lit subjects, while the
  current Web proof is an isolated black scene. Source-light spill, Chunk
  readability, material response and scene/camera matching must be evaluated
  in the real area integration before changing particle scale or color.

## Remaining implementation work

### P0 - required for general runtime correctness

1. Completed 2026-07-16: add a scene-instance VFX runtime service that supplies
   the selected area's source-precedence WOK instances to `bounce=true`
   texture/Chunk emitters. Catalog payloads preserve the exact replay command;
   the workspace supplies area and object transforms and deduplicates requests.
   Matched visual collision proof remains P2.
2. Completed 2026-07-16: recover and connect the native
   `worldtimerTimeOfDay` writer and units. The source-hashed `module.ifo`
   contract drives the integer millisecond scene clock; matched flowmap proof
   remains P2.
3. Completed 2026-07-16: carry native primary render-queue keys through the
   canonical Three adapter. Camera depth is primary; the signed source short is
   consulted only for the same non-empty scene-instance context. Matched visual
   overlap proof remains P2.
4. Completed 2026-07-16: source-exact Single and Lightning schedulers now use
   the native truncate helper, lifecycle ordering, delay-cache behavior,
   recovered Lightning axes and bounded modulo jitter. Remaining
   Explosion/P2P equations may still be closed only from decompilation or
   runtime dumps; matched visual evidence remains P2.
5. Completed service boundary 2026-07-16: Type 7 can resolve live source and
   target `CAurPart` position/orientation for every runtime time. Connect the
   production actor animation state to that resolver. The current fixture is
   base-pose static and must not be called full host attachment parity.

### P1 - required for visual/material parity

1. Completed 2026-07-16: MTR `twosided` wrapper argument `1` disables state 3
   (`GL_CULL_FACE`), argument `0` remains on enabled `GL_BACK`, no `glFrontFace`
   write occurs, and textured emitters retain the later `twosidedtex` override.
   Matched visual proof remains P2.
2. Completed 2026-07-16 for the row-22/default slice: recover the Chunk
   `impact` once-on-activation scheduler and ordinary model lit/cull/depth
   defaults. Continue only the broader custom model material branches and
   matched visual proof.
3. Completed 2026-08-07 for source WOK AABB: recovered fields, direction mask,
   child ordering, leaf-only face selection, and shared endpoint shortening.
   Flat scan remains only for packets without a complete decoded source tree.
   Aurora's separate world-scene plane BSP is not reconstructed. Fresh v78
   proof records one Web playback with proof-gate PASS and compares it with the
   reused saved NWN MP4; open camera/scene/timestamp gaps keep the result
   diagnostic-only rather than parity.
4. Completed 2026-08-13: geometry shaders and custom programs on skinned
   meshes fail closed before material replacement. Distinct
   `geometry-shader-unsupported` and `skinned-mesh-binding-unavailable`
   reasons are retained in material telemetry; focused regressions prove that
   neither path installs an invented WebGL program.
5. Completed 2026-08-07: PLT generated-target/sampler semantics and retail
   palette source are implemented from admitted primary resources. Matched
   retail visual output remains P2.
6. Completed 2026-07-18 for textured-particle vertex geometry: all render
   modes `0..6` have source-backed basis/topology coefficients. Corrected
   mode-1 local `X/Y`, modes 3/6 full-3D reciprocal normalization, mode-4
   signed world Z, mode-5 reflected winding, and mode-6 trailing alpha.
   Matched visual proof remains P2 and is not an implementation blocker.
7. Completed static slice 2026-07-16, corrected 2026-08-12: row216 Type 7
   base-pose endpoints, attach-time current-root-Z `RotationArc`, its
   first-control overwrite, native first-match DFS and `Linked` segment
   width/endpoint geometry are repaired. The duplicate post-conversion winding
   reflection is removed. Per-frame host attachment, host-scene occlusion,
   Normal flare appearance and complete capture postprocess remain open before
   matched visual parity can be claimed.
8. Implement the recovered retail postprocess chain only after its live
   dynamic-contrast lighting inputs are available. The saved profile enables
   sharpen, dynamic contrast (`intensity=0.15`, `midpoint=0.4`) and vibrance
   (`0.7`) after bloom; applying only visually selected constants is forbidden.
9. Completed 2026-08-07: TXI `proceduretype cycle` uses one texture-owned
   clock guarded by a global renderer-frame serial, the strict native
   threshold, dropped residual time, and at most one atlas step per renderer
   frame. The shared path covers ordinary models and canonical VFX Chunk
   instances. Matched visual proof remains P2.

### P2 - proof work, not an implementation blocker

1. Reuse saved NWN MP4s; do not rerun a VFX merely to obtain another copy.
2. Trigger fire-and-forget VFX exactly once. For duration effects, set the same
   duration in NWN and Aurora Web.
3. Capture one Web playback per meaningful implementation revision, with no
   loop, overlap or duplicate trigger.
4. Match camera, target scale, environment, HDR/bloom and duration before
   attributing a spatial/color difference to particle code.
5. Produce parser, resolver, runtime, render, capture and comparison artifacts
   for the exact fixture before marking it canonical.

## Source audits refreshed

- Particle shader audit:
  `artifacts/vfx-particle-shaders-2026-07-19/active-retail-particle-shader-audit.json`
  - status: `active-retail-particle-shader-sources-recovered`;
  - active `fsparticle` SHA-256:
    `acdea921e80243549205d86ffde2119af97a697443f27dcf6ee5e8798deb2816`.
- MTR/framebuffer audit:
  `artifacts/vfx-material-framebuffer-2026-07-15/retail-material-framebuffer-audit.json`
  - status:
    `retail-mtr-framebuffer-pass-and-custom-shader-source-graph-recovered`.
- Bloom audit:
  `artifacts/vfx-bloom-2026-07-15/retail-bloom-shader-audit.json`
  - status: `retail-bloom-source-and-default-profile-recovered`.
- Postprocessing audit:
  `artifacts/vfx-postprocessing-2026-07-19/active-retail-postprocessing-shader-audit.json`
  - status: `active-retail-postprocessing-sources-recovered`;
  - recovered order: sharpen, dynamic contrast, vibrance;
  - capture profile: enabled/enabled/enabled, `0.15`, `0.4`, `0.7`;
  - active `inc_config` selects color-correction type `4`; the previous
    base-first audit and Web type-`1` brightness-sum branch are superseded;
  - live area ambient/diffuse/fog and source-MDL local-light inputs are now
    implemented;
  - the exact local-light alpha sign/range, view/projection attenuation and
    HDR `max(0, 1-brightness^2)` clamp are covered by regression tests;
  - unproven `placeables.2da`, item-property and tile-light input mappings
    remain open and deliberately excluded.
- Local MTR inventory:
  `artifacts/vfx-material-framebuffer-2026-07-15/local-mtr-framebuffer-fixtures.json`
  - containers: `183`;
  - materials: `2,808`;
  - framebuffer candidates: `6`;
  - failures: `0`;
  - shader roots: `2`;
  - selected resources: `8`;
  - complete shader graphs: `1`.

The selected complete local graph is the HAK-priority
`shd_flowmap_vs`/`shd_flowmap_fs` graph used by `mtr_fm01_*` materials with
`sample_framebuffer 2`.

## 2026-08-07 shared PLT RGBA/generated-target slice

The Aurora-first audit in
`vfx-plt-palette-generated-target-audit-2026-08-07.md` closes palette source,
orientation, alpha, generated-target, and sampler semantics from the admitted
Toolset binary and active retail resources. All seven source palettes are
row-reversed uniformly; layers `0..9` map to the recovered skin, hair,
armor01, armor02, cloth, leather, and tattoo blocks; and `fs_pltgen` writes the
entire palette `vec4`.

Aurora Web now generates deterministic RGBA tables directly from verified
KEY/BIF resources, preserves palette alpha, removes the exceptional
`pal_armor01` orientation, and configures every generated PLT target as linear
RGBA with the recovered native sampler defaults. The shared implementation is
used by VFX/Chunk models, placeables, creatures, and items. No effect-specific
condition was added.

The generated module SHA-256 is
`0AF1F3256C88DFC2D080064651404548DD19F9487D5FF793BCB30643F54FF9BA`.
Focused tests pass `54/54`, TypeScript passes on frontend and backend, and both
production builds pass. This closes the implementation gap but not visual
parity: no exact saved retail PLT scene/camera/material oracle was available,
so no NWN rerun or unpaired Web playback was performed.

## 2026-08-07 shared Chunk material-routing slice

The Aurora-first audit in
`vfx-chunk-shared-material-routing-audit-2026-08-07.md` identifies a Web-only
routing defect: canonical Chunk instances bound one diffuse reference instead
of using the shared Aurora model-material adapter. Chunk model instances now
inherit the same inline source-MDL texture-slot handling as other MDL model
consumers, including supported diffuse, normal, specular, roughness, height,
emissive, alpha, self-illumination, and source-material-lighting paths.

The canonical lane disables guessed single-texture fallback and records sorted
resolved/unresolved references per instance. The focused regression began red
with an undefined Chunk normal map and is now green; the complete canonical
renderer passes `68/68`, shared texture mapping passes `43/43`, and frontend
TypeScript passes. The follow-up in
`vfx-chunk-mtr-shd-txi-transport-audit-2026-08-07.md` closes packaged
MTR/SHD/TXI transport. Matched retail pixels remain open.

## 2026-08-07 shared Chunk MTR/SHD/TXI transport slice

The Aurora-first audit in
`vfx-chunk-mtr-shd-txi-transport-audit-2026-08-07.md` confirms that the backend
catalog already transported MTR nodes, reachable SHD source graphs, and TXI
texture bindings. Canonical Chunk creation omitted those sidecars even though
the shared model-material adapter already consumed them for other model hosts.

Every Chunk clone now receives the package in initial workspace rendering,
deferred model and texture refreshes, collision-runtime refresh, and nested
Chunk runtimes. The change has no VFX row, model, emitter, host, or Fireball
condition. The canonical renderer passes `69/69`, workspace integration passes
`16/16`, shared texture mapping passes `43/43`, and frontend TypeScript passes.
No visual playback was made because the saved row-22 oracle does not exercise a
Chunk sidecar material; matched material proof remains open.

## 2026-08-07 TXI cycle global frame-clock slice

The Aurora-first audit in
`vfx-txi-cycle-global-frame-clock-audit-2026-08-07.md` recovers the native
`proceduretype cycle` constructor and update loop from the admitted Toolset
binary. Aurora advances on the strict `1/fps < accumulator` threshold, drops
residual time after a step, wraps over `width * height`, and guards each
procedure against a second update in the same global renderer frame.

Aurora Web now stores this state by shared `THREE.Texture` identity and drives
placeables, doors, items, creatures, and canonical VFX Chunk instances from
one workspace frame serial. Dev telemetry exposes frame, accumulator, serial,
advance count, registered objects, and texture references. Focused shared and
canonical suites pass `130/130`; creature/ordinary-model checks pass `2/2`;
the asynchronous ordinary-placeable integration check passes `1/1`; and
frontend TypeScript passes. No Web or NWN playback was made because the saved
row-22 Fireball oracle does not contain a multi-frame TXI cycle contract.
The frontend production build also passes.

## 2026-08-07 retail SSAO scene-pass slice

The Aurora-first audit in
`vfx-retail-ssao-runtime-contract-audit-2026-08-07.md` recovers the active
retail SSAO profile, three-subvariant pass order, shader constants, source
hashes, and final `GL_ZERO`/`GL_SRC_ALPHA` scene multiplication. Aurora Web now
runs the shared perspective SSAO stage before raw-gamma VFX, bloom,
postprocess, and output gamma. Orthographic cameras skip with an explicit
diagnostic; there are no per-VFX or Fireball conditions.

The focused suites pass `47/47`, the broader shared regression passes
`207/207`, TypeScript passes, and the frontend production build passes. A
perspective WebGL preflight compiled the shader and reached proof-gate `pass`.
Fresh Web v83 records exactly one playback, no loop or overlap, clean
post-roll, zero final particles, and active three-pass SSAO telemetry. The
saved NWN MP4 was reused without rerun. Web MP4 SHA-256 is
`42660B0E09CE299E438D0DC286AA760A2A388900C935DC1720BB5E75E8C2680D`;
comparison MP4 SHA-256 is
`2744AECAA5D3FEB6B3385ECC457A6664FFA4887644041C4A2D42332A6E256C18`.
The result remains diagnostic-only because camera, actors, full room,
owner/target, and NWN per-frame runtime timestamps are not matched, and the
Fireball composition still differs visibly.

## Verification

- Frontend focused scene-runtime/payload/worldtimer tests: `160/160` passed.
- Backend focused catalog/schema/area/WOK/worldtimer tests: `198/198` passed.
- Visual-correlation runner self-test: passed.
- Backend `npm run build`: passed.
- Frontend production build: passed.
- ProgFX parser suite: `16/16` passed.
- Current focused Type 7 attachment/application suites cover non-identity
  attach-time current-root-Z arc composition, first-control source-orientation
  overwrite, external target replacement and duplicate-name native DFS
  traversal.
- Frontend canonical renderer suite: `47/47` passed, including exact recovered
  Linked transverse/longitudinal vertices and camera-front-facing Three-space
  winding after source conversion, plus the mixed textured/Chunk diagnostic
  placeholder regression.
- Fresh row216 Type 7 Web proof: one trigger, diagnostics off, 20-second effect
  in a 24-second recording; the comparison reused the existing NWN MP4. Exact
  BIC-derived `pfh0`, `ReattachReference` root arc and anchor-calibrated proof
  camera are present. The 2026-08-13 contour audit measures matching normalized
  outer proportions and confirms that authored `inherit=1` frame reprojection
  is active. Missing host actors, their occlusion and matched scene projection
  keep parity open; the exposed Web target crossing is not a P2P tuning defect.
- Source audits above: passed and regenerated.
- Strict parity validator: expected non-zero result:
  - fixtures: `10`;
  - canonical allowed: `0`;
  - blocked by missing evidence: `10`;
  - missing retail build: `10`;
  - missing source admission: `6`;
  - missing parser snapshot: `10`;
  - missing resolver trace: `10`;
  - missing runtime tick dump: `10`;
  - missing render-contract snapshot: `10`;
  - missing capture reference: `10`;
  - missing comparison: `10`.

The validator result is a proof work queue, not a reason to stop implementing
the P0/P1 gaps above.

## 2026-07-18 dynamic-contrast implementation slice

The live postprocess midpoint now follows `inc_postpr_dyn_c` for source-labelled
area lights, raw ARE fog fields and proven source-MDL point lights. The local
path preserves `ambientOnly` through signed range-squared alpha, applies
projected-screen attenuation only to diffuse lights, and uses the saved NWN
capture profile's cutoff-range multiplier `2.0`. Canonical VFX, placeable and
creature source-MDL adapters share the same resolver.

Activating the path revealed and closed a separate shader-port defect: the Web
fragment shader omitted Aurora's non-negative HDR brightness clamp. The first
capture containing black core holes is rejected. The accepted one-trigger Web
MP4 and the saved NWN oracle are compared in
`evidence/vfx-nwn-broad-proof-2026-07-16/row181/comparison-dynamic-contrast-20260718/`.
The comparison remains non-parity because core temperature/width, scene
illumination and visible trail duration still differ.

## 2026-07-18 render-mode geometry slice

The complete source comparison is
`vfx-render-mode-geometry-audit-2026-07-18.md`. The canonical renderer now
matches `FUN_00a2e250` for modes `0..6` at the vertex-builder boundary:

- `Linked` and `Motion_Blur` scale camera projections by reciprocal full 3D
  segment length, not reciprocal 2D projected length;
- Motion Blur previous-endpoint alpha is
  `min(evaluatedSizeX / full3dSegmentLength, 1) * alpha`;
- `Billboard_to_Local_Z` uses emitter-local Aurora `X/Y` around local `Z`;
- source-derived modes `1`, `2`, and `5` preserve front-face winding after
  the reflected `C=(x,z,y)` mapping;
- `Aligned_to_World_Z` preserves the native camera-dependent sign of global
  Aurora `Z`.

Focused canonical renderer verification passes `51/51`. No NWN process was
started. Rows `44` and `50` are not valid comparison oracles. Row `216` now
has a fresh one-trigger Web MP4 and synchronized comparison under
`row216/comparison-render-modes-full3d-20260718/`; the saved NWN MP4 was reused
without rerun. The result is improved but remains non-parity because scene,
actors, screen-space anchors and saturation distribution are not matched.

## 2026-08-13 proof-scene and preview-orientation closure

- Exact packed-module HAK precedence supersedes the historical base-key-only
  row 44, row 50, and AOE0 scene packs. `q_tilesets.hak` supplies the selected
  `tin01.set`, resolves both tile-364 instances as `gin01_h01_08`, and raises
  all three proof scenes from 2/4 to 4/4 admitted tiles with zero unresolved
  indexes. Source tile-light nodes are retained. See
  `vfx-proof-scene-hak-precedence-closure-audit-2026-08-13.md`.
- Row 50 now has a current four-tile one-playback Web v16 proof and a
  frame-preserving comparison with the saved NWN recording. The camera uses a
  documented longitudinal fit, not a claimed native transform. Scene/camera
  context is materially improved, but the retail body column remains taller
  and more translucent than the lower, wider, more saturated Web composition.
  See `vfx-row50-proof-camera-source-audit-2026-08-13.md`.
- The canonical renderer already converted reflected axis-angle orientations
  as `-C*axis`. The separate catalog/placeable source-MDL preview adapter used
  `C*axis`, reversing every non-zero emitter rotation in that path. A shared
  test-first correction now serves static and animated emitter transforms;
  the full render-mode regression passes `124/124`. No per-effect condition
  was introduced. See
  `vfx-placeable-emitter-reflected-orientation-audit-2026-08-13.md`.
