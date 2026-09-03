# Aurora Web VFX and Aurora decompilation audit - 2026-08-17

## Executive verdict

**Overall status: NO-GO for Aurora/NWN VFX parity and NO-GO for a claim of a
complete or reproducible Aurora decompilation.**

Aurora Web now contains a substantial source-backed VFX implementation. It is
not the placeholder described by the current implementation matrix. Backend
parsers, deterministic emitter state, render contracts, dependency resolution,
the frontend renderer, production workspace integration, diagnostics, and
fail-closed retail parity gates all exist.

The present working snapshot is nevertheless not releasable as a parity claim:

1. all ten retail VFX fixtures remain blocked and zero retail evidence packs are
   ingestible;
2. a standalone frontend VFX renderer suite has 61 failing tests;
3. the mandatory local VFX diagnostic aggregate gate is red;
4. four retail-control gates abort on missing files before validation starts;
5. the frontend and backend status documents contradict the implementation;
6. the local Ghidra export has stable content hashes and useful anchors, but no
   generation/lineage manifest binds it to an exact input binary and analysis
   procedure;
7. legacy xoreos references do not satisfy the repository's current immutable
   GPL-secondary research-record policy.

The strict parity machinery is behaving safely: it reports `0/10` canonical
fixtures and no improper promotion. The problem is missing evidence and red
verification, not a fail-open parity gate.

## Implementation follow-up - 2026-08-17

The remediation pass after the read-only audit closed the repository defects
that did not require new retail or Toolset evidence:

1. `workspaceObjectMeshLayer.vfxRenderMode.test.ts` now passes `124/124`. The
   61 failures came from a stale `127.0.0.1` test-origin contract while the
   current same-origin loader resolves `localhost`; no renderer semantic was
   changed by that repair.
2. The local P2P diagnostic now uses a controlled zero-velocity source and the
   aggregate local gate passes all seven commands and all eleven runtime cases.
3. The four retail-control scripts no longer throw raw `ENOENT` stacks. They
   write `aurora-vfx-control-gate-prerequisite-blocker/v1` reports listing every
   missing input and recovery command, then remain non-zero/fail-closed.
4. `aurora-vfx-payload/v1` now carries independent
   `rendererEligibility` and `retailParityStatus` fields. The shared renderer
   accepts source-backed contracts without treating them as retail proof, and
   the inspector displays both axes.
5. `create-aurora-decompilation-lineage-manifest.mjs` now supports a complete,
   deterministic `bind-session` packet and a blocked `audit-legacy` inventory.
   The current six-file export inventory is tracked at
   `evidence/decompilation-lineage/legacy-toolset-export-audit-2026-08-17.json`;
   it intentionally remains `blocked_unbound_legacy_export`.
6. The frontend matrix and the r90 readiness header now describe VFX as
   source-backed but retail-blocked. Noncompliant legacy xoreos observations
   are explicitly quarantined; no commit SHA was fabricated.

The overall Aurora/NWN parity verdict remains **NO-GO**: all ten retail evidence
packs are still missing or placeholders, no fresh exact Toolset/NWN comparison
was captured, the legacy decompiler export is still unbound, and the oversized
renderer/catalog surfaces still require bounded refactoring.

### Verification snapshot after remediation

- frontend production build: pass;
- backend production build: pass;
- focused frontend VFX: 12 files, 339 tests, all pass;
- focused backend VFX: 19 suites, 335 tests, all pass;
- VFX control-gate prerequisite tests: 4/4 pass;
- decompilation-lineage tests: 3/3 pass;
- local VFX diagnostic aggregate: seven commands and eleven runtime cases, all
  pass, zero promotion attempts;
- retail evidence-pack dry run: expected blocked, `0/10` ingestible, zero
  promotion attempts;
- strict retail parity validator: expected non-zero, `0/10` allowed and all
  ten blocked;
- full backend serial stress run: 210/212 suites and 2792/2796 tests pass; the
  four failures are 5-second timeouts in two non-VFX files, and all four pass
  when rerun in isolation;
- full frontend unit run: 2073/2131 tests pass; 58 failures remain in six
  non-VFX files covering workspace UI drift, creature payload expectations,
  scene draft source status, and coordinate clamps. No focused VFX test is red.

The original audit phase inspected the dirty tree without modifying product
code or launching Aurora Toolset/NWN. The follow-up modified repository code,
tests, and documentation, but still did not launch Aurora Toolset/NWN, create a
fresh decompilation, or promote any parity claim. Live Toolset/NWN proof state
for this snapshot is **missing**.

## Scope and snapshot

- Repository: `C:\Projects\aurora-web`
- Branch: `codex/vfx-row216-aurora-first-20260812`
- HEAD: `348e8ff0e27677b7c611c56afa4d706685b393f0`
- Audit date: 2026-08-17
- Working tree: dirty, 1,174 porcelain entries at the audit checkpoint
- Audit lanes: backend VFX, frontend VFX/runtime integration, retail evidence
  gates, reverse/decompiler corpus, provenance documentation, and tests

Because the tree is heavily dirty, every result below describes the effective
filesystem snapshot, not the clean HEAD commit. The audit cannot attribute a
failure to a committed revision versus an uncommitted change without first
creating a controlled tree-bound snapshot.

Evidence classifications used here:

- **confirmed primary**: directly rechecked in a hash-identified Aurora/NWN
  binary or local decompiler export;
- **confirmed repository**: directly rechecked in current source, tests,
  manifests, or generated gate output;
- **local-only**: present on this workstation but not reproducible from HEAD;
- **inference**: consistent with the evidence but not directly bound/proven;
- **missing**: required evidence is absent or its gate cannot read it.

Severity:

- **P0** blocks an authoritative Aurora/decompilation/parity claim;
- **P1** is a high-risk correctness, freshness, or control-plane defect;
- **P2** is a material architecture, test, or portability defect;
- **P3** is lower-risk evidence hygiene.

## What is implemented correctly

The current source is materially ahead of the status documents.

| Lane | Confirmed repository implementation |
| --- | --- |
| Source tables | Parsers and policy for `visualeffects.2da`, `progfx.2da`, `vfx_persistent.2da`, `iprp_visualfx.2da`, spell/damage-hit visual sources, and selected profile precedence |
| Model source | ASCII/binary Aurora MDL emitter graph, inherited animation graph, source provenance, dependency graph, and deterministic cache key |
| Runtime | Effect instances, phase scheduling, duration ownership, AOE, Fountain, Explosion, Single, P2P, Lightning, Chunk, wind, and collision contracts |
| Render contract | Draw queues, render modes, atlas state, blend/punch/culling, render order, Chunk lanes, PLT, MTR/SHD/TXI, WOK, world timer, and post-process/SSAO support |
| Effect families | Type 7 beam attachment and Type 10 projectile paths are present with explicit diagnostics |
| Product integration | Backend `/vfx/process` flow and the production Three.js workspace object layer consume VFX payloads |
| Observability | Local runtime diagnostics, capture analyzers, contract checks, and retail parity validation are present |
| Safety | Preview/local evidence is marked non-retail; strict retail parity is blocked; missing unsupported lanes generally fail closed |

Focused backend VFX tests pass 18 suites / 331 tests. A focused set of canonical
frontend renderer, queue, payload, scene-runtime, and fixture tests also passes
10 files / 208 tests. These passing subsets establish that important components
exist and behave as their local contracts specify. They do not override the red
standalone renderer suite or the missing retail oracle.

## Comparison: what is wrong and what is missing

| Area | What is wrong now | What is missing for closure |
| --- | --- | --- |
| Retail parity | No fixture can be promoted; repository language uses `canonical` for an internal renderer lane even while parity is false | Ten complete retail evidence packs and a distinct, unambiguous renderer-eligibility versus retail-parity status model |
| Renderer verification | `workspaceObjectMeshLayer.vfxRenderMode.test.ts` fails 61/124 tests in isolation; failures cover URL expectations, scheduling, P2P, atlas state, motion, alpha/color, bounce, blur, and metadata | Triage each failure as stale test or code regression, repair both sides, then run the full suite in a controlled environment |
| Local diagnostic gate | P2P case expects positive X travel even though its fixture permits random negative X velocity; the generated result is red | A controlled P2P fixture/assertion that tests recovered update ordering without contradicting allowed initial conditions |
| Retail control plane | Four gates terminate with `ENOENT` for coordinator/director/blocker artifacts | A repository-relative generation order, bootstrap command, schema validation, and tracked/hash-bound inputs |
| Documentation | Matrix says VFX is `NOT_STARTED`; readiness report calls itself “not an implementation” | One current claim index/status document tied to revision and superseding stale reports |
| Decompilation | Six stable flat export files exist, but no export lineage or reproducible procedure exists | Exact input hash, tool/version, loader/language/image base, analyzer options, scripts, logs, failures, call graph, per-output hashes, and coverage manifest |
| Runtime authority | Toolset export anchors and separate `nwmain` research are mixed in narrative documents | Explicit binary-per-claim provenance and a runtime-client evidence packet for each `nwmain` claim |
| GPL secondary source | xoreos is constrained in prose but cited through local paths and a mutable `master` URL without immutable SHA research records | Policy-compliant records for each retained use or removal of the secondary citation |
| Architecture | Core responsibilities are concentrated in very large files | Bounded parser/runtime/renderer modules with contract tests at each boundary |
| Visual proof | Historical local captures exist, but none is accepted fresh proof for this effective tree | Fresh requested state, settled `aurora-vfx-runtime-observability/v1`, exact capture artifact, retail counterpart, and comparison |
| Platform parity | Geometry-shader and skinned custom-program lanes intentionally fail closed; world-scene plane BSP is not reconstructed | Either an explicit permanent platform exception matrix or implementations plus retail oracles; reconstruct the missing collision lane if parity requires it |

## Detailed findings

### P0-1 - No complete retail VFX evidence exists

`backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json` defines ten
fixtures. Fresh validation reports:

- fixture count: 10;
- canonical allowed: 0;
- blocked: 10;
- retail-build evidence missing: 10;
- parser snapshots missing: 10;
- resolver traces missing: 10;
- runtime tick dumps missing: 10;
- render-contract snapshots missing: 10;
- capture references missing: 10;
- comparisons missing: 10.

The evidence-pack dry run generated at `2026-08-17T08:52:46.153Z` reports five
missing pack directories and five placeholder packs. All existing pack files
remain placeholder-only, so ingestible packs are `0/10` and promotion attempts
are zero.

Impact: no claim of exact NWN timing, transforms, pixels, material behavior,
camera/owner/target context, or full VFX parity is currently admissible.

### P0-2 - The decompiler export has no auditable lineage

The local export directory contains only:

- `decompiled_all.c`;
- `functions.tsv`;
- `imports.tsv`;
- `strings.tsv`;
- `strings_2da.tsv`;
- `xrefs_domain.txt`.

There is no adjacent or repository-tracked manifest recording:

- input executable path, size, and SHA-256;
- Ghidra version and project/database identity;
- loader, processor/language specification, image base, and relocation policy;
- analyzer selection and options;
- scripts and exact invocation;
- import/analyzer/decompiler warnings or a failure ledger;
- function discovery totals, decompile success/failure coverage, or call graph;
- per-output hashes generated as part of the same operation.

Therefore the export hash proves only the identity of the current output file.
It does not prove that this output came from the installed `nwtoolset.exe`, nor
does it make the decompilation reproducible.

### P1-1 - A standalone VFX renderer suite is red

Fresh isolated result for
`frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts`:

- 1 file failed;
- 61 tests failed;
- 63 tests passed;
- 124 tests total.

The first failures include a `localhost` versus `127.0.0.1` contract drift.
Many later failures are not simple URL differences: particle motion remains
zero, P2P movement does not advance, atlas state is absent, expected renderer
metadata is missing, and bounce/blur/alpha/color assertions fail.

The audit does not guess whether each case is a stale expectation or a product
regression. The red isolated suite means the renderer contract is not currently
verified either way.

### P1-2 - The mandatory local VFX aggregate gate is red

`test:vfx:local-diagnostic-gate` generated a fresh local-only report with six of
seven commands passing. One of eleven runtime cases failed:

- case: `p2p-target-position-local-path-diagnostic`;
- failed check: “existing P2P particle advances toward the target”;
- actual particle X after the checked tick: `-0.0458110347`;
- actual velocity X: `-0.183244139`.

The fixture inherits Fountain velocity, random velocity, spread, and gravity.
Under the currently documented native P2P ordering, existing velocity is
integrated before the target acceleration can dominate. A monotonic `x > 0`
assertion is therefore not valid unless random/spread inputs are controlled.

This most likely identifies a gate/fixture defect, not proof of a P2P runtime
defect. It still keeps the required gate red and must be resolved explicitly.

### P1-3 - Retail control gates are not bootstrappable

Fresh executions abort before semantic validation:

| Gate | Missing input |
| --- | --- |
| `test:vfx:retail-capture-setup-validation` | `guard-reports/vfx-domain-coordinator-latest.json` |
| `test:vfx:retail-blocker-freshness` | `artifacts/vfx-iteration-215/vfx-retail-blocker-packet.json` |
| `test:vfx:runtime-health-retail-blocker-crosscheck` | `guard-reports/ai-factory-director-latest.json` |
| `test:vfx:worker-directive-alignment` | `guard-reports/vfx-domain-coordinator-latest.json` |

These are not “blocked parity” results; they are missing-input crashes. A fresh
checkout cannot discover and produce the prerequisite graph from the commands.

### P1-4 - Internal canonical status is semantically overloaded

`buildPlaceableAuroraVfxPayload` in
`backend/src/modules/catalog/application/catalog.application.service.ts`
unconditionally emits:

- `canonicalStatus: "canonical"`;
- `backendCanonical: true`;
- `localOnlyNotRetailEvidence: true`;
- `canonicalParityPromoted: false`.

The frontend's `isCanonicalAuroraVfxRenderablePayload` checks canonical status,
the backend mark, non-deferred emitters, and at least one render contract. It
does not require retail parity promotion. This is not presently a fail-open
retail gate—the strict validator still blocks all fixtures—but it conflates two
different meanings:

1. eligible for the source-backed canonical renderer;
2. proven canonical against retail NWN.

The status should be split before any UI, telemetry consumer, or future gate
mistakes renderer eligibility for retail parity.

### P1-5 - Status documentation contradicts the source

`frontend/AURORA_FIRST_IMPLEMENTATION_MATRIX.md:95` says VFX runtime is
`NOT_STARTED`. `vfx-aurora-first-implementation-readiness-r90.md:9` says it is
not an implementation and line 15 repeats `NOT_STARTED`.

Those statements are incompatible with the current VFX modules and production
integration. This is not cosmetic: stale status material is used as a planning
and claim-control input. It can cause duplicate work and false audit decisions.

The frontend also retains a diagnostic at
`auroraVfxCanonicalRenderer.ts:772-776` saying Chunk model rendering is not
implemented, while the same file contains a Chunk model preview path and a
retail-proof-pending diagnostic. The conditional unresolved-resource message is
therefore misleading.

### P1-6 - xoreos records are not policy compliant

The readiness report uses xoreos as vocabulary/name/index evidence and often
states that it is not runtime authority. That limitation is correct. The record
format is not:

- local mutable source paths are cited;
- `https://github.com/xoreos/xoreos/blob/master/...` is mutable;
- no immutable commit SHA is recorded beside each use;
- the required fields for source class, independent primary confirmation, what
  is not proven, and follow-up/test are not complete per use.

No production backend/frontend use of xoreos was found in this audit, and this
report found no evidence that xoreos code was copied or ported. The finding is a
documentation/provenance policy breach, not a code-copy allegation.

### P2-1 - VFX responsibilities are concentrated in monoliths

Approximate current line counts:

| File | Lines |
| --- | ---: |
| `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts` | 21,712 |
| `backend/src/modules/catalog/application/catalog.application.service.ts` | 18,051 |
| `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts` | 5,757 |
| `backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts` | 5,219 |
| `backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` | 3,293 |
| `backend/src/modules/vfx/application/vfx.application.service.ts` | 2,907 |

This conflicts with the repository's bounded-responsibility rule and makes
semantic review, mutation analysis, and regression isolation unnecessarily
difficult. The build also emits chunks of roughly 4.0 MB and 2.4 MB before gzip
and triggers Vite's large-chunk warning.

### P2-2 - Repository-wide quality gates are red

The broader failures are not all VFX-specific, but they prevent a clean
release-quality baseline:

- backend unit: 6 suites failed, 204 passed; 4 tests failed, 2,674 passed;
- frontend unit: 7 files failed, 200 passed; 116 tests failed, 2,004 passed;
- backend regression: 1 suite failed, 9 passed; 2 tests failed, 111 passed;
- frontend regression smoke: 9 files failed, 1 passed; 58 tests failed, 20
  passed.

Backend unit failures include stale derived-asset paths, bootstrap host
expectations, a missing constructor dependency in a test, and stale
`AreaObjectCounts` fixtures. Frontend failures include the 61-case VFX file and
unrelated workspace/scene cases. These results reinforce the need for a
tree-bound baseline before parity work resumes.

## Decompilation evidence recheck

### Stable local hashes

The six export hashes were rechecked and match the earlier 2026-08-06 audit:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `decompiled_all.c` | 30,366,020 | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `functions.tsv` | 1,928,975 | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| `imports.tsv` | 313 | `6CC00E29A0ACC634FDE748B2B65AC1A845E3326A39A4C9F01AA641D7D3D4F5AF` |
| `strings.tsv` | 2,691,636 | `864AE0139451D5333307CB2BBCCCE725BBD2D2C6056AC2D5F80F9B5EA50F190F` |
| `strings_2da.tsv` | 8,070 | `620D48990D12849C391E997BC564ACC1A758FA94994201FB1365F7356A0DB6AA` |
| `xrefs_domain.txt` | 6,839 | `90E5F66C02B04FEC15F53564FEE69EF3FC22E352E931019E25995823BC87CE9F` |

Installed binaries were also re-hashed:

| Binary | Bytes | SHA-256 |
| --- | ---: | --- |
| `bin/win32/nwtoolset.exe` | 12,201,984 | `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24` |
| `bin/win32/nwmain.exe` | 21,071,872 | `3B7CB1252E0EDB2CE22D7971F333AADE027039AE30A45B4BC64732C3E6BEC73A` |
| `bin/linux-x86/nwmain-linux` | 26,557,296 | `6D19C39BC646AF5DDBC333FF31797A4ACD9019506BCB45EF1B93B1BD5925E700` |

Hash stability is a useful integrity signal. Because the generation manifest is
absent, the relationship between the first table and the installed Toolset
binary remains an inference rather than a proven lineage.

### Reproducible VFX anchors

The current export still contains useful primary anchors, including:

- `visualeffects.2da` and `iprp_visualfx.2da` table-loading strings;
- `vsparticle` / `fsparticle` shader strings;
- particle draw-count logic based on particle count times six;
- function index entries for `FUN_00a294ec`, `FUN_00a2c36c`,
  `FUN_00a2e250`, `FUN_00a31288`, `FUN_00a31ca4`, and `FUN_00a7fb8c`.

These anchors support narrowly scoped Toolset claims when the exact export hash
is quoted. They do not establish complete runtime-client behavior. Retail
`nwmain` claims must remain bound to their separate exact disassembly/script
audits and binary hashes.

## Verification run on 2026-08-17

| Command/gate | Result | Interpretation |
| --- | --- | --- |
| Backend production build | PASS | TypeScript/Nest compilation succeeds |
| Frontend production build | PASS with large-chunk warnings | Compilation succeeds; bundle architecture remains a risk |
| Focused backend VFX unit tests | PASS, 18 suites / 331 tests | Backend local contracts are strong |
| Focused canonical frontend subset | PASS, 10 files / 208 tests | Selected canonical components pass |
| Standalone `workspaceObjectMeshLayer.vfxRenderMode` | FAIL, 61/124 failed | Main VFX renderer regression contract is red |
| Full backend unit | FAIL, 6/210 suites | Repository baseline is red |
| Full frontend unit | FAIL, 7/207 files | Includes major VFX failures |
| Backend regression | FAIL, 1/10 suites | Runtime-settings texture-index setup returns 422 |
| Frontend regression smoke | FAIL, 9/10 files | UI smoke baseline is red |
| Local VFX diagnostic aggregate | FAIL, 1/7 commands | P2P fixture/assertion conflict |
| Strict retail parity validator | Expected BLOCK, 0/10 allowed | Correct fail-closed behavior |
| Retail evidence pack dry run | BLOCKED, 0/10 ingestible | Five missing and five placeholder packs |
| Four retail control/freshness gates | ERROR (`ENOENT`) | Prerequisite graph is not bootstrappable |
| Live Toolset/NWN proof | MISSING / not run | Audit-only lane; no completion evidence claimed |

## Required closure order

1. Freeze a clean, revision-bound audit snapshot and regenerate test/gate
   reports against that exact tree.
2. Repair or reclassify the 61 standalone VFX renderer failures; keep the suite
   red until every expectation has an explicit current contract.
3. Repair the P2P diagnostic fixture/assertion and restore the mandatory local
   aggregate gate.
4. Make the four evidence-control gates bootstrappable with repository-relative
   prerequisites and schema-checked generation order.
5. Split internal renderer eligibility from retail parity status; do not use
   `canonical` for both.
6. Replace stale status documents with a generated/superseding claim index tied
   to the revision and gate artifacts.
7. Create a reproducible Ghidra lineage packet for the Toolset export and
   separate binary-bound packets for runtime-client claims.
8. Convert every retained xoreos reference to a policy-compliant immutable
   secondary research record or remove it.
9. Capture and ingest all ten retail fixture packs: build/profile, source,
   effect context, parser snapshot, resolver trace, runtime dump, render
   contract, exact capture, and comparison.
10. Only after steps 1-9, run fresh Toolset/NWN and Web proof under the capture
    safety contract and evaluate fixture-by-fixture promotion.

## Final comparison verdict

- **What Aurora Web has right:** a broad, source-backed VFX architecture,
  substantial deterministic/runtime/render coverage, production integration,
  strong backend-focused tests, rich diagnostics, and a strict parity gate that
  fails closed.
- **What Aurora Web has wrong:** red renderer and repository suites,
  non-bootstrappable evidence gates, contradictory status documents, overloaded
  canonical terminology, noncompliant legacy xoreos records, and oversized
  coupled modules.
- **What Aurora Web still lacks:** reproducible decompilation lineage, complete
  runtime-client provenance, ten ingestible retail evidence packs, accepted
  fresh visual/runtime proof for this tree, and closure or explicit exceptions
  for the remaining platform/runtime parity lanes.

The correct present claim is: **substantial implementation, diagnostic-only
evidence, no retail VFX parity, and no reproducible complete Aurora
decompilation.**
