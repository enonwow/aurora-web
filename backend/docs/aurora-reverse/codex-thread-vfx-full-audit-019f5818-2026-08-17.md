# Full VFX audit for Codex thread `019f5818-4b01-7f31-a7cc-ce273f90f352`

Date: 2026-08-17  
Audit lane: read-only implementation, evidence, continuity, and reproducibility audit  
Audited branch: `codex/vfx-row216-aurora-first-20260812`  
Audited HEAD: `348e8ff0e27677b7c611c56afa4d706685b393f0`  
Overall verdict: **NO-GO for full Aurora/NWN VFX parity and for completion of the recovered thread objective**

## Executive verdict

The thread produced a large and technically meaningful VFX implementation. Focused backend and frontend VFX suites pass, both applications build, the local diagnostic gate passes, proof generation is fail-closed, and later work correctly rejected an invalid row181 proof instead of promoting it. Those are strong implementation-quality signals.

They do not close the stated goal. The current strict retail gate reports zero canonical fixtures out of ten. Required retail build, source, parser, resolver, runtime-tick, render-contract, capture-reference, and comparison bindings remain absent. The placeable preview path is still a separate simulator, Type10 still carries semantics that it does not execute, the legacy decompilation export is not bound to an auditable lineage, and the best surviving visual packets still show substantial camera, scene, morphology, timing, lighting, or endpoint gaps. Current evidence is useful local diagnostic evidence, not Aurora/NWN retail parity proof.

No Toolset or NWN process was launched during this audit. No product code was changed.

## Recovered objective and audit scope

The target thread itself is no longer loadable through the Codex thread interface. Its persistent objective was recovered from six surviving child-session transcripts. In substance, the task was to implement a full Aurora-first VFX capability with:

- one Aurora MDL graph, resolver, runtime, and renderer for pure and placeable-hosted VFX;
- geometry, emitters, source-MDL lights, controllers, animation, Fountain, Single, Explosion, P2P, Lightning, and Chunk families;
- correct render and blend lanes and resource selection;
- shared backend/frontend contracts;
- retirement of duplicate placeable preview paths;
- valid one-trigger lifecycle comparison packets under the VFX proof standard;
- Aurora source and Toolset as primary authority, with NWN used only as a controlled runtime oracle.

The audit covers the current branch, recovered thread history, current implementation documents and checklists, current source paths, surviving row216, row181, and `plc_t04` proof artifacts, decompilation lineage records, repository state, focused tests, builds, and both local and strict VFX gates.

## Findings

### [P0] The recovered completion objective is not met

The current implementation checklist marks P0 through P11 done at a local implementation level, but P8.1 remains in progress and P12 retail/parity remains in progress. The required retail capture work remains open. The placeable emitter architecture audit likewise leaves P3 runtime-family parity hardening and P4 Aurora/NWN/Toolset comparison proof open.

Fresh strict-gate result:

| Strict requirement | Required fixtures | Canonically allowed | Missing |
| --- | ---: | ---: | ---: |
| Retail build binding | 10 | 0 | 10 |
| Aurora source binding | 10 | 0 | 6 |
| Parser binding | 10 | 0 | 10 |
| Resolver binding | 10 | 0 | 10 |
| Runtime-tick binding | 10 | 0 | 10 |
| Render-contract binding | 10 | 0 | 10 |
| Capture-reference binding | 10 | 0 | 10 |
| Comparison binding | 10 | 0 | 10 |

The gate correctly exits non-zero and reports `canonicalAllowed=0`, `blocked=10`. This is the decisive completion blocker. Passing local suites cannot replace those retail bindings.

### [P0] Aurora/decompilation authority is not reproducibly bound

The current legacy export audit records `blocked_unbound_legacy_export`. The repository therefore cannot reproduce the complete source lineage for all earlier decompilation-derived claims from the current snapshot. Recent slices contain better source citations and the current documentation quarantines historical xoreos references, but that remediation cannot retroactively establish an immutable Toolset-binary/export/command/output chain.

Consequences:

- complete decompilation coverage cannot be claimed;
- historical source-backed claims without a bound export must remain provisional or be re-derived;
- local runtime agreement cannot be promoted to Aurora authority merely because tests pass;
- the final retail proof packs must bind exact retail build/profile and source/parser/resolver/runtime/render evidence independently of the legacy export.

### [P1] The duplicate placeable VFX simulator remains active

The recovered objective explicitly required retirement of duplicate placeable preview paths. That acceptance condition is not met.

`createPlaceableVfxPreviewGroup` and its helper remain in `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`, and `workspaceObjectMeshLayer.ts` still invokes the placeable-only path at multiple sites. The placeable architecture audit also identifies this as an open acceptance item.

This creates two behavior owners:

- the canonical pure-VFX runtime/renderer;
- a separate placeable preview simulator and fallback path.

Until placeable-hosted emitters, lights, controllers, animation, resource selection, and lifecycle behavior are demonstrably handled by the shared runtime, the renderer is not unified and parity fixes can diverge between the two paths.

### [P1] Existing comparison packets are diagnostic, not retail parity proof

The surviving packets are valuable and should be retained, but none closes matched Aurora/NWN parity:

- **row216:** hashes and one-trigger lifecycle telemetry are coherent, signed strand order was corrected, and the packet is explicitly local-only. Visual inspection still shows a materially different scene and a tighter, more heart-shaped Web effect. Camera, scene, and phase remain open.
- **row181 v4:** the earlier v3 packet was correctly rejected because the visible endpoint did not establish the claimed target contact. V4 binds a better evidence chain and a source-backed 625 ms owner formula. It still does not prove endpoint, temporal, or pixel parity; camera, scene, and owner/target presentation remain blockers.
- **`plc_t04` v61:** the contact sheet shows different scene composition, camera, host count, flame width/colour, and light spill. This is useful behavior evidence, not a controlled like-for-like retail comparison.

The local diagnostic gate explicitly reports `localOnlyNotRetailEvidence=true` and `canonicalParityPromoted=false`. This is the correct status. Any summary that describes these packets as full parity would overstate the evidence.

### [P1] Type10 carries unexecuted semantics and has silent failure paths

The current Type10 contract carries `orientationMode`, but the application service still produces an identity owner orientation instead of executing that semantic. The projectile trajectory builder only handles a narrow path/timing combination and returns `undefined` for missing context, unsupported paths, or unavailable timing without a structured diagnostic.

Additional open edge conditions include:

- no explicit finite-vector validation at the trajectory boundary;
- zero or negative speed collapsing to a zero-duration result rather than a classified diagnostic;
- short and invalid distances lacking a documented audit corpus;
- exact-end active-boundary behavior needing a golden timing contract;
- no golden ULP/distance corpus that proves numerical behavior at thresholds.

This means the Type10 contract is broader than the behavior actually owned by the runtime. Unsupported cases must be visible and fail closed; they must not silently appear as an absent effect.

### [P2] Repository state is not a reproducible effective snapshot

The audited worktree contains 1,316 status entries with default untracked handling and 52,932 entries when all untracked files are enumerated. Of those, 253 default-status and 3,996 all-status entries are VFX-related. The current snapshot mixes product changes, documentation, generated evidence, local diagnostic outputs, and unrelated work.

Evidence volume is also substantial:

- broad VFX proof directory: 1,350 files, approximately 0.53 GiB;
- top-level VFX-like artifact directories: 29 directories, 544 files, approximately 0.138 GiB;
- complete artifact tree: 20,911 files, approximately 1.67 GiB.

The problem is not evidence quantity. It is the absence of a small, revision-bound manifest that states which exact source revision, generator, inputs, raw capture, derived artifact, hashes, and verdict form the current effective proof set. Without that boundary, a future operator cannot reliably distinguish current evidence from rejected, superseded, or merely diagnostic evidence.

### [P2] Core VFX responsibilities remain concentrated in giant files

Current approximate file sizes include:

| File | Lines |
| --- | ---: |
| `workspaceObjectMeshLayer.ts` | 22,488 |
| `catalog.application.service.ts` | 19,136 |
| `auroraVfxCanonicalRenderer.ts` | 5,992 |
| `aurora-mdl-vfx-source.parser.ts` | 5,477 |
| `aurora-vfx-runtime-state.ts` | 3,473 |
| `vfx.application.service.ts` | 3,015 |

These files mix discovery, resolution, simulation, rendering, presentation, fallback, diagnostics, and proof-adjacent behavior. That makes ownership difficult to audit and increases the risk that a family fix changes another lane. Refactoring before behavior is bound would be risky, but the final implementation should split around already-proven contracts: source parsing, graph resolution, lifecycle state, family execution, render-lane planning, Three.js realization, and placeable integration.

### [P2] Documentation and runtime diagnostics contain drift

The canonical renderer still contains a diagnostic stating that chunk rendering is not implemented in the slice, while the same current renderer includes resolved local chunk-model handling and a more precise retail-proof-pending diagnostic. The stale message can misclassify current behavior during debugging and proof review.

The broader documentation has improved by separating renderer eligibility from retail parity, but historical readiness text, current implementation state, and proof status remain spread across several large documents. The August 17 audit and the strict gate must remain the current authority until a new revision-bound closeout supersedes them.

### [P2] Thread continuity and recoverability failed

The target task cannot be opened by its thread ID, and the root transcript after the August 13 continuation was not recoverable through the normal interface. Six child-session transcripts preserve the objective and read-only audit findings, but no consolidated root closure was found after that continuation.

This is not evidence that implementation data was lost; the branch and artifacts remain. It is a continuity failure because:

- the persistent objective remained incomplete;
- findings were fragmented across child sessions;
- the task cannot now be resumed or inspected by ID;
- the final status must be reconstructed from repository state and child-session evidence.

Future long-running work should write a short revision-bound checkpoint after each proof slice, with current goal, exact HEAD, accepted evidence hashes, rejected packets, open blockers, and the next command.

## Positive controls and work that should be preserved

The audit found several strong practices:

- Later row181 work rejected an invalid proof instead of weakening the gate.
- Proof promotion is fail-closed; the strict gate blocks all incomplete fixtures while still reporting canonical-claim validation as internally safe.
- The local diagnostic gate distinguishes diagnostic confidence from retail parity.
- Focused backend and frontend tests are broad and currently green.
- Recent documentation separates source-backed implementation status from retail comparison status.
- Recent slices did not treat xoreos as Aurora runtime authority, and current policy quarantines legacy secondary-reference material.
- Row216 and row181 packets contain hashes, lifecycle observations, and explicit residual blockers rather than hiding them.

These controls are a good foundation for completion. They should not be discarded during cleanup.

## Fresh verification performed for this audit

| Check | Result |
| --- | --- |
| Backend focused VFX unit suite | PASS — 21 suites, 353 tests |
| Frontend focused VFX unit suite | PASS — 13 files, 343 tests |
| Backend build | PASS |
| Frontend build | PASS, with large-chunk warnings at approximately 4.03 MB and 2.40 MB |
| Local VFX diagnostic gate | PASS — 7/7 commands, 11/11 runtime checks, 1/1 render-contract check, 3/3 capture-analyzer checks |
| Local contract visual evidence | PASS locally — 10 fixtures, 31 requirements, 189 semantic checks; no retail promotion attempted |
| Strict retail parity gate | EXPECTED BLOCK — 0/10 canonical fixtures, exit code 1 |
| Fresh Toolset/NWN matched capture | NOT RUN / MISSING |
| Complete decompilation lineage replay | BLOCKED by unbound legacy export |

The focused suites and builds establish current local code health. They do not establish repository-wide regression health, retail renderer parity, or visual equivalence. This audit did not rerun the complete repository test matrix.

## Ordered remediation and completion gate

1. **Freeze a revision-bound VFX snapshot.** Separate product changes from unrelated dirty work. Create a manifest for accepted source, generator, raw capture, derived artifacts, hashes, verdict, and supersession state. Do not delete rejected evidence until the manifest is complete.
2. **Close or explicitly retire the legacy lineage gap.** Re-bind the exact Toolset binary/export/commands/outputs where possible. Where impossible, re-derive the required semantics from a new immutable primary-source audit and mark old claims historical rather than canonical.
3. **Make the shared runtime the only behavior owner.** Move placeable-hosted emitters, lights, controllers, animation, resource selection, and lifecycle behavior onto the canonical graph/runtime/renderer. Remove `createPlaceableVfxPreviewGroup` and its fallbacks only after equivalent tests and diagnostic captures pass.
4. **Close Type10 contract gaps.** Execute or remove `orientationMode`; add structured unsupported/missing-context diagnostics; validate finite inputs; define zero/negative speed and exact-end semantics; add short-distance, threshold, and ULP golden tests.
5. **Finish P8.1 and family-specific observation.** Bind emitter/MTR material boundaries, source context, runtime observation, chunk ownership, negative-light behavior, blend lanes, controller timing, and deterministic random/camera inputs.
6. **Create ten complete retail proof packs.** Each pack must bind the exact retail build/profile, primary source, parser result, resolver result, runtime ticks, render contract, raw Toolset/NWN capture, Web capture, comparison artifact, hashes, and blocker-free verdict.
7. **Use matched one-trigger scenes.** Match area, camera, owners/targets, cadence, visibility window, lighting, and post-duration state. Re-run row216, row181, `plc_t04`, and the remaining required fixtures under the current proof safety contract.
8. **Require strict promotion.** Completion requires the strict gate to report 10/10 canonical fixtures with no unexpected failed or bridge tiles and no unresolved visual blockers. A local diagnostic PASS remains insufficient.
9. **Refactor after contracts are bound.** Split the giant files along proven behavior boundaries and retain golden tests at each boundary. Address frontend chunk size as a separate performance/release concern.
10. **Write a final closeout checkpoint.** Bind the completed revision, clean status scope, exact commands, exact proof manifest, retail gate output, residual non-parity limitations, and rollback point.

## Completion statement

The implementation is advanced and locally testable, but the recovered task must remain open. The accurate current label is:

> **Partial source-backed VFX implementation with strong local diagnostics; retail parity, unified placeable ownership, complete source lineage, and final comparison proof remain blocked.**

No claim of full VFX completion, Aurora parity, NWN parity, or complete decompilation reproducibility is supported by the current evidence.
