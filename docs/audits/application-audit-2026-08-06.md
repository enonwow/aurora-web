# Aurora Web application audit - 2026-08-06

## Executive verdict

**Release status: NO-GO.** Both production builds complete, the application can
authenticate and open the workspace, and several important failure states are
surfaced honestly. The current checkout is nevertheless not releasable because:

1. four predictable default accounts, including an administrator, are seeded
   unconditionally from production source;
2. every broad automated test gate attempted in this audit is red;
3. a large real Area does not settle and makes the browser difficult to query;
4. the implemented HTTP surface has materially drifted from the mandatory
   FE-BE contract v1;
5. the evidence was collected from a checkout with 773 dirty status entries,
   so it cannot identify one reviewable source revision.

This was an audit, not a repair pass. No application source or configuration
was changed.

## Scope and evidence boundary

- Repository: `C:\Projects\aurora-web`
- Branch: `codex/tile-matrix-resume-20260729`
- HEAD: `348e8ff0e27677b7c611c56afa4d706685b393f0`
- Initial/final status inventory before these reports: 218 modified and 555
  untracked entries (773 total).
- The running backend initially reported contract version `1.0.0` and build
  identity `348e8ff0e276-dirty-36362d38c7f83997`, with digest
  `sha256:36362d38c7f83997` and build time
  `2026-08-06T19:03:19.6624001Z`.
- Static inspection covered backend, frontend, tests, build configuration,
  Docker configuration, architecture rules, contract v1, and observability
  rules.
- Dynamic inspection covered login, workspace loading, responsive dimensions,
  console/network symptoms, and the `_IKEA` Area at 1280x720.
- Browser observations are **local application evidence only**. They are not
  Aurora Toolset or NWN parity proof. No Toolset or NWN process was started.
- The persistent interactive-browser capability was unavailable in this
  session. The repository's Playwright CLI workflow was used instead, and all
  owned preview/browser processes were closed after capture.

Severity meanings:

- **P0**: immediate security or release blocker.
- **P1**: high-impact correctness, performance, contract, or delivery blocker.
- **P2**: material engineering-control weakness.
- **P3**: low-impact defect or polish issue.

## Findings

### APP-P0-01 - predictable administrator credentials are seeded on every startup

Status: **confirmed**.

`AuthApplicationService.onModuleInit()` always calls `seedUsers()`. The seed
list in `backend/src/modules/auth/application/auth.application.service.ts`
contains these source-visible credentials:

| Role | Username | Password |
| --- | --- | --- |
| viewer | `viewer.user` | `viewer123` |
| builder | `builder.user` | `builder123` |
| dm | `dm.user` | `dm123` |
| admin | `admin.user` | `admin123` |

The persistent MySQL adapter returns an existing record unchanged, so this is
not merely an ephemeral test fixture. On a fresh database the credentials are
created; on a database where they were never rotated they remain valid. The
audit used `builder.user` successfully to enter the local application.

Impact: a reachable fresh deployment has a publicly derivable administrator
credential and three additional predictable accounts.

Required remediation:

1. remove fixed passwords from production source;
2. make bootstrap explicit and environment-gated;
3. require a one-time externally supplied secret and forced rotation;
4. fail startup in a production profile if a default bootstrap identity is
   still enabled;
5. add a regression test proving that production bootstrap cannot create a
   known credential.

### APP-P0-02 - all broad test gates are red

Status: **confirmed**.

| Gate | Result | Current failures |
| --- | --- | --- |
| Backend build | PASS | none |
| Frontend production build | PASS with size warnings | two generated chunks exceed 1.8 MB; main bundle is about 3.9 MB before gzip |
| Backend unit, normal command | TIMEOUT after 304 s | no clean completion; open-handle behavior suspected and confirmed by the forced-exit warning |
| Backend unit, diagnostic `--forceExit --json` | FAIL | 9/143 suites; 7/1,388 assertions; 4 failing suites did not compile |
| Backend e2e | FAIL | 2/107 assertions; runtime-settings texture-index updates returned HTTP 422 instead of 200 |
| Frontend unit | FAIL | 111/1,879 assertions across 8 test files; 19/411 reported suites |
| Frontend regression smoke | FAIL | 58/77 assertions across 9 test files; 18/18 reported suites |

The backend failures are not one isolated expectation. They cover fixture HAK
selection, repository wiring, derived-asset cache paths, bootstrap host
configuration, cache-key revision drift, `AreaObjectCounts` contract drift,
and the changed runtime-settings service constructor. The frontend failures
concentrate in workspace rendering, coordinate parity, scene facade behavior,
creature payloads, and VFX render mode. Regression smoke also shows blank/zero
object workspace state where seeded Areas and objects are expected.

Raw machine-readable results:

- `.codex-tmp/audit-2026-08-06/backend-unit-forceexit.json`
- `.codex-tmp/audit-2026-08-06/frontend-unit.json`
- `.codex-tmp/audit-2026-08-06/frontend-regression.json`

Impact: the current state has no trustworthy merge or release baseline. Focused
historical test counts in feature documents must not be treated as evidence
that the present checkout passes.

Required remediation: restore each broad baseline before mutation or release
testing. A test may be updated only after classifying whether code or
expectation is wrong and recording the contract behind that decision.

### APP-P1-01 - a large Area neither settles nor stays responsive

Status: **confirmed local observation**.

The `_IKEA` Area contains 1,136 objects. At approximately 15 seconds after
selection the workspace reported:

- 948/1,136 primitive fallbacks;
- a 256-object render cap;
- 692 skipped objects;
- 26/73 model jobs complete, 4 in flight, and 43 queued;
- repeated HTTP 404 responses for catalog GLB/DDS assets.

At approximately 45 seconds it still reported:

- 692/1,136 primitive fallbacks;
- the same 256-object render cap;
- 436 skipped objects;
- 46/195 model jobs complete, 4 in flight, and 145 queued.

After that capture, a combined browser command exceeded 62 seconds and a small
state evaluation exceeded 34 seconds. The page therefore failed both the
settlement and interactive-responsiveness expectations. This also independently
confirms that the current Areas loop's previously recorded 60-second IKEA gate
has not been closed.

Evidence:

- `output/playwright/app-audit-2026-08-06/ikea-after-15s-1280x720.png`
- `output/playwright/app-audit-2026-08-06/ikea-after-45s-1280x720.png`

Impact: large Areas cannot be treated as usable or visually complete, and the
current renderer can amplify missing-asset retries while doing substantial
main-thread work.

Required remediation:

1. eliminate repeated requests for the same failed asset by using a bounded,
   negative-result cache and one explicit retry policy;
2. move parsing/geometry work off the interaction path where feasible;
3. define a deterministic settlement contract for selected Areas;
4. add a 1,000+ object benchmark with input-latency, queue depth, retry count,
   missing-asset count, memory, and settlement-time budgets;
5. do not call an Area complete while any required tile/model contract is
   missing, failed, stale, or capped.

### APP-P1-02 - the implemented HTTP API has drifted from FE-BE contract v1

Status: **confirmed**.

The mandatory contract at
`C:\Projects\ai-documentations\aurora-web\architecture\2026-05-21_fe-be-contract-v1.md`
defines contract-v1 surfaces including production Areas, drafts, exports, DM
commands, and administration. Static controller inventory in the current
backend exposes these roots instead:

`health`, `auth`, `areas`, `areas/editing`, `catalog/*`, `processing/graphs`,
`processing/jobs`, `settings/runtime`, `system/maintenance`, and `vfx`.

No controller implementation was found for the contract's
`/areas/production`, draft, export, `/dm/commands`, or `/admin/config` routes.
At the same time, `backend/src/common/openapi/swagger.ts` still describes the
API as covering "authentication, drafts, export and administration." This
means documentation, client/server implementation, and the mandatory contract
are three different surfaces.

Impact: consumers cannot use contract v1 as a reliable compatibility boundary;
tests may validate the current implementation while the required public
contract remains absent.

Required remediation: either implement the contract additively or approve and
version an explicit migration. Generate and diff OpenAPI in CI against the
contract allowlist so missing or incompatible routes fail immediately.

### APP-P1-03 - the working state is not attributable or safely reviewable

Status: **confirmed**.

The checkout had 218 modified and 555 untracked status entries before the two
audit reports were added. HEAD is also the current `main`/`origin/main` commit,
so the effective application consists primarily of uncommitted work. The root
contains obvious automation debris, including untracked files named
`({state` and `document.querySelector('[data-testid`.

Impact: failures and screenshots cannot be reproduced from a commit, unrelated
work cannot be separated confidently, and rollback/review is unsafe.

Required remediation: inventory ownership, remove or quarantine generated
debris, split changes into scoped branches/commits, and capture all future test
and runtime evidence against a clean tree identity. Do not discard existing
work while doing this inventory.

### APP-P1-04 - central modules have become change-amplifying monoliths

Status: **confirmed**.

Representative production file sizes:

| File | Approximate lines |
| --- | ---: |
| `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts` | 22,418 |
| `backend/src/modules/catalog/application/catalog.application.service.ts` | 19,383 |
| `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts` | 16,634 |
| `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx` | 11,949 |
| `frontend/src/modules/placeables/adapters/three/placeableThreeAssetLoader.ts` | 8,307 |
| `backend/src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository.ts` | 7,804 |
| `frontend/src/modules/layout/components/WorkspaceLayout.tsx` | 7,744 |

The frontend's own architecture rule says components should consume
application/domain ports rather than concrete adapters. Production components
currently import HTTP, Aurora decoding, and Three adapters directly; examples
include `AuroraAreaEditingPanel`, `CreaturesModePanel`,
`SceneObjectThumbnail`, `ItemModelPreviewPane`, and
`WorkspaceCanvasViewport`.

Impact: small semantic changes cross rendering, fetching, caching, state, and
UI responsibilities; the broad test failures show the resulting blast radius.

Required remediation: extract stable, tested ports and cohesive services in
behavior-preserving slices. Start with asset resolution/retry ownership,
viewport runtime orchestration, scene-object render admission, and catalog
projection. Avoid a wholesale rewrite.

### APP-P2-01 - coverage and mutation configuration exclude the highest-risk code

Status: **confirmed**.

Frontend coverage explicitly excludes the 11,949-line
`WorkspaceCanvasViewport.tsx`. The default frontend mutation configuration
targets 15 selected auth/layout/scene files and omits the large renderer and
asset-loader paths. The default backend mutation configuration likewise targets
only a small selected set; numerous current VFX, runtime-settings, catalog
repository, and rendering contracts require separate configs or have no
mutation gate.

No mutation run was attempted because the required unit/regression baseline is
already red. Running mutation testing now would not produce an actionable
quality signal.

Required remediation: restore the baseline, then publish a coverage/mutation
matrix by critical domain. Exclusions require a written reason and an
alternative verification strategy.

### APP-P2-02 - mandatory pipeline observability is not implemented

Status: **confirmed by static search**.

The project observability contract requires `pipeline.job.*`,
`pipeline.stage.*`, `stageGroup`, and `aurora_pipeline_*` metric families.
No implementation matches were found in `backend/src`. There is extensive
feature-local diagnostic data, especially for VFX, but it is not the required
job/stage operational telemetry.

Impact: queue stalls, stage latency, retry storms, and large-Area degradation
cannot be monitored consistently in deployment.

Required remediation: implement the taxonomy at job/stage boundaries with
bounded cardinality, correlation IDs, queue-depth gauges, duration histograms,
failure codes, and privacy-safe provenance.

### APP-P2-03 - delivery and dependency reproducibility controls are weak

Status: **confirmed**.

- No repository CI workflow was found.
- Both Dockerfiles run `npm install` rather than lockfile-enforcing `npm ci`.
- Development Compose repeats `npm install` at container start.
- `chrislusf/seaweedfs:latest` and `redis/redisinsight:latest` are unpinned.
- Compose contains fixed development secrets and exposed service ports.

Impact: a build can change without source changes, the red test baseline is not
automatically enforced, and development defaults are easy to promote by
accident.

Required remediation: add CI for clean install, build, unit, regression, e2e,
contract diff, and focused performance gates; pin images by immutable version
or digest; use `npm ci`; and make development secrets/profile exposure explicit.

### APP-P3-01 - viewport layout has persistent document overflow and missing favicon noise

Status: **confirmed local observation**.

- At the native 929x917 viewport, document height was 997 px: 80 px of vertical
  overflow.
- At 1600x900 and 1280x720, document height remained one pixel taller than the
  viewport, producing a vertical scrollbar and reducing client width.
- The browser logged repeated favicon 404 errors.

Evidence:

- `output/playwright/app-audit-2026-08-06/workspace-native-929x917.png`
- `output/playwright/app-audit-2026-08-06/workspace-1600x900.png`
- `output/playwright/app-audit-2026-08-06/workspace-1280x720.png`

## Positive controls observed

1. Backend and frontend production builds both complete.
2. Backend health includes a source/build identity and explicitly labels the
   dirty build, which is useful for diagnosis.
3. Auth, role, and permission decorators are applied systematically to most
   controller surfaces. Public routes are explicit.
4. The blank Area and missing tile/model states are surfaced as incomplete;
   the UI did not falsely claim visual completion.
5. The test corpus is substantial: even the failing diagnostic run had 1,381
   passing backend unit assertions and 1,768 passing frontend unit assertions.
6. The renderer exposes queue, fallback, skipped-object, and settlement counts,
   which made the large-Area failure diagnosable.

These controls reduce debugging time but do not offset the P0/P1 blockers.

## Recommended recovery order and exit criteria

### Phase 0 - secure and stabilize provenance

1. Remove/gate predictable seed credentials and rotate any deployed defaults.
2. Inventory the dirty tree and bind work to scoped commits without deleting
   unknown user work.
3. Make a clean checkout build reproducibly with pinned dependencies/images.

Exit: no known credential is derivable from source, and a clean commit produces
the same build identity twice.

### Phase 1 - restore the contract and automated baseline

1. Decide contract-v1 implementation versus an explicitly versioned migration.
2. Fix compile-contract failures first, then backend unit/e2e, frontend unit,
   and regression smoke.
3. Add CI and OpenAPI/contract diff gates.

Exit: all broad gates pass from a clean tree without `--forceExit`, and the
documented API equals the generated API for the selected contract version.

### Phase 2 - recover large-Area operability

1. Deduplicate failed asset requests and bound retries.
2. Break up renderer/orchestrator responsibilities behind measured ports.
3. Add the 1,000+ object performance/settlement scenario.
4. Implement required pipeline observability.

Exit: `_IKEA` or an equivalent fixture reaches a documented settled state under
budget, remains interactively queryable throughout, emits zero unexpected
asset failures, and never hides required content behind a cap.

### Phase 3 - improve depth of verification

1. Expand coverage and mutation scope to rendering, asset delivery, scene
   normalization, and runtime settings.
2. Fix responsive overflow and low-noise browser errors.

Exit: every critical domain has a named unit/regression/mutation/performance
owner and no unexplained exclusion.

## Commands and artifacts

Key commands executed:

```text
git status --short --branch
cd backend && npm.cmd run build
cd frontend && npm.cmd run build
cd backend && npm.cmd run test:unit -- --runInBand
cd backend && npm.cmd run test:unit -- --runInBand --forceExit --json
cd backend && npm.cmd run test:e2e -- --runInBand
cd frontend && npm.cmd run test:unit
cd frontend && npm.cmd run test:regression
rg -n "@Controller\(" backend/src -g "*.controller.ts"
rg -n "pipeline.job|pipeline.stage|aurora_pipeline_|stageGroup" backend/src
```

Saved application screenshots are under
`C:\Projects\aurora-web\output\playwright\app-audit-2026-08-06`.

Temporary JSON outputs are under
`C:\Projects\aurora-web\.codex-tmp\audit-2026-08-06`. They are local diagnostic
artifacts, not durable release evidence.

## Limitations

- This audit did not change code, rotate credentials, load-test a deployed
  environment, run a dependency vulnerability scanner, or perform penetration
  testing.
- Mutation tests were intentionally not run against a red baseline.
- Browser behavior was observed on this workstation only.
- No Aurora Toolset or NWN parity conclusion is made here; the separate
  decompilation audit defines that evidence boundary.
