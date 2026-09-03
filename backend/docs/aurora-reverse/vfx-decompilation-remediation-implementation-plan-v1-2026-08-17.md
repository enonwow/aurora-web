# VFX and Aurora decompilation remediation implementation plan v1

Date: 2026-08-17

## Purpose

This plan converts the findings in
`vfx-and-aurora-decompilation-post-remediation-reaudit-2026-08-17.md` into an
ordered implementation program with measurable completion gates.

It deliberately separates five claims that must never be collapsed into one
generic "done" status:

1. repository baseline is reproducible and green;
2. local source-backed VFX contracts are implemented and tested;
3. the retail control plane is bootstrappable and fail-closed;
4. the Aurora decompilation lineage is authoritative and reproducible;
5. exact Aurora/NWN retail parity is verified by accepted live evidence.

The current state satisfies item 2 only. Items 1, 3, 4, and 5 remain open.

## Governing constraints

1. **Aurora-first:** no unknown retail behavior may be implemented from an
   assumption. A missing Aurora semantic blocks only the affected semantic
   lane and produces a durable blocker.
2. **Contract-first:** changes to VFX transport, producer registries,
   decompilation lineage, evidence packs, or proof packets require a versioned
   contract before code.
3. **TDD:** write negative and positive contract tests before implementation.
4. **Diagnosability-first:** every gate result records candidate identity,
   input/output hashes, schema versions, failed check, and resume condition.
5. **Fail-closed promotion:** only a validator may produce a parity or
   decompilation-authority promotion. UI labels, file existence, command exit
   zero, or screenshots alone are never promotion authority.
6. **GPL boundary:** quarantined xoreos observations remain unusable until each
   is removed or re-admitted through an immutable policy-compliant record.
7. **Live proof boundary:** no Toolset/NWN action starts before an approved
   versioned proof profile exists. Browser debugging is not accepted proof.
8. **Dirty-tree safety:** existing user changes must be preserved. No reset,
   checkout overwrite, or broad cleanup is part of this plan.

## Delivery order and dependencies

| Phase | Name | Depends on | Main closure |
| --- | --- | --- | --- |
| 0 | Freeze and classify the snapshot | none | immutable tree identity |
| 1 | Restore the release baseline | 0 | builds and ordinary gates green |
| 2 | Make the VFX control plane bootstrappable | 1 | zero prerequisite-path blockers |
| 3 | Replace self-attested lineage with validated lineage v2 | 1 | authority cannot be minted from arbitrary files |
| 4 | Decompose the VFX/catalog monoliths | 1, contracts from 2-3 | bounded modules, behavior unchanged |
| 5 | Produce a real Aurora decompilation session | 3 | exact input-to-export lineage verified |
| 6 | Produce ten complete retail evidence packs | 2, 4, 5 | 10/10 ingestible candidates |
| 7 | Run exact live parity proof and promotion | 6 | accepted Toolset/NWN/Web evidence |
| 8 | Close release, claims, and legacy documentation | 7 | release and parity DoD pass |

Phases 2 and 3 may be developed in parallel after Phase 1. Phase 4 may be
sliced by bounded responsibility, but it must finish before the final evidence
candidate is frozen. Phases 5-7 are sequential because later evidence must bind
the exact output of the earlier phase.

## Phase 0 - Freeze and classify the snapshot

### Objective

Create a reproducible implementation starting point without discarding the
current dirty worktree.

### Work

1. Inventory all current changes and classify them as VFX/decompilation,
   baseline repair, generated evidence, or unrelated user work.
2. Preserve unrelated work in its existing location or an explicitly approved
   independent worktree; do not reset it.
3. Create a dedicated implementation branch using the required `codex/`
   prefix and record the parent commit.
4. Commit or bundle the exact admitted starting tree.
5. Add a snapshot manifest containing commit, Git tree hash, package lock
   hashes, Node/npm versions, OS, and the exact initial gate results.
6. Define performance and bundle-size baselines before refactoring.

### Completion criteria

- `git status --porcelain` is empty in the implementation worktree.
- The snapshot manifest exists, is committed, and names one exact Git tree
  hash.
- Every generated audit/gate artifact used as a baseline carries that tree
  hash or an immutable digest bound to it.
- Unrelated user changes are demonstrably preserved.
- A clean checkout of the snapshot can install dependencies and reproduce the
  recorded initial failures.

## Phase 1 - Restore the release baseline

### Objective

Remove unrelated red gates so later VFX/decompilation failures have one clear
cause.

### Work

1. Remove or use the stale `PLACEABLE_TRAP_TYPE_OPTIONS` import that currently
   blocks the frontend build.
2. Resolve all 54 frontend unit failures in the six recorded non-VFX files.
3. Resolve all 58 frontend regression-smoke failures.
4. Resolve the two backend runtime-settings e2e `422` responses.
5. Add stable package commands for the complete frontend and backend VFX unit
   sets so audit counts do not depend on an ad-hoc file list.
6. For each behavior change, add tests first and run the applicable focused
   unit/integration/regression gates. Mutation testing is optional and requires
   an explicit user request. Fixture-only repairs must be explicitly documented
   as fixture drift.

### Required verification

Backend:

```powershell
npm.cmd run build
npm.cmd run test:unit -- --runInBand
npm.cmd run test:e2e -- --runInBand
```

Frontend:

```powershell
npm.cmd run build
npm.cmd run test:unit
npm.cmd run test:regression
```

Run focused unit/integration/regression tests in every layer where business
logic, scene state, layout behavior, guards, or policies changed. Mutation
testing is optional and may run only after an explicit user request, through
the repository opt-in wrapper with concurrency `1`.

### Completion criteria

- Both production builds exit zero.
- Backend unit and e2e gates have zero failed suites and tests.
- Frontend unit and regression gates have zero failed files and tests.
- Stable VFX aggregate commands exist and reproduce at least the current
  `339/339` frontend and `335/335` backend results.
- Mutation score does not regress from the recorded baseline; every survivor
  in a changed module is killed or has an approved documented exception.
- No test timeout increase is hidden by raising global timeouts.

## Phase 2 - Make the VFX control plane bootstrappable

### Objective

Make a clean checkout discover and produce every repository/control-plane
prerequisite through exact, schema-validated paths.

### Contract work

Define `aurora-vfx-artifact-producer-registry/v1` with, at minimum:

- stable `artifactId` and schema id;
- exact repository-relative output path;
- authoritative producer command and required arguments;
- input artifact ids and dependency edges;
- source class and freshness policy;
- expected exit-state model;
- hash and schema validation rule;
- whether the artifact is local control evidence or retail evidence.

The registry is repository control-plane metadata, not Aurora runtime
authority.

### Test-first cases

1. exact output-path agreement for every producer and consumer;
2. topological ordering and cycle rejection;
3. missing producer rejection;
4. regular-file validation instead of `existsSync` alone;
5. malformed JSON and JSONL rejection without raw stacks;
6. wrong schema id/version rejection;
7. stale artifact/hash rejection;
8. producer exits zero but writes no output;
9. producer writes a different path than registered;
10. repeated execution is deterministic and idempotent;
11. a clean-checkout bootstrap dry run explains every action without writing;
12. bootstrap execution stops at the first semantic retail blocker, not an
    infrastructure/path blocker.

### Implementation work

1. Replace duplicated prerequisite arrays with one registry reader/validator.
2. Pass explicit `--out` arguments to every producer.
3. Align iteration-90 versus iteration-215 evidence-pack paths.
4. Align iteration-216 versus iteration-223 worker-alignment paths.
5. Register authoritative coordinator/director producers or classify them as
   external inputs with a precise ingestion contract and resume condition.
6. Generate the recovery sequence from the dependency graph, not array order.
7. Emit structured events for plan, produce, validate, blocked, and complete
   states with low-cardinality labels.

### Completion criteria

- Registry contract and validator are committed before consumer migration.
- Every consumed prerequisite has exactly one authoritative producer or one
  explicit external-ingestion contract.
- Producer default/explicit output and consumer input paths match byte-for-byte.
- A clean checkout can run the documented bootstrap in dry-run and execution
  modes without `ENOENT`, raw `JSON.parse`, directory-read, or path-drift
  failures.
- All four current gates have zero `blocked_missing_prerequisites` results.
- Before retail evidence exists, gates stop only at their documented semantic
  retail blocker and keep all promotion fields false.
- Negative tests cover every failure class listed above.

## Phase 3 - Replace self-attested lineage with validated lineage v2

### Objective

Prevent arbitrary files and caller-entered counts from producing an
authoritative decompilation claim.

### Contract work

Define `aurora-decompilation-lineage/v2`. This is a breaking authority change,
so v1 remains readable only as legacy/untrusted input and cannot be promoted.

The v2 producer packet must include:

- exact input binary bytes/hash and PE identity;
- Ghidra distribution/build identity;
- project/database snapshot identity;
- loader, language, image base, relocation policy, and analyzer settings;
- session id generated by the producer;
- exact invocation and exporter script hashes;
- discovered function identities;
- per-function decompile status and failure reason;
- call-graph nodes/edges tied to discovered identities;
- output file inventory and hashes;
- producer completion marker and record digest.

Absolute host paths may be retained as diagnostics but must not make the
portable record digest change after relocating an otherwise identical packet.

### Test-first cases

1. arbitrary text files cannot produce authority;
2. cross-session evidence is rejected;
3. input hash differs from producer attestation;
4. tool/project/analyzer identity differs across packet members;
5. failure-ledger entries do not equal failed function identities;
6. graph nodes are absent from the discovered function set;
7. exported function totals differ from derived records;
8. output tampering after generation;
9. missing or duplicate function identities;
10. packet relocation preserves its portable digest;
11. identical session input produces an identical digest;
12. v1 input remains non-authoritative;
13. interrupted sessions remain blocked and resumable without promotion.

### Implementation work

1. Make the Ghidra-side exporter create the session attestation and derived
   counts.
2. Make the repository validator recompute all hashes and cross-references.
3. Remove caller authority over derived coverage totals.
4. Set `authoritativeDecompilationClaim=true` only in validator output, never
   in the raw producer packet.
5. Distinguish `lineageComplete` from `decompilationCoverageComplete`.
6. Emit a failure ledger and structured blocker for every incomplete session.

### Completion criteria

- The v2 contract, producer, independent validator, and migration notes exist.
- All positive, negative, tamper, determinism, and relocation tests pass.
- Supplying unrelated but valid regular files cannot reach an authoritative
  status.
- Coverage counts are derived from function records and match the call graph
  and failure ledger.
- Only validator output can carry `authoritativeDecompilationClaim=true`.
- A packet with decompile failures may be lineage-complete but cannot claim a
  complete decompilation; a complete-decompilation claim requires zero
  unaccounted or failed functions.

## Phase 4 - Decompose the VFX and catalog monoliths

### Objective

Create bounded responsibilities without changing local VFX semantics before
the final candidate is captured.

### Required extraction boundaries

1. backend catalog VFX payload packaging and provenance;
2. frontend eligibility/parity normalization and claim display;
3. renderer material/texture/render-lane assembly;
4. runtime emitter-family state and scheduling;
5. source MDL parsing/token normalization;
6. workspace object-layer VFX adapter/orchestration;
7. control-gate schema validation.

### Complexity budget

- Each extraction has one public interface and one responsibility.
- No newly extracted implementation file exceeds 2,000 lines.
- Every touched monolith shrinks; the combined size of the six audited
  monoliths must decrease by at least 20% from the Phase-0 recorded baseline.
- No new cyclic dependency or frontend internal cross-context import is
  permitted.
- No duplicate implementation of transform, material, cache, or lifecycle
  rules is permitted.

Line count is only a guardrail; the architecture review must also confirm that
dependencies point through explicit interfaces/facades.

### Test and performance gates

1. Preserve all focused VFX unit and local diagnostic results after each
   extraction.
2. Add boundary contract tests before moving code.
3. Add integration tests for backend packaging to frontend normalization.
4. Run focused frontend renderer/layout/state extraction tests. Mutation
   testing is an optional follow-up only when explicitly requested by the user.
5. Compare the recorded setup, frame-update, allocation, and bundle baselines.
   No metric may regress by more than 5% without a documented explanation and
   approved budget update.
6. Add a browser regression scenario for the final user-visible VFX flow; it
   is debugging/regression evidence, not retail proof.

### Completion criteria

- All seven boundaries are represented by explicit modules/interfaces.
- Complexity budget, architecture checks, builds, full tests, focused tests,
  and performance budgets pass. Mutation testing is not a completion gate.
- No `rendererEligibility` or `retailParityStatus` semantic changes occurred
  without a separately versioned contract.
- The final refactored Git tree hash is frozen as the retail evidence
  candidate; later code changes invalidate capture freshness.

## Phase 5 - Produce a real Aurora decompilation session

### Objective

Create one exact, independently validated input-to-export lineage.

### Work

1. Select and hash the exact Aurora/Toolset input binary.
2. Record build/profile identity and the claim scope: Toolset claims and
   runtime-client claims remain binary-specific.
3. Run the approved Ghidra producer with the frozen analyzer profile.
4. Preserve the project snapshot, attestation, logs, scripts, function ledger,
   failure ledger, call graph, and output inventory.
5. Run the independent v2 validator from a separate process.
6. Re-run from the same immutable inputs to test deterministic identity where
   the toolchain permits it; document controlled non-deterministic fields.

### Completion criteria

- Exact input, tool, project, analyzer, script, and export identities are
  hash-bound in one validator-accepted v2 packet.
- `lineageComplete=true` and `authoritativeDecompilationClaim=true` appear only
  in validator output.
- Every discovered function is accounted for exactly once.
- Every failed decompilation has a durable reason and cannot silently
  disappear from coverage.
- Claims in readiness/status documents cite the packet digest and exact binary.
- A claim of "complete decompilation" is allowed only if failed and
  unaccounted function counts are both zero; otherwise the documented claim is
  "authoritative reproducible partial decompilation."

## Phase 6 - Produce ten complete retail evidence packs

### Objective

Replace all missing/placeholder fixtures with exact candidate-bound evidence.

### Required content per fixture

Each of the ten fixture directories contains all nine currently required files:

1. retail build/profile;
2. source-table snapshot;
3. effect context;
4. parser snapshot;
5. resolver trace;
6. runtime tick dump;
7. render-contract snapshot;
8. exact capture metadata/reference;
9. comparison result.

Every pack also binds the implementation tree hash, binary/build identity,
module/Area/object or effect identity, input resource hashes, schema versions,
timestamps, and the applicable decompilation lineage digest.

### Completion criteria

- Manifest fixture count remains exactly 10 unless a versioned contract
  deliberately changes it.
- Existing pack count is 10; missing, placeholder, invalid, and extra pack
  counts are all zero.
- Ingestible pack count is 10.
- Every referenced file exists, is a regular file, passes schema validation,
  and matches its declared hash.
- Parser, resolver, runtime, render, capture, and comparison artifacts share
  the same exact candidate identity.
- Evidence-pack inspection performs no parity promotion itself.
- Any fixture without a valid retail oracle remains `blocked`; no partial pack
  is accepted.

## Phase 7 - Run exact live parity proof and promotion

### Preconditions

1. Phases 0-6 are complete.
2. The candidate Git tree, module, ordered HAKs/resources, fixtures, capture
   targets, and artifact destination are frozen in an approved versioned proof
   profile.
3. The current proof route, schema, validator, and runner standard are selected
   from `aurora-toolset-prove` proof routing immediately before execution.
4. No live Toolset/NWN action starts if the profile or any identity is missing.

### Execution

1. Use `aurora-toolset-operate` for every Toolset/NWN process or window action.
2. Establish exact process, module, Area, monitor, and candidate ownership.
3. Require fully settled model, texture, renderer, and VFX asset contracts.
4. Produce fresh `aurora-vfx-runtime-observability/v1` for each capture:
   build identity, cache key, host graph, asset settlement, draw ledger,
   single-playback guard, overlay state, and post-duration completion.
5. Capture only through the route-approved exact Toolset hook, runtime
   ingestion route, or direct CDP `Page.captureScreenshot` for Web proof.
6. Independently inspect every artifact visually.
7. Run the canonical validators and fixture comparison gates.
8. Write blocker manifests for `failed` or `missing` proof points; do not
   substitute a desktop screenshot or partial evidence.

### Completion criteria per fixture

- Exact candidate/module/Area/effect identities and hashes match across all
  packet members.
- Runtime state is fresh and settled.
- No unexpected modal, Access Violation, fallback, placeholder, partial,
  unknown, failed resource, duplicate playback, overlap, or enabled final
  overlay exists.
- Exact captures are saved, hash-bound, visually reviewed, and validator
  accepted.
- `proofCompleteness=verified`; `missing` or `failed` cannot be promoted.
- The retail comparison passes its declared deterministic/pixel/semantic
  tolerances.
- Only the promotion validator may emit `retailParityStatus=proven` and
  `canonicalParityPromoted=true` for that exact candidate.

### Phase completion criteria

- All 10 fixtures meet the per-fixture gate.
- Strict retail parity reports `10/10` allowed and `0/10` blocked.
- Toolset/NWN/Web proof packets are fresh, exact, visually accepted, and
  validator-clean.
- No promotion is inherited by a later tree, binary, module, HAK, model,
  texture, source-row, or profile revision.

## Phase 8 - Close release, claims, and legacy documentation

### Work

1. Generate one revision-bound claim index from validator outputs.
2. Update the implementation matrix and readiness report from that index.
3. Remove stale contradictory status language.
4. Remove quarantined xoreos observations or create an immutable compliant
   research record for each retained observation. Quarantine remains until
   every record passes review.
5. Run the complete release verification matrix against the final tree.
6. Re-run the post-remediation audit and record zero unresolved P0/P1 findings
   for the declared release scope.

### Completion criteria

- Repository worktree is clean and the final commit/tree hash is recorded.
- Backend and frontend builds, units, e2e/regression, applicable mutation,
  integration, performance, determinism, and visual regression gates pass.
- Focused VFX and local diagnostic aggregates remain green.
- All four retail control gates pass their full semantic validation, not merely
  prerequisite checks.
- Decompilation v2 authority validator passes the final packet.
- Retail evidence and strict parity gates report 10/10 accepted.
- Accepted live proof is fresh for the final tree and has zero blockers.
- UI and telemetry show both renderer eligibility and retail parity without
  legacy ambiguity.
- Documentation claims cite exact validator packets and hashes.
- No unadmitted xoreos observation is used by code, tests, or completion
  claims.

## Definition-of-done matrix

| Milestone | May be called complete when | Must still not claim |
| --- | --- | --- |
| M1 Repository baseline | Phase 1 passes on immutable tree | retail parity or decomp authority |
| M2 Local VFX implementation | focused tests and local diagnostics pass | Aurora/NWN visual parity |
| M3 Retail control plane | Phase 2 has zero prerequisite blockers | fixture parity |
| M4 Decompilation lineage | Phase 5 v2 packet is validator-accepted | complete decompilation if failures remain |
| M5 Retail evidence | Phase 6 has 10/10 ingestible packs | parity before live validators |
| M6 VFX retail parity | Phase 7 has 10/10 accepted proof packets | transfer to a different candidate revision |
| M7 Release | Phase 8 passes every applicable gate | unsupported platform/profile parity |

## Global stop conditions

Stop the affected lane and write a blocker when any of the following occurs:

- an unknown Aurora semantic would need to be guessed;
- a producer, schema, input identity, or output hash is missing;
- evidence crosses binary, session, tree, module, HAK, Area, or fixture lineage;
- a retail pack contains a placeholder or stale capture;
- a live proof profile or approved route is missing;
- Toolset/NWN ownership, monitor, module, Area, resource settlement, or modal
  state is uncertain;
- an arbitrary screenshot or browser debugging frame is offered as proof;
- a validator is bypassed or a promotion field is set manually;
- quarantined GPL-secondary evidence is proposed as runtime authority.

## Final completion statement template

The implementation may be reported as fully complete only when the final
report can truthfully state all of the following with exact artifact links:

> The repository is clean and revision-bound; all required build, unit,
> regression/e2e, mutation, integration, determinism, performance, and visual
> gates pass; the VFX control graph is bootstrappable and schema-valid; the
> Aurora decompilation lineage is independently validator-bound to the exact
> input; all ten retail evidence packs are ingestible; and all ten exact live
> Toolset/NWN/Web proof packets are fresh, visually accepted, and promoted only
> by the strict parity validator.

Until every clause is true, report the highest completed milestone and list the
remaining blocker. Do not use an unqualified "complete" label.
