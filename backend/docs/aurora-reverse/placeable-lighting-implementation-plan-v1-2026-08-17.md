# Placeable lighting implementation plan v1 — 2026-08-17

Visual-rendering update: receiver illumination, halo exclusion, flame/bloom
isolation, and matched NWN visual completion are now governed by
`placeable-lighting-visual-parity-implementation-plan-v2-2026-08-18.md`.
This v1 document remains authoritative for storage, runtime NWScript,
source-MDL preservation, and active-light scheduling gates.

Status: M1 source-MDL feature-preservation hardening implemented on
2026-08-17; M2 Aurora parity remains blocked by the research and live-proof
gates below.

Implemented checkpoint:

- backend packages complete `sourceMdlLights` beside a bounded v1 source-feature
  manifest;
- frontend returns exactly `canonical_supported`,
  `legacy_fallback_required`, or `blocked`;
- unsupported, malformed, truncated, unknown, or contradictory input cannot
  silently suppress the richer light-only host;
- canonical lights are removed without removing canonical particle/static
  siblings, and the fallback survives canonical resource refreshes;
- instance `LightState`, runtime illumination/recompute, and exact
  `Use Area Lighting` semantics were not guessed. Their resume conditions are
  recorded in `placeable-lighting-research-ledger-2026-08-17.md`.

Implementation verification on 2026-08-17:

- backend focused contract and packaging tests: `7/7` passed; backend build
  passed;
- frontend focused policy, payload, and host-integration tests: `87/87`
  passed; frontend production build passed;
- targeted lighting-policy mutation run: `247/247` relevant mutants killed,
  mutation score `100.00%`;
- full frontend unit baseline: `2350/2386` tests passed, with `36` failures in
  five pre-existing non-lighting suites; this gate is `failed`;
- frontend regression-smoke baseline: `20/78` tests passed, with `58` failures
  in nine pre-existing workspace/auth suites; this gate is `failed`;
- accepted current CDP runtime proof now exists for current catalog candidate
  `plc_bhp_arcn1a`: ON reports the resolved 2DA light as `active` with one
  PointLight and one fast shadow; OFF (`lightState=0`) reports it as
  `disabled` with zero PointLights and zero fast shadows, while the independent
  source-MDL node `auroralight01` remains attached in both frames;
- both frames have `accepted=true`, runtime identity `ready`, host graph
  `pass`, assets `settled`, draw ledger `pass`, and proof gate `pass`; see
  `placeable-lighting-web-proof-2026-08-17.md` and
  `artifacts/placeable-lighting-proof-2026-08-17/`;
- the Aurora Web visual/runtime gate is now `verified` for that candidate.
  Toolset/NWN retail proof remains `missing`, and retail parity is not
  promoted.

These results admit the fail-closed M1 implementation for review, but they do
not satisfy the global Definition of Done or promote
`retailParityStatus=verified`.

Source audit:
`backend/docs/aurora-reverse/placeable-lighting-agent-audit-2026-08-17.md`.

## 1. Target outcome

Deliver one source-backed placeable-lighting vertical slice that:

1. resolves `placeables.2da` / `lightcolor.2da`, UTP or proven GIT
   illumination state, and source-MDL light nodes without merging their source
   semantics;
2. uses one shared client lighting materializer for ordinary and canonical-VFX
   placeable hosts;
3. never silently drops a modeled light field;
4. edits and persists only a proven existing-instance illumination field;
5. updates only the affected object and light-budget selection;
6. exposes bounded diagnostics and exact provenance;
7. passes automated, visual, differential, performance, mutation, readback,
   and current live proof gates.

The feature has two milestones:

- **M1 — editor/render complete:** all confirmed source/storage/render behavior
  is implemented, unknown retail behavior fails closed, and local quality
  gates pass.
- **M2 — Aurora parity complete:** every in-scope runtime, shadow, budget, and
  toggle semantic is confirmed and implemented, and every required current
  proof fixture is `verified`.

Only M2 may be reported as **placeable lighting complete**. M1 must retain a
`PARTIAL_SOURCE_BACKED_RETAIL_BLOCKED` status.

## 2. Scope

### Included

- placeables.2da `LightColor`, `LightOffsetX/Y/Z`, and `ShadowSize` resolution;
- lightcolor.2da RGB resolution and provenance;
- UTP `LightState`, the missing-field default, and any separately proven GIT
  instance field;
- source-MDL light nodes, scalar flags, flare arrays, and animation tracks;
- ambient/diffuse light-channel adaptation and radius/falloff;
- fast-shadow selection and final rendering;
- shared active-light budget and owner ordering;
- exact `Use Area Lighting` behavior;
- existing-placeable inspect/edit/save/reopen behavior for the admitted
  instance field;
- runtime illumination/recompute behavior once recovered;
- local diagnostics, performance, and accepted Toolset/NWN proof.

### Excluded

- authoring `placeables.2da`, `lightcolor.2da`, MDL, textures, or HAK content
  from the ordinary Placeable Properties window;
- particle-emitter simulation except for preserving a hybrid placeable's
  static-mesh/emitter/light sibling composition;
- global Area/tile-light authoring;
- arbitrary new-placeable lighting overrides;
- shader/post-processing changes not required by a confirmed placeable-light
  contract;
- xoreos behavior as runtime authority.

An excluded item cannot be implemented opportunistically in this slice.

## 3. Aurora knowledge gate

### Confirmed enough for immediate hardening

- `placeables.2da.LightColor` selects lightcolor.2da RGB;
- placeable light offsets and the current source-carrier path are preserved;
- `ShadowSize=0 -> Fx_Shadow_S`, `2 -> Fx_Shadow_L`, and other present numeric
  values select `Fx_Shadow_M`;
- UTP `LightState` is parsed, and missing UTP state defaults to ON from a retail
  `nwserver.exe` binary xref;
- source-MDL light nodes preserve position, color, radius, multiplier,
  `ambientOnly`, shadow/dynamic/priority flags, flare arrays, and animation
  tracks in the backend contract;
- the renderer active-slot hard cap is source-backed at 128, while exact
  cross-lane owner precedence is not recovered.

### Required targeted research before semantic implementation

| ID | Unknown semantic | Required authority | Blocks |
|---|---|---|---|
| `PL-R01` | Whether and how placed GIT objects persist `LightState`, including exact GFF type, absence, and legal values | raw GFF corpus plus Toolset save/readback and retail binary/decomp where needed | Phase 5 |
| `PL-R02` | `SetPlaceableIllumination`, `GetPlaceableIllumination`, and `RecomputeStaticLighting` timing, state ownership, persistence, and affected geometry | NWScript contract plus retail call-path/runtime observation | Phase 6 |
| `PL-R03` | Exact `Use Area Lighting` scope across 2DA and source-MDL placeable lights | Toolset decomp/call path and isolated toggle oracle | Phase 8 |
| `PL-R04` | MDL `shadow`, `shadowradius`, `verticaldisplacement`, flare occlusion, lens flare, fading, and dynamic flags in the selected renderer profile | Toolset/NWN decomp plus isolated fixtures | Phase 4 parity promotion and Phase 7 |
| `PL-R05` | Fast-shadow projection, receiver state, opacity, and inherited render-state order | same-camera retail/Toolset trace and pixel oracle | Phase 7 |
| `PL-R06` | Exact accepted/dropped owner order across tile, 2DA placeable, MDL, item, and ProgFX lanes | direct renderer slot dump or complete classifier-grade owner oracle | Phase 8 |

Each research item must end as either `confirmed` with an English audit and
exact anchors, or `blocked` with a resume condition. A blocker never becomes a
guessed implementation.

## 4. Architecture decision

Placeable lighting becomes a shared lighting bounded responsibility:

```text
UTP/GIT + placeables.2da/lightcolor.2da + source MDL
                         |
                         v
             PlaceableLightingContract v1
                         |
             +-----------+-----------+
             |                       |
      source/policy resolver   shared light materializer
             |                       |
      mutation/readback       ordinary + canonical hosts
             |                       |
             +-----------+-----------+
                         |
              diagnostics / proof ledger
```

Required boundaries:

- **source resolver:** validated source facts and provenance only;
- **policy:** effective illumination, supported/blocked features, and active
  owner request; no Three.js objects;
- **materializer:** Three.js light/shadow/flare construction from admitted
  policy;
- **host adapters:** transforms and lifecycle attachment only;
- **mutation projector:** exact source/target pairs and GFF readback;
- **diagnostics:** dev-only high-cardinality object report plus low-cardinality
  pipeline events.

The canonical VFX host must not own a second implementation of MDL light
behavior. It supplies a source owner/model graph to the shared materializer.

## 5. Contract-first work

Before production-code changes, add an additive FE-BE contract-v1 addendum for
**Existing Placeable Lighting**. It must freeze:

1. a versioned normalized read contract containing distinct sections for:
   - resolved 2DA light and fast-shadow source;
   - blueprint, instance, defaulted, and effective illumination state;
   - source-MDL light records;
   - per-field `rendered | preserved | blocked` support status;
   - renderer eligibility, retail-parity status, and blocker codes;
2. presence-sensitive provenance: absence is not a default and does not
   authorize a write except for the separately proven UTP default rule;
3. the existing-instance mutation shape, if `PL-R01` confirms it, as an exact
   complete source/target pair on the existing bounded placeable property
   mutation;
4. cache-key and area-object fingerprint participation;
5. backward-compatible optional fields and migration behavior;
6. payload budgets, node/flare cardinality limits, truncation policy, and
   stable failure diagnostics based on a measured retail/custom corpus;
7. the existing Area Update budgets unless measured data proves a versioned
   change is required: 25 MiB draft, 4 KiB command, 16 KiB receipt, no binary
   assets in JSON, and no streaming for one constant-size state mutation;
8. authorization, `If-Match`, idempotency, atomic publication, GIT/GIC
   preservation, rollback/quarantine, and independent readback inherited from
   Area Update v1.

`LightColor`, offsets, `ShadowSize`, and MDL nodes remain read-only resolved
source data in this contract. The normal property mutation must not accept
table/model overrides.

## 6. Ordered implementation phases

### Phase 0 — branch, baseline, evidence ledger, and fixture freeze

Actions:

- work on a dedicated branch/worktree from `dev`, not in the current heavily
  dirty VFX worktree;
- record baseline full tests, mutation scores, build, and renderer performance;
- produce the six `PL-R*` research ledgers;
- select immutable vanilla and custom fixtures and record exact module, Area,
  GFF/2DA/MDL/texture, ordered HAK, and expected object identities/hashes;
- define the versioned proof profile and artifact destination without starting
  Toolset/NWN.

Exit gate:

- branch/worktree isolation verified;
- baseline artifacts are durable;
- every unknown is `confirmed` or explicitly `blocked`;
- fixture/proof profile passes its offline validator;
- no live proof is claimed.

### Phase 1 — freeze the contract and public diagnostics

Actions:

- add the FE-BE contract-v1 addendum;
- add backend/frontend types and boundary schemas;
- define stable lighting diagnostic codes and support statuses;
- define a bounded dev-only object report with Area/object identity, source
  keys, model/node names, effective state, active-slot decision, transform,
  asset settlement, and blockers;
- add low-cardinality pipeline stages/results without resource paths or object
  identifiers as metric labels.

Exit gate:

- contract tests pass for old clients, new valid payloads, missing optional
  fields, maximum budgets, and every invalid/truncated payload;
- all public fields have source, version, cardinality, and failure semantics;
- no production renderer behavior has changed.

### Phase 2 — TDD acceptance skeleton

Write failing tests before implementation for:

- UTP/GIT/2DA/MDL parse and provenance;
- default/off/on state resolution;
- every MDL scalar, flare array, and animation track;
- supported/preserved/blocked field handling;
- ordinary/canonical host equivalence;
- existing-instance property mutation and exact readback, if admitted;
- incremental scene update and cleanup;
- shadow selection and pixel validator;
- constrained cross-lane budgets;
- UI preserve-only and editable states;
- failure diagnostics and backward compatibility.

Exit gate:

- the red suite fails for the intended missing behaviors, not fixture/setup
  errors;
- each phase below has named tests and an acceptance fixture;
- test locations follow unit, integration, regression, golden, visual,
  differential, performance, and compatibility taxonomies.

### Phase 3 — extract the shared lighting core without semantic change

Actions:

- extract pure source normalization, policy, score request, and materialization
  interfaces from the oversized placeable/VFX renderer modules;
- route existing 2DA and legacy source-MDL preview through the new interfaces;
- keep host-specific model transforms and selection decoration in adapters;
- preserve existing output and explicit preview/parity labels.

Exit gate:

- behavior/golden snapshots are unchanged;
- ordinary and canonical hosts consume the same normalized light policy;
- one toggle/add/remove touches only the selected object and affected active
  slots, never rebuilds the full Area;
- no duplicate light policy remains in the touched renderer paths;
- focused unit/integration/regression gates pass; mutation testing is optional
  and requires an explicit user request.

### Phase 4 — close canonical source-MDL feature loss

Actions:

- create an exhaustive field-handling table for the source-MDL light contract;
- materialize every confirmed field through the shared core;
- keep unconfirmed fields preserved and explicitly blocked;
- suppress the legacy light host only when the shared canonical result declares
  every present source feature handled;
- otherwise use a proven equivalent fallback or fail closed with a visible dev
  diagnostic; never silently degrade;
- cover parent/model-graph transforms, owner lifecycle, and hybrid static mesh
  + emitter + light composition.

Exit gate:

- every source-MDL light field has an asserted `rendered`, `preserved`, or
  `blocked` outcome;
- no fixture loses shadows, flares, animation, priority, or dynamic flags by
  switching host paths;
- canonical and ordinary-host outputs match for the same normalized input;
- retail-unverified fields remain noncanonical and cannot set parity true.

### Phase 5 — existing-instance illumination authoring and storage

Prerequisite: `PL-R01=confirmed`.

Actions:

- transport exact presence-sensitive instance state from Area GIT through the
  API and immutable scene provenance;
- map only admitted values into the Aurora-aligned Placeable Properties shell;
- keep 2DA/MDL values read-only in the lighting inspector;
- implement Apply/OK/Cancel and undo/redo through the scene mutation facade;
- emit only a changed, complete expected/target pair;
- extend Area Update validation/materialization with exact field type,
  expected-value check, isolated GIT mutation, unchanged-field/GIC preservation,
  atomic publication, readback, receipt, and rollback.

Exit gate:

- absent/wrong-type/out-of-domain source remains preserve-only;
- explicit zero remains distinct from absence;
- stale, partial, unchanged, duplicate, deletion-colliding, or wrong-family
  mutations fail closed;
- save/reopen returns the exact target value and preserves every unrelated
  byte/field;
- Apply/Cancel/history behavior is deterministic and regression-covered;
- no new-placeable or table/model override is admitted.

If `PL-R01` is blocked, this phase remains absent and M2 cannot complete.

### Phase 6 — runtime illumination and recomputation

Prerequisite: `PL-R02=confirmed`.

Actions:

- model stored, effective, and runtime illumination state separately;
- implement the recovered Set/Get/Recompute state machine and timing;
- recompute only proven affected static-light data and scene objects;
- keep command and query paths separate;
- expose before/after effective state and recompute reason in dev diagnostics.

Exit gate:

- Set/Get round-trip matches retail for every admitted value;
- recompute timing and affected objects match the recovered oracle;
- no recompute occurs when state is unchanged;
- repeated commands are deterministic and retry-safe;
- load/save/runtime transitions have integration and differential coverage.

### Phase 7 — 2DA light and shadow parity

Prerequisites: `PL-R04`, `PL-R05` confirmed for promoted behavior.

Actions:

- verify RGB, offset, radius/falloff, ambient/diffuse channel, and intensity
  adaptation on fixed fixtures;
- keep `ShadowSize` asset selection separate from projection acceptance;
- implement the confirmed shadow caster, receiver, stencil/depth/color state,
  opacity, inherited state, and source-MDL shadow behavior;
- remove procedural fallback from accepted proof paths; fallback remains a
  dev diagnostic and blocks proof.

Exit gate:

- exact source values and transforms pass domain/golden tests;
- S/M/L selection passes separately;
- same-camera/same-viewport shadow comparison passes the existing
  `shadow-volume-campfire-footprint-opacity-v1` thresholds:
  `meanAbsRgbDelta <= 8`, `rmsRgbDelta <= 18`,
  `changedSampleRatioGt5 <= 0.15`, and changed-bounds area ratio `<= 0.35`;
- state-order validator passes;
- no pending/fallback/placeholder asset is present.

These thresholds may be tightened before the first accepted capture, but may
not be loosened after seeing a failing implementation without a documented
validator-version decision.

### Phase 8 — LightManager ordering and `Use Area Lighting`

Prerequisites: `PL-R03`, `PL-R06` confirmed.

Actions:

- replace preview score/cap owner selection with the recovered common policy;
- apply the proven toggle scope consistently and label the UI accordingly;
- cover tile main/source, 2DA placeable, source-MDL, item-property, and ProgFX
  owners under budgets `1,2,3,4,5,6,8,32` and the hard cap;
- record accepted/dropped owner identity in the bounded dev proof report.

Exit gate:

- accepted/dropped owner sets and exact order match the retail oracle at every
  tested budget;
- the hard cap never exceeds 128 or the lower configured limit;
- the toggle affects exactly the recovered lanes and preserves unrelated
  lights;
- restore behavior after owner removal/toggle is deterministic;
- no preview policy remains reachable in the parity-enabled production path.

### Phase 9 — full quality, proof, documentation, and release

Actions:

- run focused and full backend/frontend gates;
- run regression, integration, round-trip, golden, differential, visual,
  performance, determinism, and compatibility tests where applicable; mutation
  testing is optional and requires an explicit user request;
- update the implementation matrix and contract/readiness documentation;
- use persistent Playwright only for debugging and automated browser
  regression, not final proof;
- for any Toolset/module authoring use `aurora-toolset-operate` plus
  `aurora-toolset-author`; for proof also use `aurora-toolset-prove`;
- run the versioned Toolset profile and central AUR-S07 atom or validated
  user-provided runtime-capture ingestion;
- visually inspect and validate every exact artifact.

Exit gate: the global Definition of Done in section 9 passes with no waiver.

## 7. Required test matrix

| Layer | Minimum cases |
|---|---|
| Backend unit | UTP/GIT presence and type, missing default, 2DA row/RGB/offset/shadow resolution, MDL complete field/track preservation, mutation validation, cache/fingerprint |
| Frontend unit | normalized state, field support table, light materialization, transforms, cleanup, host equivalence, budget decisions, UI state mapping |
| Integration | GFF/2DA/MDL -> API -> scene -> shared materializer; draft -> expected/target mutation -> candidate GFF -> readback |
| Round-trip/golden | parse/serialize/parse for admitted GIT state; immutable vanilla and custom source corpora; unrelated-field byte/semantic preservation |
| Regression smoke | inspect, Apply, repeated Apply, OK, Cancel, undo/redo, save/reopen, toggle, Area continuity, ordinary and hybrid placeables |
| Mutation | all changed backend policy/writer and frontend domain/scene/layout logic; score not below baseline; no unreviewed survivor in changed lighting policy |
| Visual/differential | off/on, color/offset, S/M/L shadows, ambient/diffuse MDL, shadow/flare animation, hybrid host, toggle, cross-lane saturation |
| Performance | locked Area fixtures at configured light budgets, incremental toggle/add/remove, teardown, repeated lifecycle, bounded diagnostics |
| Compatibility | missing new optional fields, old cached payload hydration, renderer profile/build variants that the contract explicitly supports |

Minimum command gates before merge:

```text
cd backend
npm.cmd run test:unit
npm.cmd run test:e2e

cd ../frontend
npm.cmd run test:unit
npm.cmd run test:regression
npm.cmd run build
```

Mutation testing is outside this verification gate. If the user explicitly
requests it, use the repository opt-in wrapper with
`AURORA_MUTATION_TESTS=1`; it runs one targeted job at concurrency `1`.

Focused suites run first; full suites are mandatory at the final gate.

## 8. Required proof fixture matrix

Exact resources, positions, camera, module/Area identity, and hashes are frozen
in Phase 0. The profile must include at least:

| ID | Fixture | Required observation |
|---|---|---|
| `PL-F01` | missing UTP `LightState` | effective ON with exact default provenance |
| `PL-F02` | explicit illumination OFF/ON pair | light and shadow lane deltas, storage/readback, no unrelated delta |
| `PL-F03` | 2DA LightColor plus nonzero offsets | exact RGB and world position |
| `PL-F04` | ShadowSize S/M/L set | exact asset selection and accepted projection pixels |
| `PL-F05` | source-MDL diffuse and ambient-only nodes | channel, radius, falloff, transform, active state |
| `PL-F06` | source-MDL shadow, flare, and animated tracks | all present fields handled with exact lifecycle |
| `PL-F07` | hybrid static mesh + emitter + light placeable | no sibling loss, duplicate, or fallback |
| `PL-F08` | `Use Area Lighting` OFF/ON | exact recovered lane scope and restoration |
| `PL-F09` | all light-owner lanes under constrained budgets | exact accepted/dropped order at `1,2,3,4,5,6,8,32` |
| `PL-F10` | runtime Set/Get/Recompute sequence | exact state, timing, affected objects, and persistence policy |
| `PL-F11` | malformed/missing/unsupported source | explicit blocker, no guessed renderer or mutation |

Every fixture records:

- commit/runtime build identity and lighting contract version;
- module hash, ordered HAK/resource hashes, Area and object identity;
- exact source rows, GFF fields, MDL nodes, textures, and expected state;
- renderer/model/texture readiness with no pending or fallback state;
- before/after readback, engine-load log, capture path/hash, and validator;
- `proofCompleteness=verified|failed|missing` only.

No fixture is accepted from the retired `capture-area-lighting-retail-*`
helpers, an arbitrary desktop/canvas screenshot, a stale capture, or a local
Playwright diagnostic frame.

## 9. Global Definition of Done

Placeable lighting is complete only when all conditions below are true.

### Evidence and contract

- all six `PL-R*` items are confirmed and implemented; none remains blocked;
- FE-BE contract v1, payload budgets, versioning, diagnostics, and mutation
  shape are frozen and documented;
- every implemented semantic cites Aurora/retail authority; no Three.js or
  xoreos behavior is used as source truth.

### Data and implementation

- 2DA, blueprint/instance/effective state, and MDL lanes remain distinct;
- every input field is rendered, preserved, or blocked explicitly;
- ordinary and canonical hosts use one shared materializer;
- canonical composition cannot suppress a richer result;
- instance edits use exact expected/target pairs and pass atomic save/readback;
- runtime recompute, shadows, scheduler, and toggle match confirmed behavior;
- object edits are incremental and do not reload/rebuild the full Area;
- all created lights, sprites, shadow resources, callbacks, and diagnostics are
  released on removal, Area close, or host replacement.

### Automated quality

- all focused and full commands in section 7 pass;
- all applicable integration, round-trip, golden, visual, differential,
  determinism, compatibility, and performance tests pass;
- mutation score is at least the locked baseline and changed lighting-policy
  modules have no unreviewed surviving mutants;
- one-object toggle/add/remove causes no full-Area rerender;
- live light count never exceeds the configured limit or 128;
- repeated 100-cycle add/toggle/remove tests return Three.js object/resource
  counts to baseline with no retained callbacks;
- fixed-scene p95 frame time at each locked budget regresses by no more than
  10% from the Phase-0 baseline; any stricter existing project SLO wins;
- production build contains no dev-only proof UI/endpoints by default.

### Visual and live proof

- every `PL-F01..PL-F11` fixture is `proofCompleteness=verified` on the exact
  accepted artifact lineage;
- Toolset observation and AUR-S07/runtime ingestion pass their validators with
  exact module/Area/object identities, fresh state, engine log, and saved
  capture artifacts;
- all placeable-relevant oracle gates pass; shadow tolerances and active-slot
  owner maps contain no failed or missing result;
- visual review finds no blank, duplicate, fallback, placeholder, stale, or
  unexpected light/shadow/flare;
- final implementation matrix state is `IMPLEMENTED`, while the versioned
  lighting contract/proof report independently records
  `retailParityStatus=verified`; neither remains `PARTIAL` or
  `matched-with-gaps`.

### Delivery hygiene

- implementation is isolated from unrelated dirty work;
- touched oversized modules are reduced or left behind narrow facades, with no
  new duplicate policy;
- all audit/contract/proof artifacts are linked in the handoff;
- no Toolset/NWN process is closed without explicit user authorization or an
  already applicable accepted cleanup policy.

If any item is false, the feature is not complete. Report the exact gate as
`failed` or `missing`, retain the current verified evidence, and provide the
resume condition.

## 10. Recommended execution slices

During implementation, keep ownership non-overlapping and integrate in this
order:

1. Aurora evidence and fixture/profile lane;
2. FE-BE contract and backend source/mutation lane;
3. frontend domain/property-editor lane;
4. shared renderer/materializer lane;
5. automated quality/performance lane;
6. observability/proof/validator lane.

No lane may implement semantics still blocked in section 3. Contract and red
tests land before shared production behavior; proof runs only after the exact
candidate is immutable and all offline gates pass.
