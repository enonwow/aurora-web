# VFX asset-identity branch remediation plan

Date: 2026-08-21

Status: approved implementation plan; remediation not yet complete

## Outcome

Remove every VFX behavior decision that depends on a concrete asset identity from
shared runtime, renderer, loader, preview, fixture, capture, proof, analysis, and
export code. Per-asset variation must be declared as source data or as a typed,
versioned, immutable, evidence-bound profile consumed by generic algorithms.

The completion gate is **zero forbidden identity-dependent behavior selectors in
the complete VFX pipeline**, not zero `if` statements. Semantic conditions such
as blend mode, source row type, lifecycle, missing data, validation failures, and
resource availability remain valid. Exact identity comparisons remain valid only
for input validation, authorization, cache isolation, provenance, proof target
binding, and test assertions, as defined by canonical Core Rule 35.

This work introduces no new Aurora semantic. It reorganizes already admitted
behavior and proof calibration, so a new decompilation audit is not required.
Any missing semantic discovered during migration must remain explicitly missing
or blocked rather than be reconstructed from a row number, resref, label, file
name, fixture ID, or naming pattern.

## Current baseline

The row 28 Meteor Swarm radiance, bloom, camera, viewport, and runtime-frame
materialization settings have already been moved into its fixture manifest and
are consumed generically. That is only a partial remediation.

The first manual inventory found the following high-confidence violations. This
list is a starting point; the AST inventory gate in Phase 0 is authoritative.

| Area | Current identity selector | Behavior selected | Required replacement |
| --- | --- | --- | --- |
| `frontend/src/modules/vfx/dev/NwnVfxComparisonRunner.tsx` | row 22/68 fixture IDs | camera, viewport, evidence paths, calibration | manifest `viewProfile` |
| same | row 210/216/181/50-placeable/1/50/AOE0/44 fixture IDs | camera and framing profiles | manifest `viewProfile` |
| same | row 1 fixture ID | clear/background color | manifest render profile |
| same | row 216 fixture ID | capture postprocess profile | manifest postprocess profile |
| same | row 22/68/181 fixture IDs | diagnostic receiver/target geometry | manifest diagnostic-scene recipe |
| `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx` | cross-lane fixture ID | injected point lights, markers, and diagnostic metadata | fixture diagnostic-scene data |
| `backend/scripts/run-vfx-visual-correlation.mjs` | seven exact fixture IDs | check sets, thresholds, semantic descriptions, blockers, and result wording | declarative proof-analysis profile plus generic check registry |
| `backend/scripts/check-vfx-retail-capture-setup-validation.mjs` | ProgFX Type 9 fixture ID | additional required prerequisites | subject manifest prerequisites |
| `backend/scripts/create-vfx-retail-blocker-packet.mjs` | ProgFX Type 9 and catalog placeable fixture IDs | missing-evidence sets and report flags | subject manifest data and generic aggregation |
| `backend/scripts/create-vfx-retail-evidence-handoff-manifest.mjs` | ProgFX Type 9 and catalog placeable fixture IDs | operator action, packet path, and priority expectations | typed handoff data in the subject manifest |
| `backend/scripts/refresh-vfx-visual-audit.mjs` | ProgFX Type 9 and catalog placeable fixture IDs | render-pass exception, backlog ordering, and display title | typed audit policy and display metadata |
| `backend/scripts/generate-vfx-capture-sequences.mjs` | label contains `_BEAM_` | beam capture mode | authoritative source semantics; block when the semantic field is missing |

The following identity uses are classified as allowed unless they also feed a
behavior decision:

- route allowlists and fixture lookup;
- manifest-to-request identity binding;
- source row, label, resref, module, and SHA-256 validation;
- cache-key isolation;
- immutable proof-artifact identity checks;
- approved-row authorization lists;
- test assertions and historical proof assertions.

Allowed comparisons must be isolated from behavior code and reported by the
static gate. An allowed comparison cannot be used indirectly to choose a camera,
numeric parameter, material, render path, check set, prerequisite, report policy,
or recovery action.

## Target contracts

### 1. Fixture envelope

Introduce a single versioned fixture envelope, for example
`aurora-vfx-fixture-manifest/v2`, with these top-level responsibilities:

- exact fixture identity and source/provenance binding;
- source model, resource, row, and evidence hashes;
- runtime/render profile reference or embedded immutable profile;
- proof presentation profile;
- proof analysis profile;
- capture subject metadata and prerequisites.

The envelope is selected by ordinary route/data lookup. The selected identity
must only bind the request to the exact manifest. All subsequent behavior must
come from validated fields in that manifest.

### 2. Render and presentation profile

Define a strict `aurora-vfx-render-profile/v1` schema containing only typed,
bounded fields:

- projection, viewport, camera transform, look target, and camera calibration;
- clear color and frame materialization policy;
- radiance and bloom calibration;
- postprocess configuration;
- diagnostic-scene primitives and light probes;
- calibration status, source evidence, version, and content hash.

No callbacks, expressions, arbitrary renderer-property bags, identity-derived
defaults, or free-form code hooks are permitted. A generic default may be used
only when it is global and identity-neutral. Proof mode must fail closed when a
required evidence-bound calibration is absent.

### 3. Proof analysis profile

Define `aurora-vfx-proof-analysis-profile/v1` as declarative data:

- capture policy such as one-trigger, loop, duration, FPS, and diagnostic ban;
- a list of semantic check IDs and typed parameters/tolerances;
- required evidence and missing-oracle blockers;
- expected result classification and human-review metadata;
- source evidence, version, and content hash.

Check IDs describe reusable semantics, for example `draw-record-count`,
`component-count-range`, `ordered-alpha-fade`, `color-range-set`,
`position-arc`, `atlas-grid`, or `body-node-binding`. They must never contain a
fixture, row, VFX constant, resref, or catalog name. A generic evaluator registry
may branch on those semantic check types because they are contract operations,
not asset identities.

### 4. Capture subject profile

Move proof prerequisites, display titles, priorities, operator actions, packet
paths, and expected blocker categories into a typed
`aurora-vfx-capture-subject/v1` data record. Audit, blocker, handoff, and setup
scripts become generic reducers over these records.

### 5. Contract boundary behavior

- Validate all profiles before renderer or proof initialization.
- Reject unknown keys, unsupported versions, non-finite values, out-of-range
  values, missing hashes, and unbound evidence.
- Keep payload-size and collection-count budgets.
- Never silently fall back from an invalid asset profile to an identity-specific
  hardcoded value.
- Keep old immutable proof manifests unchanged. New source/profile hashes require
  new proof artifacts and cannot inherit the old proof's verified status.

## Implementation phases

### Phase 0: executable inventory and red gate

1. Add an AST-based `check-asset-identity-neutral-vfx` repository check.
2. Scan VFX frontend, backend, scripts, generators, capture, proof, and export
   code for control flow or parameter lookup based on `fixtureId`, row/constant,
   resref, filename, catalog/template/object ID, label, or a derived alias.
3. Detect `if`, `switch`, ternary, identity-keyed maps/objects, naming-pattern
   branches, and helper indirection. Regex search remains a secondary review aid,
   not the acceptance gate.
4. Emit a machine-readable report with separate forbidden and allowed findings.
5. Add red tests for every currently known forbidden family before changing its
   implementation.

The checker must not use a growing line-by-line suppression list. Allowed identity
operations live in narrow validation, routing, authorization, cache, provenance,
and test modules with explicit APIs. Shared behavior modules have a zero-identity-
comparison policy.

### Phase 1: contract and generic consumers

1. Add schemas, TypeScript types, parsers, limits, and diagnostics for the three
   profiles.
2. Add generic camera, postprocess, radiance, diagnostic-scene, analysis-check,
   and capture-subject consumers.
3. Add metamorphic tests using arbitrary names such as `fixture-alpha` and
   `fixture-beta`:
   - the same profile with different identities produces identical behavior;
   - different profiles with swapped identities produce behavior from the
     profile, never the identity;
   - renaming a fixture does not change output;
   - missing required data blocks proof instead of selecting a hidden fallback.

### Phase 2: frontend comparison runner migration

1. Move every remaining view profile out of
   `NwnVfxComparisonRunner.tsx` and into generator-owned manifests.
2. Load and validate the manifest before initializing the renderer. Remove the
   identity-based fallback profile bootstrap.
3. Move row 1 background, row 216 postprocess, and row 22/68/181 diagnostic
   geometry into typed profile fields.
4. Delete the identity-taking view/background helpers and the row-specific
   postprocess and diagnostic branches.
5. Preserve fixture ID only for route allowlisting, manifest binding, cache
   isolation, provenance, and proof output identity.

### Phase 3: development fixture runner migration

1. Represent the cross-lane lights, markers, transforms, and metadata as a typed
   diagnostic-scene recipe in fixture data.
2. Replace `addCrossLaneRuntimeProbeLights(scene, fixtureId)` with a generic
   `materializeDiagnosticScene(scene, profile)` implementation.
3. Prove that the same generic materializer handles two arbitrary diagnostic
   profiles without knowing either fixture name.

### Phase 4: proof, correlation, capture, and export migration

1. Replace the exact-fixture booleans and nested conditional text in
   `run-vfx-visual-correlation.mjs` with declarative semantic checks.
2. Move fixture-specific thresholds, check membership, evidence descriptions,
   blockers, and result wording into versioned analysis profiles.
3. Move Type 9 and catalog-placeable prerequisites, priorities, titles, packet
   paths, and operator actions into capture-subject data.
4. Remove label/name heuristics from capture sequence generation. Use only
   authoritative semantic source fields. If they are unavailable, return a
   diagnosed blocker.
5. Keep historical proof-target assertions, exact artifact hash validation, and
   manifest identity binding as explicit allowed uses.

### Phase 5: generators and generated assets

1. Update the generator sources for row 22, row 28, row 68, the broad-proof
   fixtures, and retail evidence fixtures. Do not hand-edit generated JSON as the
   primary implementation.
2. Replace per-row generator dispatch with typed recipe data and generic recipe
   interpreters where it selects emitted behavior. Exact source hash and source
   identity assertions remain validation/provenance.
3. Regenerate fixtures deterministically and verify byte-stable output on a
   second run.
4. Record schema version and profile hash in every generated manifest and proof
   summary.

### Phase 6: deletion and enforcement

1. Delete obsolete row-specific constants, helpers, predicates, behavior maps,
   and fallback paths.
2. Run the AST gate and require zero forbidden VFX findings.
3. Add the gate to the normal repository test/CI path.
4. Reuse the same checker policy for tiles, creatures, placeables, doors, items,
   sounds, Areas, and future asset classes. New violations are blocking
   immediately; any discovered pre-existing non-VFX violation receives an
   explicit remediation record rather than a silent suppression.

### Phase 7: verification and fresh proof

Run sequentially and resource-safely:

1. focused schema, resolver, materializer, analyzer, and static-gate tests;
2. VFX unit and regression suites with repository wrappers and at most two
   workers;
3. frontend/backend build gates as applicable;
4. generator determinism and manifest/hash validation;
5. one fresh representative proof capture to validate the new profile pipeline;
6. fresh captures for every affected proof profile, including Meteor Swarm;
7. MP4-to-MP4 comparison and aligned-frame comparison for each required native
   NWN versus Aurora Web pair;
8. proof packet audit with zero unexpected failed/bridge tiles, one trigger,
   settled contracts, exact source/profile hashes, and no diagnostic geometry in
   final proof.

Only one backend family, one frontend family, and one capture may exist for the
repository. Captures run one at a time under the global lock, and every owned
process tree is stopped after its bounded step. No runtime process is required
for Phases 0-6.

## Acceptance criteria

Remediation is complete only when all of the following are true:

- the AST report contains zero forbidden VFX identity-dependent behavior
  selectors across frontend, backend, scripts, generators, proof, and export;
- allowed identity comparisons are reported and are confined to validation,
  authorization, routing/binding, cache, provenance, historical proof binding,
  and tests;
- no behavior-keyed map, naming convention, regex, helper alias, dynamic property
  access, or generated code recreates the removed specialization;
- arbitrary-identity metamorphic tests prove that profiles, not names, drive all
  differing output;
- all affected fixture data is schema-valid, generator-owned, deterministic,
  versioned, evidence-bound, and hash-bound;
- all required unit, regression, contract, and build gates pass;
- current-source completion claims use fresh NWN/Aurora Web MP4 comparisons and
  aligned-frame comparisons; immutable older proof remains historical only;
- the handoff includes the static audit report, test results, generated-manifest
  diff, proof artifacts, and an explicit list of remaining allowed identity
  bindings;
- no owned Node, browser, NWN, Toolset, capture, or server process remains after
  verification.

## Scope controls

- Do not change visual output merely to make the refactor easier. A behavior
  change requires separate Aurora-first evidence and a new acceptance decision.
- Do not convert special `if` statements into identity-keyed lookup tables; that
  is the same violation in another form.
- Do not encode behavior in fixture names, row labels, resref patterns, file
  names, directory names, or generated identifiers.
- Do not claim current visual parity from the pre-refactor proof hashes.
- Keep unrelated dirty worktree changes untouched.

## Delivery slices

The implementation should be reviewed in eight bounded slices matching the
phases above. Each slice must leave the repository testable, and no slice may add
a temporary identity-specific fallback. The first mergeable slice is the red
static gate plus contracts; the final slice is fresh proof and audit closure.
