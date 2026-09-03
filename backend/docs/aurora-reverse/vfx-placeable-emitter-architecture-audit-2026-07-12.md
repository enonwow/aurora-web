# VFX and Placeable Emitter Architecture Audit — 2026-07-12

## Scope and evidence boundary

- Read-only Aurora reference: `C:\Projects\New Folder`.
- Audited implementation: `C:\Projects\aurora-web`.
- Compared capabilities: pure/canonical VFX emitters and source-MDL emitters hosted by placeables.
- This is an Aurora-first architecture and completion audit. Local tests and captures are not retail parity evidence.

## Aurora findings

Aurora uses one MDL node hierarchy rather than separate emitter implementations for VFX and placeables.

- `C:\Projects\New Folder\export\decompiled_all.c:886249` selects the `emitter` node constructor.
- `decompiled_all.c:886261` selects `light`.
- `decompiled_all.c:886273` selects `trimesh`.
- `decompiled_all.c:886285` selects `animmesh`.
- `decompiled_all.c:886297` selects `danglymesh`.
- `decompiled_all.c:886309` selects `reference`.
- `decompiled_all.c:886362` assigns the parsed node to the common parent.
- `decompiled_all.c:348244` loads `visualeffects.2da`.
- `decompiled_all.c:853987-854022` maps `Normal` to runtime blend bucket `0`, `Punch-Through` to `1`, and other preserved tokens, including authored `Lighten`, to bucket `2`.

Conclusion: the target architecture is one model graph containing geometry, emitters, lights, references, and animations. Pure VFX and placeables are different hosts/owners, not different emitter engines.

## Current Aurora Web architecture

Aurora Web currently has two emitter implementations:

1. Pure VFX uses the backend `AuroraEmitterRuntimeState`, renderer-agnostic draw records, and `createAuroraVfxCanonicalRenderGroup`.
2. Placeables use `createPlaceableVfxPreviewGroup` / `createPlaceableVfxEmitterPreviewGroup`, which evaluate and render emitter behavior independently in the frontend.

The split is implementation debt and is not supported by the Aurora model hierarchy.

## Completion matrix

| Capability | Status | Evidence / boundary |
| --- | --- | --- |
| ASCII and binary emitter parsing | Strong local implementation | Emitter provenance, transforms, orientation, atlas, simulation fields, controllers, animation events, references, source state, and light nodes are preserved. |
| Full MDL model graph | Partial | Source parser and placeable transport now preserve static `trimesh`/`animmesh`/`danglymesh`/`skin` nodes plus binary mesh-node provenance. References and full controller/evaluation provenance are still incomplete. |
| Fountain runtime | Strongest local runtime family | Deterministic RNG, spawn gate, lifetime, active/free lists, recycling, trail spawning, particle rotation, and snapshots. Retail parity remains unproven. |
| Single / Explosion / P2P / Lightning / Chunk | Partial diagnostic implementations | Family gates and local deterministic diagnostics exist. Several paths explicitly require retail runtime dumps; chunk canonical rendering now has local web-runtime model preview proof, and linked chains now use local contiguous segment topology. Retail/Aurora parity remains open. |
| Renderer-agnostic draw contract | Strong local implementation | Textured/linked draw records, atlas UV, color, alpha, size, rotation, render/blend lanes, and chunk-lane separation. |
| Pure VFX canonical frontend renderer | Partial | Textured draw records now render from ordered `runtimeEmitters[]` contracts, including separate emitter textures and render-mode basis geometry. Chunk model lanes preserve resolved model candidates, can load host GLB/GLTF templates, and can instance local model previews, but retail proof remains open. |
| Placeable emitter payload | Broad local transport | Multiple emitters, textures/chunks, transforms, animation summaries, simulation timelines, source-state flags, raw direct/key/bezier controller rows, and evaluation passes are transported. The shared runtime does not yet consume the full provenance. |
| Pure VFX multi-emitter packaging | Partial | `VfxProcessCommand.sourceEmitters[]` now preserves ordered source-MDL emitter arrays through dependency graph, backend runtime ticks, snapshots, render contracts, scene payload normalization, and canonical frontend textured rendering. Legacy `sourceEmitter`, `runtimeState`, `runtimeSnapshot`, and `renderContract` remain as first-emitter compatibility aliases. |
| Placeable emitter preview | Broad but non-canonical duplicate | More than one hundred tests cover local render modes, atlas, P2P, linked, chunk, animations, source state, and multi-emitter behavior. This is a separate simulator/renderer. |
| Full VFX placeable composition | Implemented for source-proven static MDL geometry | A VFX host now derives and attaches the matching static GLB only when its source MDL contains static geometry; emitter-only VFX does not receive a speculative model. `plc_t04` proves the static `plc_trans` quad plus flame and smoke. |
| Hybrid source-MDL emitter plus light | Partial local composition | Catalog decoration and the frontend can compose a static model, canonical emitter, and source-MDL light sibling under one root, but no current live VFX catalog fixture provides all three source lanes. Aurora/NWN/Toolset proof is open. |
| Retail parity | Blocked | The retail fixture registry has zero canonical-allowed fixtures; current captures and local gates are diagnostic evidence only. |

## Critical findings

### P0 — two runtime sources of truth

Backend pure VFX and frontend placeable preview separately implement spawn, clocks, animation selection, motion, target behavior, atlas playback, render modes, and material decisions. Fixes can land in one implementation and not the other.

### P0 — VFX subtype suppresses required placeable geometry

`frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts` makes static VFX model rendering conditional on no emitter preview. Once a source-MDL emitter is detected, `shouldRenderVfxAsStaticModel` and then `shouldUsePlaceableModel` become false.

### P0 — emitter payload suppresses source-MDL light collection

`backend/src/modules/catalog/application/catalog.application.service.ts` returns from Aurora light decoration when an emitter payload is present. This contradicts the shared Aurora MDL hierarchy.

### P0 — canonical routing regression

The focused frontend run produced 132 passing tests and one failing canonical routing test. The backend-marked canonical root was created, but the expected canonical draw mesh was absent.

### P1 — single-emitter pure VFX processing contract

`VfxApplicationService` now accepts ordered `sourceEmitters[]` for pure VFX backend packaging, and the frontend canonical renderer consumes `runtimeEmitters[]` for textured draw contracts. Legacy compatibility fields still expose the first-emitter render contract. Placeable payloads already support emitter arrays.

### P1 — canonical frontend render-mode geometry is partial

`buildCanonicalTexturedQuadGeometry` now chooses a render-mode basis per draw record for camera/world-Z style billboards and velocity-aligned particle/motion-blur records. This removes the original all-XY-only behavior for the first geometry slice. Linked segment topology, chunk-model drawing, camera-facing retail parity, and Aurora/NWN pixel proof are still open.

### P1 — source data is narrowed in the placeable bridge

The placeable package carries semantic simulations and timelines but drops raw `directRows`, `keyRows`, `bezierKeyRows`, `animationPasses`, and full controller provenance available in `AuroraMdlEmitterNode`.

### P1 — gate and documentation drift

The local aggregate VFX gate passed 3 of 7 commands. Failures included a Lightning diagnostic expectation mismatch, missing older threshold artifacts, a contract visual-evidence script exception, and 30 missing catalog guardrail checks. The checklist/contract still labels blend factors pending in places where later decompilation evidence recovered them.

## Verification snapshot

Commands executed during the audit:

- Backend focused Jest: 3 suites, 58 tests passed.
- Frontend focused Vitest:
  - canonical renderer: 9/9 passed;
  - placeable VFX renderer: 122/122 passed;
  - canonical object-layer routing: 1/2 passed, 1 failed.
- Backend local VFX diagnostic gate:
  - 7 commands total;
  - 3 passed, 4 failed;
  - 11 runtime cases, 10 passed, 1 failed;
  - canonical promotion attempts: 0.

The initially invoked frontend package script expanded to the full unit suite and exposed unrelated Area/creature failures. Those failures are not counted as emitter audit failures.

## Remediation plan

1. Introduce one `AuroraMdlModelGraph` preserving geometry, emitters, lights, references, parent relationships, and animation/controller provenance.
2. Make the backend `AuroraEmitterRuntime` the single simulation source for pure VFX and placeables.
3. Extend runtime packaging from one emitter to an ordered emitter array with shared model/effect clock and per-emitter state.
4. Complete runtime families beyond Fountain using Aurora evidence and retail dumps instead of local placeholders.
5. Make the canonical renderer implement render-mode geometry, linked/motion-blur lanes, and chunk-model drawing from shared draw contracts.
6. Host the same canonical output in two thin owners:
   - pure VFX: effect/model root;
   - placeable: static model graph plus emitter and light children.
7. Remove the static-model suppression and emitter-vs-light early-return logic.
8. Migrate valuable placeable-preview tests into shared runtime/render-contract convergence tests, then delete the duplicate simulator.
9. Repair stale/broken local gates before using them as completion evidence.
10. Produce Aurora comparison proof for pure VFX and hybrid placeables.

## Remediation phase breakdown

The remediation plan is tracked as concrete phases so local implementation progress cannot be mistaken for final Aurora/NWN parity:

| Phase | Scope | Completion gate | Current status |
| --- | --- | --- | --- |
| P0 - source-MDL composition | Preserve and render one Aurora MDL tree containing static geometry, emitters, and lights. | `plc_t04` local web proof shows static geometry, flame/smoke emitters, and light siblings without emitter/light mutual exclusion. | Locally implemented/proven. |
| P1 - shared VFX contract surface | Carry ordered emitters through backend runtime packages, scene payloads, canonical renderer, chunk lanes, linked topology, motion-blur basis, and local gates. | Focused backend/frontend tests plus `test:vfx:local-diagnostic-gate` pass with `canonicalPromotionAttemptCount=0`. | Locally implemented for the audited diagnostic surface; duplicate preview fallback still exists for non-canonical/placeable-only cases. |
| P2 - thin host convergence | Pure VFX and placeable hosts select the same canonical output whenever backend canonical payloads exist, with placeable preview retained only as non-canonical fallback. | Backend-marked canonical placeable payloads cannot also attach the source-MDL placeable-preview emitter overlay; `plc_zlc_o45` now has a web/CDP proof packet where the catalog preview route reports backend canonical payload + canonical renderer ready and no source-MDL emitter overlay. | Locally implemented for the audited emitter-only catalog route; hybrid light convergence and retail/Aurora proof remain open. |
| P3 - runtime-family parity hardening | Replace local placeholder semantics for non-Fountain families with Aurora/NWN evidence and retail runtime/render dumps. | Runtime tick dumps and render-contract snapshots exist for each audited family, including chunk Type 9 real source/resource evidence. | Open. |
| P4 - Aurora/NWN/Toolset comparison proof | Compare web output with saved Aurora/NWN/Toolset oracle artifacts for pure VFX and hybrid placeables. | Saved browser artifacts, Toolset/Aurora captures, framebuffer comparisons, and human-review results exist for each claimed fixture. | Open and required before completion. |

### P3 concrete work packages

P3 is deliberately split so a passing local diagnostic cannot silently stand in for a retail runtime family:

| Work package | Scope | Required evidence to close | Current state |
| --- | --- | --- | --- |
| P3-A - source/context admission | Bind every audited family to an admitted `visualeffects.2da` row, effect constructor, target/effector context, source model, resource profile, and hashes. | Fixture pack contains source snapshot, resolver trace, effect context, and selected retail build/profile. | Open for all retail fixtures; placeable source-MDL packages intentionally remain context-less and carry `VFX_PLACEABLE_EFFECT_INSTANCE_CONTEXT_MISSING`. |
| P3-B - runtime-family observations | Replace diagnostic-only timing assumptions for Single, Explosion/detonate, P2P, Lightning, and Chunk with measured retail tick sequences. | Per-family retail runtime-tick dump at the declared capture times, including detonate, target, or source/target lifecycle where applicable. | Open; local state-machine checks are useful regression guards only. |
| P3-C - shared render-contract convergence | Keep pure VFX and placeable hosts on the shared backend runtime/render-contract path whenever both have the same admitted source/context. | Matching ordered runtime emitter snapshots and render contracts, with an explicit divergence record when the placeable has no effect-instance context. | Partial locally; canonical placeable payload is shared-runtime output, but its source table is a diagnostic carrier rather than an admitted effect row. |
| P3-D - chunk-model resource proof | Prove Type 9 from source `chunkName` through selected retail resource, runtime model instance behavior, and a saved capture. | Resolver trace with retail-selected model/hash, runtime dump, render-contract snapshot, and Aurora/NWN capture. | Open; local dependency graph and canonical model lane preserve a selected local candidate without retail authority. |
| P3-E - non-promotion guard | Keep local outputs explicitly diagnostic until P3-A through P3-D evidence is complete. | Fixture manifest gate reports every incomplete family blocked and no canonical promotion is attempted. | Enforced by the local gate and fixture manifest. |

Fresh local P3 baseline, 2026-07-13:

- `npm.cmd run test:vfx:local-diagnostic-gate -- --out backend/docs/aurora-reverse/artifacts/vfx-iteration-213/vfx-local-diagnostic-gate-report.json` passed all 7 commands.
- The report records 11/11 local runtime cases, 10/10 threshold fixtures, 20 checked frames, 31 semantic requirements, and `canonicalPromotionAttemptCount=0`.
- This is only the P3-E guardrail baseline. It does not close P3-B or P3-D and is not Aurora/NWN/Toolset parity evidence.
- `npx.cmd ts-node --transpile-only scripts/validate-vfx-retail-parity.ts` intentionally remains non-zero: the manifest has 10 fixtures, 0 canonical-allowed fixtures, and 10 blocked fixtures. Every fixture lacks retail build, parser, resolver, runtime-tick, render-contract, capture, and comparison evidence; six also lack admitted source evidence. That validation output is the current P3-A/P3-B/P3-D/P4 work queue, not a passing gate.

### P4 execution preflight - 2026-07-13

`backend/scripts/audit-vfx-retail-runtime-readiness.mjs` records the live machine preconditions without opening a client window or changing the active Toolset session. The saved result is `backend/docs/aurora-reverse/artifacts/vfx-iteration-213/p4-retail-runtime-readiness.json`:

- Steam `nwmain.exe` and `nwtoolset.exe` are installed, and both `tlc_vfx_catalog_lab.mod` plus `tlc_vfx_catalog_lab_iter1.mod` are present in the NWN modules directory.
- The one live Toolset session is intentionally left untouched: it owns `the_last_city - codex.mod`, area `appearance`, and is not a VFX lab session.
- No current `aurora-live-evidence/vfx-capture-clips` directory exists. The legacy VFX client launcher is explicitly retired because it launched and moved `nwmain.exe` without the current safety boundary.
- The preflight remains `manual-retail-runtime-capture-required` with 10 blocked fixtures and 0 canonical-allowed fixtures. It is a capture-readiness artifact only; it neither launches NWN nor contributes retail visual proof.

### P4 guarded lab launch - 2026-07-13

The first guarded retail-lab setup now exists, without disturbing the active Toolset session:

- `create-vfx-catalog-lab-map.mjs` built the queue from Last City `visualeffects.2da` (11,084 rows; 3,231 active; SHA-256 `1a024ebbf55cab2300c98ba45f2927d6ce0f860d8169eef1afe3b8695f2d71b7`) and `progfx.2da` (1,301 rows; 368 active; SHA-256 `1e1375902697f42aacdf2b5d7220a6c5f3a9bd4b7546d5eabae476ab303ea928`).
- Fixture `vfx-retail-scripted-effectvisualeffect-row-50` was compiled as `vfxrt00050.ncs` and injected only into the separate VFX lab copy. That row is `VFX_IMP_DEATH`, an instant object effect with a four-second capture window.
- The Unicode lab copy was deliberately mirrored into the ASCII launch alias `tlc_vfx_catalog_lab.mod`; its previous alias was saved as `tlc_vfx_catalog_lab.mod.pre-launch-alias-2026-07-13T11-36-02-334.bak`, and the copied module SHA-256 is `cb4298d03295e844b286163bdaedbac2da46e4c0f96d527dccfeacf5357ed883`.
- A separate NWN client then logged `Loading Module: tlc_vfx_catalog_lab`. A non-interactive frame capture is saved at `backend/docs/aurora-reverse/artifacts/vfx-iteration-213/row50-retail-lab-ascii-module-ready.png`; it visibly shows the laboratory stage and its test target.
- No input was sent to the NWN client, `vfxrt00050` has not been invoked, and no effect frame, MP4, timeline, resolver trace, or web-to-retail comparison exists yet. This is P4 readiness only and does not unblock any fixture or promote any parity claim.

### P4 one-shot NWN capture result - 2026-07-13

One and only one automated, non-interactive attempt was made after the user explicitly accepted an NWN-only proof path. The lab's existing `OnEnter` hook ran an armed `vfxlab_area` script with `VfxLabQueueRow(50, 12.0, 0.0)`; it applies `VFX_IMP_DEATH` to `effect_test` without mouse or keyboard injection. The client was then closed and no second launch or overlapping VFX run was performed.

- Saved raw material: `backend/docs/aurora-reverse/artifacts/vfx-iteration-213/row50-retail-nwn-capture/capture.mp4` (312 frames at 12 FPS) and `timeline.json`.
- The single-run still packet and target-region analysis are saved beside it as `single-run-before-effect-after.png`, `single-run-frame-analysis.json`, `target-region-single-run-timeline.png`, and `target-region-single-run-analysis.json`.
- The measured target-region delta is small and lacks an independent, visually identifiable `VFX_IMP_DEATH` signature. It may be ordinary scene/UI timing rather than a demonstrated effect.
- Therefore this one-shot material is retained as a failed/inconclusive capture attempt only. It is not fixture capture evidence, does not close P3-B or P4, and does not change the manifest's zero canonical-allowed fixtures. A later valid proof must use a fixture with an observable, context-correct signal and a single planned capture pass rather than repeatedly triggering the same effect.

### P4 comparison-proof contract

The durable operating standard is `backend/docs/aurora-reverse/vfx-proof-standard-2026-07-13.md`. This audit summarizes the gate; the standard owns the fixture, trigger, capture, comparison, and invalidation requirements.

A valid fixture is a synchronized lifecycle comparison, not a generic video of NWN:

- **Fire-and-forget effect:** arm one fresh fixture with no pre-existing `OnEnter`, heartbeat, replay, or module trigger; record one uniquely identified invocation, one baseline before it, the full visible effect, and its return to baseline. A second invocation invalidates that capture packet rather than improving it.
- **Duration effect:** make the declared duration an explicit shared input. For example, arm NWN with `ApplyEffectToObject(DURATION_TYPE_TEMPORARY, ..., 20.0)` and configure Aurora Web with the same `20.0` seconds. Save the requested duration, actual trigger time, frame timestamps, and lifecycle start/steady/end markers for both runtimes.
- **Comparison:** use the same fixture id, source row, source/profile hashes, target/context, camera, capture cadence, and timing origin. Compare the lifecycle at matched timestamps, not only one favorable still frame.
- **Admission:** a packet can be reviewed only when its trigger ledger proves one invocation and its frame/timeline artifacts prove the complete requested lifecycle. Missing trigger provenance, overlapping runs, or an undocumented duration makes the packet diagnostic-only and blocks promotion.

This contract is now the P4 completion gate for every claimed pure VFX or duration fixture.

## Implementation update - 2026-07-13 unified source-MDL graph/runtime admission

The next architecture slice removes a false boundary between pure VFX and placeable-hosted source MDL:

- `parseAuroraMdlVfxSource` now emits an ordered `AuroraMdlModelGraph` alongside its specialized node arrays. The graph preserves static geometry, emitters, lights, references, shadow blobs, parent links, source provenance, and model propagation tokens in source order. This follows the Aurora parser evidence that `emitter`, `light`, mesh, and `reference` nodes are siblings in one MDL hierarchy.
- The placeable `auroraModelGraph` transport now carries that structural node list and propagation events in addition to its static-geometry list. Legacy cache entries may omit the new fields; fresh source-MDL packages include them.
- A new backend `model_graph_runtime` package kind runs source-MDL emitters through the same Aurora emitter runtime and renderer contract as table-backed VFX, without fabricating `catalog-placeable-source-mdl.visualeffects.2da`. Its source policy, resolver candidates, and cache provenance identify the actual MDL asset and hash.
- Placeable payload construction now uses `model_graph_runtime` and source-MDL candidate records. The absent `EffectVisualEffect` instance remains explicit, so model-hosted emitters are not misrepresented as an admitted `visualeffects.2da` fixture.

Verification for this slice:

- Backend Jest: `test/unit/vfx.application.service.spec.ts`, `test/unit/vfx.schemas.spec.ts`, and `test/unit/aurora-vfx-mdl-nodes.spec.ts` - 28 passing tests.
- Backend TypeScript: `npx.cmd tsc --noEmit --pretty false` - passed.
- Frontend TypeScript: `npx.cmd tsc --noEmit --pretty false` - passed.
- Frontend placeable HTTP mapper: `tests/unit/modules/placeables/httpPlaceableApiPort.test.ts` - 12 passing tests.

## Implementation update - 2026-07-13 source-MDL light graph attachment

The canonical placeable VFX route now consumes the unified graph for source-MDL light placement after the static model loads:

- `source_mdl_graph` replaces the misleading `placeable_preview` source kind for `model_graph_runtime` payloads. It carries `previewMode: none`; the existing `localOnlyNotRetailEvidence` and `canonicalParityPromoted: false` gates remain mandatory.
- A canonical placeable light is attached only when its graph-confirmed light-node name is present in the loaded derived model. The light uses that source node's world transform every render, converted into the light group's local space.
- A missing graph node list, no graph light node, or a missing named node in the loaded model is explicit runtime evidence; the renderer does not invent an anchor, parent, or transform.
- This is deliberately light-node-only. Emitter particle records still carry source emitter positions in the shared runtime contract, and their parent-space composition must be recovered before the emitter can be reparented without double-applying a node transform.

Verification for this slice:

- Frontend TypeScript: `npx.cmd tsc --noEmit --pretty false` - passed.
- Frontend focused Vitest: `workspaceObjectMeshLayer.canonicalVfxRenderer`, `httpPlaceableApiPort`, and `auroraVfxPayload` - 26 passing tests.
- Backend TypeScript: `npx.cmd tsc --noEmit --pretty false` - passed.
- Backend VFX parser/runtime/schema Jest - 28 passing tests.

Remaining boundary: canonical emitter parent-space attachment, the remaining preview fallback paths, all family-level runtime semantics, and retail lifecycle proof packets are still open. This slice is not Aurora/NWN visual parity.

## Implementation update - 2026-07-13 Lightning source point-count correction

The shared Lightning runtime no longer invents an eight-segment preview chain. The local Aurora audit identifies the evaluated runtime slot `+0x58` as the Lightning active-point count and `ROUND` conversion; the source emitter's evaluated `birthrate` slot is the current typed input for that value.

- Lightning now rounds `simulation.birthrate`, caps it at the runtime particle limit, and reconciles the active list to that exact count.
- Missing source count and a truncated count of zero are explicit diagnostics. Zero clears active points with the distinct active/free-list reason `lightning_point_count_zero`; no minimum two-point chain is invented.
- The correction does not claim exact `lightningScale` jitter amplitude, delay-window reprojection, RNG helper distribution, or P2P target/reference resolution. Those remain source-guided implementation work followed by a valid lifecycle proof packet.

Verification: `test/unit/aurora-vfx-runtime-state.spec.ts` passed 26 tests and backend TypeScript passed.

## Implementation update â€” 2026-07-12

Implemented the first P0 composition slice from this audit, using the Aurora MDL hierarchy as the constraint:

- `aurora-mdl-vfx-source.parser.ts` now transports static geometry node provenance alongside emitter and light nodes.
- `PlaceableRenderPackage.auroraModelGraph` carries those nodes through backend and frontend contracts.
- VFX placeables no longer unconditionally skip derived model delivery. The backend inspects the source MDL first and derives a static GLB only when static geometry is actually present; this prevents emitter-only models from acquiring a speculative proxy mesh.
- The frontend composes that derived static model with the source-MDL emitter preview and the source-MDL light sibling instead of making them mutually exclusive.
- Legacy cache entries that already had an emitter payload are upgraded by rereading the source MDL for static geometry and light siblings; an existing emitter no longer suppresses that upgrade.
- Raw direct/key/bezier controller rows and full emitter animation passes now cross the placeable backend/frontend boundary unchanged, so a later shared runtime can consume provenance rather than reconstructed summaries.
- The proof route has explicit `emitterCameraTarget=placeable` framing and a neutral proof backdrop. Those are development-proof controls only; they do not change delivered model geometry or its material.

### `plc_t04` evidence

Aurora source inspection of `plc_t04.mdl` reports two mesh-node declarations (`Rectangle121`, `Plane25`), two emitters (`OmenEmitter240`, `fire!02`), and one renderable static mesh: a 4-vertex / 2-triangle `plc_trans` quad. The latter is intentionally transparent/dark, which is why it was invisible against the former dark capture background.

The final local proof packet is:

- PNG: `backend/docs/aurora-reverse/artifacts/placeable-vfx-emitters-2026-07-12/web-tm_pl_lightred-plc_t04-static-emitter-smoke-proof-v6-current.png`
- MP4: `backend/docs/aurora-reverse/artifacts/placeable-vfx-emitters-2026-07-12/web-tm_pl_lightred-plc_t04-static-emitter-smoke-proof-v6-current.mp4`
- Frame state: `backend/docs/aurora-reverse/artifacts/placeable-vfx-emitters-2026-07-12/web-tm_pl_lightred-plc_t04-static-emitter-smoke-proof-v6-current.frame.json`

The frame records `sourceMdlStaticGeometryNodeCount=2`, the two source node names, `emitterCount=2`, `visibleMeshCount=3`, loaded static model status, applied model textures, and nonzero particle/vertex draw metrics. The neutral backdrop exposes the actual transparent static quad without substituting any geometry or material.

The live post-restart API probe also returned a derived GLB, both static source-node names, and two source emitters with 33 direct controller rows and four animation passes each. This confirms that controller/pass provenance survives the complete backend delivery path for the proved fixture.

Verification completed for this slice:

- Backend focused Jest: 177 passing tests (`aurora-vfx-mdl-nodes` plus `catalog.application.service`).
- Backend production build: passed.
- Frontend focused Vitest: 155 passing tests (HTTP payload mapper, placeable VFX renderer, and catalog preview runner).

This is local implementation/proof only. It is not retail/toolset pixel parity, and it does not close the remaining single-runtime, multi-emitter, canonical render-mode, or gate-repair work below.

## Implementation update - 2026-07-12 P1 pure VFX emitter-array package

Implemented the first pure-VFX convergence slice after the P0 placeable composition work:

- `VfxProcessCommand` now accepts `sourceEmitters?: AuroraMdlEmitterNode[]` while preserving the existing `sourceEmitter` field for callers that still send one emitter.
- `VfxRuntimePackage.runtimeEmitters[]` now carries ordered per-emitter runtime output: `emitterIndex`, `emitterNodeName`, `runtimeState`, `runtimeSnapshot`, and `renderContract`.
- `dependencyGraph` is built from the full ordered source-emitter list, not only the first emitter.
- The runtime tick uses one shared `dtSeconds` and runtime options, while each emitter gets its own runtime state. The first emitter keeps the legacy seed for backward compatibility; later emitters derive deterministic per-emitter seeds from the base seed, node index, and node name.
- The legacy `runtimeState`, `runtimeSnapshot`, and `renderContract` fields remain as compatibility aliases for `runtimeEmitters[0]`.
- HTTP parsing accepts `sourceEmitters[]`, and the VFX process endpoint schema advertises it.

Verification completed for this slice:

- Backend focused Jest: `test/unit/vfx.application.service.spec.ts` - 7 passing tests.
- Backend VFX schema Jest: `test/unit/vfx.schemas.spec.ts` - 4 passing tests.
- Backend production build: passed.

Remaining boundary: this does not delete the duplicate placeable-preview simulator. It removes the pure-backend single-emitter bottleneck so the later shared-runtime and thin-host phases have an ordered emitter package to consume.

## Implementation update - 2026-07-12 P1 canonical frontend runtimeEmitters

Extended the pure-VFX emitter-array package through the scene payload bridge and canonical frontend renderer:

- `AuroraVfxPayloadContracts.runtimeEmitters` is preserved by scene payload normalization and cloning.
- `createAuroraVfxCanonicalRenderGroup()` now reads ordered runtime-emitter render contracts before falling back to the legacy single `renderContract`.
- Textured contracts from multiple emitters are rendered without collapsing to the first emitter. Per-emitter texture edges are resolved by dependency-graph `ownerPath`, and separate texture/material meshes are emitted when emitters use different textures.
- Root userData now exposes `auroraVfxCanonicalRuntimeEmitterCount` and `auroraVfxCanonicalRuntimeEmitterNodeNames`, while draw-record arrays remain ordered across emitters.
- Chunk-lane contracts are still preserved as diagnostics, not rendered as chunk models.

Verification completed for this slice:

- Frontend focused Vitest: `tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` and `tests/unit/modules/scene/domain/auroraVfxPayload.test.ts` - 17 passing tests.
- Frontend typecheck: `npx tsc --noEmit --pretty false` - passed.

Remaining boundary: chunk-model drawing, duplicate placeable-preview removal, repaired aggregate gates, and Aurora/retail comparison proof remain open.

## Implementation update - 2026-07-12 P1 canonical render-mode basis geometry

Extended canonical textured-quad geometry so render-mode contracts affect vertex positions, not only metadata:

- `buildCanonicalTexturedQuadGeometry()` now resolves a per-draw-record basis from Aurora render-mode enum/raw-token fields.
- `Billboard_to_World_Z` and unknown modes keep the previous camera-XY billboard fallback for compatibility.
- `Billboard_to_Local_Z`, `Aligned_to_World_Z`, and `Linked` use a world/local-Z vertical billboard basis.
- `Aligned_to_Particle_Dir` and `Motion_Blur` use runtime draw-record velocity as the alignment axis; motion blur applies velocity-scaled height only inside this canonical basis adapter.
- Geometry userData now records `auroraVfxCanonicalRenderModeGeometrySource`, basis modes, basis sources, and whether a velocity basis was used.

Verification completed for this slice:

- Frontend focused Vitest: `tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` - 12 passing tests.
- Frontend typecheck: `npx tsc --noEmit --pretty false` - passed.

Remaining boundary: this is contract-driven local geometry, not Aurora/NWN/Toolset visual parity. Linked remains a basis-only textured quad lane rather than a proven contiguous segment renderer, motion blur still lacks retail timing/endpoint proof, chunk-model drawing is not implemented, and saved comparison artifacts are still required before any parity claim.

## Implementation update - 2026-07-12 P1 chunk-model lane resource contract

Extended chunk-model lane data preservation without adding a fake textured fallback:

- `AuroraChunkParticleRenderLane` now carries `resourceResolveStatus` and optional `resolvedResource` copied from the dependency graph selected candidate.
- `buildAuroraVfxRuntimeRenderContract()` preserves resolved chunk model candidate fields such as resource key, source layer/path, hashes, candidate id, and precedence rank while keeping `drawLane: "chunk_model"`, `drawRecords: []`, and `drawVertexCount: 0`.
- `VfxResourceTraceInput` now accepts `candidateId` for selected and lower-precedence candidates so pure VFX resource traces can preserve the same candidate identity as the dependency graph.
- The canonical frontend renderer parses `chunkLane` and exposes chunk resource status/resource fields in root userData.
- Aggregated `runtimeEmitters[]` preserve chunk-lane metadata even when textured emitters render in the same package.
- Chunk-only canonical payloads still show the pending chunk-lane diagnostic placeholder and do not emit textured quad meshes.

Verification completed for this slice:

- Backend focused Jest: `test/unit/aurora-vfx-render-contract.spec.ts` - 21 passing tests.
- Backend focused Jest: `test/unit/vfx.application.service.spec.ts` - 8 passing tests.
- Frontend focused Vitest: `tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` - 14 passing tests.
- Frontend typecheck: `npx tsc --noEmit --pretty false` - passed.
- Backend build: `npm run build` - passed.

Remaining boundary: this is a data-contract step toward model-lane rendering. The frontend still does not load GLB/GLTF chunk models on its own, pure VFX still needs a host-side delivery URL/asset resolver equivalent to the placeable chunk-model binding path, and Aurora/NWN/Toolset visual artifacts remain required before any parity claim.

## Implementation update - 2026-07-12 P1 canonical chunk-model local instancing hook

Extended the canonical renderer with a host-supplied chunk model template hook:

- `AuroraVfxCanonicalRenderOptions` now accepts `chunkModelsByResourceKey` and `chunkModelDeliveryUrlsByResourceKey`, matching the existing placeable split where loaders/cache live outside the renderer.
- Chunk-only canonical payloads with a resolved resource key now instance supplied `THREE.Object3D` templates by active particle count instead of showing only the diagnostic placeholder.
- Mixed `runtimeEmitters[]` packages can render textured emitters and preserve/apply chunk model groups in the same canonical group.
- Root and instance userData record chunk model preview status, resource key, delivery URL, rendered chunk model count, and keep `auroraVfxRetailParityProof: false`.
- If the host does not supply a model template, behavior remains diagnostic-only and no textured fallback is created.

Verification completed for this slice:

- Frontend focused Vitest: `tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` - 15 passing tests.

Remaining boundary: this hook is not Toolset/NWN parity. The pure VFX host still needs to resolve/download GLB/GLTF delivery URLs from the chunk resource key, load/cache the model template, then run saved browser/Aurora comparison artifacts before this lane can be called proven.

## Implementation update - 2026-07-12 P1 canonical chunk-model host loader

Connected the canonical VFX chunk-model hook to the workspace host loader/cache path:

- `workspaceObjectMeshLayer` now maps canonical `chunkLane.resolvedResource.resourceKey` values to placeable asset-contract delivery URLs by matching resource basenames against `assetManifest` and `assetContracts`.
- Cached GLB/GLTF models are passed to `createAuroraVfxCanonicalRenderGroup()` as `chunkModelsByResourceKey`.
- Missing canonical chunk models are loaded through the existing `ensurePlaceableModel()` GLTF loader/cache path; when the load completes, the object root is refreshed with a canonical group containing chunk model instances.
- The route uses the same model-candidate validation as placeable model delivery and preserves the no-textured-fallback boundary.

Verification completed for this slice:

- Frontend focused Vitest: `tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts` - 4 passing tests.

Remaining boundary: this proves host-side loading and local instancing in the web runtime only. It still does not prove Aurora/NWN particle timing, transforms, chunk model scale, or pixel parity; saved browser screenshots/video and Toolset/Aurora oracle artifacts remain required.

## Implementation update - 2026-07-12 P1 chunk-model fixture web-runtime proof packet

Added a focused `vfx-retail-chunk-particles-progfx-type9` fixture proof surface for the canonical chunk-model lane:

- The dev fixture now carries a local `selectedCandidate` / `chunkLane.resolvedResource` for `progfx_type9_chunk_model_pending.local.glb`.
- `VfxFixtureRunner` supplies a local `THREE.Object3D` chunk model template through the canonical renderer `chunkModelsByResourceKey` hook.
- The fixture DOM exposes chunk-lane proof counters and resource fields: rendered chunk model count, lane count, resolve status, resolved key/layer/path/hash/candidate id, renderer-pending flag, and model preview status.
- `capture-vfx-fixture-cdp.mjs` now records those fields and requires resolved chunk-model geometry for `chunk_model` readiness instead of accepting a placeholder.
- `capture-vfx-app-route-cdp.mjs` also recognizes the same chunk-model ready state for app-route captures.

Saved local web-runtime proof packet:

- PNG: `backend/docs/aurora-reverse/artifacts/vfx-cdp-capture/vfx-retail-chunk-particles-progfx-type9-local-model-preview-2026-07-12.png`
- Frame state: `backend/docs/aurora-reverse/artifacts/vfx-cdp-capture/vfx-retail-chunk-particles-progfx-type9-local-model-preview-2026-07-12.frame.json`

The frame records `drawLane=chunk_model`, `drawParticles=0`, `renderedVertices=0`, `renderedChunkModelCount=2`, `chunkLane.count=1`, `resourceResolveStatus=resolved`, `rendererPending=false`, `modelPreviewStatus=applied-local-model-preview-retail-unverified`, `objectPixels=18573`, and `screenshotBytes=22171`. This proves the web runtime no longer needs a fake textured quad for this chunk fixture.

Verification completed for this slice:

- Frontend focused Vitest: `tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts` and `tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` - 29 passing tests.
- Frontend typecheck: `npx tsc --noEmit --pretty false` - passed.
- Capture script syntax: `node --check backend/scripts/capture-vfx-fixture-cdp.mjs` and `node --check backend/scripts/capture-vfx-app-route-cdp.mjs` - passed.
- Headless CDP capture: `vfx-retail-chunk-particles-progfx-type9`, time `0.6`, seed `23` - saved PNG and frame JSON listed above.

Remaining boundary: this is still local web-runtime proof only. The chunk resource is a dev fixture template, not a retail resource dump. Aurora/NWN/Toolset comparison, retail particle timing/transforms/scale, and pixel parity artifacts remain required before this lane can be promoted.

## Superseded diagnostic - 2026-07-13 linked-chain local segment topology packet

This packet is historical diagnostic evidence only. It encoded a contract error that was corrected on 2026-07-14:

- It built segments between adjacent draw records sorted by `particleIndex`.
- It treated `N` draw records as `N - 1` segments even though the backend Aurora contract had already reduced the active list to `activeCount - 1` draw records.
- Geometry userData exposes `auroraVfxCanonicalLinkedSegmentTopology`, `auroraVfxCanonicalLinkedSegmentCount`, and `auroraVfxCanonicalLinkedSegmentSource`.
- `VfxFixtureRunner` forwards those geometry fields to DOM `data-*` attributes.
- `capture-vfx-fixture-cdp.mjs` and `capture-vfx-app-route-cdp.mjs` record the linked-segment topology fields for saved proof packets.
- The dev linked-chain fixture keeps `canonicalParityPromoted=false` and updates its local contract vertex count from five independent quads (`30`) to four linked segments (`24`).

Saved local web-runtime proof packet:

- PNG: `backend/docs/aurora-reverse/artifacts/vfx-cdp-capture/vfx-retail-linked-chain-local-segment-strip-2026-07-13.png`
- Frame state: `backend/docs/aurora-reverse/artifacts/vfx-cdp-capture/vfx-retail-linked-chain-local-segment-strip-2026-07-13.frame.json`

The frame records `drawLane=linked_textured_quad`, `drawParticles=5`, `renderedVertices=24`, `renderedGeometry.linkedSegmentTopology=true`, `renderedGeometry.linkedSegmentCount=4`, `renderedGeometry.positionAttributeCount=24`, `canvasNonblank=true`, `objectPixels=3831`, and `canonicalParityPromoted=false`. Those counts came from the old dev-fixture shape, not from a valid backend `activeCount=5 -> drawCount=4` runtime contract, so this artifact must not be cited as current proof.

Verification completed for this slice:

- Frontend focused Vitest: `tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts`, `tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts`, and `tests/unit/app/App.vfxFixtureRunner.test.tsx` - 36 passing tests.
- Frontend typecheck: `npx tsc --noEmit --pretty false` - passed.
- Capture script syntax: `node --check backend/scripts/capture-vfx-fixture-cdp.mjs` and `node --check backend/scripts/capture-vfx-app-route-cdp.mjs` - passed.
- Headless CDP capture: `vfx-retail-linked-chain`, time `0.85`, seed `31` - saved PNG and frame JSON listed above.

Remaining boundary: this is superseded local diagnostic history, not current implementation proof and not Aurora/NWN parity evidence.

## Implementation update - 2026-07-13 P1 Motion_Blur velocity-basis proof packet

Added a focused local diagnostic for the Aurora `Motion_Blur` render-mode token without promoting retail parity:

- The read-only Aurora export contains `Motion_Blur` at `C:\Projects\New Folder\export\strings.tsv:15617`, declared in `C:\Projects\New Folder\export\decompiled_all.c:614259`, and selected at `C:\Projects\New Folder\export\decompiled_all.c:853936`.
- `vfx-retail-motion-blur-velocity-basis` now emits textured draw records with `renderMode.enum=motion_blur`, raw token `Motion_Blur`, and per-particle velocity vectors.
- The canonical renderer stretches Motion_Blur quads along the runtime velocity vector and records basis metadata as `motion_blur_velocity_aligned` / `aurora-render-mode-velocity-vector`.
- `VfxFixtureRunner` exposes render-mode basis metadata through DOM `data-*` attributes, and both CDP capture scripts preserve those fields in saved frame state.
- The fixture remains `canonicalParityPromoted=false` and carries diagnostics for local velocity-basis status plus missing retail endpoint/timing proof.

Saved local web-runtime proof packet:

- PNG: `backend/docs/aurora-reverse/artifacts/vfx-cdp-capture/vfx-retail-motion-blur-velocity-basis-local-proof-2026-07-13.png`
- Frame state: `backend/docs/aurora-reverse/artifacts/vfx-cdp-capture/vfx-retail-motion-blur-velocity-basis-local-proof-2026-07-13.frame.json`

The frame records `drawLane=textured_quad`, `drawParticles=4`, `renderedVertices=24`, `renderedRenderMode=motion_blur`, `renderedRenderModeRawToken=Motion_Blur`, `renderedGeometry.renderModeBasisModes=["motion_blur_velocity_aligned"]`, `renderedGeometry.renderModeBasisSources=["aurora-render-mode-velocity-vector"]`, `renderedGeometry.renderModeUsesVelocityBasis="true"`, `renderedGeometry.positionAttributeCount=24`, `canvasNonblank=true`, `objectPixels=2998`, `screenshotBytes=31978`, and `canonicalParityPromoted=false`.

Verification completed for this slice:

- Frontend focused Vitest: `tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts`, `tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts`, and `tests/unit/app/App.vfxFixtureRunner.test.tsx` - 38 passing tests.
- Frontend typecheck: `npx tsc --noEmit --pretty false` - passed.
- Capture script syntax: `node --check backend/scripts/capture-vfx-fixture-cdp.mjs` and `node --check backend/scripts/capture-vfx-app-route-cdp.mjs` - passed.
- Headless CDP capture: `vfx-retail-motion-blur-velocity-basis`, time `0.55`, seed `67` - saved PNG and frame JSON listed above.
- Local server cleanup: port `5175` returned `no-listener-5175` after capture.

Remaining boundary: this is still local web-runtime proof only. The retail previous/current endpoint reconstruction, blur-length timing, Aurora/NWN particle state comparison, Toolset capture, and pixel parity artifacts remain required before Motion_Blur parity can be promoted.

## Implementation update - 2026-07-13 P1 local diagnostic gate repair / linked visual-correlation alignment

Repaired the nearest local diagnostic-gate failures that were stale harness or report-shape issues, without promoting retail parity:

- `create-vfx-runtime-tick-diagnostics.ts` now expects the local Lightning target-path diagnostic to emit four active chain points for `particleLimit=4`, matching the backend runtime contract already covered by unit tests.
- `check-vfx-local-oracle-thresholds.mjs` now writes a structured missing-threshold report instead of failing with `ENOENT` when `vfx-iteration-85/vfx-local-oracle-thresholds.json` is absent.
- `check-vfx-contract-visual-evidence.mjs` now reports missing visual correlations with stable counters instead of crashing on an undefined `renderContractHashMismatches` list.
- `analyze-vfx-capture.mjs`, `run-vfx-visual-correlation.mjs`, and `test-vfx-visual-correlation-runner.mjs` now align the linked-chain local diagnostic model with the current segment topology: five source draw records become four contiguous linked segments and `24` rendered vertices.

Saved local visual-correlation packet for the repaired linked-chain gate:

- Snapshot: `backend/docs/aurora-reverse/artifacts/vfx-iteration-90/linked-chain-time-0.85-seed-31-segment-topology-gate-repair-v5.render-contract-snapshot.json`
- PNG: `backend/docs/aurora-reverse/artifacts/vfx-iteration-90/linked-chain-time-0.85-seed-31-segment-topology-gate-repair-v5-contract-check.png`
- Frame state: `backend/docs/aurora-reverse/artifacts/vfx-iteration-90/linked-chain-time-0.85-seed-31-segment-topology-gate-repair-v5.frame.json`
- Comparison: `backend/docs/aurora-reverse/artifacts/vfx-iteration-90/linked-chain-time-0.85-seed-31-segment-topology-gate-repair-v5.comparison.json`
- Correlation: `backend/docs/aurora-reverse/artifacts/vfx-iteration-90/linked-chain-time-0.85-seed-31-segment-topology-gate-repair-v5.contract-visual-correlation.json`

The correlation result is `render-contract-and-visual-output-correlated-local-diagnostic` and records `drawLane=linked_textured_quad`, `drawParticleCount=5`, `drawVertexCount=24`, `renderContractSha256=71509cdf17cb34640cdff6652d26bd67bfcb711b423794dcb148063ad93bf006`, `objectPixels=2449`, `connectedComponentCount=4`, all linked semantic checks passing, and `canonicalParityPromoted=false`.

Verification completed for this repair slice:

- `node -r ts-node/register/transpile-only scripts/create-vfx-runtime-tick-diagnostics.ts --out ...vfx-runtime-tick-diagnostics-gate-after-lightning-fix.json` - 11/11 runtime cases passing.
- `node scripts/test-vfx-visual-correlation-runner.mjs` - passed.
- `npm.cmd run test:vfx:local-diagnostic-gate -- --out ...vfx-local-diagnostic-gate-report-after-linked-selftest-repair.json` - still failed, but improved to `passedCommandCount=4`, `failedCommandCount=3`, `runtimePassedCaseCount=11/11`, `runtimeRenderContractPassedCaseCount=1/1`, `captureAnalyzerPassedCaseCount=3/3`, `canonicalPromotionAttemptCount=0`.

Remaining blockers in the latest gate report:

- `check-vfx-local-oracle-thresholds.mjs` still fails because the threshold profile is absent (`thresholdFixtureCount=0`).
- `check-vfx-contract-visual-evidence.mjs` now checks 1/10 fixtures; 27 visual artifacts, 9 semantic oracle entries, and 9 human-review flags remain missing.
- `check-vfx-catalog-preview-guardrails.mjs` still fails 30 checks because the required catalog preview artifacts are missing; `sourceMdlPayloadReady=false` and `localOnlyNotCanonical=true`.

Remaining boundary: this repair makes the local diagnostic gate honest and non-crashing for the linked-chain slice, but it is still not Aurora/NWN/Toolset retail proof. The missing threshold profile, fixture-wide visual evidence, catalog guardrail artifacts, and retail comparison packets remain required before this phase can be closed.

## Implementation update - 2026-07-13 P1 local evidence matrix refresh / catalog preview guardrail repair

Completed the local diagnostic-gate repair phase that was left open by the previous update, without promoting any fixture to retail/canonical parity:

- Generated a fresh fixture-wide local visual-correlation evidence set in `backend/docs/aurora-reverse/artifacts/vfx-iteration-221/`.
- Produced two-frame local diagnostic reports for all 10 audited manifest fixtures: row68, row50, EffectBeam, Fireball, cot-fx01/Fountain, chunk Type 9, P2P, linked-chain, mode2, and PLT.
- Regenerated the local coverage inventory and threshold profile:
  - `backend/docs/aurora-reverse/artifacts/vfx-iteration-84/vfx-visual-coverage-inventory.json` records 10/10 fixtures with local correlation and 10/10 with two-frame diagnostics, but 0 canonical retail evidence fixtures.
  - `backend/docs/aurora-reverse/artifacts/vfx-iteration-85/vfx-local-oracle-thresholds.json` records threshold profiles for 10/10 fixtures and selected frame pairs for 10/10 fixtures, with `localOnlyNotRetailEvidence=true`.
- Updated the chunk Type 9 local oracle from a stale unresolved placeholder expectation to the current local resolved model-preview evidence. The fixture now checks `resourceResolveStatus=resolved`, `resolutionSource=dev-fixture-local-template`, and `modelPreviewStatus=applied-local-model-preview-retail-unverified`.
- Added adjacent `.local-threshold-check.json` evidence for the selected latest correlations so the contract visual-evidence checker no longer depends on missing sidecar files.
- Repaired `check-vfx-catalog-preview-guardrails.mjs` to read the current CDP capture shape (`devFrameJson`, `finalRoute`, and `screenshotPath`) and to accept the stronger current material state where `fxpa_flare` texture is applied instead of requiring the older local fallback/floor path.
- Captured the catalog preview route for `plc_zlc_o45` at `time=0.32`, `seed=211`:
  - PNG: `backend/docs/aurora-reverse/artifacts/vfx-iteration-211/plc-zlc-o45-time-0.32-seed-211-catalog-preview-fixed-visible.png`
  - Frame state: `backend/docs/aurora-reverse/artifacts/vfx-iteration-211/plc-zlc-o45-time-0.32-seed-211-catalog-preview-fixed-visible.frame.json`
  - Backend process snapshot: `backend/docs/aurora-reverse/artifacts/vfx-iteration-211/plc-zlc-o45-backend-process-snapshot.json`
  - Local semantic threshold: `backend/docs/aurora-reverse/artifacts/vfx-iteration-211/plc-zlc-o45-catalog-preview-threshold-semantic-check.json`

The catalog frame records `sourceMdlPayloadReady=true`, `modelFileName=zlc_o45.mdl`, `emitterNode=glow`, `emitterType=Fountain`, `emitterTexture=fxpa_flare`, `emitterBlendMode=Lighten`, `emitterRenderMode=Normal`, `particleCount=10`, `textureStatus=applied`, `objectPixelsWithoutGrid=717`, and `screenshotBytes=7943`. The backend snapshot records `templateId=plc_zlc_o45`, `resref=zlc_o45`, name `VFX: Magic Mouth, Flat Anim P* (dobervich)`, and cache key `44def8f6cf49ee38b133c5a94e1993393b69cf5b770d26d94dd346258bfab8df`.

Verification completed for this repair phase:

- `node backend/scripts/test-vfx-visual-correlation-runner.mjs` - passed.
- `node backend/scripts/create-vfx-visual-coverage-inventory.mjs` - 10/10 fixtures with local correlation and two-frame local diagnostics, 0 canonical retail evidence.
- `node backend/scripts/create-vfx-local-oracle-thresholds.mjs` - 10/10 threshold profiles and 10/10 selected frame pairs.
- `node backend/scripts/check-vfx-local-oracle-thresholds.mjs --out backend/docs/aurora-reverse/artifacts/vfx-local-diagnostic-gate-2026-07-13/vfx-local-oracle-threshold-check-after-iteration-221-refresh.json` - 10 fixtures / 20 frames checked, 0 failed checks.
- `node backend/scripts/check-vfx-contract-visual-evidence.mjs --out backend/docs/aurora-reverse/artifacts/vfx-local-diagnostic-gate-2026-07-13/vfx-contract-visual-evidence-after-iteration-221-thresholds.json` - 10/10 fixtures checked, 0 failed fixtures, 0 missing visual artifacts, 31 semantic requirements and 189 visual semantic checks passing, 0 canonical promotion attempts.
- `node backend/scripts/check-vfx-catalog-preview-guardrails.mjs --out backend/docs/aurora-reverse/artifacts/vfx-local-diagnostic-gate-2026-07-13/vfx-catalog-preview-guardrails-after-iteration-211-refresh.json` - passed with 0 failed checks and `canonicalParityPromoted=false`.
- `npm.cmd run test:vfx:local-diagnostic-gate -- --out backend/docs/aurora-reverse/artifacts/vfx-local-diagnostic-gate-2026-07-13/vfx-local-diagnostic-gate-report-after-catalog-preview-refresh.json` - passed 7/7 commands, 0 nested failed checks, 0 canonical promotion attempts, runtime 11/11, render contract 1/1, capture analyzer 3/3, thresholds 10 fixtures / 20 frames, contract visual evidence 10/10, catalog guardrail passed.

Remaining boundary: this closes the local diagnostic-gate repair phase only. Retail runtime tick dumps, retail render-contract snapshots, Aurora/NWN/Toolset captures, exact `plc_zlc_o45` retail Magic Mouth visual oracle, chunk Type 9 real source/resource evidence, framebuffer comparisons, and human review remain required before any canonical parity or completion claim.

## Implementation update - 2026-07-13 P2 canonical placeable thin-host guard

Started the P2 thin-host convergence phase by removing one duplicate-renderer path for backend-marked canonical placeable payloads:

- `workspaceObjectMeshLayer` no longer creates the source-MDL placeable-preview emitter overlay when `isCanonicalAuroraVfxRenderablePayload()` accepts the backend `auroraVfxPayload`.
- Backend-marked canonical placeable VFX now uses `createAuroraVfxCanonicalRenderGroup()` as the single emitter renderer for that object root instead of attaching the old source-MDL preview simulator as an extra child.
- Preview-only VFX payloads and non-canonical source-MDL placeable previews still use `createPlaceableVfxPreviewGroup()` as fallback; this slice does not delete the simulator.
- Added a regression test that combines a canonical backend payload with a source-MDL emitter package and asserts that the root is canonical, no `sourceMdlEmitterPreviewStatus` is added, no source-MDL preview child is attached, and no preview particle mesh is emitted.

Verification completed for this slice:

- `npx.cmd vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts` - 5/5 passing.
- `npx.cmd vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts` - 123/123 passing.
- `npx.cmd tsc --noEmit --pretty false` - passed.

Remaining boundary: this is a routing/convergence guard only. Placeable-preview fallback still exists for non-canonical paths, source-MDL light preview is still separate from canonical VFX output, and Aurora/NWN/Toolset comparison proof remains required before P2/P4 can be called complete.

## Implementation update - 2026-07-13 P2 backend source-MDL emitter runtime payload

Moved source-MDL placeable emitter delivery one step closer to the shared backend VFX runtime:

- `PlaceableRenderPackage` now carries `auroraVfxPayload?: unknown` in backend and frontend contracts.
- `CatalogModule` imports `VfxModule`, and `CatalogApplicationService` optionally injects `VfxApplicationService`.
- After source-MDL emitters are parsed and chunk-model assets are bound, the catalog service packages those emitters through `VfxApplicationService.processVfxPackage()` with `packageKind=runtime_package`, `sourceEmitters[]`, texture/chunk resource traces, and a diagnostic placeable-source table.
- The returned runtime package is exposed as an `aurora-vfx-payload/v1` payload with `canonicalStatus=canonical`, `backendCanonical=true`, `sourceKind=placeable_preview`, `previewMode=aurora_emitter_particle_preview`, `contracts.runtimeEmitters`, `contracts.renderContract`, and `contracts.dependencyGraph`.
- The payload records `localOnlyNotRetailEvidence=true`, `canonicalParityPromoted=false`, `VFX_PLACEABLE_EFFECT_INSTANCE_CONTEXT_MISSING`, and `VFX_AURORA_MDL_EMITTER_RETAIL_PROOF_PENDING` so the backend-runtime route cannot be mistaken for retail/Aurora parity proof.
- `HttpPlaceableApiPort` now preserves `renderPackage.auroraVfxPayload` instead of dropping it during response mapping.

Verification completed for this slice:

- `npm.cmd test -- --runInBand test/unit/catalog.application.service.spec.ts` - 163/163 passing.
- `npm.cmd run build` in `backend` - passed.
- `npx.cmd vitest run tests/unit/modules/placeables/httpPlaceableApiPort.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts` - 17/17 passing.
- `npx.cmd vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts` - 123/123 passing.
- `npx.cmd tsc --noEmit --pretty false` in `frontend` - passed.

Remaining boundary: this gives source-MDL placeables a backend runtime/render-contract payload and lets the canonical renderer consume it, but it still uses diagnostic placeable-source packaging rather than a recovered retail EffectVisualEffect instance. Placeable-preview fallback still exists, source-MDL light integration is not unified into the canonical VFX output, and Aurora/NWN/Toolset captures/comparisons remain required before completion.

## Implementation update - 2026-07-13 P2 canonical light sibling marker

Clarified the remaining source-MDL light path under canonical placeable VFX roots:

- When a backend canonical VFX payload is rendered and the same source-MDL package contains light nodes, the light preview group is now marked as `auroraVfxCanonicalLightSibling=true`.
- The root records `auroraVfxCanonicalLightSiblingMode=source-mdl-light-thin-host-child`, `auroraVfxCanonicalLightSiblingRenderer=placeable-source-mdl-light-preview`, and `auroraVfxCanonicalLightSiblingRetailProof=false`.
- The source-MDL emitter preview overlay remains suppressed for canonical emitter payloads, so this marker does not reintroduce duplicate particle rendering.
- Added a regression test for a hybrid canonical emitter plus source-MDL light package: canonical draw mesh remains present, source-MDL emitter preview stays absent, and the light child is explicitly marked as a thin-host sibling.

Verification completed for this slice:

- `npx.cmd vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts` - 6/6 passing.
- `npx.cmd vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts` - 123/123 passing.
- `npx.cmd tsc --noEmit --pretty false` in `frontend` - passed.

Remaining boundary: this is still a frontend routing/evidence marker, not a unified canonical light renderer and not retail parity. Source-MDL lights remain rendered by the light-only placeable preview child until a proper shared light/render contract exists, and Aurora/NWN/Toolset proof remains required.

## Implementation update - 2026-07-13 P2 catalog preview canonical backend proof

Closed the first local P2 catalog-preview proof loop for `plc_zlc_o45` without converting it into a retail/Aurora parity claim:

- `CatalogVfxPreviewRunner` now records separate evidence fields for any preserved VFX payload versus an actual backend `renderPackage.auroraVfxPayload`: `auroraVfxPayloadReady`, `auroraVfxBackendPayloadReady`, `auroraVfxBackendCanonical`, `auroraVfxCanonicalStatus`, `auroraVfxPreviewMode`, `auroraVfxRenderer`, `auroraVfxCanonicalRenderer`, `auroraVfxCanonicalLightSibling`, and `auroraVfxDiagnosticCodes`.
- `capture-vfx-app-route-cdp.mjs` now reads those fields from DOM/frame JSON and treats `devCanonicalRendererReady=true` as a valid dev-preview readiness lane when backend payload, backend canonical flag, canonical status, and canonical renderer are all present.
- `CatalogApplicationService` now explicitly injects `VfxApplicationService` with `@Inject(VfxApplicationService)` for the optional P2 backend payload path. Before the backend restart, a direct API check proved the live service still returned no `renderPackage.auroraVfxPayload`; after restart it returned `hasAuroraVfxPayload=true`, `canonicalStatus=canonical`, `backendCanonical=true`, and `VFX_AURORA_MDL_EMITTER_BACKEND_RUNTIME_PAYLOAD_READY`.
- The first refreshed web capture intentionally recorded the stale/negative state:
  - PNG: `backend/docs/aurora-reverse/artifacts/vfx-iteration-211/plc-zlc-o45-time-0.32-seed-211-canonical-backend-runtime-payload.png`
  - Frame state: `backend/docs/aurora-reverse/artifacts/vfx-iteration-211/plc-zlc-o45-time-0.32-seed-211-canonical-backend-runtime-payload.frame.json`
  - It showed `devAuroraVfxPayloadReady=true`, but `devAuroraVfxBackendCanonical=false`, `devAuroraVfxCanonicalStatus=preview_only`, `devAuroraVfxCanonicalRenderer=false`, `devCanonicalRendererReady=false`, and `sourceMdlEmitterPreviewStatus=active`.
- The accepted local web proof is:
  - PNG: `backend/docs/aurora-reverse/artifacts/vfx-iteration-211/plc-zlc-o45-time-0.32-seed-211-canonical-backend-runtime-payload-ready.png`
  - Frame state: `backend/docs/aurora-reverse/artifacts/vfx-iteration-211/plc-zlc-o45-time-0.32-seed-211-canonical-backend-runtime-payload-ready.frame.json`
  - It records `devAuroraVfxBackendPayloadReady=true`, `devAuroraVfxBackendCanonical=true`, `devAuroraVfxCanonicalStatus=canonical`, `devAuroraVfxRenderer=canonical`, `devAuroraVfxCanonicalRenderer=true`, `devCanonicalRendererReady=true`, `devSourceMdlEmitterPreviewStatus=""`, `devPreviewVisibleMeshCount=1`, and `objectPixelsWithoutGrid=1031`.
- The accepted frame still records `VFX_AURORA_MDL_EMITTER_RETAIL_PROOF_PENDING`, `VFX_EFFECT_INSTANCE_CONTEXT_REQUIRED`, and `localOnlyNotRetailEvidence=true`; `canonicalParityPromoted=false` remains true in the capture envelope.

Verification completed for this slice:

- `npx.cmd vitest run tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts` - 20/20 passing.
- `npx.cmd tsc --noEmit --pretty false` in `frontend` - passed.
- `node --check backend/scripts/capture-vfx-app-route-cdp.mjs` - passed.
- `npm.cmd run build` in `backend` - passed.
- `npm.cmd test -- --runInBand test/unit/catalog.application.service.spec.ts` - 163/163 passing.
- Direct API check against `http://127.0.0.1:3000/api/v1/catalog/placeables/process` after backend restart - `hasAuroraVfxPayload=true`, `canonicalStatus=canonical`, `backendCanonical=true`.
- CDP capture route `http://127.0.0.1:5173/dev/catalog-vfx-preview?templateId=plc_zlc_o45&time=0.32&seed=211` - accepted local proof packet saved above.
- `node backend/scripts/check-vfx-catalog-preview-guardrails.mjs --out backend/docs/aurora-reverse/artifacts/vfx-local-diagnostic-gate-2026-07-13/vfx-catalog-preview-guardrails-after-p2-canonical-backend-proof.json` - passed with both the legacy non-canonical fallback artifact and the new canonical backend proof checked.
- `npm.cmd run test:vfx:local-diagnostic-gate -- --out backend/docs/aurora-reverse/artifacts/vfx-local-diagnostic-gate-2026-07-13/vfx-local-diagnostic-gate-report-after-p2-catalog-canonical-guardrail.json` - passed 7/7 commands, `canonicalPromotionAttemptCount=0`, canonical catalog guardrail `backendPayloadReady=true`, `backendCanonical=true`, `rendererSelected=true`, `devReady=true`, and `sourceMdlOverlaySuppressed=true`.

Remaining boundary: this proves the local web catalog route selects the backend canonical VFX renderer for the audited emitter-only Magic Mouth source-MDL placeable. It does not prove retail/Aurora visual parity, recovered EffectVisualEffect instance context, hybrid source-MDL light convergence, or removal of the non-canonical fallback simulator.

## Implementation update - 2026-07-13 P2 static/emitter composition and live hybrid fixture audit

Extended the canonical placeable root so it can retain source-proven static model geometry alongside the canonical emitter renderer and the existing source-MDL light child:

- `workspaceObjectMeshLayer` now loads the source-proven placeable model when a backend canonical VFX payload and source-MDL static geometry are both present, rather than suppressing it merely because the canonical emitter renderer is active.
- The composed root is explicitly marked `auroraVfxCanonicalPlaceableComposition=true` with mode `source-mdl-static-emitter-light`; the source-MDL emitter preview remains suppressed, while the light child remains a non-retail thin-host sibling.
- `CatalogVfxPreviewRunner` and `capture-vfx-app-route-cdp.mjs` record the composition mode and compute `devCanonicalHybridCompositionReady` only when static geometry, canonical emitters, and an actual source-MDL light sibling are all present. This prevents a marker-only or synthetic light fixture from satisfying the acceptance gate.
- The focused frontend regression creates source-proven static geometry, a canonical emitter contract, and a source-MDL light payload in one object root; it asserts one static mesh, one canonical draw mesh, one `PointLight`, no source-MDL emitter-preview billboard, and the explicit composition mode.

Live-fixture audit result:

- Authenticated processing of all 722 current `subtype=vfx` catalog entries found zero records with `staticGeometryNodes > 0`, source-MDL emitters, and a non-empty `renderPackage.auroraLight.lights` payload together. The initial scan was corrected to avoid treating a null PowerShell array as a count of one.
- `plc_ccc_bbl_500` is the closest useful negative capture: it reports backend canonical payload, `sourceMdlStaticGeometryNodeCount=2`, `emitterCount=6`, and canonical composition mode, but `sourceMdlLightPayloadReady=false`, `auroraVfxCanonicalLightSibling=false`, and `devCanonicalHybridCompositionReady=false`.
- `tm_pl_lightred` likewise confirms canonical static-plus-emitter rendering but supplies no live source-MDL light payload. Neither capture is accepted as hybrid proof.
- The backend order is correct: `decorateRenderPackageWithAuroraLight()` runs after source-model graph decoration and before emitter packaging. The Aurora oracle at `C:\Projects\New Folder\export\decompiled_all.c:883029-883245` independently shows the light-node parser handles `color`, `radius`, `shadowradius`, `verticaldisplacement`, `multiplier`, `shadow`, and `lightpriority`. The absence is therefore in the currently processed catalog source payloads, not a frontend ordering drop.

Verification completed for this slice:

- `npx.cmd vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts` - 27/27 passing.
- `npx.cmd tsc --noEmit --pretty false` in `frontend` - passed.
- `node --check backend/scripts/capture-vfx-app-route-cdp.mjs` - passed.
- Negative local artifacts: `backend/docs/aurora-reverse/artifacts/vfx-iteration-212/plc-ccc-bbl-500-time-0.32-seed-211-hybrid-canonical-composition.png` and `.frame.json`; `backend/docs/aurora-reverse/artifacts/vfx-iteration-212/tm-pl-lightred-plc-t04-time-0.32-seed-211-hybrid-canonical-composition.png` and `.frame.json`.

Remaining boundary: P2 is not complete. The concrete next dependency is a real Aurora source fixture or module import that yields all three lanes, followed by saved Aurora/NWN/Toolset comparison artifacts. The CDP capture commands wrote valid negative artifacts but exceeded the runner timeout during cleanup, so they are evidence files, not clean command-pass proof.

## Acceptance gates

- The same emitter input produces the same ordered runtime/draw contract in pure VFX and placeable hosts.
- A hybrid fixture containing `trimesh + emitter + light` renders all three lanes.
- `plc_t04` renders its static lower core, flame, and smoke together.
- Multiple emitter nodes preserve source order, parent transforms, and independent runtime state under one shared clock.
- No frontend placeable-only particle simulator remains.
- Focused backend/frontend tests and repaired local diagnostic gates pass.
- Requested PNG/MP4 artifacts are saved and compared with Aurora retail/oracle evidence.
- No canonical parity claim is made while retail fixture evidence remains missing.

## Audit status

Audit findings are complete. P1 local diagnostic gates are repaired and passing 7/7, and P2 now has a local static-plus-canonical-emitter composition guard. The source-MDL light lane is still only a synthetic/unit-tested composition path: the current live VFX catalog provides no real static/emitter/light fixture, so P2 hybrid convergence and all Aurora/NWN/Toolset proof remain open.

## Implementation update - 2026-07-13 P1 direct source-MDL reference context

The shared backend VFX runtime now consumes one direct source-MDL reference node for the bounded P2P and Lightning target-context case:

- `resolveAuroraEmitterSourceReferenceTargetContext()` accepts exactly one reference whose `parentNodeName` equals the emitter node name.
- It carries the local target as `emitter.position + reference.position` only when both transforms have unit scale and no effective rotation. This is deliberately narrow: it does not manufacture parent-space composition that has not yet been recovered from Aurora.
- `VfxApplicationService` supplies that context to the same runtime path used by `model_graph_runtime`; the Lightning path records `VFX_LIGHTNING_SOURCE_REFERENCE_CONTEXT_CONSUMED` when it uses it.
- The retained source-derived Lightning active-point count continues to come from the evaluated `birthrate` slot, with no fixed preview subdivision.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-runtime-state.spec.ts test/unit/vfx.application.service.spec.ts --runInBand` in `backend` - 38/38 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: the implementation does not yet evaluate animated parent transforms, arbitrary rotation/scale composition, or retail P2P/Lightning target-pointer semantics. Those require further Aurora source recovery and then clean one-trigger comparison packets under `vfx-proof-standard-2026-07-13.md`; no NWN or Toolset capture was made or promoted by this slice.

## Implementation update - 2026-07-13 P1 P2P gravity-target replacement

Removed the invalid local P2P preview shortcut from the shared runtime:

- The old path allocated a fixed seven-particle arc with a hard-coded `0.35` lift. It has been removed; neither the fixed count nor the artificial arc was an Aurora source fact.
- P2P now uses the normal source `birthrate`/`lifeExp` Fountain emission gate, then applies the recovered target branch to active particles: target-direction `grav * dt` velocity adjustment, `grav * dt^2` position adjustment, and `threshold^2` target-arrival age marking.
- `drag` is explicitly left unmapped behind `VFX_P2P_DRAG_HELPER_MAPPING_REQUIRED`, because Aurora delegates it to an unrecovered helper. `p2pType=bezier` is preserved and stopped behind `VFX_P2P_BEZIER_RUNTIME_MAPPING_REQUIRED`; it does not receive a fabricated curve.
- The source-MDL direct-reference context from the previous slice is accepted by this path, but it remains limited to one direct unrotated, unit-scale child reference.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-runtime-state.spec.ts test/unit/vfx.application.service.spec.ts --runInBand` in `backend` - 38/38 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: this is a source-derived runtime replacement, not proof of P2P retail parity. Exact Aurora `drag` helper math, Bezier controls, target-pointer/transform resolution, wind/collision ordering, and one-trigger Aurora/NWN comparison packets are still required. No Toolset or NWN process was launched.

## Implementation update - 2026-07-13 P1 Explosion duplicate-event latch

Corrected Explosion detonate consumption to match the recovered latch model:

- Every source callback in the tick is retained in `detonateCallbackTrace`, including duplicate rows at the same source time. `processedDetonateEventKeys` remains the unique latch-consumption guard.
- The batch now writes/consumes one detonate latch and creates one burst, rather than incorrectly creating one burst per duplicate callback in the same tick.
- The existing no-event gate remains intact: no periodic or fallback burst is synthesized.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-runtime-state.spec.ts test/unit/vfx.application.service.spec.ts --runInBand` in `backend` - 39/39 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: the service still needs an explicit selected-animation interval scanner (including source length and wrap handling) to feed parsed source events into the runtime. This slice validates latch consumption only; it made no Aurora, Toolset, or NWN capture.

## Implementation update - 2026-07-13 P1 selected-animation detonate interval

The backend runtime contract now carries an explicit animation interval and feeds source events into Explosion before the family update:

- `runtime.animation` accepts `{ animationName, previousTimeSeconds?, currentTimeSeconds }` through the HTTP schema, application contract, runtime normalization, and output-cache key.
- For a selected animation, only source `event <time> detonate` rows whose time lies in `(previousTimeSeconds, currentTimeSeconds]` are passed to the shared Explosion runtime. Events from another animation are not borrowed.
- Duplicate source event rows remain visible to the detonate latch as duplicate callback records, while the corrected latch creates one burst in that tick.
- No animation is implicitly selected, and no synthetic interval, cycle, or fallback burst is introduced when the caller does not provide one.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts test/unit/aurora-vfx-runtime-state.spec.ts --runInBand` in `backend` - 45/45 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: the selected interval currently handles forward non-wrapping time only. Source animation length, wrap/reverse scanning, transition blend/track evaluation, direct/key/bezier detonate-field evaluation, and authoritative one-trigger comparison proof are still open. No Aurora, Toolset, or NWN capture was made.

## Implementation update - 2026-07-13 P1 source-length animation wrap

Extended the selected-animation detonate scan with the bounded wrap case:

- When `currentTimeSeconds < previousTimeSeconds`, the scan uses only the matching parsed `animationPasses[].lengthSeconds` from the source MDL.
- It then scans the two legitimate halves of the interval: `(previous, length]` and `[0, current]`, preserving source order and duplicate callbacks.
- If the selected animation has no positive source length, no wrap event is synthesized. The code does not derive a cycle from preview duration, particle lifetime, or event timestamps.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts test/unit/aurora-vfx-runtime-state.spec.ts --runInBand` in `backend` - 46/46 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: reverse-scan flags, source event ordering metadata, transition blending, controller-track evaluation, direct/key/bezier detonate evaluation, and authoritative one-trigger comparison proof remain open. No Aurora, Toolset, or NWN capture was made.

## Implementation update - 2026-07-13 P1 mass versus P2P gravity separation

Corrected a source/runtime field conflation in the shared particle state:

- Fountain and Explosion particle reset now derive world-vertical acceleration from Aurora `mass` as `z = -9.81 * mass`.
- The P2P `grav` field is no longer reused as base world acceleration. It remains exclusively in the target/reference P2P branch.
- A focused regression proves `mass=2` produces `-19.62` vertical acceleration while a simultaneous `grav=99` does not contaminate the base path.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-runtime-state.spec.ts test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts --runInBand` in `backend` - 47/47 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: canonical controller evaluation still needs direct/key/bezier source semantics, selected-animation transform evaluation, inheritance transforms, and proof packets. No Aurora, Toolset, or NWN capture was made.

## Implementation update - 2026-07-13 P1 direct-only animation pass overlay

Started controller application without inventing interpolation:

- Before constructing the shared runtime state and render contract, a selected source animation pass may overlay its parsed `emitterState.simulation` and `emitterState.transform` onto the base emitter.
- The overlay is accepted only for a pass with no `keyRows` and no `bezierKeyRows`; direct source values are therefore applied as direct source values, not as guessed samples from an animated curve.
- A focused integration test proves a base Fountain with `birthrate=0` becomes active from the selected direct-only animation pass with `birthrate=4` before the first shared tick.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts test/unit/aurora-vfx-runtime-state.spec.ts --runInBand` in `backend` - 48/48 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: ordinary key interpolation, Bezier interpolation, direct/key/bezier detonate-field application, transition blending, selected-animation parent transforms, inheritance, and one-trigger proof packets remain open. No Aurora, Toolset, or NWN capture was made.

## Implementation update - 2026-07-13 P1 direct detonate field latch

Completed the direct-field half of the recovered Explosion detonate contract:

- A non-zero evaluated direct `simulation.detonate` now supplies `detonateFieldKey` to the shared Explosion runtime.
- The field and parsed animation-event callbacks use the same runtime latch transaction. When both occur in one tick they still produce one burst; the direct-field marker and all callback rows remain in the processed trace.
- A consumed direct field is recorded by `VFX_EXPLOSION_DETONATE_FIELD_CONSUMED`; a later tick with the same marker produces no duplicate burst.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-runtime-state.spec.ts test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts --runInBand` in `backend` - 50/50 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: keyed and Bezier `detonate`, non-direct controller interpolation, transition blending, selected-animation parent transforms, inheritance, and one-trigger proof packets remain open. No Aurora, Toolset, or NWN capture was made.

## Implementation update - 2026-07-13 P2 Chunk particle instance positions

Removed the remaining decorative Chunk-model placement from the canonical frontend path:

- The backend Chunk render lane now carries every active runtime particle identity and position.
- The canonical Three.js renderer clones each resolved Chunk model at that particle position; it no longer distributes instances around an artificial circle derived from object radius.
- Each frontend instance retains the corresponding Aurora particle id in user data for proof/correlation work.

Verification completed for this slice:

- `npx.cmd tsc --noEmit --pretty false` in `backend` and `frontend` - passed.
- `npx.cmd vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` in `frontend` - 17/17 passing.

Remaining boundary: Chunk rotation, scale, lifecycle timing, resource transforms, collision interaction, and Aurora/NWN one-trigger comparison proof remain open. No Aurora, Toolset, or NWN capture was made.

Chunk position correlation verification was added after the initial implementation update:

- `aurora-vfx-render-contract.spec.ts` asserts that the Chunk lane carries the same active particle ids and positions as its runtime state.
- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-render-contract.spec.ts test/unit/aurora-vfx-runtime-state.spec.ts test/unit/vfx.application.service.spec.ts --runInBand` in `backend` - 66/66 passing.
- `npx.cmd vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` in `frontend` - 17/17 passing.

## Implementation update - 2026-07-13 P2 source-MDL light canonicalization and routing

The source-MDL light lane now travels with the canonical VFX payload and no longer needs a duplicate preview light when that payload carries renderable light entries:

- `CatalogApplicationService` promotes parsed `auroraLight.lights` into `contracts.sourceMdlLights`; the frontend payload normalizer preserves that contract rather than recovering light values from a preview-only structure.
- The canonical Three.js renderer creates direct `AmbientLight` or `PointLight` instances from the transported MDL node name, transform, RGB color, radius, multiplier, and ambient flag. Every such instance remains marked `auroraVfxCanonicalSourceMdlLight=true` and `RetailProof=false`.
- The placeable model-load attachment now accepts both the old thin-host light node and the canonical source-MDL light marker. For a source-proven static model it resolves the named GLB node and places the light at that actual model-node position.
- The `placeable-source-mdl-light-preview` child is now a fallback only: it remains for a canonical payload that omits `sourceMdlLights`, but is suppressed when the canonical group has an actual carried source-MDL light. This removes the duplicate light instead of hiding or double-rendering it.

Verification completed for this slice:

- `npx.cmd vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` in `frontend` - 26/26 passing.
- `npx.cmd tsc --noEmit --pretty false` in `frontend` - passed.

Remaining boundary: this is contract transport, local rendering, and model-node anchoring only. Light animation, Aurora priority/scheduler semantics, shadow-volume behavior, and every retail comparison remain open. No Aurora, Toolset, or NWN process was launched and no local test is accepted as Aurora/NWN proof.

## Implementation update - 2026-07-13 P2 Motion_Blur previous-position lane

Replaced the canonical renderer's non-source speed multiplier for `Motion_Blur` with the recovered particle-state lane:

- Runtime particles now retain `previousPosition`. For a `Motion_Blur` emitter, each tick blends that value toward the current position with `min(dt, blurlength) / blurlength`; a missing source `blurlength` uses the recovered constructor default `1`.
- A non-finite or non-positive authored `blurlength` emits `VFX_MOTION_BLUR_NONPOSITIVE_BLURLENGTH` and withholds the blend rather than silently inventing a protected duration.
- The render contract transports both positions. The canonical frontend renders a width-sized strip from previous to current position, so it no longer derives blur length from the current velocity magnitude. Missing or zero-length previous segments stay explicitly marked as such.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-runtime-state.spec.ts test/unit/aurora-vfx-render-contract.spec.ts --runInBand` in `backend` - 53/53 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.
- `npx.cmd vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts` in `frontend` - 26/26 passing.
- `npx.cmd tsc --noEmit --pretty false` in `frontend` - passed.

Remaining boundary: source analysis establishes the stored previous-position blend, but family-specific ordering, camera-facing strip orientation, controller-key evaluation for `blurlength`, bad-input retail behavior, and Aurora/NWN one-trigger comparison artifacts remain open. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 ordinary `key` controller evaluation

Implemented the recovered non-Bezier Aurora key-track rule for a selected emitter animation pass:

- The local Aurora decompilation at `C:\Projects\New Folder\export\decompiled_all.c:844645-844735` finds the first key whose time is at or after the sample, clamps before the first and after the last key, and linearly mixes ordinary scalar/vector values between adjacent key times.
- `resolveDirectAnimationPassEmitter()` now applies that rule to the selected pass's ordinary simulation number/color timelines and position/scale transform timelines before shared runtime creation. This covers controller values such as `birthrate`, `lifeExp`, `blurlength`, colors, and position when the parser supplied their normal `key` timeline.
- `bezierKeyRows` still block the pass from this evaluator. Quaternion orientation, transition blending, parent/inheritance composition, and Bezier tangent semantics are not silently approximated.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts test/unit/aurora-vfx-runtime-state.spec.ts test/unit/aurora-vfx-render-contract.spec.ts --runInBand` in `backend` - 73/73 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: `fieldbezierkey` uses a structurally distinct triplet format and Aurora evaluator. It remains preserved and deliberately unevaluated until its tangent/handle behavior is recovered and then checked in one-trigger Aurora/NWN proof packets. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 ordinary `key` transition weight

Extended the ordinary-key evaluator with the recovered Aurora transition write rule:

- `runtime.animation.blendWeight` is now accepted as a bounded `0..1` value and participates in the output-cache key. Omitted weight remains `1`, preserving the existing single-animation result.
- Every sampled ordinary scalar/vector key value is written as `evaluated * blendWeight + existing * (1 - blendWeight)`, matching the recovered `FUN_00a1999c` field-write contract for ordinary runtime tracks.
- The implementation applies that weight only to sampled normal `key` values. Direct animation values keep their prior direct-overlay behavior; Bezier rows, quaternion orientation, and multi-animation scheduling/transition selection remain outside this slice.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts test/unit/aurora-vfx-cache-key.spec.ts --runInBand` in `backend` - 21/21 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: one supplied blend weight is not yet an Aurora transition scheduler. Selecting old/new animation tracks, their source transition durations, ordering, quaternion blend behavior, and Bezier evaluator semantics remain open. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 ordinary `orientationkey` quaternion evaluation

Completed the ordinary orientation-track branch without treating axis-angle components as unrelated scalars:

- Source MDL orientation remains stored as axis-angle, while the recovered binary/runtime path uses quaternion values and a quaternion blend helper for four-component tracks.
- The selected non-Bezier orientation timeline is now converted to quaternions, sampled spherically between source keys, then blended spherically against the base orientation using `runtime.animation.blendWeight` before returning to axis-angle.
- A focused regression samples a Z-axis `0 -> pi` track at `0.5` and verifies a Z-axis `pi/2` result.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts test/unit/aurora-vfx-cache-key.spec.ts --runInBand` in `backend` - 22/22 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: `orientationbezierkey`, source transition selection/ordering, parent transform composition, inheritance velocity, and retail one-trigger animation comparison packets remain open. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 source-MDL graph local-transform transport

Closed a data-loss gap in the shared source-MDL graph contract:

- The unified parser already retains local transforms on emitter, light, reference, and shadowblob nodes. The catalog graph mapper had reduced those nodes to identity/parent metadata and silently discarded that source evidence.
- `auroraModelGraph.nodes[].transform` now carries the parser's authored local position, orientation, scale, and supported timelines through the backend render package, frontend HTTP schema, and frontend contract.
- The focused catalog fixture asserts that the parsed `pulsing_light03` graph node retains its authored local position `[0, 0, 2.5]` alongside its parent identity.

Verification completed for this slice:

- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.
- `npx.cmd tsc --noEmit --pretty false` in `frontend` - passed.
- The focused `catalog.application.service.spec.ts` command is presently blocked before tests execute by an existing unrelated TypeScript error in that dirty test file: `vfxService` is referenced but not declared at line 11565. This was not changed as part of this transform-transport slice.

Remaining boundary: this is local-source-data transport only. Static-geometry transform extraction, parent-to-child transform composition, selected-animation parent transforms, inheritance, and any Aurora/Toolset/NWN lifecycle proof remain open. No Aurora, Toolset, or NWN process was launched; no compilation result is treated as parity proof.

## Implementation update - 2026-07-13 P1 static-geometry local-transform extraction

Extended the graph so static model geometry no longer loses its authored local placement before it reaches the common model graph:

- ASCII `trimesh`, `animmesh`, `danglymesh`, and `skin` nodes now retain direct `position`, axis-angle `orientation`, and uniform `scale` as their local graph transform.
- Binary mesh nodes use the already recovered common node-controller reader, preserving the binary position/orientation values the parser can establish from source data. No scale is fabricated when the recovered binary controller reader has none.
- The static-geometry transform now travels in both `staticGeometryNodes[]` and the ordered `nodes[]` graph through backend and frontend contracts.
- A focused parser fixture asserts the complete local transform for a `trimesh` node and the matching ordered model-graph entry.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-mdl-nodes.spec.ts --runInBand` in `backend` - 15/15 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` and `frontend` - passed.

Remaining boundary: animation-track transforms on static geometry, parent-to-child/world transform composition, GLB-node correspondence, inheritance, and Aurora/Toolset/NWN lifecycle proof remain open. No Aurora, Toolset, or NWN process was launched; the parser test is source-contract verification, not retail parity proof.

## Implementation update - 2026-07-13 P1 transform-wrapper graph preservation

Completed the missing structural half of the model tree needed before parent composition can be recovered safely:

- ASCII MDL nodes outside the specialized emitter/light/mesh/reference/shadowblob lanes, including `dummy` transform wrappers, are now preserved as ordered `transform` graph nodes with their source node kind, parent link, direct local position, axis-angle orientation, and uniform scale.
- Binary non-special nodes are preserved as `binary-node` transform wrappers using the already recovered common binary controller reader. Their node offsets remain source provenance; unsupported fields are not invented.
- The ordered graph now includes these wrappers for both pure parser output and the placeable backend/frontend graph transport. This keeps the actual source parent identity available to a later composition step instead of discarding it at parse time.
- `propagate*` evidence is processed before wrapper fields, retaining its source-node event even when the owner is a `dummy` transform node.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-mdl-nodes.spec.ts --runInBand` in `backend` - 15/15 passing.
- `npx.cmd tsc --noEmit --pretty false` in `backend` and `frontend` - passed.

Remaining boundary: preserving wrappers does not compose local transforms, animate wrapper tracks, map all graph nodes onto derived GLB nodes, or permit reparenting canonical particles. Those require recovered parent-space semantics and then valid Aurora-first lifecycle comparison proof. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 emitter-only graph retention

Separated source-graph admission from static-model delivery:

- Catalog model-graph collection now returns a parsed graph whenever it has source nodes, rather than requiring static geometry as a proxy for graph existence.
- Emitter-only MDLs therefore retain their source wrappers, emitters, references, and lights in `auroraModelGraph`; this is required for a unified pure/placeable tree and later parent-space recovery.
- The independent static-model decision remains based on `staticGeometryNodes.length`, so an emitter-only source still does not acquire a speculative derived GLB.

Verification completed for this slice:

- `npx.cmd tsc --noEmit --pretty false` in `backend` - passed.

Remaining boundary: the catalog suite's focused behavioral assertion remains unavailable until the unrelated undeclared `vfxService` reference in its dirty test file is repaired. This does not change the Aurora-first proof boundary; no Aurora, Toolset, or NWN process was launched.
## Verification correction - 2026-07-13 catalog graph transport

The catalog test-only `vfxService` wiring defect recorded in the preceding note has been repaired. It was not a runtime or source-MDL transport blocker.

- A generic placeable with a source-MDL emitter remains a `generic` placeable and preserves its normal backend-render path, while the catalog response now also carries the shared Aurora canonical `model_graph_runtime` package (`source_mdl_graph`).
- This proves the intended shared transport boundary for a placeable-hosted VFX source: it does not need to be reclassified as a standalone VFX resource to reach the common model-graph runtime contract.
- Verification: backend TypeScript check, frontend TypeScript check, focused graph/parser and frontend contract tests, and the complete catalog unit specification (`163/163`) passed.

This remains implementation-level evidence only. It is not an Aurora Toolset or controlled-NWN visual-parity packet; those still require the one-trigger, duration-matched proof procedure in `vfx-proof-standard-2026-07-13.md`.

## Implementation update - 2026-07-13 P1 canonical renderer parent-space composition

Recovered Aurora parser evidence establishes that every model node reads local `position`, `orientation`, and `scale`, then resolves its authored `parent` link into the node tree. The canonical Three.js path now consumes the already transported source graph rather than flattening that relationship away:

- Canonical placeable VFX receives `auroraModelGraph` when constructing its renderer group.
- The renderer constructs an internal transform hierarchy from graph nodes and applies each direct local transform once.
- A canonical emitter mesh is attached to the group of its parent, not to a group carrying the emitter's own local transform. Backend runtime draw records already include the emitter-local source position, so this avoids the previously identified double-transform error while applying all static ancestor transforms.
- Source-MDL lights follow the same parent-group attachment and retain their authored local light position. Their own transform is therefore applied once by the light, and their ancestors once by the hierarchy.
- Parent transform timelines remain visible in graph metadata but are not yet played frame-by-frame. No static value is fabricated for them.

Verification completed for this slice:

- `npx.cmd vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts` in `frontend` - 27/27 passing.
- `npx.cmd tsc --noEmit --pretty false` in `frontend` - passed.
- The regression fixture uses a rotated and scaled `dummy` pivot and verifies canonical emitter attachment beneath that pivot plus the expected source-light world position.

Remaining boundary: chunk-model instances still use the aggregate chunk lane and do not yet select a source graph parent per emitter; wrapper transform timelines, inheritance velocity, source animation transform tracks, full derived-GLB correspondence, and Aurora/Toolset/NWN lifecycle comparison packets remain open. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 canonical Chunk parent-space composition

Closed the remaining static-parent inconsistency in the canonical Chunk lane:

- Chunk model groups are now built from each individual `runtimeEmitters[]` render contract, preserving that contract's `emitterNodeName` instead of using only the aggregate chunk lane.
- Each Chunk group is attached to the same source-MDL parent group as textured particles for that emitter. Its local particle coordinates are therefore not transformed twice, while static wrapper/mesh ancestors apply once.
- A mixed textured-plus-Chunk regression supplies a real local Chunk model and a `chunk_pivot` wrapper; it verifies the Chunk model group is parented under that wrapper and that the renderer reports a local model preview rather than a pending lane.

Verification completed for this slice:

- `npx.cmd vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts` in `frontend` - 27/27 passing.
- `npx.cmd tsc --noEmit --pretty false` in `frontend` - passed.

Remaining boundary: parent transform timelines and source-animation wrapper tracks are still not sampled per frame; inheritance velocity, full derived-GLB correspondence, and Aurora/Toolset/NWN lifecycle comparison packets remain open. A local Chunk model is a source-preserving frontend preview only, not retail visual parity proof. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 source-MDL transform timeline snapshots

Recovered common-node parsing semantics are now carried through the one-snapshot canonical path:

- Aurora's common node parser reads `positionkey`, `orientationkey`, and `scalekey` in addition to direct transform fields before resolving the source `parent` relationship. ASCII `dummy`/generic transform wrappers now preserve those keyframes in the unified model graph, not only their first direct values.
- Before ticking an emitter runtime snapshot, the backend samples that emitter's base position, orientation, and scale timelines at the runtime snapshot time. An optional animation pass is still applied after this base sample, preserving the intended overlay order.
- The canonical renderer derives its graph sample time from the backend `runtimeState.sourceClockSeconds`, then samples parent position/scale linearly and orientation spherically. It therefore uses the same snapshot time as the backend source emitter instead of a frontend-local preview clock.
- The parent hierarchy continues to attach emitter meshes and Chunk groups below the parent, so each emitter-local transform is applied only by the backend runtime draw state while sampled ancestors are applied by Three.js once.

Verification completed for this slice:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-mdl-nodes.spec.ts --runInBand` in `backend` - 15/15 passing.
- `npx.cmd jest --config ./jest.unit.config.js test/unit/vfx.application.service.spec.ts --runInBand` in `backend` - 17/17 passing; the regression checks a `0 -> 10` emitter position timeline at `t=0.5` produces position `5` in the runtime draw record.
- `npx.cmd vitest run tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.canonicalVfxRenderer.test.ts` in `frontend` - 27/27 passing; the graph regression checks a moving pivot at backend `sourceClockSeconds=0.5`.
- `npx.cmd tsc --noEmit --pretty false` in both `backend` and `frontend` - passed.

Remaining boundary: this is a deterministic single-snapshot evaluator. It does not yet schedule repeated frontend runtime ticks, recover Bezier transform interpolation, compose source-animation wrapper tracks, or prove lifecycle timing against Aurora Toolset and the controlled NWN oracle. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 source-animation wrapper parsing

- Generic source-animation nodes such as `newanim rise ... node dummy pivot` are no longer emitted as a second parallel model-graph pivot.
- Their transform is attached to the matching base transform node as an explicit `animationTracks[]` entry with animation name, length, transition time, and authored transform keyframes.
- The parser fixture verifies the base `dummy` retains one `rise` track while the graph remains structurally singular.

Verification: `test/unit/aurora-vfx-mdl-nodes.spec.ts` passed 15/15 and backend TypeScript passed. The follow-up contract slice now transports `animationTracks[]` through catalog and placeable normalization, records the normalized selected animation on every runtime emitter package, and lets the canonical graph renderer sample and blend the matching wrapper track. Backend runtime tests pass 17/17, canonical renderer tests pass 20/20, and both package typechecks pass.

Remaining boundary: the selected track is a deterministic runtime snapshot, not an Aurora transition scheduler. Source transition ordering, old/new track selection, Bezier transform interpolation, repeated frontend scheduling, inheritance velocity, and authoritative one-trigger lifecycle proof remain open. No local test is accepted as Aurora/NWN proof.

## Implementation update - 2026-07-13 P1 emitter inheritance state and parent-frame transport

Implemented the source-backed inheritance lanes that can be recovered without inventing renderer behavior:

- `FUN_00a2850c` at `C:\Projects\New Folder\export\decompiled_all.c:853218-853309` supplies `inheritvel` from previous/current emitter origins and the rotated local `+Z` basis. Runtime now computes that state before the authored emission velocity and stores normalized inherited direction plus magnitude separately from the normal velocity vector.
- The active update at `decompiled_all.c:854978-854995` adds inherited direction times magnitude times delta to position, then applies Aurora's `abs((1 - delta) * magnitude)` decay. Runtime snapshots and render draw records preserve both fields independently.
- The `inherit` branch reprojects existing particle position, previous position, and authored velocity between previous/current emitter position, orientation, and scale frames before normal particle physics.
- Catalog placeable packaging now passes the already parsed source model graph into the shared VFX application service. The service retains `parentNodeName`, recursively samples the parent chain at previous/current source and selected-animation times, composes local transforms, and supplies that parent-frame provenance to the common runtime.
- `inherit_local` consumes this explicit parent frame when `inherit` is not active. Missing parent provenance emits `VFX_EMITTER_INHERIT_LOCAL_PARENT_FRAME_REQUIRED`; it is not replaced by a frontend `matrixWorld` guess.
- `inherit_part` remains preserved in runtime and render records together with inherited direction/magnitude. Missing parent provenance emits `VFX_EMITTER_INHERIT_PART_PARENT_FRAME_REQUIRED`; the canonical renderer exposes the transported values for inspection but does not apply a speculative stretch rule.

Verification completed for this slice:

- Backend focused runtime/application/schema/render-contract tests: 83/83 passing.
- Complete catalog unit specification: 163/163 passing.
- Canonical renderer plus workspace attachment tests: 29/29 passing.
- Backend TypeScript check passed.

Remaining boundary: the exact `inherit_part` parent/emitter anchor update and its render-family stretch geometry still require completion from the recovered active-update branch. Repeated frontend runtime scheduling, transition scheduling, and the final saved one-trigger comparison packets also remain open. No Aurora, Toolset, or NWN process was launched for this implementation slice.

## Implementation update - 2026-07-13 P1 inherit-part anchor and emitter reset motion

- `inherit_part` now has its own motion frame: previous/current world emitter origins combined with previous/current owner orientation and scale. Runtime applies it after the `inherit` and conditional `inherit_local` branches, matching the recovered active-particle branch order.
- `particleRot` is consumed directly as the evaluated angular-speed slot and multiplied only by tick delta. The prior extra `2*pi` conversion was removed; Aurora's `+/-2*pi` state wrap remains.
- `randvel` now uses the recovered strict `> 0.01` gate, a signed random term quantized to hundredths, and separate RNG draws for magnitude and sign. It is no longer a continuous unsigned/general-purpose jitter.
- `FUN_00a264c0` at `C:\Projects\New Folder\export\decompiled_all.c:852921-853152` establishes separate random cone tilt and full azimuth sampling before the final velocity vector. Fountain reset now samples that cone around local `+Z`, rotates it by the evaluated emitter orientation, then multiplies by authored velocity plus the signed `randvel` term.
- Active motion now follows the recovered explicit-Euler order: position advances by the current authored velocity, inherited motion is added separately, and only then mass gravity changes velocity for the next tick. The non-source `0.5 * acceleration * delta^2` position term was removed.
- The canonical draw contract and frontend retain `inheritPart`, inherited magnitude, and inherited direction as distinct inspectable fields. No arbitrary preview stretch factor is promoted as source behavior.

Verification completed for the corrected reset/update slice:

- Backend focused runtime/application/render-contract tests: 80/80 passing.
- Backend TypeScript check passed.
- The preceding complete catalog 163/163 and canonical renderer/workspace 29/29 checks remain green for the parent-graph transport integration.

Remaining boundary: repeated canonical lifecycle ticks, animation transition scheduling, and renderer-family retail correlation remain open. The final visual comparison is an additional validation after those implementation stages, not a substitute for them. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 source-MDL light animation sampling

- Source-MDL light `animations[]` are now executed by the canonical renderer instead of being transport-only metadata.
- A light selects the same normalized source animation and snapshot time as the model graph. Position, color, radius, and multiplier tracks are sampled on that clock and blended against the base light values with the selected animation blend weight.
- The sampled animation name, time, color, radius, and multiplier remain inspectable in the Three.js light metadata so a later proof packet can report the exact state that produced the frame.
- The renderer does not create an independent light timer and does not trigger the VFX again. This keeps one snapshot source for particles, parent transforms, and source-MDL lights.

Verification completed for this slice:

- Canonical renderer unit specification: 22/22 passing, including a `t=0.5`, blend-weight `0.5` light-track regression.
- Frontend TypeScript check passed.

Remaining boundary: light shadow-radius and vertical-displacement behavior still require exact source-backed runtime semantics; repeated canonical lifecycle ticks and animation transition scheduling remain open. Visual comparison against Aurora/NWN remains an additional post-implementation validation and is not replaced by these tests. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 evaluated P2P/Lightning reference target

- A direct source-MDL `node reference` target is no longer withheld when its emitter has a non-identity orientation or scale. The target origin is composed from the evaluated emitter position plus its rotated, scaled reference-node local position in emitter-parent space.
- When the transported source model graph contains the reference node, its base and selected-animation transform tracks are sampled with the same source time, animation time, and blend weight as the emitter and parent graph before target composition.
- The runtime still requires exactly one direct child reference and never falls back to emitter origin, a UI target, or a frontend world matrix.

Verification completed for this slice:

- The runtime regression composes a `90 degree` Z rotation and scale `2` into the child-reference endpoint.
- The application regression samples an animated reference at `t=0.5`, composes it once, and verifies the terminal Lightning particle at `[1, 6, 11]`.

## Implementation update - 2026-07-13 P1 P2P drag and threshold crossing

Recovered source anchors:

- `C:\Projects\New Folder\export\decompiled_all.c:854854-854874` predicts the particle endpoint from current velocity and delta, then applies wind when enabled.
- `decompiled_all.c:854891-854935` checks target distance, evaluates `FUN_00b90d88(drag, delta)`, scales velocity by that result, normalizes the target vector, and adds `grav * delta` to velocity plus `grav * delta^2` to the predicted position.
- `decompiled_all.c:854939-854976` computes the closest point from the movement segment to the target and forces particle age to emitter lifetime when that segment enters the squared `threshold` radius.
- `decompiled_all.c:1061625-1061705` is the recovered math-library power helper used by the drag call.

Implementation consequences:

- P2P no longer receives ordinary Fountain motion first and then a second target movement. Its active update owns one ordered source step.
- Source `drag` uses `Math.pow(drag, delta)`; the prior `VFX_P2P_DRAG_HELPER_MAPPING_REQUIRED` diagnostic is removed.
- Threshold expiry checks both the starting point and the full predicted movement segment, using squared distances and no invented collision radius.
- Inherited velocity and mass retain their recovered order after the P2P target step.

Verification completed for the combined target/P2P slice:

- Focused runtime, application, and render-contract tests: 81/81 passing.
- Backend TypeScript check passed.

Remaining boundary: Aurora wind-manager input, P2P Bezier path construction, and retail lifecycle correlation remain open. These implementation tests are not visual parity proof. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 P2P movement-direction slot

- `C:\Projects\New Folder\export\decompiled_all.c:854939-854962` subtracts the pre-step position from the final P2P target-adjusted position, normalizes a non-zero result, and writes it to the particle direction slot before inherited velocity and mass are applied.
- Runtime particles, snapshots, and draw records now preserve this direction separately from authored velocity and inherited velocity.
- Canonical `Aligned_to_Particle_Dir` geometry consumes the transported direction slot when present. Velocity remains an explicit fallback for families/snapshots where Aurora has not supplied a direction value.
- Renderer metadata carries both direction and velocity arrays, keeping later visual comparison able to distinguish the source basis from the fallback basis.

Verification completed for this slice:

- Focused backend runtime/application/render-contract tests: 81/81 passing.
- Canonical renderer plus workspace attachment tests: 30/30 passing.
- Backend and frontend TypeScript checks passed.

Remaining boundary: Aurora wind-manager input, P2P Bezier path construction, Lightning timer/midpoint recursion parity, repeated canonical lifecycle scheduling, and final saved comparison packets remain open. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 P2P Aurora wind-manager contract

- `C:\Projects\New Folder\export\decompiled_all.c:854854-854874` establishes the P2P order: velocity prediction first, then the Aurora wind helper when `affectedByWind` is set, then target resolution and drag/gravity work.
- Runtime now accepts an explicit `AuroraParticleWindContext` whose resolver receives emitter identity, particle identity, current position, and delta and returns the already evaluated Aurora wind displacement.
- The displacement is applied once to the predicted position before target gravity and threshold-segment evaluation.
- Missing context emits `VFX_AURORA_WIND_CONTEXT_REQUIRED`; a missing/non-finite manager result emits `VFX_AURORA_WIND_DISPLACEMENT_REQUIRED`. Neither condition falls back to Blender force fields, generic scene wind, or silently assumed zero wind.

Verification completed for this slice:

- Focused runtime tests: 41/41 passing, including an ordering regression with wind displacement and target gravity in the same tick.
- Backend TypeScript check passed.

Remaining boundary: the workspace/area runtime still needs to supply a selected-profile Aurora wind-manager adapter. P2P Bezier, Lightning timer/midpoint recursion, repeated canonical lifecycle scheduling, and final saved comparison packets remain open. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 sequential fixed-tick runtime

- The backend runtime command now accepts `tickCount` (`1..4096`) in addition to fixed `dtSeconds`; the cache key includes it. The default remains one tick for backward compatibility.
- A multi-tick request creates emitter state once, then advances the same state sequentially. RNG, active/free membership, particle ages, atlas checkpoints, inherited velocity, event latches, and clocks are no longer reset between requested steps.
- Before every tick, base emitter tracks, selected animation tracks, source reference tracks, and parent graph tracks are sampled at that step's boundaries. The evaluated emitter source is written into the existing runtime state before update.
- Selected-animation intervals are split over the requested ticks. Forward ranges and source-length-backed wrap ranges preserve per-step previous/current times, so detonate event scans remain interval-based rather than replaying the full requested range each tick.
- A proof snapshot at 20 seconds can therefore request, for example, `dtSeconds=0.25` and `tickCount=80`. This is one VFX instance evolved through 80 fixed updates, not 80 VFX triggers and not one invalid `dtSeconds=20` jump.

Verification completed for this slice:

- Focused application/schema/runtime/render-contract tests: 90/90 passing.
- The repeated-runtime regression verifies three sequential Fountain particles, clocks at `0.75`, ages `[0.5, 0.25, 0]`, and three persistent membership records after `3 x 0.25` seconds.
- Backend TypeScript check passed.

Remaining boundary: the workspace renderer still needs a frame scheduler or backend snapshot stream to display successive fixed-tick states live. Transition handoff between different selected animations, area wind adapter integration, P2P Bezier, Lightning timer/midpoint recursion, and final saved comparison packets remain open. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 Lightning delay-window cache

Recovered source contract:

- `C:\Projects\New Folder\export\decompiled_all.c:857546-858085` reconciles the active point count, keeps source/target cache fields, and distinguishes the `lightningDelay` cache-transform window from the path-rebuild branch.
- During the delay window, existing points are transformed from cached source/target coordinates into the current source/target frame; the path is not randomly rebuilt every tick.
- A zero count or missing target clears active points but preserves the native timer/cache fields.

Implementation consequences:

- Runtime state and snapshots now preserve the Lightning delay timer, cached source position, and cached target vector.
- The active list now shrinks as well as grows when the evaluated Lightning point count changes.
- A cached path is translated and rotated into the current source-target frame while inside the delay window. `FUN_00b30e30` normalizes both directions, so target-distance changes do not length-scale the path. RNG state is unchanged in that branch.
- The delay branch writes the current source/target cache after transforming. A path rebuild resets the timer but does not seed those cache fields, and topology changes do not bypass the timer comparison.

Verification completed for this slice:

- Focused schema/application/runtime/render-contract tests: 91/91 passing.
- The cache regression doubles the target-vector length during the delay window, verifies the intermediate point is transformed proportionally, and verifies RNG is not rerolled.
- Backend TypeScript check passed.

Remaining boundary: the exact recursive midpoint implementation controlled by `lightningRadius`, the separate `lightningScale` jitter contribution, workspace frame presentation, animation transition handoff, area wind adapter integration, P2P Bezier, and final saved comparison packets remain open. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 Lightning midpoint and scale jitter

Recovered source contract:

- `C:\Projects\New Folder\export\decompiled_all.c:855229-855305` always builds each midpoint and recursively subdivides both halves. `lightningRadius >= 0.01` gates each magnitude sample, whose modulus is `TRUNC(lightningRadius * 100)`; the two signed perpendicular offsets are also scaled by the evaluated source transform scale.
- `decompiled_all.c:857744-857830` first lays out/rebuilds the source-target point chain and then invokes the recursive midpoint helper.
- `decompiled_all.c:857831-857867` performs a separate pass over intermediate points using the evaluated `lightningScale` slot and signed hundredth-quantized random samples.

Implementation consequences:

- Rebuild now has three ordered stages: source/target endpoint placement, unconditional recursive midpoint subdivision, and a separate `lightningScale` jitter pass.
- Endpoint positions remain fixed. Midpoint recursion derives axes from normalized `(first-last)`, uses `(-y,z,-x)` and its cross product, consumes low-bit signs plus radius-bounded modulo magnitudes, and recurses left before right, including the native distance-zero calls.
- The scale pass uses half spacing `length / count * 0.5` as both its `0.01` gate and hundredth modulus bound. `lightningScale` is only the offset multiplier; it is not particle width, size, color, or alpha.
- Both jitter stages use the persistent emitter RNG state. The existing `lightningDelay` cache-transform branch still consumes no random samples and therefore cannot silently redraw a fire-and-forget effect.
- No visual comparison, Aurora launch, or repeated VFX trigger was used to manufacture this implementation result.

Verification completed for this slice:

- Runtime unit specification: 45/45 passing.
- Focused schema/application/runtime/render-contract tests: 94/94 passing.
- Backend TypeScript check passed.
- Regressions separately verify the no-jitter baseline, the `lightningRadius` midpoint gate, the independent `lightningScale` pass, and RNG preservation during the delay window.

Remaining boundary: source control flow, integer conversion, random low-bit/modulo use, axes and field roles are implemented. Workspace frame presentation, animation transition handoff, area wind adapter integration, P2P Bezier, and final one-trigger saved visual comparison packets remain open. Visual comparison against Aurora is an additional validation after implementation, not a replacement for this source-backed work. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 P2P Bezier runtime

Recovered source contract:

- `C:\Projects\New Folder\export\decompiled_all.c:853970-853985` selects a different runtime function pointer when `p2p` and the normalized `p2p_sel` bit are active. Read-only PE inspection of the matching local `nwtoolset.exe` maps table entry `0x00cc0ca8` to Bezier update `0x00a2aff0`, while `0x00cc0cb4` maps to the already recovered gravity update `FUN_00a2c36c` at `0x00a2c36c`.
- Bezier update `0x00a2b3d0-0x00a2b468` clamps `t = particleAge / emitterLife` and builds the cubic weights `(1-t)^3`, `3t(1-t)^2`, `3t^2(1-t)`, and `t^3`.
- `0x00a2b4b9-0x00a2b632` builds the target-side control point from target position plus target forward direction times evaluated `p2p_bezier3`.
- `0x00a2b668-0x00a2b77a` builds the source-side control point from source position plus source forward direction times evaluated `p2p_bezier2`.
- `0x00a2b901-0x00a2ba82` evaluates `pow(t^3, combinetime)` and uses it to blend the velocity-predicted position with the cubic Bezier position. The inherited-velocity and mass branches follow before the final position write.

Implementation consequences:

- P2P Bezier now has a dedicated runtime branch. It does not reuse the gravity/drag/threshold solver and does not fabricate a renderer-side polyline.
- Control points are `P0=source`, `P1=source + sourceForward*p2pBezier2`, `P2=target + targetForward*p2pBezier3`, and `P3=target`. The evaluated reference-node orientation now crosses the target context as a normalized forward direction.
- Source-reference position and orientation are sampled from the same source/selected-animation clock before each sequential tick. This applies to the common model-graph runtime used by standalone and placeable-hosted VFX.
- P2P active particles are updated before the current tick's spawn allocation, matching the recovered Aurora update-class order. A newly spawned particle therefore stays at its reset position until the next fixed tick instead of moving twice in its birth tick.
- A Bezier request with only target position emits `VFX_P2P_BEZIER_TARGET_ORIENTATION_REQUIRED`; no default UI/camera/world-axis target direction is substituted.

Verification completed for this slice:

- Runtime unit specification: 47/47 passing, including exact cubic coordinates and the target-orientation gate.
- Focused schema/application/runtime/render-contract tests: 97/97 passing.
- Complete catalog/placeable unit specification: 163/163 passing.
- Backend TypeScript check passed.

Remaining boundary: exact binary-profile correlation still requires the later saved one-trigger runtime comparison; these tests establish the implemented source contract, not visual parity. Workspace frame presentation, animation transition handoff, area wind adapter integration, and final saved visual comparison packets remain open. Visual comparison against Aurora is an additional validation after implementation. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 Aurora `fieldbezierkey` evaluation

Recovered source contract:

- `C:\Projects\New Folder\export\decompiled_all.c:844818-844856` evaluates vector Bezier tracks from four control points. For the segment from the previous row to the next row, `P0` is the previous value, `P1` is the previous value plus its outgoing tangent, `P2` is the next value plus its incoming tangent, and `P3` is the next value.
- Scalar evaluation through `FUN_00a18ea8` / `FUN_00b32fe4` uses the same three-floats-per-key storage order: value, incoming tangent, outgoing tangent. Vector rows use the corresponding three vectors per key.
- `C:\Projects\New Folder\export\decompiled_all.c:844873-844890` remains the ordinary linear vector-key path. Orientation is evaluated through the separate quaternion/slerp path; no Bezier-orientation formula is inferred from scalar/vector storage.

Implementation consequences:

- A selected animation pass is no longer discarded merely because it contains `bezierKeyRows`. Supported scalar, color/vector, position, and scale timelines are sampled by the shared Aurora evaluator.
- The backend model-graph runtime and the canonical frontend graph renderer use the same tangent convention and clamp to the first/last authored values outside the track interval.
- Missing required tangents suppress only the unsupported sampled value; they do not silently replace an authored Bezier segment with linear interpolation. Bezier-marked orientation remains unevaluated pending its own recovered contract.
- The legacy placeable-preview simulator is not promoted or extended as another canonical source of truth. Backend canonical payloads continue to route pure VFX and placeable-hosted VFX through the shared runtime and canonical renderer.

Verification completed for this slice:

- Backend application specification: 23/23 passing, including a regression where both scalar velocity and vector position evaluate to `8` at `t=0.5`; linear interpolation would produce `5`.
- Canonical renderer already carries the corresponding vector Bezier regression using the same control-point construction; its focused suite is part of the verification gate below.

Remaining boundary: Bezier orientation semantics, selected-animation transition handoff, area wind adapter integration, workspace frame presentation, duplicate preview-runtime deletion, and final one-trigger saved visual comparison packets remain open. Visual comparison against Aurora is an additional validation after implementation. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 shared Aurora wind-manager adapter

Recovered source contract:

- `C:\Projects\New Folder\export\decompiled_all.c:930773-930845` samples the two 16x16 noise grids at `ROUND(position) * 4 mod 16`, interpolates them with manager alpha, scales the global wind vector by that scalar and frame delta, adds point-source wind, and applies yaw/pitch variation.
- `decompiled_all.c:931137-931258` sums active point sources radially inside their radius using normalized source-to-sample direction and magnitude `(radius - distance) * intensity / radius`.
- `decompiled_all.c:931361-931407` advances the shared manager before scene consumers: elapsed time swaps/regenerates the grid and resets to zero, interpolation alpha is recomputed, and point-source remaining time is decremented with expired records removed.
- `decompiled_all.c:930603-930625` and `931421-931437` preserve the seven-float Explosion point-source record: position, radius, duration, remaining-time copy, and intensity.

Implementation consequences:

- Runtime commands can now carry an identified `AuroraWindManagerInput` profile with global vector, variation angles, period/elapsed state, two exact 16x16 grids or a deterministic Aurora grid seed, and active point sources.
- The manager is advanced once per fixed-tick boundary and the resulting shared context is supplied to every emitter. `affectedByWind` therefore consumes the same area/profile state for pure VFX and placeable-hosted model-graph VFX.
- Grid generation uses the recovered hierarchical 16/8/4/2/1 block fill and the existing Aurora 15-bit RNG family. Grid indexing uses FPU-style nearest-even rounding, including negative coordinates.
- `.are` `WindPower` alone is not promoted into a direction or manager state. Without an admitted selected-profile manager snapshot, the existing `VFX_AURORA_WIND_CONTEXT_REQUIRED` diagnostic remains authoritative.
- The complete wind-manager input is included in the VFX output cache key, preventing reuse across different area wind profiles, grids, variation state, or blast point sources.

Verification completed for this slice:

- Focused backend wind/application/schema/runtime/render-contract tests: 102/102 passing.
- Regressions cover global-grid delta, radial point-source contribution, grid period rollover, point-source expiry, API validation, cache-key separation, and a sequential P2P tick consuming the manager without the missing-context diagnostic.
- Backend TypeScript check passed.

Remaining boundary: Explosion must still register its recovered `blastRadius`/`blastLength` transaction into this shared manager during detonate, and the workspace area host must provide an admitted selected-profile manager snapshot rather than `.are` `WindPower` alone. Bezier orientation semantics, workspace frame presentation, duplicate preview-runtime deletion, and final one-trigger saved visual comparison packets remain open. Visual comparison against Aurora is an additional validation after implementation. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-13 P1 Explosion blast/wind transaction

Recovered source contract:

- `C:\Projects\New Folder\export\decompiled_all.c:857152-857194` computes the requested Explosion count, checks the detonate latch and one-shot guard, then registers a wind point source before allocating burst particles when the requested count is non-zero and source blast radius is non-zero.
- The blast call uses runtime emitter world position, source `blastRadius`, source `blastLength`, and intensity `1.0` through the shared manager at scene `+0x10c`.
- A zero requested particle count skips both the blast manager call and particle allocation, while the later latch/guard transaction still consumes and clears detonate.

Implementation consequences:

- Explosion requested count now uses Aurora truncate-toward-zero integer conversion and permits zero. `birthrate=0` no longer fabricates one local particle.
- A non-zero detonate burst with `blastRadius` registers `position/radius/duration/intensity` in the same wind manager before spawning. Missing manager support emits `VFX_EXPLOSION_WIND_MANAGER_REQUIRED`; no emitter-local force field is substituted.
- The shared runtime loop is now tick-major and emitter-minor: the wind manager advances once, then ordered emitters update against that same mutable manager. A blast from an earlier source emitter is visible to later emitters in the same tick and remains active for subsequent ticks.
- The final package exposes `windManagerSnapshot`, including active point-source records and per-particle `AuroraWindSample` traces. This makes the actual grid/global/point-source contributions available to later proof and comparison tooling.

Verification completed for this slice:

- Focused backend wind/application/schema/runtime/render-contract tests: 104/104 passing.
- A zero-birthrate regression proves detonate is consumed with no particles and no wind source.
- A two-emitter model-graph regression proves one Explosion source registers a radius-10/duration-2 point source, a later P2P particle receives the expected `0.9` radial displacement, and the final snapshot records `1.75` seconds remaining after the next fixed tick.
- Backend TypeScript check passed.

Remaining boundary: the workspace area host must provide an admitted selected-profile manager snapshot rather than `.are` `WindPower` alone. Bezier orientation semantics, workspace frame presentation, duplicate preview-runtime deletion, and final one-trigger saved visual comparison packets remain open. Visual comparison against Aurora is an additional validation after implementation. No Aurora, Toolset, or NWN process was launched.

## Implementation update - 2026-07-14 canonical runtime-frame playback

- Every backend emitter package now carries a baseline frame plus one immutable frame for each sequential fixed tick. The frames share one runtime state lineage and RNG stream; they are not separately triggered snapshots.
- The canonical renderer builds synchronized multi-emitter frame groups, displays exactly one frame at a time, advances monotonically, never loops, and clamps on the terminal frame.
- Empty baseline frames no longer manufacture either particle geometry or a diagnostic placeholder. The workspace Three runtime advances the playback from its normal animation update loop.
- Focused canonical-renderer verification passes `23/23`, including the one-trigger/non-overlap regression. The backend lifecycle regression verifies draw counts `0/1/2/3` across baseline plus three fixed ticks.

The complete frontend TypeScript build remains blocked by pre-existing errors in unrelated area, creature-wizard, and `workspaceObjectMeshLayer` changes. The new canonical renderer and comparison runner produce no TypeScript diagnostics.

## Proof attempt - 2026-07-14 row 44

The saved packet is `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row44/`.

- Aurora Web: backend-generated row-44 package, four ordered emitters, 25 synchronized frames per emitter at 12 FPS, one non-looping playback, and a saved 78-frame MP4.
- NWN: exactly one trigger is confirmed by `nwn/trigger-ledger.json`; no retry was performed and the temporary model/texture overrides were removed.
- Invalidation: the NWN recorder acquired its first gameplay frame about `5.1 s` after the single trigger. The source maximum particle lifetime is `0.92 s`; therefore the NWN MP4 contains no during-effect frame and matched timestamps cannot be formed.
- Evidence status is `diagnostic-only`, not `comparison-ready` and not parity. See `comparison-result.json` and `comparison-diagnostic-only.png`.

The next NWN recapture is forbidden without explicit user approval given after this saved MP4. A corrected run must gate trigger scheduling on recorder-confirmed stable gameplay rather than a fixed delay from `OnEnter`.

## Implementation update - 2026-07-14 runtime family and chunk debt

Aurora-first corrections completed in `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` and the renderer contract:

- Shared particle expiry now follows `decompiled_all.c:855146-855182`: check evaluated non-negative `lifeExp` against the previous particle age, recycle on entry to the tick, then add the current delta only for survivors. Negative lifetime is not clamped to a preview minimum.
- Single retains at most one active particle and creates it through the common Aurora reset path. Explosion consumes one deduplicated latch transaction and also uses the common reset path. Lightning point count uses truncate-toward-zero conversion and common reset state.
- The update-family selector now follows `decompiled_all.c:852607` and `:856901-857445`: named Fountain, Explosion, and Single constructors plus the Lightning-compatible fallback. P2P is applied as target motion on the source update family before new Fountain emission; `update P2P` is no longer required or treated as a canonical fifth constructor.
- `chunkName` is a particle render/resource lane selected after update-family construction. Normal source particles own an active chunk model instance reference that is released on recycle. Standalone Chunk no longer creates two stationary placeholder particles.
- The frontend chunk lane consumes runtime position, rotation, scale, model instance reference, and lifecycle status while remaining explicitly retail-unverified.

Verification for this slice:

- Focused backend runtime/render-contract tests: `85/85` passing.
- Runtime tick diagnostics: `11/11` passing, with `canonicalPromotionAttemptCount: 0`.
- Chunk render-contract diagnostics: `1/1` passing, with `canonicalPromotionAttemptCount: 0`.
- Canonical frontend renderer tests: `24/24` passing.
- Backend build passed.

These checks are implementation evidence, not visual proof. The accepted post-debt visual packet remains placeable v41. No NWN capture was rerun, and no VFX was triggered more than once.

## Implementation update - 2026-07-14 ASCII orientation Bezier source quirk

Aurora-first recovery established that `orientationbezierkey` is not a quaternion cubic interpolation lane in the ASCII loader:

- `C:\Projects\New Folder\export\decompiled_all.c:882080-882113` (`FUN_00a57120`) scans at most ten floats into each controller row.
- `decompiled_all.c:882782-882826` (`FUN_00a58220`) computes the controller component type as `(rowFloatCount - 1) / 3`. A 13-column authored orientation Bezier row is therefore truncated to time plus nine values and classified as type `3`.
- `decompiled_all.c:844904-844990` (`FUN_00a19728`) evaluates orientation only when the controller type low nibble is `4`; the Bezier high nibble is not a separate quaternion interpolation branch. The truncated ASCII controller therefore does not drive orientation at any timeline position.

Implementation consequences:

- The ASCII parser consumes the full declared list, preserves the same ten parsed floats per row as `bezierKeyRows` source evidence, emits `VFX_MDL_ORIENTATION_BEZIER_AURORA_NOOP`, and does not promote the row to `orientationTimeline` or infer a first-frame static orientation.
- Backend and canonical-frontend samplers reject an externally supplied orientation Bezier timeline before first/last-frame clamping. A separately authored direct orientation remains authoritative.
- Ordinary `orientationkey` continues to use quaternion spherical interpolation. Scalar and vector Bezier controllers retain their recovered cubic tangent evaluation.

Verification for this slice:

- Backend parser/application tests: `43/43` passing, including row truncation, diagnostic emission, direct-orientation retention, and boundary-time no-op behavior.
- Focused backend runtime/render-contract tests: `85/85` passing.
- Canonical frontend renderer tests: `25/25` passing, including direct-orientation retention at `t=0`.
- No Aurora, Toolset, or NWN process was launched; the saved NWN oracle was not changed.

Remaining implementation boundary: selected-animation transition handoff, workspace area-host wind-manager admission, duplicate preview-runtime deletion, exact Lighten blend-wrapper behavior, and the remaining valid one-trigger visual comparison packets.

## Implementation update - 2026-07-14 exact non-punch blend wrapper contract

The previously recovered `nwtoolset.exe` disassembly in `source-mdl-placeable-emitter-blend-parity-2026-07-11.md` is now carried by the canonical backend contract instead of being left as `diagnostic_pending`:

- source blend bucket `0` records table indices `(0,1)` and `GL_SRC_ALPHA/GL_ONE_MINUS_SRC_ALPHA` (`0x0302/0x0303`);
- source blend bucket `2` records table indices `(0,2)` and `GL_SRC_ALPHA/GL_ONE` (`0x0302/0x0001`);
- Punch-Through records its separate cutout/depth-write branch where the non-punch blend-function wrapper is not invoked;
- the evidence record carries the admitted `nwtoolset.exe` SHA-256 `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`;
- raw bucket-2 literals remain preserved. A known `Lighten` token is not generalized into a friendly name for every unknown bucket-2 literal.

The canonical Three adapter consumes and exposes the exact factor record and applies `SrcAlphaFactor/OneFactor/AddEquation` for bucket `2`. The stale `VFX_BLEND_FUNC_FACTORS_CAPTURE_REQUIRED` diagnostic was replaced with `VFX_BLEND_FUNC_FACTORS_CONFIRMED_NWTOOLSET_DISASSEMBLY` for confirmed non-punch lanes.

Verification for this slice:

- backend render-contract tests: `22/22` passing;
- canonical frontend renderer tests: `26/26` passing;
- runtime render-contract diagnostics: `1/1` passing with `canonicalPromotionAttemptCount: 0`;
- backend build passed;
- frontend typecheck reports only the existing area, creature-wizard, and `workspaceObjectMeshLayer` errors and no diagnostic in `auroraVfxCanonicalRenderer.ts`.

This is implementation evidence, not a new visual proof. No NWN capture was rerun. Remaining implementation boundary: selected-animation transition handoff, workspace area-host wind-manager admission, and the remaining valid one-trigger visual comparison packets.

## Implementation update - 2026-07-14 callback and tick-order trace

The runtime now carries the source-backed evaluation transaction required by the readiness contract:

- Duplicate `event <time> detonate` rows are preserved individually in `detonateCallbackTrace`, including callback order, event key, animation time, byte value written, and consumption clock. `processedDetonateEventKeys` stays a unique latch guard, so duplicate callbacks in one scan still create one Explosion burst.
- Every sequential runtime step emits `AuroraVfxTickTrace` in the recovered order: source snapshot, animation evaluation, interval event scan, callback writes, family update, post-update state, then render input.
- The trace records the explicit selected animation interval and blend weight, the source animation's parsed `transitionSeconds` when present, and the recovered write equation `evaluated*weight+existing*(1-weight)`. It does not invent an outer transition scheduler that the current decompilation does not identify.
- Source and evaluated emitter snapshots make live-field changes auditable before the update family consumes them. Event rows, direct detonate-field writes, callback count, particle membership before/after, diagnostics, clocks, and renderer inputs remain separate records.

Verification for this slice:

- focused backend application/schema/runtime/render-contract tests: `118/118` passing;
- backend TypeScript check passed;
- canonical workspace routing: `11/11` passing;
- explicitly non-canonical legacy preview routing: `123/123` passing.

The canonical workspace regression proves that a backend canonical payload does not attach the legacy source-MDL particle overlay or camera-billboard preview. The readiness contract explicitly permits that old preview to remain as a labelled non-canonical UX affordance, so deleting it from unrelated non-canonical payloads is not a canonical implementation requirement.

This is implementation evidence, not visual proof. No Aurora, Toolset, or NWN process was launched, and the saved NWN oracle was not changed. Remaining implementation boundary: workspace area-host wind-manager admission, conservative handling of the unproven outer animation scheduler, and valid one-trigger visual comparison packets.

## Fresh placeable comparison after Lighten wrapper - 2026-07-14 v42

The current accepted placeable packet is `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-enon-bakery-plc-t04-10s-8fps-proof-v42.md`.

- The saved 10-second NWN MP4 was reused; NWN was not launched or recaptured.
- A static Web gate was captured first. It confirmed three `tm_pl_lightred` / `plc_t04` roots, full static bases, six emitter meshes, 48 particles at `t=5`, both source textures, zero source/Web lights, 11 successful network resources, and zero runtime exceptions.
- Only after that gate passed, one deterministic Aurora Web run was recorded for 10 seconds at 8 fps. It contains 80 frames and one continuous lifecycle, with no repeated VFX trigger.
- The labeled `t=5` comparison and lifecycle contact sheet are fresh v42 artifacts and are displayed from the packet paths; v41 and earlier captures are historical only.
- Verdict remains `matched-with-gaps`: Web still has a weaker/narrower plume and lacks the NWN bakery context, so `canonicalParityPromoted=false` remains mandatory.

This closes the requested fresh post-debt placeable proof for the current renderer. It does not close the missing valid retail family packets, workspace area-host wind-manager admission, or the unproven outer animation scheduler.

## Binary controller timing and refreshed visual packets - 2026-07-14

Aurora-first review of the binary controller metadata and evaluator corrected a general timing error:

- Controller metadata `+6` is the key-time value-pool offset and `+8` is the component-value pool offset. The parser previously ignored `+6` and distributed component rows uniformly across the animation duration.
- The parser now preserves the authored key-time array separately from component rows and builds scalar, vector, color, transform, emitter, and light timelines from those actual times.
- The renderer's frame-pair selection now holds the last authored key after the final key. It previously selected the first key in that case, which could relight an effect during its particle tail.
- Retail `vim_heal04.mdl` confirms non-uniform emitter birthrate keys and a `flash` light whose final color key is black. The fresh Web v7 packet measures receiver illumination while the source light is active and a return to baseline after the black key.

Current row-68 evidence:

- reused NWN MP4: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68/nwn/nwn-row68-one-trigger.mp4`;
- fresh Web MP4: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68/web/web-row68-one-trigger-v7.mp4`;
- comparison: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v2.png` and `.json`;
- measured visible span: NWN `1.333333` seconds, Web `0.987209` seconds, delta `-0.346124` seconds;
- verdict: `valid-comparison-with-open-parity-gaps`, not canonical parity.

The placeable Web packet was then recaptured without rerunning NWN:

- fresh packet: `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-enon-bakery-plc-t04-10s-8fps-proof-v43.md`;
- comparison: `backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-nwn-vs-aurora-web-t5-proof-v43.png` and `.json`;
- the synchronized Web run is 10 seconds, 8 fps, 80 frames, with three full static bases, six emitter meshes, 48 particles at `t=5`, both source textures, and zero source/Web lights;
- the deterministic v43 MP4 is byte-identical to v42 because the controller correction does not alter this persistent `plc_t04` output. The new capture timestamp, frame state, network trace, timeline, and comparison manifest establish that v43 was recaptured after the correction.

The placeable verdict remains `matched-with-gaps`: the Web plume is still weaker/narrower and the isolated camera/context does not reproduce the NWN bakery scene. v42 and earlier are historical only.

## Implementation correction - 2026-07-14 Linked active-list endpoint contract

Aurora-first review exposed a double-subtraction error between the renderer-agnostic contract and the canonical Three adapter:

- `decompiled_all.c:855810-855820` preserves active-list iteration order and establishes `Linked` draw count as `activeParticleCount - 1`.
- `decompiled_all.c:856418-856494` reads the next active particle (`current index + 1`) and its position while constructing each Linked segment.
- The backend already emitted `activeCount - 1` draw records, but the frontend previously interpreted those records as particle points and emitted only `drawRecordCount - 1` segments. Three active particles therefore produced one visible segment instead of two.

The corrected contract now:

- resolves runtime particles in exact `activeParticleIds` order rather than storage-array order;
- writes `linkedNextParticleId` and `linkedNextPosition` on every Linked draw record;
- emits exactly one six-vertex segment per endpoint-bearing draw record;
- uses the current particle's source size for segment width instead of averaging against a separately inferred adjacent draw record;
- keeps the dev fixture structurally honest at `activeCount=5`, `drawCount=4`, `segmentCount=4`, `vertexCount=24`.

Verification:

- focused backend VFX application/schema/runtime/render-contract suites: `118/118` passing;
- focused frontend canonical renderer, workspace routing, legacy-preview routing, and dev-fixture suites: `175/175` passing;
- backend build passed;
- frontend typecheck reports only the existing area, creature-wizard, and `workspaceObjectMeshLayer` errors and no error in the corrected files.

The 2026-07-13 local Linked screenshot/frame packet is explicitly superseded because it encoded the old `N draw records -> N-1 segments` adapter contract. No new NWN capture was run, and no Web-only artifact is promoted as a comparison proof. A fresh Linked visual comparison still requires a valid saved NWN oracle recorded with one trigger and a matched explicit duration.

## Binary animation events and row-22 comparison - 2026-07-14

Aurora-first inspection of retail `vff_explfire.mdl` recovered the binary animation-event layout and closed two implementation defects needed by the Fireball fixture:

- animation metadata `+0xB8` points to the event array;
- every `0x24`-byte event row contains a float time followed by a 32-byte event name;
- every row-22 emitter's `impact` pass preserves four authored `detonate` callbacks at `0`, `0.0333333`, duplicate `0.0333333`, and `0.1333330` seconds;
- event attachment now merges into existing animation passes instead of replacing them, and duplicate source rows remain visible to the runtime latch trace;
- mixed textured-plus-chunk contracts classify only the emitter that owns a chunk resource as `chunk_model`; a sibling graph edge no longer converts all textured emitters to the chunk lane.

The resulting row-22 packet uses the saved NWN oracle once and one fresh Aurora Web playback:

- NWN MP4: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4`;
- Web MP4: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v1.mp4`;
- comparison: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v1.png` and `.json`;
- NWN visible span is `0.583333` seconds and Web is `1.133333` seconds under the shared metric;
- the Web source light measurably illuminates a particle-free receiver region (`16.536586` delta) and returns exactly to baseline (`0.0` delta);
- all six Web emitters finish with zero active particles and the final source-light color key remains black.

Verdict remains `valid-comparison-with-open-parity-gaps`. NWN has a stronger yellow-white peak and much wider environment light spill; Web has a stronger red-orange contour and a longer, more vertical smoke tail. Different scenes and cameras remain an explicit limitation, so this packet does not claim pixel parity.

## Fountain spread-axis correction and fresh placeable comparison - 2026-07-17

Aurora-first review of the particle reset path closed a general Fountain
orientation and random-sampling defect:

- `FUN_00a28334` confirms the existing signed spawn rectangle and `0.0001`
  final unit multiplier.
- `FUN_00a264c0` rotates the emitter forward vector around local X and then
  local Z. The prior Web spherical expression was rotated 90 degrees in local
  XY.
- Spread and `randvel` now use raw `rand15` modulo and low-bit sign semantics
  instead of normalized-float buckets.
- Three focused regressions cover exact local-X/local-Z direction, modulo
  wraparound and signed `randvel`; the complete runtime file passes `78/78`.
- Backend build passes.

The fresh proof packet is
`backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14/post-debt-enon-bakery-plc-t04-10s-8fps-proof-v47-aurora-spread-axis.md`.
It reuses the saved NWN MP4 without launching NWN, performs a static gate
first, and records one deterministic 10-second / 8 fps / 80-frame Web
lifecycle. The side-by-side MP4 places NWN on the left and Web v47 on the
right.

The synchronized t=5 frame shows that the dark star-shaped center is present
in both outputs. Open gaps remain in color/luminance, plume silhouette,
environment/postprocess and visible instance count. The packet is
`valid-comparison-with-open-parity-gaps`, with
`canonicalParityPromoted=false`.
