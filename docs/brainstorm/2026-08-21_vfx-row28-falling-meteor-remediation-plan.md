# VFX Row 28 Falling Meteor Remediation Plan

## Implementation status — 2026-08-21

Implemented in the worktree:

- identity-neutral ASCII and binary source-node transform extraction;
- binary mesh controller `128` as a mesh-material alpha lane, separate from
  emitter/particle alpha;
- additive backend/frontend transport for transform tracks,
  `meshMaterialState`, and `meshMaterialAnimationTracks`;
- source-model geometry composition in the canonical comparison and workspace
  renderer, including per-instance material isolation;
- proof host-graph expectations derived from the transported source model graph
  instead of a hard-coded empty static branch list;
- arbitrary renamed-node tests for parser, renderer, transport, and proof graph.

Still gated: targeted Node test execution, fixture regeneration, NWN/web MP4
capture, frame comparison, and parity classification. The repository-wide
resource-safety directive prohibiting Node/Chrome/runtime proof remains active.

## Status

Implementation is present in the worktree. Replacement runtime proof is not yet complete.

The existing `v6a` proof packet is retained as immutable regression evidence and is
classified as `failed-semantic-component-missing`. It must not be used as completion
evidence because Aurora Web does not show readable falling meteor bodies before the
impact phase.

## Objective

Restore the source-driven falling-meteor phase of `VFX_FNF_METEOR_SWARM` in the
canonical Aurora Web VFX renderer, without introducing any renderer, runtime,
capture, or proof behavior that branches on a concrete VFX ID, row number, ResRef,
filename, fixture name, model name, tile, creature, or other asset identity.

The completed effect must reproduce the authoritative NWN sequence closely enough
to show the same semantic stages:

1. falling meteor bodies,
2. descent trails,
3. body-to-impact spatial continuity,
4. impact flash and rings,
5. post-impact smoke.

Exact pixel identity is not required. Semantic completeness, timing, spatial
continuity, and source-contract correctness are required.

## Established Evidence

- The installed-source fixture contains `RockLarg*` and `Cylinder*` static mesh
  nodes in the source model graph.
- The fixture contains two source chunk emitters, `OmenEmitter02` and
  `OmenEmitter03`, targeting `fx_meteor`.
- The nested `fx_meteor` runtime contains the `Ring`, `sparks`, `Smoke`, and
  `Metorflame` emitters.
- The current Web proof renders the impact/flash phase but does not render a
  readable falling-body phase comparable to the NWN oracle.
- Existing onset, duration, energy, and centroid metrics did not detect this
  semantic omission. They are therefore necessary but insufficient acceptance
  gates.

These observations formed the pre-audit evidence set. The focused Aurora-first
closure below identifies the primary missing-body cause and separates it from
remaining calibration work.

## Aurora-First Audit Closure — 2026-08-21

The focused decompilation and exact-source audit is complete:

`backend/docs/aurora-reverse/vfx-row28-falling-meteor-aurora-decompilation-audit-2026-08-21.md`.

It confirms that the source `impact` animation contains six `RockLarg*`
position tracks descending from Aurora Z `15.35..16.68` to the ground, plus
mesh-alpha tracks for every body and `Cylinder*` child. Aurora Web currently
drops those animation-root mesh controllers in the binary parser and catalog
transport. The comparison and production wiring also fail to supply source
geometry and the source model graph together, while the proof host graph
hardcodes zero expected static branches.

Phase 1 is therefore closed for implementation: the primary missing-body cause
is a generic model-node animation/material transport and wiring defect. It is
not a row-28 calibration problem and must not be repaired with an asset-identity
branch. The legacy decompiler export remains lineage-unbound, so the audit does
not claim a newly reproducible full Ghidra session or complete retail parity.

## Mandatory Constraints

1. Aurora-first: establish the authoritative source behavior before changing the
   renderer. No implementation may be based on visual guessing alone.
2. Identity neutrality: shared code must not contain behavior branches for row 28
   or any other concrete asset identity.
3. Data-driven variation: asset-specific expectations and calibration belong in a
   typed, versioned presentation/proof profile, never in renderer control flow.
4. Test-first: every renderer correction starts with a failing generic contract or
   metamorphic test using arbitrary fixture identities.
5. Diagnosability-first: missing geometry, animation, nested runtime, and semantic
   stages must produce explicit ledgers and blocker codes.
6. Immutable evidence: the `v6a` packet remains unchanged. Replacement artifacts
   use a new versioned directory and manifest.
7. Resource safety: use at most one managed backend family, one managed frontend
   family, and one globally locked browser capture. Stop all owned process trees
   after proof.

## Implementation Plan

### Phase 0 — Reclassify the current baseline

- Record `v6a` as `failed-semantic-component-missing`.
- Add the blocker code
  `VFX_REQUIRED_FALLING_METEOR_COMPONENT_MISSING` to the proof audit.
- Preserve the existing videos, frame sheet, validation output, hashes, and
  manifest as immutable before-state evidence.
- Prevent aggregate luminance/timing metrics from upgrading this packet to
  `verified` while a required semantic component is missing.

Exit gate: the repository and proof report agree that `v6a` is a failed baseline,
not an accepted proof.

### Phase 1 — Close the Aurora/source semantic audit

- Bind the audit to the exact installed-source model, fixture payload, nested
  runtime payload, GLB, NWN oracle, and their hashes.
- Trace the `RockLarg*` and `Cylinder*` nodes from source graph to GLB mesh binding,
  hierarchy, material, visibility, transform, and animation tracks.
- Sample those nodes at deterministic times before impact and record their world
  bounds and motion.
- Trace `OmenEmitter02` and `OmenEmitter03` through chunk instance creation,
  instance-owner transforms, nested `fx_meteor` time, and destruction.
- Determine from source evidence which contract supplies each visible component:
  falling body, trail, impact, and smoke.
- Document any Aurora semantic that remains unknown. Do not implement across an
  unresolved semantic boundary.

Exit gate: an evidence-backed component lineage identifies the source nodes and
runtime instances responsible for the falling phase. If it cannot be established,
the task is `NO-GO` for renderer implementation and remains a research blocker.

### Phase 2 — Add generic failing contracts

- Add a renderer test proving that source static geometry is bound to its graph
  node and remains visible when the source contract says it is visible.
- Add a deterministic animation test proving that a generic mesh node changes
  transform across sampled time.
- Add a chunk-owner test proving that a nested effect inherits the spawning
  instance transform and lifecycle.
- Add a geometry ledger test that fails on unresolved source mesh or material
  bindings.
- Add semantic-proof tests for generic required roles:
  `falling-body`, `descent-trail`, `impact`, and `post-impact-smoke`.
- Add metamorphic tests that run the same behavior with at least two arbitrary,
  renamed fixture identities and produce equivalent results.
- Extend the static AST identity-neutrality gate if any newly touched critical
  surface is not already covered.

Exit gate: the new tests fail for the missing generic renderer/proof contracts and
do not mention row 28 in shared behavior code.

### Phase 3 — Repair the canonical renderer generically

- Correct source-model mesh materialization and graph-node binding where the audit
  proves it is incomplete.
- Apply the selected source animation and deterministic sample time to source
  geometry on every canonical frame.
- Correct generic visibility, hierarchy, coordinate conversion, bounds, and
  lifecycle behavior identified by the audit.
- Correct chunk-instance ownership so nested runtime transforms and time derive
  from the spawning source instance.
- Keep visual calibration values in typed profiles and keep renderer control flow
  independent of concrete asset identities.
- Reject unresolved bindings and placeholders instead of silently rendering an
  incomplete effect.

Exit gate: all Phase 2 tests pass and the debug ledger shows active, moving
source-authoritative falling components for the fixture without an identity branch.

### Phase 4 — Strengthen proof observability

- Add a versioned proof-profile schema for required semantic component roles and
  trigger-relative sampling windows.
- Record for every required role: source lineage, visible instance count,
  first-visible time, last-visible time, bounds, trajectory, and related impact.
- Add a semantic validator that rejects an effect containing only impact rings,
  flash, or smoke when a falling body/trail is required.
- Add a body-to-impact continuity check: the descending component must terminate
  near a later impact component within a tolerance calibrated from the NWN oracle.
- Report missing, unresolved, fallback, and placeholder components as explicit
  blockers.

Exit gate: the validator fails on the preserved `v6a` Web capture specifically for
the missing falling phase while retaining the existing timing/energy results as
diagnostic data.

### Phase 5 — Calibrate visual parity after semantic recovery

- Compare the number and distribution of falling events, descent direction and
  duration, body scale, trail scale, impact pairing, flash/ring scale, and smoke
  persistence against the NWN oracle.
- Adjust only source-derived transforms or typed presentation-profile parameters.
- Do not use bloom, brightness, impact rings, or camera framing to conceal missing
  geometry.
- Keep camera and trigger alignment stable so every iteration is comparable.

Exit gate: the effect contains all authoritative stages and remaining differences
are calibration differences, not missing behavior.

### Phase 6 — Produce a fresh immutable proof packet

- Reuse the accepted immutable NWN oracle only if its exact hashes and runtime
  lineage still match the proof profile; otherwise capture a new NWN oracle using
  the standard Toolset/NWN workflow.
- Capture one fresh Aurora Web MP4 through the guarded, globally locked capture
  path.
- Generate one trigger-aligned side-by-side NWN-versus-Web MP4.
- Generate a frame comparison sheet with explicit descent, pre-impact, impact,
  peak, smoke, and post-duration samples.
- Save the semantic validation report, numerical validation report, renderer
  ledgers, source hashes, artifact hashes, and versioned proof manifest.
- Inspect both videos and the comparison sheet visually before assigning the final
  verdict.

Exit gate: the new proof manifest is self-contained, immutable, and classified
`verified`; no older packet is overwritten.

### Phase 7 — Run regression and handoff gates

- Run focused VFX renderer, runtime, model-graph, chunk, profile, proof, and
  identity-neutrality tests.
- Run the required frontend VFX regression suite and production build.
- Run the required backend proof-profile and capture-contract tests.
- Confirm zero unexpected failed assets, bridge assets, unresolved bindings,
  placeholders, or fallbacks.
- Confirm that no managed server, watcher, capture, browser, NWN, or Toolset process
  owned by the task remains after handoff.
- Do not run mutation testing unless separately and explicitly requested.

Exit gate: all required automated gates pass, all proof blockers are closed, and
process cleanup is verified.

## Completion Criteria

All criteria below are mandatory. A single failure makes the result `NO-GO`.

| ID | Criterion | Required evidence |
| --- | --- | --- |
| C-01 | Falling meteor bodies are clearly visible in Aurora Web before impact; the effect is not represented only by ground rings, flash, or smoke. | Fresh Web MP4 plus at least two trigger-relative pre-impact frame samples. |
| C-02 | The falling bodies move along a source-authoritative descending trajectory across time. | Deterministic transform/bounds ledger and frame comparison. |
| C-03 | Multiple spatially distinct meteor events are present when required by the audited source/NWN sequence. | Instance ledger and side-by-side MP4. |
| C-04 | Each accepted falling event has readable body-to-impact spatial and temporal continuity. | Semantic continuity validator and paired frame samples. |
| C-05 | Descent trails, impact flash/rings, and post-impact smoke are all present; none substitutes for the falling body. | Required-component report marked complete. |
| C-06 | Source static geometry and nested chunk runtime have complete lineage, with zero unresolved mesh/material bindings. | Geometry, animation, and chunk ownership ledgers. |
| C-07 | Trigger onset, last-visible time, and total duration match the NWN oracle within one capture frame unless a tighter source-derived tolerance is specified. | Numerical timing report bound to both MP4 hashes. |
| C-08 | Descent, impact, peak, and smoke phases appear in the same order and comparable trigger-relative windows as NWN. | Trigger-aligned MP4 and phase-indexed contact sheet. |
| C-09 | The final visual review classifies the result as semantically complete and at least closely approximated; exact pixel identity is not required. | Signed proof verdict with noted residual differences. |
| C-10 | Shared renderer/runtime/capture/proof code contains no behavior branch based on concrete asset identity. | Static AST gate and code review. |
| C-11 | Generic behavior survives arbitrary fixture renaming and profile substitution. | Passing metamorphic identity-neutrality tests. |
| C-12 | Asset-specific calibration exists only as typed, versioned source/profile data. | Schema validation and profile diff. |
| C-13 | There are zero unexpected failed or bridge assets, zero placeholders/fallbacks, and zero stale-capture conditions. | Proof safety validator output. |
| C-14 | The proof packet contains the actual NWN MP4, fresh Web MP4, side-by-side MP4, comparison frames, validation reports, ledgers, hashes, and manifest. | New immutable proof directory and manifest. |
| C-15 | Required focused tests, frontend VFX regression tests, production build, and backend proof contracts pass. | Saved command results in the handoff audit. |
| C-16 | The preserved `v6a` packet remains unchanged and explicitly recorded as the failed baseline. | Hash comparison and proof history entry. |
| C-17 | All owned runtime process trees are stopped and global service/capture locks are released. | Cleanup audit. |

## Explicit NO-GO Conditions

The implementation must not be accepted when any of the following is true:

- there are no clearly visible falling meteor bodies;
- only rings, flashes, smoke, or bright particles are visible;
- a meteor body appears but does not descend or cannot be paired with an impact;
- the fix contains a concrete asset-identity branch or name-pattern dispatch;
- the result passes only aggregate brightness, duration, or centroid metrics;
- required source geometry, animation, material, or chunk lineage is unresolved;
- the proof uses a stale Web capture, a placeholder comparison, or a non-NWN oracle;
- either comparison MP4 or the descent-focused frame comparison is missing;
- the proof has not been visually inspected;
- unexpected failed/bridge assets, placeholders, fallbacks, or leaked processes
  remain.

## Planned Replacement Artifacts

The replacement packet uses a new version such as `web-v7` and
`comparison-v7`; the final version is chosen once the implementation is ready.
It must include:

- the exact accepted NWN runtime MP4 and hash,
- one fresh Aurora Web runtime MP4,
- one trigger-aligned side-by-side comparison MP4,
- one phase-indexed frame comparison sheet emphasizing the falling phase,
- semantic and numerical validation JSON,
- renderer/model/chunk diagnostic ledgers,
- source/profile/artifact hashes,
- a versioned proof manifest with the final verdict.

## Definition of Done

The task is done only when every completion criterion is satisfied and the new
proof packet is `verified`. Passing tests without visible falling meteor bodies is
not completion. A visually improved effect without identity-neutral contracts and
proof is also not completion.
