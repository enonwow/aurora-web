# Complete Area authoring, CRUD, tile rendering, and connectivity program

Date: 2026-08-06  
Status: proposed canonical implementation and completion plan  
Scope owner: Areas workspace  
Supersedes as umbrella scope: Create-only planning  
Detailed Create subplan:
`docs/brainstorm/2026-08-06-area-create-crud-implementation-plan.md`

## 1. Product outcome

Finish the Area authoring product, not only the New Area request. An authorized
user must be able to create, open, edit, save, reopen, materialize, validate,
and delete an Area and its supported content without corrupting a module or
losing fields the application does not yet understand. Every tile exposed by
the product must render from the correct source resources, join its neighbours
according to verified Aurora semantics, persist exactly, reopen identically,
and remain usable in the native Toolset and NWN runtime.

The word **complete** in this program means all of the following at once:

1. every function declared in the Area capability catalog is implemented;
2. every visible authoring control is active, preserve-only, or explicitly
   excluded by a versioned product policy; no control silently drops data;
3. every selectable tile and group is covered by the immutable certification
   matrix;
4. rendering, visual seams, SET adjacency, `PathConnect`, WOK continuity, and
   runtime traversability are evaluated as separate contracts;
5. local save, packed module readback, Toolset Save/Build, and NWN load all pass;
6. the result is deterministic, diagnosable, authorization-safe, retry-safe,
   and recoverable after an interrupted transaction;
7. the evidence identifies exactly which binary, module, HAK order, resources,
   build, matrix plan, and application commit were tested.

This is the completion plan for the **Areas workspace**. It does not attempt to
finish unrelated global product areas such as account administration, DM tools,
or every non-Area asset editor.

## 2. Evidence baseline and current verdict

This plan is grounded in:

- `docs/audits/area-creation-application-audit-2026-08-06.md`;
- `backend/docs/aurora-reverse/area-creation-decompilation-audit-2026-08-06.md`;
- accepted AUR-S05-01 through AUR-S05-06 native evidence;
- the Aurora Toolset usage standards roadmap and function manifests;
- the current frontend Aurora-first implementation matrix;
- the proof-capture safety contract and central Toolset operating standard;
- the existing immutable tile add/connect matrix artifacts.

Current state is useful but not release-complete:

| Capability | Evidence today | Program verdict |
| --- | --- | --- |
| Local tile editing | Terrain, crossers, groups, replace, rotate, height, erase, grid transforms, and undo/redo exist for selected cases | Partial |
| New Area persistence | Collision checks, writes, byte readback, and rollback mechanics exist | Blocked by the emitted native profile |
| ARE output | New draft writer emits only a small subset of the strict native root | Failed for release |
| GIT output | Empty resource uses `ItemList` instead of native `List` and omits native defaults | Failed for release |
| GIC output | Empty resource contains zero fields versus the verified native nine-field sample | Failed for release |
| New tile defaults | Application animation-loop bytes are `0`; verified Toolset output uses `1` | Unresolved semantic differential |
| Native acceptance | No application-created candidate passed Toolset Save/Build, packed readback, and NWN | Missing |
| Tile definition inventory | 99 tilesets and 53,700 definitions in the current immutable plan | Planned, not completed |
| Add/render | 675 of 53,136 required rows verified in the current matrix | 1.270%; incomplete |
| SET groups | 675 of 9,114 required rows verified | 7.406%; incomplete |
| Packet execution | 94 of 3,890 packets accepted | 2.416%; incomplete |
| Path reference | 43,653 of 52,767 candidates evaluated | Reference-only, not connection proof |
| Native `PathConnect` | 0 of 52,767 candidates verified | Hard blocker |
| Matrix execution | Recovered checkpoint `94/3890`; next packet is deterministic and resumable | Active; incomplete |

The Toolset roadmap itself also needs a consistency repair before it can be a
release ledger: its summary snapshot and several detailed row statuses have
drifted apart. Release decisions must be generated from manifests and accepted
proof packets, not manually inferred from the summary table.

### Execution update: 2026-08-07

The implementation is active, but the Level 4 completion claim remains
blocked. The following slices are now implemented and verified independently:

- owner-scoped local draft Create/Read/Update/Delete is wired end to end through
  the additive HTTP contract, backend service/repositories, frontend port and
  facade, visible draft panel, and workspace Save command;
- production Area read now uses an explicit copy-on-open command. The backend
  stores a JSON-safe immutable projection of the processed Area, records the
  exact source timestamp and processing cache key, and preserves that snapshot
  while later workspace saves replace only `editableScene`. For
  `area_appearance`, the retained `sourceArea` was deep-equal to the current
  processed payload with zero differing paths and stable SHA-256
  `b8192fd7fabcfea91480b7354f156392bcc7ef15be06b8dc2f5fb0f3591ffb9c`;
- a successful remote save now advances one layout-owned draft-list signal.
  The live browser flow opened the production copy at `r2`, issued one
  `Ctrl+S`, received `r3`, and refreshed the visible list to `r3` without a
  manual Refresh action. Delete then removed the exact owner drafts and an
  authenticated API read confirmed an empty list. The retained UI artifacts
  are
  `output/playwright/area-draft-crud-2026-08-07/02-save-r3-tile-ready.png` and
  `03-delete-clean-tile-ready.png`;
- a real authenticated browser run completed Create, Save, Open, Update, and
  Delete against the Docker backend. The retained UI diagnostics are
  `output/playwright/area-draft-crud-2026-08-07/01-saved-revision-r1.png`,
  `02-delete-confirmation-r3.png`, and `03-delete-complete-empty-list.png`;
- the browser run exposed and closed two contract defects: persisted SET
  terrain names are now accepted as non-blank source values instead of being
  restricted to mock terrain names, and bodyless DELETE no longer sends an
  invalid JSON content type. Focused frontend contract/parser/panel tests pass;
- revisions use ETag/`If-Match`, writes use idempotency keys, stale updates and
  deletes fail with exact expected/actual revisions, and owner isolation is
  covered by the Areas HTTP E2E suite;
- rapid workspace saves are serialized per Area so a later command reads the
  revision returned by the preceding save instead of racing with the same CAS
  baseline; the focused save-queue mutation score is `100%` (10/10 mutants
  killed);
- the expanded Area-draft mutation gates pass independently: frontend
  `12/12` mutants killed and backend JSON projection `6/6` mutants killed,
  with zero survivors and zero uncovered mutants. The frontend profile excludes
  only `ArithmeticOperator` for the layout refresh signal because `+1` and
  `-1` are behaviorally equivalent effect triggers at that boundary; the
  callback omission, prop omission, optional callback, queue, and backend
  failure branches remain mutated and killed;
- Area scene replacement and viewport remount no longer reset the globally
  handled workspace-command revision to zero. This prevents the previous
  `Open Draft` replay in which one user Save could produce two serialized PUTs.
  Focused scene-reset/save/queue tests pass `12/12`; a live Playwright run
  observed no PUT during Open and exactly one PUT for one `Ctrl+S`
  (`If-Match: "1"`, response `ETag: "2"`). The resulting `r2` panel artifact is
  `output/playwright/area-draft-crud-2026-08-07/04-single-save-after-open-r2.png`;
- the stale matrix state was reconciled fail-closed. Immutable plan
  `c4d6d80658e93d62f5ed154a0feadc1d236453d9fb4fb12720e10fe4f53b2db0`
  is ready at checkpoint `96/3890`, with `693/53136` required add/render rows
  captured and independently reviewed;
- `mst04-group-chunk-0002` through `mst04-group-chunk-0008` have fresh exact
  canvas, state, lifecycle, hash-bound visual-review, and acceptance artifacts.
  All contain zero pending, failed, bridge, or placeholder tiles after
  settlement;
- the guarded matrix runner now skips only the disposable pre-mutation model
  warm-up for `tile-add-connect-matrix-local`. It retains exact final-fixture,
  tile-process, terrain, camera, presented-frame, screenshot, and independent
  visual-review gates. Other local editing scenarios retain their pre-mutation
  readiness gate;
- the guarded CDP capture authentication path now gives a seeded session at
  least the configured login wait budget and, when the stored session reaches
  `/app` without a settled shell, clears only the auth-session key and returns
  to the login form. Form fallback now retries until the cancelable submit
  event is actually handled by React; a rendered but unhydrated form therefore
  cannot consume the full authenticated-app wait without issuing `/auth/login`.
  The proof-safety contract covers both fallbacks and passes.
  This reduced the observed matrix preflight from `102148 ms` to `18538 ms`
  without weakening the authenticated-shell gate;
- `nex01-group-chunk-0001` was staged only after its nine unique tile process
  contracts completed, then reviewed from the exact page and canvas images and
  accepted through the hash-guarded review command. The retained
  `attempt-0005` frame reports `14/14` loaded tiles, `0` pending, `0` failed,
  `0` bridge, ready mutation/post-capture/presented-frame settlements, and no
  blocker. The frame, state, canvas, page, lifecycle, and visual review are in
  `output/proof/tile-add-connect-matrix-v2-path-node-aware-v2/captures/` under
  the `nex01-group-chunk-0001.attempt-0005` prefix. This advances add/render
  and group coverage by eight rows but deliberately leaves native
  `PathConnect` at `0/52767`;
- `nex01-group-chunk-0002` exposed two diagnosable harness-environment defects:
  the login form submit event was not handled in its first cold shell, and two
  retained Playwright debug sessions were concurrently issuing tile-process
  requests. The submit-handler readiness guard was implemented test-first and
  both named debug sessions were closed. A clean `attempt-0003` then staged,
  passed independent page/canvas review, and was hash-guard accepted with
  `28/28` loaded tiles, `10/10` member texture contracts applied, `0` pending,
  `0` failed, `0` bridge, and all mutation/frame settlements ready. This adds
  ten more group/add-render rows and does not add any PathConnect evidence;
- committed-module startup is now usable from a clean control store: baseline
  inventory excludes the `__aurora` and processing `cache` namespaces, supports
  the observed 112-page shared namespace within a bounded 200-page gate, and
  lists internal sources only below the exact `__aurora` prefix. The committed
  reader lazily bootstraps an absent workspace head, while same-module callers
  share one in-flight transaction and quarantined heads still fail closed.
  Focused bootstrap/reader tests pass `14/14`, related service/wiring tests pass
  `51/51`, the backend build passes, and authenticated runtime reads for Areas,
  editing tilesets, and Area drafts all return HTTP `200` after restart.
- fresh guarded CDP terrain proof for the saved/copy-on-open workflow is stored
  at
  `output/proof/area-draft-crud-2026-08-07/appearance-crud-render-r2.frame.json`
  with page and exact canvas images beside it. The captured Area identity is
  exact (`area_appearance`, `tin01`, `2x2`), the renderer settled at `4/4`
  loaded, `0` failed, `0` bridge, `0` pending, `96` material maps, no blocker,
  fresh screenshot, and visible-content classification. Independent visual
  review found one connected room with no blank, placeholder, or unexplained
  seam. SHA-256 values are
  `696ab43256b67f51347ba9f0744154f8eb86f360ae1d9d1f6c6c4b2531842698`
  for the page image,
  `3c098b7aa12855aed9187fed51497f85453dfb365ad1dca1b703d7c684c15c7c`
  for the canvas image, and
  `9f94ffef5cd6460d97e6f98c111462488ab244dde1e4f65d0df259d76ef1894b`
  for the frame. The proof safety contract passed. This is local renderer
  evidence only and is not promoted to retail Toolset/NWN parity;
- the interactive CRUD trace was retained as
  `output/playwright/area-draft-crud-2026-08-07/trace-1786104218839.trace`
  and `.network`, with respective SHA-256 values
  `52ca68970adb170d08014158f2516922216399c58a53bc3a6f691e756e376ffa`
  and
  `2b019f6a66a3e5f71ab2ac30bc3cc2e7378116adbaa95ee57c4a7e4e0ed84b60`;
- focused release gates pass: frontend production build, backend production
  build, Area CRUD frontend regression `1/1`, Area-draft focused unit tests
  `8/8`, backend Area draft unit tests `5/5`, and Areas HTTP E2E `15/15`.
  Repository-wide gates remain red from unrelated dirty-worktree baselines:
  frontend VFX/fixture/legacy shell suites, backend runtime-settings test
  timeouts, two runtime-settings E2E `422` expectations, and non-Area frontend
  regression fixtures. These failures do not weaken the focused CRUD evidence,
  but Level 3/4 completion remains blocked until the complete suites are green.

### Execution update: 2026-08-12

The preserve-first Update lane is now implemented through the pre-publication
transaction core, without weakening the native completion gate:

- the additive validation contract is frozen in
  `backend/docs/aurora-reverse/area-update-validation-contract-v1-2026-08-12.md`;
  its authenticated admin endpoint binds one exact owner draft revision,
  current module revision, source ARE fingerprint, SET fingerprint, and an
  independently parsed ARE candidate without writing module state;
- the privileged publication contract is frozen in
  `backend/docs/aurora-reverse/area-update-materialization-contract-v1-2026-08-12.md`
  and in the canonical FE-BE contract. It requires strong `If-Match`, an
  idempotency key, the shared fencing lease, a durable journal, content-addressed
  staging, one module-head compare-and-set, exact readback, and proved
  compensation or quarantine;
- strict `area-update-command.v1` normalization and deterministic hashing are
  implemented. The compiler loads the exact retained draft and captured module
  manifest, verifies the source ARE, emits and independently validates the
  preserve-first ARE, and carries the existing GIT, GIC, and `module.ifo`
  bytes and hashes unchanged into the candidate resource set;
- the Update transaction coordinator implements preflight and under-lock
  idempotency, authorization, revision/quarantine checks, journal-first staged
  publication, verified readback, immutable receipt finalization, compensation,
  and fail-closed quarantine behavior;
- the shared Create/Update fencing boundary is operation-aware in memory and
  MySQL. A non-terminal Update journal blocks normal Create and Update writers,
  while exact recovery alone can transfer the fencing lease. The durable
  lifecycle schema retains byte-free candidate manifests, state transitions,
  verified receipts, and operation-scoped idempotency results;
- persisted Update readback verifies the published snapshot hashes, unique ARE,
  GIT, and GIC resources, GFF types/versions, exact ARE ResRef, dense
  `Width*Height` topology, and `module.ifo` membership. Existing non-empty GIT
  and GIC companions are admitted and required to remain hash-exact;
- startup recovery deterministically scans released or expired Update journals.
  It freshly reverifies a retained `readback_verified` receipt before atomic
  finalization, otherwise restores the baseline and proves it, or quarantines
  the module when restoration cannot be established;
- authenticated `PUT /api/v1/modules/{moduleId}/areas/{areaResRef}` is exposed
  for administrators with `area.materialize.update`. It requires a valid
  idempotency key and strong `If-Match`, returns the successor revision in a
  strong ETag, marks created versus replayed results, disables response caching,
  and invalidates Area/editing/catalog caches only after success or replay;
- the final focused regression gate passes `197/197` unit tests, `2/2` atomic
  publication integration tests, `17/17` authenticated Areas HTTP E2E tests,
  and the backend production build. The integration proof publishes one
  successor snapshot, verifies exact ARE bytes and unchanged GIT/GIC/IFO bytes,
  proves idempotent replay performs no second compilation/publication, and
  rejects a new command against the stale predecessor revision with `412`;
- the initial Update-validation mutation run completed `527` mutants with
  score `50.09%` (`258` killed, `167` survived, `96` uncovered, `6` timed out).
  This historical first run remains recorded as a red quality signal. It has
  been superseded by the transaction-scoped mutation gate: `659` mutants,
  `83.76%` score (`552` killed, `95` survived, `12` uncovered, `0` timed out),
  with a configured hard break threshold of `80%`. Per-component scores are
  `84.95%` for the transaction coordinator, `97.33%` for recovery, `85.60%`
  for persisted readback, `77.99%` for the memory lifecycle store, and `100%`
  for the journal manifest policy. The separately tested shared Create lock
  scored `95.66%` in the preceding combined run;
- the durable Update publication slice now passes its local implementation,
  authorization, recovery, integration, and quality gates. Product-level
  Update certification remains open until the exact committed candidate passes
  fresh Toolset Save/Build/reopen and NWN runtime proof.

The fail-closed module Area Delete lane is also implemented through its local
publication and recovery gates:

- the additive contract is frozen in
  `backend/docs/aurora-reverse/area-delete-materialization-contract-v1-2026-08-12.md`
  and the canonical FE-BE contract. An authenticated administrator must first
  obtain a revision-bound deterministic impact preview and then submit the
  exact preview SHA-256, matching ResRef confirmation, strong `If-Match`, and
  idempotency key;
- the preview scanner validates the exact snapshot head, manifest, ARE/GIT/GIC
  triplet, `module.ifo`, single membership, and native entry Area. It scans
  retained GIT structures and NSS tokens for inbound references, blocks every
  NCS as uninspectable, and fails closed on malformed, oversized, truncated,
  missing, or colliding resources. There is no force, cascade, or repair mode;
- the compiler reruns the impact scan while holding the shared module fencing
  lease, requires the confirmed preview hash, loads and hashes the exact bytes
  being removed, and creates a preserve-first IFO candidate that removes
  exactly one membership while preserving supported unrelated fields, list
  order, and struct types;
- `DELETE /api/v1/modules/{moduleId}/areas/{areaResRef}` is exposed with the
  explicit `admin` role and `area.materialize.delete` permission. The backend
  performs preflight and under-lock idempotency, revision/quarantine checks,
  journal-first staging, one immutable module-head compare-and-set, exact
  readback, cache invalidation, and a verified receipt with the successor ETag;
- the immutable successor removes exactly the target ARE/GIT/GIC descriptors,
  replaces only `module.ifo`, preserves every unrelated descriptor and CAS
  object identity, and remains invisible until the single head CAS. Readback
  independently proves target absence, zero IFO membership, unchanged survivor
  cardinality, exact IFO bytes/hash, and absence of a surviving entry-Area
  reference;
- both memory and MySQL stores retain operation-scoped, byte-free Delete
  journals and idempotency results. A non-terminal Delete blocks Create,
  Update, and Delete writers. Startup recovery freshly verifies a retained
  successor before finalization; otherwise it restores the exact baseline or
  quarantines the module when restoration cannot be proved;
- the final focused local gate passes `166/166` unit tests, `2/2` full-pipeline
  integration tests, `19/19` authenticated Areas HTTP E2E tests, and the backend
  production build. The integration proof uses the real impact scanner,
  compiler, IFO writer, snapshot repository, transaction store, coordinator,
  and readback path; it proves exact triplet removal, unrelated triplet
  preservation, IFO membership removal, retry replay without a second
  publication, and stale-predecessor rejection;
- the transaction mutation gate covers the journal manifest policy, candidate
  compiler, transaction coordinator, recovery coordinator, and memory control
  store. It completed `739` mutants at `80.51%` (`593` killed, `129` survived,
  `15` uncovered, and `2` timed out) against a hard `80%` break threshold.
  Per-component scores are `100%` for the journal policy, `97.33%` for recovery,
  `80.54%` for the transaction coordinator, `79.18%` for the memory store, and
  `75.61%` for the compiler. The separate atomic snapshot adapter gate passes
  `27/27` focused unit tests plus the full-pipeline integration tests;
- this closes the local module Delete implementation slice, not the product
  certification claim. The exact application-produced destructive successor
  still requires fresh Toolset Save/Build/reopen, packed-module readback, and
  NWN runtime proof in the final native-certification stage.

The following claims are still explicitly missing and must not be inferred from
that progress:

### Paused implementation checkpoint — 2026-08-12

The user paused execution during Stage 4. The active mutation-test process and
its orphaned worker processes were terminated on request; no Toolset, NWN, or
application runtime process was started by this slice. Five program stages
remain when the current Stage 4 is included.

The following Stage 4 work is retained in the working tree and must be resumed,
not recreated:

- the primary Aurora decompilation/native-pair audit is recorded in
  `backend/docs/aurora-reverse/area-git-gic-object-pairing-audit-v1-2026-08-12.md`;
- production Area reads now retain exact ARE/GIT SHA-256 provenance, and
  copy-on-open drafts bind object materialization to the exact source GIT;
- `area-object-source-identity.ts` provides deterministic, time-independent
  object identities shared by the read projection and mutation planner;
- `aurora-gff-area-object-pair-writer.ts` validates the canonical nine-family
  native profile and removes the same immutable ordinal from both GIT and GIC
  while preserving survivor and root fields;
- `area-existing-object-deletion-planner.ts` derives deletions from retained
  `aurora_git` provenance and rejects unknown, duplicate, cross-family,
  transformed, retagged, or re-resrefed survivors in the admitted deletion-only
  slice;
- the Update compiler now rejects stale GIT provenance, produces paired GIT/GIC
  candidates, publishes an explicit object-mutation receipt, and keeps the
  previous exact-byte preservation receipt for updates without object changes;
- persisted Update readback independently checks the nine GIT/GIC family
  cardinalities after publication;
- the atomic publication integration test covers a paired object deletion and
  proves that the immutable successor exposes both changed companions together.

The last completed local gates are `99/99` focused unit tests, `3/3` Area Update
atomic-publication integration tests, and successful backend and frontend
production builds. The expanded mutation gate in
`backend/stryker.area-update-transaction.config.json` was started but explicitly
terminated before producing a report. Its prior `83.76%` result predates the
new object planner/writer/compiler scope and cannot certify this checkpoint.

### Resumed implementation checkpoint — 2026-08-12

Execution resumed without recreating the retained Stage 4 work. The exact
resume quality gate is now complete:

- the compiler suite was expanded to 22 focused tests covering every captured
  head and manifest identity, missing and wrongly typed Area resources, every
  exact CAS-content readback field, retained-draft failures, projection
  diagnostics, stale ARE/GIT provenance, writer failures, output metadata,
  independent ARE validation, deletion-only survivor edits, and malformed
  GIT/GIC pairing;
- the candidate compiler reached `95.88%` in the current expanded mutation run
  (`279` killed, `7` survived, `5` uncovered of `291`);
- the complete nine-file Update transaction mutation gate passes its unchanged
  hard `80%` threshold at `85.80%`: `1353` killed, `6` timed out, `187`
  survived, and `38` uncovered of `1584` mutants;
- the same full report records `86.32%` for the deletion/transform planner, `80.94%` for
  the paired GIT/GIC writer, `85.19%` for persisted readback, `97.33%` for
  recovery, `84.04%` for the transaction coordinator, `98.31%` for source
  identity, and `100%` for the journal policy;
- the machine-readable report is retained at
  `backend/reports/mutation/mutation.json`.

This closes the previously missing mutation-quality gate for the paired
deletion and existing-creature-transform slices. It does not promote Stage 4
or native certification to complete. The next implementation slice remains
gated by exact Aurora/native evidence for the specific object transform,
property, construction, polygon, script, or inventory semantics it activates.

Resume order and current state:

1. completed - rerun the expanded Area Update mutation gate and retain its full
   report;
2. completed - strengthen the new identity, planner, pair-writer, compiler, and
   readback paths without lowering the hard `80%` threshold;
3. completed - audit and implement the existing-creature native
   `XPosition/YPosition/ZPosition/XOrientation/YOrientation` transform lane;
4. completed - audit and implement the existing-placeable native
   `X/Y/Z/Bearing` placement-transform lane while preserving GIC bytes and not
   inventing `VisualTransform` fields;
5. completed - audit and implement the existing-waypoint native
   `XPosition/YPosition/ZPosition/XOrientation/YOrientation` transform lane;
6. completed - audit and implement bounded transforms for item, sound, store,
   trigger, and encounter; retain exact audits and focused quality gates;
7. completed - close the existing-door transform family as a verified generic
   movement non-admission. Native persistence has position/bearing fields, but
   valid authoring requires a separately verified tileset hook;
8. in progress - implement hook-aware and point/polygon construction plus
   property, script/reference, inventory, and new object construction lanes for
   all nine families;
9. resolve the Area-scope regression drift, then advance to tileset
   eligibility/rendering, connectivity, UX/diagnostics, and final matrix/native
   certification.

The creature transform authority is frozen in
`backend/docs/aurora-reverse/area-existing-creature-transform-audit-v1-2026-08-12.md`.
Its planner/writer/compiler and atomic-publication coverage passes `190/190`
tests in the Update mutation configuration, plus a dedicated transform
publication integration case. Transform-only publication preserves GIC bytes;
combined deletion and transform use immutable source ordinals and mutate the
paired lists atomically.

The placeable placement-transform authority is frozen in
`backend/docs/aurora-reverse/area-existing-placeable-transform-audit-v1-2026-08-12.md`.
The generalized planner/writer/compiler and atomic-publication path passes four
focused suites with `84/84` tests and a clean backend production build. Its
focused mutation profile passes the unchanged hard `80%` threshold at `84.52%`
across `620` mutants (`91.74%` planner and `82.77%` paired writer). The writer
stores float32-native `X/Y/Z/Bearing`, verifies the persisted candidates
independently, preserves GIC bytes for transform-only publication, and supports
an independent paired deletion in the same transaction.

The latest full backend regression run is not globally green: `202` suites
passed and `7` failed; `2033` tests passed and `5` failed. The observed failures
are existing dirty-worktree contract/fixture drift in derived-model path
versioning, expanded Area object-count fixtures, runtime-settings constructor
wiring, Area Create cold reopen, and `main.ts` listen-host expectations. They
were not rewritten as part of the transform slice. Area-scope failures must be
resolved before Stage 4 can close; unrelated dirty-worktree changes must remain
preserved.

### Paused implementation checkpoint - 2026-08-12 (latest)

The user paused the program after the placeable placement-transform slice. No
Stryker or Jest worker, Toolset process, or NWN process is active for this work.
Existing development-server processes were left untouched because they were
not started or owned by this slice. The implementation goal remains active and
incomplete; execution must resume from item 5 above without recreating the
retained audits, contracts, production changes, or tests.

This checkpoint does not complete Stage 4. In particular, new object
construction, the other seven family transforms, property persistence,
trigger/encounter polygon writes, scripts, merchant inventory, and family-wide
Toolset/NWN proof remain open.

### Resumed implementation checkpoint - 2026-08-12 (waypoint slice)

Execution resumed from the retained checkpoint and did not recreate the
creature/placeable work. Generic door movement remains fail-closed because the
retained live proof establishes hook placement only. The next independently
supported family is waypoint:

- Aurora authority is frozen in
  `backend/docs/aurora-reverse/area-existing-waypoint-transform-audit-v1-2026-08-12.md`;
- the exact decompiled reader/writer pair is `FUN_00659970` / `FUN_00659bfc`,
  backed by native waypoint placement and an exact packed `WaypointList`
  struct-type/field-profile readback;
- the shared planner and paired writer now admit waypoint position/yaw through
  native `XPosition/YPosition/ZPosition/XOrientation/YOrientation`, preserve
  GIC bytes for transform-only publication, and independently verify exact
  float32 candidate values;
- planner, writer, compiler, and atomic-publication suites pass `89/89` tests;
- the backend production build passes;
- the focused mutation gate passes at `84.72%` across `635` mutants (`538`
  killed, `73` survived, `24` uncovered, zero timeout/error). The planner is
  `92.06%` and the paired writer is `82.91%`. All mutations that remove or
  invert waypoint admission and mapping were killed; retained survivors are
  existing diagnostic-string/equivalent or independent-verifier testability
  debt and remain visible in the machine report at
  `backend/reports/mutation/area-object-transform.json`.

This does not complete Stage 4. New object construction, the other six family
transforms, properties, polygons, scripts, inventory, and family-wide native
certification remain open.

### Paused implementation checkpoint - 2026-08-12 (after waypoint slice)

The user paused execution after the waypoint transform slice. No further
implementation or native Toolset/NWN work was started after the verified gates
above. The program goal remains active and incomplete; it must not be promoted
to complete while any mandatory Stage 4-11 gate is open.

Resume from the retained dirty working tree on branch
`codex/vfx-row216-aurora-first-20260812`. Do not recreate, discard, stage, or
commit the existing work as one bulk change: the repository contains unrelated
user changes and the Area CUD/object-authoring and tile-rendering lanes must
remain isolated. The waypoint audit, contract updates, paired writer/planner,
focused tests, and mutation JSON report listed above are the latest completed
artifacts.

The exact next implementation action is read-only Aurora-first research for the
existing item family: reproduce the native ground-item `List` GIT field profile from
the retained ground-placement evidence and trace the exact decompiled instance
reader/writer pair before adding a failing transform test or production code.
If the native item transform semantics cannot be reproduced, stop that family
fail-closed and record the blocker. Generic door movement remains excluded;
encounter and trigger polygon geometry remain separate semantic audits.

The last retained quality gates are `89/89` focused tests, a successful backend
production build, and the `84.72%` focused mutation result over `635` mutants.
The latest broader backend regression remains `202` passing suites and `7`
failing suites (`2033` passing tests and `5` failing tests) with the known
dirty-worktree drift recorded above; it is not a green Stage 4 exit gate.

- native `PathConnect` remains `0/52767` accepted rows;
- WOK seam and NWN traversability evidence remain separate incomplete lanes;
- the application-created module still lacks a successful exact Toolset
  Save/Build/reopen and NWN proof. The last native startup failed closed after
  an unexpected module won the startup race, so no application candidate was
  mutated or promoted;
- module Area Create, Update, and Delete are implemented locally but remain
  natively uncertified as stated above. The complete nine-family GIT
  object/property persistence program is not complete.

### Paused implementation checkpoint - 2026-08-12 (after ground-item slice)

The user paused the program after the existing ground-item transform slice. No
next object-family implementation or live Toolset/NWN certification was
started. The program goal remains active and incomplete and must resume from
this checkpoint without recreating or discarding the retained dirty-worktree
changes.

The completed ground-item slice retained in the working tree is:

- the Aurora-first authority is frozen in
  `backend/docs/aurora-reverse/area-existing-item-transform-audit-v1-2026-08-12.md`;
- the primary decompiled reader/writer pair is `FUN_006077a8` /
  `FUN_00607ccc`, and read-only PE vtable inspection independently maps slots
  `+0x40` and `+0x3c` to that pair;
- native packed readback confirms that Area ground items use root list `List`,
  GFF struct type `0`, and exactly
  `XPosition/YPosition/ZPosition/XOrientation/YOrientation`; inventory
  `ItemList`, `Bearing`, item properties, identity changes, inventory mutation,
  and new-item construction are outside this slice;
- the frozen scene-to-native mapping is float32
  `XPosition=x*10`, `YPosition=y*10`, `ZPosition=z*10`,
  `XOrientation=cos(bearing)`, and `YOrientation=-sin(bearing)`;
- the shared planner and paired GIT/GIC writer now admit the `item` family,
  preserve exact GIC bytes and all non-transform GIT fields, reject ambiguous
  `Bearing`, and retain atomic candidate publication/readback behavior;
- the contract updates are retained in
  `backend/docs/aurora-reverse/area-update-materialization-contract-v1-2026-08-12.md`
  and the canonical FE/BE contract at
  `C:/Projects/ai-documentations/aurora-web/architecture/2026-05-21_fe-be-contract-v1.md`;
- planner, paired-writer, compiler, and atomic-publication suites pass `94/94`
  focused tests, and the backend production build passes;
- the focused mutation profile passes its hard `80%` threshold at `85.08%`
  across `650` mutants: `553` killed, `73` survived, `24` uncovered, and zero
  timeout/error. The planner score is `92.37%`, the writer score is `83.24%`,
  and the machine report is retained at
  `backend/reports/mutation/area-object-transform.json` with SHA-256
  `3335a8e34cef2a45738f244bddacfbf07b4314cd2afbfa06b871576e1479fcdf`;
- the previously surviving unsupported-family guard mutant is now killed by an
  exact fail-closed door regression. Machine inspection confirms all `23`
  guard mutants, all `19` writer family-admission mutants, all `15` shared
  orientation-vector mapping mutants, and all `5` item display-family mutants
  are killed.

Exact resume order:

1. completed - add a focused unsupported-source-family planner regression
   using door as the fail-closed fixture without changing production behavior;
2. completed - rerun the four focused suites, backend build, and
   `stryker.area-object-transform.config.json`; the unsupported-family guard
   mutant is killed and the exact new counts are retained above;
3. completed - append the final ground-item quality result here;
4. next - begin Aurora-first research for the next independently supportable family,
   likely sound, before adding any failing test or production admission;
5. keep generic door movement fail-closed until free-movement authority exists,
   and keep encounter/trigger polygon geometry in separate semantic audits.

Five existing-object transform families remain open: door, sound, store,
encounter, and trigger. New object construction, properties, polygons, scripts,
inventory, the known broader backend regression drift, tile eligibility and
rendering, `PathConnect`/WOK, the exhaustive 99-tileset matrix, and exact
Toolset Save/Build/reopen plus NWN certification all remain incomplete.

Resume on branch `codex/vfx-row216-aurora-first-20260812`. Do not stage, commit,
switch branches, clean, or bulk-revert the current working tree: it contains
unrelated user changes, and Area CUD/object-authoring work must remain isolated
from tile-rendering work.

### Paused implementation checkpoint - 2026-08-12 (after sound implementation)

The user paused the program immediately after the existing-sound transform
implementation and its first focused quality run. No store-family research,
additional production implementation, live Toolset/NWN certification, staging,
commit, branch switch, cleanup, or bulk revert was started. The program goal
remains active and incomplete.

The retained sound slice is:

- Aurora-first authority is documented in
  `backend/docs/aurora-reverse/area-existing-sound-transform-audit-v1-2026-08-12.md`;
- the primary decompiled loader/emitter lineage is rooted at
  `FUN_00567dcc`, `FUN_005685fc`, and `FUN_0056a030`; constructor
  `FUN_0063e77c` installs the class vtable, whose read-only PE slots map
  `+0x40` to reader `FUN_0063f24c` and `+0x3c` to writer `FUN_0063f57c`;
- native packed evidence confirms GIT/GIC `SoundList` struct type `6`, position
  fields `XPosition/YPosition/ZPosition`, and no native orientation member;
- the frozen scene-to-native mapping is float32
  `XPosition=x*10`, `YPosition=y*10`, and `ZPosition=z*10`;
- a sound position delta is materialized while any sound bearing delta fails
  closed; native `Bearing`, `XOrientation`, or `YOrientation` fields are also
  rejected as ambiguous rather than rewritten;
- the shared planner, paired GIT/GIC writer, update compiler, and atomic
  publication path now admit the position-only `sound` transform while
  preserving GIC bytes and non-transform GIT fields;
- the sound extension is retained in
  `backend/docs/aurora-reverse/area-update-materialization-contract-v1-2026-08-12.md`
  and in the canonical FE/BE contract at
  `C:/Projects/ai-documentations/aurora-web/architecture/2026-05-21_fe-be-contract-v1.md`;
- the four focused planner/writer/compiler/atomic-publication suites pass
  `102/102` tests, and the backend production build passes;
- the first post-sound focused mutation run passes the hard `80%` threshold at
  `85.87%` across `715` mutants: `614` killed, `77` survived, `24` uncovered,
  and zero timeout/error. The planner score is `94.67%` and the paired writer
  score is `83.54%`. The machine report is retained at
  `backend/reports/mutation/area-object-transform.json` with SHA-256
  `bb1635be04f76d419190b38125fc043034b9bf1d05270a4717fdb5faf8878e3c`.

The mutation threshold result is not yet the final sound-slice acceptance.
Execution stopped before classifying the surviving/uncovered mutants against
the critical sound guards, field mapping, ambiguous-orientation rejection, and
readback verification branches. Do not claim the sound slice closed until that
machine-report audit is complete and any material survivor has a targeted
regression followed by a focused test/build/mutation rerun.

Exact resume order:

1. inspect `backend/reports/mutation/area-object-transform.json` and classify
   all non-killed mutants touching the sound planner and paired writer;
2. add only evidence-backed targeted regressions for any critical survivor,
   then rerun the four focused suites, backend build, and
   `stryker.area-object-transform.config.json`;
3. append the final accepted sound mutation result and hash to this checkpoint;
4. begin read-only Aurora-first research for the next independently
   supportable family, expected to be store, before adding tests or production
   admission;
5. keep generic door movement fail-closed until free-movement authority exists,
   and keep encounter/trigger polygon geometry in separate semantic audits.

After sound acceptance, four existing-object transform families remain open:
door, store, encounter, and trigger. New object construction, properties,
polygons, scripts, inventory, the known broader backend regression drift, tile
eligibility and rendering, `PathConnect`/WOK, the exhaustive 99-tileset matrix,
and exact Toolset Save/Build/reopen plus NWN certification all remain
incomplete.

Resume on branch `codex/vfx-row216-aurora-first-20260812` and preserve the
current dirty worktree. The Area CUD/object-authoring lane must remain isolated
from unrelated user changes and from the tile-rendering lane.

### Resumed implementation checkpoint - 2026-08-13 (sound quality closure)

Execution resumed at the exact retained mutation-report audit. One material
sound guard gap was found: writer mutant `413` could replace the sound
`x/y/z` scene-value validation object with an empty object. Targeted component
regressions were added before accepting the slice.

The final bounded sound quality result is:

- the four focused planner/writer/compiler/atomic-publication suites pass
  `105/105` tests;
- the backend production build passes;
- the focused mutation profile passes at `86.01%` over `715` mutants:
  `615` killed, `76` survived, `24` uncovered, and zero timeout/error;
- planner score is `94.67%`; paired-writer score is `83.72%`;
- report path is `backend/reports/mutation/area-object-transform.json`,
  SHA-256
  `9ed84f6bb2a72875842f3cc9cce855482d0d979f9033a35caa4db0c269ac0ae8`;
- machine inspection confirms all `14/14` planner sound-branch mutants and all
  `58/58` mutants containing the explicit `sound` contract are killed;
- mutant `413` is now killed. The three surviving sound-map branch mutations
  (`563`, `565`, `566`) are behavior-equivalent under the admitted native
  profile because fallthrough writes the same position triple and native
  orientation fields are rejected before mapping;
- adjacent survivors belong to non-sound bearing validation, placeable
  ambiguity diagnostics, or orientation-vector family verification and remain
  separate visible hardening work.

The bounded existing-sound position transform is therefore offline-verified,
but product/native completion remains `missing`: no fresh application-produced
Toolset Save/Build/reopen or NWN evidence was created. The next implementation
action is Aurora-first research for the existing store family; no store test or
production admission may precede that authority.

### Continued implementation checkpoint - 2026-08-13 (store slice)

The existing-store transform slice was completed from Aurora-first authority,
not by extending the generic vector path speculatively. The retained audit is
`backend/docs/aurora-reverse/area-existing-store-transform-audit-v1-2026-08-13.md`.

The exact authority and implementation result are:

- `FUN_0056a1d4` owns paired `StoreList` traversal and struct type `11`;
- PE vtable `0x00c561b8` independently binds reader slot `+0x40` to
  `FUN_0064188c` and writer slot `+0x3c` to `FUN_00641ee0`;
- the native transform profile is exactly `XPosition`, `YPosition`,
  `ZPosition`, `XOrientation`, and `YOrientation`, with explicit `Bearing`
  rejected as ambiguous;
- packed and retained live evidence bind the profile to `Dye Store` /
  `x2_merc_dye`, struct type `11`, native vector `(0,1)`, and normalized
  bearing `270` degrees;
- scene coordinates serialize as float32 `x/y/z * 10`, and yaw radians as
  float32 `(cos(bearing), -sin(bearing))`;
- planner, paired writer, compiler, and atomic publication now admit only this
  bounded store transform, preserve concrete commerce/inventory fields, and
  retain exact GIC bytes for transform-only publication;
- the four focused suites pass `110/110`, and the backend production build
  passes;
- the focused mutation profile passes at `86.30%` over `730` mutants:
  `630` killed, `76` survived, `24` uncovered, and zero timeout/error;
- planner score is `94.84%`, paired-writer score is `84.00%`, and the report at
  `backend/reports/mutation/area-object-transform.json` has SHA-256
  `f1bdf98556f31c28f4ade87a68dea7cef02f2023ed59bffcc707bb5be50a5e75`;
- all `32/32` mutants containing the explicit `store` contract are killed; no
  newly introduced store mutant survived or lacked coverage.

The bounded store transform is offline-verified. Its fresh
application-candidate Toolset Save/Build/reopen and NWN proof remains
`missing`, as do store construction, properties, scripts, inventory authoring,
and runtime commerce behavior.

Three existing-object transform families remain open: door, encounter, and
trigger. Door movement remains fail-closed pending hook/free-placement
authority; encounter and trigger movement require polygon-specific
Aurora-first audits and must not be admitted through the point-transform path.
New object construction and properties, the broader regression drift, tile
eligibility/rendering, `PathConnect`/WOK, the 99-tileset matrix, and native
Toolset/NWN certification remain incomplete.

### Continued implementation checkpoint - 2026-08-13 (trigger position slice)

The bounded existing-trigger origin transform was completed from primary
Aurora authority and retained native evidence. The complete audit is
`backend/docs/aurora-reverse/area-existing-trigger-position-transform-audit-v1-2026-08-13.md`.

The admitted profile and quality result are:

- paired `TriggerList` traversal and native struct type `1` are bound to
  `FUN_0056a38c`; PE vtable `0x00c5c76c` independently binds reader
  `FUN_00657a88` and writer `FUN_00657de0`;
- only `XPosition`, `YPosition`, and `ZPosition` are changed. The complete
  type-`3` `Geometry` polygon plus `XOrientation`, `YOrientation`, and
  `ZOrientation` remain exact;
- a bearing delta and an explicit `Bearing` field fail closed. Rotation and
  vertex editing are not inferred from the retained all-zero native
  orientation vector;
- the planner, paired writer, compiler, and atomic transaction now admit the
  immutable-ordinal position-only transform with exact float32 `x/y/z * 10`
  mapping and byte-exact GIC retention;
- the four focused suites pass `130/130`, and the backend production build
  passes;
- the focused mutation profile passes at `87.14%` over `910` mutants:
  `793` killed, `89` survived, `28` uncovered, and zero timeout/error;
- planner score is `95.27%`, paired-writer score is `85.29%`, and the report at
  `backend/reports/mutation/area-object-transform.json` has SHA-256
  `c5e9e0281b5124b24a3fca5ad3b29a6b400a77d017fc692c7a94bcf415493549`;
- all `14/14` exact trigger-planner mutants and `15/15` exact trigger-mapping
  mutants are killed. Preservation-profile validation kills `75/78`; the
  three survivors remove redundant optional chaining after exact cardinality
  checks. Trigger readback defense branches remain explicitly visible and do
  not substitute for native proof.

The slice is offline-verified only. A fresh application-produced candidate
still requires Toolset Save/Build/reopen and NWN proof. Trigger construction,
polygon vertex editing, rotation, properties, scripts, links, and runtime
activation remain separate incomplete capabilities.

Two existing-object transform families remain open: door and encounter. Door
requires hook/free-placement authority, while encounter requires its own
polygon-specific Aurora-first audit. New object construction and properties,
the broader regression drift, tile eligibility/rendering, `PathConnect`/WOK,
the exhaustive 99-tileset matrix, and native Toolset/NWN certification remain
incomplete.

### Continued implementation checkpoint - 2026-08-13 (encounter position slice)

The bounded existing-encounter origin transform was completed from primary
Aurora authority, immutable PE lineage, a packed native fixture, retained live
placement evidence, and a read-only local-module boundary scan. The complete
audit is
`backend/docs/aurora-reverse/area-existing-encounter-position-transform-audit-v1-2026-08-13.md`.

The admitted profile and quality result are:

- paired `Encounter List` traversal and native struct type `7` are bound to
  `FUN_00569b30`; PE vtable `0x00c15634` independently binds reader
  `FUN_0055e1f8` and writer `FUN_0055e71c`;
- only `XPosition`, `YPosition`, and `ZPosition` change. The complete local
  type-`1` `Geometry` polygon and the empty type-`2` `SpawnPointList` remain
  exact;
- the read-only scan covered `176` packed modules and `4,529` GIT resources
  with zero extraction/parse errors and found no populated encounter spawn
  list. Populated lists therefore remain fail-closed rather than inferred;
- bearing deltas and native orientation aliases fail closed. Construction,
  rotation, vertex editing, spawn-point editing, properties, scripts, and
  runtime spawning are excluded;
- planner, paired writer, compiler, and atomic publication now support the
  immutable-ordinal position-only transform with exact float32 `x/y/z * 10`
  mapping and byte-exact GIC retention;
- the four focused suites pass `155/155`, and the backend production build
  passes;
- the focused mutation profile passes at `87.03%` over `1,010` mutants:
  `879` killed, `103` survived, `28` uncovered, and zero timeout/error;
- planner score is `95.63%`, paired-writer score is `85.13%`, and the report at
  `backend/reports/mutation/area-object-transform.json` has SHA-256
  `9700a9a1ea0d8fca7e9195b305c55fb5ac0c0617ce362fd5168c9b672010da46`;
- all `14/14` exact encounter-planner mutants and all `48/48` mutants in the
  current value-mapping region are killed. The three spawn/polygon validator
  survivors remove redundant optional chaining after exact cardinality
  guards; readback-defense survivors remain visible in the machine report.

The slice is offline-verified only. A fresh application-produced candidate
still requires Toolset Save/Build/reopen and NWN proof. Only door remains open
among bounded existing-object movement families, and generic door movement
continues to fail closed pending exact free-placement or hook-movement
authority.

The subsequent door policy audit is retained at
`backend/docs/aurora-reverse/area-existing-door-transform-policy-audit-v1-2026-08-13.md`.
It reproduces the door reader/writer lineage and accepted hook proof, then
closes generic movement as a verified non-admission: eight families have
bounded transforms, while doors require a distinct hash-bound hook command.
The frontend guardrails and backend planner rejection remain mandatory. This
closes the existing-object transform sub-lane without claiming door CRUD or
hook authoring complete. Focused policy gates pass `28/28` backend planner
tests and `43/43` frontend mutation-facade tests. The broader workspace smoke
run remains red at `12/44`: all `32` failures originate from the current
zero-object fixture drift, including absent `door_west_01` and
`plc_barrel_01`, and are retained as separate regression debt.

Stage 4 remains incomplete: new object construction, family properties,
trigger/encounter polygon authoring, scripts, merchant inventory, the broader
regression drift, tile eligibility/rendering, `PathConnect`/WOK, the exhaustive
99-tileset matrix, and native Toolset/NWN certification remain open.

### Continued implementation checkpoint - 2026-08-13 (exact base-UTW waypoint Create)

The first native new-object construction profile is now implemented. Its
Aurora authority, immutable resource identity, instance mapping, and
non-admissions are frozen in
`backend/docs/aurora-reverse/area-waypoint-construction-audit-v1-2026-08-13.md`.

The admitted capability is deliberately narrow:

- only scene family `waypoints` and source family `waypoint` are accepted;
- the source must be profile `nwn-base-key-utw-v1`, type `2058`, ResRef
  `nw_waypoint001`, root type `0xffffffff`, `UTW `/`V3.2`, and SHA-256
  `13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a`;
- the frontend emits and round-trips explicit binary-free
  `aurora_blueprint` provenance rather than treating a catalog ResRef as proof;
- the backend resolves the exact bytes from configured `nwn_base.key`, checks
  the digest and GFF profile, and constructs paired type-`5` GIT/GIC waypoint
  entries with the Aurora-derived defaults and `scene * 10`/yaw mapping;
- additions are append-only after survivor ordinals, bounded to `1024` per
  update and `100000` total scene objects, and reported through additive
  counts and blueprint provenance;
- arbitrary ResRefs, property overrides, map-note editing, variables, scripts,
  HAK/module/custom source precedence, and other object families fail closed.

The preflight gap found during this checkpoint is also closed. The
`update-validations` endpoint previously compiled only ARE and could therefore
return success before a GIT/GIC or UTW-source failure. It now invokes the same
read-only full compiler as materialization, validates exactly three
ARE/GIT/GIC candidates plus preserved IFO, cross-checks companion/mutation
summaries, and returns only binary-free hashes and sizes. It performs no write
or publication.

Final automated evidence for the slice is:

- production adapter readback: 1004 bytes and the frozen SHA-256, recorded in
  `backend/docs/aurora-reverse/evidence/area-waypoint-construction-2026-08-13/base-utw-production-adapter-readback.json`;
- backend production build: passed;
- focused compiler/writer/projector/adapter/preflight/atomic set: 6 suites,
  268 tests passed;
- complete Area Update regression: 14 suites, 200 tests passed;
- frontend profile/factory/draft set: 3 files, 27 tests passed;
- frontend production build: passed;
- waypoint construction mutation scope: 95.91% total, 96.52% covered; report
  SHA-256
  `65f584beab6193a263359b23d3ce871d82e44e6f65f29a563ef9ee4b5a0eebe6`;
- full-compiler validation preflight mutation scope: 167/167 killed, 100%;
  report SHA-256
  `582ead033900f3cd444fe2bb4b4af629c0fcf127454bad6423f6677e73c1ff4a`;
- frontend waypoint profile mutation scope: 8/8 killed, 100%; report SHA-256
  `0c8e11940efd76565af4a39ffe5ec64ac9067a3e39161896069abc294419afd1`.

The older broad validation mutation profile remains explicit program debt at
60.58% (`454` killed, `7` timed out, `253` survived, `47` uncovered; report
SHA-256
`9f3f6d6c3680de488b739337432bafc9d7d0a5b7de03406b83a1d415fee8dfa9`).
It must be raised before the global Area quality gate can be closed, even
though the new full-compiler preflight itself is at 100%.

Stage 4 remains incomplete. Waypoint Create is implemented offline, but fresh
application-produced Toolset Save/Build/reopen and NWN proof is reserved for
the final candidate. Create profiles for the other eight native object
families, object properties/scripts/inventories/polygons/hooks, the broader
workspace regression drift, transactional IFO evolution where required, tile
eligibility/rendering, `PathConnect`/WOK, the 99-tileset matrix, and final
native certification remain open.

### Continued implementation checkpoint - 2026-08-13 (exact base-UTS sound Create)

The second native new-object construction profile is implemented from primary
Aurora authority and exact retail bytes. The audit is
`backend/docs/aurora-reverse/area-sound-construction-audit-v1-2026-08-13.md`.

The admitted capability is deliberately narrow:

- only scene family `sounds` and source family `sound` are accepted;
- the source is profile `nwn-base-key-uts-animalcriesday-v1`, type `2035`,
  ResRef `animalcriesday`, root type `0xffffffff`, `UTS `/`V3.2`, and SHA-256
  `a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4`;
- the frontend emits the exact binary-free `aurora_blueprint` provenance and
  the backend resolves and verifies the immutable bytes from configured
  `nwn_base.key`;
- paired type-`6` GIT/GIC entries retain the proven UTS defaults, derive
  effective priority `20`, rewrite nested `Sounds` children to instance struct
  type `0`, add `GeneratedType = 0`, use exact `scene * 10` positions, and
  require zero bearing;
- sound and waypoint additions share the `1024`-object update budget and
  exact provenance receipts; existing ordinals, deletion, transforms, and
  atomic ARE/GIT/GIC publication remain unchanged;
- custom ResRefs, sound-list edits, property overrides, scripts, variables,
  nonzero bearing, HAK/module/custom blueprint precedence, and other profiles
  fail closed.

Final automated evidence for this slice is:

- production adapter readback: 1,105 bytes and the frozen SHA-256, retained in
  `backend/docs/aurora-reverse/evidence/area-sound-construction-2026-08-13/base-uts-production-adapter-readback.json`;
- complete Area Update regression: 14 suites, 211 tests passed;
- focused frontend profile/factory/local-draft tests: three files, 37 tests
  passed;
- backend and frontend production builds: passed;
- backend sound-construction mutation scope: 100%, with 333 killed, one
  detected timeout, zero survived, and zero uncovered; report SHA-256
  `ebd7cceba7964e047c2a549da6548d14ca6b5ae8e9ba83f8509f143d4d1053ec`;
- frontend sound-construction mutation scope: 16/16 killed, 100%; report
  SHA-256
  `382737ce1da62f1dda1a3bf0b84c88e2e4e037b1ff34c7961eaf5bba0d5622a`.

Stage 4 remains incomplete. Sound Create is offline-implemented, while its
fresh exact-candidate Toolset Save/Build/reopen and NWN proof remains reserved
for final certification. Seven native construction families, properties,
scripts, inventories, polygons and hooks, broader regression debt,
transactional IFO evolution where required, tile eligibility/rendering,
`PathConnect`/WOK, the 99-tileset matrix, and final native certification remain
open.

### Continued implementation checkpoint - 2026-08-13 (exact base-UTP placeable Create)

The third native new-object construction profile is implemented from primary
Aurora authority, the exact retail resource, and an independent packed-module
instance. The complete authority and mapping audit is
`backend/docs/aurora-reverse/area-placeable-construction-audit-v1-2026-08-13.md`.

The admitted capability is deliberately narrow:

- only scene family `placeables` and source family `placeable` are accepted;
- the source is profile `nwn-base-key-utp-plc-watertrough-v1`, type `2044`,
  ResRef `plc_watertrough`, root type `0xffffffff`, `UTP `/`V3.2`, and SHA-256
  `a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`;
- the frontend factory and local draft retain the exact binary-free
  `aurora_blueprint` provenance, while the backend production adapter resolves
  and verifies the immutable 1,771-byte resource from `nwn_base.key`;
- the writer validates the complete frozen UTP field profile and constructs
  paired type-`9` GIT/GIC entries, including native tag `WaterTrough`,
  `PortraitId=462`, default `BodyBag=0` and `Static=1`, no inventory list,
  exact `scene * 10` positions, bearing, and the paired editor comment;
- placeable, sound, and waypoint additions share the same `1024`-object update
  budget and append-only survivor ordering, with independent persisted
  readback and exact provenance receipts;
- arbitrary templates, property overrides, inventory, scripts, variables,
  visual transforms, custom source precedence, and other profiles fail closed.

Final automated evidence for this slice is:

- exact production-adapter readback retained at
  `backend/docs/aurora-reverse/evidence/area-placeable-construction-2026-08-13/base-utp-production-adapter-readback.json`;
- focused writer regression: 196 tests passed;
- complete Area Update regression: 14 suites, 213 tests passed;
- focused frontend profile/factory/local-draft set: three files, 38 tests
  passed;
- backend build, backend `tsc --noEmit`, and frontend production build: passed;
- backend placeable-construction mutation scope: 214/214 killed, 100%, with
  zero survived, timed out, uncovered, or errored; report SHA-256
  `e6f3cf9eb9e97949fc09a8f456f61607f348b60c3b1e9535ddd0b18a505c4f0f`;
- frontend placeable-profile mutation scope: 19/19 killed, 100%, with zero
  survived, timed out, or uncovered; report SHA-256
  `4814f67013cacc3d9265436bbbb74bc3cb297176f8744798f28825ddd5bd7cbc`.

Stage 4 remains incomplete. Placeable Create is implemented offline, while
fresh exact-candidate Toolset Save/Build/reopen and NWN proof remains reserved
for final certification. Six native construction families, properties,
scripts, inventories, polygons and hooks, broader regression debt,
transactional IFO evolution where required, tile eligibility/rendering,
`PathConnect`/WOK, the 99-tileset matrix, and final native certification remain
open.

### Continued implementation checkpoint - 2026-08-13 (exact base-UTI Ground Item Create)

The fourth native new-object construction profile is implemented from primary
Aurora authority, the exact retail resource, and an independent packed-module
instance. The complete authority and mapping audit is
`backend/docs/aurora-reverse/area-item-construction-audit-v1-2026-08-13.md`.

The admitted capability is deliberately narrow:

- only scene family `items` and source family `item` are accepted;
- the source is profile `nwn-base-key-uti-nw-cloth022-v1`, type `2025`,
  ResRef `nw_cloth022`, root type `0xffffffff`, `UTI `/`V3.2`, and SHA-256
  `606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6`;
- the frontend factory and local draft retain exact binary-free provenance,
  while the production adapter resolves and verifies the immutable 1,420-byte,
  40-field resource from `nwn_base.key`;
- the writer validates every frozen field, constructs paired type-`0` root
  `List` GIT/GIC entries, emits the native legacy-byte and extended-word armor
  pairs, preserves the empty `PropertiesList`, applies `scene * 10` position
  and orientation-vector math, and independently verifies the appended pair;
- all four construction families share the same `1024`-object budget,
  append-only survivor order, exact provenance receipts, and atomic snapshot
  publication;
- arbitrary templates, item properties, stacks, costs, identity, armor/color,
  inventory/equipment, variables, and custom sources fail closed.

Final automated evidence for this slice is:

- exact production-adapter readback retained at
  `backend/docs/aurora-reverse/evidence/area-item-construction-2026-08-13/base-uti-production-adapter-readback.json`;
- focused writer regression: 252 tests passed;
- complete Area Update regression: 14 suites, 226 tests passed;
- focused frontend profile/factory/local-draft set: three files, 40 tests
  passed;
- backend build and backend `tsc --noEmit`: passed;
- backend item-construction mutation scope: 281/281 killed, 100%, with zero
  survived, timed out, uncovered, or errored; report SHA-256
  `289e6d15a35c6bc691d940cdb412fc1b708a553e155a27a05036d460e3c6e5c6`;
- frontend item-profile mutation scope: 22/22 killed, 100%, with zero survived,
  timed out, or uncovered; report SHA-256
  `0ff22309c77defe3cf095de3361c0a974fd8494391814a347697ee1f87e76461`.

The repository-wide frontend production build initially failed on unrelated
dirty-tree VFX proof-loader work; a later same-day rerun passed. The item slice
did not claim that intervening fix. Stage 4 remains incomplete: five native construction families,
properties, scripts, inventories, polygons and hooks, transactional IFO
evolution where required, tile eligibility/rendering, `PathConnect`/WOK, the
99-tileset matrix, and exact Toolset/NWN certification remain open.

### Continued implementation checkpoint - 2026-08-13 (exact base-UTC Creature Create)

The fifth native new-object construction profile is implemented from the exact
retail `nw_chicken.UTC`, an immutable packed retail NWM instance, and the
accepted live Toolset creature-placement family proof. The complete authority,
corpus scan, mapping, and verification audit is
`backend/docs/aurora-reverse/area-creature-construction-audit-v1-2026-08-13.md`.

The admitted capability is deliberately narrow:

- only scene family `creatures` and source family `creature` are accepted;
- the source is profile `nwn-base-key-utc-nw-chicken-v1`, type `2027`, ResRef
  `nw_chicken`, root type `0xffffffff`, `UTC `/`V3.2`, 3,078 bytes, 63 fields,
  and SHA-256
  `c1b0e194bb08b3e3d2946025c1e2f950b91e4cb844a32ba3b744c51a1d822a4a`;
- the exact mapper emits a 70-field type-`4` GIT instance, a same-index type-`4`
  GIC comment, native orientation vectors, observed instance defaults,
  `MaxHitPoints 6 -> 4`, and the observed 20-to-28 skill-list expansion;
- empty equipment and all other source lists are preserved exactly;
- frontend provenance, production source resolution, paired serialization,
  receipt aggregation, atomic publication, and persisted readback are wired;
- arbitrary templates, properties, scripts, variables, conversations,
  statistics, inventory, equipment, and custom source tuples fail closed.

Final automated evidence for this slice is:

- production-adapter and packed-retail readbacks retained under
  `backend/docs/aurora-reverse/evidence/area-creature-construction-2026-08-13/`;
- focused backend regression: 5 suites, 409 tests passed;
- focused frontend profile/factory regression: 2 files, 33 tests passed;
- backend build: passed;
- frontend production build (`tsc -b && vite build`): passed;
- backend mutation scope: 292/292 killed, 100%, report SHA-256
  `a5f3301f5ce06ec9608f17add959da7bb2d33f0cb84870cf6bc377e30b7d23df`;
- frontend mutation scope: 25/25 killed, 100%, report SHA-256
  `26c4bc99ee215fdeb72518399216b076eb499060f193dc8433acd4bf2b806a84`.

Stage 4 remains incomplete: four native construction families, properties,
scripts, inventories/equipment, polygons and hooks,
transactional IFO evolution where required, tile eligibility/rendering,
`PathConnect`/WOK, the 99-tileset matrix, and final exact-candidate Toolset/NWN
certification remain open.

### Continued implementation checkpoint - 2026-08-13 (exact base-UTM Store Create)

The sixth native new-object construction profile is implemented from the exact
installed `x2_merc_dye.UTM`, its complete ordered closure of 55 installed UTI
resources, and accepted live Toolset standard `AUR-S01-06`. The complete
authority, mapping, and verification audit is
`backend/docs/aurora-reverse/area-store-construction-audit-v1-2026-08-13.md`.

The admitted capability is deliberately narrow:

- only scene family `stores` and source family `store` are accepted;
- the root source is profile `nwn-base-key-utm-x2-merc-dye-v1`, type `2051`,
  ResRef/Tag `x2_merc_dye`, root `0xffffffff`, `UTM `/`V3.2`, 6,004 bytes, 17
  fields, and SHA-256
  `99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2`;
- the dependency closure contains exactly 55 ordered type-`2025` UTI resources
  with identity-set SHA-256
  `301639573ddc3bcdbf894d3c0f39ae79aeb271f7ac1f72b75e45081c14f4e2df`;
- the mapper emits a 20-field type-`11` GIT store, a same-index type-`11` GIC
  comment, native orientation vectors, and 55 fully embedded item instances;
- normalized generated/native semantic readback converges at SHA-256
  `346bf0b9691619d216399803826a17d3541378264066dc56949298987b650177`;
- frontend provenance, backend dependency resolution, paired serialization,
  dependency-aware receipts, atomic publication, and persisted readback are
  wired;
- arbitrary templates, commerce properties, scripts, variables, and inventory
  editing fail closed.

Final automated evidence for this slice is:

- source and native Toolset readbacks retained under
  `backend/docs/aurora-reverse/evidence/area-store-construction-2026-08-13/`;
- focused backend regression: 5 suites, 488 tests passed;
- focused frontend profile/factory regression: 2 files, 34 tests passed;
- backend and frontend production builds: passed;
- backend mutation scope: 378/378 killed, 100%, report SHA-256
  `d28d9c785cd22ee2def14b19847f965242ae648de62d05a76b734e57aee51988`;
- frontend mutation scope: 28/28 killed, 100%, report SHA-256
  `6150d28db18d3ef4bbb5f0ec1a2a8eb1cfc6fb4dad93f7ec3b80b333d124fe24`.

Stage 4 remains incomplete: three native construction families, properties,
scripts, arbitrary inventory/equipment authoring, polygons and hooks,
transactional IFO evolution where required, tile eligibility/rendering,
`PathConnect`/WOK, the 99-tileset matrix, and final exact-candidate Toolset/NWN
certification remain open.

### Continued implementation checkpoint - 2026-08-13 (exact base-UTT Trigger Create)

The seventh native new-object construction profile is implemented from the
exact installed `newgeneric.UTT`, the recovered Toolset trigger reader/writer
mapping, and accepted live standard `AUR-S01-08`. The complete authority,
mapping, fixture-drift diagnosis, and verification audit is
`backend/docs/aurora-reverse/area-trigger-construction-audit-v1-2026-08-13.md`.

The admitted capability is deliberately narrow:

- only scene family `triggers` and source family `trigger` are accepted;
- the source is profile `nwn-base-key-utt-newgeneric-v1`, type `2032`, ResRef
  `newgeneric`, Tag `GenericTrigger`, root `0xffffffff`, `UTT `/`V3.2`, 1,025
  bytes, 28 ordered fields, and SHA-256
  `e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c`;
- the mapper emits a 34-field type-`1` GIT trigger, a same-index type-`1` GIC
  comment, float32 `scene * 10` origin, zero orientation, native instance
  defaults/conversions, and the exact accepted four-point type-`3` local
  polygon;
- bearing must be zero and the client cannot supply polygon bytes or vertices;
- frontend provenance, production source resolution, paired serialization,
  atomic publication, and persisted readback are wired;
- arbitrary templates, polygon editing, rotation, properties, scripts, links,
  variables, and runtime activation fail closed.

Final automated evidence for this slice is:

- source and native Toolset readbacks retained under
  `backend/docs/aurora-reverse/evidence/area-trigger-construction-2026-08-13/`;
- focused backend regression: 5 suites, 507 tests passed;
- atomic Area Update publication integration: 1 suite, 18 tests passed;
- focused frontend profile/factory/draft regression: 3 files, 44 tests passed;
- backend and frontend production builds: passed;
- backend mutation scope: 228/228 killed, 100%, report SHA-256
  `454e850d3a2ddf9016187e670701fe9cfd28a731b166d989f65316223afae311`;
- frontend mutation scope: 31/31 killed, 100%, report SHA-256
  `b8b0519bf3e8ddfdfac48919c45ea49d49f9af899e3520e76f8047ec2ddf4ee3`.

Stage 4 remains incomplete: two native construction families, arbitrary
properties/scripts/inventory/equipment and polygon/hook authoring,
transactional IFO evolution where required, tile eligibility/rendering,
`PathConnect`/WOK, the 99-tileset matrix, and final exact-candidate Toolset/NWN
certification remain open.

### Continued implementation checkpoint - 2026-08-13 (exact base-UTE Encounter Create)

The eighth native new-object construction profile is implemented from the
exact installed `x2_gnoll001.UTE`, recovered Toolset template/instance
readers and writers, the retained native type-`7` GIT/GIC differential, and
accepted live standard `AUR-S01-05`. The complete authority and verification
audit is
`backend/docs/aurora-reverse/area-encounter-construction-audit-v1-2026-08-13.md`.

The admitted capability is deliberately narrow:

- only scene family `encounters` and source family `encounter` are accepted;
- the source is profile `nwn-base-key-ute-x2-gnoll001-v1`, type `2040`, ResRef
  `x2_gnoll001`, Tag `X2_GNOLL001`, root `0xffffffff`, `UTE `/`V3.2`, 1,072
  bytes, 22 ordered fields, and SHA-256
  `f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed`;
- the mapper emits the exact 25-field type-`7` GIT encounter, a same-index
  empty type-`7` GIC entry, float32 `scene * 10` origin, the accepted
  four-point type-`1` local polygon, and an empty `SpawnPointList`;
- bearing must be zero and the client cannot supply polygon, spawn-point,
  creature-list, or binary source data;
- frontend provenance, production source resolution, paired serialization,
  atomic publication, and persisted readback are wired;
- arbitrary templates, polygon/spawn-point editing, properties, scripts,
  creature-list changes, variables, and runtime spawning fail closed.

Final automated evidence for this slice is:

- source and native Toolset readbacks retained under
  `backend/docs/aurora-reverse/evidence/area-encounter-construction-2026-08-13/`;
- focused backend regression: 5 suites, 510 tests passed;
- atomic Area Update publication integration: 1 suite, 19 tests passed;
- focused frontend profile/factory/draft regression: 3 files, 46 tests passed;
- backend and frontend production builds: passed;
- backend mutation scope: 247/247 covered mutants killed, 100%, report SHA-256
  `6e036d6e337691b523db6c4c4240d0205052938e93ddbe82cf523e760873bff2`;
- frontend mutation scope: 34/34 killed, 100%, report SHA-256
  `79cb426a17f615a1b179787bacc8c1f2eb448749889e6c687a183aeb5bbc70cd`.

Stage 4 remains incomplete: one native construction family, arbitrary
properties/scripts/inventory/equipment and polygon/hook authoring,
transactional IFO evolution where required, tile eligibility/rendering,
`PathConnect`/WOK, the 99-tileset matrix, and final exact-candidate Toolset/NWN
certification remain open.

### Continued implementation checkpoint - 2026-08-13 (exact tin01 Door hook Create)

The ninth bounded native new-object construction profile is implemented from
the exact installed `nw_door_ttr_04.UTD`, exact `tin01.set` hook, accepted
native Toolset type-`8` GIT/GIC instance, and recovered Toolset reader/writer
lineage. The complete authority and verification audit is
`backend/docs/aurora-reverse/area-door-hook-construction-audit-v1-2026-08-13.md`.

The admitted capability is deliberately narrow:

- only scene family `doors` and source family `door` are accepted;
- the source is profile `nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1`,
  type `2042`, ResRef `nw_door_ttr_04`, Tag `Barn1Door`, root `0xffffffff`,
  `UTD `/`V3.2`, 1,803 bytes, 51 ordered fields, and SHA-256
  `d7fc618b94e0b66c117d5e9d15dea3c0f34f5cc52810b50d146d7c73769406fa`;
- placement requires `tin01.set` SHA-256
  `e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4`,
  retained tile `121`, orientation `0`, height `0`, hook `0`, type `0`, local
  offset `(0,0.76,0)`, and orientation `180` degrees;
- the client supplies only a candidate point. The domain locates the retained
  tile/hook, derives scene `(col+0.5,row+0.576,0)` and bearing `pi`, rejects
  occupied hooks, and emits immutable provenance;
- the writer creates the exact type-`8` pair, native float32 position,
  `Bearing=-3.141592264175415`, ordered Toolset field projection, and GIC
  `Comment="Barn 1 Door"`;
- generic Door move, visual transform, copy, paste, duplicate, free placement,
  arbitrary template/property/script/transition edits, and every other hook
  fail closed.

Final automated evidence for this slice is:

- source/native/offline/browser records retained under
  `backend/docs/aurora-reverse/evidence/area-door-hook-construction-2026-08-13/`;
- focused backend regression and atomic publication: 5 suites, 262 tests
  passed;
- focused frontend profile/factory/port/input regression: 7 files, 95 tests
  passed;
- backend and frontend production builds: passed;
- backend mutation scope: 310/310 active mutants killed with zero survived,
  timed out, or uncovered, 100%, report SHA-256
  `2c688f3e16fd242b628e338ab45b2ff8253b9c84bb16ccad6e66a893d9c2d6a6`;
- frontend mutation scope: 265/265 active mutants killed with zero survived,
  timed out, or uncovered, 100%, report SHA-256
  `a543f3785d667fc106eaf33de31dc529b9db24a97aa1c97eb702d5a5c216a222`.

A fresh headed browser attempt reached Areas/Add Objects and exposed the Doors
family, but the host-local memory runtime had zero catalog templates and no
production Area. The recorded screenshot is a blocker artifact, not accepted
visual proof. It cannot close the exact-candidate browser or native gates.

All nine bounded native construction families are now offline-implemented.
Stage 4 remains incomplete: arbitrary family properties/scripts,
inventory/equipment authoring, trigger/encounter polygon and spawn editing,
Door transition/link editing and broader hook coverage, transactional IFO
evolution where required, tile eligibility/rendering, `PathConnect`/WOK, the
99-tileset matrix, and final exact-candidate browser/Toolset/NWN certification
remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable `OnUsed`)

The first bounded existing-object property/script-reference lane is now
offline-implemented. Its exact Aurora authority, prior accepted native lineage,
contract, fail-closed mutation policy, and verification boundary are frozen in
`backend/docs/aurora-reverse/area-existing-placeable-onused-script-audit-v1-2026-08-13.md`.

The admitted operation changes only `Placeable List[sourceIndex].OnUsed` on a
proven retained `aurora_git` placeable. The backend preserves empty versus
absent ResRefs, resolves immutable source ordinals, rejects stale/duplicate/
cross-family mutations, writes the exact native ResRef, preserves GIC bytes for
property-only publication, and independently verifies candidate readback. The
frontend retains immutable source provenance, enables only the proven `OnUsed`
slot, and applies through the scene viewport port/facade.

Final focused evidence is:

- backend focused regression: 6/6 suites and 563/563 tests passed;
- frontend focused regression: 4/4 files and 33/33 tests passed;
- Area Update integration: 1/1 suite and 20/20 tests passed;
- backend and frontend production builds: passed;
- backend mutation: 168/168 active mutants killed, 100%, report SHA-256
  `8d2148d4593db63da844a51f503a1e2e7f5d0dbf7dcec7d37794d63d4e725626`;
- frontend mutation: 56/56 active mutants killed, 100%, report SHA-256
  `9cbea36ee0beb2314a201be7c6a37f8d8abbc77c6194fe386d2b990b9419e098`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-onused-2026-08-17/offline-verification-summary.json`.

The full repository quality gate remains red and visible. Backend unit
regression passes 204/210 suites and 2674/2678 tests; frontend unit reports 118
failures; frontend regression smoke passes 1/10 files and 20/78 tests. The
observed failures are existing dirty-worktree fixture/contract drift outside
the bounded `placeableMetadata`/`OnUsed` path. They still must be resolved before
the Area program can close. Fresh exact-candidate Toolset Save/Build/reopen and
NWN runtime certification also remain pending.

The next Stage 4 work remains property/script/reference, inventory/equipment,
polygon/spawn, and Door transition/link coverage. Each new native field or
behavior must pass its own Aurora-first audit before admission.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable `Static` / `Useable`)

The next bounded existing-object property lane is offline-implemented. Exact
Aurora reader/writer lineage, accepted native profiles, independent-byte
semantics, exclusions, and proof boundaries are frozen in
`backend/docs/aurora-reverse/area-existing-placeable-static-useable-audit-v1-2026-08-17.md`.

The admitted operation changes only explicit, changed
`Placeable List[sourceIndex].Static` and/or `.Useable` byte fields on a retained
`aurora_git` placeable. It may be combined with the separately admitted
`OnUsed` mutation. The writer requires exactly one native `Byte` per selected
field, accepts only `0`/`1`, checks retained provenance, preserves the remaining
GIT struct and all GIC bytes, and independently verifies readback. It does not
force `Static = !Useable` when both fields are present.

The frontend retains presence-sensitive immutable provenance, exposes only the
two proven flags for exact existing placeables, and keeps `Plot` and
`HasInventory` disabled/preserve-only. Programmatic changes without exact
provenance cannot become backend mutations.

Final focused evidence is:

- backend focused regression: 6/6 suites and 634/634 tests passed;
- frontend focused regression: 4/4 files and 28/28 tests passed;
- Area Update integration: 1/1 suite and 20/20 tests passed;
- backend and frontend production builds: passed;
- backend mutation: 293/293 active mutants killed, 100%, report SHA-256
  `eba8713ddc3ccf19a3deac9e951df8b374bd2c737f21f4faf74cc0851d05bae3`;
- frontend mutation: 72/72 active mutants killed, 100%, report SHA-256
  `8356fdfe8571d22b2b84a491be897499d7eaf2506cf244bbec308fc0d5d857b3`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-static-useable-2026-08-17/offline-verification-summary.json`.

This does not close Stage 4. `Plot`, `HasInventory`/`ItemList`, the remaining
property/script/reference families, inventory/equipment, polygon/spawn, Door
transition/link coverage, global regressions, and fresh exact-candidate
Toolset/NWN certification remain open.

### Continued implementation checkpoint - 2026-08-17 (remaining existing Placeable script ResRefs)

The twelve remaining script slots exposed by the existing Placeable Scripts UI
are now offline-implemented as exact, provenance-bound GIT storage mutations.
The admitted mapping, primary Aurora reader/writer lineage, GPL boundary,
exclusions, and proof limits are frozen in
`backend/docs/aurora-reverse/area-existing-placeable-script-resrefs-audit-v1-2026-08-17.md`.

The slice covers `OnClick`, `OnClosed`, `OnDamaged`, `OnDeath`, `OnHeartbeat`,
`OnInvDisturbed`, `OnLock`, `OnMeleeAttacked`, `OnOpen`, `OnSpellCastAt`,
`OnUnlock`, and `OnUserDefined`. Empty ResRefs remain explicit provenance;
absent or wrongly typed source fields remain preserve-only. The frontend uses
one shared provenance guard for dialog enablement and Apply-time restoration.
The backend projects only changed pairs in frozen order, resolves the immutable
placeable ordinal, rejects invalid/stale/duplicate inputs, requires one exact
native ResRef per field, preserves GIC bytes, and verifies the complete
candidate struct.

Final focused evidence is:

- backend focused regression: 5/5 suites and 655/655 tests passed;
- frontend focused regression: 3/3 files and 27/27 tests passed;
- Area Update integration: 1/1 suite and 20/20 tests passed;
- backend and frontend production builds passed;
- backend mutation: 202/202 active mutants killed with zero survived, timed
  out, or uncovered, 100%, report SHA-256
  `ccd0c5ce1504a221129ad0f6667f6fe93049f1b19d50ce04d064610d01e9a9ee`;
- frontend mutation: 96/96 active mutants killed with zero survived, timed out,
  or uncovered, 100%, report SHA-256
  `8e04b94f5872f071bab0775555aff6170348ce162b12f08597b8215842deb18e`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-script-resrefs-2026-08-17/offline-verification-summary.json`.

This proves storage mutation, not event-specific NWN dispatch. `OnDisarm` and
`OnTrapTriggered` remain in the trap workflow, `OnFailToOpen` remains excluded,
and fresh exact-candidate Toolset Save/Build/reopen plus any claimed event
runtime behavior remain pending. Stage 4 and the Level 4 program therefore
remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable trap script ResRefs)

The bounded trap-script storage lane is now offline-implemented for exact,
proven existing Placeable instances. Primary Aurora reader/writer lineage, the
two-field mapping, exclusions, fail-closed mutation policy, and proof boundary
are frozen in
`backend/docs/aurora-reverse/area-existing-placeable-trap-script-resrefs-audit-v1-2026-08-17.md`.

The slice covers only native `OnDisarm` and `OnTrapTriggered` ResRefs. Empty
values remain explicit provenance; absent or wrongly typed fields remain
preserve-only. The dialog admits only exact proven script fields, while Apply
restores every other trap value. The backend projects only changed pairs,
resolves immutable ordinals, rejects invalid/stale/duplicate inputs, mutates
one exact native ResRef per field, preserves every GIC byte, and verifies the
complete candidate struct. An end-to-end candidate-compiler test confirms both
native fields in the produced GIT.

Final focused evidence is:

- backend focused regression: 5/5 suites and 697/697 tests passed;
- frontend focused regression: 4/4 files and 35/35 tests passed;
- Area Update integration: 1/1 suite and 20/20 tests passed;
- backend and frontend production builds passed;
- backend mutation: 214/214 active mutants killed with zero survived, timed
  out, or uncovered, 100%, report SHA-256
  `223d8e980bf8020640eb3d3771452d5ec4ef1e1142ccec6d9415aef6625af098`;
- frontend mutation: 81/81 active mutants killed with zero survived, timed out,
  or uncovered, 100%, report SHA-256
  `499555c17798901cb079dcab6c9a7e5f2f2b1771e529c92f27709a38c857cc3d`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-trap-script-resrefs-2026-08-17/offline-verification-summary.json`.

This proves native storage mutation only. Non-script trap fields, event-specific
NWN dispatch, fresh exact-candidate Toolset Save/Build/reopen, global
regressions, Stage 4, and the Level 4 program remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable `Plot` / `HasInventory`)

The bounded native boolean storage lane is now offline-implemented for exact,
proven existing Placeable instances. Primary Aurora reader/writer lineage,
field identity/type, presence-sensitive provenance, exclusions, fail-closed
mutation policy, and the proof boundary are frozen in
`backend/docs/aurora-reverse/area-existing-placeable-plot-has-inventory-audit-v1-2026-08-17.md`.

The slice covers only the native `Plot` and `HasInventory` byte fields.
Explicit `false` remains writable provenance; absent or wrongly typed values
remain preserve-only. The frontend enables only exact proven controls and
restores unproven values before Apply. The backend projects changed complete
pairs, resolves immutable Placeable ordinals, rejects invalid, stale, partial,
duplicate, or ambiguous inputs, mutates exact native `Byte` values, preserves
every GIC byte, and verifies the complete candidate struct. `HasInventory`
does not create, remove, or alter `ItemList` entries.

Verification completed on 2026-08-17:

- backend focused verification passed 5/5 suites and 738/738 tests;
- frontend focused verification passed 3/3 files and 35/35 tests;
- Area Update atomic integration passed 1/1 suite and 20/20 tests;
- backend and frontend production builds passed; the frontend emitted only the
  existing Vite chunk-size warning;
- backend mutation: 132/132 active mutants killed with zero survived, timed
  out, or uncovered, 100%, report SHA-256
  `fbf1f462bc7359f64d03d6801049c6cec48f2e618d8d600f32e676d304a17c07`;
- frontend mutation: 47/47 active mutants killed with zero survived, timed out,
  or uncovered, 100%, report SHA-256
  `5d387e2caa42f3f1be9431941fdba0c0363898ad1aee19872a24dd4c1250b897`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-plot-has-inventory-2026-08-17/offline-verification-summary.json`.

This proves native storage mutation only. `ItemList` authoring, fresh
exact-candidate Toolset Save/Build/reopen, global regressions, Stage 4, and the
Level 4 program remain open. No NWN runtime behavior claim is made for either
flag.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable lock `Byte` fields)

The bounded native lock-storage lane is now offline-implemented for exact,
proven existing Placeable instances. Primary Aurora reader/writer lineage,
field identities and types, Toolset labels, retail profile, presence-sensitive
provenance, exclusions, fail-closed mutation policy, and the proof boundary are
frozen in
`backend/docs/aurora-reverse/area-existing-placeable-lock-byte-fields-audit-v1-2026-08-17.md`.

The slice covers `Locked`, `Lockable`, `AutoRemoveKey`, `KeyRequired`,
`OpenLockDC`, and `CloseLockDC`. Boolean values are exact native `Byte` values;
the two DCs admit only integers in `0..255`. The frontend exposes only fields
with exact retained GIT provenance and restores every unproven value before
Apply. The backend projects changed complete pairs in frozen order, resolves
one immutable Placeable ordinal, rejects malformed, duplicate, out-of-order,
stale, unchanged, or ambiguous inputs, mutates exact native bytes, preserves
every GIC byte, and verifies the complete candidate struct. `KeyName` and
runtime lock behavior remain outside this lane.

Verification completed on 2026-08-17:

- backend focused verification passed 5/5 suites and 790/790 tests;
- frontend focused verification passed 4/4 files and 50/50 tests;
- Area Update atomic integration passed 1/1 suite and 20/20 tests;
- backend and frontend production builds passed; the frontend emitted only the
  existing Vite chunk-size warning;
- backend mutation: 351/351 active mutants killed with zero survived, timed
  out, or uncovered, 100%, report SHA-256
  `58d2719ad94c9da961e5abdff7c59d33c1833f5afd7497e97facc5574f11c53f`;
- frontend mutation: 122/122 active mutants killed with zero survived, timed
  out, or uncovered, 100%, report SHA-256
  `162e64da377578ec3a53bff58e3fc1ff012f3f23631e86d17db37f7bdd1b804b`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-lock-byte-fields-2026-08-17/offline-verification-summary.json`.

This proves native storage mutation only. Fresh exact-candidate Toolset
Save/Build/reopen, event/runtime behavior, global regressions, Stage 4, and the
Level 4 program remain open. No NWN runtime lock behavior claim is made.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable `KeyName`)

The remaining bounded field in the Placeable Lock UI is now
offline-implemented as an exact, provenance-bound native `KeyName`
`CExoString` mutation. Primary reader/writer lineage, the Toolset `Key Tag`
control and 32-character input limit, the immutable retail profile, the
presence-sensitive contract, exclusions, fail-closed policy, and proof
boundary are frozen in
`backend/docs/aurora-reverse/area-existing-placeable-key-name-audit-v1-2026-08-17.md`.

Empty `KeyName` remains explicit provenance and is distinct from absence.
Values are not trimmed, case-folded, normalized, or truncated. The frontend
admits only exact source provenance and restores unproven values before Apply.
The backend projects one changed pair, resolves the immutable Placeable
ordinal, rejects malformed, stale, unchanged, missing, duplicate, or wrongly
typed input/native state, mutates only `KeyName`, preserves every GIC byte, and
verifies the complete candidate struct.

Verification completed on 2026-08-17:

- backend focused verification passed 5/5 suites and 826/826 tests;
- frontend focused verification passed 4/4 files and 51/51 tests;
- Area Update atomic integration passed 1/1 suite and 20/20 tests;
- backend and frontend production builds passed; the frontend emitted only the
  existing Vite chunk-size warning;
- backend mutation: 259/259 active mutants killed with zero survived, timed
  out, or uncovered, 100%, report SHA-256
  `24b14acd635d910395d5ccd24173ea52acc3933eac30ddbd74fac811523923b0`;
- frontend mutation: 54/54 active mutants killed with zero survived, timed out,
  or uncovered, 100%, report SHA-256
  `a34e2b261f7758ae3cff3c3f249d3f8c51c3866ff05df00e1d131d06ca988ad9`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-key-name-2026-08-17/offline-verification-summary.json`.

The global gates remain red and explicit: backend is 219/220 suites and
3025/3026 tests because the separate new-Area cold-reopen profile rejects 37
missing required ARE fields; frontend is 208/224 files and 2138/2249 tests.
Those failures, fresh exact-candidate Toolset Save/Build/reopen, any claimed
NWN key behavior, Stage 4, and the Level 4 program remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable `ItemList`)

The bounded existing-Placeable inventory lane is offline-implemented for an
ordered native mode-2 `ItemList`. Retained entries preserve immutable source
ordinals and clone their complete embedded UTI structs. New entries are
restricted to the independently admitted immutable `nw_cloth022` blueprint
profile. Repository coordinates are exact native `Word` values in `0..65535`,
and one mutation is capped at 1,024 entries.

The frontend keeps ordered, read-only retained identity while allowing
coordinate edits, removal, reordering, and the admitted new-item operation.
`HasInventory` remains independent and cannot implicitly create, remove, or
rewrite inventory entries. Backend projection, planning, compilation, and the
pair writer require exact keys and ordinals, reject stale or ambiguous input,
write the complete embedded item structs, preserve GIC bytes, and verify the
whole candidate struct.

Verification completed on 2026-08-17:

- backend integrated focused verification passed 5/5 suites and 1,136/1,136
  tests;
- frontend focused verification passed 5/5 files and 71/71 tests;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- backend mutation: 488/488 active mutants killed, 100%, report SHA-256
  `9e97d364a1308d16ee38841f79ecde69bb63af46ed39fb4e0d4d6a9e633b59ba`;
- frontend mutation: 196/196 active mutants killed, 100%, report SHA-256
  `493ecdaebfe29f780329031a799811736c7aca21657c3c0fd973a0e3c48e8f6c`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-item-list-2026-08-17/offline-verification-summary.json`.

Arbitrary UTI authoring, equipment, random inventory, runtime inventory
behaviour, fresh Toolset Save/Build/reopen, Stage 4, and Level 4 remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable durability/save bytes)

The presence-sensitive native `Hardness`, `Fort`, `Ref`, and `Will` byte lane
is offline-implemented. Every field is independently admitted only when the
exact retained GIT Placeable carries one native `Byte` in `0..255`. Projection
emits changed pairs in native order; planning and writing reject partial,
unknown, duplicate, reordered, stale, unchanged, wrong-type, out-of-range, or
cross-family mutations. The complete remaining GIT struct and all GIC bytes
are preserved and independently read back.

The frontend exposes only proven fields and keeps invalid, absent, or
unproven values preserve-only across Apply, clone, cancel, and undo. Hit Points
remains disabled because the Toolset `HP`/`CurrentHP` scaling and boundary
semantics are not source-closed.

Verification completed on 2026-08-17:

- backend integrated focused verification passed 5/5 suites and 1,136/1,136
  tests;
- frontend focused verification passed 5/5 files and 63/63 tests;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- backend mutation: 230/230 active mutants killed, 100%, report SHA-256
  `29f776cf6aed3b87b21c08671b6dc309501a82dd394651cf3615568ff0c792d5`;
- frontend mutation: 69/69 active mutants killed, 100%, report SHA-256
  `4cb3bdd87933c1c9a8e4e6c603e72785a6faa256f2c287161e6e914833b34ec4`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-durability-save-bytes-2026-08-17/offline-verification-summary.json`.

This proves native storage only. Hit Points, fresh Toolset/NWN certification,
global regressions, Stage 4, and Level 4 remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable conversation/interruptable)

The native `Conversation` ResRef and `Interruptable` byte lane is
offline-implemented with exact empty-versus-absent provenance. The frontend
maps the native polarity as `Interruptable = noInterrupt ? 0 : 1`; both
controls remain independently editable only for exact proven fields. Invalid
or unproven drafts fail closed and cannot materialize absent source fields.

The backend requires complete exact mutation pairs, one native ResRef or Byte,
and an unchanged optimistic source value. It rejects invalid, stale,
duplicate, incomplete, unknown-key, cross-family, or deletion-colliding input,
mutates only the selected field, preserves GIC bytes, and verifies the whole
candidate struct.

Verification completed on 2026-08-17:

- backend focused verification passed 6/6 suites and 1,140/1,140 tests;
- frontend focused verification passed 5/5 files and 66/66 tests;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- backend mutation: 339/339 active mutants killed, 100%, report SHA-256
  `34b24c3e9082a4c24d87e4d5a8e99ea0a207b183c4ab1f03880d857fe56d52f4`;
- frontend mutation: 81/81 active mutants killed, 100%, report SHA-256
  `4c5b517d67beee085399ca5785c5f47a46932b6748bcd26a7f2e24d5d84e3dd6`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-conversation-interruptable-2026-08-17/offline-verification-summary.json`.

Dialog-resource/graph authoring, runtime conversation and interruption
behaviour, fresh Toolset/NWN certification, Stage 4, and Level 4 remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable trap bytes)

The six independent native trap-byte fields `TrapFlag`, `TrapDetectable`,
`TrapDisarmable`, `TrapOneShot`, `TrapDetectDC`, and `DisarmDC` are
offline-implemented. The four flags accept only `0`/`1`; both DC fields accept
safe integers in `0..255`. Presence is independent per field, so the frontend
does not infer one field from another and does not require `TrapFlag` to expose
a separately proven detection DC.

Backend pairs are exact, complete, unique, and native-ordered. Planning and
writing reject malformed, partial, unknown, reordered, stale, unchanged,
wrong-type, out-of-range, cross-family, and deletion-colliding mutations. The
writer changes exactly one native Byte per admitted pair, preserves GIC bytes,
and verifies the complete candidate struct. `TrapType`, `setDc`, rogue
modifiers, palette mapping, and runtime behaviour remain preserve-only.

Verification completed on 2026-08-17:

- backend focused verification passed 6/6 suites and 1,132/1,132 tests;
- frontend focused verification passed 5/5 files and 65/65 tests;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- backend mutation: 244/244 active mutants killed, 100%, report SHA-256
  `d2fef3457b6bd65ab80ccc45d8543eee1bb8adfed98f76d41f2617506f1be467`;
- frontend mutation: 94/94 active mutants killed, 100%, report SHA-256
  `545e92dccd6cdc9214613e132bc2304eeb71f4804b2a5d877b9ec072b3e1f66f`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-trap-byte-fields-2026-08-17/offline-verification-summary.json`.

This proves native storage only. Trap event/damage behaviour, fresh
Toolset/NWN certification, global regressions, Stage 4, and Level 4 remain
open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable `AnimationState`)

The native `AnimationState : Byte` lane is offline-implemented with the exact
placed-Placeable Toolset `Open State` mapping: `0 -> Closed`, `1 -> Opened 1`,
and `2 -> Opened 2`. Area detail and frontend source provenance are
presence-sensitive; absent, wrongly typed, or out-of-set values remain
preserve-only and never materialize `initialState` merely because another
Advanced field exists.

The frontend admits only exact retained `aurora_git` Placeables, offers exactly
the three verified options, and composes AnimationState independently with the
Conversation/Interruptable materializer. Template ResRef, faction, Portrait,
and Treasure Model are visibly disabled and preserve-only. Backend projection,
planning, writing, and readback require a complete changed pair, one exact
native Byte, immutable ordinal provenance, and the closed set `{0,1,2}`. The
complete remaining GIT struct and all GIC bytes are preserved.

Verification completed on 2026-08-17:

- backend integrated focused verification passed 5/5 suites and 1,180/1,180
  tests;
- frontend focused verification passed 7/7 files and 92/92 tests;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- backend mutation: 173/173 active mutants killed, 100%, report SHA-256
  `a601de6757d225280a52601c98f2f5b9f4254776dcef4a85be8885d2b2310459`;
- frontend mutation: 58/58 active mutants killed, 100%, report SHA-256
  `46fb9f8950128dbd066ec6ba5d58c3bffe84c034533396e87246b746a1fb52a9`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-animation-state-2026-08-17/offline-verification-summary.json`.

This proves native storage and editor mapping, not animation playback.
Fresh Toolset/NWN certification, global regressions, Stage 4, and Level 4
remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable editor `Comments`)

The placed-Placeable editor Comments lane is offline-implemented against the
paired Area GIT/GIC resources. `Comments : CExoString` is presence-sensitive;
empty is valid and distinct from absence. The product admits 0..4096 ECMAScript
code units, rejects U+0000, and never trims, normalizes, case-folds, or
truncates the value.

The backend parses exact same-ordinal GIT/GIC Placeables, fingerprints the
paired identity, carries the immutable GIC digest through copy-on-open, emits
only a complete changed expected/target pair, and reparses both resources at
planning time. Comment mutation preserves the complete GIT and all unrelated
GIC fields. GIT-only mutations preserve parsable noncanonical GIC bytes
exactly. Stale values/digests, malformed pairs, deletion collisions,
cross-family requests, and readback drift fail closed. The frontend enables
Comments only for exact retained provenance, preserves Description
independently, and never materializes an absent Comments field.

Verification completed on 2026-08-17:

- backend integrated focused verification passed 7/7 suites and 1,272/1,272
  tests;
- frontend focused verification passed 7/7 files and 87/87 tests;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- backend mutation detected 395/395 active mutants (393 killed, 2 timed out),
  with zero survived or uncovered, 100%, report SHA-256
  `f4ae0c1b4e727d66c5758829b8c789914dd0ff696523cfb2405b162672d65c92`;
- frontend mutation killed 44/44 active mutants with zero survived or
  uncovered, 100%, report SHA-256
  `da18758b6d00bd48e514547dd573d52754a538382169e5df3c260cea15e36cf7`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-editor-comments-2026-08-17/offline-verification-summary.json`.

This proves paired GIT/GIC storage and editor provenance only. Fresh
Toolset Save/Build/reopen, NWN runtime certification, global regressions,
Stage 4, and Level 4 remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable Basic Identity preservation)

The Basic Identity Aurora audit closed the native distinction between the
full localized `LocName`, instance `Tag : CExoString`, separate
`TemplateResRef : ResRef`, and numeric `Appearance : DWord`. Appearance is the
physical row ordinal in the exact effective `placeables.2da`; it is never a
Template ResRef, model ResRef, label, or display name.

The frontend now enforces the currently authorized preserve-only boundary.
Retained `aurora_git` Name, Tag, and Template ResRef controls are disabled and
defended again by the reducer and Apply materializer. The former
`Appearance Type -> draft.resRef` binding is removed: Template ResRef has its
own correctly labelled control, while Appearance Type is read-only and
displays only an exact unsigned DWord source value. Local seed editing remains
separate and unchanged.

Verification completed on 2026-08-17:

- focused frontend verification passed 2/2 files and 60/60 tests;
- the frontend production build passed with only the existing chunk-size
  warning and transformed 296 modules;
- frontend mutation killed 30/30 active mutants with zero survived, timed out,
  or uncovered, 100%, report SHA-256
  `677b97f43c5673fcd30161317773d74694d906787cf574591d91c6e39ce95d4c`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-basic-identity-preservation-2026-08-17/offline-verification-summary.json`.

This fixes the unsafe editor binding but does not complete Basic Identity
CRUD. Lossless LocName provenance, Tag identity decoupling, exact effective
`placeables.2da` digest/rows, Appearance changed-pair writing/readback, and
fresh Toolset/NWN certification remain open.

### Continued implementation checkpoint - 2026-08-17 (existing Placeable Basic Identity storage provenance)

The first additive Basic Identity source boundary is now implemented without
activating a writer. Retained type-`9` GIT Placeables expose exact,
presence-sensitive `Tag : CExoString` and `Appearance : DWord|Byte` storage
states. Empty Tag, absent Tag, canonical DWord, legacy Byte, and absent
Appearance remain distinct. Duplicate fields, noncanonical labels, wrong
types, malformed values, wrong struct families, and cross-family objects fail
closed by omitting the complete provenance property.

The structure crosses the module snapshot repository, Area HTTP contract,
frontend exact-key validator, mapper, source snapshot clone, and read-only
Basic dialog. The process-cache fingerprint includes native type provenance.
The UI no longer trusts the older lossy `appearanceType` alias: it displays
only a present canonical DWord and leaves legacy Byte preserve-only.

Verification completed on 2026-08-17:

- focused backend verification passed 2/2 files and 45/45 tests;
- focused frontend verification passed 5/5 files and 127/127 tests;
- the backend production build passed after this slice's production changes;
  a later final rerun was blocked by an unrelated untracked VFX fixture
  TS2322 created outside this scope;
- the final frontend production build passed, transformed 297 modules, and
  retained only the existing chunk-size warning;
- backend mutation killed 52/52 active mutants with zero survived, timed out,
  or uncovered, 100%, report SHA-256
  `dba567514eeeb14feb7623fe77706ab08614ddbeaeee4c70f792fe064fc41f51`;
- frontend mutation killed 96/96 active mutants with zero survived, timed out,
  or uncovered, 100%, report SHA-256
  `bd2ceee7f7e35b8103f5ff934350590258147ff7a137c43bf6a2974850151b94`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-basic-identity-provenance-2026-08-17/offline-verification-summary.json`.

This closes read-only native storage provenance only. The exact effective
`placeables.2da` digest and row descriptor, immutable Tag-independent object
identity, lossless LocName, mutation pairs, writer/readback, and fresh
Toolset/NWN certification remain open.

The current shared-tree backend build is additionally blocked by the unrelated
untracked `backend/scripts/create-vfx-nwn-web-row28-fixture.ts`, whose
`selectedCandidate.sourceLayer` is widened to `string`. This does not regress
the focused Basic Identity tests or mutation reports and is not silently
counted as a green final whole-backend build.

### Continued implementation checkpoint - 2026-08-17 (Area Placeable payload revalidation and cache recovery)

A backend restart invalidates the host-local in-memory Placeable processing
cache while an already-open frontend can still retain cache URLs. The prior
Area-open queue could publish that stale payload before its later authoritative
batch replay, allowing transient `PLACEABLE_CACHE_NOT_FOUND` asset requests
even when the final renderer reached all-ready state.

Each Area selection now advances a validation generation. Queue signatures
are scoped by Area, generation, and ordered lookup keys; stale index/object
aliases are removed atomically from cached, pending, and published stores; and
the renderer receives only payloads validated in the current generation. A
copy-on-open integration test proves that reopening the same Area publishes no
old payload while the authoritative batch is pending, then publishes only the
new cache key.

The recovery lane is now exact and bounded. Only an own-property
`PLACEABLE_CACHE_NOT_FOUND` enters recovery. Single resolution performs at most
one authoritative reprocess; renderer model/texture delivery stops same-URL
retry after an exact binary cache miss; one event per runtime and backend cache
key evicts all aliases and advances the validation generation. Other 404s,
non-404 responses, malformed JSON, inherited codes, and superseded cache keys
remain outside recovery. The guarded CDP harness separately classifies single
payload, single contracts, and binary asset-delivery requests, so an active 4xx
in those groups blocks proof.

Verification completed on 2026-08-17:

- focused frontend verification passed 4/4 files and 127/127 tests;
- the frontend production build passed with only the existing chunk-size
  warning and transformed 295 modules;
- proof-harness syntax checks and the safety-contract test passed;
- frontend mutation killed 97/97 active mutants with zero survived, timed out,
  or uncovered, 100%, report SHA-256
  `1275d84962d536637e9cbc4060d15a4aa4db7d2f4c5bb45ea32c996b51dd60aa`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-placeable-cache-recovery-2026-08-17/offline-verification-summary.json`.

This closes the offline stale-publication and exact recovery contracts, not the
full runtime-proof gate. A clean restart smoke with an unchanged browser and a
fresh exact saved proof artifact remain open. The broader contract gate and
global frontend regression also retain independently catalogued legacy
failures; release readiness is not claimed.

## 3. Non-negotiable definition of a correct tile

A tile is correct only when all applicable dimensions below are independently
`verified`. Passing one dimension cannot imply another.

| Dimension | Required proof |
| --- | --- |
| Identity | SET name, tile index, `Tile_ID`, model ResRef, tileset/profile, orientation, and source hashes are exact |
| Resource lineage | Winning module/base/ordered-HAK source is recorded; no unresolved conflict or accidental fallback exists |
| Asset closure | Model, materials, textures, animation dependencies, and WOK resources resolve completely |
| Geometry | Meshes, node hierarchy, pivots, scale, handedness, orientation, height, and bounding volume match the verified contract |
| Materials | Texture slots, MTR behavior, alpha, two-sided state, water, emissive state, and animation are correct where applicable |
| Environment | Area lighting, fog, day/night, weather, shadows, and editor/runtime visibility rules are applied from the proper source |
| Visual seam | Adjacent visible surfaces meet without unexplained gaps, overlap, cracks, height steps, texture-edge errors, or fallback geometry |
| SET adjacency | Terrain, crosser, feature, group, orientation, master-cell, and neighbourhood rules select a legal verified arrangement |
| Path metadata | PathNode/PathReference facts are parsed and interpreted correctly; this is evidence input only |
| Native connection | `PathConnect` edge/region result matches recovered or differential Aurora behavior |
| WOK seam | Walkmesh boundary vertices, heights, surface flags, and crossing eligibility form a valid traversable seam |
| Persistence | ARE tile row and related data survive save, reload, export, packed readback, and reopen without drift |
| Native load | Toolset opens, saves, builds, and reopens the exact candidate without unexpected warnings or repair |
| Runtime | NWN loads the exact module/Area and the expected visible and traversability behavior is observed |
| Determinism | Repeating the same input/profile/seed/resource lineage produces the same normalized state and output hashes |

The product must never equate these claims:

- visible model with correct model;
- correct model with legal neighbour selection;
- legal SET neighbours with native `PathConnect`;
- `PathReference` with `PathConnect`;
- matching visible edges with continuous WOK;
- continuous WOK data with demonstrated NWN traversability;
- browser output with native Toolset or NWN acceptance.

## 4. Product capability catalog to finish

The first implementation milestone freezes a machine-readable Area capability
catalog. Each item receives an owner, Aurora evidence status, implementation
status, test IDs, proof IDs, and release policy. The catalog must cover at least
the following functions.

### 4.1 Area lifecycle CRUD

#### Create

1. Create a local Area draft with explicit name, ResRef, tag, tileset, final
   width, final height, creation profile, and deterministic seed.
2. Validate naming, collision, size, tileset/profile, resource lineage, and
   tile eligibility before mutation.
3. Initialize a complete dense row-major grid; never persist sparse expansion.
4. Materialize a new ARE/GIT/GIC triplet and one IFO Area entry atomically.
5. Return exact revision, hashes, warnings, provenance, and readback report.

The detailed implementation is defined by the Create subplan linked above.

#### Read

1. List only Areas and drafts visible to the authenticated role.
2. Read Area metadata without loading full scene assets.
3. Open a production Area as a local draft by copy-on-open.
4. Open an existing local draft at a requested revision.
5. Parse ARE, GIT, GIC, IFO membership, SET, model/material/texture, WOK, and
   object-template dependencies through explicit ports.
6. Preserve all unknown, unsupported, and profile-specific fields losslessly.
7. Stream/chunk large payloads within a measured contract budget.
8. Report missing/colliding resources before the editor claims readiness.

#### Update

1. Save ordinary edits to a local draft, never directly to production.
2. Apply commands against an expected revision and return one deterministic
   changeset and one history entry.
3. Support tile, Area-property, script-binding, and supported object mutations.
4. Update only affected scene subsets; a single edit cannot force a default
   full-Area reload.
5. Materialize a privileged update to an editable module through an atomic
   snapshot transaction with strict preflight and post-write readback.
6. Save/reopen the draft and module with identical normalized state.

#### Delete

1. Delete a local draft as an owner-authorized operation.
2. Delete an Area from an explicitly editable module only through a separate,
   privileged materialization command.
3. Scan module entry point, transitions, waypoints, scripts, and known resource
   references before destructive deletion.
4. Block on unresolved references unless a reviewed policy explicitly chooses
   a repair action.
5. Remove ARE/GIT/GIC and exactly one IFO membership entry atomically.
6. Provide preview, typed confirmation, idempotency, audit, rollback, and
   post-delete packed readback.
7. Never reinterpret Delete as hiding an Area from the frontend list.

### 4.2 Tile and topology authoring

1. Browse terrain, crosser, feature, and group palettes from verified SET data.
2. Search/filter by tileset, category, name, capability, and certification.
3. Paint one tile and a controlled brush footprint.
4. Place complete groups with verified footprint, master-cell, orientation, and
   boundary behavior.
5. Replace a selected tile without losing unrelated per-cell properties.
6. Rotate tile/model/texture according to separately verified fields.
7. Edit tile height, main lights, source lights, animation-loop bytes, plot, and
   other proven per-tile fields.
8. Erase through a valid replacement policy; never serialize a null tile cell.
9. Select one tile, range, rectangle, connected region, and overlapping target
   deterministically.
10. Copy/paste or duplicate a topology selection with collision and boundary
    validation.
11. Undo and redo every topology command with exact baseline restoration.
12. Rotate a complete grid only when index, orientation, groups, objects,
    polygons, waypoints, and references are transformed consistently.
13. Resize only through a project-defined dense-grid operation. Native sparse
    expansion is explicitly non-parity and cannot be advertised as Toolset
    resize behavior.
14. Validate the entire neighbourhood after each edit and update only the
    affected render/connectivity region.
15. Prevent placement of uncertified tiles in production-capable profiles.

### 4.3 Area properties and behavior

1. Basic identity and descriptive fields.
2. Visual environment: fog, lighting, shadows, day/night and weather, only as
   semantics graduate from preserve-only to verified.
3. Audio environment: music, ambient, battle music, and native default fields.
4. Area event script bindings with catalog validation and compile status.
5. Advanced flags, comments, loading screen, and profile-specific fields.
6. Start location and entry behavior where the Area/module contract requires it.
7. Preserve-only UI for unresolved fields with no payload mutation.
8. Exact Apply, OK, Cancel, reopen, and history behavior.

### 4.4 GIT object authoring inside Areas

The Area product is not complete if it can paint floors but cannot author the
objects that make an Area usable. The capability catalog must cover these GIT
families:

1. placeables;
2. creatures/NPCs;
3. ground items;
4. doors;
5. encounters;
6. merchants/stores;
7. sounds;
8. triggers;
9. waypoints.

For every applicable family, finish:

- palette/catalog placement;
- deterministic selection and overlap resolution;
- move, exact location, bearing, and supported transforms;
- property tabs and preserve-only unsupported fields;
- scripts and reference validation;
- inventory/equipment where native data supports it;
- copy/paste/duplicate where the native or project policy allows it;
- delete with reference checks;
- undo/redo and exact save/reopen;
- ARE/GIT/template round-trip and runtime behavior when the feature is
  behavioral.

Doors retain their Aurora-specific constraints: they are not part of generic
move or visual-transform flows and require verified tile hooks. Door/trigger
transitions are a separate end-to-end capability, not an incidental string
field.

### 4.5 Workspace and editor ergonomics

1. Consistent collapsible panels and Aurora-shaped property windows.
2. Explicit modes for select, tile paint, object placement, polygon placement,
   walkmesh/debug overlay, and camera interaction.
3. A visible current tileset/profile/certification state.
4. Dirty-state, saving, conflict, materializing, verified, failed, and recovery
   states that cannot be confused.
5. Keyboard and pointer commands with focus guards and accessible alternatives.
6. Camera reset/recenter plus stable before/after visual-regression framing.
7. Diagnostics linked to exact Area, cell/object, resource, pipeline stage, and
   proof row.
8. Local cache limited to 2 GB, user-clearable, with scene cache released when
   leaving an Area.

## 5. Target architecture

### 5.1 Bounded contexts

| Context | Responsibility | Must not own |
| --- | --- | --- |
| Area catalog | Lists Areas/drafts and metadata | Scene mutations |
| Area lifecycle | Create/open/save/materialize/delete transactions | Renderer internals |
| Area topology | Dense grid, tile commands, groups, neighbourhood validation | HTTP and filesystem |
| Area objects | GIT object commands, properties, references | Tile model parsing |
| Resource lineage | Module/base/ordered-HAK resolution and hashes | UI state |
| Tile assets | SET/model/material/texture/WOK parsing and immutable contracts | Persistence policy |
| Render runtime | Incremental scene realization and diagnostics | Aurora semantic invention |
| Connectivity | SET adjacency, `PathConnect`, WOK seams, runtime certification | Visual-only inference |
| Proof/certification | Immutable plans, rows, packets, validators, release reports | Product mutation logic |

### 5.2 Frontend layering

The Areas UI calls application facades only. Facades depend on ports; HTTP,
local draft storage, browser cache, worker execution, and render adapters stay
behind those ports. React components must not import concrete HTTP adapters.
The current direct adapter imports in the panel path are removed as part of the
first contract integration slice.

Minimum public facades:

- `areaCatalogQueryFacade`;
- `areaLifecycleFacade`;
- `areaTopologyCommandsFacade`;
- `areaObjectCommandsFacade`;
- `areaPropertiesFacade`;
- `areaRenderQueryFacade`;
- `areaConnectivityQueryFacade`;
- `areaCertificationQueryFacade`.

### 5.3 Backend layering

Controllers perform boundary validation, explicit role checks, and explicit
mutation permission checks. Application services coordinate ports. Domain code
owns dense-grid and transaction invariants. Adapters own GFF, module containers,
filesystem snapshots, resource archives, and proof storage.

No mutation endpoint may reuse a broad read permission. Define narrow
permissions for draft creation, draft update, draft deletion, module
materialization, module Area replacement, and module Area deletion.

### 5.4 Shared render pipeline

Tiles, placeables, doors, creatures, items, and VFX feed one shared staged
pipeline for resource resolution, model parsing, material/texture resolution,
transform application, GPU realization, disposal, and diagnostics. Type-specific
adapters may map domain fields but cannot fork common material/cache/transform
behavior.

### 5.5 Command and revision model

Every edit is a typed command with:

- command ID and idempotency key;
- Area/draft ID and expected revision;
- actor and permission;
- normalized payload and schema version;
- deterministic seed where applicable;
- preconditions and affected region/object set;
- inverse or snapshot needed for undo/recovery;
- resulting revision, change summary, warnings, and diagnostics.

Queries never mutate. Materialization operates on one immutable draft revision;
an edit arriving during export cannot change the bytes under proof.

## 6. Contract-first work

Before implementation, publish an additive Areas contract version covering:

1. capability catalog and certification status;
2. tileset/profile catalog and resource-lineage identity;
3. Create, Read, Update, and Delete for drafts;
4. privileged module materialization for create/update/delete;
5. command batches, expected revision, ETag, and idempotency;
6. chunked scene/topology/object reads;
7. validation and impact-preview reports;
8. asynchronous materialization/proof jobs;
9. bounded diagnostic and provenance payloads;
10. explicit error codes and recovery actions.

Required domain payloads:

- `area-capabilities.v1`;
- `area-draft.v1`;
- `area-command.v1`;
- `area-changeset.v1`;
- `area-materialization.v1`;
- `area-resource-lineage.v1`;
- `tile-definition.v1`;
- `tile-connectivity.v1`;
- `area-certification.v1`;
- `area-reference-impact.v1`.

The contract defines payload budgets and paging/chunking before the largest
53,700-definition catalog or a large Area is sent to the client. Binary model,
texture, WOK, and module bytes are never embedded in ordinary JSON drafts.

## 7. Aurora reverse and decompilation closure track

No implementation may guess an unknown Aurora semantic. The following evidence
must be closed or explicitly remain project-defined and non-parity.

### 7.1 Reproducible primary lineage

1. Bind the exact Toolset executable hash, version metadata, architecture,
   export tool version, loader/base address, symbol assumptions, analysis
   options, and export hash in a machine-readable manifest.
2. Reproduce the current primary export and compare hash/semantic anchors.
3. Link every recovered function and structure to the manifest.
4. Keep xoreos outside the authority chain; this plan uses no xoreos runtime
   implementation or inferred semantics.

### 7.2 Area reader/writer and wizard

1. Extend the verified `FUN_005a7fc8` reader map.
2. Extend the verified `FUN_005a9f30` writer map, including all root and tile
   fields read or emitted for the creation profile.
3. Recover New Area wizard initialization: exact ARE/GIT/GIC defaults, tile
   choice/defaults, IFO insertion, identity policy, and size bounds.
4. Close strict parser HOLD items MH-01, MH-02, MH-03, MH-05, MH-07, and MH-08.
5. Create at least two independent native fixtures per profile and a controlled
   negative fixture for every strict validator rule.
6. Record which behavior is native parity and which is a deterministic project
   policy.

### 7.3 Tile selection and joining semantics

1. Recover SET terrain, crosser, feature, group, orientation, master-cell, and
   neighbour-selection rules.
2. Prove world/grid axes, orientation transforms, edge numbering, height units,
   and all rotation/reflection mappings.
3. Recover or differentially prove native `PathConnect` independently of
   PathNode/PathReference parsing.
4. Recover the applicable WOK edge, surface, step/height, and crossing rules.
5. Prove HAK conflict precedence for the exact ordered profile used by the app.
6. Document unsupported/ambiguous definitions as blockers, not inferred values.

### 7.4 Reverse-track exit gate

For each semantic, exit is allowed only with a repository audit update,
reproducible evidence manifest, fixtures, differential tests, and a `verified`,
`failed`, or `missing` verdict. `Likely`, `looks correct`, and reference-only
PathNode results cannot enter production domain logic.

## 8. Implementation workstreams

### WS0 - Freeze scope, truth, and recovery state

Deliverables:

1. Generate the Area capability catalog from code, UI shells, contracts, Toolset
   roadmap, manifests, and audits.
2. Recompute roadmap summaries from proof manifests and repair status drift.
3. Inventory the dirty worktree and isolate implementation on dedicated
   `codex/` branches targeting `dev`; never mix unrelated CUD and renderer work.
4. Reconcile stale matrix leases, heartbeat, partial browser lifecycle, and
   partial packet artifacts without overwriting evidence.
5. Resume at exactly `mst04-group-chunk-0002` only after recovery classifies
   every partial artifact and proves no live owner exists.
6. Freeze an immutable plan ID, corpus hash, tool versions, profile set, and
   exact denominators before new matrix execution.

Exit gate: one generated capability ledger and one truthful matrix checkpoint
can be resumed after process interruption without double counting.

### WS1 - Contract and domain foundation

Deliverables:

1. Add the contract payloads and endpoints from section 6.
2. Define immutable Area, tile, object, lineage, certification, and changeset
   types.
3. Enforce `Tile_List.length == Width * Height` everywhere.
4. Define row-major indexing and coordinate/orientation conversions once.
5. Split native parity rules from versioned project policies.
6. Introduce frontend ports/facades and remove UI-to-adapter coupling.
7. Add explicit server permissions and deny-by-default guards.
8. Define bounded error codes, including field path, cell/object identity,
   resource winner/candidates, stage, and recovery action.

Test-first gate: schema, authorization, coordinate, revision, idempotency,
boundary, and backward-compatibility tests fail before production code changes.

### WS2 - Canonical readers, writers, and preserve-first round-trip

Deliverables:

1. Implement strict ARE reader/writer against verified root and tile profiles.
2. Implement correct GIT family labels, including native ground-item `List`, and
   preserve native audio/music/default fields.
3. Implement the verified GIC profile instead of an empty structure.
4. Preserve unknown fields, field types, localized strings, list order where
   semantically significant, and untouched binary/resource records.
5. Read and update IFO Area membership without losing other module metadata.
6. Produce normalized semantic diffs and byte/hash diffs.
7. Reject incomplete or sparse grids before any write.

Exit gate: native golden fixtures pass parse/serialize/parse and preservation
tests; negative fixtures fail with exact diagnostics; the application writer no
longer validates itself only against its own output.

### WS3 - Safe Area lifecycle CRUD

Deliverables:

1. Implement the Create subplan.
2. Complete paged list, metadata query, copy-on-open, draft open, and dependency
   readiness for Read.
3. Complete optimistic-concurrency draft save and privileged update
   materialization.
4. Complete draft Delete and module Area Delete with reference impact preview.
5. Use one module-scoped lock and recoverable snapshot transaction for all
   resource and IFO mutations.
6. Stage writes, validate staged bytes independently, commit atomically where
   supported, and restore the exact baseline on any failure.
7. Make retries idempotent and collision-safe.
8. Build a recovery command that classifies and resolves abandoned transactions
   without guessing.

Exit gate: fault injection at every write/rename/readback/IFO step proves either
the complete expected result or exact baseline restoration.

### WS4 - Tileset catalog and eligibility

Deliverables:

1. Parse every in-scope SET into immutable terrain, crosser, feature, tile, and
   group definitions.
2. Resolve `Tile_ID` to model ResRef and ordered resource candidates.
3. Validate group footprints, master cells, rotations, outliers, missing
   definitions, and duplicate/colliding names.
4. Expose only definitions eligible for the selected authoring profile.
5. Separate `eligible/excluded` product policy from
   `verified/failed/missing` proof status.
6. Give every exclusion an immutable reason and prevent selecting it.
7. Cache immutable catalogs within the 2 GB client cap and invalidate by full
   lineage hash, never display name alone.

Exit gate: all current 99 tilesets and 53,700 definitions have a deterministic
inventory row; totals reconcile to the frozen plan and no selectable row lacks
an asset/certification identity.

### WS5 - Unified tile render pipeline

Deliverables:

1. Resolve base/module/ordered-HAK resources with recorded winner and conflicts.
2. Parse and normalize tile MDL/model hierarchy, meshes, pivots, bounds, and
   animation metadata through shared render contracts.
3. Resolve MTR/material and every required texture slot with exact source hash.
4. Apply verified world axes, tile origin, orientation, height, and node
   transforms.
5. Implement alpha, two-sided meshes, water, animated textures, self-illumination,
   and other tile material cases present in the corpus.
6. Keep visible mesh and WOK/debug overlays separate.
7. Apply Area environment inputs without baking them into tile identity.
8. Compute robust group/Area bounds so framing cannot hide valid outliers.
9. Incrementally rebuild only affected tiles/materials/neighbour regions.
10. Dispose GPU resources and enforce cache limits deterministically.
11. Emit explicit `ready`, `failed`, `missing`, `fallback`, and `stale` diagnostics.
12. For production-certifiable rows, reject bridge/fallback/placeholder output.

Exit gate: exhaustive automated render contracts and saved visual artifacts show
zero unexpected blank, bridge, fallback, placeholder, pending, or failed tiles
for every exposed row.

### WS6 - Tile authoring and automatic legal joining

Deliverables:

1. Implement all operations from section 4.2 as typed commands.
2. Build an affected-neighbour calculator and deterministic candidate selector.
3. Validate every proposed tile/group mutation before commit.
4. When automatic correction is enabled, return the full proposed changeset for
   preview; never make unreported neighbour mutations.
5. Preserve unrelated tile properties during replacement.
6. Reject a mutation if no verified legal arrangement exists.
7. Record candidate sets, rejection reasons, chosen rule, orientation mapping,
   seed, and before/after cells for replay.
8. Recompute rendering and connectivity only in the affected closure.

Exit gate: operation-level property tests, exhaustive catalog legality tests,
and native differential fixtures agree for every proven rule family.

### WS7 - Native `PathConnect`, WOK, and runtime traversability

Deliverables:

1. Define canonical edge/region IDs and rotation mapping.
2. Implement recovered `PathConnect` as a pure, versioned domain function or
   keep production connection claims blocked.
3. Build differential fixtures for connected, disconnected, rotated, height
   offset, crosser, feature, group boundary, and malformed cases.
4. Parse WOK boundary geometry, surface/material flags, height, and walkability.
5. Match neighbouring WOK edges within evidence-backed tolerances.
6. Distinguish geometric contact, legal crossing, one-way/blocked behavior, and
   runtime path success.
7. Add Area-level connected-component and unreachable-region diagnostics.
8. Build a controlled NWN runtime fixture that records actual crossing/path
   behavior through engine-visible logs/state, not screenshots alone.
9. Correlate every runtime case with the exact matrix row and module hash.

Exit gate: every required connection row is verified against recovered native
logic and WOK rules. If equivalence-class proof cannot demonstrate closure, the
row requires direct native differential execution. Until this gate passes, the
UI may say `visual seam verified` but never `connected` or `traversable`.

### WS8 - Full Area object authoring

Deliverables:

1. Finish the nine object families from section 4.4 through shared command and
   renderer paths.
2. Promote property controls from preserve-only only after Aurora semantics and
   write/readback mappings are verified.
3. Implement polygon editing for triggers and encounters with geometry
   validation and exact undo/redo.
4. Implement door hooks and transitions, waypoint targets, merchant inventory,
   encounter spawn configuration, sound behavior, scripts, and applicable
   runtime proofs.
5. Preserve doors' special movement/transform restrictions in domain tests.
6. Ensure deletion/reference impact covers transitions, tags, scripts, and
   ownership/inventory relationships.

Exit gate: the generated capability ledger has no unexplained `SHELL` or
`NOT_STARTED` item inside the declared Areas product; each unresolved Aurora
semantic remains visible, preserve-only, non-destructive, and outside the
release capability set.

### WS9 - Area properties, scripts, and environment

Deliverables:

1. Finish Basic, Visual, Audio, Events, Advanced, and Comments shells with
   explicit field-state policy.
2. Add native round-trip for each activated field group.
3. Add script catalog, source/compile status, event binding, and stale NCS
   diagnostics.
4. Validate referenced audio, loading screen, transition, and script resources.
5. Prove fog/lighting/day-night/weather visually in comparable Toolset and NWN
   states.
6. Prove audio behavior with recorded runtime state/log evidence; a screenshot
   cannot certify sound.

Exit gate: every active field survives Apply/Cancel/Save/reopen/materialize and
native readback, and every behavior field has the required runtime proof.

### WS10 - UX, diagnosability, and performance

Deliverables:

1. Integrate all facades into coherent panels and explicit editor modes.
2. Surface profile, certification, dirty state, revision, conflicts, queued
   jobs, and recovery state.
3. Add cell/object/resource scoped diagnostic views and downloadable bounded
   reports.
4. Extend pipeline telemetry with Area stages for resolve, parse, validate,
   render, connect, stage, write, readback, build, and runtime proof.
5. Keep high-cardinality identities in logs/artifacts, not metric labels.
6. Benchmark large Area open, first visible render, incremental edit, save,
   undo/redo, catalog search, matrix packet, memory, and cache eviction.
7. Define and meet budgets before release; do not choose arbitrary production
   thresholds without benchmark evidence.

Exit gate: failures identify the exact stage and affected identity; common edits
remain incremental; no leak or unbounded cache growth appears in long-session
tests.

### WS11 - Exhaustive matrix, native proof, and release certification

Deliverables:

1. Execute the immutable matrix from a truthful recovered checkpoint.
2. Save per-row structural, render, seam, adjacency, path, WOK, persistence, and
   native verdicts.
3. Produce exact viewport captures only from fresh requested state after all
   contracts settle and zero unexpected bridge/failed tiles remain.
4. Use only central Toolset operating/proof routes, one owned session, exact
   module/Area verification, `TScrollBox` targeting, safe Save, Build Module,
   packed readback, Test Module, and clean close.
5. Run proof on a second independent object/Area/tileset for every semantic
   standard where the roadmap requires reproducibility.
6. Include negative proofs and mutation-sensitive validators.
7. Generate the release report from immutable rows and manifests.

Exit gate: no release claim exceeds the exact evidence coverage recorded in the
report.

## 9. Certification matrix model

### 9.1 Immutable identity

Every matrix plan records:

- `planId` and schema version;
- generator and validator versions/hashes;
- application commit and dirty-state policy;
- exact Toolset/NWN executable hashes;
- module and Area hashes;
- ordered HAK list and hashes;
- SET/model/material/texture/WOK corpus hashes;
- tileset and profile allowlists;
- row-generation rules and denominators;
- capture viewport, camera, graphics, and runtime profile;
- created-at time and predecessor checkpoint.

### 9.2 Required row dimensions

At minimum, one row identifies:

- tileset and profile;
- source tile definition and `Tile_ID`;
- terrain/crosser/feature/group role;
- group and master-cell identity where applicable;
- orientation and height class;
- neighbour direction and neighbour definition for connection rows;
- resource lineage and all asset hashes;
- expected SET rule and native evidence class.

### 9.3 Independent row verdicts

Each row stores these independent fields:

- `eligibility`: `eligible` or `excluded`, with reason;
- `inventory`: `verified | failed | missing`;
- `assetClosure`: `verified | failed | missing`;
- `render`: `verified | failed | missing`;
- `visualSeam`: `verified | failed | missing`;
- `setAdjacency`: `verified | failed | missing`;
- `pathReference`: `verified | failed | missing`;
- `pathConnect`: `verified | failed | missing`;
- `wokSeam`: `verified | failed | missing`;
- `persistence`: `verified | failed | missing`;
- `toolset`: `verified | failed | missing`;
- `nwnRuntime`: `verified | failed | missing`;
- artifact links, validator version, timestamps, and failure codes.

An aggregate is derived only from these rows. An interrupted packet cannot mark
untested rows verified. Re-execution with the same row identity is idempotent.

### 9.4 Coverage rule

Current denominators are a baseline to reconcile, not numbers to hard-code in
product logic:

- 99 tilesets;
- 53,700 definitions;
- 53,136 required add/render rows;
- 9,114 required group rows;
- 52,767 candidate connection rows;
- 3,890 packets.

After WS0 freezes the successor plan, every count change requires a generated
diff explaining added, removed, or reclassified rows. No row disappears because
it failed. A legitimate non-runtime placeholder can be `excluded` only by an
explicit reviewed rule and must not be selectable in a production profile.

## 10. Testing strategy and TDD order

For every workstream, implement in this order:

1. contract/schema tests;
2. domain unit and property tests;
3. diagnostic/telemetry assertions;
4. adapters and implementation;
5. integration and round-trip tests;
6. regression, mutation, performance, and proof gates.

### 10.1 Required suites

| Suite | Mandatory coverage |
| --- | --- |
| Unit | Dense grid, indexing, orientation, commands, inverses, validators, selection, references, permissions |
| Property-based | Random valid grids/groups/rotations, command/inverse invariants, WOK edge cases, malformed inputs |
| Fuzz | ARE/GIT/GIC/IFO/SET/model/material/WOK readers and strict boundary validation |
| Contract | OpenAPI/JSON schemas, budgets, paging, errors, additive v1 compatibility |
| Authorization | Every query and mutation by role/permission/ownership; deny by default |
| Integration | FE facade to port, backend transaction, resolver/parser/render/connect pipelines |
| Round-trip | Native fixture parse/write/parse and untouched-field preservation |
| Golden corpus | Multiple native Areas, profiles, object families, groups, materials, WOK cases |
| Differential | Toolset writer/defaults, SET selection, orientation, `PathConnect`, WOK/native behavior |
| Determinism | Same input/profile/seed/lineage produces identical normalized state and hashes |
| Mutation | Domain logic, state/history, auth, guards, validation, transactions, matrix aggregation |
| Failure injection | Lock, stale revision, collision, disk full, partial write, rename, readback, build, process interruption |
| Visual regression | Every renderer equivalence class, seam class, group, orientation, lighting/material case |
| Browser E2E | CRUD, tile tools, object tools, history, save/reopen, conflict, diagnostics, matrix links |
| Performance | Large catalog/Area, incremental edit, memory/GPU/cache, long sessions, matrix throughput |
| Toolset | Open, inspect, Save, Build, reopen, packed readback using central routes |
| NWN | Exact module/Area load, visible state, transition/behavior, traversability evidence |

### 10.2 Required negative cases

1. sparse or wrong-length tile list;
2. illegal tile/group neighbour combination;
3. missing model/material/texture/WOK;
4. ambiguous resource collision or wrong HAK order;
5. invalid orientation/height/light/animation values;
6. stale revision and reused idempotency key with different payload;
7. target module changed during materialization;
8. duplicate ResRef or inconsistent IFO membership;
9. Delete with live inbound references;
10. partial transaction and stale recovery lease;
11. browser capture with pending/bridge/failed tiles;
12. visual seam that fails `PathConnect` or WOK;
13. WOK contact that fails actual NWN crossing;
14. unexpected Toolset repair, modal, Access Violation, or Build error;
15. proof generated from the wrong module, Area, profile, or executable.

## 11. Native proof workflow

Native proof work follows the Toolset authoring and proof standards:

1. reconcile any existing ledger/session;
2. verify immutable module hash and work only on a recoverable copy;
3. open or reuse exactly one Toolset process through the central operator;
4. verify process, window, monitor, module, Area, viewer, and `TScrollBox`;
5. capture before state and source readback;
6. execute one bounded authoring/proof atom without global input;
7. Save using the verified route and wait for a settled state;
8. independently read back packed ARE/GIT/GIC/IFO and compare the intended
   delta plus absence of cross-kind changes;
9. Build Module and retain the settled log/result;
10. reopen and verify persistence;
11. run Test Module through the central AUR-S07 route and correlate the exact
    NWN process/module/Area;
12. capture behavioral logs/state and visual evidence appropriate to the claim;
13. assemble and validate a proof packet;
14. restore baseline when the proof is a reversible test;
15. close once and prove zero owned processes/modals remain.

A browser screenshot is development evidence only. A Toolset screenshot alone
does not prove serialized data, audio, scripts, transitions, pathing, or runtime
behavior. Accepted completion always combines the appropriate visual evidence
with independent source readback and runtime evidence.

## 12. Detailed completion criteria

### 12.1 Governance and scope

- [ ] The machine-readable capability catalog contains every Areas UI command,
  property control, backend operation, and native proof standard.
- [ ] Every catalog row has one owner and one release status.
- [ ] `SHELL`, `NOT_STARTED`, and preserve-only rows cannot be accidentally
  advertised as active.
- [ ] Roadmap totals are generated from accepted manifests and match detailed
  rows.
- [ ] CUD, renderer, connectivity, and unrelated dirty work are isolated in
  reviewable branches/changesets.
- [ ] No xoreos code or semantics are used as Aurora authority.

### 12.2 Contracts and architecture

- [ ] The additive Areas contract and all schemas are versioned and validated.
- [ ] Payload budgets, paging/chunking, caching, and migration are documented.
- [ ] UI components depend only on application facades.
- [ ] Filesystem, HTTP, cache, renderer, worker, and proof implementations sit
  behind ports.
- [ ] Read and mutation paths are separated.
- [ ] All mutation endpoints enforce explicit roles, permissions, and ownership.
- [ ] Commands are revisioned, deterministic, idempotent where retryable, and
  auditable.
- [ ] Single-cell/object edits do not default to full-Area reload.

### 12.3 Area CRUD

- [ ] New draft creation accepts explicit identity, final dimensions, profile,
  tileset, and seed.
- [ ] Production Areas can be listed and copied into local drafts by authorized
  users only.
- [ ] Existing drafts reopen at the exact requested revision.
- [ ] Draft update detects stale revisions and never loses concurrent edits.
- [ ] Privileged create/update materialization operates on one immutable draft
  revision.
- [ ] Draft Delete is owner-safe and idempotent.
- [ ] Module Area Delete previews and blocks unresolved references.
- [ ] Create/update/delete mutate ARE/GIT/GIC/IFO atomically.
- [ ] Failure at every transaction stage restores exact baseline or leaves a
  classified recoverable transaction.
- [ ] Post-write byte readback and semantic readback both pass.
- [ ] Save/reopen produces identical normalized state.

### 12.4 Native formats and preservation

- [ ] ARE creation profile matches verified native root and per-tile fields.
- [ ] GIT uses canonical family labels and native empty/default fields.
- [ ] GIC uses a verified non-empty profile.
- [ ] IFO Area membership is correct and unrelated fields remain unchanged.
- [ ] Unknown and unsupported fields survive round-trip unchanged.
- [ ] Dense-grid invariant is enforced on every boundary.
- [ ] Animation-loop defaults and all other semantic differentials are either
  natively resolved or explicitly project-defined without a parity claim.
- [ ] At least two independent native golden fixtures pass per supported
  creation/profile class.

### 12.5 Tile tools

- [ ] Terrain, crossers, features, and groups are derived from verified SET data.
- [ ] Single paint, brush, replace, rotate, height, light, animation, erase,
  selection, copy/paste, grid transform, undo, and redo meet their catalog scope.
- [ ] Group footprint/master-cell/orientation behavior is verified.
- [ ] Every command previews and records all neighbour changes.
- [ ] Illegal or uncertified placements fail before state mutation.
- [ ] Undo restores exact baseline and redo restores the exact normalized
  changeset.
- [ ] Save/reopen preserves every changed cell and unaffected property.

### 12.6 Rendering

- [ ] Every exposed tile resolves the intended model through the exact lineage.
- [ ] Every required model/material/texture dependency is ready before capture.
- [ ] Orientation, pivot, height, axes, and scale pass differential fixtures.
- [ ] Alpha, two-sided, water, emissive, and animation classes pass visual tests.
- [ ] Area lighting/fog/environment is applied correctly for supported profiles.
- [ ] Groups and outliers remain in correct bounds and framing.
- [ ] WOK/debug overlays cannot replace or hide visible mesh failures.
- [ ] Production certification contains zero unexpected blank, bridge, fallback,
  placeholder, pending, stale, or failed tiles.
- [ ] Renderer changes update only the affected scene closure and release GPU
  resources correctly.

### 12.7 Joining and traversability

- [ ] Visual seam, SET adjacency, PathReference, `PathConnect`, WOK seam, and
  NWN runtime verdicts are stored independently.
- [ ] Edge numbering and every orientation mapping are verified.
- [ ] Automatic neighbour selection matches recovered/differential native rules.
- [ ] `PathConnect` is recovered/differentially proved; zero rows rely on
  PathReference as a substitute.
- [ ] WOK boundary, height/step, surface flags, and crossing rules pass.
- [ ] Connected-component diagnostics find isolated or unreachable regions.
- [ ] NWN runtime fixtures demonstrate the claimed crossings and blocked edges.
- [ ] No Area is labelled connected/playable while an applicable connection
  verdict is failed or missing.

### 12.8 Area objects and properties

- [ ] All nine GIT object families meet the declared placement/read/update/delete
  capability.
- [ ] Selection, overlap, transform restrictions, copy/paste, delete, and
  undo/redo behave per family policy.
- [ ] Door hooks and transitions are verified end-to-end.
- [ ] Trigger/encounter polygons survive exact round-trip.
- [ ] Merchant inventory, encounter spawn, sounds, waypoint targets, and scripts
  have runtime proof when exposed.
- [ ] Basic, Visual, Audio, Events, Advanced, and Comments field states are
  explicit and non-destructive.
- [ ] Apply, OK, Cancel, save, reopen, and materialize semantics pass for every
  active property group.

### 12.9 Matrix and proof

- [ ] The stale `mst04-group-chunk-0002` state is reconciled before execution.
- [ ] Immutable plan/corpus/tool/application identities are recorded.
- [ ] All 99 tilesets and all 53,700 current definitions reconcile or a reviewed
  successor plan explains every denominator change.
- [ ] Every eligible add/render and group row is verified.
- [ ] Every required connection row has independent SET, `PathConnect`, WOK, and
  runtime verdicts appropriate to its class.
- [ ] Failed rows remain visible and cannot be silently excluded.
- [ ] Every verified row links fresh artifacts and validator output.
- [ ] Interrupted/retried packets do not double count.
- [ ] Toolset proofs use central routes and exact process/module/Area checks.
- [ ] Build Module, packed readback, reopen, NWN load, and clean close pass.
- [ ] The release report is generated from the immutable row ledger.

### 12.10 Quality and operations

- [ ] Unit and regression suites pass in frontend and backend.
- [ ] Applicable integration, round-trip, golden, differential, visual,
  determinism, compatibility, fuzz, property, mutation, and performance suites
  pass.
- [ ] Mutation score does not regress and no changed critical logic has an
  undocumented surviving mutant.
- [ ] Authorization/security-focused tests pass for all new mutation and path
  handling routes.
- [ ] Failure injection proves transaction and matrix recovery.
- [ ] Telemetry identifies exact stage and low-cardinality result while detailed
  identities remain in bounded logs/artifacts.
- [ ] Client cache remains at or below 2 GB and is user-clearable.
- [ ] Large-Area performance budgets are evidence-backed and met.
- [ ] Documentation, schemas, runbooks, capability catalog, and proof links are
  current in the same release candidate.

## 13. Acceptance scenarios

| ID | Scenario | Required result |
| --- | --- | --- |
| AC-01 | Create a minimal Area draft | Complete dense grid, explicit profile/seed, no module mutation |
| AC-02 | Create and materialize new Area | Atomic ARE/GIT/GIC/IFO, readback exact, Toolset/NWN accepted |
| AC-03 | Retry the same create | Same result, no duplicate Area/resources/IFO row |
| AC-04 | Open production Area as draft | Authorized copy, source lineage retained, production untouched |
| AC-05 | Save and reopen edited draft | Exact revision and normalized topology/objects/properties restored |
| AC-06 | Concurrent stale save | `412`/domain conflict, no lost update |
| AC-07 | Update materialization | Exact intended delta only; rollback on injected failure |
| AC-08 | Delete draft | Owner-authorized, idempotent, unrelated drafts unchanged |
| AC-09 | Delete referenced module Area | Preview finds references and blocks destructive commit |
| AC-10 | Delete unreferenced module Area | Triplet and IFO entry removed atomically; packed readback exact |
| AC-11 | Paint/replace/rotate/height tile | Legal deterministic changeset, incremental render, exact undo/redo |
| AC-12 | Place a multi-cell group | Verified footprint/master cell/border/orientation and reopen parity |
| AC-13 | Attempt illegal neighbour | Pre-mutation rejection with candidate/reason diagnostics |
| AC-14 | Render each asset class | Correct model/material/texture/transform, no fallback state |
| AC-15 | Render visually matching but disconnected seam | Visual pass, `PathConnect`/WOK failure kept separate and visible |
| AC-16 | Rotated connected seam | SET, native path, WOK, and NWN crossing all agree |
| AC-17 | Height/step boundary | Correctly classified connected or blocked per verified tolerance |
| AC-18 | Missing/colliding HAK asset | Exact candidates/winner/blocker reported; no silent fallback |
| AC-19 | Place and edit each GIT family | Family policy, persistence, selection, delete, history, readback pass |
| AC-20 | Door transition | Hook, target, serialization, Toolset readback, and NWN transition pass |
| AC-21 | Trigger/encounter polygon | Valid geometry round-trips; malformed polygon is rejected |
| AC-22 | Area property Apply/Cancel | Apply is one history change; Cancel restores exact opening state |
| AC-23 | Script/audio/environment behavior | Source readback plus appropriate compile/log/runtime/visual evidence |
| AC-24 | Browser proof capture | Fresh settled state, exact target, zero unexpected bridge/failed tiles |
| AC-25 | Interrupted matrix packet | Reconcile and resume without overwrite or double count |
| AC-26 | Toolset Save/Build/reopen | Exact candidate stays stable; no unexpected modal/repair/error |
| AC-27 | NWN exact module/Area load | Process/module/Area identity and expected render/runtime state proven |
| AC-28 | Full catalog search/use | Every selectable row has capability and certification identity |
| AC-29 | Long large-Area session | Performance budgets met, incremental updates, bounded CPU/GPU/cache |
| AC-30 | Release report regeneration | Same immutable inputs produce the same aggregates and artifact links |

## 14. Completion levels and release policy

### Level 0 - Experimental

Local development only. Missing/failed rows are allowed and visible. No native
compatibility, connectivity, or playability claim.

### Level 1 - Feature slice complete

One capability passes contracts, tests, diagnostics, round-trip, and required
native proof for its exact profile. It does not imply tileset or product
completion.

### Level 2 - Certified tileset/profile

Every selectable definition, group, render class, required connection class,
save/reopen case, and native representative for one immutable tileset/profile
is verified. Only that profile may be advertised.

### Level 3 - Areas product complete

All declared CRUD, tile, object, property, persistence, proof, and UX
capabilities are complete, and every tileset/profile exposed in production is
Level 2. No visible active control lacks implementation or evidence.

### Level 4 - Full corpus parity complete

The successor immutable plan covers the complete intended corpus: currently 99
tilesets, 53,700 definitions, all required add/render/group/connection rows, and
every semantic/material/runtime equivalence class. Every eligible row is
verified, every exclusion is reviewed and non-selectable, and there are zero
unexplained failed or missing rows. Toolset and NWN certification supports the
exact scope of the parity claim.

The user-requested target is Level 4. Product rollout may expose earlier Level 2
profiles only if the UI and release notes name the narrower scope exactly.

## 15. Implementation sequence and dependency graph

```text
WS0 truth/recovery
  -> WS1 contracts/domain
     -> WS2 native readers/writers
        -> WS3 lifecycle CRUD
     -> WS4 tileset catalog
        -> WS5 unified rendering
        -> WS6 tile authoring/joining
           -> WS7 PathConnect/WOK/runtime
     -> WS8 object authoring
     -> WS9 properties/scripts/environment
  -> WS10 UX/diagnostics/performance integrates all lanes
  -> WS11 exhaustive matrix/native certification closes the program
```

Critical path:

1. recover truthful matrix state;
2. close export provenance, strict Area profile, wizard defaults, orientation,
   HAK precedence, `PathConnect`, and WOK semantic blockers;
3. freeze contracts and corpus;
4. finish readers/writers and safe CRUD;
5. finish renderer and joining logic;
6. finish Area object/property capabilities;
7. execute exhaustive local matrix and native differential/runtime proof;
8. generate the final certification report.

## 16. PR and execution slicing

Implementation uses small, reviewable changes targeting `dev`. Frontend
non-trivial implementation follows the repository rule to coordinate six
parallel agents, but each agent receives non-overlapping file ownership and a
bounded contract/test-first slice. A recommended six-lane cycle is:

1. contracts/domain and fixtures;
2. backend application/authorization/transactions;
3. GFF/SET/model/WOK adapters and differential corpus;
4. frontend facades/state/UI;
5. renderer/connectivity workers and performance;
6. independent tests, mutation, browser, Toolset/NWN proof, and audit.

No lane may invent Aurora semantics to unblock another. Shared contract changes
land first; dependent lanes rebase on the accepted contract. CUD, tile renderer,
connectivity, and object authoring remain separate PR series even when executed
in parallel.

Suggested PR waves:

1. capability ledger, roadmap reconciliation, and matrix recovery;
2. Areas contract schemas, permissions, ports, and failing tests;
3. native fixture corpus and strict readers/writers;
4. Create/Read/Update/Delete draft lifecycle;
5. module create/update/delete transactions and recovery;
6. SET catalog/eligibility and resource lineage;
7. unified tile render asset closure;
8. tile commands and legal neighbour selection;
9. `PathConnect`/WOK engine and diagnostics;
10. object families and Area properties;
11. UX integration and browser regressions;
12. matrix execution, Toolset/NWN certification, and release report.

## 17. Stop rules

Stop the affected lane and record a blocker when:

1. an Aurora semantic is unknown and implementation would require guessing;
2. primary decompilation lineage cannot be reproduced;
3. a resource winner is ambiguous under unproved HAK precedence;
4. a dense-grid, reference-integrity, revision, authorization, or transaction
   invariant fails;
5. matrix heartbeat/lease ownership is stale or conflicting;
6. a capture has pending, fallback, bridge, blank, stale, or failed tiles;
7. Toolset process/module/Area/view ownership is not exact;
8. Toolset shows Access Violation, recovery, quarantine, or unexpected repair;
9. Build Module or packed readback is unsettled or inconsistent;
10. NWN loaded a different module/Area or runtime evidence is not attributable;
11. a proof validator reports `failed` or `missing`;
12. a release aggregate cannot be regenerated from immutable rows.

A blocker narrows the claim; it does not authorize a heuristic implementation,
silent exclusion, or manual status promotion.

## 18. First executable milestone

The first milestone is not another broad capture run. It is a truthful,
contract-ready recovery package:

1. generate the complete Areas capability ledger;
2. reconcile Toolset roadmap summary drift against manifests/proofs;
3. inspect and classify the stale `mst04-group-chunk-0002` heartbeat, Chrome
   profile, lifecycle, lease, progress, and partial artifacts;
4. freeze the successor immutable matrix plan and denominators;
5. publish the additive CRUD/capability/certification contract draft;
6. publish reproducible decompilation lineage and the ordered research plan for
   wizard defaults, orientation, HAK precedence, `PathConnect`, and WOK;
7. prepare failing contract/domain/round-trip tests;
8. only then resume matrix execution or product implementation.

Milestone completion evidence is one repo-local package linking the capability
ledger, recovered checkpoint, contract schemas, reverse blockers, failing test
inventory, and exact next commands. After this gate, the implementation can
advance without confusing local rendering progress with native Area parity.

## 19. Continued implementation checkpoint — 2026-08-18 (existing Placeable HP / CurrentHP)

The source-closed native `HP : Short` plus `CurrentHP : Short` lane is now
offline-implemented. Only one complete canonical pair on a retained type-`9`
GIT Placeable authorizes the single visible Hit Points control. HP is limited
to the Toolset range `1..10000`; CurrentHP remains immutable provenance and is
derived by Aurora's recovered signed-integer quotient, signed-Short narrowing,
and minimum-one algorithm.

Backend parsing, projection, planning, writing, compilation, whole-struct
readback, and exact GIC preservation are covered. Frontend provenance,
admission, draft reduction, Apply materialization, scene normalization, clone,
cancel, undo, and the provenance-gated control are covered. Invalid,
incomplete, wrong-case, wrong-type, stale, unchanged, cross-family,
out-of-range, deletion-colliding, or incorrectly derived mutations fail
closed.

Verification completed on 2026-08-18:

- backend focused verification passed 6/6 suites and 1,367/1,367 tests;
- frontend focused verification passed 4/4 files and 128/128 tests;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- backend mutation: 206/206 active mutants killed, 100%, report SHA-256
  `925460d38d8e2c1f5cada9302218810374bb85d06b786f8b319295fe02aaad0a`;
- frontend mutation: 121/121 active mutants killed, 100%, report SHA-256
  `46e63731394c38c4379fc3dd6ec027865c90edcb4f1f29513af88d546650f276`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-hit-points-2026-08-18/offline-verification-summary.json`.

The public Toolset registry currently has no HP property atom. Fresh Toolset
Save/Build/reopen, packed readback, NWN runtime certification, global
regressions, transactional Area CUD, tile joining, PathConnect/WOK, Stage 4,
and Level 4 remain open.

## 20. Continued implementation checkpoint — 2026-08-18 (existing Placeable Tag and ordinal identity)

The canonical type-`9` GIT `Tag : CExoString` lane is now offline-implemented.
Its authoritative source locator is the immutable zero-based family pair
`(sourceKind, sourceIndex)`. `sourceObjectId` remains diagnostic and supports
legacy non-Tag drafts, but an editable Tag can no longer be used to locate
itself.

The admitted string is exact, may be empty, contains `0..32` ECMAScript code
units, and rejects U+0000. It is never trimmed, normalized, case-folded,
substituted, or truncated. The frontend enables Tag only for exact existing
`aurora_git` Placeable provenance with a safe ordinal. The backend projects one
changed pair, independently reparses the native ordinal and expected value,
rejects stale, duplicate, cross-family, invalid, unchanged, or deletion-
colliding requests, and replaces exactly one canonical native field. Complete
GIT struct and receipt readback preserve every sibling field; the isolated
writer case proves byte-identical GIC preservation.

Verification completed on 2026-08-18:

- backend focused verification passed 7/7 suites and 1,382/1,382 tests;
- frontend focused verification passed 4/4 files and 143/143 tests;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- backend mutation: 241/241 active mutants killed, 100%, report SHA-256
  `e4a00e2ca377f9486fa38ff14330fb10a7c264732fde9cd9e92c95f0a5d79568`;
- frontend mutation: 78/78 active mutants killed, 100%, report SHA-256
  `0b1ee7f64dedd03ed674523a50f4bfb3d522b148723d96aa970df6ed49491c4c`;
- machine-readable checkpoint:
  `backend/docs/aurora-reverse/evidence/area-existing-placeable-tag-2026-08-18/offline-verification-summary.json`.

This closes the former circular Tag identity blocker and provides the ordinal
foundation for later editable fields. `Name : CExoLocString`, fresh Toolset
Save/Build/reopen, packed readback, NWN runtime certification, global
regressions, transactional Area CUD, tile joining, PathConnect/WOK, Stage 4,
and Level 4 remain open.

## 21. Continued implementation checkpoint — 2026-08-18 (Placeable cache admission)

The host-local ghost-cache failure is closed. Memory cache writes now report
whether they were retained. Placeable processing retries a rejected complete
VFX value with a delivery-safe compact value and fails closed with
`PLACEABLE_CACHE_ADMISSION_FAILED` if the compact value is also rejected.
Initial processing, legacy migration, and manifest refreshes share the same
admission path, so the backend no longer publishes an immutable cache URL for
a value it did not store.

Verification completed on 2026-08-18:

- backend focused verification passed 177/177 tests;
- frontend cache/wiring/revalidation verification passed 113/113 tests;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- the dedicated backend mutation gate killed 22/22 active mutants, 100%;
- a fresh Playwright trace recorded 21/21 successful Placeable cache GETs and
  zero active Area-run 4xx/5xx;
- the guarded CDP capture recorded 19/19 successful Placeable binary responses,
  zero failed/in-flight classified requests, object payload/model 4/4 with no
  primitive fallback, and tiles/materials 4/4 with no failed or bridge tiles;
- the proof harness now waits for single payload, single contract, and binary
  asset settlement and fails on their HTTP/loading errors;
- durable packet:
  `backend/docs/aurora-reverse/evidence/area-placeable-cache-admission-2026-08-18/verification-summary.json`.

Independent runtime isolation closed the apparent black-surface blocker. The
surface is not `other_fog` and not a failed tile: it belongs exactly to
`obj_plc_q_floor_20`, appearance `5700`, template `plc_q_314`, model
`zlc_flr_black_x1`, texture `pdag_black`, source label `[Q] Czarny 1x1`.
Hiding `other_fog` leaves the square intact; hiding only this floor Placeable
reveals the already-rendered tile beneath it. The candidate browser visual
point is therefore verified as authored Area content. Transactional Area CUD,
legal tile joining, PathConnect/WOK, fresh Toolset/NWN certification, Stage 4,
and Level 4 remain open.

## 22. Continued implementation checkpoint — 2026-08-18 (source-WOK seam diagnostics and overlay)

The project now renders actual source-WOK triangle edges as an independent
debug layer and diagnoses adjacent right/bottom tile boundaries from exact
collision provenance. The contract validates dense unique grids, exact tile
instance/resource bindings, Aurora transforms, positive-length boundary
overlap, endpoint heights, and geometric contact components. The Area editor
shows PathNode presence, missing native PathConnect, WOK contact,
discontinuity/unresolved counts, and the geometric component count as separate
verdicts.

This checkpoint deliberately does not promote WOK geometry to walkability,
pathfinding, traversability, or native PathConnect. The evidence boundary is
recorded in the domain result, renderer scene metadata, UI copy, and the audit
`backend/docs/aurora-reverse/area-tile-wok-geometric-seam-diagnostics-audit-v1-2026-08-18.md`.

Verification completed on 2026-08-18:

- focused domain, panel, and renderer tests passed 111/111;
- frontend production build passed, with only the existing Vite chunk-size
  warning;
- the dedicated mutation gate detected 290/290 scored mutants (289 killed and
  1 timeout), with 0 survived and 0 no-coverage, score 100%;
- mutation report SHA-256
  `CCBD3ADA2EC5E90A45554F1FCCB4E410DE229921C58A1547095FE3DBDA9090A3`.

Native PathConnect recovery, legal transition certification, disposable packed
Area Create/Update/Delete proof, fresh guarded browser capture, Toolset
Save/Build/reopen, and NWN runtime proof remain open.

## 23. Continued implementation checkpoint — 2026-08-18 (PathConnect static reverse and proof gate)

Static reverse now recovers the Toolset Area-wizard route from
`TdlgAreaWizard` through `FUN_0041226c`, `FUN_005a5548`, and the tile
initialization path in `FUN_005a67cc`. It does not recover an authoritative
native PathConnect producer or NWN pathfinding consumer. The exact
`PathConnect` literal is absent, and the duplicated `PathNode` declarations
lead only to static lifecycle references. Native PathConnect therefore remains
`missing`; SET adjacency and source-WOK geometry remain independent evidence.

The matrix can no longer accept a weak `approved` flag with non-empty hashes.
A central differential-proof validator now binds the exact matrix row,
tileset/definition/tile/PathNode/orientation/edge/cell/lane identities, immutable
profile and packet hashes, Toolset readback, positive and negative NWN outcomes,
engine log, zero failures, and four exact artifact hashes. The new
`accept-path-connect` command reopens and rehashes all evidence, validates it
again, and atomically creates a replacement matrix plan. Later status reads
rehash accepted evidence and return `replan_required` on drift.

Focused proof, validator, acceptance, add-connect matrix, and matrix-control
tests passed, including post-acceptance artifact tamper rejection. The backend
production build passed. The bounded `tms01` differential hypothesis is Tile 7
PathNode `D` right to Tile 5 PathNode `B` left as the reference-match candidate
and Tile 7 PathNode `D` right to Tile 6 PathNode `E` left as the deterministic
reference-mismatch control. Both expose lane `0`, but its region changes from
`0` to `1`; the control partner also exposes lanes `-4` and `4`. Neither side
is promoted to native authority before the NWN differential result.

The audit is recorded at
`backend/docs/aurora-reverse/area-path-connect-static-reverse-and-proof-gate-audit-v1-2026-08-18.md`.
No approved live profile or accepted runtime packet exists yet, so this
checkpoint closes proof admission infrastructure but does not claim native
PathConnect, Toolset Save/Build/reopen, or NWN traversability.

The proof contract was subsequently hardened to `path-node-aware-v5`: a
negative control is now generated by the matrix, carries its exact PathNodes,
cells, orientations, edges, lane sets and region maps, and is preserved in the
proof envelope. A caller cannot substitute an arbitrary tile or textual reason.
Profile/packet/proof schema v2 requires two distinct Areas in the same immutable
module and binds their common matrix dimensions; the positive pair and negative
control can no longer collide in one partner cell. The hash-bound offline
inventory route produced the one-tileset bounded plan with `caseLimit=8`, so
row `tms01:7` is an exact 4x4 fixture at cells `(3,2)` and `(3,3)`:
`output/proof/tile-path-connect-tms01-v5`, plan ID
`a5ba77849aad72b4b5d4bc46990890c4aa9cab922ecc7a4e5dba60346db2797c`.
It claims 1/99 tileset scope only. The full host-local replan remains blocked
by a reproducible Node `invalid table size` out-of-memory failure in catalog
materialization and is not silently reduced.

## 24. Continued implementation checkpoint — 2026-08-19 (packed PathConnect candidate and AUR-S07 arm)

The bounded `tms01` differential candidate advanced from an offline matrix row
to a native Toolset-saved and packed MOD. The exact module
`aw_path_connect_proof_01.mod` has SHA-256
`3cb029d1260d0cfb67249569b9ee5b0b4ace5424cdc5eb232201f2d83b78ba3f`.
Packed readback contains the complete 2x2 positive Area `pc_tms01_pos`, the
complete 2x2 negative Area `pc_tms01_neg`, and `demo.OnEnter = pc_tms01_run`
with exact NSS source and compiled NCS. The post-binding geometry gate proves
that adding the script binding did not change either candidate ARE payload.

The immutable HAK order, start Area, coordinates, positive crossing
expectation, negative non-crossing expectation, timeouts, and artifact lineage
are frozen under
`output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07/`.
The profile is armed but deliberately does not launch NWN or synthesize global
input. The remaining AUR-S07 step is the user-owned Toolset **Test Module**
action followed by guarded observation and central packet validation. Native
PathConnect remains `missing` until that positive/negative runtime packet
passes.

## 25. Continued implementation checkpoint — 2026-08-19 (regression closure, signed Z, and cache-restart smoke)

The shared-tree regression gate is green after repairing stale UI, renderer,
copy-on-open, and provenance fixtures without weakening the asserted product
contracts:

- frontend unit: 2,685/2,685 tests;
- frontend regression smoke: 78/78 tests;
- backend unit: 226/226 suites and 3,737/3,737 tests;
- frontend and backend production builds: passed.

Local-draft scene normalization no longer clamps native object Z or visual
offset Z to zero. A TDD regression proves signed values survive the scene
canvas facade, and the coordinate regression smoke now exercises the signed
round-trip.

A real host-local memory-cache backend restart was executed while the frontend
Vite process and unrelated Toolset/NWN processes remained untouched. Fresh
guarded CDP captures before and after the restart both passed strict screenshot
freshness. Post-restart network settlement recorded 28 classified requests,
all responses HTTP 200 and none failed/in flight. Placeables were 4/4 ready
with zero fallback/blockers/texture issues; tiles were 4/4 loaded with zero
pending/failed/bridge. The baseline and post-restart page PNGs are
byte-identical, as are their canvas PNGs.

Durable evidence is stored at
`backend/docs/aurora-reverse/evidence/area-stale-cache-restart-2026-08-19/runtime-verification-summary.json`.
Because the guarded harness creates an isolated CDP profile per capture, this
packet proves a fresh settled post-restart artifact but does not claim direct
observation of one browser tab retaining its in-memory URLs across the restart.
That race remains covered offline by the revalidation-before-publication and
single-recovery test in `WorkspaceLayout.viewportWiring.test.tsx`.

## 26. Continued implementation checkpoint — 2026-08-19 (same-browser restart closure)

The guarded CDP harness now supports a challenge-bound same-browser restart
handoff. It writes a fresh `ready` packet only after the original Area and
network have settled, clears the active network observation window, requires a
validated `resume` packet with a different backend PID and HTTP 200 health,
reopens the exact Area, and rejects changed document identity, missing
authoritative Placeable revalidation, active failed/in-flight Placeable
requests, stale runtime identity, or unsettled renderer state.

The first exact run was correctly blocked. Resetting host-local memory
invalidated the old server session, leaving the existing scene visible but
preventing an authoritative reopen. Aurora Web now listens for an exact auth
storage update, accepts only a valid changed session, and lets the existing
authorization effect validate and apply the new access token without replacing
the document. A dedicated mutation gate scored 100%: 17 killed, zero survived,
and zero no-coverage active mutants.

The succeeding run kept the same document marker, identical
`performance.timeOrigin`, and identical `/app?mode=areas_mode` URL while the
backend changed from PID `110060` to `120448`. Exact `_winds_study` reopened
after the cold repository rebuild. The active post-restart window recorded 14
classified requests, all HTTP 200: two authoritative Placeable render-payload
batches, two Placeable single-payload reads, nine binary asset deliveries, and
one tile batch. Placeables settled 4/4 ready with four applied textures and zero
fallback; terrain settled 4/4 loaded with zero pending, failed, or bridge
tiles.

Durable evidence and hashes are stored at
`backend/docs/aurora-reverse/evidence/area-stale-cache-same-browser-restart-2026-08-19/runtime-verification-summary.json`.
This closes the Aurora Web same-browser stale-cache restart lane. It does not
advance Toolset/NWN PathConnect certification or the full tileset matrix.

## 27. Continued implementation checkpoint — 2026-08-19 (lossless Placeable localized-string read provenance)

Existing type-`9` GIT Placeable `LocName` and `Description` now cross the
backend/frontend boundary as complete, immutable, read-only storage
provenance. The contract distinguishes absent from present-empty, retains
unsigned `strRef`, ordered unsigned language identifiers, duplicate and empty
entries, and preserves every localized text payload as opaque canonical-base64
bytes. It never decodes, trims, normalizes, merges, or synthesizes a target.

The backend strict reader is limited to the native GFF `fieldData` section and
rejects wrong family, label, type, duplication, truncation, trailing storage,
and configured entry/byte-budget violations. Snapshot repository copies,
process-cache fingerprints, HTTP validation, scene mapping, and history clones
all retain the exact structure. Objects without this provenance keep their
pre-slice process-cache key.

Dedicated mutation gates are 100%: backend 82 killed and frontend 147 killed,
with zero survivors or uncovered active mutants. Backend unit is 3741/3741,
frontend unit 2705/2705, frontend regression 78/78, both builds pass, and the
Area proof-safety contracts pass. The historical backend E2E result at this
checkpoint was 111/113; section 28 records the later repair and green 113/113
generation-rebuild gate.

Evidence is frozen under
`backend/docs/aurora-reverse/evidence/area-existing-placeable-localized-strings-provenance-2026-08-19/`.
This is not localized-string CRUD completion: `Name` and `Description` remain
disabled/preserve-only until code-page, language/gender, and TLK fallback
semantics are source-closed and exact projection/writer/readback gates exist.
No Toolset or NWN claim is advanced.

## 28. Continued implementation checkpoint — 2026-08-19 (bounded existing Placeable LocName/Description mutation)

The source-closed subset admitted by
`area-existing-placeable-localized-string-mutation-audit-v1-2026-08-19.md`
is now implemented. An existing type-`9` Placeable field is editable only when
it is exactly one native `CExoLocString`, has `strRef=0xffffffff`, and contains
either no entries or one non-empty identifier-`0` printable-ASCII entry.
`LocName` is bounded to 256 bytes and `Description` to 4,096 bytes. Every
TLK-backed, multilingual, nonzero-identifier, empty-entry, non-ASCII, absent,
malformed, or over-budget shape remains preserve-only.

The frontend derives explicit `localizedName` and `description` targets only
from admitted immutable provenance and gates both controls independently.
Apply/OK/Cancel, clone, snapshot, undo, and redo preserve the complete raw
source pair. Backend projection, planning, writing, compilation, and readback
use exact ordered expected/target pairs bound to the immutable family ordinal.
The writer replaces only the selected native field, preserves every other GIT
field, and keeps the complete GIC byte-identical. Generic GFF rebuild also
preserves raw legacy string payload bytes for untouched fields.

Verification is green:

- backend focused 1,444/1,444; backend unit 3,820/3,820;
- frontend focused 136/136; frontend unit 2,731/2,731;
- frontend regression smoke 78/78 and viewport wiring 93/93;
- backend and frontend production builds passed;
- backend mutation 275/275 and frontend mutation 266/266, both 100% with zero
  survivors or uncovered active mutants.

The regression run also exposed and closed an independent renderer lifecycle
defect: Placeable recovery workers now stop at workspace unmount and do not
schedule browser-window timers after teardown. The two stale Runtime Settings
texture-index cases were migrated to the confirmed asynchronous generation
rebuild: all sources and paths are fixture-bounded, publication is awaited,
sessions are reacquired after global revocation, and backend E2E is now
10/10 suites and 113/113 tests. No runnable exact-provenance browser fixture
exists, so no UI runtime screenshot is claimed. Fresh exact-candidate Toolset
Save/Build/reopen, packed readback, NWN certification, native PathConnect, and
the full 99-tileset matrix remain open.

## 29. Continued implementation checkpoint — 2026-08-19 (existing Placeable `TrapType` and effective `traps.2da`)

The source-closed `TrapType : Byte` lane is implemented end to end. Native
identity is the zero-based physical row ordinal of one authoritative effective
`traps.2da`, not a web enum, label, ResRef, or row merge. The admitted table is
exact `2DA V2.0`, contains the four required columns, has 1..256 ordered rows,
and binds the Area-level catalog and every editable source to one descriptor
digest. `SetDC`, `DetectDCMod`, and `DisarmDCMod` are row-derived read-only
projections and are never written into the GIT.

The frontend replaces the old seven-option guess with the complete bounded
catalog and admits only exact `aurora_git` Placeable provenance. Backend
projection, planning, compiler revalidation, and the pair writer reject stale
digests or row counts, malformed catalogs, wrong family/type/case, absent or
duplicate native fields, invalid/unchanged rows, unknown keys, ordering drift,
and deletion collisions. The writer changes only the existing canonical Byte,
performs complete readback, and preserves every GIC byte.

Offline verification is green:

- backend focused: 1,472/1,472; backend unit: 230/230 suites and 3,897/3,897;
- frontend unit: 257/257 files and 2,751/2,751;
- frontend regression smoke: 10/10 files and 78/78;
- backend E2E: 10/10 suites and 113/113;
- backend and frontend production builds passed, with only the existing Vite
  chunk-size warning;
- effective-table mutation: 335/335 killed; backend `TrapType`: 147/147;
  frontend `TrapType`: 287/287; every gate scored 100% with zero survivors or
  uncovered active mutants.

The Playwright browser smoke authenticated successfully but the current local
runtime returned HTTP 500 for both Area-list requests, leaving zero exact Area
candidates. The captured UI correctly showed `Unexpected server error`; this
is durable blocker evidence, not `TrapType` runtime proof. Exact-candidate
Toolset Save/Build/reopen, packed readback, NWN certification, native
PathConnect, and the full 99-tileset matrix remain open.

## 30. Continued implementation checkpoint — 2026-08-19 (existing Placeable `VarTable` CRUD)

The Aurora-first audit for an existing type-`9` Placeable variable table is
source-closed and the complete native type set is implemented end to end. The
canonical storage is one optional `VarTable : List` of struct-type-`0` entries
with exact `Name : CExoString`, `Type : DWord`, and `Value` as Int, Float, or
CExoString for native types `1`, `2`, and `3`. Physical order and duplicates
are retained; an empty target removes the list exactly as Aurora's writer does.

The web safety profile admits at most 1,024 entries, name length 64 code units,
string-value length 4,096 code units, finite exact float32 values, signed i32
integers, and a 1 MiB combined text budget. Backend read provenance, process
fingerprinting, projection, stale planning, pair writing, readback, and compiler
integration fail closed on malformed or unsupported storage. Frontend contract
validation, immutable provenance, add/edit/remove/reorder reducers, Apply,
clone, cancel, undo, and the Advanced Variables editor use the same exact
profile and never sort, trim, normalize, or deduplicate entries.

Offline verification is green:

- backend focused domain/parser/projector/planner/writer/compiler:
  `1504/1504`;
- backend unit: `240/240` suites and `4089/4089` tests;
- frontend focused domain/application/mapper/HTTP/clone/dialog: `198/198`;
- frontend unit: `272/272` files and `2847/2847` tests;
- backend production build and frontend Vite production bundle passed;
- frontend regression smoke passed `77/78`; its one timing-sensitive auth
  failure passed immediately in an isolated rerun;
- the ordinary frontend `tsc` gate now passes after safely excluding
  non-indexable `DataView` texture payloads in `workspaceThreeRuntime.ts`.

Mutation analysis was not run because it requires explicit user opt-in. No
fresh admitted browser capture, Toolset Save/Build/reopen, packed readback, NWN
certification, native PathConnect result, or full 99-tileset result is claimed.
The frozen reverse contract is recorded in
`backend/docs/aurora-reverse/area-existing-placeable-variable-table-audit-v1-2026-08-19.md`.

## 31. Continued implementation checkpoint — 2026-08-19 (dynamic effective-catalog UTP Placeable Create)

The former single-template `plc_watertrough` construction limitation is now
supplemented by `effective-catalog-utp-placeable-copy-v1`. Runtime Settings
enumerates retail KEY/BIF UTP resources into repository-owned snapshot objects;
the effective catalog publishes exact object key, byte digest, GFF identity,
native TemplateResRef, and Tag. Synthetic `placeables.2da` rows remain visible
for preview but carry no persistable construction provenance.

Frontend mapping and drag/drop retain the stable catalog `templateId`
separately from native `templateResRef`, the exact source object key, digest,
and GFF identity. Saving a production Area draft preserves that complete
source record. Backend projection rejects unknown/missing/NUL provenance,
non-native identity, and Tag drift. Compilation re-resolves the current
effective winner by catalog ID/object key/digest and returns a stale conflict
when precedence changed; no client-supplied bytes or arbitrary object read is
accepted.

The pair writer copies the admitted UTP state into a new type-`9` GIT struct,
authors only X/Y/Z/Bearing from the scene, writes UTP Comment to the paired GIC
struct, applies recovered BodyBag/Static/OnClick defaults, copies canonical
PortraitId, converts legacy Portrait through one unique effective
`portraits.2da` physical row, retains supported VarTable, and rejects non-empty
ItemList until UTI dependency closure exists. The retail audit covers all 1,453
base UTPs and admits 1,450 under this bounded v1 profile.

Offline verification is green:

- backend focused writer/catalog/runtime/projector/compiler/portraits:
  `1276/1276`;
- frontend construction/catalog/drag-drop/payload/portrait/draft:
  `46/46`;
- renderer type-safety follow-up: `25/25`;
- complete backend unit: `240/240` suites and `4110/4110` tests;
- complete frontend unit: `274/274` files and `2876/2876` tests;
- frontend regression smoke: `10/10` files and `78/78` tests;
- backend E2E: `10/10` suites and `113/113` tests;
- backend and frontend production builds pass; the Vite chunk-size warning is
  unchanged.

Mutation analysis was not run without explicit opt-in. This checkpoint does
not claim a fresh browser asset-settle capture, packed GIT/GIC readback,
Toolset Save/Build/reopen, NWN execution, HAK/module-precedence proof,
PathConnect closure, or the complete 99-tileset matrix. The native authority,
corpus results, contract, and remaining certification matrix are frozen in
`backend/docs/aurora-reverse/area-placeable-dynamic-template-construction-audit-v1-2026-08-19.md`.

## 32. Continued implementation checkpoint — 2026-08-19 (resource-safe dynamic UTP runtime verification)

The first isolated runtime proof found that full supplement synchronization
bulk-read all vanilla Placeable MDL/PWK resources despite the existing
targeted model resolver. The owned proof services were stopped when memory
pressure became unsafe. Runtime Settings now synchronizes only the Placeable
catalog 2DA/UTP corpus on the catalog path, reads HAK UTP through the indexed
ERF resource reader, and leaves MDL/PWK plus referenced textures on the
targeted model path. Red-first service coverage is green at `44/44`; the
backend build passes. Live targeted synchronization stored 1,503 files and
13,684,942 bytes in 3.2 seconds: 1,497 UTP, six 2DA, and no bulk model files.

The effective catalog then resolved exact retail Water Trough from
`plc_watertrough.utp` and delivered lookup model `plc_n02`. A Playwright check
rendered the textured model and exposed one frontend classification bug:
source-MDL emitter metadata caused the inspector to label a generic model as
VFX. VFX admission now requires explicit catalog/render classification.
Catalog, inspector, and viewport focused tests pass `103/103`; the corrected
UI artifact is
`output/playwright/dynamic-utp-water-trough-catalog-classification-fixed.png`.
The same live record exposed creature `appearance.2da` metadata leaking onto a
Placeable ordinal (`Demon_Quasit`). All creature-only lookup enrichment is now
family-gated; its repository suite is `45/45` and the backend build passes.

The guarded CDP harness also produced a fresh strict settled `_winds_study`
frame: tiles 4/4 and Placeables 4/4 ready, zero failed/pending/bridge/fallback,
19/19 asset deliveries HTTP 200, camera coverage pass, and zero clipped
corners. Evidence is under
`backend/docs/aurora-reverse/evidence/area-dynamic-utp-placeable-create-2026-08-19/browser/`.
This closes local catalog/model delivery and Area renderer settlement only.
The dynamic profile also passes atomic immutable-snapshot publication and
independent persisted paired GIT/GIC readback in the `21/21` Area Update
integration suite. A packed MOD/HAK candidate, Toolset Save/Build/reopen, NWN
execution, HAK precedence, PathConnect, and the complete 99-tileset matrix
remain open. A current frontend build rerun is independently
blocked by an unused constant in concurrent dirty Placeable-light renderer
work; no change to that unrelated scope was made.

## 33. Continued implementation checkpoint — 2026-08-19 (packed dynamic Placeable candidate and clean-noop native continuation)

The dynamic Placeable lane now has a disposable packed MOD produced from an
independently built empty 2x2 Area source. Independent preflight readback of
`aw_dp_proof_01.mod` proves one exact type-`9` Placeable at ordinal zero with
`TemplateResRef=plc_watertrough`, `Tag=Water Trough`, `PortraitId=462`,
position `10,10,0`, and paired GIC `Comment=Water Trough`. Untargeted resources
are byte-identical and the ordered three-HAK lineage is bound by name and
SHA-256. The central bootstrap validator now owns an exact
`aurora-toolset-binary-dynamic-placeable-profile/v1` schema and its positive
and negative contract tests pass.

The central native runner completed dry-run, explicit-open startup admission,
preflight, module open, and exact `awdp01` Area open in one owned Toolset
session. Native Save then stopped fail-closed at
`module_not_dirty_before_save`: the offline-built MOD was clean and the Save
helper correctly refused to claim a dirty-to-saved transition. No Invalid
Locations or Inaccessible Objects dialog appeared, and no unchanged Save retry
was submitted.

Red-first offline work closed the resulting central continuation-contract
gap. The existing public clean-noop Area Properties continuation now admits
the exact dynamic Placeable profile without changing the historical model-
fixture behavior. Its pure admission validator rejects wrong profile version,
proof kind, source profile, profile digest, module lineage, and file timestamp;
for the Toolset-locked MOD it binds the preflight SHA-256 plus immutable file
stat and defers only post-close SHA-256 readback. The focused admission contract,
the complete central runner contract, both dynamic profile/builder contracts,
and the backend production build pass. Mutation tests were not run because
they were not explicitly requested.

No second live action was attempted: the exact Toolset module frame still
exists but is hidden, so the continuation's required one-visible-frame
precondition is false. The exact PID/window/failure packet, implementation
hashes, and safe-resume conditions are stored in
`backend/docs/aurora-reverse/evidence/area-dynamic-placeable-native-proof-2026-08-19/native/native-continuation-blocker.json`.
After authorized terminal handling of that session, the same immutable
candidate must be reopened, passed through the now-tested clean-noop
continuation, saved and independently read back, then captured on the exact
`awdp01` Placeable viewport. NWN remains a separate gate because the packed
module entry Area is `demo`, not `awdp01`.

## 34. Continued implementation checkpoint — 2026-08-20 (dynamic Placeable ItemList dependency closure)

The last retail dynamic-Placeable construction exclusion is closed offline.
The installed KEY/BIF corpus contains exactly three UTPs with a non-empty
`ItemList`: `plc_fenbush`, `plc_pilestones`, and `x0_treepine2`. Their ordered
profiles reference only `nw_it_msmlmisc11` and `nw_it_msmlmisc12`, with exact
repository Words `(0,0)` and `(1,0)`. The retail bytes, SHA-256 values, GFF
identity, ordered UTP lists, and both exact 17-field UTI profiles are frozen in
the dynamic-construction audit and its machine-readable evidence packet.

The effective catalog now resolves each UTI through the current effective item
winner, reads only its repository-owned object key, recomputes its recorded
digest, and returns defensive internal byte copies. No dependency bytes or
host paths cross the HTTP boundary. The compiler revalidates and carries the
bounded closure. The Area pair writer independently requires the exact admitted
UTP manifest, dependency order/digests, UTI identity, field order and semantic
profile, then emits Aurora's full mode-2 nested item struct with preserved
repository coordinates. Missing, stale, malformed, reordered, duplicated, or
unsupported dependencies fail closed. Empty inventory behavior is unchanged.

This supersedes checkpoint 31's historical `1450/1453` result: the bounded
offline construction profile now admits all `1453/1453` installed retail UTPs
without claiming arbitrary custom UTI support.

Verification for this slice:

- focused domain/catalog/compiler/pair-writer tests: `881/881` passed;
- backend production build passed;
- the resource-capped complete unit run reached `238/245` suites and
  `3940/3941` executed tests passing. One unrelated lighting-proof fixture did
  not generate its expected blocker JSON; six other unrelated large suites
  exhausted the mandatory 1 GiB Jest worker cap;
- the complete and Area-only E2E invocations exhausted the same mandatory
  TypeScript/Jest worker cap before executing tests, so no new E2E pass is
  claimed;
- mutation analysis was not run because it was not explicitly requested.

No hidden Toolset session was changed and no new Toolset Save/Build/reopen,
packed readback, NWN execution, PathConnect closure, or 99-tileset matrix proof
is claimed by this checkpoint.

## 35. Continued implementation checkpoint — 2026-08-20 (`area-capabilities.v1`)

The program now has one deterministic, machine-readable capability ledger
instead of deriving progress from prose checkboxes. The authenticated
`GET /api/v1/areas/capabilities` query publishes 79 lexicographically ordered,
bounded rows across lifecycle, topology, properties, objects, workspace,
render, connectivity, and certification. Each row separates Aurora evidence,
implementation state, and release state and links to repository test/proof
artifacts. Catalog construction, both boundary validators, and the frontend
availability resolver fail closed on absent rows, unknown keys, duplicate or
unsorted IDs, inconsistent summaries, missing verified evidence, and any
blocked or hidden release state.

The current reviewed ledger reports 36 implemented, 34 partial, three
preserve-only, and six not-started capabilities. Release state is stricter:
31 are available, 42 blocked, and six hidden. Therefore 43 of 79 capability
rows still require implementation work and 48 of 79 still require either
implementation or certification before release. These counts are derived
from the rows and are now visible in Areas Mode after authentication; they are
not calendar estimates or claims that all available rows have native runtime
proof beyond the evidence recorded per row.

Verification for this slice:

- backend catalog validation and repository-reference integrity: `12/12`;
- frontend domain, facade, HTTP adapter, panel, and Areas Mode integration:
  `22/22`;
- frontend regression smoke: `10/10` files and `78/78` tests;
- backend and frontend production builds passed; the existing Vite chunk-size
  warning remains;
- live host-local login and authorized endpoint query returned schema
  `area-capabilities.v1`, revision `2026-08-20.1`, and the exact 79-row
  summary; the same endpoint without a bearer token returned HTTP 401;
- Playwright authenticated into Areas Mode and rendered the exact summary.
  The saved UI artifact is
  `output/playwright/area-capability-catalog-2026-08-20.png`.

One rerun of the pre-existing broad `http-controllers.spec.ts` exhausted the
mandatory 1 GiB Jest heap during TypeScript/Jest loading. Its capability
endpoint assertions had passed earlier in this slice, and the later live
authorized/unauthorized requests independently exercised the registered
route. No heap limit was raised. Mutation analysis was not run because it was
not explicitly requested. This checkpoint does not claim a new tile-render
settlement capture, native Toolset Save/Build/reopen, NWN traversal,
PathConnect closure, or the complete 99-tileset certification matrix.

## 36. Continued implementation checkpoint — 2026-08-20 (connected terrain selection and resource-safe `tcn01` Create)

Areas Mode now supports deterministic connected-terrain selection as an
explicit web editor extension: primary-button double click in Inspect/select
mode selects the four-neighbour component whose tiles share the anchor's
exact `SceneTile.terrain`; diagonal-only neighbours are excluded, the anchor
is retained as the final selection entry, object selection is cleared, and
invalid, duplicate, or over-budget input fails closed without adding scene
history. The existing Shift-drag rectangle selector remains available. The
capability ledger revision is now `2026-08-20.2`: 38 implemented, 33 partial,
three preserve-only, and five not-started rows; release state is 33 available,
41 blocked, and five hidden.

The live Create flow exposed a separate resource-safety failure in the active
CEP `tcn01.set`. `TILE510` declares `Doors=1634169902`; the parser previously
constructed an array of that declared size before validating whether the SET
could physically contain the referenced sections. Every SET Count field is
now bounded by the physical section budget before iteration, door hooks use a
non-allocating loop, and group `rows * columns` is checked with safe arithmetic
against the section payload. The exact active 677,512-byte HAK resource now
parses 1,460 tiles and 295 groups with one bounded
`INVALID_DOOR_HOOK_COUNT` diagnostic and about 2 MB of heap growth instead of
exhausting the managed 1 GiB backend.

Area listing was also separated from full detail hydration. Snapshot indexing
now records lightweight candidate/list metadata without resolving Placeable,
Door, Creature, Item, or Sound template catalogs. Full catalog-backed records
are hydrated and cached only for detail access; preview, topology, thumbnail,
and lighting lookups use the lightweight repository path. Tests prove that
listing invokes none of the five catalog resolvers while detail hydration does.

Verification for this slice:

- the combined SET parser, snapshot repository, Areas service, and capability
  catalog gate passes `67/67` tests;
- the connected-selection hook suite passes `21/21` tests and the frontend
  regression smoke remains `78/78`;
- backend and frontend production builds pass; the existing Vite chunk-size
  warning remains;
- after fresh authentication, the browser created local Area
  `selection_proof` as exact `tcn01` / 4x4 without a backend restart or OOM;
- after terrain request settlement, a primary-button double click selected
  `16/16` tiles with anchor `Row 1, Column 1 (Tile_ID 953, Orientation 1,
  Height 0)`. The saved interaction artifact is
  `output/playwright/area-connected-terrain-selection-2026-08-20.png`;
- the owned Playwright browser and managed frontend/backend services were
  stopped, and ports 3000 and 5173 had no remaining listeners.

This is a browser interaction and resource-safety proof, not a fresh strict
tile-render parity capture. The current canvas geometry was visible, but its
exact model-delivery state was not certified under the guarded capture safety
contract. No Toolset/NWN process was opened, no Save/Build/reopen or packed
GIT/GIC readback was attempted, and PathConnect plus the complete 99-tileset
certification matrix remain open. Mutation analysis was not run because it was
not explicitly requested.

## 37. Continued implementation checkpoint — 2026-08-20 (versioned unified workspace diagnostics report)

The pre-existing `Export Report` action no longer downloads only top-level
tile/object counts. It now builds the bounded, deterministic
`area-workspace-diagnostics.v1` document through a pure application service.
The report contains exact Area identity and revision, ordered cell diagnostics,
ordered object diagnostics, current tile/object selection, per-kind renderer
status counts, scoped tile resource-contract counts and entries, a normalized
issue ledger, and a compact summary. Selection ids that do not exist in the
current scene are omitted. Tile readiness from another Area is never published
as current evidence; it produces an explicit `RESOURCE_READINESS_STALE` issue.

The builder rejects non-canonical timestamps, invalid dimensions, duplicate
tile/object ids, more than 65,536 cells or objects, and more than 4,096 resource
entries. It does not mutate the scene, readiness, or selection inputs. Download
filenames are normalized and bounded. Export success/failure telemetry now
includes schema version or fail-closed diagnostic code, plus report issue and
resource status counts.

Capability catalog revision `2026-08-20.3` therefore promotes
`workspace_diagnostics` from partial/blocked to implemented/available. The
reviewed summary is now 39 implemented, 32 partial, three preserve-only, and
five not-started capabilities; release state is 34 available, 40 blocked, and
five hidden. Thus 40 implementation rows and 45 release/certification rows
remain open.

Verification for this slice:

- TDD red was recorded against the old six-field status report;
- the pure report contract and hook download integration pass `6/6` new tests;
- the focused report plus existing command-hook gate passes `11/11` tests;
- the capability catalog gate passes `12/12` tests;
- the complete frontend regression smoke passes `10/10` files and `78/78`
  tests; existing React `act(...)` warnings remain non-failing;
- frontend and backend production builds pass; the existing Vite chunk-size
  warning remains.

This checkpoint does not claim a live browser download capture, Toolset/NWN
proof, tile-render settlement, PathConnect/WOK closure, or completion of the
99-tileset certification matrix. Mutation analysis was not run because it was
not explicitly requested.

## 38. Continued implementation checkpoint — 2026-08-20 (immutable-row release report generator)

The certification domain now generates an exact
`area-certification-release-report.v1` document from the existing validated
row contract. The input binds a lowercase SHA-256 plan id, corpus hash, profile
id, and canonical generation timestamp. Rows are independently validated,
ordered by `rowId`, and required to match the same plan/corpus/profile identity.
Duplicate row ids, unknown or missing row/proof/identity keys, malformed plans,
non-canonical timestamps, identity mismatch, and more than 100,000 rows fail
closed with diagnostic error codes.

The immutable output includes the full ordered ledger, the existing aggregate,
ready/blocked/excluded/development row ids, exact failed/missing rows per proof
dimension, release blocker codes, a ledger SHA-256, and a report SHA-256. Input
row order cannot change either digest. A ledger with no eligible production
rows yields `no_production_eligible_rows`; any incomplete production row yields
`production_rows_incomplete`. Only a non-empty ledger whose every eligible
production row has all eleven proof dimensions verified receives report status
`ready`.

Capability catalog revision `2026-08-20.4` promotes
`certification_release_report` from not-started to implemented, but deliberately
keeps it hidden with blocker `immutable_row_ledger_incomplete`. No release claim
was promoted. The catalog now reports 40 implemented, 32 partial, three
preserve-only, and four not-started capabilities. Thirty-nine implementation
rows and 45 release/certification rows remain open.

Verification for this slice:

- TDD red recorded the missing generator and then the three exact-key admission
  gaps;
- the release-report suite passes `10/10` tests;
- the combined row contract, generator, and capability catalog gate passes
  `33/33` tests;
- the backend production build passes;
- mutation analysis was not run because it was not explicitly requested.

This generator is ready for the successor ledger but does not create or pretend
to complete that ledger. The immutable successor plan, 53,136 render rows,
52,767 connection rows, Toolset/NWN proof, PathConnect/WOK closure, and final
release report artifact remain open.

## 39. Continued implementation checkpoint — 2026-08-21 (bounded immutable-plan membership)

The certification domain now builds `area-certification-plan.v2` references
from an exact row-seed set. The plan binds the corpus hash, profile id, exact
row count, and a SHA-256 over every ordered row's capability, release scope,
eligibility, and subject identity. Its `planId` is independently derived from
that complete immutable core. Input order and later proof progress cannot
change the plan identity, while a changed row, capability, scope, eligibility,
or subject must change it.

The builder validates exact keys, proof dimensions, subject kinds, duplicate
row ids, corpus/profile identity, and the 100,000-row per-plan payload budget,
then emits an ordered, deeply frozen seed ledger whose identities carry the
derived plan id. The render and connection ledgers therefore fit as separately
bounded plans; silently combining more rows than the declared budget fails
closed.

The release-report admission path now closes a gap in the v1 contract. A v2
report verifies the plan-id derivation, exact row count, and exact planned-row
fingerprint before aggregation. A missing row yields
`plan_row_count_mismatch`; changed membership or semantics yields
`plan_rows_fingerprint_mismatch`; a forged plan id yields
`invalid_plan_id_binding`. Legacy `area-certification-plan.v1` inputs remain
readable for compatibility but always carry blocker
`unbounded_plan_membership` and can no longer receive release status `ready`.

Capability catalog revision `2026-08-21.1` promotes
`certification_immutable_plan` from partial to implemented and retains release
blocker `successor_plan_generation_pending`. The catalog now reports 41
implemented, 31 partial, three preserve-only, and four not-started
capabilities. Thirty-eight implementation rows and 45 release/certification
rows remain open.

Verification for this slice:

- TDD red recorded the missing plan module and the prior unbounded v1 release
  behavior;
- the immutable-plan suite passes `4/4` tests;
- the complete certification contract, plan, and release-report gate passes
  `25/25` tests;
- the capability catalog gate passes `12/12` tests;
- the focused Areas e2e regression passes `19/19` tests;
- the backend production build passes;
- a repository-wide two-worker e2e attempt completed with `4/10` suites and
  `55/55` executed tests passing, while six unrelated large suites terminated
  when their Jest workers reached the mandated 1 GB heap cap; the cap was not
  raised or bypassed;
- mutation analysis was not run because it was not explicitly requested.

This checkpoint implements the fail-closed freezing mechanism. It does not
claim that the actual successor render/connection plans have been generated,
that the July matrix checkpoint is current, or that any missing Toolset/NWN,
PathConnect, WOK, render, or runtime proof has been completed.

## 40. Continued implementation checkpoint — 2026-08-21 (full successor catalog and immutable matrix plan)

The complete offline tileset corpus is now compiled through the canonical SET
parser into `aurora-tileset-definition-catalog/v1`. The catalog binds the exact
selection inventory, every source SET file, every sharded definition, and exact
membership through SHA-256 values. Its catalog id is
`4955c0a52001a342df14770bb8c7a25acda50d47153891127def8225e90f9c71` and
its selection-inventory SHA-256 is
`2eb54fec19a713cde2a92d2f90c1c5056dbb66c4abf3c7ce1837d9d164063086`.
It contains exactly 99 tilesets, 53,700 tiles, 6,695 groups, and 15,039 parser
diagnostics. The immutable catalog is stored under
`output/proof/area-tileset-definition-catalog-v1-2026-08-21`.

The matrix compiler now accepts that catalog through the bounded
`plan-catalog` command. It validates every catalog, source, definition, and
inventory hash before creating output, processes one tileset at a time, emits
3,890 independently validated chunks, and streams a compact monolithic
manifest without exceeding the mandated 1 GB Node heap. The generated
`path-node-aware-v5` successor plan is stored under
`output/proof/tile-add-connect-matrix-v5-offline-catalog-2026-08-21`; its exact
plan id and manifest SHA-256 are both
`d8564bfb48b247052a92c158ad34050c04a423be43655bf75aff3df3bde88283`.
This replaces the stale v2 plan
`c4d6d80658e93d62f5ed154a0feadc1d236453d9fb4fb12720e10fe4f53b2db0`.

The new plan contains 99 tilesets and 53,700 rows: 53,136 Add cases and
52,767 Connect cases are planned, with 2,802 direct chunks, 1,088 group
chunks, 2,429 group fixtures, and 9,114 group rows. Reference comparison
reports 39,093 matches, 4,353 mismatches, 207 unknown rows, and 10,047 rows not
evaluated. Nine hundred thirty-three rows remain blocked. PathConnect remains
honestly blocked for all 53,700 rows; no PathConnect acceptance is inferred
from SET topology. The plan is validation-ready with no structural errors,
but its checkpoint is deliberately still `0/3890` and runtime proof is
`missing`.

Capability catalog revision `2026-08-21.2` promotes both
`certification_immutable_plan` and `certification_all_tilesets_inventory` to
implemented/available. The reviewed summary is now 42 implemented, 30 partial,
three preserve-only, and four not-started capabilities. Thirty-seven
implementation rows and 43 release/certification rows remain open.

Verification for this slice:

- TDD red was recorded for the missing catalog-plan path and exact tamper
  rejection;
- all five tile path/connect proof script gates pass;
- the capability catalog gate passes `12/12` tests;
- the backend production build passes;
- the full v5 status validation passes under the mandated 1 GB heap;
- two guarded CDP capture attempts for the first group chunk failed closed and
  did not advance the checkpoint. The first detected an in-flight
  `tileProcessBatch` request; the second detected a terrain snapshot that
  returned to partial while unrelated seed-grid models were still settling;
- mutation analysis was not run because it was not explicitly requested.

This checkpoint closes the successor-plan and complete-inventory stage. It does
not claim render acceptance, visual coverage, Connect acceptance, PathConnect,
WOK, Toolset Save/Build, or NWN runtime proof. No Toolset or NWN session was
opened. Failed browser attempts remain `missing/failed`, never `verified`.

## 41. Continued implementation checkpoint — 2026-08-21 (proof-stable real-UI Area seed and first accepted v5 chunk)

The real New Area UI now exposes a development-only, visible initializer
selector. Normal local Area creation remains on the existing deterministic
Aurora-LCG policy. The matrix proof route explicitly selects
`first-compatible` through that rendered control, so all initial cells request
one compatible SET model instead of scheduling unrelated variants before the
declared underlay and group fixtures are applied. The capture harness records
the selected initializer and fails closed if the development control is
missing or cannot be read back. No production initializer semantic, persisted
Area contract, or Aurora Wizard parity claim changed.

TDD first recorded the absent control. The focused panel suite now passes
`23/23`, the capture safety contract passes, and the frontend production build
passes with only the existing Vite chunk-size warning. The matrix capture was
then exercised through the ordinary visible New Area form and visible
diagnostic fixture commands. Attempt 3 correctly failed without advancing the
checkpoint after the separately owned frontend proxy process disappeared and
CDP recorded `net::ERR_CONNECTION_REFUSED`; the backend model sources and the
three responses completed before that infrastructure failure were not
misclassified as verified proof.

After the managed frontend was restarted, attempt
`atj02-group-chunk-0001.attempt-0004` passed every strict automated gate and was
staged. Independent inspection of the exact canvas and page PNGs confirmed the
complete 8x2 footprint, the declared 2x2 group and two declared 1x2 groups,
legible source-backed geometry, accepted framing, and no unexpected blank,
failed, bridge, or placeholder tile. The artifact-bound review SHA-256 is
`b14365f4499ac12fe298b43fea374bfb3aff0caf2442c00cb5f28f040273b3d9`.

The accepted frame records 16/16 loaded tiles, zero pending tiles, zero failed
tiles, zero bridge tiles, 372 visible meshes, 372 materials and material maps,
9/9 ready unique model contracts, ready mutation and post-capture settlement,
and a ready presented-frame fence. All eleven observed tile-process requests
returned HTTP 200 and none remained in flight. The exact canvas SHA-256 is
`19183338ee228d7b6c3aa2d2ed3744a6e6ce10b96fa219e7cae0c342bc05ff17`;
the exact frame SHA-256 is
`ba0728fc431b10409d72846865b2813f1bcb1c7fef93bbc619e6142aff5543e0`.

The immutable v5 checkpoint is now `1/3890`. Add/render coverage is eight
captured group-member rows plus 564 named blocked rows; 53,136 rows require
capture in total. This is the first fresh successor-plan proof and establishes
that the complete capture, strict validation, independent visual review, and
atomic checkpoint transition work end to end. It does not complete the matrix
and does not claim Connect, PathConnect, WOK, Toolset Save/Build, or NWN
runtime evidence. PathConnect remains `0` accepted and `missing`.

## 42. Continued implementation checkpoint — 2026-08-21 (source-water extent clearance and fourth accepted v5 chunk)

The second and third `atj02` group chunks completed the same strict capture,
independent review, and atomic acceptance path. Their accepted review
SHA-256 values are respectively
`086dce84ca0ad2bf3ce892898696510213256be1c5cfdec7a63a11b4398e836b`
and
`8f0ee2d26a8e00aa27482bb77dead8c1135b164d8bcfaca791d9ad4c2f07a5ad`.
Both retained zero pending, failed, bridge, or placeholder tiles after final
settlement.

The first capture of `atj02-group-chunk-0004` was deliberately rejected by
independent visual review instead of advancing the checkpoint. Although all
twelve tile contracts reported ready, the exact canvas showed full-cell black
voids where the seven group member definitions declared water. Rejection code
`DECLARED_WATER_TERRAIN_RENDERED_AS_BLACK_VOID` is retained under review
SHA-256
`0922a817bb93cd2696b63b59d17d546c6031ffbd00ed349611919fbe4aa14efd`;
the rejected canvas SHA-256 is
`ee8b5feba448c91709376520196d0ef3abf2033018987b99c8afacefea91c383`.

Aurora-first investigation then bound the fault to exact source content rather
than inventing a replacement surface. Source model `atj08_a03_01.mdl`,
SHA-256
`307cb2111983d07e5487a6ef5f3538c20373c7d43985fd3caa09cea3b3eb2c32`,
contains the rendered, upward-facing `WaterPlane03v` at source Y `-1` and
`UnderWater03v` at source Y `-3.4`. The exact `atj01_water01` texture decodes
successfully and is not black. The defect was Aurora Web's opaque extent fill
at workspace Y `-0.018`: the source-ground classifier omitted `water`, so the
fill remained above and occluded the scaled water plane at Y `-0.1`. The
durable reverse audit is
`backend/docs/aurora-reverse/area-source-water-plane-extent-occlusion-audit-v1-2026-08-21.md`.

TDD first recorded the missing classification. The shared terrain renderer now
admits explicit source `water` tokens through the same asset-identity-neutral
ground predicate used for other source surfaces. It does not branch on the
tileset, group, tile, model resref, or filename and does not synthesize a
replacement plane. Runtime diagnostics now publish `extentFillStatus`, the
admitted source-ground count, minimum source-ground Y, and final fill Y. The
focused ceiling/ground and material suites pass `37/37`, and the frontend
production build passes with only the existing Vite chunk-size warning.

Fresh attempt `atj02-group-chunk-0004.attempt-0002` then loaded `12/12` tiles,
applied `12/12` material contracts, retained zero failed and zero bridge tiles,
and reported `extentFillStatus=source_ground_clearance`, 97 admitted source
ground surfaces, minimum Y `-0.34`, and final fill Y
`-0.35800000000000004`. Independent inspection of the exact 4x3 canvas and
page images confirmed both complete declared ship groups, visible gray-blue
source water under all seven water member tiles, accepted framing, and no
unexpected blank, failed, bridge, or placeholder member tile. The four tiny
camera-fit outliers were independently reviewed and did not clip or hide the
declared fixtures.

The accepted review SHA-256 is
`d1bbb363a2b52e5334347df6d9de155e4e24e0e35a83cff3f6f8f60b60416093`;
the exact canvas SHA-256 is
`9e95a91c58960b64380b73b2241e5576e56a6fd7c35a69ad24e5b52e40ef2a17`;
the exact frame SHA-256 is
`1a91369a62d1bc73c1179f377dfaded59f6da0377bec55a81fe2b8d3fae7a6ca`.
The immutable v5 checkpoint is now `4/3890`, with 29 captured add/render group
rows and 3,886 chunks remaining. This acceptance is add/render proof only.
PathConnect remains exactly `0/52767`, and no Connect, WOK, Toolset Save/Build,
or NWN runtime completion is inferred. No Toolset or NWN process was opened.

## 43. Continued implementation checkpoint — 2026-08-21 (fifth and sixth accepted v5 group chunks)

`atj02-group-chunk-0005` and `atj02-group-chunk-0006` have now completed the
strict capture, exact-artifact inspection, independent visual review, and
atomic acceptance path. Each capture is an 8x2 Area containing three declared
groups with eight member tiles. Both settled with 16/16 tile contracts loaded,
zero pending, failed, or bridge tiles, 16/16 material contracts applied, and
accepted camera framing. Independent inspection confirmed every declared
group boundary and member cell, with no unexpected blank, placeholder,
replacement, or clipped fixture.

The first cold attempt for chunk 0005 failed closed after the capture budget
with blocker `areas_runtime_snapshot_stale_or_missing`. At that point 10 of 11
tile-process requests had returned HTTP 200 and the final request was still in
flight. Backend diagnostics subsequently recorded that final request as HTTP
200 about three seconds after the failed capture, after approximately 22.2
seconds of processing. That completed, observable cache state was a material
change and admitted one non-blind retry. Attempt
`atj02-group-chunk-0005.attempt-0002` then settled and passed. The failed cold
artifact remains retained; it was not promoted or overwritten.

Chunk 0005 is bound to independent visual-review SHA-256
`d5bf5113a83460346b48dd423a7e53acfe8e357e48ee18353a63516b8bdd931f`.
Its exact frame, state, canvas, page, and lifecycle SHA-256 values are,
respectively,
`ad4fd5be661f9e8d28cdb32fb161b1681826a7b56a7e36cbbd9d90925ed3e0a9`,
`5ebba5f037379cfb8ff3122df33f47451c693f0d88b17b075d63176ea9376e10`,
`230de2293c514ef41b133fa33b112d863af3a35ab0907b7fb9987fb83a39eb36`,
`999d523b3d0b18485a4a341baff1e0b87d261ac29f1c133440f0a8612c321298`,
and
`49e137a8b5d5c212c5a64fe815838d92fa5cdfa59e2b9a9859786524e29a4b91`.

Chunk 0006 passed its first retained capture and is bound to independent
visual-review SHA-256
`53dd89feaeb57799badea6a65b8e405cc563e9c8564a87fc61e6721e64bf9a38`.
Its exact frame, state, canvas, page, and lifecycle SHA-256 values are,
respectively,
`c42a5c9a9659fdaefc565db02fd280a3c51a1455ac37f4485b96814977d535f0`,
`a79da085464536cb3a31dbbe16444107a42b0a9404ef0afe8034f622a3125471`,
`bb146621046f376013236a7d6402ee72ec43ea7e29b472b5065e05a981b80769`,
`3019c6a783c9765ef0a99f556e697f72c8d16ba455ba121e3c09994af9263285`,
and
`21b092e0c744c29d66f41c8849bfd67d35cfb8a1da8bf5b644876bc58503f527`.

The immutable v5 checkpoint is now `6/3890`, with 45 of 53,136 required
add/render rows captured and 3,884 chunks remaining. This checkpoint accepts
add/render evidence only. Native PathConnect remains exactly `0/52767`; no
Connect, WOK, Toolset Save/Build, packed readback, or NWN runtime completion is
inferred. No Toolset or NWN process was opened.

## 44. Continued implementation checkpoint — 2026-08-21 (`transparencyhint` source-pixel gate and seventh accepted v5 group chunk)

`atj02-group-chunk-0007` exposed a second, distinct source-water defect after
the extent-fill clearance correction. The first capture failed closed when
the managed frontend disappeared and the rendered New Area panel reported
`Failed to fetch`. After the frontend restart, the next cold capture failed
closed with one tile-process request still in flight; backend diagnostics
recorded its HTTP 200 completion about two seconds later. Neither failure
advanced the checkpoint.

Attempt `atj02-group-chunk-0007.attempt-0003` then settled every automated
contract but was independently rejected. Exact visual inspection showed large
pure-black regions localized to all four `ShipDocked01_2x2` member cells. The
rejection is bound to review SHA-256
`4301ad8162f0e71435fb4fb68cbb27665d33bde94ac45071fe79a340f54d7fc6`.
Expanded diagnostic attempt 0004 reproduced the byte-identical black canvas
and was also rejected, under review SHA-256
`93180881729dad1086243169e38d29536c59b76c32fb68b3b36bb3ea8bb21341`.

Aurora-first inspection bound all four group models to real authored
`atj01_water01` planes and a ready exact source texture. The bitmap has no
alpha, RGB range `55..99`, and zero source pixels whose three channels are at
or below 12. The extent backing was already correctly below water at
`Y=-0.118`. The expanded runtime state instead proved that all four water
materials were forced to `cutout`, with `alphaTest=0.1`, only because their
source material declares `transparencyhint=1`. Aurora Web's browser-owned
shader discarded ordinary dark water using a broad linear-luminance threshold
and exposed the black backing. Decompiled retail evidence proves the field is
parsed but does not prove that every opaque texture with the field uses such a
black key. The durable audit is
`backend/docs/aurora-reverse/area-transparencyhint-source-water-black-key-audit-v1-2026-08-21.md`.

The shared material loader now admits the `transparencyhint` near-black
color-key path only when sampled RGBA source pixels contain actual near-black
evidence (`R<=12`, `G<=12`, `B<=12`). Missing pixel evidence and opaque dark
textures without a key remain opaque. The shader uses the matching
maximum-channel threshold in the texture's working color space instead of
broad scene luminance. Runtime material diagnostics retain the coverage
status, near-black ratio, and sampled-pixel count. This rule is neutral to
tileset, group, tile, model resref, texture resref, and water naming.

TDD first recorded the dark opaque `transparencyhint` regression. The two
focused `transparencyhint` tests pass, including preservation of a real
black-key atlas. The terrain ceiling/ground and material suites pass `37/37`.
The complete texture-mapping file now passes all 44 task-relevant tests; its
two pre-existing source-MDL color-space expectation failures were present in
the red run and are unchanged. The frontend production build passes with only
the existing Vite chunk-size warning. Mutation testing was not run because it
was not explicitly requested.

Fresh attempt `atj02-group-chunk-0007.attempt-0005` renders the complete
Windmill_2x2, Warzone_1x2, and ShipDocked01_2x2 fixtures. All four ship-water
cells have an exact pure-black ratio of zero. The capture records 16/16 loaded
tiles, zero pending, failed, or bridge tiles, 16/16 applied material
contracts, 332 visible meshes, 335 materials and material maps, ready mutation
and post-capture settlement, a ready presented-frame fence, and 13/13
tile-process HTTP 200 responses with none in flight. The alpha-test material
count fell from 30 in the rejected capture to 26, exactly removing the four
unsupported water cutouts.

The accepted independent review SHA-256 is
`8137b7b0d0d868103b90ffb5072447bf929322b2cf43b2903946800e8df7f5c3`.
The exact frame, state, canvas, page, and lifecycle SHA-256 values are,
respectively,
`ab88ad2fa5c57ce721c4c91375a8662af30bf17b15e29d54d8e0d3980c167936`,
`d466aec59e327f06a389c8bdb99e76aa63f474316cab12e13b022cb5dee8f036`,
`1d0129ab20cc039c05a838c5c81e51e3502987c3f09be5f95e880b7c1d535bd3`,
`db6ef9d9ee72810132abd6e1ed5b3c27f2f9054cf520a73e13d185576948bd13`,
and
`c7ad26833d47525039f8ccadc9ea4cb6e08be485768f54bc6bed16b2f650c268`.

The immutable v5 checkpoint is now `7/3890`, with 55 of 53,136 required
add/render rows captured and 3,883 chunks remaining. The next exact chunk is
`atj02-group-chunk-0008`. This acceptance is add/render evidence only. Native
PathConnect remains exactly `0/52767`; no Connect, WOK, Toolset Save/Build,
packed readback, or NWN runtime completion is inferred. No Toolset or NWN
process was opened.

## 45. Continued implementation checkpoint — 2026-08-21 (eighth through tenth accepted v5 group chunks)

Three more immutable `atj02` group chunks passed guarded real-UI capture,
renderer settlement, exact artifact binding, and independent visual review.
Together they advance the durable v5 checkpoint from 7 to 10 without changing
the matrix plan, contract fingerprint, or tileset definition fingerprint.

`atj02-group-chunk-0008` passed its first retained capture. Its complete 8x2
fixture contains the six declared members of groups 3, 36, and 37. Runtime
reported 16/16 loaded contract tiles, zero pending, failed, or bridge tiles,
340 visible meshes, 340 materials and maps, 7/7 ready tile-process candidates,
23/23 HTTP 200 responses, and ready mutation, post-capture, and presented-frame
settlement. The accepted review SHA-256 is
`584f03a8629a0957374d99d8626517c97479df04adea75058d3be3a165a8712e`.
Its frame, state, canvas, page, and lifecycle SHA-256 values are, respectively,
`12831978bf0350fc4b7b7f22e9c244ef6453a6c43c7573ef78c48d248c637a23`,
`20c06fe66fd13549cf3b7f7df5768c0ae49b4627e6dd7198b95eb105d5c3a495`,
`9d981c3b33fae2c21a9b87d46da47acc4249350f55fc9ae6b6237aa124eda367`,
`81c373945b277b7ca8564df83b9116b48448fcedb43eb41fef1da243a78a51a7`,
and `f2e30a43d9582faea189f5b544d993e34e4a71701fc33f9967b9db08dfe5c99e`.

The first cold capture of `atj02-group-chunk-0009` failed closed while source
conversions were still pending and did not advance the checkpoint. The second
attempt settled and rendered all ten declared members: the circular group38
Temple02_2x2 fixture and the six-cell group40 cross-shaped temple. Its accepted
review SHA-256 is
`d9dde92de001fcc67162adadac8b608db9db195583399f1105982a8c3ee9652e`.
Its exact frame, state, canvas, page, and lifecycle SHA-256 values are
`f3ce69bbe1129263d7228752526f1be7545acb69551dffd82789772051d46c41`,
`062640fd437a8bd63b0fcb605c95399fc7fcaf6219f3b064f1dc377598131aff`,
`16aa8ebbd7eb38a245d41b6df7a0a02fe1685124239ce4f2f53e80d05884853e`,
`3b801247b85dbaa7c350fcfae160c71a49f134e08f40458f2040183c6f886aa4`,
and `a653fa168e8ed8a8df70e7bf81bf93d44c524889bd1d2fb790558d47469a18b8`.

For `atj02-group-chunk-0010`, the first cold attempt failed closed with only
8/10 tile-process candidates ready. Attempt 0002 was interrupted when the
managed frontend disappeared; it neither staged evidence nor advanced the
checkpoint. After a managed frontend restart, attempt 0003 settled with 16/16
loaded contract tiles, zero pending, failed, or bridge tiles, 388 visible
meshes, 396 materials and maps, 10/10 ready candidates, 12/12 HTTP 200
responses, and all three settlement gates ready. Independent inspection found
the complete ShipDocked02_2x2, House2_1x2, and Exit02_2x2 fixtures and all nine
non-null declared members.

The dark interior of Exit02 was checked Aurora-first instead of being assumed
valid. `atj02.set` lines 17320-17327 identify group57 as `Exit02_2x2`; the
exact source model `atj12_o10_01.mdl` assigns `atj01_chasm01` and
`atj01_black00` to its interior geometry at lines 162-169, 1336-1395, and
1841-1850. It is therefore an authored rock-framed chasm, not an unexpected
blank, failed, bridge, placeholder, or recurrence of the unsupported water
black-key path. The accepted review SHA-256 is
`c9d8d53418e473e7820a39fe8f8f24e22bab1869b02474dc88aeeca1169275b3`.
Its exact frame, state, canvas, page, and lifecycle SHA-256 values are
`58feb7aad01ff5a25192040f84f6d06d0579937d2c01096f00820323e87b2426`,
`cc552fd1217285d14e00993870a402a0cd02fdd7bea2daa295cb209de400a1ec`,
`f7443a78da7d982618be9db88bf473567bd18cef9ae310d5d53ae717f27e76d5`,
`c5929e37c882beb9a680bcb65f73f479bfefe45a27532aebedd627b24a02915a`,
and `c126bfe4a976342d1ce481d3d857fb90ca4c463999ab9f92680fe6ba70ca8c98`.

The authoritative controller now reports checkpoint `10/3890`, 78 unique
captured add/render rows of 53,136 required rows, and 3,880 chunks remaining.
The accepted fixtures contain 25 member placements; the coverage counter is a
unique immutable-row counter and therefore does not double-count row IDs that
occur in more than one group fixture. The next exact chunk is
`atj02-group-chunk-0011` (8x2, three fixtures, eight member placements). Native
PathConnect remains exactly `0/52767`; these acceptances do not infer Connect,
WOK, Toolset Save/Build, packed readback, or NWN runtime completion. No Toolset
or NWN process was opened.

## 46. Continued implementation checkpoint — 2026-08-21 (eleventh and twelfth accepted v5 group chunks)

Two more immutable `atj02` group chunks completed guarded real-UI capture,
full renderer settlement, exact-artifact binding, independent visual review,
and atomic acceptance. Both preserve plan ID
`d8564bfb48b247052a92c158ad34050c04a423be43655bf75aff3df3bde88283`,
contract fingerprint
`584a41defde94342fd2c7daa1371fa8702e56edbd1b701b74c90dfac566d7271`,
and definition fingerprint
`a0a577f1b3965d01827117f0c2f6e5cccb8df9402b8364978c2e26d640458d6f`.

The first cold capture of `atj02-group-chunk-0011` failed closed after the
capture budget with one bridge tile and model `atj01_m05_01` unresolved. The
SET definition binds that model to tile 333. A deterministic, read-only audit
of all 53,700 tile rows across the 228 installed HAK files plus the
`nwn_base` and `nwn_retail` keys resolved 45,006 source rows, identified 8,660
intentional placeholders, retained 34 genuinely missing sources, and found
zero invalid definitions. It proved `atj01_m05_01.mdl` is source-resolved from
`lc_legacy_tiles.hak`, while the local module mirror merely lacked a cached
copy. The targeted authenticated tile-process request then returned HTTP 200
and `ready`, materializing source SHA-256
`97361585a7310763e40c7e582d787e6c6d84757d5acf538fb7dbbbeb036b235f`
and GLB SHA-256
`8fc3db3e70c4708cf107d384d50bba79c0815a4a509ab1219e92673d1f073414`
with all eleven required material textures ready. A subsequent attempt was
aborted before capture when both managed services had disappeared; it neither
staged evidence nor advanced the checkpoint. The services were restarted only
through their canonical managed runners.

Attempt `atj02-group-chunk-0011.attempt-0003` then settled and rendered the
complete Turfhouse_2x2, WizardTower_1x2, and GuardTower_1x2 fixtures. Runtime
reported 16/16 contract tiles loaded, zero pending, failed, or bridge tiles,
330 visible meshes, 330 materials and maps, 14/14 material contracts applied,
7/7 ready candidates, 9/9 HTTP 200 tile-process responses, and all mutation,
post-capture, and presented-frame gates ready. Independent inspection of the
exact 8x2 canvas found all eight declared member placements, accepted framing,
and no unexpected blank, failed, bridge, placeholder, collapsed, or clipped
fixture. The accepted visual-review SHA-256 is
`60ab2b938d23bc94bfc8f03f241779f933d0c568f08bcb2380d640ceb815435c`.
Its frame, state, canvas, page, and lifecycle SHA-256 values are, respectively,
`f07189d8a2bbdd8232224e342f61902094f72339a2405efbf48b7e4aa900941a`,
`486da21e550c442effcbb056b784e5f94e3d8317c0c83897b8192957554ab0de`,
`7400835ae3d2bbec6167b992d5db815bfc459a42a1d198a25204f3b98a30caf0`,
`f6f711ea99a85dadb0e8c7bcc90c2f2064963f561cc932a0dcca57172f2a88c9`,
and `fa19e394c8bc00ae02ac76565351089d7696a24d6cf4c2d08315b1e837b26535`.

The first cold capture of `atj02-group-chunk-0012` also failed closed without
checkpoint movement. It had loaded 12/15 tiles, retained three bridge tiles,
and had one of nine expected tile-process requests still in flight at the
deadline. Backend diagnostics subsequently proved the in-flight
`atj01_v03_01` request completed HTTP 200 after approximately 27.3 seconds.
Targeted authenticated prewarming then materialized the remaining
`atj01_u02_01` and `atj01_v02_01` contracts; both returned HTTP 200 and
`ready`, with source MDL, derived GLB, material binding, renderer handoff, and
every required texture ready and no blockers. This observable cache change
admitted one non-blind retry.

Attempt `atj02-group-chunk-0012.attempt-0002` rendered the complete six-member
Temple01_3x2 and two-member watermill fixtures inside the proportional 5x3
Area. Exact readback matched all eight requested row, column, tile ID,
orientation, and group bindings with zero mismatches. Runtime reported 15/15
contract tiles loaded, zero pending, failed, or bridge tiles, 372 visible
meshes, 378 materials and maps, 15/15 material contracts applied, 9/9 ready
candidates, 11/11 HTTP 200 tile-process responses with none in flight, and all
three settlement gates ready. The source-ground extent remained below the
source surfaces. Camera coverage passed with zero clipped corners, no excluded
meshes, and bounds policy `within_footprint_connected_bounds`. Independent
inspection of the exact canvas confirmed the joined temple and mill fixtures,
all eight declared member cells, and no unexpected blank, failed, bridge,
placeholder, collapsed, or clipped tile.

The accepted visual-review SHA-256 is
`35df946cc328a8b9cc642cb1dcbcd45262e5b269a08ea7b7f697dccb29bbc0fe`.
Its exact frame, state, canvas, page, and lifecycle SHA-256 values are,
respectively,
`b2564ad723b046b4159025f0c2a3bd1e61c37524f1d36a62f1d27b03fd952de4`,
`2f705d46cb0b16ec91947ac9bb73cd9404f0d3053301b2dd1bc97281b91dcd44`,
`506c7dedd0fa4155caa60ff7234cf1ffc1bd710d9404ed5533937605fb9e705b`,
`b61c778ac81cc215668ed4c15b3d1751e53910f3531b2fda37df7d53b7fa8bab`,
and `770527a8ee26ccb32d45e60310d4df2e13e38c3b52dd187586342a2c92903c71`.

The authoritative controller now reports checkpoint `12/3890`, 94 unique
captured add/render rows of 53,136 required rows, and 3,878 chunks remaining.
The next exact chunk is `atj02-group-chunk-0013` (14x2, five fixtures, ten
member placements). Both acceptances remain add/render proof only. Native
PathConnect remains exactly `0/52767`; no Connect, WOK, Toolset Save/Build,
packed readback, or NWN runtime completion is inferred. No Toolset or NWN
process was opened.

## 47. Continued implementation checkpoint — 2026-08-21 (thirteenth and fourteenth accepted v5 group chunks)

Two additional immutable `atj02` group chunks completed the full two-phase
matrix path: exact definition preflight, model-contract prewarming, one guarded
CDP capture, strict settlement validation, independent inspection of the exact
canvas, hash-bound visual review, and atomic acceptance. Neither capture used
a fallback canvas, mutated scene content for framing, or changed the immutable
plan, contract fingerprint, or tileset definition fingerprint.

`atj02-group-chunk-0013` contains five complete source-declared 1x2 fixtures
in a proportional 14x2 Area: House1_1x2, Meeting_Area, Inn2_1x2, house3_1x2,
and Barn03_1x2. Before capture, the exact ten member models plus the background
model all returned HTTP 200 and `ready` for source MDL, derived GLB, texture
delivery, material binding, renderer handoff, and model delivery, with zero
blockers. The capture read back every requested row, column, tile ID,
orientation, and group-instance binding for all ten members with zero
mismatches. Runtime settled 28/28 tile contracts, zero pending, failed, or
bridge tiles, 646 visible meshes, 649 materials and maps, 28/28 applied
material contracts, 11/11 ready tile-process candidates, and 13/13 HTTP 200
responses with none in flight. Mutation, post-capture settlement, and the
presented-frame fence were all ready. Camera coverage passed with zero clipped
corners, no excluded meshes, and bounds status
`within_footprint_connected_bounds`. Independent inspection confirmed all five
joined pairs, their declared separator/background cells, and no unexpected
blank, black, failed, bridge, placeholder, collapsed, or clipped tile.

The accepted chunk 0013 visual-review SHA-256 is
`f8812188a365483c6f07347a2939a4d0ce3df1a861866cd3eab28568c8af0c8a`.
Its exact frame, state, canvas, page, and lifecycle SHA-256 values are,
respectively,
`035ec5e3e57f50eed9136255fb00484724685f4e1676d71a3a1064149e557ba0`,
`6a91e3db09219b2539cb3d5682a7fc8586a94a234168a160f14d593cadf94f4f`,
`4816b09660fa58917e0952fef1f11d8536002f174e97fea29860888b358e0ffe`,
`5e32177f562747e551553fceed861784161ac836a9146370f8f4f28844eb3db2`,
and `0144aaea712c065b6fe5f1b449e16357ba4f1ec794fee15195271d3585d1b4b1`.

`atj02-group-chunk-0014` contains the four-member Lodge_2x2, two-member
Inn3_1x2, and four-member Field01_2x2 fixtures in an 8x2 Area. Its exact ten
member models plus the background model also completed the prewarm with 11/11
ready contracts and zero blockers. Capture readback matched all ten requested
member cells and orientations with zero mismatches. Runtime settled 16/16 tile
contracts, zero pending, failed, or bridge tiles, 381 visible meshes, 383
materials and maps, 16/16 applied material contracts, 11/11 ready candidates,
and 13/13 HTTP 200 responses with none in flight. All three settlement gates
were ready. The camera again passed with zero clipped corners, zero excluded
meshes, expansion ratio 1, and bounds status
`within_footprint_connected_bounds`. Exact-canvas inspection confirmed the
complete lodge, inn, and enclosed field; narrow dark authored geometry edges
did not form an empty cell or void. No unexpected blank, failed, bridge,
placeholder, collapsed, or clipped member was present.

The accepted chunk 0014 visual-review SHA-256 is
`da90b0cfb2c9ca332ef718854d555c3533dc5c0d2b2492c93f4cfa5ddcd6b9c7`.
Its exact frame, state, canvas, page, and lifecycle SHA-256 values are,
respectively,
`3f00148ba370322662307d18e8f105cb2a88e531efe50e8706fcfc7645eafd91`,
`e1d57f36bcc40aeb0004c3686dfd82334dbb1b87753e3ee2bcd339e89e31bccf`,
`f9825647b3703c35ae314f4e713282b871f201780b0709b0105b2f17d7f9b61c`,
`c20d3a2e22d1fe389a5f6b5dc1ab191069aadfeb7302b3278bceae60d335799b`,
and `2b3bd1de3b942b6101c6acce6b722548da2e3807251dd8bdb54b91e91bdb7d1e`.

The authoritative controller now reports checkpoint `14/3890`, 114 unique
captured add/render rows of 53,136 required rows, and 3,876 chunks remaining.
The next exact unit is `atj02-group-chunk-0015` (8x2, three fixtures, eight
member placements). These acceptances remain Add/Render evidence only. Native
PathConnect remains exactly `0/52767`; no Connect, WOK, Toolset Save/Build,
packed readback, or NWN runtime completion is inferred. No Toolset or NWN
process was opened.

## 48. Source-bound matrix successor and first accepted v7 capture — 2026-08-21

The final v5 continuation first accepted `atj02-group-chunk-0015`. Its 8x2
Area contained the complete shack_1x2, Ruin01_2x2, and Ruin02_1x2 fixtures,
covering eight declared group members. Runtime settled 16/16 tiles with zero
pending, failed, or bridge tiles, 325 visible meshes, 331 materials and maps,
16/16 applied material contracts, 9/9 ready source candidates, and 11/11 HTTP
200 tile-process responses. Camera coverage passed with zero clipped corners
and no excluded meshes. Independent canvas inspection found every group member
and no unexpected blank, failed, bridge, placeholder, collapsed, or clipped
tile. The visual-review SHA-256 is
`cc7197d0c0e37b22b41e34d9a72065dbf09901c6b1b9c7c214fbb92363373a8d`;
the frame, state, canvas, page, and lifecycle hashes are
`ca428dc66b27e162f107f6bcb62cac130332e9777e1b026ec7b03fc1c38394f4`,
`fbb9e48ab31309a87daba8903de4f050552dd27a38a79bbc5fa7134acbe4c2dc`,
`58917f368c7ff419bdf1ea9bcbebf449e61bf14a54e2255996795f5f65f599b8`,
`124cc97b1beb85837a375b74d0c06d4f523d1f06bf009b043d2e19a1ce708073`,
and `66fbf0ec96db3d0fe89622ab13ac5e35f03c5d37e7cee4b5aed706d181b80a6f`.
This advanced the archived v5 plan to checkpoint 15 and 122 captured rows.

The next v5 chunk failed before capture on exact member `atj02:398`, model
`atj02_s08_01`, with `TILE_NOT_FOUND`. Direct inspection of the selected HAK
and a read-only scan of all 229 locally available HAKs found no such resource.
The existing all-Area source inventory had already classified this row as
`source_missing`. The same inventory classified the full 53,700-row scope as
45,006 source-resolved rows, 34 source-missing rows, 8,660 intentional
placeholders, and zero invalid missing-model fields. v5 incorrectly planned
every non-empty Model field, so it ignored these source classifications and
would have encountered the same deterministic failures later.

The source-eligibility contract is now implemented in catalog v2 and matrix
revision `path-node-aware-v7`. The catalog binds both the exact 99-tileset
selection inventory and the exact 53,700-row model-source inventory by
SHA-256. It admits only `source_resolved`; names `TILE_MODEL_SOURCE_MISSING`,
`TILE_MODEL_INTENTIONAL_PLACEHOLDER`, and `TILE_MODEL_UNDECLARED` statically;
and refuses a partial multi-cell group when any member is unavailable. A
source-resolved sibling in such a group receives
`MULTI_CELL_GROUP_MODEL_SOURCE_UNAVAILABLE` with the exact missing member ID.
The compiler also preserves the audited `Model=(null)` and `Model=null`
sentinels as intentional placeholders without fabricating model ResRefs.

The immutable catalog is
`output/proof/area-tileset-definition-catalog-v2-source-bound-2026-08-21`
(catalog SHA-256
`5d994169712b89df009d201cfcb784a182e542d5a009817765bd1a19fb114dc2`).
Its exact selection and source-inventory hashes are
`2eb54fec19a713cde2a92d2f90c1c5056dbb66c4abf3c7ce1837d9d164063086`
and `5166d7c83842e6a86cfd5add5b073548555842e3fb26751aa2b4d6a3bc0604ef`.
A fresh 228-HAK audit independently reproduced the same 45,006/34/8,660/0
classification totals.

The first source-bound prototype plan used one decorated definition
fingerprint for both planner identity and live SET drift. Its guarded capture
failed closed before rendering because source-only annotations correctly
changed the planner fingerprint even though the raw SET had not changed. The
prototype remained at checkpoint zero and is explicitly superseded. v7 fixes
the scope instead of weakening the gate: `definitionFingerprint` binds planner
inputs including `modelSourceStatus`, while `runtimeDefinitionFingerprint`
binds renderer-visible SET semantics and is the value compared with the live
endpoint.

The authoritative successor is
`output/proof/tile-add-connect-matrix-v7-source-bound-2026-08-21`, plan ID and
manifest SHA-256
`d353e980e48d484eb8c24725163668ce1d2650f78a55af1be9dfcd60e25db002`,
contract fingerprint
`b44e8a09b630ee1bb2657244e0e1f2aa2361cbbfcbd8942952eb8002fe6ef231`.
It contains 45,003 Add/Render rows and 8,697 exact named blockers: 34 missing
sources, 8,660 intentional placeholders, and three otherwise resolved group
members whose declared group contains an unavailable member. Global validation
checked 80,891 chunk references across 3,378 chunks; every reference is
`source_resolved`. In particular, `atj02:398` is statically blocked and absent
from all chunks, while sibling `atj02:399` names member 398 as the reason its
group cannot be scheduled.

The first v7 unit, `atj02-group-chunk-0001`, completed guarded capture and
independent review. Its complete Barn01_2x2, RuinPark_1x2, and SlumHouse_1x2
fixtures cover eight group-member rows in an 8x2 Area. Runtime settled 16/16
tiles, zero pending, failed, or bridge tiles, 372 visible meshes, 372 materials
and maps, 16/16 material contracts, 9/9 ready candidates, and 11/11 HTTP 200
responses. Mutation, post-capture settlement, and the presented-frame fence
were ready. Camera coverage passed with zero clipped corners and no excluded
meshes. The planner/runtime fingerprints are, respectively,
`e2f9ae14087189af7b036ea8e4dfdb83418a225f13038d7dead8a9a121026631`
and `a0a577f1b3965d01827117f0c2f6e5cccb8df9402b8364978c2e26d640458d6f`.
The accepted visual-review SHA-256 is
`d52a817b9357274c92facf1bea6a96cdc5a780b9c90cd068c9d237a402febaa5`;
the frame, state, canvas, page, and lifecycle hashes are
`c6805d63910350452ead174b1e5e40073f115fe3078c5d1207df13304432e4d1`,
`2756c2ffb39e65c0f23d3beacb22e5ff6ba26407322bbdf68f5fc65f06258149`,
`19183338ee228d7b6c3aa2d2ed3744a6e6ce10b96fa219e7cae0c342bc05ff17`,
`f814489397f75b8f54638a759a278b531f1133ca460d2e187ab85064c0ddf8cc`,
and `d768cf9ba8c4e5599e0ebbcf1053930dfc804cbe91a1a1adcb77cf3608a5bc27`.

The second v7 unit, `atj02-group-chunk-0002`, also completed guarded capture
and independent review. Its complete Farm03a_1x2, builda2, and Barn02_1x2
fixtures cover six group-member rows in a 7x2 Area. Runtime settled 14/14
tiles, zero pending, failed, or bridge tiles, 308 visible meshes, 308 materials
and maps, 14/14 material contracts, 7/7 ready candidates, and 9/9 HTTP 200
responses. Mutation, post-capture settlement, and the presented-frame fence
were ready. Exact fixture readback matched all six requested tile IDs,
orientations, and declared group placements with zero mismatches. Camera
coverage passed with zero clipped corners, no excluded meshes, and bounds
status `within_footprint_connected_bounds`. Independent inspection of the
exact canvas and page images found the full Area and all group members with no
unexpected blank, failed, bridge, placeholder, collapsed, or clipped tile.
The accepted visual-review SHA-256 is
`e3695a2bf2935e5f9035b08ea1b424ac45010945bff2c693f46aca788756b7b8`;
the frame, state, canvas, page, and lifecycle hashes are
`1e69fe509969d936fa6bbe6776b6a0099fe987156f35b9d6df52bc63c0cf59da`,
`d51a6b0655bbcf1573fdd1975b38d71ce2d3d3b72125925ded785f80cfa3e707`,
`c1744fd6283730560c777798d50c9ad64c1458423e0692fcd1761ae9fd0273f3`,
`d6d29d669b4354061218b04abdd57eee069fbf2e23f139464cf7243aa2906f0c`,
and `5bfdf8742ecfb8c046a7b2f491f288ed846fed11993e48b0bf919d4c0b6399d9`.

The third v7 unit, `atj02-group-chunk-0003`, completed the same guarded and
independently reviewed path. Its Ori_WaterBridge 1x4 and Ori_NoblePagoda 2x2
fixtures cover eight group-member rows in a 7x2 Area. Exact readback matched
all eight requested IDs, positions, orientations, and group instances with
zero mismatches. Runtime settled 14/14 tiles with zero pending, failed, or
bridge tiles, 361 visible meshes, 361 materials and maps, 14/14 applied
material contracts, 9/9 ready source candidates, and 11/11 HTTP 200 responses.
All three settlement gates were ready. Camera coverage passed with zero
clipped corners, no excluded meshes, and bounds status
`within_footprint_connected_bounds`. Independent canvas/page inspection found
the continuous four-cell bridge and the complete four-cell pagoda with no
unexpected blank, failed, bridge, placeholder, collapsed, or clipped member.
The accepted visual-review SHA-256 is
`cf5554afe27c0f8f30fb58d7ea6d7580c36604ca04323d4ea1f32c5c6091daad`;
the frame, state, canvas, page, and lifecycle hashes are
`510ad70c47d92207b0a5ad75ae95ebb8fb475a73377a413743d98482528fe8b8`,
`efa1776890a033e6f158a4cbc4032166191fb5c66df0257f475fb26b597c113f`,
`ce23aad502f8285355462fcad50a932bd276461bec9d0e4a948caf062a38dc8a`,
`52a2925ffdf238d32e5a5a448b02a47f19eb00142e759d78c0fbfef73373cee1`,
and `b8ce2a5d5446f2af203b1db469425a30ad374ca6fc65d21d86dd2dde048614fe`.

The fourth v7 unit, `atj02-group-chunk-0004`, completed guarded capture and
the mandatory independent framing review. Its CaravelFloating_3x1 and sparse
CaravelDocked_3x2 fixtures cover seven declared group-member rows in a 4x3
Area; the docked group also preserves its two source-declared null slots.
Exact readback matched all seven IDs, positions, source orientations, and
group instances with zero mismatches. Runtime settled 12/12 tiles with zero
pending, failed, or bridge tiles, 551 visible meshes, 557 materials and maps,
12/12 applied material contracts, 8/8 ready source candidates, and 10/10 HTTP
200 responses. All settlement gates were ready.

The camera ledger recorded `runtime_bounds_outlier` for four tiny source-backed
meshes: two `BackSailSupportRopev` and two `Box05v01` instances lying just
outside the logical footprint. They were excluded only from camera-fit
influence and remained present in the scene. Independent inspection confirmed
that both complete vessels, the full cyan footprint, all group members, and
the mast/rigging extremities were legible with zero clipped corners; therefore
the exact hash-bound review accepted the framing. No blank, failed, runtime
bridge, placeholder, collapsed, or clipped tile was present. The accepted
visual-review SHA-256 is
`7418ade9c7f5d48f33622a8359615c93bd3e06c0d804233e5270c71fbfe5a40c`;
the frame, state, canvas, page, and lifecycle hashes are
`2878883ebc64e21489c2a5e5d4b4c5092b04b8a41fcbdb2cb9f936e98c38f20d`,
`e004bf6cdfe6074de21b090df9efbb98c5051ab474f02befc380e38a364a5863`,
`38fd2840bf06c23595babf15b5c48085d6b7f1c1863c66179a7109f0bdd8a9a6`,
`05f2ed18388c444bf8ccb37560b79b302596df6e8c95480e029a1af5f7b78907`,
and `9de9677caad495f12158bf8b95168135e2323a310b253c5996bb2c057278b319`.

The fifth v7 unit, `atj02-group-chunk-0005`, completed guarded capture and
independent visual review. Its Inn1_1x2, Farm01_2x2, and Farm02_1x2 fixtures
cover eight group-member rows in an 8x2 Area. Exact readback matched every ID,
cell, group instance, and orientation, including the source orientation-1
Farm01 member, with zero mismatches. Runtime settled 16/16 tiles with zero
pending, failed, or bridge tiles, 376 visible meshes, 379 materials and maps,
16/16 applied material contracts, 9/9 ready source candidates, and 11/11 HTTP
200 responses. All three settlement gates were ready. Camera coverage passed
with zero clipped corners, zero excluded meshes, expansion ratio 1, and
`within_footprint_connected_bounds`. Independent canvas/page inspection found
the complete inn and both farms with no blank, failed, bridge, placeholder,
collapsed, clipped, or internal-void tile. The accepted visual-review SHA-256
is `4c5299d8a01e3db8afd02e03e13c3a74c1a6fbacf6177b4ecb495ff1a9205381`;
the frame, state, canvas, page, and lifecycle hashes are
`4e436d6061fe9e9c5a65c40695fbde3a48684cdb04c5fecb063f0e3168f287ef`,
`58050960ce81239b605849eb4cbe9d6f463f34b75cb971ea29b0386f94bb7213`,
`230de2293c514ef41b133fa33b112d863af3a35ab0907b7fb9987fb83a39eb36`,
`999d523b3d0b18485a4a341baff1e0b87d261ac29f1c133440f0a8612c321298`,
and `99535961c86da6c34fd891f2ab3ba917a27e113ead48c4af161917b0d17f07b3`.

The sixth v7 unit, `atj02-group-chunk-0006`, completed guarded capture and
independent visual review. Its Farm03_1x2, Field02_2x2, and Field03_2x1
fixtures cover eight group-member rows in an 8x2 Area. Exact readback matched
all eight requested IDs, cells, orientations, anchors, and group instances
with zero mismatches. Runtime settled 16/16 tiles with zero pending, failed,
or bridge tiles, 349 visible meshes, 349 materials and maps, 16/16 applied
material contracts, 9/9 ready source candidates, and 20/20 HTTP 200 tile
process responses. Mutation, post-capture settlement, and the presented-frame
fence were all ready. Camera coverage passed with zero clipped corners, zero
excluded meshes, expansion ratio 1, and
`within_footprint_connected_bounds`. Independent canvas/page inspection found
the complete farm and both field compositions inside the full cyan footprint,
with no blank, failed, bridge, placeholder, collapsed, clipped, or
internal-void tile. The accepted visual-review SHA-256 is
`5d1892edcc874b206fb3c54731197c96f4ad257571fc29ff8a4a28166650cdb5`;
the frame, state, canvas, page, and lifecycle hashes are
`7bb381c11ec12d5ba1902725a273b687bb38bef12941caf64e1e1a433a14e301`,
`3d953cdd57a54ba006bb28ab81cb66e1b624164aa765ea29b372327d3dee57be`,
`bb146621046f376013236a7d6402ee72ec43ea7e29b472b5065e05a981b80769`,
`3019c6a783c9765ef0a99f556e697f72c8d16ba455ba121e3c09994af9263285`,
and `4caae76b5de4457787102eebe787dc6307fb30daaaa19f6c83e91e8e68310b11`.

The seventh v7 unit, `atj02-group-chunk-0007`, completed guarded capture and
independent visual review. Its Windmill_2x2, Warzone_1x2, and
ShipDocked01_2x2 fixtures cover ten group-member rows in an 8x2 Area. Exact
readback matched all ten requested IDs, cells, orientations, anchors, and
group instances with zero mismatches, including the source orientation-3
tile 180 and orientation-2 tile 179 ship members. Runtime settled 16/16 tiles
with zero pending, failed, or bridge tiles, 332 visible meshes, 335 materials
and maps, 16/16 applied material contracts, 11/11 ready source candidates,
and 13/13 HTTP 200 tile-process responses. Mutation, post-capture settlement,
and the presented-frame fence were all ready. Camera coverage passed with zero
clipped corners, zero excluded meshes, expansion ratio 1, and
`within_footprint_connected_bounds`. Independent canvas/page inspection found
the complete windmill, both warzone rubble cells, and the entire docked ship
with its shore transition inside the full cyan footprint, with no blank,
failed, bridge, placeholder, collapsed, clipped, or internal-void tile. The
accepted visual-review SHA-256 is
`185b9c8c89d46a9f300181a15f9a73595ec9a30d40aa7b52f1abd2329b20ea02`;
the frame, state, canvas, page, and lifecycle hashes are
`9a84a40047c14dea4069c51df7a5affa81da7517b794d723ccd20b3a2dd1ce98`,
`0ea451d4ea03f22e482d4a5ced5f5ec8350d619c3dffc4119704c6f887b0b2c1`,
`1d0129ab20cc039c05a838c5c81e51e3502987c3f09be5f95e880b7c1d535bd3`,
`db6ef9d9ee72810132abd6e1ed5b3c27f2f9054cf520a73e13d185576948bd13`,
and `5c7f7a0324d2246cc286d531e369215f712f37ff520ab033ccaa2da5d617ce26`.

The eighth v7 unit, `atj02-group-chunk-0008`, completed guarded capture and
independent visual review. Its DragSkel_1x2, Barracks_1x2, and Tower_1x2
fixtures cover six group-member rows in an 8x2 Area. Exact readback matched all
six requested IDs, cells, orientations, anchors, and group instances with zero
mismatches, including source tile 216 at orientation 3 and tile 217 at
orientation 1. Runtime settled 16/16 tiles with zero pending, failed, or bridge
tiles, 340 visible meshes, 340 materials and maps, 16/16 applied material
contracts, 7/7 ready source candidates, and 9/9 HTTP 200 tile-process
responses. Mutation, post-capture settlement, and the presented-frame fence
were all ready. Camera coverage passed with zero clipped corners, zero excluded
meshes, expansion ratio 1, and `within_footprint_connected_bounds`.
Independent canvas/page inspection found the complete two-part skeleton,
barracks, and tower compositions with the complete diagnostic underlay inside
the full cyan footprint, with no blank, failed, bridge, placeholder, collapsed,
clipped, or internal-void tile. The accepted visual-review SHA-256 is
`3726c60083f54b1dce2f26436b2283ff6fd30453a9aa2da0c3eb474237347f3c`;
the frame, state, canvas, page, and lifecycle hashes are
`f4e5d782a4f17745d337edb7a340541ea0901d9a9b2964b031a905c5d1f5a83a`,
`31f9cfdd785106a06435617a7e86508ed6f4233745a9ec8dec52e419ac0432dd`,
`9d981c3b33fae2c21a9b87d46da47acc4249350f55fc9ae6b6237aa124eda367`,
`81c373945b277b7ca8564df83b9116b48448fcedb43eb41fef1da243a78a51a7`,
and `1e5c95674d0fb1a5fe0279067201bfda0cba9ee6c6bf862a4632542318fc4223`.

The ninth v7 unit, `atj02-group-chunk-0009`, completed guarded capture and
independent visual review. Its Temple02_2x2 and Temple03_3x2 fixtures cover ten
group-member rows in a 5x3 Area. Exact readback matched all ten requested IDs,
cells, orientations, anchors, and group instances with zero mismatches.
Runtime settled 15/15 tiles with zero pending, failed, or bridge tiles, 242
visible meshes, 251 materials and maps, 15/15 applied material contracts,
11/11 ready source candidates, and 13/13 HTTP 200 tile-process responses.
Mutation, post-capture settlement, and the presented-frame fence were all
ready. Camera coverage passed with zero clipped corners, zero excluded meshes,
expansion ratio 1, and `within_footprint_connected_bounds`. Independent
canvas/page inspection found both complete temple compositions—the circular
stone complex and the elongated grey-stone complex—together with the complete
diagnostic underlay inside the full cyan footprint, with no blank, failed,
bridge, placeholder, collapsed, clipped, or internal-void tile. The accepted
visual-review SHA-256 is
`a7ba9cd551abed508e2ca41a65b0ea3105fb8b858ce13d8aa6dd1a1b01e8a37c`;
the frame, state, canvas, page, and lifecycle hashes are
`fec260c64e356edd718fb1fc7cd7a09011532c80091cac0cbaeebf23e547d6dd`,
`acba137da4c1a7f9f92de8552916b9a926b618c7f0b393c4385221161114c788`,
`16aa8ebbd7eb38a245d41b6df7a0a02fe1685124239ce4f2f53e80d05884853e`,
`3b801247b85dbaa7c350fcfae160c71a49f134e08f40458f2040183c6f886aa4`,
and `3a77d2667a3f6aaac156328e0e3375e975227e440676937ba085e01af1eb1a21`.

The tenth v7 unit, `atj02-group-chunk-0010`, completed guarded capture and
independent visual review. Its ShipDocked02_2x2, House2_1x2, and Exit02_2x2
fixtures contain nine declared non-null group-member placements in an 8x2
Area. Exact readback matched all nine requested IDs, cells, orientations,
anchors, and group instances with zero mismatches. The source-declared `-1`
member of ShipDocked02_2x2 correctly remained diagnostic underlay and was not
treated as a missing requested member. The render contract settled 16/16 tiles,
10/10 checked tile-process candidates, 388 visible meshes, 396 materials and
maps, zero pending/failed/bridge tiles, and ready mutation, post-capture, and
presented-frame fences. Camera coverage passed with zero clipped corners and
no excluded meshes. Independent inspection of both exact PNG artifacts found
the complete docked ship, house/yard, and rocky cave/portal composition. The
large black cave mouth is intentional source-backed geometry, not a blank
tile; no unexpected blank, failed, bridge, placeholder, collapsed, clipped,
or internal-void tile was present. The accepted visual-review SHA-256 is
`53266dc193ef0f307a7041b786f1df934235521b075b79aed217e7c0507f3471`;
the frame, state, canvas, page, and lifecycle hashes are
`cd2c46e3e0eeeca14debf5fb5ffb22c3bbc254b7d3515f562c9c0e987e14fcb8`,
`2bbde4a3e3c72b412a9a0c5c7e4a270f4cdbb7a28c3987316daad095dccaaf30`,
`f7443a78da7d982618be9db88bf473567bd18cef9ae310d5d53ae717f27e76d5`,
`c5929e37c882beb9a680bcb65f73f479bfefe45a27532aebedd627b24a02915a`,
and `8b611c0d14e67b43f1c73b2fccd30394de41afe059ca818faeff58ebe9be6180`.

The eleventh v7 unit, `atj02-group-chunk-0011`, completed guarded capture and
independent visual review. The first request failed closed before staging when
the pre-existing supervised frontend disappeared during the Area-detail fetch;
it produced no fresh canvas/page pair, no pending capture, and no checkpoint
advance. After PID/listener readback confirmed that service was gone, one new
managed frontend was started and the unchanged plan/chunk/profile was resumed
as `attempt-0002`.

The accepted attempt contains the complete four-member Turfhouse_2x2 and
six-member Temple01_3x2 fixtures in a 5x3 Area. Exact readback matched all ten
requested IDs, cells, orientations, anchors, and group instances with zero
mismatches. The render contract settled 15/15 tiles, 11/11 checked tile-process
candidates, 361 visible meshes, 367 materials and maps, zero
pending/failed/bridge tiles, and ready mutation, post-capture, and
presented-frame fences. Camera coverage passed with zero clipped corners, no
excluded meshes, and expansion ratio 1. Independent inspection of both exact
PNG artifacts found the complete enclosed turfhouse yard, the continuous
three-row stone temple, and the intervening diagnostic terrain. No unexpected
blank, failed, bridge, placeholder, collapsed, clipped, or internal-void tile
was present. The accepted visual-review SHA-256 is
`2ba50ca73c7ea7294a5e4a8cc3090db00ffe1acce039483e398ff73249966c8f`;
the frame, state, canvas, page, and lifecycle hashes are
`df6cc4310078a5c41e5b420a744c68260c1aca6105fb5b27e9363322dfd5d5fe`,
`43728e5e0c1922070eb3a7c19803c8771a8db80c0ec328102f4dad444a0e9d2b`,
`949f415c8e728e37be3c546ce545d4c4dd1d69779f5f747c54d09912097c1e88`,
`fe448498c50c13405530f0b508e470e1006c611f2536d5ba09964287eb450c92`,
and `79d5cb8b8c36621e60c229dccf8344f9b8054568b95c04a2112f0481ee05edbd`.

The twelfth v7 unit, `atj02-group-chunk-0012`, completed guarded capture and
independent visual review. It reused the one already healthy managed
backend/frontend pair and waited for the repository-global capture owner to
finish before acquiring the same canonical lock; no duplicate service or
parallel Chrome lane was started.

The 14x2 Area contains five complete two-member groups: watermill,
House1_1x2, Meeting_Area, Inn2_1x2, and house3_1x2. Exact readback matched all
ten requested IDs, cells, orientations, anchors, and group instances with zero
mismatches. The render contract settled 28/28 tiles, 11/11 checked tile-process
candidates, 671 visible meshes, 674 materials and maps, zero
pending/failed/bridge tiles, and ready mutation, post-capture, and
presented-frame fences. Camera coverage passed with zero clipped corners, no
excluded meshes, and expansion ratio 1. Independent inspection of both exact
PNG artifacts found all five continuous paired compositions, their declared
single-column diagnostic separators, and the complete second background row.
Narrow dark source-model details were not blank cells. The inspector's `No
objects` message referred to the intentionally empty GIT object list, not the
terrain. No unexpected blank, failed, bridge, placeholder, collapsed, clipped,
or internal-void tile was present. The accepted visual-review SHA-256 is
`4e1c60b9f236aa7f9a9950a22109c9e6d4a15be06ce45b6402fb27cbc7fe0d8b`;
the frame, state, canvas, page, and lifecycle hashes are
`87a330498b4605933e6fdb0424fddeaba0d1549a960e77054426f98215946b8d`,
`bd61fdc542ed4c06e7d36112c4c8eef5a1a83b78f30b57388795c04abfe9f2a1`,
`78c2d2af3fb3aa975049ec6ab443448f42a2e601e0eccfdb7044e1803eaaf41e`,
`98cb7718dab3309974a961b84b6dda77b2c8fcfedaeaf9ff801d9ff28d47426f`,
and `950e10f14e6f938357e0dcc16e697302d462e1ae541fc09d55507b3763070139`.

The thirteenth v7 unit, `atj02-group-chunk-0013`, completed guarded capture and
independent visual review as `attempt-0002`. The first browser request failed
closed when the previously healthy externally owned backend/frontend pair
disappeared during tile processing; three requests ended with
`ERR_CONNECTION_RESET`, no fresh PNG pair or pending capture was staged, and
the checkpoint remained 12. A newly managed backend first exposed the missing
host-local mirror profile as a preflight-only `seaweedfs` 500, again without
starting Chrome or advancing the checkpoint. Restarting it with the exact
memory-auth and host-local module-blob-mirror profile made the cold `atj02`
lookup return 200 and the unchanged capture then staged successfully.

The 8x2 Area contains the complete two-member `Barn03_1x2`, four-member
`Lodge_2x2`, and two-member `Inn3_1x2` groups. Exact readback matched all eight
requested IDs, cells, orientations, anchors, and group instances with zero
mismatches. The render contract settled 16/16 tiles, 9/9 checked tile-process
candidates, 382 visible meshes, 384 materials and maps, 16/16 material
contracts, zero pending/failed/bridge tiles, and ready mutation, post-capture,
and presented-frame fences. All 11 captured tile-process requests returned 200
with zero failed or in-flight requests. Camera coverage passed with zero
clipped corners, no excluded meshes, and expansion ratio 1. Independent
inspection of both exact PNG artifacts found the complete cyan-bounded 8x2
footprint, all three continuous declared compositions, and the intervening
background terrain. Narrow black model details and dark seams were
source-backed geometry or texture, not blank cells; the inspector's `No
objects` message referred to the intentionally empty GIT object list. No
unexpected blank, failed, bridge, placeholder, collapsed, clipped, or
internal-void tile was present. The accepted visual-review SHA-256 is
`95eb0d6695f072d4a22a5caba196b05e4bbb20f5ca74bebbf790a063a9f28644`;
the frame, state, canvas, page, and lifecycle hashes are
`42efb4af5515f251effb6f93948e2d515720348202c0b5b3dff88cb758ee4df2`,
`98e30fd112be8d6b2b7b54da8618f59b7d5f0ce92801ba70ee28266efb596177`,
`aecaafd6e16df2d2bb0c68246b70dc652f929ef99dc2e341027bbfc2b3a06580`,
`094e7401a0e8465f314a993652c5c3ddef24dd81ff0d94c2db7354906135b576`,
and `05e0a098ebf0a5976be19bb19618a4476cd3bf1d2ad7721600957460e3164f26`.

The fourteenth v7 unit, `atj02-group-chunk-0014`, completed guarded capture
and independent visual review as `attempt-0002`. The first attempt failed
closed during final settlement: 12 of 13 tile-process requests had already
returned HTTP 200 and the thirteenth remained in flight when the strict wait
expired. Backend readback then showed that exact request completing with HTTP
200 approximately 4.3 seconds after the failure frame was created. No pending
capture or PNG pair was staged and checkpoint 13 did not advance. With the
same service pair and cache now warm, the unchanged plan, chunk, source
profile, and strict capture contract were retried once; no timeout or
acceptance criterion was relaxed.

The 8x2 Area contains the complete four-member `Field01_2x2`, two-member
`shack_1x2`, and four-member `Ruin01_2x2` groups. Exact readback matched all
ten requested IDs, cells, orientations, anchors, and group instances with
zero mismatches. The render contract settled 16/16 tiles, 11/11 checked
tile-process candidates, 341 visible meshes, 346 materials and maps, 16/16
material contracts, zero pending/failed/bridge tiles, and ready mutation,
post-capture, and presented-frame fences. All 13 captured tile-process
requests returned HTTP 200 with zero failed or in-flight requests. Camera
coverage passed with zero clipped corners, no excluded meshes, expansion
ratio 1, and bounds status `within_footprint_connected_bounds`. Independent
inspection of both exact PNG artifacts found the complete cyan-bounded 8x2
footprint, the field composition on the left, the paired shack in the center,
the complete ruin on the right, and continuous grass in the declared
separator/background cells. Narrow black model details and dark seams were
source-backed geometry or texture, not blank cells; the inspector's `No
objects` message referred to the intentionally empty GIT object list. No
unexpected blank, failed, bridge, placeholder, collapsed, clipped, or
internal-void tile was present. The accepted visual-review SHA-256 is
`a75d8a24ec7d0370c509d4d595644be98e603ac4b9ed6993ed7bedd4d23ad72a`;
the frame, state, canvas, page, and lifecycle hashes are
`977c6abb6812fb87272353fe3f08cb2caa6d12c2fe50fd87937858d0861cac70`,
`6b260264c11afef6b39814a945a033514a108d8fd28f42e1a625cca437f6f250`,
`648ca166182361aaf0c55809c95b65dd89c458973cbc3b857754be01c4b84e13`,
`5d5c3787c94e9bc7b2901595c6658940efd30afab967a2aa4205ae0d4a5673cc`,
and `bfde16bd9260fd458540f81f76d776f15e9083645fe4cdfdcbae7b536c5a1f59`.

The first bounded chunk-0006 capture request stopped before browser capture
because the backend was launched with the memory repository only and therefore
still addressed the unavailable default `seaweedfs` hostname. It produced no
chunk-0006 capture artifact and did not mutate the checkpoint. The service was
restarted with the repository-defined `AURORA_HOST_LOCAL_RUNTIME=true` path,
which selects the existing local module-blob mirror; health and exact tileset
source lookup then passed before the accepted guarded capture.

The v7 checkpoint is `14/3378`: 116 of 45,003 required unique Add/Render rows
are captured, 8,697 rows are statically named, and the next unit is
`atj02-group-chunk-0015`. Connect has 44,664 planned rows, while independent
native PathConnect remains exactly `0/44664`. This checkpoint does not claim
WOK, Toolset Save/Build, packed readback, or NWN runtime completion. This
browser proof opened or controlled no Toolset or NWN process.

The earlier post-chunk-0005 whole-backend integration failure belonged to an
unrelated, concurrently modified VFX parser lane. At that time,
`backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts` changed at
2026-08-21 15:09:42 local time. A subsequent one-shot `npm run build` reported
eight TS2345 errors at lines 930, 944, 956, 977, 989, 999, 1084, and 1086:
the open-node stack now includes `static-geometry-animation`, but three helper
signatures still accepted the previous narrower union. The separate VFX lane
synchronized those contracts before chunk-0006. This run did not modify that
file; a fresh one-shot backend `npm run build` passed, and the managed
host-local backend subsequently compiled with zero errors before serving the
accepted capture. The exact hash-bound chunk-0005 evidence remains unchanged.

## 49. Continued implementation checkpoint — 2026-08-21 (complete CUD transaction fault and recovery matrix)

This checkpoint closes the project-policy fault-injection blocker for Area
create, update, and delete transaction recovery. It does not introduce or
assume a new Aurora runtime semantic, change the frontend/backend contract, or
use an external GPL source. No Toolset, NWN, browser capture, backend service,
or frontend service was opened for this work.

The three transaction coordinators now share an exact test matrix covering ten
failure boundaries per operation: journal begin plus all nine post-begin
boundaries from staging through journal finalization. The resulting 30
operation/boundary cases prove that a pre-journal failure remains
non-mutating, every post-begin failure invokes compensation exactly once, the
operation lock is released, and the transaction diagnostic identifies the
failing boundary. The recovery suites additionally cover all 12 combinations
of create/update/delete with the interrupted `prepared`, `staged`,
`resources_committed`, and `ifo_committed` journal states. Existing recovery
coverage continues to enforce verified readback, missing or invalid receipt
handling, lease contention, disappeared journals, `compensation_pending`,
unproven restoration, and quarantine bookkeeping.

The matrix exposed one diagnosability defect: generic pre-mutation errors,
including a failed journal begin, preserved the public transaction code and
message but discarded the underlying message from `details`. Create, update,
and delete now normalize that cause into a single diagnostic detail without
changing mutation-started, compensation, quarantine, or HTTP semantics.

The focused verification is green under the repository's fixed 1 GB Node heap:

- seven coordinator/recovery/catalog suites: 142/142 tests;
- eleven controller, recovery-service, transaction-storage, and memory/MySQL
  control-store suites: 142/142 tests;
- create, update, and delete atomic-pipeline integration suites, executed one
  at a time: 25/25 tests;
- one-shot backend `npm run build`: passed.

Combining the larger controller set or the Area e2e suite into one Jest process
still exhausts the enforced 1 GB heap during TypeScript compilation. The heap
was not raised and no bare test runner was used; all corresponding focused
unit and integration suites above pass in isolated repository-script runs.
Consequently this checkpoint records the broad e2e gate as resource-blocked,
not as passed and not as a functional test failure.

The immutable capability catalog advances to revision `2026-08-21.3`.
`lifecycle_transaction_recovery` is now `implemented/available`, cites all six
create/update/delete transaction and recovery suites, and has no remaining
fault-matrix blocker. The implementation totals remain 42 implemented, 30
partial, 3 missing, and 4 not-applicable; release totals are now 37 available,
37 blocked, and 5 hidden. Native Save/Build/reopen, the source-bound tile
matrix, independent PathConnect/WOK evidence, and the remaining capability-row
blockers are unchanged and are not claimed complete by this checkpoint.

## 50. Continued implementation checkpoint — 2026-08-21 (Area editing UI port/facade boundary)

This checkpoint removes the first direct browser/HTTP adapter dependency from
the Area editing UI. It does not introduce or assume a new Aurora runtime
semantic, change the frontend/backend contract, or use an external GPL source.
No Toolset, NWN, browser capture, backend service, or frontend service was
opened for this work.

Area editing now exposes explicit source, transfer, and download ports plus an
application facade. Tileset listing, tileset-definition loading,
Area-definition loading, verification, ARE export, and download orchestration
flow through `AreaEditingFacade`. Browser HTTP adapters are selected only by
`createBrowserAreaEditingFacade`, which is composed in `App.tsx` and injected
through `WorkspaceLayout` and `AreasModePanel` into
`AuroraAreaEditingPanel`. The application layer imports no adapter. Export
awaits the transfer result before invoking the download port, so a rejected
export cannot trigger a download.

The Area panel also fails closed when the facade dependency is absent. New
blank Area, enable editing, verify, and export actions are disabled and expose
the exact diagnostic `Area editing facade is unavailable.` rather than falling
back to a hidden singleton or constructing a browser adapter inside the view.
A static architecture test rejects direct `areas/adapters/*` imports from the
layout components and verifies that adapter composition remains outside the
application facade.

The scoped verification is green under the repository's fixed 1 GB Node heap:

- six Area facade, adapter, panel, and UI-boundary suites: 38/38 tests;
- an App-inclusive Area/layout architecture run: 48/48 tests;
- frontend regression gate: 78/78 tests;
- one-shot frontend `npm run build`: passed;
- Area capability-catalog suite: 12/12 tests;
- one-shot backend `npm run build`: passed.

The full frontend unit audit executed 2,945 tests across 285 files. It passed
2,942 tests in 283 files and found three failures in two independently owned
placeable/VFX renderer suites: one contract-equality expectation in
`httpPlaceableApiPort.test.ts` and two lighting/color expectations in
`placeableThreeAssetLoader.textureMapping.test.ts`. Those files are outside
this Area boundary slice and were not modified here. This checkpoint therefore
records the scoped Area architecture gates as passed and the repository-wide
frontend unit gate as not yet green; it does not reinterpret the three failures
as Area-facade defects.

The immutable capability catalog advances to revision `2026-08-21.4`.
`topology_browse_palettes` now cites the Area application-facade,
UI-boundary, and panel integration suites. Catalog totals remain 42
implemented, 30 partial, 3 missing, and 4 not-applicable; release totals remain
37 available, 37 blocked, and 5 hidden.

This is a scoped architecture checkpoint, not completion of the frontend
facade criterion or the Area program. Five non-development UI components still
import other adapter modules directly:

- `CreaturesModePanel.tsx`;
- `properties/ItemModelPreviewPane.tsx`;
- `SceneObjectThumbnail.tsx`;
- `WorkspaceCanvasViewport.tsx`;
- `WorkspaceLayout.tsx`.

Those remaining dependencies must be migrated in separately owned slices;
renderer/placeable files currently belong to the concurrent VFX lane and were
deliberately left untouched. The 99-tileset source-bound matrix, independent
PathConnect and WOK evidence, native Toolset Save/Build/reopen, packed readback,
and NWN runtime certification are unchanged and are not claimed complete by
this checkpoint.

## 51. Continued implementation checkpoint — 2026-08-21 (creature appearance palette port/facade boundary)

This checkpoint removes the direct PLT palette adapter dependency from the
creature-authoring panel. It does not introduce or assume a new Aurora runtime
semantic, change a frontend/backend contract, or use an external GPL source.
The existing verified layer indices, row limit, and sample index are passed
unchanged through the new boundary. This work opened no Toolset, NWN, backend,
frontend, browser, or proof-capture process; an externally owned VFX runtime
remained untouched.

Creature appearance palette loading and synchronous RGBA lookup now cross
`CreatureAppearancePalettePort` and `CreatureAppearancePaletteFacade`. The
application facade validates that the adapter's row maximum is a non-negative
integer, exposes immutable query objects, and delegates the exact layer, row,
and color indices without asset-identity branching. Browser adapter selection
is confined to `createBrowserCreatureAppearancePaletteFacade`, which is
composed once in `App.tsx` and injected through `WorkspaceLayout` into
`CreaturesModePanel`.

The panel no longer imports any adapter. Each appearance picker loads and
queries through the injected facade and reports `loading`, `ready`, or
`fallback` through `data-palette-state`. A false or rejected palette load is
contained and leaves deterministic HSL fallback colors active instead of
producing an unhandled promise rejection; it exposes the exact diagnostic
`Creature appearance palette data is unavailable; fallback colors are
active.`. When the facade itself is absent, the exact diagnostic is `Creature
appearance palette facade is unavailable; fallback colors are active.`. The
production composition always supplies the facade; the fallback is a
diagnosed misconfiguration or data-unavailability path, not a second adapter
construction path.

TDD verification first failed because the port, facade, composition root, and
injection did not exist and because `CreaturesModePanel` still imported the
concrete palette adapter. After implementation, the scoped gates are green
under the repository's fixed 1 GB Node heap:

- creature palette facade, UI-boundary, and panel suites: 10/10 tests;
- App workspace-panel suite: 17/17 tests;
- WorkspaceLayout viewport-wiring suite: 93/93 tests;
- frontend regression gate: 78/78 tests;
- one-shot frontend `npm run build`: passed;
- Area capability-catalog suite: 12/12 tests;
- one-shot backend `npm run build`: passed.

The existing React `act(...)` warnings remain visible in App, WorkspaceLayout,
and regression suites but do not fail their assertions. The full frontend unit
gate was not repeated during this checkpoint to avoid competing with the
active, externally owned VFX proof runtime. Its latest recorded result remains
the section 50 audit: 2,942/2,945 tests with three failures in the concurrently
owned placeable/VFX renderer lane. This checkpoint does not claim that broad
gate green.

The immutable capability catalog advances to revision `2026-08-21.5`.
`objects_creature_authoring` remains truthfully `partial/blocked` on
`equipment_and_runtime_matrix_incomplete`, but now cites the facade,
UI-boundary, and panel integration suites. Catalog totals remain 42
implemented, 30 partial, 3 missing, and 4 not-applicable; release totals remain
37 available, 37 blocked, and 5 hidden.

Four non-development UI components still import adapter modules directly:

- `properties/ItemModelPreviewPane.tsx`;
- `SceneObjectThumbnail.tsx`;
- `WorkspaceCanvasViewport.tsx`;
- `WorkspaceLayout.tsx`.

Those remaining dependencies are renderer/placeable-adjacent and remain under
the concurrent VFX ownership boundary. The 99-tileset source-bound matrix,
independent PathConnect and WOK evidence, native Toolset Save/Build/reopen,
packed readback, and NWN runtime certification are unchanged and are not
claimed complete by this checkpoint.

## 52. Continued implementation checkpoint — 2026-08-21 (WorkspaceLayout cache-miss application contract)

This checkpoint removes the final direct adapter import from
`WorkspaceLayout`. It does not introduce or assume an Aurora runtime semantic,
change a frontend/backend contract, or use an external GPL source. No renderer,
loader, placeable adapter, Toolset, NWN, service, browser, or capture process
was changed or opened by this work.

The Areas recovery callback previously imported the complete
`PlaceableAssetCacheMissEventDetail` type from the Three.js loader even though
it consumed only `cacheKey` and `assetKind`. The application layer now owns the
narrow readonly `AreaPlaceableAssetCacheMiss` contract with exactly those two
fields. `WorkspaceLayout` accepts that contract, while the larger detail
emitted and forwarded by the renderer remains structurally compatible. URL,
HTTP status, and adapter-specific error-code fields no longer leak into the UI
recovery use case.

Runtime behavior is unchanged. A matching stale backend cache key still
identifies only the affected Area placeable lookups, evicts their cache,
pending, published, object, and validation aliases, advances the validation
generation, and emits the existing Area-, user-, asset-kind-, cache-key-, and
affected-count telemetry. The change only reverses the type dependency and
does not alter renderer event dispatch or recovery selection.

TDD verification first failed because `WorkspaceLayout` still imported the
adapter and the narrow application contract did not exist. After
implementation, the scoped gates are green under the repository's fixed 1 GB
Node heap:

- WorkspaceLayout UI-boundary plus cache revalidation suites: 8/8 tests;
- WorkspaceLayout viewport-wiring suite: 93/93 tests;
- frontend regression gate: 78/78 tests;
- one-shot frontend `npm run build`: passed;
- Area capability-catalog suite: 12/12 tests;
- one-shot backend `npm run build`: passed.

The existing React `act(...)` warnings remain visible in WorkspaceLayout and
regression suites but do not fail their assertions. The full frontend unit gate
was not repeated while the externally owned VFX lane retained its managed
service locks. Its latest recorded result remains the section 50 audit:
2,942/2,945 tests with three failures in that concurrently owned renderer lane.
This checkpoint does not claim that broad gate green.

The immutable capability catalog advances to revision `2026-08-21.6`.
`render_incremental_rebuild` remains `implemented/available` and now cites the
cache-revalidation, WorkspaceLayout UI-boundary, and viewport integration
suites. Catalog totals remain 42 implemented, 30 partial, 3 missing, and 4
not-applicable; release totals remain 37 available, 37 blocked, and 5 hidden.

Three non-development UI components still import adapter modules directly:

- `properties/ItemModelPreviewPane.tsx`;
- `SceneObjectThumbnail.tsx`;
- `WorkspaceCanvasViewport.tsx`.

Those remaining dependencies are active renderer/preview components and stay
outside this offline slice. The 99-tileset source-bound matrix, independent
PathConnect and WOK evidence, native Toolset Save/Build/reopen, packed
readback, and NWN runtime certification are unchanged and are not claimed
complete by this checkpoint.

## 53. Continued implementation checkpoint — 2026-08-21 (topology catalog search and filtering)

This checkpoint implements the application-owned search and filtering policy
for the Area tile-definition catalog. It does not introduce or infer an
unknown Aurora runtime semantic, change the frontend/backend contract, or use
an external GPL source. No Toolset, NWN, backend service, frontend service,
browser, or proof-capture process was opened for this work; the managed runtime
pair and the single capture lane remained available to the separately owned
VFX proof task.

The deterministic catalog filter accepts the existing SET-derived tile
definitions and an explicit immutable certification index. It supports ANDed
text tokens across the tileset resref, `Tile_ID`, model, terrain, crosser, and
group identifiers and names. Independent selectors cover terrain, crosser,
multi-cell group, and individually replaceable categories; replaceable,
group-managed, model-referenced, and model-reference-missing capabilities; and
verified, failed, missing, or excluded certification states. Results are
sorted by immutable numeric `Tile_ID`, input definitions are not mutated, and
diagnostics expose total, matched, verified, failed, missing, and excluded
counts.

Certification fails closed. A tile without an exact
`tilesetResRef + Tile_ID` ledger row is `missing`; failed proof remains
`failed`; an ineligible row remains `excluded`; and only a fully verified row
is presented as `verified`. Current-scene model readiness is never promoted to
immutable tile certification. One-cell SET groups remain searchable by group
metadata but are individually replaceable, while members of multi-cell groups
remain group-managed.

`AuroraAreaEditingPanel` now browses available tilesets and loads their
definitions solely through the injected `AreaEditingFacade`. It rejects a
definition response whose normalized resref does not exactly match the
requested catalog resref and retains the previously accepted catalog. Results
from the Area's current tileset can populate `Replace Tile_ID` only when they
are individually replaceable. Multi-cell group members and results from a
foreign tileset are explicitly read-only. Rendering is bounded to the first
100 matched rows while the full matched count remains visible, and the search
and filter diagnostics are named live regions rather than a generic status
surface.

TDD first observed missing-module, missing-browse-control, singleton-group,
identity-mismatch, and ambiguous-status failures. After implementation, the
scoped offline gates are green under the repository's fixed 1 GB Node heap:

- tile-catalog application and Area-panel suites: 34/34 tests (5 pure-filter
  tests and 29 panel tests);
- frontend regression gate: 78/78 tests;
- one-shot frontend `npm run build`: passed;
- Area capability-catalog suite: 12/12 tests;
- one-shot backend `npm run build`: passed.

Existing React `act(...)` warnings remain visible in the component and
regression suites but do not fail their assertions. The full frontend unit
gate was not repeated while the VFX lane owned runtime proof coordination. Its
latest recorded result remains the section 50 audit: 2,942/2,945 tests with
three failures in the independently owned placeable/VFX renderer lane. This
checkpoint therefore does not claim that broad gate green.

The immutable capability catalog advances to revision `2026-08-21.7`.
`topology_search_filter_catalog` now cites the pure application filter and
panel integration suites, but remains truthfully `partial/blocked` on
`certification_ledger_delivery_not_integrated` and
`browser_filter_proof_pending`. Catalog totals remain 42 implemented, 30
partial, 3 missing, and 4 not-applicable; release totals remain 37 available,
37 blocked, and 5 hidden.

This is an offline implementation checkpoint, not visual or runtime proof.
The exact immutable certification-ledger delivery path and fresh guarded
browser evidence remain outstanding. The 99-tileset source-bound matrix,
independent PathConnect and WOK evidence, native Toolset Save/Build/reopen,
packed readback, and NWN runtime certification are unchanged and are not
claimed complete by this checkpoint.

## 54. Continued implementation checkpoint — 2026-08-21 (immutable tile-certification ledger delivery)

This checkpoint implements the reviewed cross-boundary delivery path for an
existing immutable Area certification report. It introduces no Aurora runtime
semantic, does not reinterpret any proof state, and uses no external GPL
source. Before offline work continued, ports 3000 and 5173 were confirmed
free and the backend-, frontend-, and proof-capture lock files were absent.
No backend service, frontend service, browser, capture, Toolset, or NWN process
was started by this checkpoint so the separately owned VFX capture lane could
take the runtime pair.

The backend now exposes the additive authenticated `scene.read` query
`GET /api/v1/areas/certification/tilesets/{tilesetResRef}`. Its only source is
the administrator-configured `AURORA_AREA_CERTIFICATION_REPORT_PATH`. The file
adapter accepts one regular JSON file no larger than 64 MiB and reuses object
identity only while path, size, and modification time remain unchanged. The
application service rebuilds the full canonical release report and compares
the complete stable representation, including ledger and report SHA-256
values, before indexing any row. A missing/unreadable source and a present but
invalid source are separate sanitized 503 contracts.

Only production `tile-definition` rows with canonical
`<lowercase tileset ResRef>:<decimal Tile_ID>` identities enter the index.
Duplicate or noncanonical identities invalidate the whole report. Pages are
strictly sorted by numeric `Tile_ID`, bounded to 256 rows and offset 99,999,
and retain exact generated-at, plan, corpus, profile, ledger, report, tileset,
total, limit, and offset bindings. A valid report without the requested
tileset returns an empty page and never implies verification.
Projected row and capability IDs are bounded to 256 code units and exclusion
reasons to 1,024; blank or NUL-bearing values fail the complete report closed.

The frontend now owns a narrow certification port and strict HTTP adapter.
The adapter rejects unknown keys, invalid proof enums, noncanonical subject
identity, plan/corpus/profile drift, duplicate or unsorted rows, and invalid
page accounting. `AreaEditingFacade` loads all pages against one stable report
binding, prevents duplicate tile identities and pagination stalls, and builds
the exact `(tilesetResRef, Tile_ID)` application index consumed by the catalog
filter. Browser composition is confined to
`createBrowserAreaEditingFacade`.

`AuroraAreaEditingPanel` loads certification through the facade only after the
selected definition has passed its exact tileset identity check. A successful
ledger load updates verified/failed/missing/excluded catalog diagnostics. If
ledger delivery fails, the accepted definition stays visible, an empty index
is bound to that exact tileset, every row remains `missing`, and the UI shows
only `Tile certification ledger is unavailable; certification remains
missing.`. Transport details are not exposed. This delivery slice does not
enable the separate production placement gate.

TDD first observed missing backend service/port, frontend port/adapter/facade,
pagination, and panel-ledger integration failures. After implementation, the
offline gates are:

- backend certification service, HTTP/schema, file-source, config, and Area
  capability-catalog suites: 31/31 tests;
- frontend certification HTTP adapter, Area facade, pure catalog filter, and
  Area panel suites: 48/48 tests;
- frontend regression gate: 78/78 tests;
- one-shot backend `npm run build`: passed;
- one-shot frontend `npm run build`: passed, with only the existing Vite
  chunk-size warning.

The existing React `act(...)` warnings remain visible in regression tests but
do not fail assertions. A separate aggregate backend module-wiring suite was
attempted and reached the repository's fixed 1 GiB Node heap before assertions
completed; it is not claimed green. The new controller, providers, and module
wiring compile in the successful Nest build, while the focused boundary tests
above are green. The full frontend unit gate was not repeated; its latest
recorded broad result remains the section 50 audit and is not promoted by this
checkpoint.

The immutable capability catalog advances to revision `2026-08-21.8`.
`topology_search_filter_catalog` remains truthfully `partial/blocked`, but its
delivery blocker narrows from integration missing to
`immutable_tile_certification_ledger_not_published`; the remaining visual
blocker is `browser_filter_proof_pending`. Catalog totals remain 42
implemented, 30 partial, 3 preserve-only, and 4 not-started; release totals
remain 37 available, 37 blocked, and 5 hidden.

No exhaustive immutable report has been published or configured by this
checkpoint, and no fresh guarded browser artifact was captured. The
99-tileset source-bound matrix, independent PathConnect and WOK evidence,
native Toolset Save/Build/reopen, packed readback, and NWN runtime
certification therefore remain unchanged and are not claimed complete.

## 55. Continued implementation checkpoint — 2026-08-21 (99-tileset certification publication)

This checkpoint publishes the first complete immutable tile-definition ledger
for the source-bound v7 matrix. It is an offline publication checkpoint, not a
claim that the matrix or Area program is complete. No backend service,
frontend service, browser, capture, Toolset, or NWN process was started; ports
3000 and 5173 and the repository service/capture locks remained available to
the separately owned VFX proof lane.

The publication policy is frozen in
`backend/docs/aurora-reverse/area-tile-certification-publication-contract-v1-2026-08-21.md`.
The pure domain builder creates one production `tile-definition` row for every
catalog `(tilesetResRef, Tile_ID)`, derives one `area-certification-plan.v2`,
and produces the canonical `area-certification-release-report.v1`. It binds
the catalog, source inventories, matrix plan/schema/revision/fingerprint,
profile, exact row membership, and publication policy through SHA-256.
Changing proof progress changes the ledger/report hashes but cannot silently
change plan membership.

The evidence adapter fails closed on catalog, inventory, definition,
checkpoint, review, and artifact hash drift; unsafe paths; unsupported source
statuses; count drift; or matrix plan drift. It sandwiches evidence admission
between two canonical full `matrix status` validations and requires the
checkpoint hash to remain unchanged. Every accepted review is rebound to its
exact frame, state, canvas, page, lifecycle, attempt, chunk, source SET hash,
and independent visual checks. Overlapping SET group fixtures are retained as
separate evidence bindings but deduplicated to the canonical unique-row
coverage count.

The proof mapping remains deliberately conservative:

- 45,006 `source_resolved` rows have `inventory=verified`;
- 34 `source_missing` rows have `inventory=failed`;
- 8,660 intentional placeholders are excluded with
  `TILE_MODEL_INTENTIONAL_PLACEHOLDER`;
- 14 accepted reviews contain 118 exact member references representing 116
  unique rows, so only those rows receive `assetClosure=verified` and
  `render=verified`;
- `visualSeam`, `setAdjacency`, `pathReference`, `pathConnect`, `wokSeam`,
  `persistence`, `toolset`, and `nwnRuntime` remain `missing` for every
  eligible production row.

The publisher supports preview without writes and explicit atomic execution.
It rebuilds the complete report a second time, compares the exact compact
bytes, enforces the existing 64 MiB delivery budget, fsyncs a temporary file,
renames it into place, and checks byte-for-byte readback. The published
artifact is:

- path:
  `output/proof/area-tile-certification-publication-v1-source-bound-2026-08-21/release-report.json`;
- bytes: `47,153,455` (compact UTF-8 JSON);
- file SHA-256:
  `cad00e2f37cada9bd7b8109a6042d29bf8490b0dd6eef31a21f0bcf2e809592c`;
- corpus SHA-256:
  `5fdf5e1b0e1ef87807ea42bd6c581a335df3f137e7543aa1c3eda76b49f7382f`;
- certification plan id:
  `e7d2135b06f72c10a9395a65511eb733aeca89e55d38315d4150689f667402f0`;
- planned-row SHA-256:
  `a648a624e7e9461bb62c5d4f1b25ef3f418e54e3f2ff3f9c5c12cd883ea44e15`;
- ledger SHA-256:
  `419d61092567277c6f976e11c77d223822e39452267bbac3d16d219c83412d11`;
- report SHA-256:
  `769923abf9750c79b11f03629a4af5506333a5a320a1fc054700565a747f9750`;
- checkpoint SHA-256:
  `e3384d3f71bf230df60616ce4a2d8d6f169ad52af13a76ad8f117d3b080c55a7`.

The report truthfully remains `blocked` with
`production_rows_incomplete`: all 45,040 eligible production rows remain
production-blocked, including the 116 Add/Render-accepted rows, because no row
has all eleven independent proof dimensions verified. The 8,660 excluded
placeholders are not production-selectable and do not weaken the denominator.

The real file-source and query path accepted the complete artifact under the
fixed 1 GiB heap. A cold load, canonical rebuild, stable integrity comparison,
and index creation took 1,320 ms in the recorded local check and used 196 MiB
of heap afterward. The `atj02` query returned 524 ordered rows; its first page
contained Tile_ID 0 through 255 with the exact plan and report bindings.

TDD and offline verification for this slice:

- domain publication suite: 7/7 tests;
- evidence/hash/path/atomic-write suite, including overlapping group proof:
  passed;
- Area capability catalog suite: 12/12 tests;
- canonical full v7 matrix status: `ready`, checkpoint 14/3,378;
- publication preview: passed without writing;
- publication execution and exact readback: passed;
- one-shot backend production build: passed.

Capability catalog revision `2026-08-21.9` promotes
`topology_search_filter_catalog` to `implemented/blocked`; its only remaining
blocker is `browser_filter_proof_pending`. `certification_release_report`
remains `implemented/hidden`, but its blocker now truthfully names
`production_certification_rows_incomplete` rather than a missing ledger.
Catalog totals become 43 implemented, 29 partial, three preserve-only, and
four not-started; release totals remain 37 available, 37 blocked, and five
hidden.

This closes publication and bounded delivery of the current immutable ledger.
It does not close the remaining 3,364 Add/Render chunks, independent
PathConnect/WOK proof, the production placement gate, browser visual evidence,
native Toolset Save/Build/reopen and packed readback, or NWN runtime
certification.

## 56. Continued implementation checkpoint — 2026-08-21 (production tile-placement admission)

This checkpoint implements the production placement gate over the immutable
tile-definition ledger published in section 55. The gate is a project
release-safety policy and introduces no Aurora runtime semantic, renderer
parameter, or external GPL dependency. Its frozen contract is
`backend/docs/aurora-reverse/area-tile-production-placement-admission-contract-v1-2026-08-21.md`.

Before work resumed, ports 3000 and 5173 were confirmed free and the global
backend, frontend, and proof-capture lock files were absent. No backend service,
frontend service, browser, capture, Toolset, or NWN process was started. The
runtime pair and single capture lane therefore remained available to the
separately owned VFX proof task throughout this offline checkpoint.

`WorkspaceLayout` now owns one ephemeral certification source for the exact
active normalized tileset. It loads the immutable index only through
`AreaEditingFacade`, replaces the source immediately with loading or an exact
unavailable reason, discards late results from superseded effects, and emits
sanitized load-started, load-ready, and load-failed telemetry. The source is
passed to both the Area panel and viewport paths and is never copied into scene,
draft, history, or ARE state.

The pure application policy admits a changed result Tile_ID only when the
source is ready for the exact tileset, the exact ledger row exists, the row is
eligible, and `inventory`, `assetClosure`, and `render` are all `verified`.
Loading, unavailable, foreign-tileset, missing-row, excluded, missing-proof, and
failed-proof states fail closed with stable codes and deterministic Tile_ID-
sorted diagnostics. Mixed multi-tile candidates are atomic. One shared domain
helper identifies topology changes by Tile_ID, orientation, height, and group
projection; property-only changes do not manufacture a placement claim.

Pointer previews now carry the exact candidate result Tile_ID set produced by
the same pure terrain, crosser, height, eraser, and group commands used for
commit. An uncertified hover is rendered as invalid, a blocked click does not
invoke the mutation port, and the commit boundary repeats admission so a later
drag candidate cannot bypass a previously admitted preview. If a drag begins
with an admitted candidate and later produces an uncertified result, the
admitted prefix remains one history command while the blocked candidate leaves
the current history object unchanged.

The Area panel applies the same policy to initial blank-Area topology, resize,
whole-Area rotation, Tile_ID replacement, tile rotation/height/reroll, SET group
mutation, and topology-changing Tile Properties. Blocked catalog rows are
disabled with the stable diagnostic code. Creation loads the selected
tileset's exact certification index before selecting the new scene. The
diagnostic exact-fixture bypass is now genuinely limited to DEV builds and
`matrix_*` Area ResRefs; the local proof event also rejects non-`matrix_*`
identities.

The clipboard path was found during the final mutation-boundary audit and was
closed before this checkpoint was promoted. `Cut`, `Delete`, and `Paste`
evaluate the complete candidate before clipboard, selection, scene, or history
mutation. Tests prove unavailable-source deletion fails closed and a group
paste containing one missing Tile_ID is rejected atomically. Copy remains a
read-only command and does not require an admission claim.

Blocked operations emit
`scene.area_tiles.production_admission.blocked` with the stable result code,
operation kind, normalized tileset, changed Tile_ID count, first blocked
Tile_ID, and first blocked stage. No filesystem path, transport detail, or
token is exposed.

TDD first recorded missing-policy failures, blocked-preview failures, and the
previously unguarded clipboard commits. Offline verification under the fixed
1 GiB Node heap and at most two workers is:

- production-admission policy, placement preview, pointer, clipboard, Area
  panel, and layout wiring suites: 173/173 tests;
- frontend regression smoke: 78/78 tests;
- Area capability catalog: 12/12 tests;
- one-shot frontend production build: passed, with only the existing Vite
  chunk-size warning;
- one-shot backend production build: passed.

The full frontend unit gate completed at 2,999/3,001. Every Area test and every
test added by this checkpoint passed. The two failures are outside the Area
scope: the Placeable HTTP mapping expectation does not include newly mapped
optional render-package fields, and a Placeable texture-loader test expects
`THREE.DoubleSide` while the current material remains front-sided. These
failures are recorded rather than misreported as a green broad gate. Existing
React `act(...)` warnings remain non-failing.

The immutable capability catalog advances to revision `2026-08-21.10`.
`topology_certified_placement_gate` is now truthfully `implemented/blocked` and
cites the policy, preview, pointer, clipboard, panel, layout, and contract
evidence. Its remaining blockers are
`production_certification_rows_incomplete` and
`browser_production_placement_proof_pending`. Catalog totals become 44
implemented, 28 partial, three preserve-only, and four not-started; release
totals remain 37 available, 37 blocked, and five hidden.

This closes the offline implementation of the production admission boundary,
not the Area program. Fresh guarded browser evidence remains pending until the
runtime pair is released by the VFX proof lane. The remaining 3,364 Add/Render
chunks, full production-row certification, independent PathConnect and WOK
evidence, native Toolset Save/Build/reopen and packed readback, and NWN runtime
certification remain open and are not claimed complete.

## 57. Continued implementation checkpoint — 2026-08-21 (server materialization admission)

This checkpoint closes the direct-API bypass left after section 56. The
frontend placement gate remains immediate usability protection, while Area
Create and Area Update validation and materialization now independently enforce
the same production release-safety decision on the server. The implemented
contract is
`backend/docs/aurora-reverse/area-tile-server-materialization-admission-contract-v1-2026-08-21.md`.
It consumes the existing immutable certification report and introduces no new
Aurora runtime semantic or external GPL dependency.

The pure server policy normalizes the tileset, deduplicates and numerically
sorts every Tile_ID in the complete resulting Area, and requires an exact
eligible row with verified inventory, asset closure, and render proof. Missing
or excluded rows and missing or failed proof states reject the whole candidate
with stable 422 codes and bounded deterministic diagnostics. An unavailable or
invalid configured report fails closed with the existing stable 503 source
codes. There is no `matrix_*`, actor, module, Area, or asset-identity bypass.

Validation now evaluates the full compiled Create grid or Update projected
draft only after independent candidate validation/readback. A committing
transaction repeats the decision under the fenced module lease after compile
and before `journal.begin`; a failure therefore creates no journal, staging,
publication, compensation, quarantine, cache invalidation, or idempotency
result and releases the lease exactly once. Exact idempotent replay remains
authoritative and performs no later ledger read.

Every successful validation and materialization result retains an additive
`area-tile-production-admission.v1` binding: report timestamp, plan, corpus,
profile, ledger and report hashes, normalized tileset, unique Tile_ID count,
and the canonical Tile_ID-set SHA-256. Materialization additionally persists
that binding in the byte-free Create/Update candidate manifest. Memory and
MySQL control stores compare every field against the verified readback receipt
before retention, so a receipt cannot drift to another report or tile set.
Legacy or incomplete manifests without the binding cannot finalize a new
verified readback.

The frontend Create and Update contracts and strict HTTP schemas retain the
same binding for validation and materialization. Explicit negative tests prove
that a successful HTTP response without provenance is rejected rather than
silently accepted.

Offline verification under the fixed 1 GiB Node heap and at most two workers
is:

- server admission policy, ledger query, Create/Update validation,
  transactions, controller pass-through, recovery, and memory/MySQL journal
  suites: 274/274 tests;
- dedicated Area Create atomic pipeline integration: 2/2 tests;
- isolated module-wiring gate, including the exact admission provider alias:
  5/5 tests;
- strict frontend Create/Update HTTP adapter suites: 22/22 tests;
- Area capability catalog: 12/12 tests;
- one-shot backend and frontend production builds: passed.

The dedicated integration and wiring runners use TypeScript isolated-module
transpilation to remain inside the mandatory 1 GiB test heap; the production
backend build still performs full type checking. No heap limit was raised.

The immutable capability catalog advances to revision `2026-08-21.11`.
`topology_certified_placement_gate`, `lifecycle_materialize_create`, and
`lifecycle_materialize_update` now cite the server policy, transaction,
journal, integration, frontend contract, and contract-document evidence.
Their implementation states remain truthful and their release blockers retain
`production_certification_rows_incomplete`, browser proof where applicable,
and native Save/Build/reopen. Catalog totals remain 44 implemented, 28 partial,
three preserve-only, and four not-started; release totals remain 37 available,
37 blocked, and five hidden.

During final coordination, ports 3000 and 5173 were confirmed free and no
repository/TEMP lock or PID file was present. No backend service, frontend
service, browser, capture, Toolset, or NWN session was started by this
checkpoint, leaving the runtime pair and single capture lane free for the VFX
proof owner.

This closes server-side certified materialization admission, not the Area
program. Fresh guarded browser placement evidence, the remaining 3,364
Add/Render chunks and production-row certification, independent PathConnect
and WOK evidence, native Toolset Save/Build/reopen and packed readback, and NWN
runtime certification remain open and are not claimed complete.

## 58. Continued implementation checkpoint — 2026-08-21 (runtime-build-bound matrix v8)

An exact-build provenance audit found that the accepted source-bound v7
Add/Render frames contain a backend process-start observation but null backend
commit/image/build timestamp and no separate frontend identity. The 14 v7
acceptances remain immutable historical visual evidence, but they are not
eligible for final renderer certification and cannot be backfilled. The audit
and normative remediation are recorded in
`backend/docs/aurora-reverse/tile-add-connect-matrix-runtime-build-identity-audit-2026-08-21.md`
and
`backend/docs/aurora-reverse/tile-add-connect-matrix-runtime-build-identity-contract-v1-2026-08-21.md`.
This is proof-control/build provenance and introduces no new Aurora semantic or
external GPL dependency.

Matrix revision `path-node-aware-v8` now requires a bounded immutable runtime-
build profile and embeds its normalized binding in the manifest hash,
checkpoint, summary, heartbeat, staging packet, independent review, accepted
or rejected review ledger, status, and certification publication. Fresh v8
checkpoints explicitly initialize empty accepted and rejected review ledgers.
Missing/malformed profile fields, profile-file hash drift, binding drift at any
transition, v7 resume, or mixed-build publication fail closed.

The frontend Areas workspace exposes its compiled build identity only in DEV
through a bounded dataset. The guarded capture reads that DOM value, backend
health through the frontend proxy, and backend health directly. Both backend
observations must agree with the profile and each other; their process start
must be no earlier than the profile build. The exact expected binding and raw
observations are saved in `runtimeBuildProof` and independently revalidated by
the matrix controller and release publisher. Backend proxy/direct health is
read again after the screenshot, and a changed `processStartedAt` rejects a
mid-capture process restart.

A second no-guessing pass closed a development-server drift gap before v8 was
materialized. The repository generator hashes an ordered manifest of runtime
source roots and build-toolchain files, excluding transient caches such as
`__pycache__`, and derives both worktree commit tokens and image-digest tokens
from that content digest. Capture recomputes the same identity before browser
work and after the screenshot. Profile mismatch, local source/VFX-revision
drift, or a source change during capture blocks staging. Only bounded source-
identity summaries enter the frame; full file paths/hashes remain in the
immutable generator artifact.

The certification publisher now rehashes and rebuilds the runtime profile
binding, requires revision v8, verifies every accepted review and frame, and
adds runtime profile id, profile SHA-256, and binding SHA-256 to the canonical
corpus identity. It still promotes only exact accepted Add/Render rows;
PathConnect, WOK, persistence, Toolset, and NWN remain independent and missing.

Offline verification completed so far is:

- runtime profile, source identity, deterministic generator, and matrix
  planner: four script gates passed;
- offline inventory and hash-bound catalog planners: passed;
- matrix status/staging/review/recovery control plane: passed;
- independent PathConnect proof contract: five script gates passed;
- certification publication evidence, including binding and source-drift
  negatives: passed;
- runtime capture proof-safety and same-browser restart contracts: passed;
- focused frontend runtime-identity helper: 2/2 tests;
- focused Areas workspace layout: 95/95 tests;
- focused backend certification-publication domain: 7/7 tests;
- one-shot backend and frontend production builds: passed, with only the
  existing Vite chunk-size warning.

The immutable runtime profile is now
`backend/docs/aurora-reverse/proof-profiles/tile-add-connect-runtime-build-v8-source-bound-2026-08-21.json`.
Its profile id is `area-tiles-99-source-bound-v8-20260821`, file SHA-256 is
`d91c9fb9a93d06a336c4827953b3bca846e17dd95eeed021af129a2ec011373e`,
and canonical runtime-source digest is
`b1e87a720f9d6ce877f5653b229074a15e22e7838e2ab1e7c6ce9da335f9149e`.
The bound source manifest has SHA-256
`660bc3677139878b463cc7a3d79feb483797573233ee5188b5c1363568d721d1`
and covers 1,342 ordered files totaling 25,630,681 bytes.

The fresh plan is
`output/proof/tile-add-connect-matrix-v8-runtime-build-bound-2026-08-21`.
Its plan id / manifest SHA-256 is
`06671294cf7009bc969fabac6b5ae75109098e50afe866e65a1f38e77bb03af5`,
its contract fingerprint is
`6ad901f574595fe1d0108bd2ef51c8cecfae02bd0df8703e86e816c19d61aa61`,
and its runtime-build binding SHA-256 is
`c0f4b8b1851ac2c92b92ca2dc3ab433e5e6145ffb772e0b0b2c9ba77ab0de8d9`.
It contains 99 tilesets, 53,700 rows, and 3,378 chunks. Checkpoint SHA-256
`f3013d45ae587f0e16d07d106f0f97a0d67449450ff57727659a3bb67db50869`
is at cursor zero with no imported v7 captures or reviews. Canonical status is
`ready`; the next unit is `atj02-group-chunk-0001`.

The corresponding zero-checkpoint publication is
`output/proof/area-tile-certification-publication-v8-runtime-build-bound-2026-08-21/release-report.json`.
It is 48,177,482 bytes, has file SHA-256
`6f1c94e7f2c4401944c50b7f46ed77e883bfad95d110f71eabd0748a33e5dbc0`,
and remains truthfully `blocked` by `production_rows_incomplete`: zero rows are
production-ready. A real built-backend source/query probe loaded, rebuilt, and
indexed it in 1,489.07 ms under the 1 GiB heap; cached page and admission
queries took 0.20 ms and 0.64 ms. Admission correctly failed closed with
`AREA_TILE_CERTIFICATION_PROOF_MISSING` for checkpoint-zero rows.

This proof-control slice does not change an end-user Area capability state, so
the immutable capability catalog remains revision `2026-08-21.11`. The exact
profile and checkpoint-zero plan are complete. The first guarded capture and
independent review remain pending until a matching managed backend/frontend
pair is available. The currently running pair and its backend/frontend locks
belong to the active VFX proof owner; the global proof-capture lock is free.
No service or capture was started or stopped by this checkpoint.

This does not close the Area program. All 3,378 v8 Add/Render chunks still
require capture and independent acceptance. Production-row publication,
independent PathConnect and WOK evidence, native Toolset Save/Build/reopen and
packed readback, and NWN runtime certification also remain open.

## 59. Continued implementation checkpoint — 2026-08-21 (v8 fail-closed live preflight)

The first guarded capture of `atj02-group-chunk-0001` exercised the new source
identity gate and stopped before browser work. The durable failure frame is
`output/proof/tile-add-connect-matrix-v8-runtime-build-bound-2026-08-21/captures/atj02-group-chunk-0001.failure.frame.json`.
Its SHA-256 is
`ee27db3ceee324e0c281f029fab9ddb4e589c4fccf72024e955450d8f7551a89`.
It records blocker `runtime_source_identity_mismatch`, no PNG or canonical
frame, and `canonicalParityPromoted=false`. The attempt lasted 104 ms. The
checkpoint remains at cursor zero with no captured, accepted, or rejected
chunks and SHA-256
`f3013d45ae587f0e16d07d106f0f97a0d67449450ff57727659a3bb67db50869`;
the blocked heartbeat SHA-256 is
`23f6cb68a66cbb4df5b8263a8f43a0e6b1f6b9e711394b8411881049218c8e05`.
The failed attempt was not misreported as a renderer result.

The frozen profile expected source digest
`b1e87a720f9d6ce877f5653b229074a15e22e7838e2ab1e7c6ce9da335f9149e`,
1,342 files, and 25,630,681 bytes. The live preflight observed digest
`8edd8dc7310472575f63ec81958ad5c25a5584fe9f8140d30cb1ca9be12d0d83`,
the same file count, and 25,631,705 bytes. A record-level read-only comparison
found five changed `backend/scripts` files in the concurrent VFX lane, with
byte deltas `+255`, `+286`, `+77`, `-3`, and `+409`; together they explain the
entire `+1,024`-byte drift. No Area renderer or matrix proof-control source was
different. This is a verified shared-worktree provenance change, not evidence
of a tile-rendering defect.

The original v8 profile, plan, zero publication, and failure packet remain
immutable. They will not be rewritten or accepted against the new digest. A
successor profile/plan may be generated only after the shared source set is
stable. It must start again at checkpoint zero, publish zero production-ready
rows, and pass the same first guarded capture plus independent visual review
before bulk matrix work resumes.

The capture-owned managed backend/frontend pair was stopped after the
blocker. Ports `3000` and `5173`, both service locks, and the global capture
lock were confirmed free for the VFX proof owner. No retry or parallel Chrome
lane was started.

## 60. Continued implementation checkpoint — 2026-08-21 (completion audit refresh)

A fresh requirement-by-requirement offline audit is recorded in
`backend/docs/aurora-reverse/area-program-completion-audit-2026-08-21.md`.
The immutable capability catalog contains 79 rows: 44 `implemented`, 28
`partial`, 3 `preserve_only`, and 4 `not_started`; release states are 37
`available`, 37 `blocked`, and 5 `hidden`. This proves that the remaining work
is not only capture execution. Application gaps, unknown Aurora semantics, and
implemented-but-uncertified rows remain separate categories.

The canonical stage validator reports Stage 4 at 8/8 accepted. Stage 5 is
6/11, Stage 6 is 0/7, Stage 7 is 0/6, and Stage 8 is 0/6. The exact missing
function IDs and resume order are retained in the audit. The next safe offline
application slice is coherent Area workspace state feedback; the current UI
can record a browser recovery copy and update a local `Saved` timestamp before
the remote CAS result, which must not be confused with a successful remote
draft save. The separate 2 GiB asset-cache budget/clear slice also remains a
real implementation gap and cannot be closed by a cosmetic button.

No runtime source was edited during this checkpoint because the VFX lane again
owned the managed backend/frontend pair and required a stable profile-bound
source set. The global capture lock remained free.

## 61. Continued implementation checkpoint — 2026-08-21 (workspace state feedback)

`workspace_state_feedback` is implemented and available in immutable capability
catalog revision `2026-08-21.12`. The workspace now carries a versioned
`area-workspace-status.v1` event contract and an always-visible four-lane status
bar for draft persistence, Area verification, CUD materialization, and tile
certification delivery. These lanes do not collapse browser recovery into
remote persistence or certification-index availability into visual/native
proof.

Draft persistence writes the browser recovery copy first but reports `saved`
and updates the saved timestamp only after the remote CAS succeeds. Conflict,
port failure, and browser-write failure remain distinct. Both scene version and
command revision reject stale completions, so an older in-flight save cannot
hide newer edits. Area Verify emits checking/verified/failed. Atomic Create,
Update, and Delete emit validating, blocked/ready, materializing,
conflict/recovery/failed, and verified-readback states.

Focused frontend validation passed 44 tests across:

- `areaWorkspaceStatus.test.ts`;
- `AreaWorkspaceStatusBar.test.tsx`;
- `useWorkspaceCommandSignal.areaDraft.test.tsx`;
- `AreasModePanel.areaTileReadiness.test.tsx`;
- `AuroraAreaEditingPanel.canvasSelection.test.tsx`;
- `AreaSelectionPanel.delete.test.tsx`.

The frontend production build passed. The backend capability catalog gate
passed 12/12. Catalog totals are now 45 implemented, 27 partial, 3
preserve-only, and 4 not-started; 38 available, 36 blocked, and 5 hidden.
No managed service, browser capture, Toolset, or NWN process was started or
stopped for this application-only slice.

## 62. Continued implementation checkpoint — 2026-08-21 (bounded client asset cache)

`workspace_cache_budget_clear` is implemented in immutable capability catalog
revision `2026-08-21.14`; its release remains blocked only by
`browser_cache_control_proof_pending`. This slice is project-policy behavior and
does not depend on an unknown Aurora semantic.

The frontend now owns a dedicated client asset cache port and a browser
CacheStorage adapter with an exact 2 GiB hard budget. Cache keys combine the
immutable 64-hex SHA-256 lineage, delivery URL, and user scope. Mutations are
serialized, prior lineages for the same scoped URL are replaced, and measured
least-recently-used entries are evicted before the adapter can report an
over-budget state. An individual response larger than the hard budget is
rejected. Application startup executes the budget-enforcement port so a
persisted over-budget state cannot wait for the next asset write. Only
successful same-origin immutable delivery URLs are admitted;
requests without an exact lineage continue through the ordinary network path.

App composition passes the port through WorkspaceLayout into the canvas. The
runtime uses one cache-aware fetch function for both placeable model and texture
delivery. Options exposes measured bytes, entry count, the exact hard cap, and
a user Clear action. Clear deletes only `aurora-web.immutable-assets.v1`; auth,
browser Area recovery drafts, and unrelated CacheStorage namespaces remain
untouched. Sanitized telemetry records hit, miss, store, skip, failure,
inspection, and clear outcomes without query strings or internal cache
metadata headers.

The first dedicated performance run failed because every admission rescanned
and cloned the complete persistent cache. The adapter now initializes one
metadata index, updates it within the serialized mutation queue, and refreshes
from durable CacheStorage for explicit inspect, startup enforce, and clear
operations. Scene-runtime disposal is separately executable evidence: model,
normalized-model, texture, pending-request, primitive-geometry, controls,
renderer, and GPU resource stores are released when the canvas runtime leaves,
without coupling that disposal to the persistent immutable cache.

Validation passed:

- 22 focused unit tests in `browserClientAssetCachePort.test.ts`,
  `ClientAssetCacheControl.test.tsx`, and `WorkspaceTopbar.facades.test.tsx`;
- `workspaceThreeRuntime.disposeAssetCaches.test.ts` is included in that unit
  total and exercises scene-cache/GPU disposal;
- one regression smoke in `Workspace.asset-cache.regression-smoke.test.tsx`;
- one dedicated performance benchmark: 128 immutable 1 KiB admissions under a
  64 KiB LRU budget in less than 2,500 ms, followed by 500 cache hits in less
  than 1,000 ms with zero network requests;
- the frontend production build;
- 12/12 backend capability-catalog tests.

Catalog totals are now 46 implemented, 26 partial, 3 preserve-only, and 4
not-started; 38 available, 36 blocked, and 5 hidden. No browser capture,
Toolset, or NWN session was used for this application-only checkpoint. The UI
release state must not move to `available` until a fresh guarded browser proof
demonstrates measured usage and a successful clear while draft recovery and
sign-in remain intact.

## 63. Continued implementation checkpoint — 2026-08-21 (existing Area Comments)

`properties_comments` is implemented in immutable capability catalog revision
`2026-08-21.15`. Release remains blocked by
`native_area_comments_save_build_reopen_pending` and
`browser_area_comments_proof_pending`; application tests and builds are not
being treated as either proof class.

The primary Aurora audit at
`backend/docs/aurora-reverse/area-existing-comments-audit-v1-2026-08-21.md`
proves the exact existing Area root field `Comments : CExoString`: Area reader
`FUN_005a7fc8` consumes it through the type-10 string reader and Area writer
`FUN_005a9f30` emits it through the matching string writer. The canonical
frontend/backend contract now permits mutation only when the source contains
one exactly cased, correctly typed field and the request supplies a complete,
changed `{ expectedValue, value }` pair. Missing, duplicate, wrong-case,
wrong-type, stale, NUL-bearing, and over-budget values fail closed. Empty text
is valid and distinct from field absence; no trim, normalization, case folding,
or truncation is allowed.

Backend parsing, detail transport, draft projection, writer preservation,
candidate validation, atomic ARE/GIT/GIC/IFO publication, and readback now
carry that contract end to end. Frontend HTTP mapping, scene mapping,
application facade, direct export/verify transfer, and the Area Properties
Comments tab use the same exact-value rules. Basic, Visual, Audio, Events, and
Advanced tabs remain visibly preserve-only until their own field contracts are
closed. Direct export derives the CAS pair from the immutable production source
and the current scene, not from an untrusted browser recovery value.

Accepted offline validation:

- 600 backend unit tests across parser, transport, projection, schema, writer,
  independent candidate validation, service, repository, compiler, and
  application layers;
- 22 Area-update integration tests covering atomic publication and exact
  readback while GIT/GIC/IFO companions remain unchanged;
- 90 frontend unit/component tests across HTTP, mapping, facade, export, dialog,
  and panel integration;
- 12/12 capability-catalog tests with totals 47 implemented, 25 partial, 3
  preserve-only, and 4 not-started;
- passing backend and frontend production builds.

The Area-update integration harness was supplied with its newly required
admitted tile-placement dependency so the existing transaction suite remains
compilable; production admission semantics were not changed. A single combined
backend run exceeded the mandatory 1 GiB Node heap, so the same unit suites
were accepted in three bounded one-shot batches without increasing the limit.

No managed backend/frontend service, browser capture, Toolset, or NWN process
was started for this checkpoint. The next work for this row is a guarded
browser interaction/readback proof after the capture lane is released, plus a
central Toolset Save/Build/reopen proof using the required Aurora operation and
proof workflows.

## 64. Continued implementation checkpoint — 2026-08-22 (Area event scripts)

`properties_event_scripts` is implemented in immutable capability catalog
revision `2026-08-22.16`. Release remains blocked by
`script_catalog_compile_status_incomplete`,
`browser_area_event_scripts_proof_pending`, and
`native_area_event_scripts_save_build_runtime_pending`.

Primary audit
`backend/docs/aurora-reverse/area-existing-event-script-resrefs-audit-v1-2026-08-21.md`
proves four exact Area root fields: `OnEnter`, `OnExit`, `OnHeartbeat`, and
`OnUserDefined`, each GFF type 11 / `ResRef`. The recovered reader accepts type
11 and the writer stores a one-byte length, lowercasing ASCII `A-Z`. The frozen
application contract therefore admits only empty or 1-16 lowercase ASCII
`[a-z0-9_]` values. Empty unbinds an event; absence remains preserve-only.

Each changed slot carries an exact `{ expectedResRef, resRef }` CAS pair.
Missing, duplicate, wrong-case, wrong-type, stale, unchanged, uppercase,
invalid-character, and over-length requests fail closed. The application never
trims, truncates, replaces, or silently lowercases a requested value and never
materializes an absent field.

The complete offline path now includes parser presence and dependency identity,
repository/detail/processed transport, production-draft projection, HTTP
schema, preserve-first writer, independent candidate validation, atomic
ARE/GIT/GIC/IFO publication/readback, frontend HTTP and workspace boundaries,
application facade, direct Verify/Export transfer, and editable/preserve-only
controls in the Area Properties Events tab.

Accepted validation:

- 636 backend unit tests across the event domain, parser, schema, projector,
  writer, candidate validator, repository, services, and compiler;
- 22 Area-update integration tests, including exact event readback and
  byte-identical GIT/GIC/IFO companions;
- 99 frontend unit/component tests across HTTP, scene/workspace mapping, facade,
  transfer, and UI;
- 12/12 capability-catalog tests with totals 48 implemented, 24 partial, 3
  preserve-only, and 4 not-started;
- passing backend and frontend production builds.

Two combined heavy-backend invocations exceeded the mandatory 1 GiB Node heap
without an assertion result. Their constituent suites all passed in bounded
one-shot runs; the heap limit was not raised. No managed service, browser
capture, Toolset, or NWN process was started. Script discovery/compilation and
fresh browser/native behavior remain release proof, not inferred completion.

## 65. Continued implementation checkpoint — 2026-08-22 (bounded Area Name/Tag)

The exact existing-field `Name`/`Tag` slice is implemented in immutable
capability catalog revision `2026-08-22.17`. The broader
`properties_basic_identity` capability remains `partial`: alternate localized
Name layouts are preserve-only, the remaining basic/description native field
matrix is incomplete, and browser plus native proof are still pending.

Primary audit
`backend/docs/aurora-reverse/area-existing-basic-identity-audit-v1-2026-08-22.md`
proves the exact root `Name : CExoLocString` and `Tag : CExoString` reader and
writer families in Aurora. The bounded application contract admits Name only
when retained storage has strRef `0xffffffff`, exactly one language-id `0`
inline entry, 1-256 printable ASCII bytes, and a non-whitespace value. Tag is
admitted only as one exact 0-64-byte printable ASCII `CExoString`; empty Tag is
valid and remains distinct from field absence.

Each changed field carries an exact `{ expectedValue, value }` CAS pair.
Missing, duplicate, wrong-case, wrong-type, stale, unchanged, malformed,
non-ASCII, and over-budget requests fail closed. The application never trims,
normalizes, changes case, truncates, transliterates, replaces, or materializes
unsupported storage. A changed exported Area name must have a coherent Name
CAS mutation whenever the retained Name is in the editable profile, closing
the former silent non-persistence path.

The offline implementation path includes parser provenance and dependency
identity, repository/detail/processed transport, production-draft projection,
strict schema validation, preserve-first ARE writing, independent candidate
validation, compiler transfer, atomic ARE/GIT/GIC/IFO publication/readback,
frontend HTTP and scene/workspace boundaries, application facade, direct
Verify/Export transfer, the Area Properties Basic tab, and panel-to-scene
mutation.

Accepted offline validation:

- 661 backend unit tests in bounded one-shot runs across the domain, parser,
  schema, projector, writer, candidate validator, repository, services, and
  compiler;
- 22 Area-update integration tests, including exact Name/Tag/Comments/script
  readback with byte-identical GIT/GIC/IFO companions;
- 115 frontend unit/component tests across HTTP, scene/workspace mapping,
  facade, transfer, dialog, and panel integration;
- 12/12 capability-catalog tests with totals unchanged at 48 implemented, 24
  partial, 3 preserve-only, and 4 not-started;
- passing backend and frontend production builds.

One combined backend run exceeded the mandatory 1 GiB Node heap without an
assertion result. Its constituent suites passed separately; the heap limit was
not raised. No managed service, browser capture, Toolset, or NWN process was
started. At the resource handoff, ports `3000`/`5173` and the backend,
frontend, and capture locks were confirmed free for the VFX lane.

## 66. Continued implementation checkpoint — 2026-08-22 (bounded Area Advanced gameplay flags)

The exact existing-field terrain/PvP/NoRest slice is implemented in immutable
capability catalog revision `2026-08-22.18`. The broader
`properties_advanced_flags` capability remains `partial`: Listen/Spot
modifiers, loading-screen identity, variables, and unverified Advanced fields
remain preserve-only, while browser interaction/readback and native
Save/Build/runtime proof are still pending.

Primary audit
`backend/docs/aurora-reverse/area-existing-advanced-flags-audit-v1-2026-08-22.md`
binds the frozen Toolset decompilation, installed Area Properties dialog RCDATA,
and retail `pvpsettings.2da`. The recovered reader and writer agree on exact
root `Flags : DWord`, `PlayerVsPlayer : Byte`, and `NoRest : Byte` fields.
Only Flags `0..7` are editable: bit 0 is Interior, bit 1 is
Subterranean/Underground, and bit 2 is Natural. PvP admits exactly values
`0..3` (`none`, `party`, `full`, `default`) and NoRest exactly `0|1`. Unknown
Flags bits are never masked; that retained profile is preserve-only.

Every changed value is an exact complete `{ expectedValue, value }` CAS pair.
Terrain crosses the boundary as three booleans, PvP as `0|1|2|3`, and NoRest
as boolean. Missing, duplicate, wrong-case, wrong-type, stale, unchanged,
unknown-key, and out-of-domain values fail closed. The backend reparses the
retained ARE, replaces only requested fields, independently parses candidate
readback, and publishes through the existing atomic transaction. GIT, GIC, and
IFO companions remain byte-identical for an Area-property-only update.

The frontend consumes exact optional provenance through the HTTP port and
scene mapper, validates persisted workspace drafts, applies changes only
through the Area Properties facade, derives Verify/Export CAS from immutable
production source, and exposes Aurora-shaped terrain choices, closed PvP mode,
and No Rest on the Advanced tab. Unsupported controls remain visibly
preserve-only.

Accepted offline validation:

- 698 backend unit tests in bounded one-shot runs across the advanced domain,
  parser, schema, projector, writer, candidate validator, repository,
  services, compiler, and capability catalog;
- 22 Area-update integration tests, including exact advanced-field readback
  and byte-identical GIT/GIC/IFO companions;
- 142 frontend unit/component tests across domain, HTTP, scene/workspace
  mapping, facade, transfer, dialog, and panel integration;
- 12/12 capability-catalog tests with totals unchanged at 48 implemented, 24
  partial, 3 preserve-only, and 4 not-started;
- passing backend and frontend production builds.

One combined heavy-backend invocation exceeded the mandatory 1 GiB heap
without producing an assertion result. Its constituent suites passed as
bounded one-shot runs; the heap limit was not raised. No managed service,
browser capture, Toolset, or NWN process was started. Browser and native proof
remain pending and are not inferred from offline transport success.

## 67. Continued implementation checkpoint — 2026-08-22 (Area Listen/Spot check modifiers)

Exact existing-field `ModListenCheck : Int` and `ModSpotCheck : Int` authoring
is implemented in immutable capability catalog revision `2026-08-22.19`.
The broader `properties_advanced_flags` capability remains `partial` because
loading-screen identity, variables, and other unverified Advanced controls are
still preserve-only; browser interaction/readback and native Save/Build/runtime
proof remain open.

Primary audit
`backend/docs/aurora-reverse/area-existing-check-modifiers-audit-v1-2026-08-22.md`
binds the frozen installed Toolset decompilation and the exact
`TDLGAREAPROPERTIES` RCDATA. Aurora reads and writes both root fields through
the native signed-Int GFF path, transfers them in both directions between the
Area object and Area Properties dialog, and constrains each installed VCL
control to `-99..99` with a three-character editor. `LoadScreenID` is a
separate physical-row selector and remains preserve-only instead of being
misrepresented as a free numeric field.

The backend now carries both optional values through strict parser provenance,
dependency identity, repository/detail/processed transport, draft projection,
HTTP CAS validation, exact retained-field replacement, independent candidate
readback, process-cache invalidation, compilation, and atomic ARE publication.
GIT, GIC, and module IFO companions remain byte-identical. The frontend carries
the fields through its HTTP schema, scene/workspace boundary, properties
facade, Verify/Export transfer, and two bounded numeric Advanced-tab controls.
Absent or malformed provenance is visibly preserve-only, and changed values
require exact immutable `{ expectedValue, value }` pairs.

Accepted offline validation:

- 725 backend unit tests in bounded one-shot runs across the advanced domain,
  parser, schema, projector, writer, candidate validator, repository, services,
  compiler, cache, and capability catalog;
- 22 Area-update integration tests with exact signed-Int readback and
  byte-identical GIT/GIC/IFO companions;
- 159 frontend unit/component tests across domain, HTTP, scene/workspace,
  facade, transfer, dialog validation, and panel-to-scene mutation;
- 12/12 capability-catalog tests with totals unchanged at 48 implemented, 24
  partial, 3 preserve-only, and 4 not-started;
- passing backend and frontend production builds.

One combined backend invocation exceeded the mandatory 1 GiB heap before a
complete assertion result; every constituent suite passed separately without
raising the limit. No managed service, browser capture, Toolset, or NWN process
was started, preserving the coordinated VFX runtime lane.

## 68. Continued implementation checkpoint — 2026-08-22 (module Start Location)

The current-Area module Start Location authoring profile is implemented in
immutable capability catalog revision `2026-08-22.20`. The broader
`properties_start_location` capability advances from `preserve_only` to
`partial`, while release remains blocked by cross-Area authoring and fresh
browser, Toolset, NWN spawn, and WOK-accessibility proof.

Primary audit
`backend/docs/aurora-reverse/area-module-start-location-audit-v1-2026-08-22.md`
binds the frozen installed Toolset decompilation and RCDATA surface to one
logical native tuple: `Mod_Entry_Area : ResRef`, XYZ, and two direction
Floats. Aurora loads, stores, and consumes that tuple, but the evidence does
not prove that an arbitrary coordinate is walkable or accepted by the native
Paint Start Location workflow.

The bounded application contract admits only one exact-case, correctly typed,
complete tuple whose Area occurs exactly once in `Mod_Area_list`. It retains
`sourceResources.ifoSha256` and draft `sourceIfoSha256` lineage, accepts one
complete changed expected/target CAS pair, converts UI numbers once to exact
finite binary32 storage, and permits a changed tuple to target only the Area
being materialized. Missing, duplicate, wrong-case/type, stale, partial,
unknown-key, non-finite, and unsupported source profiles remain preserve-only
or fail closed.

Backend detail and processed transport, draft provenance, cache identity,
projection, compiler, IFO writer, independent candidate tuple readback,
transaction receipt, atomic publication, and exact persisted byte/hash
readback now carry the contract end to end. The frontend HTTP boundary, scene
mapper, persisted workspace parser, properties facade, dialog, and panel
mutation path carry the same complete tuple without defaulting unsupported
source data.

Accepted offline validation:

- 623 focused backend unit tests across domain, IFO writer, repository, cache,
  draft, projection, compiler, validation, transaction, service, and catalog;
- 23 Area-update integration tests, including exact `module.ifo` tuple
  publication/readback with byte-identical GIT/GIC;
- 150 focused frontend unit/component tests across domain, HTTP, scene,
  workspace, facade, dialog, and panel-to-scene mutation;
- 12/12 capability-catalog tests with totals 48 implemented, 25 partial, 2
  preserve-only, and 4 not-started;
- passing backend and frontend production builds.

One combined backend run exceeded the mandatory 1 GiB heap before completing;
the same suites passed as bounded one-shot runs without raising the limit. No
managed service, capture, Toolset, or NWN process was started by this lane while
the coordinated VFX lane owned ports 3000/5173.

## 69. Continued implementation checkpoint — 2026-08-22 (Area audio environment)

The complete existing-Area audio storage tuple is implemented offline in
immutable capability catalog revision `2026-08-22.21`.
`properties_audio_environment` advances from `preserve_only` to `partial`;
catalog totals are now 48 implemented, 26 partial, 1 preserve-only, and 4
not-started. Release remains blocked by audio catalog and live proof gaps.

Primary audit
`backend/docs/aurora-reverse/area-audio-environment-audit-v1-2026-08-22.md`
binds the installed Toolset's native GIT load/save and dialog transfer paths
to one exact type-100 `AreaProperties` struct. The contract consists of six
non-negative raw IDs, two volumes in `0..127`, and `MusicDelay` in exact
millisecond multiples of `1000` from `-99000` through `99000`. Missing,
duplicate, wrong-case, wrong-type, partial, stale, unchanged, out-of-domain,
and noncanonical source states fail closed.

The backend carries the tuple through strict parser provenance,
repository/detail/processed transport, cache identity, source-bound draft
projection, compiler composition, exact GIT replacement, independent candidate
readback, validation, receipt propagation, and atomic publication. ARE, GIC,
and module IFO remain byte-identical for an audio-only update. Runtime snapshot
loading no longer selects ambient sounds by Area name, biome fragments,
numeric tokens, modulo indexing, or synthetic ResRefs.

The frontend validates the tuple at HTTP and persisted-workspace boundaries,
maps it exactly into the scene, exposes preserve-first facade state and direct
Verify/Export transfer, and provides all nine Audio-tab controls. Music delay
is displayed in seconds but retained in milliseconds; unresolved IDs remain
explicit raw values because effective 2DA catalog lineage is not yet present.

Accepted bounded offline validation:

- 64 focused backend unit/catalog assertions;
- 1/1 dedicated atomic-publication integration test with independent GIT
  tuple readback and byte-identical ARE/GIC/IFO;
- 160 focused frontend unit/component tests;
- passing backend and frontend production builds.

Large legacy Area Jest suites still exceed the mandatory 1 GiB heap during
loading, so their newly added audio assertions are not counted as passing. A
small isolated-transpile integration config executes the production
transaction path after the normal backend production type-check, without
raising the heap limit. Browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN audio behavior, and immutable effective audio 2DA
catalogs remain open. The coordinated VFX lane retained exclusive ownership of
the runtime services and capture lane throughout this checkpoint.

## 70. Continued implementation checkpoint — 2026-08-22 (effective Area audio catalogs)

Immutable capability catalog revision `2026-08-22.22` removes the offline
`effective_audio_2da_catalogs_not_implemented` blocker from
`properties_audio_environment`. Status remains `partial` and release remains
`blocked`; totals stay at 48 implemented, 26 partial, 1 preserve-only, and 4
not-started because browser, Toolset, and NWN proof has not yet been captured.

The backend now resolves an all-or-nothing effective bundle for
`ambientsound.2da`, `ambientmusic.2da`, and `soundeax.2da`. Selection follows
module, ordered HAK, then vanilla precedence, never row-merges tables, and
never falls through to a weaker identity when the strongest selected resource
is malformed. Descriptors and physical row IDs are bound to exact source
keys/layers, hashes, byte sizes, row counts, and bounded TLK display labels.
Each table is capped at 4096 rows and 16 MiB; the complete serialized response
is capped at 2 MiB and omitted fail-closed when any requirement is violated.

Area detail and processed transport, snapshot cloning, and process-cache
identity now carry the bundle. The frontend validates it at HTTP and persisted
draft boundaries, clones it into the scene/facade, and presents six native-row
selectors. Ambient sound and EAX use their respective tables. Battle music is
selected only from source rows classified by the native `mus_bat_` prefix;
day/night music uses the complementary rows. A retained numeric ID missing
from the effective table is shown as `Unresolved row N`, with no guessed label,
ResRef, or behavior. The nine-field GIT mutation and atomic publication path
remain unchanged.

Accepted bounded offline validation:

- 42 focused backend assertions across catalog parsing/budgets, effective
  source resolution, Area transport, cache identity, and capability metadata;
- 1/1 dedicated Area-audio atomic-publication/readback integration test;
- 166 focused frontend domain, HTTP, mapper, workspace, facade, and component
  assertions;
- 12/12 capability-catalog assertions and passing backend/frontend production
  builds.

No managed runtime service, browser capture, Toolset, or NWN process was
started while the coordinated VFX lane owned the shared service/capture pair.
Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen, and NWN
audio behavior remain the release gates for this capability.

## 71. Continued implementation checkpoint — 2026-08-22 (retained Door transition storage)

Immutable capability catalog revision `2026-08-22.23` advances
`objects_door_hooks_transitions` from `missing/preserve_only/blocked` to
`verified/partial/blocked`. The 79-row catalog now reports 48 implemented, 27
partial, 0 preserve-only, and 4 not-started capabilities; release totals remain
38 available, 36 blocked, and 5 hidden.

Primary native audit
`backend/docs/aurora-reverse/area-existing-door-transition-storage-audit-v1-2026-08-22.md`
admits one storage-only authoring profile on a retained type-`8` GIT Door:
`LinkedTo : CExoString`, `LinkedToFlags : Byte`, and
`LoadScreenID : Word`. The trio is complete and exact. The implementation does
not trim or normalize `LinkedTo`, decode the flags Byte, resolve a destination,
invent a loading-screen row, create missing fields, or use legacy
`TransitionDestin`/module/waypoint aliases as native authority.

The backend now carries immutable source provenance and the editable target
through Area parsing, repository/detail/processed transport, cache identity,
draft projection, deletion planning, candidate compilation, independent
readback, and atomic publication. Immediately before writing, the pair writer
requires the exact retained Door ordinal and complete expected tuple, replaces
only the three native GIT fields, and preserves GIC byte-for-byte. Partial,
wrong-case/type, unknown-key, stale, unchanged, deleted, unretained, and
out-of-domain commands fail closed.

The frontend validates the same optional tuple at HTTP, scene, persisted draft,
clone, and application boundaries. Door Properties enables the three native
controls only for exact immutable GIT Door provenance. Historical transition
neighbors remain visible but read-only. Copy and drag/drop deliberately omit
the existing-instance storage authority so a newly created Door cannot mutate
an unrelated source ordinal.

Accepted bounded offline validation:

- 7 backend unit suites with 1619/1619 assertions;
- 1/1 dedicated atomic-publication integration assertion with independent GIT
  readback, verified transaction receipt, and byte-identical GIC;
- 12 frontend unit/regression suites with 216/216 assertions;
- 12/12 capability-catalog assertions;
- passing backend and frontend production builds.

The Area lane did not start or stop managed services, browser capture, Toolset,
or NWN during this checkpoint. The coordinated VFX lane owned the active
backend/frontend pair on ports 3000/5173; the global capture lock was observed
free and that ownership state was reported without interference. Fresh browser
Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN traversal and
loading-screen behavior, and independent DWK/WOK accessibility remain the
mandatory release blockers.

## 72. Continued implementation checkpoint — 2026-08-24 (existing Area LoadScreenID Word)

Immutable capability catalog revision `2026-08-24.24` keeps the 79-row totals
at 48 implemented, 27 partial, 0 preserve-only, and 4 not-started; release
remains 38 available, 36 blocked, and 5 hidden. The change removes Area loading
screen identity from the broad Advanced preserve-only blocker, but
`properties_advanced_flags` correctly remains `verified/partial/blocked`.

Primary native audit
`backend/docs/aurora-reverse/area-existing-loading-screen-id-audit-v1-2026-08-24.md`
admits only one already-present, case-insensitively unique, exactly cased root
`LoadScreenID : Word` with an uninterpreted integer value in `0..65535`. The
reader/writer symmetry and Toolset properties transfer are independently
visible in the frozen decompilation artifact. No missing field, effective 2DA
row, label, image ResRef, Door transition mapping, or runtime behavior is
inferred.

Backend parsing, transport, cache identity, strict HTTP validation, immutable
source-bound draft projection, exact writer CAS, candidate/persisted readback,
and atomic publication now carry the field. Frontend HTTP, scene, workspace,
facade, Advanced dialog, and export paths carry the same exact source/target
separation. The numeric control is disabled for absent or ambiguous native
storage and explicitly reports that `loadscreens.2da` label resolution is not
available.

Accepted bounded offline validation:

- 7 backend unit suites with 610/610 assertions;
- 25/25 Area Update atomic-publication assertions, including exact Word
  readback and byte-identical GIT/GIC/IFO companions;
- 7 frontend unit suites with 216/216 assertions;
- 1/1 dedicated frontend regression smoke;
- 12/12 capability-catalog assertions;
- passing backend and frontend production builds.

The Area lane did not start or stop managed services, browser capture, Toolset,
or NWN. Remaining gates are effective `loadscreens.2da` provenance, variables
and other Advanced controls, fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN behavior, and the full tile rendering/connectivity proof
matrix.

## 73. Continued implementation checkpoint — 2026-08-24 (effective Area loading-screen catalog)

Immutable capability catalog revision `2026-08-24.25` removes the offline
`effective_loadscreens_catalog_not_implemented` blocker from
`properties_advanced_flags`. Status remains `verified/partial/blocked` and the
79-row totals remain 48 implemented, 27 partial, 0 preserve-only, and 4
not-started; release remains 38 available, 36 blocked, and 5 hidden because
Advanced variables, browser proof, native Save/Build, NWN behavior, and the
tile matrix are still open.

Primary audit
`backend/docs/aurora-reverse/effective-area-loadscreens-two-da-audit-v1-2026-08-24.md`
binds the frozen Aurora decompilation and installed retail resources to a
physical-row contract. Area row 0 resolves the special TLK strRef 63795;
nonzero rows prefer `StrRef`, then `Label`, then `Row N`. A native-selectable
row requires an effective type-3 TGA named by `BMPResRef`. The retained Word
is the physical ordinal, while the printed 2DA row token is diagnostic only.

The backend resolves one whole effective `loadscreens.2da` and each whole TGA
under module, ordered HAK, then vanilla precedence. It never row-merges or
falls through from a malformed strongest admitted resource. Table and image
descriptors include exact key/layer/hash/size provenance; retail image hashes
use bounded streaming BIF reads. The catalog is capped at 16 MiB/4096 rows,
512 images, 16 MiB per image, 256 MiB total inspected image bytes, and 1 MiB
serialized output. It is projected only into hydrated Area payloads, deeply
cloned, and included in process-cache identity.

The frontend validates the same exact schema at HTTP and persisted-workspace
boundaries, maps it into scene/property state, and replaces the raw numeric
control with a catalog selector when provenance is present. Options contain
the explicit default 0, rows with effective TGA provenance, and the retained
current Word when its image is unavailable. Table/image provenance and the
missing-image state remain visible. Selection reuses the existing exact Word
CAS and does not add catalog data to a write request.

Accepted offline validation:

- 75 focused backend assertions across parsing/budgets, precedence, streamed
  KEY/BIF descriptors, Area projection, cache identity, and capability data;
- 196 focused frontend domain, HTTP, mapper, workspace, facade, and component
  assertions;
- 2/2 loading-screen regression-smoke assertions;
- passing backend and frontend production builds.

No managed service, browser capture, Toolset, or NWN process was started while
the coordinated VFX lane retained the shared runtime/capture pair. Fresh
browser selection/Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN
loading-screen presentation, and the full tile rendering/connectivity proof
matrix remain mandatory release gates.

## 74. Continued implementation checkpoint — 2026-08-24 (matrix source-identity admission)

Capability catalog revision `2026-08-24.26` keeps the existing 79-row status
totals but replaces two obsolete pre-source-eligibility blocker counts. The
authoritative v8 plan requires 45,003 source-resolved Add/Render rows and
44,664 source-resolved connection rows; the earlier 53,136/52,767 values
belonged to the legacy planner that scheduled unavailable model sources.

The default matrix command previously inspected the historical v2 directory,
which made the repository report `replan_required` even though the actual
runtime-bound v8 plan was structurally `ready`. The default now resolves the
authoritative checkpoint-zero v8 directory and its exact plan ID
`06671294cf7009bc969fabac6b5ae75109098e50afe866e65a1f38e77bb03af5`.

The canonical `tiles:matrix-status`, `tiles:matrix-next`, and
`tiles:matrix-capture` commands now rehash the bounded runtime source set before
offering any capture action. A mismatch returns
`runtime_build_reprofile_required`; `next` exposes no chunk/capture integration
and `capture` returns before HTTP or Chrome. Persisted plan validation remains
separate and correctly stays `ready`, preserving the immutable historical
profile and failed packet.

The current shared worktree does not match the 2026-08-21 profile, so a new
profile and checkpoint-zero successor plan must wait until the coordinated VFX
source lane is stable. The offline control-plane regression passes and covers
both exact-source admission and fail-closed drift. This checkpoint started no
service, browser, capture, Toolset, or NWN process and did not interfere with
the VFX-owned runtime pair.

## 75. Continued implementation checkpoint — 2026-08-24 (existing Area variable table CRUD)

Immutable capability catalog revision `2026-08-24.27` removes Area variables
from the aggregate preserve-only blocker on `properties_advanced_flags`. The
replacement blocker, `unverified_advanced_controls_preserve_only`, names only
the controls that still lack source closure or implementation. The row remains
truthfully `verified/partial/blocked`, and the 79-row totals remain 48
implemented, 27 partial, 0 preserve-only, and 4 not-started; release remains 38
available, 36 blocked, and 5 hidden because browser, Toolset, loading-screen
runtime, and NWN proof are still open.

The Area root scripting-variable table is now implemented through the complete
offline update path. Strict top-level GIT parsing exposes the immutable ordered
source; the workspace facade and shared variable editor provide typed
Add/Edit/Delete/Reorder behavior; draft projection preserves exact provenance;
and the compiler composes the mutation after object and audio changes without
losing either sibling mutation. Validation independently reparses candidate
bytes, receipts bind the exact expected and target tables to the one final GIT
digest, and persisted readback verifies the semantic target after atomic
ARE/GIT/GIC/IFO publication. An Area-variable-only update preserves ARE, GIC,
and IFO byte-for-byte.

The focused resource-bounded evidence is 12/12 capability-catalog tests, 86/86
compiler/validation/coordinator tests, 42/42 domain/writer/persisted-readback/
storage tests, 1/1 atomic-publication integration test, and 106/106 frontend
shared-domain/workspace/facade/HTTP/dialog tests. Backend and frontend
production builds pass. The earlier complete frontend unit run still contains
three shared-worktree failures in the VFX/placeable/viewport-layout lanes, so
the complete regression gate is not claimed by this checkpoint.

Fresh browser Save/reopen evidence and exact-candidate Toolset Save/Build/reopen
plus NWN runtime proof remain mandatory. This checkpoint started no service,
browser, capture, Toolset, or NWN process and did not interfere with the
VFX-owned runtime pair.

## 76. Continued implementation checkpoint — 2026-08-24 (cross-Area module Start Location authoring)

Immutable capability catalog revision `2026-08-24.28` removes
`cross_area_start_location_authoring_not_implemented` from
`properties_start_location`. The row remains truthfully
`verified/partial/blocked`, and the 79-row totals remain 48 implemented, 27
partial, 0 preserve-only, and 4 not-started; release remains 38 available, 36
blocked, and 5 hidden. Its remaining blockers are fresh browser readback,
native Toolset Save/Build/runtime, and NWN spawn/walkmesh accessibility proof.

The additive v1 contract now exposes an optional bounded immutable
`moduleStartLocationTargets` list. The backend derives it only from canonical
ARE sources whose ResRefs occur exactly once in the retained IFO
`Mod_Area_list`; ambiguous, duplicate, source-less, and non-canonical members
are not offered. The frontend clones and validates the sorted catalog, renders
a bounded selector, and allows a complete start tuple to target another listed
Area without inventing or resetting XYZ or direction. Missing catalog metadata
keeps the former current-Area-only behavior for backward compatibility.

Draft projection independently validates the immutable source catalog. The
candidate compiler and IFO writer then reparse the retained module, compare the
complete expected tuple, require exact target membership, replace only the six
native entry fields, and publish the IFO in the existing atomic transaction.
ARE, GIT, and GIC remain byte-identical for a Start-Location-only update.

The resource-bounded gates pass 546/546 focused backend tests, 217/217 focused
frontend tests, 25/25 atomic Area-update integration scenarios, 12/12 immutable
catalog tests, and both production builds. This checkpoint started no service,
browser, capture, Toolset, or NWN process and did not interfere with the
VFX-owned runtime pair.

## 77. Continued implementation checkpoint — 2026-08-24 (Area native identity source closure)

Immutable capability catalog revision `2026-08-24.29` replaces the vague
`remaining_basic_description_native_field_matrix_incomplete` blocker with the
precise `area_resref_rename_transaction_not_implemented` blocker. The 79-row
totals remain 48 implemented, 27 partial, 0 preserve-only, and 4 not-started;
release remains 38 available, 36 blocked, and 5 hidden. The catalog regression
passes 12/12 assertions.

Primary Aurora decompilation, exact retail strings, and the decoded
`TDLGAREAPROPERTIES` RCDATA form now source-close the native identity and
description matrix. The ARE reader/writer handles `ID : Int`,
`Creator_ID : Int`, `Version : DWord`, `Name : CExoLocString`,
`Tag : CExoString`, and `Comments : CExoString`. Comments is a separate
Toolset tab and already has a separate bounded implementation. Aurora exposes
no Area `Description` root field or Area Properties control, so the product
must not invent one.

The remaining native identity gap is transactional Area ResRef rename. The
reader derives Area member `+0xaa` from the resource-name argument rather than
reading root `ResRef`; the writer emits root `ResRef` from that member, and the
Area Properties dialog can edit it. Consequently a web rename cannot be a
basic-field CAS. It requires a source-closed impact matrix, logical ARE/GIT/GIC
resource moves, ARE root identity update, proven IFO/reference rewrites,
collision and case handling, fencing, idempotency, atomic publication,
persisted readback, and recovery/compensation.

This checkpoint documents that boundary and deliberately does not claim the
rename transaction as implemented. Fresh browser, Toolset Save/Build/reopen,
packed readback, and NWN runtime proof remain mandatory. No managed service,
browser, capture, Toolset, or NWN process was started while the VFX lane owned
the shared runtime and proof resources.

## 78. Continued implementation checkpoint — 2026-08-24 (transactional Area ResRef rename)

Immutable capability catalog revision `2026-08-24.30` adds the explicit
`lifecycle_materialize_rename` capability. Its offline implementation state is
`verified/implemented`, while release remains truthfully `blocked` by fresh
browser readback, packed-module readback, Toolset Save/Build/reopen, and NWN
runtime proof. The catalog now contains 80 rows: 49 implemented, 27 partial,
0 preserve-only, and 4 not-started; release contains 38 available, 37 blocked,
and 5 hidden. The aggregate `properties_basic_identity` row remains partial
because alternate localized-name profiles and its browser/native evidence are
still incomplete, but it no longer reports rename as unimplemented.

The source-closed audit and additive contracts now feed a complete offline
rename path. The backend validates a canonical lowercase source and target,
scans the retained snapshot for collisions and static references, and returns
an exact preview bound to module identity and revision. Commit requires that
same preview, exact source and target confirmations, and an idempotency key. A
single fenced transaction moves the ARE/GIT/GIC resources, rewrites the ARE
root `ResRef`, updates the exact IFO Area list and entry-area reference when
required, preserves unrelated resources, and verifies the persisted successor
against hashes, sizes, resource types, object cardinality, semantic identity,
IFO membership, and the committed receipt.

The durable control plane stores byte-free MySQL or memory journal and receipt
records. Startup recovery acquires a recovery lease for the exact interrupted
transaction. It independently accepts an already verified successor, otherwise
compensates to a proven baseline, and quarantines any state for which neither
successor nor baseline can be proven. Receipt persistence rejects any partial
or drifted candidate projection.

The frontend uses a strict HTTP port and application facade. The Area selector
previews the operation, displays impacts and blockers, requires both exact
confirmations, and commits only an admitted preview. Success atomically switches
the selected workspace identity from `area_<source>` to `area_<target>`, closes
the old scene seed, invalidates the source cache and stale draft sessions, and
clears tile/object selections so the workspace cannot continue editing the old
identity.

Accepted resource-bounded validation consists of 44/44 assertions across all
10 backend rename suites, including transaction, exact readback, recovery, and
both durable stores; 5/5 backend wiring assertions; 11/11 focused frontend
contract/facade/component assertions; and 130/130 impacted frontend assertions.
The immutable capability-catalog regression passes 12/12, and both backend and
frontend production builds pass. Existing React `act(...)` diagnostics remain
warnings rather than failures.

No managed service, browser capture, Toolset, or NWN process was started because
the coordinated VFX task retained the shared runtime and capture lane. Therefore
this checkpoint closes the offline rename implementation only. It does not
claim CRUD release completion, native parity completion, or completion of the
99-tileset rendering/connectivity matrix.

## 79. Continued implementation checkpoint — 2026-08-24 (Advanced dormant-control closure)

Immutable capability catalog revision `2026-08-24.31` removes the final
offline `unverified_advanced_controls_preserve_only` blocker and changes
`properties_advanced_flags` from partial to implemented. The 80-row totals are
now 50 implemented, 26 partial, 0 preserve-only, and 4 not-started; release
remains 38 available, 37 blocked, and 5 hidden because browser, native, NWN,
and matrix evidence is unchanged. The catalog regression passes 12/12.

Primary decompilation, the exact retail `TdlgAreaProperties` VCL map, and the
native modal edit call chain establish that the embedded `World Map Icon`,
`World Map X`, `World Map Y`, and `Time` controls are dormant dialog surface,
not missing Area resource fields. The browse handler can populate the icon edit
control, and the form retains coordinate/time validators, but the current Area
state-transfer functions neither load nor commit these values. The matching
ARE reader/writer contains no corresponding labels or fields, and the caller
publishes no companion world-map/time resource.

Aurora Web therefore deliberately does not invent these mutations. The
offline Advanced authoring matrix is the already source-closed terrain flags,
PvP, no-rest, Listen/Spot modifiers, loading-screen ID/effective selector, and
Area variable table. Unknown extension fields remain byte-preserved, and the
renderer world-timer contract remains separate from Area property storage.

The frozen authority is
`backend/docs/aurora-reverse/area-advanced-dialog-dormant-controls-audit-v1-2026-08-24.md`.
Fresh browser readback, exact-candidate Toolset Save/Build/reopen, and NWN
loading-screen behavior remain mandatory release gates. This offline audit
started no managed service, browser, capture, Toolset, or NWN process and did
not interfere with the VFX-owned runtime lane.

## 80. Continued implementation checkpoint — 2026-08-24 (Area event-script catalog and honest NSS/NCS status)

Immutable capability catalog revision `2026-08-24.32` closes the former
`script_catalog_compile_status_incomplete` blocker on existing Area event
binding. The catalog now contains 81 rows: 50 implemented, 26 partial,
0 preserve-only, and 5 not-started; release contains 38 available, 37 blocked,
and 6 hidden. The additional explicit
`properties_event_scripts_compile` row prevents module artifact discovery from
being mistaken for an implemented source editor or compiler.

Primary Aurora decompilation and the exact Area Properties VCL map prove that
the four Area event selectors enumerate NSS resource type 2009. The Toolset
compiler consumes type 2009 and emits NCS type 2010 plus the separate NDB
surface. The retained module descriptors do not contain source-to-bytecode
lineage, a compiler receipt, compiler identity, or freshness ordering.
Therefore Aurora Web reports only `source_and_bytecode`, `source_only`, or
`bytecode_only`; every pair is explicitly `freshness = unverified`.

The backend now exposes one authenticated, revision-bound read-only catalog
from the immutable committed manifest. Exact descriptor identity is retained
without exposing bytes, text, content keys, storage keys, or host paths.
Wrong-case, nested, non-canonical, extension/type-mismatched, and colliding
script candidates are rejected and counted. The query has fixed 50,000
descriptor, 10,000 ResRef, 200-row, and sub-256-KiB response budgets plus
count-only telemetry with no ResRefs.

The frontend independently validates the response through a dedicated Area
port and facade. The Events tab supports bounded search and offers only
NSS-backed rows. It preserves retained values outside the committed-module
page, keeps manual ResRef editing and explicit unbind available when the
catalog fails, excludes `bytecode_only` rows from selection, and labels paired
rows as unverified presence rather than successful compilation.

Accepted offline gates are 21 focused backend catalog/snapshot assertions, 12
immutable capability-catalog assertions, 36 focused frontend
domain/port/facade/dialog assertions, one regression-smoke assertion, and
passing backend and frontend production builds. The standard type-checking
Jest HTTP slice exceeded the
mandatory 1-GiB local heap during transform; the repository's bounded
isolated-module runner passed the complete 33-assertion backend set, while the
production build supplied the independent TypeScript compilation gate.

Fresh browser selection/Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN event dispatch, effective module/HAK/override/base
precedence, NSS source editing, and a receipt-bearing compiler remain open.
No managed service, browser capture, Toolset, or NWN process was started, so
the VFX-owned runtime and capture lane was not disturbed.

## 81. Continued implementation checkpoint — 2026-08-24 (existing Trigger/Encounter polygon authoring)

Immutable capability catalog revision `2026-08-24.33` changes
`objects_trigger_encounter_polygons` from partial to implemented. The 81-row
totals are now 51 implemented, 25 partial, 0 preserve-only, and 5 not-started;
release remains 38 available, 37 blocked, and 6 hidden. The row stays blocked
by fresh browser readback, exact-candidate Toolset Save/Build/reopen, and NWN
Trigger/Encounter behavior. The broader Trigger and Encounter authoring rows
remain partial for transition runtime and spawn configuration/runtime,
respectively.

Primary audit
`backend/docs/aurora-reverse/area-existing-trigger-encounter-polygon-mutation-audit-v1-2026-08-24.md`
admits complete whole-list compare-and-swap replacement only for exact retained
Trigger type-`3` and Encounter type-`1` `Geometry` lists. The immutable source
and editable target contain ordered native-local float32 points, are bounded to
`3..1024`, require nonzero implicit XY area, and never infer a native engine
maximum. Trigger orientation and Encounter's exact empty spawn profile remain
independent preserved fields.

The backend parser, repository, draft projector, retained-ordinal planner,
GIT/GIC pair writer, candidate compiler/readback, receipt, and atomic
ARE/GIT/GIC/IFO publication now carry the exact mutation. The writer changes
only one `Geometry` field, permits a disjoint position mutation, rejects a
deletion collision, and proves the paired GIC and unrelated resources remain
unchanged.

The frontend HTTP boundary, scene mapper, strict workspace draft, application
authoring helpers, scene port/facade, history snapshots, context Properties
action, native-coordinate editor, and Three.js guide all carry the same source
closure. Rendering applies `native_local / 10` and scene-axis conversion only
at presentation time; serialization retains the ordered native values.

Accepted resource-bounded gates are 1,650/1,650 assertions across the seven
directly impacted backend unit suites, 1/1 focused atomic-publication
integration assertion, 172/172 assertions across twelve impacted frontend unit
suites, 1/1 dedicated frontend regression-smoke assertion, 12/12 immutable
capability-catalog assertions, and passing backend and frontend production
builds.

This checkpoint started or stopped no managed service, browser, capture,
Toolset, or NWN process while the coordinated VFX task owned the shared runtime
lane. Therefore it closes the offline polygon implementation only and does not
claim application CRUD release completion, runtime trigger/encounter parity, or
completion of the 99-tileset rendering/connectivity matrix.

The shared-worktree broad runs remain honestly non-green: frontend unit is
3,313/3,315 with two Placeable/VFX expectation drifts; frontend regression
smoke is 82/84 with two stale Door transition expectations; backend bounded
unit was 4,732/4,736. The only Area failure there was an obsolete
application-service fixture without the mandatory tile production-admission
port; it was repaired and passes 4/4. The three remaining backend failures are
concurrent VFX/lighting proof-contract drift. These failures do not reopen the
focused polygon slice, but they do prevent a repository-wide regression-green
claim.

## 82. Continued implementation checkpoint — 2026-08-25 (multi-entry inline Area Name)

Immutable capability catalog revision `2026-08-25.34` keeps
`properties_basic_identity` partial and release-blocked while narrowing its
localization blocker. The 81-row totals remain 51 implemented, 25 partial,
0 preserve-only, and 5 not-started; release remains 38 available, 37 blocked,
and 6 hidden. The old blanket alternate-profile blocker is replaced by the
precise TLK/non-ASCII/independent-alternate-entry boundary.

Primary decompilation of the complete `CExoLocString` reader/writer, native
setter/remover/full-value copy, Area Properties transfer, localized-string
editor, and fallback resolver source-closes one additive profile. Aurora Web
may change only GFF substring identifier `0` in bounded inline printable-ASCII
storage with `strRef=0xffffffff`; every sibling identifier, order, and byte
string remains exact. TLK-backed and non-ASCII storage plus independent sibling
editing remain preserve-only. No xoreos or other GPL source was used.

The backend now classifies the source profile, binds it into CAS and cache
identity, replaces only identifier `0`, independently compares source and
candidate siblings, and verifies persisted target identity plus exact resource
hash. Atomic publication keeps GIT/GIC/IFO byte-identical. The frontend HTTP,
scene, persisted-draft, properties-facade, dialog, export, and history path
retain immutable profile provenance and fail closed when it is absent,
unknown, or changed.

Accepted offline gates are 744/744 focused backend unit assertions, 27/27
Area-update integration assertions, 232/232 focused frontend unit/component
assertions, 1/1 focused regression-smoke assertion, 12/12 immutable catalog
assertions, and passing backend/frontend production builds. The coordinated VFX
task retained ownership of managed services, browser capture, Toolset, and NWN;
none was started or stopped for this checkpoint. Fresh browser/native proof and
the broader Area/tileset program therefore remain open.

## 83. Continued implementation checkpoint — 2026-08-25 (existing Area visual-environment core)

Immutable capability catalog revision `2026-08-25.35` keeps the 81-row totals
at 51 implemented, 25 partial, 0 preserve-only, and 5 not-started; release
remains 38 available, 37 blocked, and 6 hidden. The
`properties_visual_environment` row remains partial, but its former broad
differential blocker is replaced with the exact remaining field and runtime
proof boundaries.

Primary Aurora reader/writer, Area Properties transfer, RCDATA control, token
mapping, renderer color/fog, and shadow-opacity evidence source-close a bounded
16-field profile. It includes the three exact day/night modes, four `0..100`
percent values, complete sun/moon packed RGB colors, `0..15` fog amounts, and
shadow booleans. `LightingScheme`, `SkyBox`, `WindPower`, and `FogClipDist`
remain visible preserve-only; no xoreos or other GPL source was used.

The backend now carries exact all-or-nothing parsing, source-bound full-tuple
CAS, strict HTTP validation, retained-field replacement, candidate validation,
cache identity, transaction storage, and persisted semantic readback. The
frontend carries strict HTTP and draft boundaries, detached scene mapping,
application-facade CAS, direct Verify/Export, and an active Aurora-shaped
Visual tab. Apply updates the scene tuple and the 16 renderer lighting fields
incrementally while preserving unrelated lighting fields.

Accepted bounded gates are 76/76 focused backend unit assertions, 28/28 Area
Update atomic-publication integration assertions, 241/241 impacted frontend
unit/component assertions, 1/1 dedicated frontend regression-smoke assertion,
12/12 immutable capability-catalog assertions, and passing backend/frontend
production builds.

No managed service, browser capture, Toolset, or NWN process was started or
stopped because the coordinated VFX task retained the shared runtime lane.
Therefore this closes the offline bounded core only. Fresh browser incremental
render/Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN environment
behavior, the four excluded visual fields, and the broader 99-tileset
rendering/connectivity program remain open.

## 84. Continued implementation checkpoint — 2026-08-25 (existing Area Name entries)

Immutable capability catalog revision `2026-08-25.36` truthfully narrows the
`properties_basic_identity` blocker: every already-present inline printable-
ASCII `Name : CExoLocString` entry may now be edited by numeric source
identifier. The 81-row totals remain 51 implemented, 25 partial, 0
preserve-only, and 5 not-started; release remains 38 available, 37 blocked,
and 6 hidden.

Primary decompilation proves ordered localized-string read/write,
language/gender identifier reconstruction, selected-entry set/remove, complete
value copying, and Area Properties localized-editor transfer. The bounded
product contract exposes the complete ordered list and sends one complete
expected/target CAS. It permits text changes only: count, identifiers, order,
default identifier `0`, and the derived simple/multi profile are exact source
fences. No locale names are invented, and entry add/remove/reorder, TLK-backed
storage, and non-ASCII encodings remain outside this slice.

The complete offline path now spans backend HTTP validation, immutable draft
projection, preserve-first writer, application service, independent candidate
validation, compiler/transaction transfer, persisted semantic readback, and
atomic ARE/GIT/GIC/IFO publication. Frontend HTTP, scene, workspace draft,
facade, dialog, export, and history boundaries validate detached ordered lists.
A malformed Name list fails closed without deleting independently valid Tag
provenance.

Accepted gates are 467/467 focused backend layer assertions, 22/22 backend
application-service assertions, 28/28 Area Update integration assertions,
242/242 focused frontend unit/component assertions, 85/85 frontend regression
smoke assertions, 12/12 immutable catalog assertions, and passing backend and
frontend production builds. A standard combined ts-jest invocation exceeded
the fixed 1 GiB heap before assertions; bounded isolated-module suites passed
without increasing the limit.

No managed service, browser capture, Toolset, or NWN process was started or
stopped because the coordinated VFX task retained the shared runtime lane.
Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN
localized-display proof, and the broader 99-tileset rendering/connectivity
program remain open.

## 85. Continued implementation checkpoint — 2026-08-25 (existing Area Name entry removal)

Immutable capability catalog revision `2026-08-25.37` implements explicit
removal of already-existing alternate inline printable-ASCII Area Name
entries. Primary native evidence proves exact-key removal from the ordered
localized-string list, retention of the relative order of remaining entries,
and serialization in list order. Identifier `0` remains mandatory and cannot
be removed.

The contract remains one complete expected/target list CAS. Target identifiers
must form an order-preserving source subset, additions and reorder fail closed,
and empty alternate text remains a real entry until the user invokes the
explicit remove action. Removing the final alternate derives a
`simple_inline_ascii` target from a `multi_entry_inline_ascii` source;
`expectedProfile` stays bound to the source. A profile transition without both
complete lists is rejected.

The offline implementation crosses backend parsing, projection, writer,
candidate validation, transaction transfer, persisted readback, and atomic
publication, plus frontend domain, facade, dialog, export, and history. The
integration case publishes the exact simple target ARE and proves GIT, GIC,
and module IFO byte-identical.

Accepted gates are 573/573 focused backend layer assertions, 150/150 backend
application/compiler assertions, 29/29 Area Update integration assertions,
244/244 focused frontend boundary/component assertions, 85/85 full frontend
regression assertions, 12/12 catalog assertions, and passing backend/frontend
production builds. Existing React `act(...)` and Vite chunk-size diagnostics
remain warnings, not failed gates.

No managed service, browser capture, Toolset, or NWN process was started or
stopped because the coordinated VFX task still owns the shared runtime lane.
Entry add/reinsert, explicit order authoring, the complete language/gender
catalog, TLK/non-ASCII mutation, fresh browser and native localized-display
proof, and the 99-tileset rendering/connectivity program remain open.

## 86. Continued implementation checkpoint — 2026-08-25 (visual scalar controls)

Immutable capability catalog revision `2026-08-25.38` source-closes and
implements the two native non-catalog scalar controls omitted from the core
visual tuple. `FogClipDist : Float` is admitted only at integer values
`30..9999`; `WindPower : Int` is admitted only at integer values `0..2`.
Both travel as one additive exact-key, full-pair source-bound CAS. The 81-row
totals remain 51 implemented, 25 partial, 0 preserve-only, and 5 not-started;
release remains 38 available, 37 blocked, and 6 hidden.

Retail ARE reader/writer evidence closes the exact labels and types. The
Environment dialog decompilation and exact RCDATA form close the Fog Clip
spin-control bounds and Wind Power trackbar maximum. Effective physical-row
selection from `environment.2da` and `skyboxes.2da` proves that
`LightingScheme` and `SkyBox` are catalog-backed and must remain preserve-only;
arbitrary byte authoring is not admitted. No GPL source is used as authority.

Backend parser, schema, projector, writer, application transfer, candidate
validator, transaction storage, persisted semantic readback, atomic
publication, and cache identity now carry the complete pair. Frontend HTTP,
scene mapper, persisted-draft boundary, properties facade, active Visual
controls, incremental renderer field replacement, direct Verify/Export, and
Save/reopen regression carry detached source and target values. A scalar-only
publication changes ARE while GIT, GIC, and module IFO remain byte-identical.

Accepted gates are 77/77 focused backend unit assertions, 30/30 Area Update
integration assertions, 154/154 impacted frontend unit/component assertions,
1/1 focused frontend regression assertion, 12/12 immutable catalog assertions,
and passing backend/frontend production builds.

No managed service, browser capture, Toolset, or NWN process was started or
stopped because the coordinated VFX task retained the shared runtime lane.
Fresh browser incremental fog-distance and Save/reopen evidence, Toolset
Save/Build/reopen, NWN fog-end/wind behavior, the two remaining catalog-backed
visual controls, and the full 99-tileset rendering/connectivity program remain
open.

## 87. Continued implementation checkpoint — 2026-08-25 (catalog-bound visual selection and existing Area Name order)

Immutable capability catalog revision `2026-08-25.39` removes two obsolete
implementation blockers while keeping the 81-row totals at 51 implemented,
25 partial, 0 preserve-only, and 5 not-started; release remains 38 available,
37 blocked, and 6 hidden.

Primary Aurora decompilation and effective-table evidence source-close
catalog-bound `LightingScheme` and `SkyBox` authoring. The mutation binds fresh
`environment.2da` and `skyboxes.2da` hashes plus physical row ordinals. A
Lighting Scheme change applies its complete native environment row, admits
only complete native-reachable overrides, and finally applies the explicit Sky
Box. A Sky-Box-only change is disjoint from visual and scalar CAS operations.
Backend projection, fresh catalog resolution, writing, independent candidate
validation, transaction storage, and persisted readback carry the exact final
state; frontend ports, facade, Visual controls, and Verify/Export carry the same
contract.

The same revision admits explicit serialization order for already-existing
inline printable-ASCII Area Name entries. Primary writer evidence proves that
native collection order is serialized file state. The target must retain
identifier `0` and use only unique identifiers from the immutable source set,
but may combine reordering, text editing, and removal in one complete-list CAS.
The frontend exposes bounded move actions; backend projection, writer,
candidate validation, transaction transfer, and persisted readback preserve
the exact requested order. Entry add/reinsert, TLK-backed storage, non-ASCII
authoring, and a complete language/gender label catalog remain outside the
admitted profile. No GPL source was inspected or used.

Accepted bounded gates are 9 backend suites with 132 assertions and 5 frontend
suites with 63 assertions for catalog selection, plus 7 backend suites with
578 assertions and 4 frontend suites with 53 assertions for Name reordering.
Both dedicated regression smokes, 12/12 immutable capability-catalog
assertions, and backend/frontend production builds pass.

No managed service, browser capture, Toolset, or NWN process was started or
stopped for this checkpoint. Fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN visual and localized-display behavior, and the full
99-tileset rendering/connectivity program remain open.

## 88. Continued implementation checkpoint — 2026-08-25 (bounded Area Name Add/Reinsert)

Immutable capability catalog revision `2026-08-25.40` implements a
source-closed bounded Add/Reinsert lane for inline printable-ASCII Area Name
entries while keeping the 81-row totals at 51 implemented, 25 partial, 0
preserve-only, and 5 not-started; release remains 38 available, 37 blocked,
and 6 hidden.

Primary retail Toolset decompilation constructs the localized-string editor
from six verified Western language rows and derives each storage identifier as
`language * 2 + gender`, forcing English gender to zero. Pinned retail TLK
labels close English/default plus Male/Female French, German, Italian,
Spanish, and Polish. Immutable catalog
`aurora-area-name-language-catalog.v1` therefore admits only identifiers
`{0,2,3,4,5,6,7,8,9,10,11}`. Four native grid rows remain unresolved;
identifier `1` and all other absent identifiers fail closed. Existing unknown
identifiers are retained only through exact source provenance. No GPL source
was inspected or used.

The complete expected/target list CAS now permits one or more missing catalog
identifiers with nonempty printable-ASCII text at explicit target positions,
combined with edit, remove, and reorder operations. Backend schema,
projection, preserve-first writing, independent candidate validation,
transaction transfer, and persisted readback preserve the exact target.
Frontend domain, scene/draft/facade, export, and Area Properties mirror the
catalog. The dialog offers only missing verified entries and returns a removed
verified entry to the selector for reinsert.

Accepted bounded gates are 9 backend suites with 621 assertions, 9 frontend
suites with 195 assertions, both dedicated Name-entry regression smokes,
12/12 immutable capability-catalog assertions, and passing backend/frontend
production builds. Only the pre-existing frontend chunk-size advisory remains.

No managed service, browser capture, Toolset, or NWN process was started or
stopped. Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
NWN localized-display proof, unresolved/TLK/non-ASCII Name authoring, and the
full 99-tileset rendering/connectivity program remain open.

## 89. Continued implementation checkpoint — 2026-08-25 (existing Sound interval/variation storage CAS)

Immutable capability catalog revision `2026-08-25.41` source-closes and
implements one bounded mutation lane for exact existing-Sound fields
`Interval`, `IntervalVrtn`, `PitchVariation`, and `VolumeVrtn`. The 81-row
totals remain 51 implemented, 25 partial, 0 preserve-only, and 5 not-started;
release remains 38 available, 37 blocked, and 6 hidden because the broad
`objects_sound_authoring` capability is still partial.

Primary retail Toolset decompilation proves the exact DWORD/DWORD/FLOAT/BYTE
read/write tuple. The retail Sound Properties RCDATA and form handlers close
the admitted UI domains: nonnegative interval values `0..60000 ms` on a 10 ms
grid, pitch hundredths `0..100`, and raw volume-variation byte `0..127`.
Negative/high-bit interval variation is deliberately preserve-only pending
NWN runtime authority. Base volume, Hours/Times, playback/order, priority,
sound-list membership, positioning/attenuation, construction, and runtime
audio semantics remain outside this slice. No GPL or external source was
inspected or used.

Backend exact parsing and API projection, provenance-bound draft projection,
independent source replanning, complete-tuple CAS writing, candidate
reconstruction, unchanged GIC verification, and transaction receipts are now
connected. Frontend HTTP, scene mapper, draft boundary, workspace cloning,
presentation conversion, and Sound Properties UI carry the same contract.
Controls activate only for complete exact source/current storage and otherwise
remain explicitly preserve-only.

Accepted bounded gates are 9/9 backend suites with 1,751/1,751 assertions,
7/7 frontend files with 234/234 tests, 12/12 immutable capability-catalog
assertions, and passing backend/frontend production builds.

No managed service, browser capture, Toolset, or NWN process was started or
stopped. Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
NWN audio behavior, the excluded Sound scopes above, and the full 99-tileset
rendering/connectivity program remain open.

## 90. Continued implementation checkpoint — 2026-08-25 (existing Sound base-volume storage CAS)

Immutable capability catalog revision `2026-08-25.42` source-closes and
implements the exact base `Volume:BYTE` mutation for a retained native Sound.
The 81-row totals remain 51 implemented, 25 partial, 0 preserve-only, and 5
not-started; release remains 38 available, 37 blocked, and 6 hidden because
the broad `objects_sound_authoring` capability remains partial.

Primary retail Toolset decompilation proves the case-sensitive BYTE read and
write, direct Sound Properties load/save path, and native clamping to `0..127`.
The retail form contract confirms a raw `0..127`, step-`1` trackbar. The exact
integer is storage authority; normalized `byte / 127` is presentation only.
NWN loudness curves, attenuation, mixing, priority, scheduling, playback,
sound-list membership, and positioning behavior are not inferred. No GPL or
external source was inspected or used.

Backend exact parsing, detached API projection, provenance-bound draft
projection, independent source replanning, field-only CAS writing, complete
candidate Sound-struct reconstruction, unchanged paired GIC verification, and
receipt accounting are connected. Frontend HTTP, scene mapping, persisted
draft boundary, cloning, presentation conversion, and Basic Sound Properties
carry the same contract. Missing or malformed exact source/current provenance
keeps the volume control disabled and preserve-only. The mutation may coexist
with Sound position and interval/variation changes but not deletion.

Accepted bounded gates are 9/9 backend suites with 1,766/1,766 assertions and
8/8 frontend files with 254/254 tests. The immutable capability-catalog gate
and backend/frontend production builds are executed at handoff.

No managed service, browser capture, Toolset, or NWN process was started or
stopped for this checkpoint. Fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN audible behavior, the remaining Sound scopes, and the
full 99-tileset rendering/connectivity program remain open.

## 91. Continued implementation checkpoint — 2026-08-25 (existing Sound Hours/Times schedule CAS)

Immutable capability catalog revision `2026-08-25.43` source-closes and
implements the exact existing-Sound `Hours:DWORD` plus `Times:BYTE` schedule
tuple. The 81-row totals remain 51 implemented, 25 partial, 0 preserve-only,
and 5 not-started; release remains 38 available, 37 blocked, and 6 hidden
because the broad `objects_sound_authoring` capability remains partial.

Primary retail Toolset decompilation proves the exact case-sensitive storage
types and the direct Sound Properties load/save path. Read-only retail binary
field-table inspection closes `Times` values `0/1/2/3` as Specific Hours/Day/
Night/Always. The form initialization and handlers prove that low `Hours` bits
`0..23` map chronologically from 12 AM through 11 PM and that non-specific
modes disable but preserve the mask. Unsupported mode values or high mask bits
remain preserve-only. NWN clock boundaries, scheduling latency, playback, and
savegame behavior are not inferred. No external or GPL source was inspected
or used.

Backend exact parsing, detached API projection, provenance-bound draft
projection, independent source replanning, two-field CAS writing, complete
candidate Sound-struct reconstruction, unchanged paired GIC verification, and
receipt accounting are connected. Frontend HTTP, scene mapping, persisted
draft boundary, cloning, exact presentation conversion, and Advanced Sound
Properties carry the same contract. The mutation may coexist with Sound
position, interval/variation, and base-volume changes but not deletion.

Accepted offline gates are 8/8 bounded backend unit suites with 1,764/1,764
assertions, 1/1 atomic-publication integration suite with 30/30 assertions,
7/7 focused frontend files with 260/260 tests, 12/12 immutable capability-
catalog assertions, and passing backend/frontend production builds. The
frontend build emits only the pre-existing chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started or
stopped for this checkpoint. Fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN audio scheduling behavior, the remaining Sound scopes,
and the full 99-tileset rendering/connectivity program remain open.

## 92. Continued implementation checkpoint — 2026-08-25 (existing Sound Active storage CAS)

Immutable capability catalog revision `2026-08-25.44` source-closes and
implements the canonical existing-Sound `Active:BYTE` mutation. The 81-row
totals remain 51 implemented, 25 partial, 0 preserve-only, and 5 not-started;
release remains 38 available, 37 blocked, and 6 hidden because the broad
`objects_sound_authoring` capability remains partial.

Primary retail Toolset decompilation proves the unique case-sensitive BYTE
read/write and direct Sound Properties checkbox load/save paths. Native load
treats any nonzero byte as checked, while save canonicalizes the checkbox to
`1`; therefore only source values `0` and `1` are admitted for non-lossy CAS.
All other byte values, missing/duplicate/wrong-case/wrong-type storage, and
incomplete provenance remain preserve-only. The same pass proves that native
`Priority:BYTE` is derived by a helper from other flags and an unresolved
input, not controlled directly by a Sound Properties widget, so direct
Priority mutation remains deliberately blocked. No external or GPL source was
inspected or used.

Backend exact parsing, detached API projection, provenance-bound draft
projection, independent source replanning, field-only CAS writing, complete
candidate Sound-struct reconstruction, unchanged paired GIC verification, and
receipt accounting are connected. Frontend HTTP, scene mapping, persisted
draft boundary, cloning, boolean presentation, and Basic Sound Properties
carry the same exact contract. Active may coexist with Sound position,
interval/variation, base-volume, and Hours/Times mutations but not deletion.

Accepted offline gates are 8/8 bounded backend unit suites with 1,769/1,769
assertions, 1/1 atomic-publication integration suite with 30/30 assertions,
7/7 focused frontend files with 260/260 tests, 12/12 immutable capability-
catalog assertions, and passing backend/frontend production builds. The
frontend build emits only the pre-existing chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started or
stopped for this checkpoint. Fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN activation/audio behavior, the remaining Sound scopes,
and the full 99-tileset rendering/connectivity program remain open.

## 93. Continued implementation checkpoint — 2026-08-25 (existing Sound Play Order CAS)

Immutable capability catalog revision `2026-08-25.45` source-closes and
implements exact existing-Sound `Random:BYTE` Play Order mutation. The 81-row
totals remain 51 implemented, 25 partial, 0 preserve-only, and 5 not-started;
release remains 38 available, 37 blocked, and 6 hidden because the broad
`objects_sound_authoring` capability remains partial.

Primary retail Toolset decompilation proves the unique case-sensitive BYTE
read/write and direct `Sequential`/`Random` Sound Properties radio paths.
Native load treats any nonzero byte as Random while save canonicalizes the
radio to `1`; only source values `0` and `1` are admitted for non-lossy CAS.
The native Priority helper reads Looping, Continuous, Positional, Sound-list
count, Interval, and IntervalVrtn, but not Random. Play Order can therefore be
written independently without changing derived Priority. Play Style remains
blocked until its mutation includes the complete Priority derivation contract.
No external or GPL source was inspected or used.

Backend exact parsing, detached API projection, provenance-bound draft
projection, independent source replanning, field-only CAS writing, complete
candidate Sound-struct reconstruction, unchanged paired GIC verification, and
receipt accounting are connected. Frontend HTTP, scene mapping, persisted
draft boundary, cloning, exact presentation conversion, and Advanced Sound
Properties carry the same contract. Play Order may coexist with Sound
position, interval/variation, base-volume, Hours/Times, and Active mutations
but not deletion.

Accepted offline gates are 8/8 bounded backend unit suites with 1,776/1,776
assertions, 1/1 atomic-publication integration suite with 30/30 assertions,
7/7 focused frontend files with 271/271 tests, 12/12 immutable capability-
catalog assertions, and passing backend/frontend production builds. The
frontend build emits only the pre-existing chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started or
stopped for this checkpoint. Fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN playback behavior, Play Style/derived Priority, the
remaining Sound scopes, and the full 99-tileset rendering/connectivity program
remain open.

## 94. Continued implementation checkpoint — 2026-08-25 (Sound Play Style + derived Priority CAS)

Immutable capability catalog revision `2026-08-25.46` source-closes and
implements one combined existing-Sound Play Style and derived Priority CAS.
The 81-row totals remain 51 implemented, 25 partial, 0 preserve-only, and 5
not-started; release remains 38 available, 37 blocked, and 6 hidden because
`objects_sound_authoring` remains partial.

Primary Toolset decompilation and RCDATA prove three canonical Play Style
presentations: Play Once (`Looping=0, Continuous=0`), Repeat (`0,1`), and
Seamlessly looping (`1,0`). The native helper deterministically derives
Priority `2/3/19/20` from those flags, Positional, exact Sounds count, and
zero/nonzero Interval plus IntervalVrtn. Exhaustive boolean-path analysis also
proves the decompiler's register-carried helper parameter cannot affect an
output. No external or GPL source was inspected or used.

Backend parsing, provenance projection, independent source replanning,
complete-tuple CAS, exact three-field write, full Sound reconstruction, paired
GIC preservation, and receipt accounting are connected. Frontend HTTP,
scene/draft/clone boundaries, presentation conversion, and Advanced Sound
Properties share the same tuple and never permit hidden dependency changes or
direct Priority edits.

Accepted offline gates are 9/9 backend unit suites with 1,811/1,811
assertions, 7/7 frontend files with 284/284 tests, 1/1 atomic-publication suite
with 30/30 assertions, passing backend/frontend builds, and a dedicated clone
test executed at final checkpoint verification. The frontend build emits only
the known chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started.
Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN audio
behavior, Sound list membership, positioning/attenuation, and the full
99-tileset rendering/connectivity program remain open.

## 95. Continued implementation checkpoint — 2026-08-25 (ordered Sound playback-list CAS)

Immutable capability catalog revision `2026-08-25.47` source-closes and
implements ordered playback-list authoring for an existing native Sound. The
81-row totals remain 51 implemented, 25 partial, 0 preserve-only, and 5
not-started; release remains 38 available, 37 blocked, and 6 hidden because
`objects_sound_authoring` is still partial and release proof is outstanding.

Primary Toolset decompilation proves ordered zero-or-more `Sounds:LIST`
children, GIT child struct type `0`, and one exact `Sound:RESREF` field per
child. Retail RCDATA proves List of Sounds to Play, Add, Remove, Move Up, Move
Down, Play, and Stop controls. Because native Priority reads exact list count
alongside Looping, Continuous, Positional, Interval, and IntervalVrtn, Aurora
Web uses one complete `soundPlayback` tuple instead of racing list membership
against the former count-only Play Style lane. No external or GPL source was
inspected or used.

Backend exact parsing, detached projection, draft projection, independent
source replanning, exact list/style/Priority CAS writing, full Sound candidate
reconstruction, paired GIC preservation, persisted readback, and receipt
accounting are connected. Frontend HTTP, scene/draft/clone boundaries,
presentation conversion, Update receipts, and Sound Properties use the same
tuple. Remove and Move preserve native order; Add accepts only a canonical
ResRef selected from the existing backend sound catalog; duplicates remain
allowed and placeholder/free-text names are never synthesized.

Accepted offline gates are 6/6 focused backend suites with 1,718/1,718 tests,
8/8 focused frontend files with 293/293 tests, 1/1 Area Update atomic-
publication integration suite with 30/30 tests, 12/12 immutable capability-
catalog assertions, and passing backend/frontend production builds. The
frontend build emits only the known chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started.
Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN
audible behavior, Sound positioning/attenuation source closure, and the full
99-tileset rendering/connectivity program remain open.

## 96. Continued implementation checkpoint — 2026-08-25 (authoritative Sound spatial profile CAS)

Immutable capability catalog revision `2026-08-25.48` source-closes and
implements the remaining existing-Sound positioning/attenuation authoring
slice. The 81-row totals remain 51 implemented, 25 partial, 0 preserve-only,
and 5 not-started; release remains 38 available, 37 blocked, and 6 hidden
because browser, native Toolset, and NWN behavior proof is still outstanding.

Primary Toolset decompilation and retail RCDATA prove exact native
`Positional`, `RandomPosition`, `Elevation`, `MaxDistance`, `MinDistance`,
`RandomRangeX`, and `RandomRangeY` labels/types; the three radio flag pairs;
signed Height endpoints; the retail outer-radius clamp `0.2..320`; and the
inner-radius clamp `0..outer`. Aurora Web combines those fields with ordered
Sounds, Looping/Continuous, Positional-dependent Priority, Interval, and
IntervalVrtn into one authoritative `soundProfile` so positioning cannot race
list/style/Priority. No external or GPL source was inspected or used.

Backend exact parsing, detached projection, independent source replanning,
complete profile CAS writing, full Sound candidate reconstruction, paired GIC
preservation, persisted readback, and receipt accounting are connected.
Frontend HTTP, scene/draft/clone boundaries, presentation conversion, catalog-
bound list controls, Positioning, editable native MinDistance, signed Height,
Play Style, and Update receipts use the same aggregate. Legacy playback and
count-only Play Style remain fallback lanes and cannot mutate the same ordinal.

Accepted offline gates are eight bounded backend unit suites with 1,747/1,747
tests, nine focused frontend files with 305/305 tests, one Area Update atomic-
publication integration suite with 30/30 tests, 12/12 immutable capability-
catalog tests, and passing backend/frontend production builds. The frontend
build emits only the known chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started.
Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN
audible positioning/attenuation behavior, sound-guide visual parity, and the
full 99-tileset rendering/connectivity program remain open.

## 97. Continued implementation checkpoint — 2026-08-25 (Sound viewport-guide geometry)

Immutable capability catalog revision `2026-08-25.49` closes the offline
implementation gap between the authoritative Sound spatial profile and its
viewport/audio-preview presentation. The 81-row totals remain 51 implemented,
25 partial, 0 preserve-only, and 5 not-started; release remains 38 available,
37 blocked, and 6 hidden because fresh browser, Toolset, and NWN proof is still
outstanding.

The source-closed fields from checkpoint 96 now feed one generic world-geometry
projection. Signed Height is no longer clamped at zero, MinDistance and
MaxDistance become the inner and outer radii at the exact units-per-tile scale,
and RandomRangeX/Y become the complete centered box spans. The Three.js guide
renderer and runtime audio preview consume that same projection, preventing
visual/source-position drift. The projection is asset-identity-neutral and
uses only typed Sound data; no external or GPL source was inspected or used.

The viewport emits immutable revision and exact numeric geometry diagnostics
on every Sound marker. Focused tests inspect actual ring, rectangle, and
downward-height line vertices, validate deterministic scale fallback, and keep
all guides editor-only under visibility/lock gating. No guide helper becomes a
serialized entity or mutation field.

Accepted offline gates are 30/30 focused Sound guide/viewport assertions,
71/71 Area scene/Sound-properties assertions, 12/12 immutable capability-
catalog assertions, and a passing frontend production build. The build emits
only the known chunk-size advisory.

No managed service, browser capture, Toolset, or NWN process was started.
Fresh browser profile-bound visual/readback proof, exact-candidate Toolset
Save/Build/reopen, NWN audible behavior, and the full 99-tileset rendering and
connectivity program remain open.

## 98. Continued implementation checkpoint — 2026-08-26 (PathConnect AUR-S07 contract repair)

The bounded native PathConnect candidate has advanced from a stale preparation
packet to a runner-compatible immutable successor without claiming the missing
NWN semantic. A fresh dry-run rejected the preserved v1 packet before any live
action because its generator emitted legacy `geometryGate.evidence`, while the
runtime runner requires a hash-bound `geometryGate.artifact` and `sha256`.

The generator is now contract-aligned and supports a validated explicit
profile identity. Successor profile
`aw-path-connect-tms01-7-runtime-v2` preserves the exact MOD hash, ordered HAK
list, positive/negative Areas and fixtures, entry point, and deliberate
`user_owned_test_module_action` boundary. Dry-run and arm passed with
`startsNwn=false`, `usesGlobalInput=false`, zero Toolset/NWN processes, and a
new immutable launch request under
`output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07-v2/`.

The three offline tile control-plane gates passed, as did 131/131 focused
frontend WOK/PathConnect assertions. The focused backend WOK suite exhausted
the mandatory 1 GB heap cap twice and remains unverified for this checkpoint;
the limit was not bypassed. Native positive-cross/negative-no-cross proof,
full 99-tileset fresh runtime profiling/capture/classification, browser visual
proof, and Toolset/NWN completion evidence remain open.

## 99. Continued implementation checkpoint — 2026-08-26 (v9 matrix proof-cycle repair)

A fresh source-bound v9 runtime profile successfully exposed one exact managed
frontend/backend identity, direct/proxy health agreement, and a 99-tileset
host-local catalog. The canonical hash-bound catalog planner produced a new
99-tileset, 53,700-row, 3,378-chunk matrix at
`output/proof/tile-add-connect-matrix-v9-runtime-build-bound-catalog-2026-08-26`.
Its plan ID/manifest SHA-256 is
`4f399edc2db05d1da7988fa2293982bada5dd54da5271d4e39fe6f3ee33b7f3f`
and zero-checkpoint SHA-256 is
`f013001c259a3fdff9ee3e44e422bb38f1a5aabce43174606fc8d42e549b6850`.
The matching 48,929,296-byte certification publication remains honestly
blocked with zero production-ready rows.

The first guarded capture reached the real new-Area UI and failed closed
before any PNG or checkpoint advancement. Failure frame
`atj02-group-chunk-0001.failure.frame.json` has SHA-256
`bf29d47c93f32c071552de61af7df059261a64284e281ac94cd89fbd3d5dea60`
and records `area_editing_new_area_ui_creation_failed` plus
`AREA_TILE_CERTIFICATION_UNAVAILABLE: Tile_ID 109 at source.`. This proved a
control-cycle rather than a renderer verdict: the local matrix draft was being
blocked by the production render-certification gate before the dedicated
matrix fixture could create that render evidence.

The existing frozen production-placement contract already reserves a named
diagnostic exception. The new-Area UI now uses it only for the exact
development proof triple: DEV build, `matrix_*` Area ResRef, and explicit
`first-compatible` initializer. It does not weaken normal Area creation or
ordinary topology mutation. TDD first reproduced the blocker; the focused
panel plus pure admission suites now pass 44/44 assertions, including a
non-matrix negative check. No Aurora semantic or external GPL source was
introduced.

The v9 profile and failure packet remain immutable historical evidence because
the repair changed source identity. A fresh successor profile, zero-checkpoint
plan/publication, accepted guarded capture and independent visual review are
still required. All capture-owned services, Chrome, Docker resources and locks
were released after the failure. The complete remaining matrix, independent
PathConnect/WOK, Toolset Save/Build/reopen, packed readback, and NWN runtime
proof remain open.

## 100. Continued implementation checkpoint — 2026-08-26 (first accepted v10 matrix capture)

The proof-cycle repair from checkpoint 99 is now validated by one fresh,
source-bound runtime capture. Immutable v10 profile
`tile-add-connect-runtime-build-v10-source-bound-2026-08-26` binds digest
`27c6b0cd144c1a1d62c64eee05b6689fd2e4a9c941ff2b8c419cb83115e80d0a`
over 1,450 files and 26,897,990 bytes. The exact v10 matrix plan at
`output/proof/tile-add-connect-matrix-v10-runtime-build-bound-catalog-2026-08-26`
has plan ID
`090966f3bcf9147de8c1032d01ea2fb54b63cc6ea0679ce20c8ec9978f0ca69e`.

`atj02-group-chunk-0001` passed the guarded source/runtime identity, exact
frontend/direct/proxy backend identity, Area creation, fixture mutation,
renderer settlement, asset closure, material, camera, screenshot, lifecycle,
and post-capture gates. Independent `aurora-toolset-prove` inspection accepted
the proportional 8x2 canvas with complete Barn01_2x2, RuinPark_1x2, and
SlumHouse_1x2 fixtures. Runtime evidence is 16/16 loaded tiles, zero pending,
failed, or bridge tiles, 9/9 process candidates ready, zero material failures,
zero clipped corners, and no framing outlier.

The visual-review SHA-256 is
`99b4f96db23e9ed5dab9d35b6591ec0180dbe78fb59158d7178dc7bdb38341cb`
and frame SHA-256 is
`0cfba6c810ecce8143bf7fbec8ab7d2d4bd99cc20196a4b33b7cf74d742e2565`.
Checkpoint SHA-256
`5cdf6e8057f65296258b5075e984b56a161030b7c900381d797d47d423ee0c69`
is now exactly `1/3378`, with eight Add/Render and eight group rows captured.
PathConnect remains 0/44,664; no WOK, seam, persistence, Toolset, or NWN
semantic was inferred from the canvas.

The checkpoint-one publication binds the one accepted review and promotes
exactly eight `assetClosure` plus eight `render` proofs. It remains honestly
blocked by `production_rows_incomplete`, with zero production-ready rows,
because all independent dimensions remain fail-closed. Its file is
`output/proof/area-tile-certification-publication-v10-checkpoint-0001-2026-08-26/release-report.json`,
48,767,937 bytes, SHA-256
`e3d439a5c860e2975ce524f3dc737fe984c7294705eef26bf2aa755833b4be3e`.

All owned services, Chrome, Docker resources, ports, and locks were released.
The post-capture documentation is outside the runtime-source identity roots,
so it does not by itself make v10 historical. The v10 profile remains eligible
while `--verify-runtime-source` reproduces its exact digest; a successor is
required only after a bound runtime source or config changes. At this
checkpoint the remaining 3,377 Add/Render chunks, independent PathConnect/WOK,
Toolset Save/Build/reopen, packed readback, and NWN runtime proof remained open.

## 101. Continued implementation checkpoint — 2026-08-26 (bounded backend WOK verification)

The previously missing backend WOK parser/geometry test point is now closed
without exceeding or bypassing the mandatory 1 GB Node heap cap. The
repository-owned one-worker `test:unit:bounded` route passed all 35 assertions
across the WOK parser/AABB traversal, Area repository source precedence and
tile-instance projection, and serialized VFX/runtime schema admission. The
machine-readable report at
`output/proof/area-wok-backend-bounded-2026-08-26.json` is 15,718 bytes and has
SHA-256
`ad97cfdf9b36087ce7989222c75ad69a3fef2da898e3de9dd28faf376455aa32`.

The immutable AUR-S07 v2 candidate remains ready offline. A fresh dry-run
passed, and independent hashing confirmed the exact MOD, all four ordered HAK
files, and the geometry gate against their profile values. No Toolset or NWN
process was started. The profile's explicit
`user_owned_test_module_action` boundary was preserved; it was not silently
changed to central dispatch and no global input was synthesized.

This checkpoint closes only the resource-safe backend WOK test gap. Native
positive crossing, negative non-crossing, runtime capture, and engine-load log
remain `missing`. PathConnect coverage therefore remains 0/44,664 and is not
inferred from SET references, source-WOK geometry, or the accepted browser
canvas. The remaining 3,377 Add/Render chunks and native Toolset/NWN proof
stages remain open.

## 102. Continued implementation checkpoint — 2026-08-26 (second accepted v10 matrix capture)

Runtime-source verification established that checkpoint documentation is not
part of the v10 identity roots. The observed identity still exactly matches
digest
`27c6b0cd144c1a1d62c64eee05b6689fd2e4a9c941ff2b8c419cb83115e80d0a`
over 1,450 files and 26,897,990 bytes. A separately generated immutable v11
diagnostic profile reproduced the same digest and byte inventory; it is not
the binding used by this capture and does not replace the active v10 plan.

Guarded capture `atj02-group-chunk-0002` completed under the exact v10
frontend/direct/proxy backend identity and passed source identity, Area
creation, exact fixture mutation/history, renderer settlement, asset closure,
material, camera, screenshot, lifecycle, and post-capture gates. Independent
visual inspection accepted the full proportional 7x2 canvas: group105 is the
complete horizontal two-member fixture at the left, group107 the complete
vertical two-member fixture in the center, and group11 the complete horizontal
two-member fixture at the right. All six declared members are visible and no
blank, failed, bridge, placeholder, collapsed, internally black, or clipped
cell was observed.

Runtime evidence records 14/14 loaded tiles, zero pending/failed/bridge tiles,
7/7 process candidates ready, 14/14 material contracts applied, 308 visible
meshes, zero clipped corners, and settled mutation/post-capture/presented-frame
contracts. The artifact hashes are:

- visual review:
  `0406eb1994f89a7f88001724a6abd2d4b009eb17575eede7e9a9d1cfa993f06f`;
- frame:
  `6b30205709bf843ec38903b549ada75c947d5c1764c0b5d540c9644742987ab4`;
- state:
  `255fb13cc87e3aa845a41df9648d520ca5a68c7e3ffb460e929180a299603ec1`;
- canvas:
  `8adfd9096379be7079ed01944b85593cc3317d5360f8db9c290a6294d6389c32`;
- page:
  `3e4d49d08ee558de92484d4b22b706cd3785c3794af7d9c951c414cbb4bfef47`;
- lifecycle:
  `fb2d55d6e88baea2144e23c55b06e52a961aa91971025fb8e70a2c6a8fdd2382`.

Acceptance moved the exact checkpoint to `2/3378`; checkpoint SHA-256 is
`5c2024e006f237d905b4d9791d95fbd53609a66566dec601d3122b429da2cf75`.
Cumulative Add/Render and group coverage is 14 rows, leaving 3,376 capture
chunks. The checkpoint-two certification publication passed the focused
evidence regression gate, backend build, canonical rebuild, input/hash
admission, and 64 MiB budget. Its compact report
is
`output/proof/area-tile-certification-publication-v10-checkpoint-0002-2026-08-26/release-report.json`,
48,767,747 bytes, SHA-256
`45bf45925fe88cf5ec1af7016c6a8f8077041ff41d925356275acb25cd30fed6`.
It promotes exactly 14 `assetClosure` and 14 `render` proofs, while remaining
`blocked` by `production_rows_incomplete` with zero production-ready rows.

PathConnect remains 0/44,664 and no WOK, seam, persistence, Toolset, or NWN
semantic is inferred from this render evidence. Owned managed services,
containers, Docker Desktop, ports, service locks, and the global capture lock
were released after acceptance.

## 103. Continued implementation checkpoint — 2026-08-26 (third accepted v10 matrix capture)

The next guarded v10 cycle accepted `atj02-group-chunk-0003` without changing
the source-bound identity. The exact 7x2 fixture contains two declared groups:
the four-member horizontal `Ori_WaterBridge` group110 across the left four
columns and the four-member 2x2 enclosed group113 structure at the right.
Independent visual review found the full footprint and all eight declared
members legible, continuous, and inside the cyan Area boundary, with no blank,
failed, bridge, placeholder, collapsed, clipped, internally black, or camera
outlier cell.

The runtime evidence is 14/14 loaded tiles, zero pending/failed/bridge tiles,
9/9 process candidates ready, 14/14 material contracts applied, 361 visible
meshes, 11/11 process responses at HTTP 200, zero clipped corners, and ready
mutation, post-capture, and presented-frame settlements. The frame SHA-256 is
`c436063d2dd1df29956b2ff3643edc2ae03f5d58351486ce597a06fc5ab32924`;
the independent review SHA-256 is
`6d16e955fb1aaec2000193661835f2f7633c86438bfb52d373fa2cb7b6ca3c76`.

Acceptance advanced the checkpoint to `3/3378`, SHA-256
`aa7839c8f7c2c733b92ecf05fb190c886e974fc6fe371feceb451d5e0692569c`.
Cumulative Add/Render and group coverage is now 22 rows, leaving 3,375 capture
chunks. PathConnect remains 0/44,664 and is not inferred from the visibly
continuous water bridge. The checkpoint-two publication remains the latest
published progress ledger; no checkpoint-three publication is claimed. All
capture-owned services, containers, Docker Desktop, ports, service locks, and
the global capture lock were released after acceptance.

## 104. Continued implementation checkpoint — 2026-08-26 (fourth accepted v10 matrix capture)

Guarded capture `atj02-group-chunk-0004` accepted a 4x3 fixture containing the
complete three-member vertical `CaravanFloating_3x1` group120 and the complete
sparse four-member group121 ship-and-dock composition. Independent canvas and
page inspection found all seven declared members, both complete ships, their
hulls, main sails and masts, the connected dock, and every Area corner visible.
Dark grey hull-adjacent surfaces are textured source geometry, not blank or
failed cells.

The camera contract correctly required explicit review because four tiny
source appendages — two `BackSailSupportRopev` rigging segments and two
`Box05v01` meshes — extend just beyond the authored footprint. The review
accepted that bounded outlier only after confirming zero clipped corners,
no clipped group member, and no canvas-edge loss. Runtime evidence is 12/12
loaded tiles, zero pending/failed/bridge tiles, 8/8 process candidates ready,
12/12 material contracts applied, 551 visible meshes, and 10/10 successful
process responses. The frame SHA-256 is
`798f681d94a499db070d4059c35ddc3b72d911971df30693dc15731b8956f9e7`;
the review SHA-256 is
`84e0ebde364444701bbb3251854b2855e39c082d1f0f9dd828212b51968a8cff`.

Acceptance advanced the checkpoint to `4/3378`, SHA-256
`8cd2be8f330988ba3016007896b76df4e1c1d0357054225e362098add3d24892`.
Cumulative Add/Render and group coverage is 29 rows, leaving 3,374 capture
chunks. PathConnect remains 0/44,664; visible water, ships, or dock adjacency
does not certify native crossing. Services, containers, Docker Desktop, ports,
service locks, and the global proof-capture lock were released.

## 105. Continued implementation checkpoint — 2026-08-26 (fifth accepted v10 matrix capture)

Guarded capture `atj02-group-chunk-0005` accepted the complete proportional
8x2 fixture for group13, group14, and group15. Independent canvas and page
inspection found all eight declared members visible: the two-member
`Inn1_1x2` group13 at the left, the four-member 2x2 group14 composition at the
center, and the two-member group15 composition at the right. Thin pale source
appendages beside group14 and group15 were inspected as rendered source
geometry; they are not blank, failed, bridge, or placeholder cells. No group
member or Area corner is clipped.

Runtime evidence is 16/16 loaded tiles, zero pending/failed/bridge tiles, 9/9
process candidates ready, 16/16 material contracts applied, 376 visible
meshes, 11/11 process responses at HTTP 200, zero clipped corners, and ready
mutation, post-capture, and presented-frame settlements. The camera bounds
policy is `within_footprint_connected_bounds` with no excluded meshes. Frame
SHA-256 is
`a052fcdaec011f50fe3c0e11f306f0d25f0342b0c036a61f090d36f55229215d`;
review SHA-256 is
`98aa337a0c6fd1fcb17f4fc732c510cb1d43805424bbfbb7a828a03329fda590`.

Acceptance advanced the checkpoint to `5/3378`, SHA-256
`91cbee55eaa3cb9c898129f9f88a1849520fbb9368cd324328640a595e595e89`.
Cumulative Add/Render and group coverage is 37 rows, leaving 3,373 capture
chunks and 53,663 matrix rows without accepted Add/Render evidence.
PathConnect remains 0/44,664 and is not inferred from visible buildings,
paths, or adjacency. Services, containers, Docker Desktop, all coordinated
ports, service locks, and the global proof-capture lock were released after
acceptance.

## 106. Continued implementation checkpoint — 2026-08-26 (sixth accepted v10 matrix capture)

The first bounded chunk-0006 request failed closed before Chrome launch when
the newly managed backend used the docker-only `seaweedfs` hostname from the
default runtime-settings profile. It created no fresh capture artifacts and
did not advance the checkpoint. The same source-bound backend was restarted
with the repository-defined `AURORA_HOST_LOCAL_RUNTIME=true` profile, which
uses the existing local module-blob mirror. Exact direct/proxy health identity
and the cold `atj02` source lookup then passed before the unchanged capture was
retried; no timeout or acceptance criterion was relaxed.

Guarded capture `atj02-group-chunk-0006` accepted the full proportional 8x2
fixture for group16, group17, and group18. Independent inspection found the
complete two-member `Farm03_1x2` group16 composition at the left, all four
members of the 2x2 grey stepped/platform group17 composition at the center,
and both members of the grey stepped/platform group18 composition at the
right. All Area corners and all eight declared member cells are visible.
Thin black bands inside the compositions are source-backed model/texture
details, not blank or failed cells.

Runtime evidence is 16/16 loaded tiles, zero pending/failed/bridge tiles, 9/9
process candidates ready, 16/16 material contracts applied, 349 visible
meshes and material maps, 11/11 process responses at HTTP 200, zero clipped
corners, no excluded camera meshes, and ready mutation, post-capture, and
presented-frame settlements. Frame SHA-256 is
`1dcbff5b0937686a180b6964cc3aede6a03d9073d1ee9feafce1d3185dbfc671`;
review SHA-256 is
`0646fb14a7f76a6f2a38941eaa10acc64d0c90cb97d78c0f80938c98c1ffcff4`.

Acceptance advanced the checkpoint to `6/3378`, SHA-256
`9bff431ce0e714c76f4e0cb5ea2dd9b3f391860ddcd999364f0bddedfb65a0b2`.
Cumulative Add/Render and group coverage is 45 rows, leaving 3,372 capture
chunks and 53,655 matrix rows without accepted Add/Render evidence.
PathConnect remains 0/44,664 and is not inferred from the visible platform
geometry. Services, containers, Docker Desktop, coordinated ports, service
locks, and the global proof-capture lock were released after acceptance.

## 107. Continued implementation checkpoint — 2026-08-26 (seventh accepted v10 matrix capture)

Guarded capture `atj02-group-chunk-0007` accepted the full proportional 8x2
fixture for `Windmill_2x2` group21, `Warzone_1x2` group24, and
`ShipDocked01_2x2` group25. The names, dimensions, ordered Tile IDs, and
orientations were cross-checked against the exact source SET. Independent
canvas/page inspection found the complete windmill and cultivated plot at the
left, both grey source-backed warzone members at the center, and the full
shoreline/water, dock connection, and docked ship hull at the right. All ten
declared members and all Area corners are visible; dark water and narrow dark
model details are source-backed surfaces rather than blank cells.

Runtime evidence is 16/16 loaded tiles, zero pending/failed/bridge tiles,
11/11 process candidates ready, 16/16 material contracts applied, 332 visible
meshes, 335 material maps, 13/13 process responses at HTTP 200, zero clipped
corners, no excluded camera meshes, and ready mutation, post-capture, and
presented-frame settlements. Frame SHA-256 is
`076c4fb165288c4f1b11d25ad3c48452791a8514ff1153d7553f49688246f540`;
review SHA-256 is
`17ae5bc882399f5ced024d436bd6a62a22f3899f9e8d439f729c0516ea7da85f`.

Acceptance advanced the checkpoint to `7/3378`, SHA-256
`421456cf8e51bfd749917af48841aeccfd81672cb36c297d483065a47b46ebcb`.
Cumulative Add/Render and group coverage is 55 rows, leaving 3,371 capture
chunks and 53,645 matrix rows without accepted Add/Render evidence.
PathConnect remains 0/44,664; a visible dock connection or shoreline does not
certify native WOK crossing. Services, containers, Docker Desktop,
coordinated ports, service locks, and the global proof-capture lock were
released after acceptance.

## 108. Continued implementation checkpoint — 2026-08-26 (eighth accepted v10 matrix capture)

Guarded capture `atj02-group-chunk-0008` accepted the full proportional 8x2
fixture for the exact source-SET groups `DragSkel_1x2` group3,
`Barracks_1x2` group36, and `Tower_1x2` group37. The SET names, dimensions,
ordered Tile IDs, and orientations were read from the immutable `atj02.set`
source before review. Independent exact-canvas and page inspection found the
complete skeletal/debris pair at the left, the full two-cell barracks roof at
the center, and the complete two-cell tower/fortification footprint at the
right. All six declared members and every Area corner are visible; dark model
surfaces are source-backed details rather than blank or failed cells.

Runtime evidence is 16/16 loaded tiles, zero pending/failed/bridge tiles, 7/7
process candidates ready, 16/16 material contracts applied, 340 visible
meshes and material maps, 9/9 process responses at HTTP 200, zero clipped
corners, no excluded camera meshes, and ready mutation, post-capture, and
presented-frame settlements. Frame SHA-256 is
`c82cc7b43cc1ce822ec948778deee5ee9c056d3049ecdd814523843162e5e7cc`;
review SHA-256 is
`d93c3a3b29a2acce8adc7f47a5e500c66528c4311126a1640e65193e4fc242ab`.

Acceptance advanced the checkpoint to `8/3378`, SHA-256
`b2c490530569d77498889fb67f07dac42e8875c6789e4ee56693bf7449319163`.
Cumulative Add/Render and group coverage is 61 rows, leaving 3,370 capture
chunks and 53,639 matrix rows without accepted Add/Render evidence. The
required captured-row remainder is 44,942 after excluding 8,697 named blocked
rows. PathConnect remains 0/44,664 and is not inferred from visible skeleton,
barracks, tower, or terrain geometry. Services, containers, Docker Desktop,
all coordinated ports, service locks, and the global proof-capture lock were
released after acceptance.

## 109. Continued implementation checkpoint — 2026-08-26 (ninth accepted v10 matrix capture)

Guarded capture `atj02-group-chunk-0009` accepted the complete proportional
5x3 fixture for exact source-SET groups `Temple02_2x2` group38 and
`Temple03_3x2` group40. The immutable SET readback binds the four ordered
members of group38 and six ordered members of group40. Independent exact
canvas and page inspection found the complete circular temple ring, central
star surface, and four perimeter pads at the left, plus the full upper
four-lobed plaza, paved entrance, connecting stem, and lower terminal of the
three-row temple at the right. All ten declared members and all Area corners
are visible; dark stone and paving are source-backed surfaces.

Runtime evidence is 15/15 loaded tiles, zero pending/failed/bridge tiles,
11/11 process candidates ready, 15/15 material contracts applied, 242 visible
meshes, 251 material maps, 13/13 process responses at HTTP 200, zero clipped
corners, no excluded camera meshes, and ready mutation, post-capture, and
presented-frame settlements. Frame SHA-256 is
`1d7ec196e97c45a1d1fc42cbd05141fdc252bbad5d4e3213321678745161ed83`;
review SHA-256 is
`9dc948a9351c48b7f03ae4ea22e4be9d32cff076866b1616754cedf0e183c883`.

Acceptance advanced the checkpoint to `9/3378`, SHA-256
`4e82f1b02a8f7598aba1dc0ad6562705c5a1346810c3377164e07bbbd31254b4`.
Cumulative Add/Render and group coverage is 71 rows, leaving 3,369 capture
chunks and 53,629 matrix rows without accepted Add/Render evidence. The
required captured-row remainder is 44,932 after excluding 8,697 named blocked
rows. PathConnect remains 0/44,664; visible temple plazas or paving do not
certify native WOK crossing. Services, containers, Docker Desktop, all
coordinated ports, service locks, and the global proof-capture lock were
released after acceptance.

## 110. Continued implementation checkpoint — 2026-08-26 (tenth accepted v10 matrix capture)

Guarded capture `atj02-group-chunk-0010` accepted the complete proportional
8x2 fixture for the exact source-SET groups `ShipDocked02_2x2` group41,
`House2_1x2` group42, and `Exit02_2x2` group57. The SET names, dimensions,
ordered Tile IDs, sparse group41 member, and orientations were checked against
the immutable `atj02.set` source. Independent exact-canvas and page inspection
found the full dock and moored ship at the left, both house members in the
middle, and the complete rock-and-vegetation exit rim at the right. All nine
declared members and all Area corners are visible. The dark center of the exit
is the authored opening enclosed by source-backed geometry, not a blank,
failed, bridge, or placeholder tile.

Runtime evidence is 16/16 loaded tiles, zero pending/failed/bridge tiles,
10/10 process candidates ready, 16/16 material contracts applied, 388 visible
meshes, 396 material maps, 12/12 process responses at HTTP 200, zero clipped
corners, no excluded camera meshes, and ready mutation, post-capture, and
presented-frame settlements. Frame SHA-256 is
`544e21eb62c596fb995f921dcdbc462bafb9ee4c31e1275746a17b8cb8ecdfe8`;
review SHA-256 is
`f0c63b0250de75cd375ecd9e8ef291a03535ff49a6b4ea0741935110b8aa1fe0`.

Acceptance advanced the checkpoint to `10/3378`, SHA-256
`b0495da1f2f61f5c174d373c3be0d3471d5e444e8cf97aaa92b113eb266c9d9f`.
Cumulative Add/Render and group coverage is 78 rows, leaving 3,368 capture
chunks and 53,622 matrix rows without accepted Add/Render evidence. The
required captured-row remainder is 44,925 after excluding 8,697 named blocked
rows. PathConnect remains 0/44,664; visible docks, houses, exits, or terrain
geometry do not certify native WOK crossing. Services, containers, Docker
Desktop, all coordinated ports, service locks, and the global proof-capture
lock were released after acceptance.

## 111. Docker proof-runtime lifecycle incident — 2026-08-26

The attempt to begin `atj02-group-chunk-0011` was stopped before application
services or capture after Docker Desktop failed during Inference-manager
startup. The first restart already failed on the stale/inaccessible
`%LOCALAPPDATA%\Docker\run\dockerInference` endpoint before a later second
start was issued. Repeating the start against the unchanged failure was an
operator error; it reproduced the crash and did not advance the matrix.

Docker Desktop must no longer be treated as an ephemeral per-chunk proof
process. A healthy Desktop engine is shared workstation infrastructure and is
reused across a contiguous capture batch; only the exact managed
backend/frontend pair and globally locked Chrome capture tree retain the
per-task ownership/cleanup requirement. A failed Docker start now stops the
live lane after one bounded observation and log readback, with no blind second
start.

The complete evidence, root-cause split, recovery candidates, and resume gate
are recorded in
`backend/docs/aurora-reverse/docker-desktop-proof-runtime-lifecycle-incident-2026-08-26.md`.
No Docker recovery or source mutation was performed. The checkpoint remains
`10/3378`; the next matrix action remains `atj02-group-chunk-0011`.

## 112. Active matrix binding repair and source-bound v12 successor — 2026-08-26

A read-only public status call exposed that the package-level matrix commands
still selected historical v8 by default. They reported `0/3378` and an
unrelated old digest even though immutable v10 had ten accepted captures. No
checkpoint or artifact was damaged; the operator command was bound to the
wrong directory.

The first candidate fix embedded v10's path and plan ID in `package.json`, but
TDD showed that this creates a self-invalidating cycle because `package.json`
is part of the matrix runtime-source identity. The completed design keeps all
code stable and places only the current plan identity in
`backend/docs/aurora-reverse/proof-profiles/tile-add-connect-active-plan.json`,
which is outside the runtime identity roots. The generic active-plan runner
verifies the manifest hash, checkpoint directory/plan binding, and exact
runtime-build profile before invoking `status`, `next`, or `capture`; caller
path/plan overrides are rejected. The raw matrix CLI now fails closed with
`MATRIX_OUT_DIRECTORY_REQUIRED` instead of selecting a historical default.

These control and Docker-safety changes are themselves inside the frozen
identity roots, so v10 remains immutable historical proof at `10/3378` but
cannot certify the current build. No v10 review was copied forward. The new
v12 profile SHA-256 is
`ffe4d7fbbd0e9108e17677882f5859be2cbddd7559121fdeffe5b0b6bfa80ad2`;
it binds current digest
`69f9c763bc1dbf9acb156ea89fb237e34c61e16562d079002bb732b697b4c999`,
1,453 files and 26,922,913 bytes. The catalog-bound v12 plan ID is
`7a3f8a0e8366411e5a6334c260089cf3c184840ade30e6568bbd136fb908c781`
and explicitly replaces v10 plan ID
`090966f3bcf9147de8c1032d01ea2fb54b63cc6ea0679ce20c8ec9978f0ca69e`.

Active status now reports the correct v12 directory, exact source identity
`verified`, the unchanged 99-tileset/53,700-row/3,378-chunk scope, and a fresh
zero checkpoint. This reset is intentional: current-build Add/Render capture
must begin at `atj02-group-chunk-0001` after the Docker resume gate; PathConnect
remains independently `0/44,664` and `missing`. Offline Add/Connect profile,
source, planner, matrix-control, active-binding, PathConnect validator,
acceptance, and catalog-plan tests all passed. Docker Desktop, application
services, Chrome, Toolset, and NWN were not started.

## 113. Continued implementation checkpoint — 2026-08-26 (safe offline resume and AUR-S07 verification)

The corrected Docker lifecycle was exercised exactly once through the bounded
read-only dependency preflight at `2026-08-26T14:35:26.992Z`. It returned
`DOCKER_ENGINE_UNAVAILABLE` plus historical fatal
`DOCKER_INFERENCE_ENDPOINT_FATAL`, bound fingerprint
`9ab12020bca69585ebb959f7960ff464acbe37d63249bf65529e750ebee5f538`,
and explicitly set `retryDockerDesktopStart=false`. Ports `3000` and `5173`
and the backend, frontend, and proof locks were clear; container state was not
inferred because the unavailable engine caused the container observation to
be skipped. No Docker start, restart, container mutation, managed service, or
browser capture followed, and the preflight was not repeated against the
unchanged fingerprint. The durable blocker is
`output/proof/proof-runtime-dependency-preflight-2026-08-26T143526Z.blocker.json`.

The central AUR-S07 v2 PathConnect route then completed one offline `dry-run`
for immutable profile `aw-path-connect-tms01-7-runtime-v2`. It exited zero,
reported `startsNwn=false` and `usesGlobalInput=false`, left all five files in
the v2 proof tree unchanged by path, size, timestamp, and SHA-256, and did not
change the Toolset/NWN process set. Independent read-only verification passed
all fifteen file hashes: the runtime profile, exact MOD, four ordered HAKs,
geometry gate, packed readback, final PathConnect profile, native geometry
manifest, both Toolset capture manifests and PNGs, geometry runtime binding,
and armed launch request. Profile ID, module hash, Area `demo`, entry point,
user-owned launch boundary, and geometry status also matched exactly.

An already-running responsive `nwmain` PID 60784 was present before the
dry-run and remained unchanged afterward. This lane did not start, adopt,
observe, or close it. With no one-time profile-bound handoff, it cannot be
used as AUR-S07 evidence. The required runtime observation, exact capture,
engine/load log, and validated packet remain absent, so PathConnect remains
honestly `0/44,664`, `proofCompleteness=missing`, and
`modelVisibility=not_tested`. The durable offline verification/blocker is
`output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07-v2-offline-verification-2026-08-26.blocker.json`.

These writes affect only documentation and derived proof-state artifacts,
which are outside the v12 runtime-source identity. The active v12 matrix
therefore remains queued at `atj02-group-chunk-0001`; live Add/Render capture
still waits for a changed Docker failure fingerprint and a successful resume
gate, while native PathConnect waits for the explicit user-owned Test Module
handoff and central AUR-S07 capture/validation sequence.

## 114. Continued implementation checkpoint — 2026-08-26 (current completion audit and safe sequencing)

The immutable Area capability catalog at revision `2026-08-25.49` was
recounted directly from source: 81 total rows, 51 implemented, 25 partial,
zero preserve-only, and five not-started; release state is 38 available, 37
blocked, and six hidden. The not-started set is the NSS editor/compiler lane,
NWN traversability, complete render certification, complete connection-row
certification, and NWN runtime certification. This confirms that the program
is not reducible to a remaining capture queue: real authoring/property and
compiler-contract work remains alongside implemented-but-unproved functions
and corpus-scale certification.

The canonical offline stage validator still passes Stage 4 at `8/8`, but
Stages 5, 6, 7, and 8 remain respectively `6/11`, `0/7`, `0/6`, and `0/6`.
The refreshed durable breakdown is recorded in
`backend/docs/aurora-reverse/area-program-completion-audit-2026-08-21.md`.
The Area event-script audit now also records the primary decompilation evidence
for the Toolset compiler lifecycle and explains why no production-safe
external compiler provider, freshness receipt, or stable diagnostic contract
can yet be claimed.

The active v12 matrix remains source-identity verified at plan ID
`7a3f8a0e8366411e5a6334c260089cf3c184840ade30e6568bbd136fb908c781`
and checkpoint `0/3378`, with `atj02-group-chunk-0001` next. PathConnect remains
independently `0/44,664`. The Docker blocker manifest SHA-256 is
`3a493d357295ac41cedb2dac6b6fb24b3cad780f249dca5c28ccb03e145aa449`;
the AUR-S07 v2 offline verification/blocker SHA-256 is
`03a3504b296d19895cd70ed7070b89f3e16a7e2b0230431b8fc16f8c43ada0df`.

The implementation sequence now explicitly finishes admissible source gaps
before starting the exhaustive capture queue. A later source edit will require
a successor build-bound matrix, but v12 contains no accepted capture to lose.
No Docker process, container, managed backend/frontend service, browser,
Toolset, or NWN process was started, stopped, restarted, adopted, or closed
while establishing this checkpoint.

## 115. Continued implementation checkpoint — 2026-08-26 (hash-bound NWScript compiler provider)

Primary Toolset decompilation already established the NSS 2009 to NCS 2010
plus NDB 2064 lifecycle and diagnostics branch. A local external
`nwn_script_comp.exe` provider was then admitted only by exact executable hash
`8ba368d0c80149c502faad66aa5cbd200655aeec88f73048d384122ce2d84a58`,
version marker `neverwinter 2.1.2 (/07a475, nim 2.2.4)`, exact extracted
`nwscript.nss` hash, and a complete hash-bound runtime-library set. Its
neverwinter.nim license is MIT; the executable remains external and is not
bundled. The short reported source commit is not present in the local audit
clone, so exact release-source lineage remains explicitly missing for any
future bundling claim.

The new backend port and adapter stage exact source/include bytes plus provider
files into one invocation-owned directory, disable KEY and override discovery,
run one worker at safe optimization level 1, request NCS and NDB, enforce input,
timeout, process-output, and artifact budgets, sanitize diagnostics, and emit a
deterministic freshness receipt. Production configuration is disabled by
default and rejects partial identity configuration. Nest wiring selects the
executable adapter only for a complete configuration; otherwise it exposes a
typed unavailable provider without launching a process.

The exact real provider compiled the positive fixture twice to identical NCS
and NDB hashes. The negative fixture emitted no accepted artifacts and returned
one sanitized line-3 `NWNSCRIPT_COMPILE_ERROR` with no host path or timestamp.
Four bounded suites pass with 31 assertions, and the backend production build
passes. The provider packet is
`output/proof/area-event-script-compiler-provider-audit-2026-08-26/provider-verification.json`,
SHA-256
`627a1fc21a9feb069d257d395870ff207855cbd01e3548772a233b81cdcdcd79`.

Capability catalog revision `2026-08-26.50` now reports 51 implemented, 26
partial, zero preserve-only, and four not-started rows.
`properties_event_scripts_compile` advances to `verified/partial/hidden`; its
remaining product blockers are the NSS editor, revision-fenced NSS/NCS/NDB
snapshot publication and readback, frontend diagnostics, and unresolved source
lineage for bundling. Browser, Toolset Save/Build/reopen, and NWN event dispatch
remain proof blockers.

Because this implementation added two backend runtime-source files, immutable
v12 correctly reports identity mismatch rather than accepting a stale capture.
The observed digest is
`1e8ddfb6e8ab62a206102c51d2dd2b7b9036c26b3756c661dc6d8910c3d99bdd`
over 1,455 files and 26,951,086 bytes; v12 remains `0/3378`, and the next safe
matrix action is `runtime_build_reprofile_required` only after source work
settles. No Docker process, container, managed service, browser, Toolset, or NWN
process was started, stopped, or restarted. Only bounded external compiler
child processes were owned and settled by the adapter verification.

## 116. Continued implementation checkpoint — 2026-08-26 (atomic NWScript publication and recovery)

The backend NSS authoring transaction now implements the additive contract for
exact validation and publication. A strict source command and a route-level raw
512 KiB guard feed exact committed-revision include capture. The aggregate
target-plus-include input is capped at 8 MiB before the hash-bound compiler is
called. Validation never locks or mutates the module.

Publication authorizes before idempotency lookup, compiles before the shared
module lock, then rechecks the locked revision and `If-Match`. The immutable
successor replaces or inserts exactly `<resref>.nss` type 2009,
`<resref>.ncs` type 2010, and `<resref>.ndb` type 2064. One fenced head CAS
makes the set visible atomically; exact descriptor/content readback is required
before a byte-free receipt is finalized. Memory and MySQL stores share the Area
lifecycle lock and retain no source or artifact bytes.

Startup recovery now handles all nonterminal states. A retained verified receipt
is finalized only after fresh readback. Otherwise the exact baseline is restored;
an unprovable restoration causes a fenced module quarantine even when failure
occurred before a stage record existed. Count-only telemetry and stable outcome
codes make validation, publication, compensation, and recovery diagnosable
without source, ResRef, artifact, path, or storage-key leakage.

The accepted offline gate is 20/20 focused unit suites with 135/135 assertions,
the 2/2 atomic integration assertions, the capability-catalog gate, and a
passing backend production build. The exact packet is
`output/proof/area-event-script-publication-transaction-audit-2026-08-26/publication-verification.json`,
SHA-256
`1fcf5f5069c47033929faad95107984aefb7e43c9df2d0edab66fa85d50922c8`.
Catalog revision `2026-08-26.51` removes the obsolete snapshot-publication
blocker while keeping the row partial/hidden for the missing frontend NSS
editor, diagnostics UI, release-source lineage, and live browser/Toolset/NWN
proof.

This source work makes every historical matrix runtime identity stale for the
new build, as intended. A successor matrix profile is created only after the
remaining frontend source work settles. Docker Desktop, containers, managed
services, Chrome, Toolset, and NWN were not started, stopped, restarted,
adopted, or observed during this checkpoint.

## 117. Continued implementation checkpoint — 2026-08-26 (revision-fenced NSS editor and diagnostics)

The frontend NSS authoring gap is now implemented on top of the atomic backend
publication boundary. The contract first gained an authenticated read-only
source endpoint bound to one expected immutable module revision. The backend
accepts only one exact type-2009 descriptor whose manifest, content identity,
size, hash, and lossless UTF-8 representation all verify; it returns no storage
key, host path, or compiled artifact.

Frontend domain validators now cover all four versioned contracts: source
command, committed source snapshot, validation result, and publication receipt.
The browser composition root injects a dedicated facade backed by an HTTP port.
The Area Events property tab can load existing source, deliberately initialize
a missing source, edit the full include set, validate without mutation, display
bounded diagnostics and artifact hashes, and publish only after a current
compiled validation. Target, source, include, or revision edits discard stale
validation/publication state, while source/validation/publication responses are
rejected if they do not match the originating command identity.

Five backend suites pass 37/37 assertions; seven frontend suites pass 58/58;
both production builds pass. The 29-file evidence packet is
`output/proof/area-event-script-editor-offline-audit-2026-08-26/editor-verification.json`,
SHA-256
`d08048fe22586c38953100d699fcf37dfa37a202f1924035a57777bdc29dd2da`.
Capability catalog revision `2026-08-26.52` reports 52 implemented, 25 partial,
zero preserve-only, and four not-started rows. Script compilation is now
`verified/implemented/hidden`; exact compiler release-source lineage remains
unresolved, and live browser, Toolset, and NWN evidence is still required by
the program.

This checkpoint intentionally used no Docker engine, container, managed
service, browser, capture, Toolset, NWN, or mutation-test process. Historical
matrix profiles remain stale after source changes. A successor runtime-bound
profile is created only after the remaining offline source gaps settle and the
external Docker failure fingerprint changes.

## 118. Continued implementation checkpoint — 2026-08-26 (retained Creature `ItemList`)

The source-closed retained Creature `ItemList` slice is now implemented through
the complete offline Area Update path. The backend accepts one exact immutable
expected list and one exact target list, verifies the retained Creature ordinal
and native list, clones complete retained item structs, admits only the
hash-bound `nw_cloth022` UTI for new entries, regenerates ordered child struct
IDs, writes only the two repository Words and mode-`0`
`Dropable`/`Pickpocketable` flags, preserves the paired GIC, and requires an
independent whole-candidate readback before atomic publication.

The frontend now carries a detached immutable source list from Area projection
through workspace cloning and property drafts. Its domain boundary rejects
unknown keys, stale or duplicated source identities, invalid Words, aliases,
`Infinite`, arbitrary blueprints, and malformed provenance. The Creature
window exposes exact source-backed `ItemList` as `ACTIVE_NOW`, permits only
ordered add/remove/reorder plus coordinates and the two proven flags, and keeps
all other inventory shapes and `Equip_ItemList` visibly `PRESERVE_ONLY`. Apply
materializes the exact validated target without rewriting the immutable source
metadata used by optimistic comparison.

The accepted offline gate is 726/726 backend unit assertions, 30/30 Area Update
atomic-publication integration assertions, 263/263 focused frontend unit
assertions, the 1/1 Creature properties regression flow, and passing backend
and frontend production builds. The frontend build retained only its existing
large-chunk advisory. The exact packet is
`output/proof/area-existing-creature-item-list-offline-audit-2026-08-26/verification.json`.

This checkpoint activates neither `Equip_ItemList`, arbitrary UTI authoring,
random inventory, nor nested item properties. Browser proof, exact-candidate
Toolset Save/Build/reopen, NWN certification, all other incomplete Area
capabilities, the successor build-bound 99-tileset matrix, and independent
PathConnect/WOK proof remain open. No Docker engine, container, service,
browser, capture, Toolset, NWN, or mutation-test process was started for this
slice; runtime reprofiling remains deferred until source work settles and the
external Docker failure fingerprint changes.

## 119. Continued implementation checkpoint — 2026-08-26 (retained Creature `Equip_ItemList`)

The source-closed retained Creature `Equip_ItemList` subset is now implemented
through the complete offline Area Update path. Exact mutation provenance keeps
the zero-based physical source ordinal, full embedded `TemplateResRef`, one of
the 18 native one-hot slot masks, and the two mode-`0` item flags. The backend
rejects aliased, duplicated, unsupported, ambiguous, or stale source shapes;
clones the complete selected embedded item; changes only child struct order and
true-only `Dropable`/`Pickpocketable` Bytes; removes the list for an empty
target; and preserves the paired GIC. Equipment-only changes do not resolve a
blueprint, while one Creature mutation may carry both a separately validated
inventory change and retained equipment change before shared candidate
readback and atomic publication.

The frontend carries the exact physical source list as detached immutable
metadata, derives a slot-ordered editable target, validates it again at the
workspace boundary, and exposes only flag editing and removal in the Creature
property window. Item identity and slot assignment have no mutation control.
Exact source-backed equipment is `ACTIVE_NOW`; loose display metadata and all
unproven shapes remain visibly `PRESERVE_ONLY`. Applying the dialog
materializes the validated target without rewriting the immutable source used
by optimistic comparison.

The accepted bounded offline gate is six backend unit suites with `1760/1760`
assertions, the Area Update atomic-publication integration suite with `30/30`
assertions, nine focused frontend suites with `224/224` assertions, and passing
backend and frontend production builds. The frontend build retained only its
existing large-chunk advisory. The exact packet is
`output/proof/area-existing-creature-equip-item-list-offline-audit-2026-08-26/verification.json`.

This checkpoint does not admit new equipment, slot reassignment, arbitrary
UTI or item-property authoring, random equipment, or item-slot compatibility
rules. Browser Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN
runtime certification, all other incomplete Area capabilities, the successor
build-bound 99-tileset matrix, and independent PathConnect/WOK proof remain
open. No Docker engine, container, managed service, browser, capture, Toolset,
NWN, or mutation-test process was started for this slice; runtime reprofiling
remains deferred until source work settles and the external Docker failure
fingerprint changes.

## 120. Continued implementation checkpoint — 2026-08-26 (retained Creature `Tag`)

The source-closed retained Creature `Tag : CExoString` slice is now
implemented through the complete offline Area Update path. The backend parses
only one exact case-sensitive field on a type-`4` Creature struct, preserves
presence separately from an empty value, and accepts at most 32 UTF-16 code
units without U+0000. Empty and whitespace-containing values remain verbatim.
Missing, duplicate, aliased, wrong-case, wrongly typed, malformed, unchanged,
or stale storage fails closed and never authorizes materializing a new field.

Projection and replanning bind the mutation to the immutable Creature family,
source object ID, and zero-based native ordinal. The writer performs complete
expected-value CAS, replaces only the existing `Tag` field, preserves field
order and every unrelated GIT field, and keeps GIC byte-identical. One
Creature property mutation may carry `Tag`, `ItemList`, and `Equip_ItemList`
together before the existing whole-candidate readback and revision-fenced
ARE/GIT/GIC/IFO transaction publish the successor.

The frontend carries detached exact provenance through Area mapping, workspace
cloning, draft validation, and the Creature property window. The `Tag` input is
`ACTIVE_NOW` only for exact retained provenance; every unproven shape is
visible and disabled as `PRESERVE_ONLY`. The UI enforces the 32-code-unit
budget, Apply materializes the exact value without trimming, and immutable
source metadata remains available for optimistic comparison and Save/reopen.

The accepted bounded offline gate is nine backend unit suites with `1816/1816`
assertions, the Area Update atomic-publication integration suite with `31/31`
assertions, ten focused frontend suites with `237/237` assertions, and passing
backend and frontend production builds. The frontend build retained only its
existing large-chunk advisory. Capability catalog revision `2026-08-26.53`
keeps Creature authoring partial/blocked while replacing its obsolete generic
equipment blocker with exact remaining property and live-proof blockers. The
exact packet is
`output/proof/area-existing-creature-tag-offline-audit-2026-08-26/verification.json`.

This checkpoint does not activate any other Creature identity, localized
name, faction, conversation, statistics, class, feat, skill, script, variable,
arbitrary inventory/equipment, slot, or item-property control. Browser
Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN runtime behavior,
all other incomplete Area capabilities, the successor build-bound 99-tileset
matrix, and independent PathConnect/WOK proof remain open. No Docker engine,
container, managed service, browser, capture, Toolset, NWN, or mutation-test
process was started for this slice.

## 121. Continued implementation checkpoint — 2026-08-26 (retained Creature `FirstName`/`LastName`)

The source-closed retained Creature name slice is now implemented through the
complete offline Area Update path. The backend retains the exact
presence-sensitive `CExoLocString` pair and independently admits each member
only for the bounded inline language-`0` printable-ASCII profile. It performs
immutable expected-value comparison, applies `FirstName` before `LastName`,
preserves whitespace and empty values verbatim, changes no unrelated GIT
field, keeps the paired GIC byte-identical, and requires independent complete
candidate readback before the revision-fenced ARE/GIT/GIC/IFO transaction can
publish. One mutation may combine the names with exact `Tag`, `ItemList`, and
`Equip_ItemList` changes atomically.

The frontend carries a detached exact pair through HTTP validation, Area
mapping, workspace cloning, saved-draft validation, and the Creature property
window. `FirstName` and `LastName` receive separate `ACTIVE_NOW` or
`PRESERVE_ONLY` states. TLK-backed, multilingual, nonzero-language,
duplicated, explicit-empty-entry, non-ASCII, missing, malformed, stale, and
over-budget storage cannot authorize editing. Apply uses the current target
instead of reconstructing the old source text, so an exact edited name remains
stable after OK and reopen without trimming or empty-name fallback.

The accepted bounded offline gate is nine backend unit suites with
`1832/1832` assertions, the Area Update atomic-publication integration suite
with `32/32` assertions, nine focused frontend unit/regression suites with
`322/322` assertions, and passing backend and frontend production builds. The
frontend build retained only its existing large-chunk advisory. Capability
catalog revision `2026-08-26.54` keeps Creature authoring
`PARTIAL/BLOCKED` and records separate browser, native Toolset, and NWN proof
blockers.

This checkpoint does not activate TLK replacement, arbitrary code-page or
Unicode authoring, multilingual/gender-aware editing, duplicate entries,
random-name behavior, or any remaining Creature property family. Browser
Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN runtime
presentation, all other incomplete Area capabilities, the successor
build-bound 99-tileset matrix, and independent PathConnect/WOK proof remain
open. No Docker engine, container, managed service, watcher, browser, capture,
Toolset, NWN, or mutation-test process was started for this slice.

## 122. Continued implementation checkpoint — 2026-08-26 (retained Placeable `Faction` closure)

The previously source-closed retained Placeable `Faction : DWord` lane is now
fully verified offline rather than merely present in code. One exact
module-owned `repute.fac` is parsed as `FAC `/`V3.2`, both native lists and all
rows are validated fail-closed, and physical ordinals are bound to an immutable
catalog digest and count. The Area pipeline retains exact DWord provenance,
projects only a changed physical ID, independently replans the native source,
re-resolves the current complete catalog, changes only `Faction`, verifies the
whole candidate, and publishes through the existing revision-fenced
ARE/GIT/GIC/IFO transaction. The new integration also proves that GIC,
`repute.fac`, and IFO bytes remain identical.

The frontend keeps catalog and source provenance detached, renders names only
as derived display data, and edits numeric physical identity through the
Advanced selector. The saved-workspace boundary now rejects malformed or
missing catalogs, wrong family/ordinal, stale digest/count, absent or unknown
targets, mismatched names, and a retained numeric target without proof. A new
regression covers Apply+OK, a separate Cancel, another OK, reopen, and local
Save while demonstrating that the immutable expected ordinal remains
unchanged.

The accepted bounded offline gate is nine backend unit suites with
`1821/1821` assertions, the Area Update integration suite with `33/33`
assertions, eight frontend unit/regression suites with `385/385` assertions,
and passing backend and frontend production builds. The frontend build retained
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.55` keeps Placeable authoring `PARTIAL/BLOCKED` with explicit
remaining-property and browser/Toolset/NWN blockers.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Browser readback, exact-candidate Toolset
Save/Build/reopen, NWN behavior, all other incomplete Area capabilities, the
successor build-bound 99-tileset matrix, and independent PathConnect/WOK proof
remain open. No Docker engine, container, managed service, watcher, browser,
capture, Toolset, NWN, or mutation-test process was started for this slice.

## 123. Continued implementation checkpoint — 2026-08-26 (retained Placeable `PortraitId` closure)

The previously source-closed retained Placeable `PortraitId : Word` lane is
now fully verified offline rather than merely present in code. One exact
strongest module/ordered-HAK/vanilla `portraits.2da` supplies an ordered sparse
physical-row catalog. The Area pipeline retains the exact source Word plus
table digest and physical row count, projects only a changed supported row,
reparses the retained Placeable ordinal, re-resolves the current effective
table, changes only canonical `PortraitId`, verifies the complete candidate,
and publishes through the existing revision-fenced ARE/GIT/GIC/IFO
transaction. It never writes legacy fallback `Portrait : ResRef` or changes
renderer/catalog identity. The new integration proves paired GIC and IFO byte
identity.

The frontend keeps the catalog and immutable source provenance detached from
the editable numeric target. `portraitResRef` is always derived display data.
The saved-workspace boundary rejects malformed or missing catalogs, wrong
family/ordinal, stale digest/count, absent targets, unsupported sparse rows,
mismatched derived ResRefs, and unproven retained targets. A new regression
covers Apply+OK, a separate Cancel, another OK, reopen, and local Save while
demonstrating that immutable expected-value provenance remains unchanged.

The admitted table bound is now correctly `1..65,536` physical rows. This is
not a relaxed guess: immutable retail evidence proves a 944,115-byte vanilla
table with 16,001 physical rows, so the former 4,096 ceiling rejected valid
retail content. The accepted bounded offline gate is nine backend unit suites
with `1829/1829` assertions, the Area Update integration suite with `34/34`
assertions, eight frontend unit/regression suites with `396/396` assertions,
and passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.56` records exact Portrait evidence and blockers.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, portrait visual comparison, NWN behavior,
all other incomplete Area capabilities, the successor build-bound 99-tileset
matrix, and independent PathConnect/WOK proof remain open. No Docker engine,
container, managed service, watcher, browser, capture, Toolset, NWN, or
mutation-test process was started for this slice.

## 124. Continued implementation checkpoint — 2026-08-26 (retained Placeable `TemplateResRef` closure)

The source-closed retained Placeable `TemplateResRef : ResRef` lane is now
fully verified offline. The exact admitted profile remains one present native
ResRef with `1..16` lowercase `[a-z0-9_]` code units. Projection and planning
bind it to immutable Placeable family identity and zero-based source ordinal;
the writer performs expected-value comparison, changes only the existing
field, verifies the complete candidate, and publishes through the existing
revision-fenced ARE/GIT/GIC/IFO transaction. It never resolves or rewrites a
UTP and never aliases this field with renderer/catalog `SceneObject.resRef`.

The saved-workspace boundary now rejects the wrong family, a missing ordinal,
malformed immutable storage, a missing or malformed target, and a retained
target without exact source provenance. A new atomic-publication integration
proves paired GIC and IFO byte identity. A dedicated regression covers Apply
followed by OK, a separate Cancel, another OK, reopen, and local Save while
both renderer identity and immutable expected-value provenance remain
unchanged.

The accepted bounded offline gate is eight backend unit suites with
`1822/1822` assertions, the Area Update integration suite with `35/35`
assertions, eight frontend unit/regression suites with `414/414` assertions,
and passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.57` records the exact coverage and browser/Toolset/NWN blockers.
Mutation testing remains optional and was not run because there was no explicit
current-task opt-in.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, NWN behavior, all other incomplete Area
capabilities, the successor build-bound 99-tileset matrix, and independent
PathConnect/WOK proof remain open. No Docker engine, container, managed
service, watcher, browser, capture, Toolset, NWN, or mutation-test process was
started for this slice.

## 125. Continued implementation checkpoint — 2026-08-26 (retained Placeable `BodyBag` closure)

The source-closed retained Placeable `BodyBag : Byte` lane is now fully
verified offline through the current Area Update path. One exact strongest
module/ordered-HAK/vanilla `bodybag.2da` supplies a dense physical-row catalog
bound by source object key, layer, digest, byte size, and row count. Immutable
source provenance retains the canonical Byte and table identity; the editable
target is numeric `treasureModelRow`. Legacy guessed `treasureModel` strings
are not mutation identity.

The saved-workspace boundary rejects malformed or missing catalogs, wrong
family or missing source ordinal, stale digest/count, absent or unknown
numeric targets, and an unproven retained target. The new transaction
integration changes only the existing `BodyBag : Byte`, verifies the complete
candidate and receipt, and proves paired GIC and IFO byte identity. A dedicated
regression covers Apply followed by OK, a separate Cancel, another OK, reopen,
and local Save while immutable expected-value provenance remains unchanged.

The accepted bounded offline gate is nine backend unit suites with
`1833/1833` assertions, the Area Update integration suite with `36/36`
assertions, eight frontend unit/regression suites with `411/411` assertions,
and passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.58` records exact BodyBag coverage and browser/Toolset/NWN blockers.
Mutation testing remains optional and was not run.

This checkpoint does not prove destroyed-Placeable remains-model rendering or
complete the remaining Placeable property matrix. Fresh browser readback,
exact-candidate Toolset Save/Build/reopen, packed readback, NWN behavior, all
other incomplete Area capabilities, the successor build-bound 99-tileset
matrix, and independent PathConnect/WOK proof remain open. No Docker engine,
container, managed service, watcher, browser, capture, Toolset, NWN, or
mutation-test process was started for this slice.

## 126. Continued implementation checkpoint — 2026-08-26 (retained Placeable `TrapType` closure)

The source-closed retained Placeable `TrapType : Byte` lane is now fully
verified offline through the current Area Update path. One exact strongest
module/ordered-HAK/vanilla `traps.2da` supplies a dense physical-row catalog
bound by source object key, layer, digest, byte size, and row count. Immutable
source provenance retains the canonical Byte and table identity; the editable
target is numeric `trapTypeRow`. `SetDC`, `DetectDCMod`, and `DisarmDCMod` are
derived from the same selected row and are never written as GIT fields.

The saved-workspace boundary rejects malformed or missing catalogs, wrong
family or missing source ordinal, stale digest/count, absent or unknown
numeric targets, derived-column drift, and an unproven retained target. The
new transaction integration changes only the existing `TrapType : Byte`,
verifies the complete candidate and receipt, and proves paired GIC and IFO byte
identity. A dedicated regression covers Apply followed by OK, a separate
Cancel, another OK, reopen, and local Save while immutable expected-value
provenance remains unchanged.

The accepted bounded offline gate is nine backend unit suites with
`1849/1849` assertions, the Area Update integration suite with `37/37`
assertions, seven frontend unit/regression suites with `422/422` assertions,
and passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.59` records exact TrapType evidence and browser/Toolset/NWN
blockers. Mutation testing remains optional and was not run.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Fresh browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, NWN behavior, all other incomplete Area
capabilities, the successor build-bound 99-tileset matrix, and independent
PathConnect/WOK proof remain open. No Docker engine, container, managed
service, watcher, browser, capture, Chrome, Toolset, NWN, or mutation-test
process was started for this slice.

## 127. Continued implementation checkpoint — 2026-08-26 (retained Placeable `AnimationState` closure)

The source-closed retained Placeable `AnimationState : Byte` lane is now fully
verified offline through the current Area Update path. Immutable source
provenance retains exactly one native value in `{0,1,2}`; the independently
editable Advanced target uses the recovered frozen mapping `Closed`,
`Opened 1`, and `Opened 2`. This storage contract does not infer or claim NWN
animation playback behavior.

The saved-workspace boundary rejects the wrong family, a missing native
ordinal, malformed immutable storage, a missing or invalid target token, and a
retained target without source provenance. The new transaction integration
changes only the existing `AnimationState : Byte`, verifies the complete
candidate and receipt, and proves paired GIC and IFO byte identity. A dedicated
regression covers Apply followed by OK, a separate Cancel, another OK, reopen,
and local Save while immutable expected-value provenance remains unchanged.

The accepted bounded offline gate is seven backend unit suites with
`1801/1801` assertions, the Area Update integration suite with `38/38`
assertions, eight frontend unit/regression suites with `430/430` assertions,
and passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.60` records exact AnimationState evidence and consolidated
browser/Toolset/NWN Placeable-property blockers. Mutation testing remains
optional and was not run.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Fresh browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, NWN animation behavior, all other
incomplete Area capabilities, the successor build-bound 99-tileset matrix,
and independent PathConnect/WOK proof remain open. No Docker engine,
container, managed service, watcher, browser, capture, Chrome, Toolset, NWN,
or mutation-test process was started for this slice.

## 128. Continued implementation checkpoint — 2026-08-26 (retained Placeable `Conversation`/`Interruptable` closure)

The source-closed retained Placeable `Conversation : ResRef` and
`Interruptable : Byte` lanes are now fully verified offline through the
current Area Update path. Both fields are independently presence-sensitive.
An empty Conversation ResRef is a valid immutable source and target, while the
Advanced `noInterrupt` checkbox remains exactly the documented inverse view of
the native `Interruptable` Byte.

The saved-workspace boundary requires exact `aurora_git` Placeable family
identity and a zero-based native ordinal, then validates each source/target
pair independently. Wrong family, missing ordinal, malformed source, missing
or invalid target, and a retained target without its own provenance fail
closed. The transaction integration changes only the existing Conversation
and Interruptable fields, verifies the complete candidate and receipt, and
proves paired GIC and IFO byte identity. A dedicated regression covers Apply
followed by OK, a separate Cancel, another OK, reopen, and local Save while
both immutable expected values remain unchanged.

The accepted bounded offline gate is eight backend unit suites with
`1816/1816` assertions, the Area Update integration suite with `39/39`
assertions, eight frontend unit/regression suites with `453/453` assertions,
and passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.61` records exact Conversation/Interruptable evidence under the
consolidated browser/Toolset/NWN Placeable-property blockers. Mutation testing
remains optional and was not run.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Fresh browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, NWN conversation/interruption behavior,
all other incomplete Area capabilities, the successor build-bound 99-tileset
matrix, and independent PathConnect/WOK proof remain open. No Docker engine,
container, managed service, watcher, browser, capture, Chrome, Toolset, NWN,
or mutation-test process was started for this slice.

## 129. Continued implementation checkpoint — 2026-08-26 (retained Placeable `Static`/`Useable` closure)

The source-closed retained Placeable `Static : Byte` and `Useable : Byte`
lanes are now fully verified offline through the current Area Update path. The
fields remain independent and presence-sensitive. Presentation-only defaults
remain loadable when neither native member is proven, but cannot become
writable provenance.

The saved-workspace boundary requires exact `aurora_git` Placeable family
identity and a zero-based native ordinal, then validates each proven
source/target pair independently. Wrong family, missing ordinal, malformed
source, missing or invalid target, and a retained target without its own
provenance fail closed. The transaction integration changes one exact retained
Placeable from `Static=1, Useable=0` to `Static=0, Useable=1`, verifies the
complete candidate and receipt, and proves paired GIC and IFO byte identity. A
dedicated regression covers Apply followed by OK, a separate Cancel, another
OK, reopen, and local Save while both immutable source values remain unchanged.

The accepted bounded offline gate is seven backend unit suites with
`1801/1801` assertions, the Area Update integration suite with `40/40`
assertions, six frontend unit/regression files with `451/451` assertions, and
passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.62` records exact Static/Useable evidence under the consolidated
remaining-property and browser/Toolset/NWN blockers. Mutation testing remains
optional and was not run.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Fresh browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, NWN behavior, all other incomplete Area
capabilities, the successor build-bound 99-tileset matrix, and independent
PathConnect/WOK proof remain open. No Docker engine, container, managed
service, watcher, browser, capture, Chrome, Toolset, NWN, or mutation-test
process was started for this slice.

## 130. Continued implementation checkpoint — 2026-08-26 (retained Placeable `Plot`/`HasInventory` closure)

The source-closed retained Placeable `Plot : Byte` and `HasInventory : Byte`
lanes are now fully verified offline through the current Area Update path. The
fields remain independent and presence-sensitive. Presentation-only defaults
remain loadable when neither native member is proven, but cannot become
writable provenance. `HasInventory` remains only a capability flag and never
creates, removes, or rewrites `ItemList`.

The saved-workspace boundary requires exact `aurora_git` Placeable family
identity and a zero-based native ordinal, then validates each proven
source/target pair independently. Wrong family, missing ordinal, malformed
source, missing or invalid target, and a retained target without its own
provenance fail closed. The transaction integration changes one exact retained
Placeable from `Plot=0, HasInventory=0` to `Plot=1, HasInventory=1`, verifies the
complete candidate and receipt, and proves paired GIC and IFO byte identity. A
dedicated regression covers Apply followed by OK, a separate Cancel, another
OK, reopen, and local Save while both immutable source values remain unchanged
and no inventory collection is materialized.

The accepted bounded offline gate is seven backend unit suites with
`1801/1801` assertions, the Area Update integration suite with `41/41`
assertions, six frontend unit/regression files with `461/461` assertions, and
passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.63` records exact Plot/HasInventory evidence under the consolidated
remaining-property and browser/Toolset/NWN blockers. Mutation testing remains
optional and was not run.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Fresh browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, all other incomplete Area capabilities,
the successor build-bound 99-tileset matrix, and independent PathConnect/WOK
proof remain open. No NWN behavior claim is made for these storage flags. No
Docker engine, container, managed service, watcher, browser, capture, Chrome,
Toolset, NWN, or mutation-test process was started for this slice.

## 131. Continued implementation checkpoint — 2026-08-26 (retained Placeable durability/save `Byte` closure)

The source-closed retained Placeable `Hardness`, `Fort`, `Ref`, and `Will`
lanes are now fully verified offline through the current Area Update path. The
four native `Byte` fields remain independently presence-sensitive and are
restricted to integers in `0..255`. Presentation-only target values remain
loadable without source provenance but cannot become authored mutations.

The saved-workspace boundary requires exact `aurora_git` Placeable family
identity and a zero-based native ordinal, then validates a non-empty partial
source map containing only the four supported keys and an exact matching target
for every proven member. Unsupported keys, malformed maps, missing targets,
and invalid Byte values fail closed. The transaction integration changes one
exact retained Placeable from `Hardness=5, Fort=16, Ref=0, Will=0` to
`8, 20, 12, 10`, verifies the complete candidate and receipt, and proves
paired GIC and IFO byte identity. A dedicated regression covers Apply followed
by OK, a separate Cancel, another OK, reopen, and local Save while the
immutable source map remains unchanged.

The accepted bounded offline gate is seven backend unit suites with
`1801/1801` assertions, the Area Update integration suite with `42/42`
assertions, six frontend unit/regression files with `477/477` assertions, and
passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.64` records exact durability/save evidence under the consolidated
remaining-property and browser/Toolset/NWN blockers. Mutation testing remains
optional and was not run.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Fresh browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, all other incomplete Area capabilities,
the successor build-bound 99-tileset matrix, and independent PathConnect/WOK
proof remain open. No runtime combat claim is made. No Docker engine,
container, managed service, watcher, browser, capture, Chrome, Toolset, NWN,
or mutation-test process was started for this slice.

## 132. Continued implementation checkpoint — 2026-08-26 (retained Placeable `HP`/`CurrentHP` closure)

The source-closed retained Placeable `HP : Short` and `CurrentHP : Short` lane
is now fully verified offline through the current Area Update path. Only HP is
editable in the Toolset range `1..10000`. CurrentHP remains immutable source
provenance and is derived through the recovered signed quotient, Short
narrowing, and minimum-one rule.

The saved-workspace boundary requires exact `aurora_git` Placeable family
identity, a zero-based native ordinal, an exact two-member source pair, and an
independent valid HP target. Missing or extra source members, malformed Short
or Toolset ranges, wrong family/ordinal, and a missing target fail closed. The
transaction integration changes one exact retained Placeable from `HP=15,
CurrentHP=45` to `HP=30, CurrentHP=90`, verifies the complete candidate and
receipt, and proves paired GIC and IFO byte identity. A dedicated regression
covers Apply followed by OK, a separate Cancel, another OK, reopen, and local
Save while the immutable source pair remains unchanged and CurrentHP is never
an independent control.

The accepted bounded offline gate is seven backend unit suites with
`1801/1801` assertions, the Area Update integration suite with `43/43`
assertions, six frontend unit/regression files with `507/507` assertions, and
passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-26.64` already binds the shared durability/HP audit under the
consolidated remaining-property and browser/Toolset/NWN blockers. Mutation
testing remains optional and was not run.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Fresh browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, all other incomplete Area capabilities,
the successor build-bound 99-tileset matrix, and independent PathConnect/WOK
proof remain open. No Docker engine, container, managed service, watcher,
browser, capture, Chrome, Toolset, NWN, or mutation-test process was started
for this slice.

## 133. Continued implementation checkpoint — 2026-08-27 (retained Placeable paired-GIC editor `Comment` closure)

The source-closed retained Placeable editor `Comment : CExoString` lane is now
verified offline through the current Area Update path. The value belongs only
to the exact ordinal-paired GIC `Placeable List` entry, not the gameplay GIT
Placeable struct. Empty string is valid provenance and remains distinct from
absence. The product budget admits `0..4096` ECMAScript code units without NUL
and preserves them without trimming, normalization, case folding, or silent
truncation.

The saved-workspace boundary requires exact `aurora_git` Placeable family
identity and a zero-based native ordinal, then validates both immutable source
and explicit comments target. Presentation-only comments remain loadable when
the source is absent but cannot become a mutation. The transaction integration
changes only the existing paired GIC Comment, verifies complete candidate
readback and receipt accounting, and proves GIT and IFO byte identity. A
dedicated regression covers exact empty source provenance, multiline and
decomposed-Unicode target text, Apply followed by OK, a separate Cancel,
another OK, reopen, and local Save while the immutable source remains empty.

The accepted bounded offline gate is seven backend unit suites with
`1801/1801` assertions, the Area Update integration suite with `44/44`
assertions, six frontend unit/regression files with `497/497` assertions, and
passing backend and frontend production builds. The frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-27.65` binds the editor-comments audit under the consolidated
remaining-property and browser/Toolset/NWN blockers. Mutation testing remains
optional and was not run.

This checkpoint does not complete the remaining Placeable property matrix or
provide live certification. Fresh browser readback, exact-candidate Toolset
Save/Build/reopen, packed readback, all other incomplete Area capabilities,
the successor build-bound 99-tileset matrix, and independent PathConnect/WOK
proof remain open. The editor comment has no NWN runtime behavior claim. No
Docker engine, container, managed service, watcher, browser, capture, Chrome,
Toolset, NWN, or mutation-test process was started for this slice.

## 134. Continued implementation checkpoint — 2026-08-27 (retained Creature `Conversation` closure)

The source-closed retained Creature `Conversation : ResRef` lane is now
verified offline through the current Area Update path. The field is
presence-sensitive: a present empty ResRef remains distinct from absence.
Legacy uppercase source bytes remain admissible immutable comparison
provenance, while an edited target must already be empty or canonical lowercase
`[a-z0-9_]{1,16}`. The web boundary never trims, case-folds, truncates, or
synthesizes the value.

The saved-workspace boundary requires exact `aurora_git` Creature family
identity and a zero-based native ordinal. The dialog exposes Conversation as
`ACTIVE_NOW` only for exact present provenance, constrains the native 16-byte
budget, and leaves the adjacent `No Interrupt` control visibly
`PRESERVE_ONLY`. The reducer and final materializer both fail closed. The
transaction changes only exact `Conversation : ResRef`, supports combination
with Tag, names, `ItemList`, and `Equip_ItemList`, verifies complete candidate
readback and receipt accounting, and preserves the paired GIC and unrelated
resources according to the existing atomic publication contract. The frontend
regression covers Apply, OK, reopen, Cancel, and local Ctrl+S while immutable
uppercase source provenance remains unchanged.

The accepted bounded offline gate is nine backend unit suites with
`1871/1871` tests, the Area Update integration suite with `45/45` tests, ten
frontend unit/regression files with `479/479` tests, and passing backend and
frontend production builds. The frontend build retains only its existing
large-chunk advisory. Capability catalog revision `2026-08-27.66` binds the
new audit, tests, and explicit browser/Toolset/NWN blockers. Mutation testing
remains optional and was not run.

This checkpoint does not complete the remaining Creature property matrix or
provide live certification. Fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, packed readback, NWN conversation selection/runtime,
Creature `Interruptable`, all other incomplete Area capabilities, the
successor build-bound 99-tileset matrix, and independent PathConnect/WOK proof
remain open. No Docker engine or container command, managed service, watcher,
browser, capture, Chrome, Toolset, NWN, or mutation-test process was started
for this slice.

## 135. Continued implementation checkpoint — 2026-08-27 (retained Creature `Appearance_Type` closure)

The source-closed existing Creature `Appearance_Type : Word` lane is now
implemented and verified offline through the Area Update path. Exact source
storage, physical Creature ordinal, effective `appearance.2da` descriptor,
digest, row count, and source row remain immutable provenance. A target can be
selected only from the authenticated, bounded catalog for that exact table
identity; stale, malformed, non-admitted, absent, wrong-family, wrong-type, or
out-of-range inputs fail closed.

The frontend now loads that catalog through its port and facade, exposes the
selector only after admission, preserves the original source record across
Apply, OK, reopen, and local Save, and passes the admitted numeric target to
the shared renderer path. The final App regression found that the change
callback captured the pre-load catalog state and silently retained the source
row despite an enabled selector. The callback now depends on the current
catalog state, and the regression proves the complete `249 -> 52` flow. A
failed catalog load leaves the control disabled and preserve-only, displays a
bounded reason, and emits object-bound telemetry without table digest or
resource-key leakage.

The backend independently validates the effective table again during
compilation, writes only the exact Word member, verifies candidate readback,
and publishes through the existing revision-fenced transaction while retaining
the paired GIC and IFO bytes. The accepted bounded checks are `145/145` focused
backend Appearance/capability assertions, `1/1` exact atomic-publication
integration selection, `16/16` Creature dialog unit tests, `6/6` Creature
properties App regressions, and passing frontend TypeScript and backend Nest
builds. Capability catalog revision `2026-08-27.67` records the source audit,
implementation evidence, and live blockers. All checks ran sequentially with
one worker and a 1 GiB heap; mutation testing was not run.

This checkpoint does not complete the remaining Creature property matrix or
the full Areas program. Fresh browser Save/reopen and renderer capture,
exact-candidate Toolset Save/Build/reopen, packed readback, NWN runtime proof,
the other incomplete Area/object authoring capabilities, the successor
build-bound 99-tileset matrix, and independent PathConnect/WOK proof remain
open. No Docker engine or container command, managed service, watcher, browser,
capture, Chrome, Toolset, NWN, or mutation-test process was started for this
slice.

## 136. Continued implementation checkpoint — 2026-08-27 (retained Creature `Interruptable` closure)

The source-closed retained Creature `Interruptable : Byte` lane is now
implemented and verified offline through the Area Update transaction. The
retail Creature reader/writer and the `TdlgCreatureEdit.xbNoInterrupt`
load/save paths independently establish the exact inverse relation
`noInterrupt = Interruptable == 0`. Exact absence stays distinct from the
native reader default and remains preserve-only; the web path never creates,
aliases, coerces, or guesses this field.

Area detail, HTTP validation, scene mapping, detached source metadata, local
workspace persistence, cache identity, draft validation, projector, ordinal
planner, writer, candidate readback, and atomic publication now carry one
presence-sensitive `{present,value}` fact. The checkbox becomes `ACTIVE_NOW`
only for a retained type-4 `aurora_git` Creature with a non-negative immutable
ordinal and one exact present binary Byte. UI values use the native inverse
polarity, while the mutation remains a strict changed
`{expectedValue,value}` CAS pair. The writer replaces only the exact
case-sensitive `Interruptable` Byte and preserves all unrelated GIT fields and
the paired GIC/IFO bytes.

The accepted bounded evidence is `1937/1937` backend unit assertions,
`1/1` selected Area Update atomic-publication integration test, `505/505`
frontend unit/App-regression assertions, and passing backend and frontend
production builds. The regression covers Apply, OK, reopen, Cancel, and local
Ctrl+S while retaining immutable source Byte `1`; the candidate and transaction
tests prove target Byte `0`, complete readback, one Creature property receipt,
and unchanged GIC/IFO. Capability catalog revision `2026-08-27.68` binds the
audit, implementation tests, and explicit browser/Toolset/NWN blockers.
Mutation testing remained optional and was not run.

An initial general backend Jest invocation reached its configured 1 GiB heap
during full-project `ts-jest` analysis before executing a test. It was not
repeated and the heap was not increased; every accepted backend check used the
repository's isolated `test:unit:bounded` profile or the bounded integration
profile with one worker. No Docker engine or container command, managed
service, watcher, browser, capture, Chrome, Toolset, NWN, or mutation process
was started.

This checkpoint closes only the offline Creature `Interruptable` slice. Fresh
browser Save/reopen, exact-candidate Toolset Save/Build/reopen, packed readback,
and NWN interruption behavior remain required live release gates. The remaining
Creature/object authoring matrix, all other incomplete Area capabilities, the
successor build-bound 99-tileset matrix, and independent PathConnect/WOK proof
also remain open.

## 137. Continued implementation checkpoint — 2026-08-27 (retained Creature advanced binary flags closure)

The source-closed retained Creature `Disarmable`, `Plot`, `IsImmortal`,
`Lootable`, and `NoPermDeath` native `Byte` lanes are now implemented and
verified offline through the Area Update transaction. Primary Aurora
decompilation and the retail Toolset dialog establish direct checkbox polarity
for all five fields. Exact absence remains distinct from reader defaults and
stays preserve-only; the web path never creates, aliases, coerces, or guesses a
missing native field. Creature `BodyBag` and `DecayTime` remain outside this
slice because the Toolset models them as a Treasure Model catalog selection
and decay controls rather than another boolean checkbox pair.

Area detail, strict HTTP parsing, scene mapping, detached source cloning,
workspace validation, cache identity, projector, immutable-ordinal planner,
paired GIT/GIC writer, candidate readback, and atomic publication now carry one
complete presence-sensitive five-member source group. Each dialog control is
independently `ACTIVE_NOW` only for one exact present binary Byte on a retained
type-4 `aurora_git` Creature with a non-negative native ordinal. The reducer
and final Apply materializer both preserve the current value for absent,
malformed, or unproven provenance. A valid changed subset becomes exact
`{expectedValue,value}` CAS members, and the writer replaces only the requested
case-sensitive native fields without changing BodyBag, DecayTime, unrelated
GIT members, or the paired GIC/IFO bytes.

The accepted bounded evidence is seven backend unit suites with `1841/1841`
tests, the capability-catalog gate with `13/13` tests, the complete Area Update
integration suite with `48/48` tests, eight frontend unit files with `507/507`
tests, the Creature Workspace regression with `7/7` tests, and passing backend
and frontend production builds. The five-member integration changes
`1/0/0/1/0` to `0/1/1/0/1`, verifies the exact native Byte fields and full
candidate, and proves GIC/IFO byte identity. The frontend build retains only
its existing large-chunk advisory. Capability catalog revision
`2026-08-27.69` binds the audit and exact tests while keeping Creature
authoring partial and release-blocked. Mutation testing remained optional and
was not run.

This checkpoint closes only the offline five-flag slice. Fresh guarded browser
Save/reopen, exact-candidate Toolset Save/Build/reopen and packed readback, and
NWN runtime behavior remain required live release gates. The remaining
Creature/object property matrix, all other incomplete Area capabilities, the
successor build-bound 99-tileset matrix, and independent PathConnect/WOK proof
also remain open. No Docker engine or container command, managed service,
watcher, browser, capture, Chrome, Toolset, NWN, or mutation process was
started for this slice.

## 138. Continued implementation checkpoint — 2026-08-27 (retained Creature `BodyBag` and `DecayTime` offline closure)

The source-closed retained Creature death-remains lane is now implemented and
verified offline through the complete Area Update path. `BodyBag : Byte` is a
physical row ordinal from one exact effective `bodybag.2da`; it is not the
legacy guessed Body Bag boolean. `DecayTime : DWord` remains native
milliseconds, with web editing admitted only for exact whole-second values in
the Toolset range `5..32767`. Absence, malformed or wrong-type storage,
duplicate aliases, a noncanonical retained DWord, stale ordinals, catalog
drift, unknown rows, unchanged CAS pairs, and deletion collisions all fail
closed without synthesis, rounding, clamping, or defaulting.

The frontend carries detached immutable BodyBag catalog provenance and exact
DecayTime provenance through API validation, mapping, saved workspace drafts,
clone/history, Apply, OK, Cancel, reopen, and local Save. Treasure Model is a
numeric catalog selector and decay is a bounded whole-second input. They are
independently active only for a retained type-`4` `aurora_git` Creature and
current proven `Lootable=true`; toggling Lootable does not create, clear, or
rewrite either retained field. The backend projects changed pairs, reparses
their exact native fields, freshly resolves the catalog, writes only requested
GIT members, verifies the complete candidate, and publishes through the
existing revision-fenced ARE/GIT/GIC/IFO transaction.

Accepted bounded evidence comprises backend domain/parser `191/191`, projector
`483/483`, planner `353/353`, paired writer `837/837`, candidate compiler
`112/112`, capability catalog `13/13`, and the complete Area Update integration
profile `49/49`. The new integration case publishes one combined
`Lootable 0 -> 1`, `BodyBag 0 -> 3`, and `DecayTime 5000 -> 12000` mutation,
reads the exact native fields back, retains GIC and IFO byte-for-byte, and
returns `readbackStatus="verified"`. Frontend evidence includes the focused
implementation bundle `522/522`, Creature properties regression `8/8`, and a
final mapper/factory/dialog cross-check `136/136`. Backend Nest and frontend
TypeScript/Vite production builds pass. Capability catalog revision
`2026-08-27.70` binds the audit, implementation tests, and explicit live proof
blockers.

This checkpoint closes only offline retained storage authoring. Fresh guarded
browser Save/reopen, renderer-visible confirmation where applicable,
exact-candidate Toolset Save/Build/reopen and packed readback, and NWN
death-remains timing/model behavior remain release gates. The remaining
Creature/object property matrix, all other incomplete Area capabilities, the
successor build-bound 99-tileset matrix, and independent PathConnect/WOK proof
also remain open. All commands in this slice were sequential one-shot runs
with one worker and the repository 1 GiB heap cap where applicable. No Docker
engine or container command, managed service, watcher, browser, capture,
Chrome, Toolset, NWN, or mutation-test process was started.

## 139. Continued implementation checkpoint — 2026-08-27 (PathConnect central AUR-S07 evidence closure, live monitor gate missing)

The exact bounded `tms01:7` PathConnect candidate now has a complete central
runtime evidence route. AUR-S07 binds the immutable profile hash into the
one-time request, requires one responding NWN main window, captures a fresh
engine-log window across append/rotation/truncation, semantically binds the
physical MP4 metadata to the observation PID/StartTime and non-primary monitor,
records an explicit visual review, and assembles only a validator-accepted
packet. The new PathConnect assembler consumes that accepted central packet,
parses the exact positive/negative marker envelope, revalidates the unchanged
native positive/negative geometry, and invokes the existing differential
validator. It is an offline packet assembler, not another Toolset/NWN launcher,
observer, capture transport, or product-local adapter.

The immutable v4 runtime profile has SHA-256
`93d8f1e92163ee64f10166a0305f55e2c719b1dea32b28a7df4a8ec4a6b00e0f`;
the exact MOD remains
`3cb029d1260d0cfb67249569b9ee5b0b4ace5424cdc5eb232201f2d83b78ba3f`.
The central runner, profile-generator, and PathConnect assembler contract tests
pass sequentially. The MP4 adapter dry-run passes for a 10-second/12-fps
capture with the installed user-scoped portable ffmpeg binary, whose SHA-256 is
`57c56e369d5b4873b4d93fc1a1d833cb7cd8bc9325c14b05c34ce60b22842d8a`.
The v4 arm and engine-log baseline are durably written.

One central binary-bootstrap Toolset session opened the exact clean module, but
the only dispatch attempt stopped before `Test Module`: current Windows screen
enumeration contains only `\\.\DISPLAY1`, `primary=true`, while accepted proof
requires exactly one `primary=false` screen. The blocker packet is
`output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07-v4/execution/aur-s07-runtime-dispatch.blocker.json`.
There is no dispatch, handoff, runtime observation, MP4, or NWN process, and no
retry or monitor bypass was attempted. The responsive clean Toolset process is
left open under the explicit-close rule.

This checkpoint closes the missing offline evidence-assembly implementation,
not native PathConnect acceptance. PathConnect stays `0/44,664`,
`proofCompleteness=missing`, and `modelVisibility=not_tested` until the exact
same candidate completes live on a non-primary proof monitor. The remaining
object/Area authoring matrix, transactional release gates, browser Save/reopen,
99-tileset successor certification, and independent WOK proof also remain
open. No Docker engine/container, managed web service, watcher, browser, Chrome,
or mutation-test process was started.

## 140. Continued implementation checkpoint — 2026-08-27 (retained Creature `FactionID` offline closure)

The source-closed retained Creature faction lane is now implemented and
verified offline through the complete Area Update transaction. Primary Aurora
reader/writer evidence establishes canonical `FactionID : Word`; the reader's
legacy DWord compatibility does not authorize web normalization. The numeric
value is the zero-based physical ordinal of the exact module-owned
`repute.fac` `FactionList`. Missing, duplicated, wrong-case, wrong-type, stale,
out-of-range, or catalog-mismatched storage stays preserve-only and is never
synthesized, clamped, guessed, or selected by display label.

Area detail, strict HTTP validation, scene mapping, detached source metadata,
workspace validation, clone/history, cache identity, projector, immutable-
ordinal planner, paired GIT/GIC writer, candidate readback, and atomic
publication now carry one exact catalog-bound Creature faction CAS pair. The
dialog selector is active only for a retained type-`4` `aurora_git` Creature
with canonical Word storage and matching catalog provenance. Apply re-resolves
the exact row and derived name against the current catalog. A scene
normalization defect that could discard numeric `factionId` during an unrelated
advanced-property update was found and fixed; focused regression coverage now
proves the numeric identity survives that path.

Accepted bounded evidence comprises `1,998` backend assertions across the
domain, parser, projector, planner, writer, compiler, processing fingerprint,
snapshot, and atomic-publication integration; `550/550` focused frontend unit
assertions across nine files; and `9/9` Creature-properties Workspace
regressions covering Apply, OK, reopen, Cancel, and local Save with immutable
source CAS. The integration changes exact `FactionID : Word` `1 -> 2`, verifies
whole-candidate readback, and preserves `repute.fac`, GIC, and IFO. Backend Nest
and frontend TypeScript/Vite production builds pass; the frontend build retains
only its existing large-chunk advisory. Capability catalog revision
`2026-08-27.71` binds the audit, exact tests, and explicit live proof blockers;
its focused gate passes `13/13`.

This checkpoint closes only offline retained Creature faction authoring.
Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen and
packed GFF readback, and NWN faction behavior remain release gates. Creature
authoring therefore remains `partial` and `blocked`; the remaining Creature and
object property matrix, all other incomplete Area capabilities, the successor
build-bound 99-tileset matrix, and independent PathConnect/WOK proof also remain
open. All checks were sequential one-shot runs under the repository resource
caps. No Docker engine/container, service, watcher, browser, Chrome, Toolset
mutation, NWN run, capture, or mutation test was started for this slice.

## 141. Continued implementation checkpoint — 2026-08-27 (retained Creature `TemplateResRef` offline closure)

The source-closed retained Creature Blueprint ResRef lane is now implemented
and verified offline through the complete Area Update transaction. Primary
Aurora common/placed Creature reader and writer evidence establishes the exact
case-sensitive `TemplateResRef : ResRef` storage and the Toolset Advanced-tab
`Blueprint ResRef` control path. The admitted product profile is deliberately
narrow: exactly one present lowercase `[a-z0-9_]{1,16}` value. Missing, empty,
uppercase, duplicated, wrong-case, wrong-type, stale, or malformed storage is
preserve-only; the web implementation never relies on Aurora writer case
folding or guesses a UTC/catalog namespace relationship.

The backend now carries presence-sensitive storage through parsing, snapshot
cloning and process identity, projects one changed expected/target CAS pair,
reparses the immutable type-`4` Creature ordinal, replaces only the canonical
native field, verifies the complete candidate, and publishes atomically. The
frontend validates the strict HTTP payload, detaches immutable provenance,
maps an independent Advanced target, validates saved workspace state, clones
history, exposes `ACTIVE_NOW` only for exact provenance, and guards both live
editing and final Apply. `SceneObject.resRef` remains renderer identity and is
explicitly not rewritten when the native Creature `TemplateResRef` changes.

Accepted bounded evidence comprises eight backend unit suites with
`2,014/2,014` tests, the capability-catalog gate with `13/13`, the complete
Area Update integration profile with `51/51`, and nine frontend focused
unit/regression files with `577/577`. The integration changes exact
`TemplateResRef : ResRef` `nw_guard -> nw_guard_alt`, verifies the expected ARE
candidate publication, keeps GIC/IFO byte-identical, and reports verified
readback. Backend Nest and frontend TypeScript/Vite production builds pass;
the frontend build retains only its existing large-chunk advisory. Capability
catalog revision `2026-08-27.72` binds the source audit, exact tests, and three
explicit live proof blockers.

This checkpoint closes only offline retained Creature `TemplateResRef`
authoring. Fresh guarded browser Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed GFF readback, and NWN runtime verification remain
release gates. Creature authoring therefore remains `partial` and `blocked`;
the remaining Creature/object property matrix, all other incomplete Area
capabilities, the successor build-bound 99-tileset matrix, and independent
PathConnect/WOK proof remain open. All commands were sequential one-shot runs
under repository resource caps. No Docker engine/container, service, watcher,
browser, Chrome, Toolset mutation, NWN run, capture, or mutation test was
started for this slice.

## 142. Continued implementation checkpoint — 2026-08-27 (retained Creature `Subrace` / `Deity` offline closure)

The source-closed retained Creature `Subrace` and `Deity` lane is now
implemented and verified offline through the complete Area Update transaction.
Primary Aurora common/placed Creature reader and writer evidence establishes
the two exact case-sensitive `CExoString` fields and their independent Toolset
`Special` controls. The bounded web profile admits the empty string or at most
256 printable ASCII code units. Missing, duplicated, wrong-case, wrong-type,
localized legacy, non-ASCII, control-character, over-budget, or stale storage
remains preserve-only; no legacy conversion, truncation, normalization, or
guessed encoding behavior is introduced.

The backend now carries the exact presence-sensitive pair through parsing,
snapshot cloning and process identity, projects only changed members, reparses
the immutable type-`4` Creature ordinal, performs full-value CAS, replaces only
the requested native fields, verifies the complete candidate, and publishes
atomically. The frontend validates and detaches the HTTP group, creates
per-field immutable provenance, validates persisted workspace state, clones
history, exposes independent `ACTIVE_NOW/PRESERVE_ONLY` statuses, and guards
both live draft reduction and final Apply. Loose Creature metadata remains
presentation-only and cannot authorize a write.

Accepted bounded evidence comprises nine backend unit suites with
`2,036/2,036` assertions, the complete Area Update integration profile with
`52/52`, and nine focused frontend unit/regression files with `586/586`.
Apply/OK/reopen/local-Save regression changes `Moon Elf -> Sun Elf` and
`Mystra -> Selune` while retaining immutable source CAS. Atomic integration
changes `Subrace` and `Deity`, verifies persisted readback and the expected ARE
candidate publication, and preserves GIC plus module IFO byte-for-byte.
Backend Nest and frontend TypeScript/Vite production builds pass; the frontend
retains only its existing large-chunk advisory. Capability catalog revision
`2026-08-27.73` binds the audit, exact tests, and explicit live proof blockers.

This checkpoint closes only offline retained Creature `Subrace`/`Deity`
authoring. Fresh guarded browser Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed GFF readback, and NWN runtime verification remain
release gates. Creature authoring remains `partial` and `blocked`; the
remaining Creature/object property matrix, all other incomplete Area
capabilities, the successor build-bound 99-tileset matrix, and independent
PathConnect/WOK proof remain open. All commands were sequential one-shot runs
under repository resource caps. No Docker engine/container command, service,
watcher, browser, Chrome, Toolset mutation, NWN run, capture, GPL source, or
mutation test was used for this slice.

## 143. Continued implementation checkpoint — 2026-08-27 (retained Creature `Gender` offline transaction/regression closure)

The source-closed retained Creature `Gender : Byte` lane is now implemented
and verified offline through the complete Area Update transaction. Primary
Aurora common/placed Creature reader and writer evidence establishes the exact
case-sensitive native Byte field. Independent Toolset form and decompilation
evidence establishes that its stored value is the physical row ordinal of the
one effective whole `gender.2da`, selected through module, ordered-HAK, then
vanilla precedence. The web path therefore never treats English labels or the
retail row order as module authority and never row-merges weaker tables.

Area detail, strict HTTP validation, effective-table catalog resolution,
snapshot mapping, detached immutable frontend provenance, workspace
validation, clone/history, selector admission, reducer/materialization,
projection, immutable-ordinal CAS planning, fresh candidate catalog
revalidation, Byte-only paired writer, whole-candidate readback, and atomic
ARE/GIT/GIC/IFO publication now carry the exact numeric identity. A regression
exposed that scene normalization did not explicitly materialize `genderId` on
local-draft reload. The normalizer now preserves only integer values in the
native unsigned-Byte range `0..255`, rejects malformed values, includes the
optional-field presence in its equality decision, and remains idempotent.

Accepted bounded evidence comprises four backend focused unit suites with
`48/48` assertions, including capability catalog revision `2026-08-27.74`;
the complete Area Update atomic-publication integration file with `53/53`;
six focused frontend unit files with `445/445`; the full scene-normalization
file with `37/37`; and the full Creature-properties Workspace regression file
with `12/12`. The integration changes exact `Gender : Byte` `4 -> 0`, verifies
whole-candidate readback and changed GIT, and preserves paired GIC plus module
IFO byte-for-byte. The Workspace regression proves Apply, OK, reopen, and
Ctrl+S local Save retain target `genderId=0`, display `Male`, and immutable
source value/row `4`. Backend Nest and frontend TypeScript/Vite production
builds pass; the frontend build retains only its existing large-chunk advisory.

This checkpoint closes only offline retained Creature Gender authoring. The
Vitest Workspace flow is not accepted guarded-browser proof. Fresh guarded
browser Save/reopen and renderer capture, exact-candidate Toolset
Save/Build/reopen with packed GFF readback, and NWN runtime inspection remain
independent release gates. Current live-proof preflight still exposes only one
`1920x1080` screen (`DISPLAY1`, `primary=true`), while native PathConnect proof
requires a non-primary proof screen; no bypass or retry was attempted. The
host had `3.18 GiB` free physical memory at the initial test preflight and
`4.88 GiB` after the bounded checks, so no service, browser, or capture lane
was started. Creature authoring remains partial; the remaining Creature/object
property matrix, all other incomplete Area capabilities, the successor
build-bound 99-tileset matrix, and independent PathConnect/WOK proof remain
open. All commands were sequential one-shot runs under repository resource
caps. No Docker engine/container command, managed service, watcher, browser,
Chrome, Toolset mutation, NWN run, capture, GPL source, or mutation test was
used for this slice.

## 144. Continued implementation checkpoint — 2026-08-27 (retained Creature script ResRefs offline closure)

The source-closed retained Creature script-event lane is now implemented and
verified offline through the complete Area Update transaction. Primary Aurora
common/placed Creature reader and writer evidence establishes thirteen exact,
case-sensitive type-`4` GIT `ResRef` fields. Each member is independently
presence-sensitive. Present empty values remain editable, while missing,
duplicated, aliased, wrong-case, wrong-type, malformed, or stale fields remain
preserve-only. New targets must be empty or canonical lowercase ASCII matching
`[a-z0-9_]{1,16}`; the web path does not rely on the native writer's ASCII
case-folding side effect.

Backend detail parsing, snapshot cloning, process identity, projection,
immutable ordinal planning, full-value CAS, paired GIT/GIC writing, complete
candidate readback, and revision-fenced ARE/GIT/GIC/IFO publication now carry
the exact member set. The frontend validates the strict thirteen-member HTTP
group, maps present fields to detached immutable per-slot provenance,
validates and clones saved workspace/history state, renders an independent
`ACTIVE_NOW/PRESERVE_ONLY` status for every input, and guards both live draft
reduction and final Apply. A full Workspace regression changes authorized
Heartbeat and Spawn targets, preserves an unproven Blocked presentation value,
then proves Apply, OK, reopen, and Ctrl+S local Save retain the target values
and immutable source CAS.

Focused backend domain/parser/projector/writer/compiler/integration evidence
is green. The complete Creature dialog file passes `30/30`, the complete
Creature Workspace regression file passes `13/13`, and the capability catalog
passes `13/13`. Backend Nest and frontend TypeScript/Vite production builds
pass; the frontend retains only its existing large-chunk advisory. Capability
catalog revision `2026-08-27.75` binds the exact domain test, source audit,
existing full-flow frontend regression reference, and three explicit live
proof blockers without increasing the catalog's 64-test-reference budget.

This checkpoint closes only offline mutation of existing retained Creature
script `ResRef` fields. Adding or removing an absent native field remains
outside the admitted writer profile. Fresh guarded browser Save/reopen,
exact-candidate Toolset Save/Build/reopen with packed GFF readback, and NWN
event dispatch remain independent release gates. Creature authoring remains
`partial` and `blocked`; the remaining Creature/object property matrix, all
other incomplete Area capabilities, the successor build-bound 99-tileset
matrix, and independent PathConnect/WOK proof remain open. All commands were
sequential one-shot runs under repository resource caps. No Docker
engine/container command, service, watcher, browser, Chrome, Toolset mutation,
NWN run, capture, GPL source, or mutation test was used for this slice.

## 145. Continued implementation checkpoint — 2026-08-27 (retained Creature `ChallengeRating` offline closure)

The source-closed retained Creature `ChallengeRating : Float` lane is now
implemented through the complete Area Update transaction. Immutable Aurora
common/placed Creature reader and writer evidence establishes the exact
case-sensitive type-id-`8` GFF field, its common Creature storage, and its
type-`4` placed-Creature ownership. The web profile admits only one existing
canonical field, never infers authority from the palette missing-field default,
and never creates or removes native storage.

Backend domain validation normalizes targets once to IEEE-754 binary32 and
rejects non-finite, negative, negative-zero, or over-budget values. Exact GIT
parsing, snapshot cloning, process identity, draft projection, immutable
ordinal planning, Float-only paired writing, candidate compilation/readback,
and atomic ARE/GIT/GIC/IFO publication carry the full-value CAS while
preserving GIC, IFO, and sibling GIT fields. Frontend HTTP validation, detached
scene/workspace/history state, provenance reducer and final materialization,
both Basic and Advanced controls, Apply/OK/reopen/local-Save regression, and
production build are green. The adjacent `CRAdjust` control is visibly
`PRESERVE_ONLY` and disabled because its signed Toolset semantics are not
source-closed.

Focused evidence currently comprises `60` backend assertions across domain,
parser, snapshot/cache, projector, planner, writer, candidate compiler,
atomic-publication integration, and capability catalog, plus `34` frontend
assertions across domain, HTTP, mapper, workspace, clone, provenance, dialog,
and full Workspace regression. Backend Nest and frontend TypeScript/Vite
production builds pass; the frontend retains only its existing large-chunk
advisory. Capability catalog revision `2026-08-27.76` binds the exact domain
test and source audit while preserving the row's 64-test-reference budget.

This checkpoint closes only offline mutation of the exact retained
`ChallengeRating` Float. Fresh guarded browser Save/reopen, exact-candidate
Toolset Save/Build/reopen with packed GFF readback, and NWN inspection remain
independent release gates. Creature authoring remains `partial` and `blocked`;
the remaining Creature/object property matrix, all other incomplete Area
capabilities, the successor build-bound 99-tileset matrix, and independent
PathConnect/WOK proof remain open. Every command was a sequential bounded
one-shot run. No Docker engine/container command, service, watcher, browser,
Chrome, Toolset/NWN process, capture, mutation test, xoreos source, or other GPL
source was used for this slice.

## 146. Continued implementation checkpoint — 2026-08-28 (retained Creature `NaturalAC` offline closure)

The source-closed retained Creature `NaturalAC : Byte` lane is now implemented
through the complete Area Update transaction. Primary Aurora common/placed
Creature reader and writer evidence establishes one exact case-sensitive
type-id-`0` GFF field on type-`4` placed Creatures. The native editor accepts a
wider `0..1000` text interval and then narrows the result into Byte storage;
the web contract intentionally admits only the lossless serialized `0..255`
domain and never reproduces wraparound.

Exact retained storage is independently presence-sensitive. Missing,
duplicated, wrong-case, wrong-type, malformed, or stale fields remain visibly
`PRESERVE_ONLY`; new and seed Creature drafts remain authorable within the same
Byte bound without claiming retained provenance. HTTP validation, detached
scene/workspace/history state, dialog gating, reducer and final Apply, exact
GIT extraction, cache identity, draft projection, ordinal CAS planning,
Byte-only field replacement, complete candidate readback, and revision-fenced
atomic publication carry the same contract while preserving GIC/IFO and every
unrelated GIT member. Derived Base AC, Dexterity Bonus, Size Modifier, and
Total AC stay disabled and preserve-only.

Final accepted offline gates are `2,116/2,116` assertions across nine bounded
backend unit suites, `57/57` assertions in the complete Area Update integration
suite, `656/656` assertions across eight focused frontend unit/regression
files, and passing backend/frontend production builds. Capability catalog
revision `2026-08-28.78` binds the audit, direct backend/frontend domain tests,
and explicit browser, Toolset, and NWN blockers while preserving the
64-test-reference budget.

This checkpoint closes only offline mutation of exact retained `NaturalAC`
plus bounded new/seed draft authoring. Fresh guarded browser Save/reopen,
exact-candidate Toolset Save/Build/reopen with packed GFF readback, and NWN
inspection remain independent release gates. Creature authoring remains
`partial` and `blocked`; arbitrary Creature-template Create, remaining
Creature/object properties, the 99-tileset Add/Render matrix, and independent
PathConnect/WOK proof remain open. Every command was a sequential bounded
one-shot run. No Docker engine/container command, managed service, watcher,
browser, Chrome, capture, Toolset/NWN process, mutation test, xoreos source, or
other GPL source was used for this slice.

## 147. Continued implementation checkpoint — 2026-08-28 (retained Creature saving-throw bonus offline closure)

The source-closed retained Creature `fortbonus`, `refbonus`, and `willbonus`
`Short` lane is implemented through the complete Area Update transaction.
Primary Aurora reader/writer evidence and bounded static Toolset disassembly
establish the exact lowercase labels, type-id `3`, common Creature offsets,
dialog materialization, native save order (`reflex`, `will`, `fortitude`), and
inclusive UI interval `0..250`. Base saves, ability modifiers, totals,
progression, feats, effects, and runtime calculations are not admitted.

Each native member is independently presence-sensitive. Missing, duplicated,
wrong-case, wrong-type, out-of-range, malformed, or stale fields remain
visibly `PRESERVE_ONLY`; new/seed targets stay bounded but do not acquire
retained-source authority. Strict HTTP/workspace/history state, per-row dialog
gating, guarded reducer and final Apply, exact GIT extraction, cache identity,
draft projection, ordinal CAS planning, native-order Short replacement,
complete candidate readback, and revision-fenced atomic publication preserve
GIC/IFO and every unrelated GIT member. Apply, OK, reopen, and Ctrl+S local
Save are covered by the complete Creature regression.

Final accepted offline gates are `2,133/2,133` assertions across nine bounded
backend unit suites, `58/58` assertions in the complete Area Update integration
suite, `671/671` assertions across eight focused frontend unit/regression
files, and passing backend/frontend production builds. Capability catalog
revision `2026-08-28.79` binds the exact audit and direct domain tests while
preserving the 64-test-reference budget. Statistics live proof is consolidated
into explicit browser, Toolset, and NWN blockers.

This checkpoint closes only offline mutation of exact retained saving-throw
bonus Shorts plus bounded new/seed draft authoring. Fresh guarded browser
Save/reopen, exact-candidate Toolset Save/Build/reopen with packed GFF readback,
and NWN inspection remain independent release gates. Creature authoring stays
`partial` and `blocked`; arbitrary Creature-template Create, remaining
Creature/object properties, the 99-tileset Add/Render matrix, and independent
PathConnect/WOK proof remain open. Every command was a sequential bounded
one-shot run. No Docker engine/container command, managed service, watcher,
browser, Chrome, capture, Toolset/NWN process, mutation test, xoreos source, or
other GPL source was used.

## 148. Continued implementation checkpoint — 2026-08-28 (retained Creature alignment offline closure)

The source-closed retained Creature `GoodEvil : Byte` plus
`LawfulChaotic : Byte` lane is implemented through the complete Area Update
transaction. Primary Aurora reader/writer evidence proves exact case-sensitive
storage on placed type-`4` Creatures. Static retail Toolset RTTI and bounded
disassembly prove one coupled alignment selector and the complete nine-label
mapping over axis values `{0, 50, 100}`.

Both native members must be present, canonical, and owned by the same
immutable ordinal before the retained selector becomes `ACTIVE_NOW`. Partial,
absent, duplicated, wrong-case, wrong-type, intermediate legacy, malformed,
or stale storage remains `PRESERVE_ONLY`; the web editor never creates,
removes, or normalizes the pair. Strict HTTP/workspace/history state, detached
scene provenance, one centralized label map, visible dialog gating, guarded
reducer and final materialization, Apply/OK/reopen/local-Save, exact GFF
extraction, cache identity, draft projection, full-pair CAS planning,
two-Byte-only writing, complete candidate readback, and revision-fenced atomic
publication preserve GIC/IFO and every unrelated GIT field.

Final accepted offline gates are `2,151/2,151` assertions across nine bounded
backend unit suites, `59/59` assertions in the complete Area Update integration
suite, `688/688` assertions across eight focused frontend unit/regression
files, `13/13` capability-catalog assertions, and passing backend/frontend
production builds. Capability catalog revision `2026-08-28.80` binds the
alignment audit, direct domain tests, and explicit browser, Toolset, and NWN
release blockers while retaining the 64-test-reference budget.

The resource diagnosis is also closed: the ordinary backend `ts-jest` config
accumulated type-checking state until the enforced 1 GB heap cap. Two such
attempts terminated without starting services. Subsequent verification used
the isolated one-worker bounded config and one process per file, releasing
memory between suites. No Docker command, managed service, watcher, browser,
capture, live Toolset/NWN process, or mutation test was started.

This checkpoint closes only offline mutation of the exact retained canonical
alignment pair plus existing new/seed label selection. Fresh guarded browser
Save/reopen, exact-candidate Toolset Save/Build/reopen with packed GFF readback,
and NWN inspection remain independent release gates. Creature authoring stays
`partial` and `blocked`; arbitrary Creature-template Create, remaining
Creature/object properties, the complete 99-tileset Add/Render matrix, and
independent PathConnect/WOK proof remain open.

## 149. Continued implementation checkpoint — 2026-08-28 (retained Creature `PortraitId` source closure and parity correction)

Primary Aurora evidence now closes the existing type-`4` Creature
`PortraitId : Word` lane. The common Creature reader prefers the exact
canonical Word and consults legacy `Portrait : ResRef` only when that Word is
absent; the common writer emits only canonical `PortraitId`. The placed
Creature lineage calls those common routines, and the paired GIC does not own
the field. The physical `portraits.2da` row is persistence identity while
`BaseResRef` is derived presentation.

The shared Toolset Portrait dialog provides the missing admission rule. It
receives the Creature's retained Portrait, Gender, and Race; reads exact
`Sex`, `Race`, `Plot`, and `BaseResRef` columns; stores each accepted physical
row as list item data; requires non-plot rows; and maps current Race `4` to
portrait Race `6` or `1`. The continued audit found one earlier implementation
gap: for every current Creature Race above `6`, the native dialog replaces the
Sex filter with physical Sex row `4` before it populates the list. Backend and
frontend shared selectors and their tests now encode this rule instead of
assuming `Sex == Gender` for all races.

The additive contract now binds exact canonical storage, immutable Gender/Race
selector context, strongest complete module/ordered-HAK/vanilla table identity,
sparse physical rows, atomic numeric `portraitId` plus derived
`portraitResRef`, and an exact changed-row CAS. A simultaneous Gender and
Portrait change fails closed. Planning reparses the immutable ordinal and
native context, compilation independently re-resolves and revalidates the
current table, and the writer replaces only the canonical Word while
preserving legacy `Portrait`, every sibling GIT field, paired GIC, ARE, and
IFO. Capability catalog revision `2026-08-28.82` records the direct tests,
source audit, and explicit browser/Toolset/NWN blockers.

The lane is now verified offline against the exact worktree. Both production
builds passed under the repository 1 GiB Node limit. Backend verification
passed 2,256 focused assertions, including the complete 60-test Area Update
integration suite; frontend verification passed 679 focused assertions,
including the complete 17-test Creature-properties Workspace regression suite.
That regression proves selection, Apply, close/reopen, and local Save while
retaining the immutable source selector/table CAS. The integration proves the
canonical Word change, unchanged Gender/Race, byte-identical GIC/IFO, and
verified readback.

Fresh guarded browser readback, native Toolset Save/Build/reopen with packed
GFF readback, portrait visual comparison, and NWN inspection remain separate
release gates. The full Area goal also still requires the remaining
object/property matrix, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK evidence. No Docker command, container, service,
watcher, browser, capture, live Toolset/NWN process, GPL source, or mutation
test was used for this checkpoint.

## 150. Continued implementation checkpoint — 2026-08-28 (retained Creature coupled hit-point closure)

Primary Aurora reader/writer, placed-Creature, Toolset RTTI, and bounded
disassembly evidence now closes the offline semantics for retained Creature
`HitPoints`, `CurrentHitPoints`, and `MaxHitPoints` `Short` fields. The native
load path takes Base HP from `HitPoints`, initializes Current HP from that base,
and derives Max HP from class levels, effective Constitution, and feat row 40.
The persisted Current/Max members remain immutable source CAS values rather
than independent editable controls. The resulting audit is recorded in
`backend/docs/aurora-reverse/area-existing-creature-hit-points-audit-v1-2026-08-28.md`.

The additive contract and both domain layers now share the exact signed
calculation: no more than eight class-level entries and 180 total levels,
effective Constitution from base `Con` plus the selected `racialtypes.2da`
`ConAdjust`, signed truncating ability modifier, the native minimum Base HP,
ordinary Max HP floor, and the row-40 feat bonus. Negative hit-point bonuses
are retained rather than clamped. Base HP and base Constitution form one
coupled edit; Hit Point Bonuses, Current HP, and Max HP are derived and
read-only. A retained Creature becomes editable only when the full canonical
triplet and every dependency have exact, self-consistent provenance.

The complete offline path is implemented through strict HTTP parsing and
cloning, scene mapping, detached workspace history, dialog gating, guarded
reduction/materialization, full source and dependency CAS, effective
module/ordered-HAK/vanilla `racialtypes.2da` resolution, fresh compiler
admission, exact ordinal planning, canonical GIT replacement, complete
candidate readback, and revision-fenced atomic publication. The integration
test proves the coupled `HitPoints=25`, `CurrentHitPoints=20`,
`MaxHitPoints=35`, and `Con=14` candidate while GIC and IFO remain
byte-identical.

Accepted offline gates are `2,118/2,118` assertions across eight bounded HP
backend suites, `61/61` assertions in the complete Area Update integration
suite, `708/708` assertions across nine focused frontend unit/regression files,
`13/13` capability-catalog assertions, and passing backend/frontend production
builds. Capability catalog revision `2026-08-28.83` binds the direct tests,
source audit, and explicit browser, Toolset, and NWN release blockers.

This checkpoint closes only the offline retained-Creature HP/Con slice. Fresh
guarded browser readback, exact-candidate Toolset Save/Build/reopen with packed
GFF readback, and NWN runtime inspection remain separate release gates.
Creature authoring remains `partial` and `blocked`; arbitrary Creature-template
Create, the remaining object/property matrix, complete 99-tileset Add/Render
certification, and independent PathConnect/WOK evidence remain open. All work
used sequential bounded one-shot processes. No Docker command, container,
service, watcher, browser, Chrome, capture, live Toolset/NWN process, mutation
test, xoreos source, or other GPL source was used.

## 151. Continued implementation checkpoint — 2026-08-28 (retained Creature `PerceptionRange` offline closure)

Primary Aurora common Creature reader/writer evidence, placed-Creature
lineage, frozen Toolset RCDATA/disassembly, retail `ranges.2da`, and English
plus Polish TLK evidence now close the retained type-`4` Creature
`PerceptionRange : Byte` semantics. The Toolset admits only physical rows
`8`, `9`, `10`, and `11`, reads their `Name` StringRefs, stores the row ordinal
as ComboBox item data, and writes that item data unchanged. The old web labels
`Near`, `Far`, and `Infinite` are not persistence authority and have been
removed from this retained selector.

The additive contract is implemented end to end: exact presence/type/value,
strongest whole module/ordered-HAK/vanilla table identity, immutable digest and
row count, authenticated catalog transport, detached scene/workspace/history
state, numeric `advancedSettings.perceptionRangeId`, guarded reduction,
fresh-catalog admission, ordinal reparse, Byte-only compare-and-swap, complete
candidate readback, and revision-fenced atomic publication. Missing, malformed,
unbound, out-of-selector, stale, or duplicate state remains `PRESERVE_ONLY`.
Filtered catalog searches recover the retained and selected exact rows instead
of incorrectly treating a valid filtered page as stale.

The new regression covers catalog load, `Default (11) -> Medium (9)`, Apply,
OK, reopen, and local Save while retaining immutable source CAS value `11`.
It found and closed a stale React callback that had captured the initial null
catalog and silently rejected the selection. Backend focused verification
passed the effective-table, storage, admission, parser, projector, planner,
writer, repository, HTTP/service, and capability-catalog gates; frontend
domain, HTTP, mapping, workspace, dialog, and regression gates passed. Both
production builds passed. Capability catalog revision `2026-08-28.84` binds
the direct tests, this audit, and explicit browser/Toolset/NWN blockers.

This checkpoint closes only the bounded offline retained-Creature
PerceptionRange slice. Fresh guarded browser readback, exact-candidate Toolset
Save/Build/reopen with packed GFF readback, and NWN runtime inspection remain
separate release gates. Creature authoring stays `partial` and `blocked`;
`WalkRate`, arbitrary Creature-template Create, the remaining object/property
matrix, complete 99-tileset Add/Render certification, and independent
PathConnect/WOK evidence remain open.

All intentional verification used sequential bounded one-shot processes. One
frontend command unexpectedly expanded to the whole unit directory and was
immediately terminated by its owner; no process was left running. No Docker
command, container, service, watcher, browser, Chrome, capture, live
Toolset/NWN process, mutation test, xoreos source, or other GPL source was
used.

## 152. Continued implementation checkpoint — 2026-08-28 (retained Creature `WalkRate` offline implementation)

Primary Aurora common Creature reader/writer evidence, placed-Creature
lineage, frozen Toolset disassembly, and the effective `creaturespeed.2da`
contract close the offline semantics for retained type-`4` Creature
`WalkRate : Int`. The native selector omits physical row `0`, presents every
complete positive row in physical order, stores that row ordinal as ComboBox
item data, and persists the selected ordinal. Missing `WalkRate` may still
produce a presentation fallback through Appearance `MOVERATE`, but that
derived value is never treated as editable native storage.

The additive contract is implemented across the complete Area Update path:
strict presence/type/value parsing, strongest whole module/ordered-HAK/vanilla
table resolution, exact digest and row-count binding, authenticated catalog
transport, detached scene/workspace/history state, numeric
`advancedSettings.walkRateId`, searchable dialog selection, guarded reduction,
fresh-catalog admission, immutable-ordinal planning, Int-only compare-and-swap,
candidate readback, and revision-fenced atomic publication. Missing,
malformed, duplicated, wrong-case, wrong-type, unbound, row-zero, stale, or
holed-table state remains `PRESERVE_ONLY`. New UTC serialization now has a
direct regression assertion that `WalkRate` is emitted as GFF `Int`.

Safe verification passed `738/738` focused frontend assertions and independent
backend/frontend source typechecks. Each command was a sequential one-shot
process with one worker or a 1 GiB heap ceiling, and no repository Node process
or listening development port remained afterward. The ordinary backend Jest
lane was not repeated: two earlier exact attempts exhausted its enforced 1 GiB
heap before executing assertions. Consequently the new backend unit and Area
Update integration assertions still require a resource-safe runner before this
slice can claim complete offline verification. Capability catalog revision
`2026-08-28.85` records the audit, direct tests, and explicit live blockers.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN runtime inspection remain independent release
gates. Creature authoring remains `partial` and `blocked`; arbitrary Creature
template Create, the remaining object/property matrix, complete 99-tileset
Add/Render certification, and independent PathConnect/WOK evidence remain
open. No Docker command, container, service, watcher, browser, Chrome, capture,
live Toolset/NWN process, mutation test, xoreos source, or other GPL source was
used for this checkpoint.

## 153. Continued implementation checkpoint — 2026-08-28 (retained Creature `SoundSetFile` offline implementation)

Primary Aurora common Creature reader/writer evidence, placed-Creature
lineage, frozen Toolset list/dialog disassembly, and the exact retail
`soundset.2da` close the retained type-`4` Creature
`SoundSetFile : Word` semantics. The native selector uses sparse physical row
ordinals as persistence identity, admits row `0`, requires a usable `RESREF`
plus either a positive `STRREF` or usable `LABEL`, and never renumbers rows
that follow an invalid entry. Missing storage remains distinct from the native
reader default `0` and does not authorize field creation.

The additive contract is now implemented across the complete offline Area
Update path: strict presence/type/value parsing, strongest whole
module/ordered-HAK/vanilla table resolution, authenticated digest-bound
catalog transport, detached scene/workspace/history provenance, numeric
`advancedSettings.soundSetFile`, exact searchable selection, guarded
reduction and final materialization, immutable source/table compare-and-swap,
fresh compiler admission, canonical Word-only replacement, complete candidate
readback, and revision-fenced atomic publication. Missing, malformed,
duplicated, wrong-case, wrong-type, unavailable-table, stale, or unadmitted
state remains `PRESERVE_ONLY`. The writer preserves every unrelated GIT member
and the paired GIC, while the surrounding atomic publisher preserves ARE and
IFO. A touched planner defect that previously omitted a `WalkRate`-only change
from its property-mutation presence gate was also corrected.

Safe verification passed `729/729` unique focused frontend assertions across
nine bounded files; the final dialog/provenance subset was repeated at
`56/56`. Backend and frontend application source typechecks both passed under
the 1 GiB heap ceiling. The ordinary backend Jest lane was not retried after
two earlier exact invocations exhausted that ceiling before executing any
assertion, so the new backend SoundSetFile assertions remain an explicit
offline verification blocker rather than an inferred pass. Capability catalog
revision `2026-08-28.86` binds the direct SoundSetFile tests, Aurora audit, and
the backend Jest, browser, Toolset, and NWN blockers without changing Creature
authoring from `partial`/`blocked`.

Fresh guarded browser Apply/Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed `SoundSetFile:Word` readback, and NWN voice
playback remain independent release gates. Arbitrary Creature-template Create,
the remaining object/property matrix, complete 99-tileset Add/Render
certification, and independent PathConnect/WOK evidence remain open. Every
intentional command in this slice was a sequential bounded one-shot process.
No Docker command, container, service, watcher, browser, Chrome, capture, live
Toolset/NWN process, mutation test, xoreos source, or other GPL source was
used.

## 154. Continued implementation checkpoint — 2026-08-28 (retained Creature `StartingPackage` offline implementation)

Primary Aurora common Creature reader/writer evidence, the placed-Creature
lineage, frozen Toolset dialog disassembly, and the exact retail
`packages.2da` close the retained type-`4` Creature
`StartingPackage : Byte` semantics. The native Package selector filters
physical package rows against every canonical `ClassList` `Class : Int`, stores
the admitted physical ordinal as ComboBox item data, and persists that ordinal.
The Toolset's first-row fallback is presentation only; missing storage remains
distinct from the native reader default `0`. The prior web checkbox therefore
cannot authorize a retained-Creature write.

The additive lane is implemented across the offline Area Update path: exact
Byte and ordered ClassList parsing, strongest whole
module/ordered-HAK/vanilla `packages.2da` resolution, immutable digest and row
count, authenticated class-filtered catalog transport, detached
scene/workspace/history provenance, numeric
`advancedSettings.startingPackageId`, searchable `ACTIVE_NOW` selection,
guarded reduction and final materialization, source Byte plus ClassList
compare-and-swap, fresh compiler admission, canonical Byte-only GIT
replacement, complete candidate readback, and revision-fenced atomic
publication. Missing, malformed, duplicated-class, wrong-case, wrong-type,
unbound, out-of-Byte-range, stale-table, class-incompatible, or unadmitted state
remains `PRESERVE_ONLY`. Every unrelated GIT member and paired GIC remain
unchanged; the surrounding publisher preserves ARE and IFO.

The resource-safe frontend gate passed `756/756` assertions across ten bounded
files covering strict domain parsing, HTTP transport, scene mapping, workspace
admission, cloning, catalog facade/provenance, and the dialog boundary. Backend
and frontend application source typechecks both passed under the repository
1 GiB heap ceiling. The ordinary backend Jest lane is not
repeated after two prior exact invocations exhausted that ceiling before any
assertion ran; the new backend StartingPackage assertions therefore remain an
explicit offline blocker. Capability catalog revision `2026-08-28.87` binds
the audit, direct tests, backend Jest blocker, and separate browser,
Toolset, and NWN release blockers while keeping Creature authoring
`partial`/`blocked`.

Fresh guarded browser Apply/Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed `StartingPackage:Byte` plus unchanged ClassList
readback, and NWN `GetCreatureStartingPackage` inspection remain independent
release gates. Arbitrary Creature-template Create, ClassList editing and
package side effects, the remaining object/property matrix, complete
99-tileset Add/Render certification, and independent PathConnect/WOK evidence
remain open. This checkpoint used no Docker command, container, service,
watcher, browser, Chrome, capture, live Toolset/NWN process, mutation test,
xoreos source, or other GPL source.

## 155. Continued implementation checkpoint — 2026-08-28 (retained Creature `ClassList` fail-closed audit)

Primary Aurora common Creature reader/writer evidence and frozen retail
Toolset dialog resources/disassembly now close the storage shape and coupling
boundary for retained type-`4` Creature `ClassList`. The canonical GFF list
contains at most eight active type-`2` entries with `Class : Int` and
`ClassLevel : Short`. Each runtime class slot additionally owns fourteen
level-indexed `KnownListN`/`MemorizedListN` spell containers whose type-`3`
entries contain `Spell : Word`, `SpellMetaMagic : Byte`, and
`SpellFlags : Byte`. The Toolset's level controls are bounded to `1..60`.

Toolset load restores all eight class slots and their nested spell state.
Before save it clears and rebuilds every complete slot from the class, level,
and spell controls. Class changes also drive duplicate-class admission,
progressive slot availability, calculated Creature refresh, and the
class-filtered `StartingPackage` selector. The existing web table changed only
detached scene state and Area Update did not persist it, so it was a false
write affordance rather than partial native authoring.

That affordance is now closed test-first: retained class ID, class name, level,
and legacy default-package inputs display `ClassList: PRESERVE_ONLY` and are
disabled, while local new-Creature drafting remains active under its separate
creation contract. The focused component suite passes `57/57`. The new audit
defines the required future coupled provenance, `classes.2da` admission,
complete source/target spell graph, StartingPackage and calculated-field CAS,
candidate readback, negative tests, and live proof gates. It explicitly does
not authorize a two-field retained write.

Capability catalog revision `2026-08-28.88` records the audit and the explicit
`creature_class_list_coupled_mutation_incomplete` blocker. Retained ClassList
authoring remains open and Creature authoring stays `partial`/`blocked`; no
completion claim is made. This checkpoint used sequential bounded static
reads and one focused one-worker frontend test only. No Docker command,
container, service, watcher, browser, Chrome, capture, live Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## 156. Continued implementation checkpoint — 2026-08-28 (retained Creature `SkillList` fail-closed audit)

Primary common Creature reader/writer evidence and frozen Toolset dialog
resources/disassembly now close the retained `SkillList` persistence identity.
The list is positional: type-`0` entry `N` stores `Rank : Byte` for physical
row `N` of the effective `skills.2da`; no independent skill ID is stored. Both
the common writer and Toolset save emit one entry for every row of the currently
loaded skill table, including hidden presentation rows and zero-filled tail
entries.

The current web draft used fixed labels and changed only detached scene state,
so retained skill inputs were another false write affordance. They now display
`SkillList: PRESERVE_ONLY` and are disabled. Local new-Creature ranks remain
active under the separate creation path and are integer-clamped to the native
`0..255` Byte domain. The focused component suite passes `59/59`.

The new audit defines the future exact-list provenance, strongest whole
module/ordered-HAK/vanilla `skills.2da` descriptor, physical-row targets,
full-vector/table CAS, fresh compiler admission, candidate readback, negative
tests, and browser/Toolset/NWN release proof. Capability catalog revision
`2026-08-28.89` records the audit and explicit
`creature_skill_list_ordinal_mutation_incomplete` blocker. Retained SkillList
authoring remains open and no completion claim is made.

This checkpoint used sequential bounded static reads and one focused
one-worker frontend test only. No Docker command, container, service, watcher,
browser, Chrome, capture, live Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used.

## 157. Continued implementation checkpoint — 2026-08-28 (retained Creature `SkillList` exact offline CAS)

The retained Creature `SkillList` lane has advanced from the preserve-only
audit boundary to an exact offline implementation. Backend Area parsing now
retains the complete positional type-`0`/`Rank : Byte` vector and opaque
sibling counts. Snapshot hydration binds it to the strongest-whole
module/ordered-HAK/vanilla `skills.2da` descriptor. A bounded authenticated
catalog exposes Toolset-visible labels while retaining physical row ordinals.

Frontend composition now uses the Creature API port and a dedicated catalog
facade. Existing Creature editing activates only for a matching table digest
and row count plus a complete numeric `skillId` vector. Hidden table rows are
not rendered, are never renumbered, and cannot be changed through the dialog.
The full vector is retained for save. Table growth uses a zero tail; table
shrinkage requires an explicit truncation confirmation.

Area Update projects a full-vector CAS with explicit resize mode, re-admits
the current `skills.2da` immediately before compilation, mutates only the
canonical GIT `SkillList`, preserves opaque entry siblings and paired GIC
bytes, and performs the existing exact parsed whole-struct readback. Contract
and observability addenda define the payload budgets and
`area_creature_skill_list_cas.v1` diagnostics.

Both application typechecks pass under the repository 1 GiB ceiling. Focused
frontend commands pass `13/13` domain/facade/provenance assertions and `64/64`
dialog/provenance assertions with one worker. Backend coverage was expanded
for exact parsing, effective-table identity, projection, planning,
catalog admission/query, canonical expansion, opaque-sibling preservation,
and candidate readback. Those backend assertions remain unexecuted after two
earlier bounded Jest attempts exhausted the heap before any assertion ran.

Capability catalog revision `2026-08-28.90` replaces
`creature_skill_list_ordinal_mutation_incomplete` with explicit
`backend_creature_skill_list_unit_gate_pending`, guarded browser readback,
Toolset Save/Build/reopen, and NWN runtime proof blockers. Creature authoring
therefore remains `partial`/`blocked`; the overall Area objective, ClassList
coupled mutation, remaining object/property matrix, 99-tileset certification,
and independent PathConnect/WOK proof remain open. This checkpoint used no
Docker command, service, watcher, browser, Chrome, capture, live Toolset/NWN,
mutation test, sub-agent, xoreos source, or other GPL source.

## 158. Continued implementation checkpoint — 2026-08-28 (retained Creature same-roster `ClassLevel` exact offline CAS)

The primary Toolset and common Creature reader/writer graph now closes the
previously unknown `ClassList` recalculation boundary. Per-slot levels are
bounded to `1..60`, the active total is bounded to `180`, the visible derived
saves and racial ability adjustments remain dialog-owned calculations, and a
level transition persists through the already source-closed HP calculation.
Changing a class identity remains a different operation: it clears/rebuilds
that slot's spell model and re-filters `StartingPackage`, so class IDs, slot
count/order, and spell lists are not admitted by this slice.

The bounded same-roster lane is implemented through the complete offline Area
Update path. Backend parsing retains the exact canonical type-`2` list,
ordered `Class : Int`/`ClassLevel : Short` pairs, and opaque sibling counts.
Projection and planning require unchanged class IDs, count, and order; changed
valid levels; exact source levels; and an atomically matching HP target-level
vector. The writer replaces only the existing level Shorts and the derived
`HitPoints`/`CurrentHitPoints`/`MaxHitPoints` triplet, preserving every nested
known/memorized spell list, opaque member, unrelated GIT field, and paired GIC
byte. Candidate verification remains whole-struct readback under the existing
transactional ARE/GIT/GIC/IFO publication fence.

Frontend HTTP, scene, workspace, history cloning, draft validation, reducer,
and final materialization carry detached exact provenance. Existing Creature
class IDs and names remain disabled; spell/slot mutation remains unavailable;
only levels show `ACTIVE_NOW` when the exact ClassList state is coupled to the
same HP level vector and `racialtypes.2da` binding. Each accepted level change
recalculates the HP draft against its target vector before Apply.

Resource-safe verification passed backend and frontend application source
typechecks, `239/239` focused frontend contract/domain/provenance/dialog
assertions, and `511/511` scene-mapper/workspace/clone assertions. New backend
domain, parser, projector, planner, writer, coupling, stale-source,
opaque-sibling, and candidate-readback assertions are authored; the two large
modified specs pass syntax-only transpilation. The ordinary backend Jest lane
was not retried because two earlier bounded attempts exhausted its enforced
1 GiB heap before running assertions, so
`backend_creature_class_level_unit_gate_pending` remains explicit.

Capability revision `2026-08-28.91` replaces the broad ClassList blocker with
the bounded level implementation plus separate backend-test, guarded browser,
Toolset Save/Build/reopen, NWN runtime, and
`creature_class_id_spell_slot_mutation_incomplete` blockers. Creature
authoring remains `partial`/`blocked`; the overall Area objective, remaining
object/property matrix, full 99-tileset Add/Render certification, and
independent PathConnect/WOK evidence remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, live Toolset/NWN process, mutation
test, sub-agent, xoreos source, or other GPL source was used.

## 159. Continued implementation checkpoint — 2026-08-28 (retained Creature same-roster class identity with confirmed spell clear)

Static Toolset and common-writer analysis closes a bounded class-ID mutation
without inventing arbitrary spell legality. A changed native class selector
destroys that slot's spell model, rebuilds the target class model with zero
selected counters, and save transfer clears all fourteen known and memorized
containers. The common writer then omits their empty `KnownList0..13` and
`MemorizedList0..13` fields. The same transition re-filters
`StartingPackage` against physical `packages.2da` rows whose exact `ClassID`
matches the target roster. Physical `classes.2da` rows, not labels, are the
persisted class identities.

The corresponding offline lane is implemented end to end. It requires a
fixed non-empty slot count and order, unchanged `ClassLevel : Short` values,
one or more unique admitted target class IDs, explicit destructive spell-clear
confirmation, an exact source/target package pair admitted against the target
roster, immutable classes/packages table identities, and an exact fingerprint
of the complete source ClassList graph. The writer changes only the selected
class Ints, deletes the canonical spell-list fields from changed slots,
preserves unchanged slots plus opaque siblings, changes the package Byte, and
independently verifies the candidate before transactional ARE/GIT/GIC/IFO
publication.

The frontend carries and detaches the exact provenance across HTTP, scene,
workspace/history, clone, and export boundaries. The Creature dialog uses the
catalog facade for persistence identities, rejects duplicate class targets,
keeps class levels disabled when identities differ, reloads package admission
for the target vector, and disables Apply/OK until the destructive clear is
confirmed. Final materialization repeats all source, roster, level, catalog,
package, and confirmation checks. During implementation a projector defect was
also corrected: the identity path can no longer fabricate an array of
`undefined` class levels when it intentionally suppresses the standalone level
mutation.

Resource-safe verification passes backend and frontend application source
typechecks, `28/28` focused class catalog/HTTP/domain/provenance frontend
assertions, and `413/413` workspace validation/provenance/domain assertions,
all with a one-worker frontend runner. Static diagnosis found that the new
writer and projector regressions had been appended to existing monolithic
specs of approximately 444 KB and 294 KB. Moving those new cases into bounded
dedicated specs allowed the repository `test:unit:bounded` runner to pass
`30/30` class-table, domain, admission, projector, writer, compiler-mapping,
and resource-policy assertions under the unchanged 1 GiB ceiling. The updated
capability catalog also passes `13/13`; no broad or ordinary typed Jest retry
was performed.

Capability revision `2026-08-28.93` replaces the broad class-ID/spell/slot
blocker with the implemented bounded identity lane and narrower blockers for
slot add/remove/reorder, arbitrary spell-graph authoring, simultaneous
class-ID-plus-level mutation, guarded browser/Toolset/NWN proof. Creature authoring therefore remains
`partial`/`blocked`; the overall Area objective, remaining object/property
matrix, full 99-tileset Add/Render certification, and independent
PathConnect/WOK proof remain open. This checkpoint used no Docker command,
container, service, watcher, browser, Chrome, capture, live Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source.

## 160. Continued implementation checkpoint — 2026-08-28 (resource-safe backend verification debt closure)

The repeated pre-assertion backend OOM was investigated without another broad
run. The relevant new regressions were embedded in existing writer and
projector specs of approximately 444 KB and 294 KB. Their feature cases are
now split into dedicated small specs with shared deterministic GFF-pair and
draft-projector fixtures. A resource-policy regression also asserts the
bounded lane's 1 GiB script cap, single worker, disabled transform diagnostics,
and isolated-module transpilation.

Under that unchanged resource ceiling, sequential bounded commands pass:

- `30/30` class-identity and runner-guard assertions;
- `101/101` ClassLevel, SkillList, SoundSetFile, and StartingPackage
  domain/table/admission assertions;
- `5/5` dedicated projector assertions;
- `7/7` dedicated writer/readback assertions;
- `4/4` compiler-routing and HP catalog-admission assertions;
- `4/4` immutable-ordinal planner assertions; and
- `13/13` capability-catalog assertions.

Capability revision `2026-08-28.94` removes the four backend-only verification
blockers for same-roster ClassLevel, SkillList, SoundSetFile, and
StartingPackage. Their guarded browser, Toolset Save/Build/reopen, and NWN
runtime blockers remain explicit. The overall Area objective, remaining
Creature/property authoring, full 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
or sub-agent was used.

## 161. Continued implementation checkpoint — 2026-08-28 (retained Creature `FeatList` exact offline CAS)

Primary Aurora common Creature reader/writer evidence and frozen Toolset
analysis now close the bounded retained `FeatList` contract: canonical type-`1`
list entries contain exact `Feat : Word` physical `feat.2da` row identities;
Toolset-hidden or unresolved rows are not writable authority; assigned category
`4` removal requires destructive spell-variant coupling; and membership of
row `40` contributes one HP per class level.

The contract is implemented through strict GIT parsing, strongest-whole
module/ordered-HAK/vanilla `feat.2da` binding, authenticated digest-bound
catalog pages, detached frontend provenance, visible `ACTIVE_NOW` versus
`PRESERVE_ONLY` gating, exact membership projection, fresh compiler admission,
immutable-ordinal planning, canonical list reconstruction, coupled HP writing,
complete candidate readback, and revision-fenced ARE/GIT/GIC/IFO publication.
Unknown, hidden, duplicate, opaque-sibling, stale, or unbound state fails
closed. Existing assigned category-`4` feats remain visible but cannot be
removed by this lane.

Resource-safe verification passes both application typechecks, `46/46`
focused backend assertions, `37/37` focused frontend assertions, and `13/13`
capability-catalog assertions. The backend gate uses the repository's existing
`test:unit:bounded` runner with one worker and isolated transpilation under the
unchanged 1 GiB heap ceiling. Two initial ordinary `test:unit` invocations
exhausted that ceiling before assertions; the commands were corrected rather
than increasing memory or involving Docker. No server, watcher, browser,
capture, Toolset/NWN process, mutation test, or sub-agent was started.

Capability revision `2026-08-28.95` adds the FeatList audit/tests and explicit
guarded browser, native Toolset Save/Build/reopen, and NWN runtime proof
blockers. Creature authoring remains `partial`/`blocked`; arbitrary Creature
template creation, the remaining object/property matrix, complete 99-tileset
Add/Render certification, and independent PathConnect/WOK proof remain open.

## 162. Continued implementation checkpoint — 2026-08-28 (retained Creature `VarTable` exact offline CAS)

Primary Aurora evidence closes the placed-Creature ownership and grammar
boundary without importing secondary GPL code. The common Creature reader and
writer call the same native ordered-variable functions used by UTC templates;
the Area instance owns one optional `VarTable : List` inside its type-`4` GIT
`Creature List` entry. Physical order and duplicates are meaningful. Exact
entry structs use `Name : CExoString`, `Type : DWord`, and the matching
Int/Float/CExoString `Value`; absence means an exact empty table, while an
empty target removes the field.

The bounded offline lane is implemented end to end. Backend parsing retains
complete immutable provenance, draft projection emits a complete-table CAS,
planning reparses the current immutable Creature ordinal, and writing replaces,
creates, or removes only that Creature's canonical table while preserving
unrelated GIT fields and all GIC bytes. The frontend carries the exact table
through its HTTP port, scene mapping, workspace validation, history cloning,
and final materialization. The dialog supports add, typed edit, remove, and
physical reorder only under exact provenance and otherwise displays
`PRESERVE_ONLY`.

Resource-safe verification passes both application typechecks, `1148/1148`
focused backend parser/projector/planner/writer/capability assertions, `656/656` focused
frontend HTTP/mapper/workspace/provenance/clone assertions, and `63/63`
Creature dialog assertions. Runs were sequential, single-worker, and capped at
the repository's 1 GiB Node heap. A malformed parser fixture and two stale
Class ID accessibility assertions were corrected during the red-green cycle;
neither required a production workaround.

Capability revision `2026-08-28.96` adds the source audit and the aggregate
`creature_variable_table_live_proof_pending` blocker. Creature authoring stays
`partial`/`blocked` until fresh browser Save/reopen, exact-candidate Toolset
Save/Build/reopen, and NWN runtime evidence exist. The overall Area objective,
remaining object/property matrix, full 99-tileset Add/Render certification,
and independent PathConnect/WOK evidence remain open. No Docker command,
container, service, watcher, browser, Chrome, capture, live Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## 163. Continued implementation checkpoint — 2026-08-29 (retained Creature GIC `Comment` exact offline CAS)

Primary Aurora decompilation closes the placed-Creature editor-comment
boundary. The placed type-`4` Creature reader loads exact `Comment` from the
same-ordinal paired GIC `Creature List` struct as native type `10`
`CExoString`; the symmetric writer stores the same editor-only member back to
GIC before the common gameplay Creature writer handles GIT. No secondary GPL
source was used.

The bounded lane is implemented end to end. Backend Area parsing now requires
exact Creature GIT/GIC family ordinals and retains the unnormalized comment.
Projection and planning emit a complete expected/value CAS bound to both the
immutable Creature ordinal and source GIC digest. The paired writer changes
only that canonical GIC `Comment`, preserves GIT byte-for-byte, rejects stale,
missing, duplicate, wrong-type, NUL-containing, and over-budget inputs, and
verifies the complete candidate pair before revision-fenced ARE/GIT/GIC/IFO
publication.

Frontend HTTP validation rejects malformed or cross-family metadata. Scene
mapping, workspace validation, history cloning, and final materialization keep
the source comment detached and immutable. The Creature Comments tab exposes
`ACTIVE_NOW` only for exact retained provenance, otherwise visibly preserves
the value, and retains exact whitespace and code units through Apply, Cancel,
reopen, and local Save.

Sequential resource-safe verification passes backend parser/writer
`1131/1131`, projector/planner `902/902`, atomic publication `1/1`, and
capability catalog `13/13`; frontend mapper/workspace/provenance/dialog
`590/590`, HTTP boundary `150/150`, clone `1/1`, and targeted full-flow
regression `1/1`. Both application source typechecks pass under the 1 GiB
ceiling. The complete Creature-properties regression file also passes `20/20`
after replacing a stale preserve-only Perception Range role assertion and
repairing a real HP coupling defect. The HP edit and Apply paths now consume
draft class levels only when exact class-level provenance binds the original
roster and target class identities remain unchanged; otherwise they use the
exact levels retained in the HP source state.

Capability revision `2026-08-29.97` adds the editor-comment audit and focused
tests without increasing the catalog's fixed `128` test, `32` proof, or `64`
blocker limits. The aggregate
`creature_variable_table_and_editor_comment_live_proof_pending` blocker keeps
Creature authoring `partial`/`blocked`. Fresh browser Save/reopen and exact
candidate Toolset Save/Build/reopen evidence remain `missing`; no NWN runtime
behavior is claimed for editor comments. The overall Area objective, remaining
object/property matrix, full 99-tileset Add/Render certification, and
independent PathConnect/WOK evidence remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, live Toolset/NWN process, mutation
test, sub-agent, xoreos source, or other GPL source was used.

## 164. Continued implementation checkpoint — 2026-08-29 (retained ground Item GIC `Comment` exact offline CAS)

Primary Aurora decompilation closes the retained ground-item editor-comment
boundary. The item reader loads exact `Comment : CExoString` into the native
member at byte offset `0x98` from the same-ordinal paired GIC root `List`
type-`0` struct, and the symmetric writer stores that member back into GIC
before resuming the common item GIT writer. The implementation uses no xoreos
or other GPL source.

The bounded lane is implemented end to end. Backend parsing admits only exact
paired Item ordinals and retains the unnormalized source comment. Projection
and planning emit an immutable-ordinal expected/value CAS bound to the source
GIC digest. The paired writer changes only the canonical GIC `Comment`, keeps
GIT/ARE/IFO byte-identical for this mutation, rejects stale, missing,
duplicated, wrongly typed, NUL-containing, and over-budget values, and verifies
the candidate before the existing revision-fenced transaction publishes it.

Frontend HTTP validation, scene mapping, workspace validation, history cloning,
and final materialization keep `source.itemEditorComment` detached and
immutable. The Item Comments tab is editable only for exact retained
provenance. Exact multiline whitespace and code units survive Apply, Cancel,
reopen, and local Save. A shared dialog reconciliation defect was fixed so
Apply advances the cancel snapshot only after the live Item reaches the
applied draft; Cancel still discards later unapplied edits without reverting
the prior Apply.

Sequential resource-safe verification passes `2,044/2,044` focused backend
domain/parser/projector/planner/writer assertions, `703/703` focused frontend
boundary/domain/dialog/workspace/regression assertions, `13/13` capability
catalog assertions, backend build, and frontend typecheck. All runners used one
worker and the repository's unchanged 1 GiB Node heap ceiling.

Capability revision `2026-08-29.98` adds the exact Item Comment audit and test
matrix while retaining `objects_item_authoring` as `partial`/`blocked`. The
remaining blockers are the full Item property matrix and fresh guarded browser
plus exact-candidate Toolset Save/Build/reopen evidence; no NWN runtime behavior
is claimed for an editor-only comment. The overall Area objective, remaining
object/property matrix, full 99-tileset Add/Render certification, and
independent PathConnect/WOK evidence remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, live Toolset/NWN process, mutation
test, sub-agent, xoreos source, or other GPL source was used.

## 165. Continued implementation checkpoint — 2026-08-29 (retained ground Item GIT instance-state exact offline CAS)

Primary Aurora decompilation closes the retained type-`0` ground-item
`Charges`, `Cost`, `Stolen`, `StackSize`, `Plot`, `AddCost`, `Identified`, and
`Cursed` boundary. The common Item reader supplies the exact physical types and
read defaults, while the symmetric writer fixes their canonical native order.
The retained Area Item writer binds this state to the GIT root `List`; the
paired GIC is editor-comment storage and is not gameplay-state authority. No
xoreos or other GPL source was used.

The bounded lane is implemented end to end. Backend parsing preserves the
complete physical-presence vector separately from Aurora's resolved defaults.
Projection and planning bind a full expected/value CAS to one immutable Item
ordinal. The writer replaces or deterministically inserts only changed
canonical members, preserves unrelated fields and GIC, supports combination
with the separately admitted GIC Comment mutation, and requires whole-candidate
readback before revision-fenced ARE/GIT/GIC/IFO publication. The new-Item
serializer now emits the same native order and exact Byte/Word/DWord types.

Frontend HTTP validation, Area mapping, workspace validation, history cloning,
reducer, and final materialization carry an immutable detached source tuple and
a complete target tuple. The Item dialog exposes only the eight proven members
as `ACTIVE_NOW` with native numeric bounds. Adjacent `CostTable`, `CostValue`,
and every unproven Item control remain visibly `PRESERVE_ONLY`.

Sequential resource-safe verification passes `108/108` targeted backend
domain/parser/repository/projector/planner/writer/candidate assertions,
`721/721` focused frontend boundary/domain/mapper/workspace/provenance/clone/
dialog assertions, and the `1/1` Apply/Cancel/reopen/OK/local-Save regression.
Backend and frontend production builds pass under the unchanged one-GiB Node
heap ceiling.

Capability revision `2026-08-29.99` records the new audit and test matrix while
keeping `objects_item_authoring` `partial`/`blocked`. The remaining blockers
are the rest of the Item property matrix plus fresh guarded browser,
exact-candidate Toolset Save/Build/reopen, and gameplay-visible NWN evidence.
The overall Area objective, full 99-tileset Add/Render certification, remaining
object/property matrix, and independent PathConnect/WOK proof remain open. No
Docker command, container, service, watcher, browser, Chrome, capture, live
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## 166. Continued implementation checkpoint — 2026-08-29 (retained ground Item GIT `Tag` exact offline CAS)

Primary Aurora decompilation closes the retained type-`0` ground-item
`Tag : CExoString` boundary. The common Item reader and symmetric writer use
the exact case-sensitive `Tag` label for the Item member at offset `0x34`, and
the retained Area Item writer delegates that payload to the common GIT writer.
The Toolset RCDATA form independently establishes the 32-character edit
boundary. No xoreos or other GPL source was used.

The bounded lane is implemented end to end. Backend parsing distinguishes an
absent field from a physically present empty string and retains the exact
unnormalized value. Projection and planning bind expected/value CAS data to
one immutable Item ordinal. The paired writer replaces only one existing
canonical GIT field in place, preserves unrelated fields and GIC bytes,
supports an atomic combination with instance state and GIC Comment, and
requires whole-candidate readback before revision-fenced ARE/GIT/GIC/IFO
publication. Missing, duplicate, wrongly cased, wrongly typed, stale,
NUL-bearing, and over-budget states fail closed.

Frontend HTTP validation, scene mapping, workspace validation, history
cloning, reducer, and final materialization carry detached immutable
`source.itemTag` provenance. Exact provenance exposes Tag as `ACTIVE_NOW`;
loose scene labels remain `PRESERVE_ONLY`. Empty and whitespace-containing
values are never trimmed or synthesized. The full workspace regression proves
Apply, Cancel, reopen, OK, and local Save while retaining the exact value.

Sequential resource-safe verification passes `1,959/1,959` focused backend
domain/parser/projector/planner/writer/candidate assertions, `747/747` focused
frontend boundary/domain/mapper/workspace/provenance/clone/dialog/regression
assertions, `13/13` capability catalog assertions, and both production builds.
The ordinary full-diagnostics Jest preset reached its intentional one-GiB
per-process ceiling and was discarded; accepted backend evidence uses the
repository's one-worker bounded preset, while the production build performs
complete TypeScript validation.

Capability revision `2026-08-29.100` records the Tag audit and exact test
matrix while keeping `objects_item_authoring` `partial`/`blocked`. The renamed
`ground_item_tag_instance_state_and_editor_comment_live_proof_pending` blocker
retains fresh guarded browser, exact-candidate Toolset Save/Build/reopen, and
NWN evidence as missing. The remaining Item property matrix, overall Area
objective, full 99-tileset Add/Render certification, and independent
PathConnect/WOK proof remain open. No Docker command, container, service,
watcher, browser, Chrome launch, capture, live Toolset/NWN process, mutation
test, sub-agent, xoreos source, or other GPL source was used.

## 167. Continued implementation checkpoint — 2026-08-29 (retained ground Item GIT `TemplateResRef` exact offline CAS)

Primary Aurora decompilation closes the retained type-`0` ground-item
`TemplateResRef : ResRef` boundary. The common Item reader loads the exact
case-sensitive label through the native ResRef reader into the member at byte
offset `0x1c`; the symmetric common Item writer emits the same member through
the native ResRef writer, and the retained Area Item writer binds it to the GIT
root `List`. Independent PE label bytes and packed-module readback corroborate
the lineage. No xoreos or other GPL source was used.

The bounded lane is implemented end to end. Backend parsing preserves exact
presence separately from the stored value. Projection and planning bind a
complete expected/value CAS to one immutable Item ordinal. The pair writer
replaces only one canonical existing field in place, preserves physical field
position, unrelated GIT fields, and paired GIC bytes, composes atomically with
Tag, instance state, and paired GIC Comment, and requires whole-candidate
readback before revision-fenced ARE/GIT/GIC/IFO publication. Missing,
duplicate, aliased, wrongly cased, wrongly typed, noncanonical, stale, and
no-op states fail closed.

Frontend HTTP validation, Area mapping, workspace validation, history
cloning, reducer, and final materialization carry detached immutable
`source.itemTemplateResRef` provenance. A canonical present source supplies
the retained Item's scene ResRef authority and exposes the Item Properties
ResRef control as `ACTIVE_NOW`; absent or loose identities remain visibly
`PRESERVE_ONLY`. The full workspace regression rejects invalid input and
proves canonical Apply, Cancel, reopen, OK, and local Save while retaining the
original CAS source.

Sequential resource-safe verification passes `2,258/2,258` focused backend
domain/parser/repository/projector/planner/writer/candidate/capability
assertions, `772/772` focused frontend boundary/domain/mapper/workspace/
provenance/clone/dialog/regression assertions, `13/13` capability-catalog
assertions, and both production builds. Every runner used one worker and the
one-GiB Node heap ceiling.

Capability revision `2026-08-29.101` records the TemplateResRef audit and test
matrix while keeping `objects_item_authoring` `partial`/`blocked`. The renamed
`ground_item_template_resref_tag_instance_state_and_editor_comment_live_proof_pending`
blocker retains fresh guarded browser, exact-candidate Toolset
Save/Build/reopen, and applicable NWN evidence as missing. The remaining Item
property matrix, overall Area objective, full 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, container, service, watcher, browser, Chrome launch, capture, live
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## 168. Continued implementation checkpoint — 2026-08-29 (retained ground Item GIT localized-string exact offline CAS)

Primary Aurora decompilation closes the retained type-`0` ground-item
`LocalizedName`, `Description`, and `DescIdentified : CExoLocString` boundary.
The common Item reader consumes all three exact labels with the native
localized-string reader; the symmetric common writer emits them in order
`LocalizedName`, `Description`, `DescIdentified`, and the retained Area Item
writer binds the payload to the GIT root `List`. Independent PE label mapping
and the Item dialog RCDATA controls corroborate the lineage. No xoreos or other
GPL source was used.

The bounded offline lane is implemented end to end. Backend parsing preserves
one complete exact presence-sensitive triple. Projection admits each source
member independently only for the empty-or-one-entry, language-0, printable
ASCII profile, with a 256-byte name budget and 4,096-byte description budgets.
Planning binds expected values to one immutable Item ordinal. The pair writer
replaces only selected existing type-`12` GIT fields in native order, preserves
unrelated GIT fields and paired GIC bytes, composes with TemplateResRef, Tag,
instance state, and Comment, and requires whole-candidate readback before the
existing revision-fenced transaction may publish. Unsupported or stale storage
fails closed or remains preserve-only without field creation or normalization.

Frontend HTTP validation, Area mapping, workspace provenance, history cloning,
per-field reducer/materialization, and Item Properties controls retain a deep
copy at `source.itemLocalizedStrings`. Admitted fields are visibly
`ACTIVE_NOW`; TLK-backed, multilingual, absent, malformed, non-ASCII, or
over-budget members are independently `PRESERVE_ONLY`. The workspace regression
proves invalid-target rejection plus Apply, Cancel, reopen, OK, and local Save
while retaining the original exact CAS source.

Sequential resource-safe verification passes `2,243/2,243` focused backend
domain/parser/repository/projector/planner/writer/candidate assertions,
`778/778` focused frontend boundary/domain/mapper/workspace/provenance/clone/
dialog/regression assertions, `13/13` capability-catalog
assertions, and both production builds. Every runner used one worker and the
one-GiB Node heap ceiling.

Capability revision `2026-08-29.102` records the localized-string audit and
test matrix while keeping `objects_item_authoring` `partial`/`blocked`. The
renamed
`ground_item_localized_strings_template_resref_tag_instance_state_and_editor_comment_live_proof_pending`
blocker retains fresh guarded browser, exact-candidate Toolset
Save/Build/reopen, and applicable NWN evidence as missing. The remaining Item
property matrix, overall Area objective, full 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, container, service, watcher, browser, Chrome launch, capture, live
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## 169. Continued implementation checkpoint — 2026-08-30 (retained Item `VarTable` and blueprint/instance safety)

The exact retained ground-Item `VarTable` slice is implemented end to end from
the primary Aurora common Item reader/writer evidence. One optional ordered
type-`0` GIT list carries native type ids `1` Int, `2` Float, and `3`
CExoString; order, duplicate names, entry ordinals, and physical absence are
part of immutable source state. The parser, HTTP contract, Area projection,
CAS planner, paired writer, candidate readback, scene mapper, history clone,
workspace reducer/materializer, and Variables editor share that exact model.
Malformed, unsupported, non-float32, wrong-owner, or stale storage remains
`PRESERVE_ONLY`. The non-native Item Scripts editor is removed; compatibility
script metadata remains preserved and no native Item event-script parity is
claimed. Capability revision `2026-08-29.103` remains `partial`/`blocked`.

A separate frontend safety correction now makes the Item template/instance
boundary explicit. Only an `itm_wizard_*` object owned by Items mode can
materialize and publish UTI-only fields. Retained and placed Area Items can
change only fields admitted by exact source provenance. Name/StrRef/PaletteID,
BaseItem, model/armor/cloak/color, PropertiesList, and other unproven controls
are visibly `PRESERVE_ONLY`, while a lower application-layer materializer
preserves the source values even for a forged draft. Area-mode and non-wizard
publication skips emit a reasoned telemetry event, closing the accidental UTI
create/overwrite path from the Area properties dialog.

Accepted offline evidence for the safety correction is `32/32` focused
frontend assertions and one complete frontend TypeScript/Vite production
build. The preceding VarTable checkpoint retains `1,869/1,869` focused bounded
backend assertions, `792/792` focused frontend assertions, and both production
builds. No Docker command, service, watcher, browser, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
packed GFF readback, NWN inspection, the remaining Item property matrix,
overall Area CRUD/authoring closure, the full 99-tileset Add/Render matrix, and
independent PathConnect/WOK proof remain open. This checkpoint does not promote
Item authoring or the overall Area program to complete.

## 170. Continued implementation checkpoint — 2026-08-30 (retained ground Item GIT `PropertiesList` full-vector offline CAS)

Primary Aurora decompilation closes the canonical retained type-`0` ground
Item `PropertiesList` storage profile. The common Item reader and writer agree
on ordered type-`0` entry structs containing exactly `PropertyName:Word`,
`Subtype:Word`, `CostTable:Byte`, `CostValue:Word`, `Param1:Byte`,
`Param1Value:Byte`, and `ChanceAppear:Byte`. Because the reader's missing-field
CostTable default is not source-closed, Aurora Web admits mutation only for a
physically present canonical list and does not invent a default. Property 48
requires CostTable 24. No xoreos or other GPL source was used.

The bounded offline lane is implemented end to end. Backend parsing,
provenance cloning, deterministic hashing, projection, immutable-ordinal CAS
planning, paired GIT/GIC writing, whole-candidate readback, and revision-fenced
publication carry one complete ordered vector. Add, update, remove, and reorder
preserve the original field position, unrelated GIT data, and paired GIC bytes;
emptying the list preserves a physically present empty List. Stale, malformed,
wrong-owner, noncanonical, and no-op mutations fail closed.

Frontend HTTP validation, Area mapping, workspace validation, scene cloning,
reducer/materialization, and the Item Properties dialog share the exact native
model. Canonical present sources are `ACTIVE_NOW`; physical absence and
malformed provenance are `PRESERVE_ONLY`. Add creates a blank incomplete row
instead of guessed values. The dialog exposes native unsigned limits, keeps
derived labels read-only, supports remove/reorder, and disables Apply/OK with
`INCOMPLETE_TARGET` until the entire target is canonical. The lower
materializer independently preserves the source list for forged or incomplete
drafts.

Sequential resource-safe verification passes `2,313/2,313` relevant backend
assertions and `821/821` relevant frontend assertions plus both production
builds. Every runner used one worker and the one-GiB Node heap ceiling.
Capability revision `2026-08-30.104` records the audit and test matrix while
keeping `objects_item_authoring` `partial`/`blocked`; the new
`ground_item_property_list_live_proof_pending` blocker retains guarded browser
Save/reopen and exact-candidate Toolset Save/Build/reopen plus packed-GFF
readback as missing.

The broader Item property matrix, overall Area CRUD/authoring closure, full
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. No Docker command, container, service, watcher, browser, Chrome
launch, capture, live Toolset/NWN process, mutation test, sub-agent, xoreos
source, or other GPL source was used. This checkpoint does not promote Item
authoring or the overall Area program to complete.

## 171. Continued implementation checkpoint — 2026-08-30 (retained ground Item `BaseItem` and appearance full-vector offline CAS)

Primary Aurora decompilation and the effective module -> ordered HAK ->
vanilla `baseitems.2da` close one complete retained ground-Item `BaseItem` and
appearance mutation. The immutable source binds the physical table digest and
row count to a discriminated `ModelType` `0..3` vector. Cross-profile changes
are admitted only with a complete explicit target; no label, preview model,
or loose catalog metadata grants write authority. No xoreos or other GPL
source was used.

The backend parser, authoritative table resolver, projection, CAS planner,
paired GIT/GIC writer, candidate compiler, repository, and application service
now preserve one exact ordinal and perform whole-candidate readback before the
revision-fenced Area transaction publishes. The frontend validates and clones
detached provenance, fail-closes stale bindings, materializes the exact target
into renderer-facing Item state, and activates only the controls required by
the selected native model profile. Cross-profile selection clears the old
profile and blocks Apply/OK until the target is complete.

Focused bounded backend suites and `831/831` focused frontend assertions pass,
as do both production builds. Capability revision `2026-08-30.105` records the
audit while retaining `objects_item_authoring` as `partial`/`blocked` and adds
`ground_item_base_appearance_live_proof_pending`. Browser Apply/Save/reopen,
packed GFF readback, Toolset Save/Build/reopen, NWN inspection, the remaining
Item matrix, full Area objective, 99-tileset certification, and independent
PathConnect/WOK proof remain open. No Docker command, service, watcher,
browser, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.

## 172. Continued implementation checkpoint — 2026-08-30 (native Item root profile and phantom-field removal)

Primary Aurora common Item reader/writer and UTI-wrapper decompilation close a
previously unsafe contract ambiguity. Item root owns `Cost:DWord` and
`AddCost:DWord`; only `PropertiesList[]` children own `CostTable:Byte` and
`CostValue:Word`. Item root has no native event-script slots. The same common
profile applies to UTI, Area ground Item, and creature/placeable/store embedded
Item serialization. UTI uses `LocalizedName:CExoLocString`, signed
`BaseItem:Int`, and `Charges:Byte`.

Backend create/update validation is now strict and rejects root `costTable`,
`costValue`, and `scripts`. Application commands cannot carry them. UTI,
embedded Item, and new Area ground-Item writers omit them even from forged
internal input, while child-property costs still round-trip. Ground GIT also
omits UTI-only `PaletteID` and blueprint `Comment`; editor comments stay in the
paired GIC. Compatibility parsing remains broader but is never mutation
authority.

The frontend create contract and wizard payload omit the rejected fields. The
Item dialog removes the two phantom root controls while keeping the native
`PropertiesList` columns. Accepted sequential evidence is `47/47` bounded
backend assertions and `56/56` focused frontend assertions plus both
production builds. The initial broad Jest preset reached its intentional
one-GiB ceiling and was discarded; accepted backend evidence uses the bounded
one-worker preset.

Capability revision `2026-08-30.105` adds the audit and focused tests while
keeping Item authoring `partial`/`blocked`; fresh Toolset Save/Build/reopen and
packed-resource readback remain open. The remaining Item property matrix,
overall Area CRUD/authoring closure, full 99-tileset Add/Render certification,
and independent PathConnect/WOK proof remain open. No Docker command,
container, service, watcher, browser, Chrome launch, capture, live Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## 173. Continued implementation checkpoint — 2026-08-30 (native Item blueprint UTI `VarTable` authoring)

Primary Aurora common Item reader/writer and UTI-wrapper decompilation close
the native blueprint `VarTable` profile. UTI uses one ordered type-`0` List;
each entry contains exact `Name:CExoString`, `Type:Int` 1/2/3, and a matching
`Value:Int`/`Float`/`CExoString`. Order, duplicate names, and whitespace are
state. Empty input omits the list. No Item event-script slots are inferred.
No xoreos or other GPL source was used.

The offline implementation is complete across strict HTTP validation, shared
Aurora variable validation, native UTI and embedded common-Item writing,
exact parser readback, catalog create/update metadata, frontend API contract,
Items-mode scene mapping, wizard draft materialization, active Variables UI,
and create/update payload publication. Invalid or over-budget targets fail
closed; the retained ground-Item provenance lane remains independently
guarded. The parser now keeps raw CExoString values until a field-specific
reader elects to normalize them, removing a discovered whitespace-loss defect
from VarTable round-trip.

Accepted sequential resource-safe verification is `71/71` focused bounded
backend assertions, `63/63` focused frontend assertions, `13/13`
capability-catalog assertions, and both production builds. The broad catalog
test file has one unrelated pre-existing animation-event expectation that does
not include the now-present `sourceModelHash`; the exact Item lifecycle test
passes when selected directly. `git diff --check` reports no errors.

Capability revision `2026-08-30.106` records the new audit and tests while
keeping `objects_item_authoring` `partial`/`blocked`. The new
`item_blueprint_variable_table_live_proof_pending` blocker retains fresh
guarded browser create/update/reopen, packed UTI readback, Toolset
Save/Build/reopen, and applicable NWN inspection. The remaining Item property
matrix, overall Area CRUD/authoring objective, full 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, container, service, watcher, browser, Chrome launch, capture, live
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## 174. Continued implementation checkpoint — 2026-08-30 (retained ground Item nested `ItemList` offline CAS)

Primary Aurora Item constructor, inventory initializer, ground-Item
reader/writer, and common inventory reader/writer decompilation close the
native mode-`1` nested `ItemList` profile. Ground Items own one primary list
of complete embedded Items, use `Repos_PosX:Word` and `Repos_Posy:Word`, omit
an empty list, and do not allocate or publish `Equip_ItemList`. Mode-`0`
Dropable/Pickpocketable flags and mode-`3` Infinite do not belong to this
storage path. No xoreos or other GPL source was used.

The retained-only offline implementation is complete. Exact immutable source
provenance records every physical child ordinal, TemplateResRef, and repository
coordinate. The backend parser, projector, source-reparse planner, paired
GIT/GIC writer, repository, and candidate readback support reorder, removal,
and Word-coordinate changes. Each target child is cloned from the retained
source struct, receives its new list ordinal, and changes only the two
coordinate Words; every opaque embedded Item member, unrelated GIT field, and
paired GIC byte remains preserved. Empty target removes `ItemList`. New nested
Items, identity changes, Equip authoring, inventory flags, malformed storage,
duplicates, stale compare-and-swap values, and no-op mutations fail closed.

The frontend HTTP adapter, Area mapper, workspace validation, scene cloning,
draft materializer, provenance helpers, and Item Properties dialog share the
same detached source/target model. ResRefs remain read-only. The dialog permits
bounded coordinate changes, reorder, and removal, exposes no Add path, and
blocks incomplete targets. A JSDOM regression covers Apply, cancel/reopen, OK,
Save, immutable source provenance, and persisted target state.

Accepted sequential resource-safe verification is 36 focused backend
functional assertions, 13 capability-catalog assertions, 860 focused frontend
unit assertions, and one Save/reopen regression. Both production builds pass
under the one-GiB Node heap ceiling. Capability revision `2026-08-30.107`
records the audit and keeps `objects_item_authoring` `partial`/`blocked`; the
new `ground_item_inventory_list_live_proof_pending` blocker retains guarded
browser evidence, packed GFF readback, exact-candidate Toolset
Save/Build/reopen, and any gameplay-visible NWN claim.

The remaining Item property matrix, overall Area CRUD/authoring objective,
full 99-tileset Add/Render certification, and independent PathConnect/WOK
proof remain open. No Docker command, container, service, watcher, browser,
Chrome launch, capture, live Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used. This checkpoint does not promote
Item authoring or the overall Area program to complete.

## 175. Continued implementation checkpoint — 2026-08-30 (retained ground Item static `VisTransformList` offline CAS)

Primary Aurora ground-Item and common visual-transform reader/writer
decompilation closes one exact static base-scope profile. Physical absence is
the default vector. Present storage is mutation-authoritative only as one
case-sensitive `VisTransformList : List`, one type-`6` child with
`Scope:Int=0`, and ten exact type-`0` controller structs containing static
`TimerType:Int=0`, `ValueTo:Float`, and `LerpType:Int=0`. Animation speed is
exactly one; the nine authored values are finite binary32 and satisfy the
bounded scale, degree, and native-translation profile. Legacy, animated,
multi-scope, aliased, malformed, default-present, and unsafe storage remains
preserve-only. No xoreos or other GPL source was used.

The retained-instance offline path is implemented end to end. Backend domain,
parser, repository, projector, source-reparse planner, paired GIT/GIC writer,
and candidate compiler support absence-to-present creation,
present-to-present controller replacement, and present-to-absence removal.
The exact Item ordinal and source vector form CAS authority; unrelated GIT
members remain unchanged, paired GIC is byte-identical, deterministic output
is verified, and whole-candidate readback precedes revision-fenced atomic
publication.

Frontend HTTP validation, Area mapping, workspace parsing, history cloning,
gizmo/Adjust Location rules, and scene mutations keep three roles separate:
immutable `source.itemVisualTransform`, mutable exact native
`itemProperties.visualTransform`, and renderer/UI `visualTransform`.
Mutations synchronize native binary32 target and scene presentation, while the
saved-draft boundary rejects any drift. A JSDOM regression proves Apply,
reopen, local Save, immutable source retention, native axis mapping, and one
coherent persisted target.

Accepted sequential resource-safe evidence is `41/41` focused backend
visual-transform assertions, `7/7` complete module-snapshot repository
assertions, `70/70` focused frontend domain/rules/clone/mutation/regression
assertions, `14/14` HTTP/mapper/workspace-boundary assertions, and both
production builds. Every test runner used one worker and the one-GiB Node heap
ceiling. Capability revision `2026-08-30.108` records the audit and test matrix
while keeping `objects_item_authoring` `partial`/`blocked`; the new
`ground_item_static_visual_transform_live_proof_pending` blocker retains fresh
guarded browser, exact packed-GIT, Toolset Save/Build/reopen, and any applicable
NWN renderer evidence.

The remaining Item property matrix, overall Area CRUD/authoring objective,
full 99-tileset Add/Render certification, and independent PathConnect/WOK
proof remain open. No Docker command, container, service, watcher, browser,
Chrome launch, capture, live Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used. This checkpoint does not promote
Item authoring or the overall Area program to complete.

## 176. Continued implementation checkpoint — 2026-08-30 (dynamic effective-catalog ground Item UTI construction)

Primary Aurora common Item, UTI-wrapper, ground-Item, and inventory
reader/writer decompilation closes the first dynamic effective-catalog UTI
construction profile. The immutable profile
`effective-catalog-uti-item-copy-v1` binds stable catalog ID, native ResRef and
Tag, exact object key, byte size, SHA-256, `UTI `/`V3.2`/root identity, and the
current effective `baseitems.2da` ModelType. No xoreos or other GPL source was
used.

The offline implementation is complete for UTIs whose `ItemList` and
`Equip_ItemList` are absent or empty. The frontend admits only exact metadata,
retains binary-free provenance through catalog mapping, drag/drop, scene
cloning, history, undo, and draft materialization, and leaves incomplete
legacy rows preview-only. The backend projector validates the provenance,
the effective catalog repository re-resolves the exact winner, and the
candidate compiler rechecks key, size, digest, GFF identity, native ResRef,
BaseItem row, ModelType, and empty dependency closure before writing.

The paired GIT/GIC writer reparses at most one MiB, canonicalizes all four
ModelType appearance families, common Item defaults, ordered PropertiesList,
optional VarTable, placement, and UTI Comment-to-GIC storage. Unknown,
duplicated, differently cased, wrongly typed, out-of-range, or nested-inventory
state fails closed. Whole-pair deterministic readback remains part of the
writer transaction. Four new candidate negatives prove byte-size drift, stale
catalog precedence, a missing effective BaseItem row, and a forbidden UTI
dependency closure.

Diagnosability is implemented through the best-effort
`area_dynamic_item_blueprint_copy.v1` port and Nest adapter. Successful
compilation emits the ordered resolve, identity, parse, baseitems admission,
profile admission, write, and readback stages using only low-cardinality
fields. A dedicated test proves that telemetry sink failure cannot change Area
compilation or publication behavior.

Accepted sequential resource-safe evidence is `12/12` dynamic writer,
`572/572` projector, `142/142` candidate compiler, `61/61` effective-template
repository, `13/13` capability-catalog, `7/7` module-wiring, `37/37` focused
frontend provenance/mapper/placement, and `42/42` workspace regression-smoke
assertions. Both production builds pass with a one-GiB Node heap ceiling. The
workspace regression emits existing React `act(...)` warnings but has zero
failed assertions.

Capability revision `2026-08-30.109` records the implementation while keeping
`objects_item_authoring` `partial`/`blocked`. Fresh guarded browser Save/reopen,
packed GIT/GIC readback, Toolset Save/Build/reopen, and applicable NWN visual
inspection remain release blockers. Dynamic non-empty UTI `ItemList` and
`Equip_ItemList` construction remains a separate mandatory stage, along with
the remaining Item matrix, overall Area CRUD/authoring closure, full
99-tileset Add/Render certification, and independent PathConnect/WOK proof.
No Docker command, container, service, watcher, browser, Chrome launch,
capture, live Toolset/NWN process, mutation test, sub-agent, xoreos source, or
other GPL source was used. This checkpoint does not promote Item authoring or
the overall Area program to complete.

## 177. Continued implementation checkpoint — 2026-08-30 (recursive dynamic UTI inventory construction)

Primary Aurora UTI and ground-Item inventory reader/writer decompilation closes
the reference-to-embedded conversion contract for dynamic non-empty
`ItemList` and `Equip_ItemList`. UTI mode `1` stores ordinary inventory as
`InventoryRes` plus Word repository coordinates and equipment as one
`EquippedRes` under an eighteen-slot one-hot struct mask. Area GIT storage
recursively replaces those references with complete embedded Item instances;
ordinary children retain repository coordinates, equipped children retain
their slot mask, and wrapper-only `PaletteID`/`Comment` do not enter nested
instances. No xoreos or other GPL source was used.

The effective catalog repository now resolves the exact current UTI closure
depth-first, deduplicated by first discovery, and rejects stale/missing
winners, malformed reference grammar, duplicate or unordered equipment slots,
cycles, and resource-budget violations. The candidate compiler binds every
dependency BaseItem to the same effective `baseitems.2da` table as the root,
retains a ModelType for every immutable dependency, and reports successful
non-empty admission as `nestedInventoryState=expanded`.

The paired writer independently verifies all dependency identities and
digests, rejects missing and unused closure members, repeats cycle and budget
checks, and emits deterministic recursively embedded Item structures with
native `(-1,-1,-1)` position and `(0,1)` orientation defaults. Project safety
limits are depth 8, 1024 expanded reference occurrences, 256 unique UTIs,
16 MiB cumulative unique dependency bytes, and 1 MiB per UTI; these are
resource policy, not asserted Aurora engine maxima.

Accepted sequential resource-safe evidence is `17/17` dynamic writer/readback,
`142/142` candidate-compiler, `63/63` effective-template repository, and
`13/13` capability-catalog assertions plus the bounded backend production
build. Capability revision `2026-08-30.110` records the new audit and coverage
while keeping `objects_item_authoring` `partial`/`blocked`.

Fresh guarded browser Save/reopen, packed GIT/GIC inspection, Toolset
Save/Build/reopen, and applicable NWN runtime inspection remain release gates.
The remaining Item matrix, overall Area CRUD/authoring closure, full 99-tileset
Add/Render certification, and independent PathConnect/WOK proof remain open.
No Docker command, container, service, watcher, browser, Chrome launch,
capture, live Toolset/NWN process, mutation test, sub-agent, xoreos source, or
other GPL source was used. This checkpoint does not promote Item authoring or
the overall Area program to complete.

## 178. Continued implementation checkpoint — 2026-08-30 (Item-blueprint nested inventory authoring)

The Item-blueprint authoring path now covers canonical non-empty UTI
`ItemList` and `Equip_ItemList` references end to end offline. The additive API
contract carries ordered `{resRef,x,y}` ordinary entries and ordered
`{resRef,slotMask}` equipment entries. Strict boundaries enforce lowercase
Aurora ResRefs, Word coordinates, eighteen unique ascending one-hot equipment
slots, a 1024-entry combined budget, exact keys, and no self-reference or
normalization.

Before publishing a created or overwritten UTI, the backend resolves every
unique reference against the exact current effective catalog winner, verifies
object key, size, digest, native UTI identity and ResRef, validates the returned
immutable dependency closure, and rejects missing, stale, malformed, or
update-created cyclic graphs. The UTI writer emits exact native reference
lists, reparses the result, and requires ordered readback equality. Catalog
metadata exposes both lists, bounded counts, and the source digest needed for
subsequent recursive dynamic Area-Item construction.

The frontend Items-mode wizard owns detached editable targets for ordinary
add/edit/reorder/remove and equipment add/edit-slot/remove. Contract mapping,
scene cloning, property drafts, local-draft persistence, and payload creation
all use the same fail-closed domain reader. The property window labels both
lists `ACTIVE_NOW` only for wizard targets and disables Apply/OK while an entry
is incomplete or invalid; retained Area Items retain their independent
provenance-bound authority.

Accepted sequential one-worker verification is `39/39` backend schema and UTI
writer/readback assertions, `2/2` catalog reference-lifecycle assertions,
`13/13` capability-catalog assertions, `87/87` focused frontend assertions,
and `2/2` regression-smoke assertions. Both production builds pass under the
one-GiB Node heap ceiling; the frontend build reports only the existing
large-chunk advisory. Capability revision `2026-08-30.111` records the new
audit and keeps `objects_item_authoring` `partial`/`blocked` with
`item_blueprint_nested_inventory_live_proof_pending`.

Fresh guarded browser create/update/reopen, exact catalog and packed Area
readback, Toolset Save/Build/reopen, any applicable NWN runtime claim, the
remaining Item/native-object matrix, overall Area CRUD/authoring closure, full
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. No Docker command, container, service, watcher, browser, Chrome
launch, capture, Toolset/NWN action, mutation test, sub-agent, xoreos source,
or other GPL source was used. This checkpoint does not promote Item authoring
or the overall Area program to complete.

## 179. Continued implementation checkpoint — 2026-08-30 (retained ground-Item exact-catalog `ItemList` additions)

Retained type-`0` Area ground Items can now add ordinary mode-`1` `ItemList`
children from exact current effective UTI provenance. The additive target is a
strict retained/effective-blueprint union. Retained entries keep immutable
source ordinals; new entries carry the exact template ID, native ResRef, source
profile, object key, byte size, SHA-256, Tag, and repository Word coordinates.
Unknown keys, partial or mixed shapes, loose ResRefs, stale identities, and
count or byte budget violations fail closed.

The backend projector keeps the complete retained-only expected source for
compare-and-swap. The candidate compiler re-resolves each distinct current
effective UTI winner and its immutable recursive dependency closure, binds all
BaseItems to one effective table, and forwards only verified bytes and
ModelTypes. The paired writer handles absent, empty, and present source
storage, interleaves cloned retained and recursively expanded new children,
uses the native embedded position/orientation sentinels, preserves unrelated
GIT and paired GIC data, and requires exact ordered whole-candidate readback.

The frontend property window derives selectable options only from exact
current catalog provenance, revalidates that provenance at insertion, and
does not expose loose ResRef authoring. Retained identities stay read-only;
both entry forms support repository-coordinate edit, reorder, and removal.
Viewport wiring, detached clone, local-draft persistence, Apply, Cancel,
reopen, OK, and local Save preserve the exact union while immutable source CAS
remains retained-only.

Accepted sequential resource-safe evidence is five backend suites with
`1658/1658` assertions, eight focused frontend files with `91/91` assertions,
`13/13` capability-catalog assertions, and the complete frontend
regression-smoke gate with `40/40` files and `130/130` assertions. Both
production builds pass under the one-GiB Node heap ceiling; the frontend
reports only its existing large-chunk advisory. Capability revision
`2026-08-30.112` records the slice and retains `objects_item_authoring` as
`partial`/`blocked` with
`ground_item_inventory_dynamic_add_live_proof_pending`.

Before the accepted broad rerun, three stale regression fixtures were repaired:
retained Item instance state no longer expects blueprint-only Cost Table on
Basic, and Sound mutation coverage now binds exact native source/target
storages and independent MinDistance semantics. Existing React `act(...)`
warnings remain non-failing test-harness debt; the gate has zero failed
assertions.

Fresh guarded browser add/Save/reopen, packed GIT/GIC inspection, Toolset
Save/Build/reopen, applicable NWN runtime inspection, the remaining native
object matrix, overall Area CRUD/authoring closure, full 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, container, service, watcher, browser, Chrome launch, capture,
Toolset/NWN action, mutation test, sub-agent, xoreos source, or other GPL source
was used. This checkpoint does not promote Item authoring or the overall Area
program to complete.

## 180. Continued implementation checkpoint — 2026-08-30 (active tile-plan source-freshness fail-closed admission)

The authoritative 99-tileset active-plan wrapper now enforces fresh local
runtime-source identity verification for every allowed `status`, `next`, and
`capture` command. Previously, the canonical package scripts supplied the
required flag but a direct wrapper invocation could omit it, report
`runtimeSourceIdentity: null`, and advertise a capture action despite a stale
immutable build profile. The wrapper-owned final argument closes that
operator-bypass path, including option-like override attempts.

The test was observed failing before implementation and now passes. The
active-plan binding regression and the independent matrix control-plane
regression both pass sequentially with a one-GiB Node heap. A direct active
`status` now compares expected digest `69f9c763...` with observed digest
`fe8389ad...` and returns `runtime_build_reprofile_required`. A direct active
`next` returns `chunk: null` and `captureIntegration: null`; it cannot direct
the operator into a futile capture or runtime launch.

The durable audit is
`backend/docs/aurora-reverse/tile-add-connect-active-plan-source-freshness-audit-2026-08-30.md`.
Active v12 remains at `0/3378` accepted chunks across 99 tilesets and 53,700
rows. This checkpoint proves only offline admission safety; it does not refresh
the immutable profile, advance Add/Render coverage, or establish independent
PathConnect/WOK, Toolset, or NWN proof. No Docker command, container, service,
watcher, browser, Chrome launch, capture, Toolset/NWN action, mutation test,
sub-agent, xoreos source, or other GPL source was used.

## 181. Continued implementation checkpoint — 2026-08-30 (retained Store editor Comment offline CAS and Properties flow)

Primary Aurora Store reader/writer decompilation and the immutable native
paired-record fixture close one exact existing-Store editor field:
ordinal-paired GIC `StoreList[11].Comment : CExoString`. The contract admits a
NUL-free value of at most 4,096 UTF-16 code units, preserves whitespace, and
requires exact source/target compare-and-swap. It grants no authority for Store
commerce, pricing, inventory, scripts, variables, identity, or runtime merchant
behavior. No xoreos or other GPL source was used.

The backend parser, snapshot repository, draft projector, mutation planner,
candidate compiler, paired writer, persisted readback, and atomic publication
now carry that bounded mutation. Comment-only publication changes the matching
GIC field and requires GIT, ARE, and IFO byte preservation. The additive
diagnostic contract is content-free and failure of its telemetry sink cannot
affect validation or publication.

The frontend HTTP boundary, Area mapper, detached scene provenance, clone,
local-draft validation, and Store property draft carry the exact admitted
value. The Store Properties window exposes only the verified Comment subset,
with Apply/Cancel/OK/reopen semantics and explicit preserve-only messaging for
unproven families. The stable sidebar Properties action now includes Stores.
Because a retained Store is a logical authoring object without a canvas mesh,
sidebar selection, context-menu routing, and Properties routing no longer
depend on canvas render membership for that object kind; wrong-kind signals
still fail closed.

The test was observed red before each missing UI policy was implemented. Fresh
sequential verification now passes `10/10` focused frontend files with
`870/870` assertions using one worker and the repository one-GiB heap cap. The
frontend production build passes with only the existing large-chunk advisory.
The durable Aurora audit is
`backend/docs/aurora-reverse/area-existing-store-editor-comment-audit-v1-2026-08-30.md`.

Fresh guarded browser Save/reopen, exact packed-candidate inspection, Toolset
Save/Build/reopen, applicable NWN inspection, arbitrary Store-template Create,
commerce/inventory/script/variable authoring, the remaining native-object
matrix, overall Area CRUD/authoring closure, full 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, container, service, watcher, browser, Chrome launch, capture,
Toolset/NWN action, mutation test, sub-agent, or external GPL source was used.
This checkpoint does not promote Store authoring or the overall Area program to
complete.

## 182. Continued implementation checkpoint — 2026-08-30 (retained Store complete commerce-vector offline CAS and Properties flow)

Primary Aurora Store reader/writer decompilation, the immutable retail
`x2_merc_dye.UTM` fixture, and independent native Toolset record freeze the
complete retained-Store commerce vector: `MarkUp`, `MarkDown`, `BlackMarket`,
`BM_MarkDown`, `IdentifyPrice`, `MaxBuyPrice`, and `StoreGold`. Admission is
all-or-nothing with exact labels and native types; signed integers remain
int32, `BlackMarket` admits only Byte `0` or `1`, and physically missing fields
are never synthesized from Aurora reader defaults.

The backend now carries detached typed metadata through snapshot parsing and
repository projection, produces a complete-vector compare-and-swap from the
Area draft, validates immutable Store family ordinal and source freshness,
and changes only the seven existing scalar GIT fields. Candidate readback
requires the complete target vector, original field ordering, and exact
preservation of every unrelated member. Commerce may coexist with paired-GIC
Comment in one mutation; commerce-only publication keeps GIC and module IFO
bytes unchanged while ARE/GIT/GIC and IFO state remain in the existing atomic
revision-fenced transaction.

The frontend HTTP boundary, Area mapper, source/target scene state, workspace
validation, deep clone, and local-draft Save/reopen all carry the same exact
vector. Store Properties exposes independent Comment and Commerce
`ACTIVE_NOW`/`PRESERVE_ONLY` states, six signed-integer controls and one
Black-Market checkbox. Unsupported Store inventory, scripts, variables,
restrictions, and other fields remain explicitly preserve-only.

Resource-safe sequential verification passed 2,069 focused backend assertions,
878 focused frontend assertions, and both production builds under the one-GiB
Node heap ceiling. The frontend build reports only the existing large-chunk
advisory. The durable audit is
`backend/docs/aurora-reverse/area-existing-store-commerce-audit-v1-2026-08-30.md`.

The dedicated content-free `area_store_commerce_cas.v1` port emits bounded
parse/admit/plan/write/readback outcomes and cannot affect compilation when its
sink fails. Guarded browser Save/reopen, exact packed-candidate inspection,
Toolset Save/Build/reopen,
applicable NWN inspection, arbitrary Store-template Create, remaining Store
families, overall Area CRUD/authoring closure, full 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, container, service, watcher, browser, Chrome launch, capture,
Toolset/NWN action, mutation test, sub-agent, xoreos source, or other GPL source
was used. This checkpoint does not promote Store authoring or the overall Area
program to complete.

## 183. Continued implementation checkpoint — 2026-08-30 (retained Store script-ResRef pair offline CAS and Properties flow)

Primary Aurora Store reader/writer decompilation, the immutable retail
`x2_merc_dye.UTM` fixture, and an independent retained native Toolset record
freeze the exact two-member Store script vector: `OnOpenStore : ResRef` and
`OnStoreClosed : ResRef`. Admission is all-or-nothing with exact labels,
native types, case, and cardinality. Source values admit Aurora ASCII ResRefs
of at most sixteen code units; mutation targets are canonical lowercase
ResRefs. Physical absence is never synthesized from Aurora reader defaults,
and no script resource existence or runtime execution is inferred.

The backend parser and snapshot repository expose detached metadata, while the
draft projector and immutable-ordinal planner produce a complete-pair
compare-and-swap. The paired writer changes only the two existing GIT ResRef
values, keeps GIC and IFO byte-identical for scripts-only mutations, preserves
field ordering and unrelated GIT members, and requires complete candidate
readback. Comment, commerce, and script members can coexist on one Store
mutation. The dedicated content-free
`area_store_script_resrefs_cas.v1` telemetry port covers
parse/admit/plan/write/readback and cannot change compilation when its sink
fails.

The frontend HTTP boundary, Area mapper, immutable source and editable target,
workspace validation, clone, local-draft persistence, Store Properties dialog,
and viewport Apply/Cancel/OK flow carry the same exact pair. The controls are
enabled only for complete source provenance plus a complete canonical target;
partial, malformed, wrong-family, or provenance-free state fails closed or
remains preserve-only at the relevant boundary.

Accepted sequential resource-safe verification is `18/18` backend domain and
parser assertions, `1914/1914` retained projection/planner/writer/repository
assertions, `149/149` complete candidate-compiler assertions, `8/8` frontend
domain assertions, `885/885` focused frontend boundary and UI assertions, and
`1/1` Store Properties regression-smoke assertion, plus `13/13` capability
catalog assertions. Both production builds pass; the frontend reports only
its existing large-chunk advisory. Capability
revision `2026-08-30.114` records the audit and coverage while retaining
`objects_store_authoring` as `partial`/`blocked`.

Fresh guarded browser Save/reopen, exact packed-candidate inspection, Toolset
Save/Build/reopen, NWN execution proof for both hooks, arbitrary Store-template
Create, variables/restrictions/editable inventory, remaining Store/native
object families, overall Area CRUD/authoring closure, full 99-tileset
Add/Render certification, and independent PathConnect/WOK proof remain open.
No Docker command, container, service, watcher, browser, Chrome launch,
capture, Toolset/NWN action, mutation test, sub-agent, xoreos source, or other
GPL source was used. This checkpoint does not promote Store authoring or the
overall Area program to complete.

## 184. Continued implementation checkpoint — 2026-08-31 (retained Store ordered VarTable offline CAS and Properties flow)

Primary Aurora Store reader/writer decompilation and the independently
source-closed generic variable grammar freeze the exact Store-owned native
`VarTable`: optional list storage, struct type `0`, exact `Name`/`Type`/`Value`
fields, ordered duplicate-name retention, and native Int/Float/CExoString
types. Physical absence is the exact empty table. The shared bounded safety
profile remains 1024 entries, signed int32, finite exact binary32, NUL-free
names and strings, and the existing text budget. No xoreos or other GPL source
was used.

The backend now parses detached Store variable provenance, fingerprints and
clones it in the snapshot repository, projects a complete-table
compare-and-swap, and replans against the exact immutable type-`11` Store
ordinal. The paired writer creates, replaces, or removes only the Store-owned
GIT `VarTable`, preserves GIC and IFO bytes plus restrictions, inventory,
identity, field order, and unrelated GIT members, and requires typed ordered
candidate readback. Comment, commerce, script-ResRef, and variable mutations
may coexist on the same retained Store. The content-free
`area_store_variable_table_cas.v1` telemetry covers
parse/admit/plan/write/readback and cannot affect compilation when its sink
fails.

The frontend HTTP boundary, Area mapper, immutable source provenance, editable
target, workspace validation, detached clone, and local-draft persistence all
carry the exact ordered table. Store Properties exposes add/edit/remove/reorder
only for a complete retained source profile. Invalid, unsupported,
wrong-family, or provenance-free state fails closed or remains preserve-only;
Apply, Cancel, OK, reopen, and local Save keep source and target detached.

Accepted sequential resource-safe verification passes eight backend suites
with `2099/2099` tests and nine frontend files with `907/907` tests. Both
production builds pass under the repository one-GiB Node heap ceiling; the
frontend reports only its pre-existing large-chunk advisory. Capability
revision `2026-08-31.115` records the implementation while retaining
`objects_store_authoring` as `partial`/`blocked`. The durable Aurora audit is
`backend/docs/aurora-reverse/area-existing-store-variable-table-audit-v1-2026-08-30.md`.

Fresh guarded browser Save/reopen, exact packed-candidate inspection, Toolset
Save/Build/reopen, applicable NWN inspection, arbitrary Store-template Create,
Store restrictions and editable inventory, the remaining native-object
matrix, overall Area CRUD/authoring closure, full 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, container, service, watcher, browser, Chrome launch, capture,
Toolset/NWN action, mutation test, sub-agent, xoreos source, or other GPL source
was used. This checkpoint does not promote Store authoring or the overall Area
program to complete.

## 185. Continued implementation checkpoint — 2026-08-31 (retained Store ordered restriction-pair offline CAS and Properties flow)

Primary Aurora Store reader/writer decompilation and retained first-party Store
evidence freeze `WillNotBuy` and `WillOnlyBuy` as independent ordered lists.
Each admitted entry is native struct type `0x00017e4d` with exactly one
`BaseItem : Int`; physical order, duplicates, cross-list overlap, and the
difference between absent and present-empty source lists are retained. Values
must bind to the exact effective `baseitems.2da`; no sorting, deduplication,
coercion, clipping, or inferred mutual exclusion is authorized. No xoreos or
other GPL source was used.

The backend now parses and clones exact restriction provenance, fingerprints
the effective item-base catalog dependency, projects one complete-pair
compare-and-swap, replans against the current immutable type-`11` Store ordinal
and catalog identity, and applies the native presence policy through the paired
GIT writer. Typed ordered candidate and persisted readback are mandatory.
Comment, commerce, script-ResRef, VarTable, and restriction mutations may
coexist without rewriting paired GIC, ARE, IFO, inventory, or unrelated GIT
members. Content-free `area_store_restrictions_cas.v1` telemetry covers
parse-source, bind-catalog, admit-profile, plan, write, and readback while sink
failure remains isolated from compilation and publication.

The frontend now carries exact restriction provenance through its HTTP
boundary, Area mapper, immutable source metadata, independently editable
target, workspace admission, detached clone, and local-draft persistence. Store
Properties exposes two catalog-backed ordered list editors only when the source
ordinal and exact `baseitems.2da` identity are current. Apply, Cancel, OK,
reopen, add/remove/reorder, duplicates, and preserve-only catalog drift are
covered; the complete validated `editableScene` remains the sole Area-update
transport.

Accepted sequential resource-safe verification passes eight backend suites
with `1154/1154` tests and nine frontend files with `920/920` tests. Backend and
frontend production builds pass under the repository one-GiB Node heap ceiling;
the frontend reports only its pre-existing large-chunk advisory. Capability
revision `2026-08-31.116` records the implementation while retaining
`objects_store_authoring` as `partial`/`blocked`. The durable Aurora audit is
`backend/docs/aurora-reverse/area-existing-store-restrictions-audit-v1-2026-08-31.md`.

Fresh guarded browser Save/reopen, exact packed-candidate inspection, Toolset
Save/Build/reopen, applicable NWN merchant inspection, arbitrary Store-template
Create, editable Store inventory, the remaining native-object matrix, overall
Area CRUD/authoring closure, full 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, container,
service, watcher, browser, Chrome launch, capture, Toolset/NWN action, mutation
test, sub-agent, xoreos source, or other GPL source was used. This checkpoint
does not promote Store authoring or the overall Area program to complete.

## 186. Continued implementation checkpoint — 2026-08-31 (retained Store five-repository inventory offline CAS and Properties flow)

Primary Aurora Toolset decompilation and independent retained GIT/UTM readbacks
freeze the complete Store inventory topology: five mode-`3` repositories in
physical type order `[0,4,2,3,1]`, a 10-by-10 grid, at most 255 pages, exact
`TemplateResRef`/`BaseItem`/`Repos_PosX`/`Repos_Posy`, and optional canonical
`Infinite : Byte = 1`. The Toolset repacks retained items in vector order by
page, row, and column using BaseItem `InvSlotWidth`/`InvSlotHeight`; repository
coordinates are therefore compare-and-swap evidence and derived output, not
editable inputs. No xoreos or other GPL source was used.

The backend now parses only the complete five-bucket profile, binds every
retained entry to the exact effective `baseitems.2da`, fingerprints and clones
the provenance, projects and independently replans one immutable-ordinal CAS,
and deterministically repacks changed buckets. The paired writer clones full
embedded Item structs, permits only same-bucket reorder/removal and `Infinite`
changes, rewrites sequential child types plus derived coordinates and canonical
Infinite presence, preserves opaque Item fields and paired GIC/IFO state, and
requires exact candidate readback. Content-free
`area_store_inventory_cas.v1` telemetry covers parse-source, bind-catalog,
admit-profile, plan, pack, write, and readback; sink failure cannot affect
compilation.

The frontend HTTP boundary now retains inventory provenance and BaseItem slot
dimensions. Area mapping, workspace admission, local persistence, detached
history cloning, Store property drafts, materialization, and Apply/Cancel/OK
carry the exact five-bucket state. Store Properties exposes read-only retained
identity with reorder, remove, and Infinite controls only when the native
ordinal and catalog dimensions are current. It deliberately exposes no Add,
BaseItem edit, cross-bucket move, embedded-property edit, or raw-coordinate
control.

Fresh resource-safe verification passes eight bounded backend suites with
`1162/1162` assertions, seven focused frontend files with `915/915` assertions,
the Store Apply/Cancel/OK regression with `1/1`, and both production builds.
Capability revision `2026-08-31.117` records the implementation while keeping
`objects_store_authoring` `partial`/`blocked`. The complete one-worker frontend
unit gate reaches `5086/5088`; two independently reproducible failures remain
in untouched Placeable/render-package and material-sidedness tests and are not
caused by this Store slice.

Fresh guarded browser Save/reopen, exact packed-candidate inspection, Toolset
Save/Build/reopen, applicable NWN merchant inventory behavior, arbitrary
Store-template Create, remaining native-object matrices, overall Area CRUD and
authoring closure, full 99-tileset Add/Render certification, and independent
PathConnect/WOK proof remain open. No Docker command, container, service,
watcher, browser, Chrome launch, capture, Toolset/NWN action, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Store authoring or the overall Area program to complete.

## 187. Continued implementation checkpoint — 2026-08-31 (combined retained Creature Class ID + ClassLevel offline CAS)

The existing primary Aurora audit already source-closed both sides of the
combined edit: a class-ID transition clears the changed slot's spell graph and
revalidates `StartingPackage`, while a level transition validates the complete
level vector and atomically derives the persisted HP triplet. Aurora Web now
composes those proven effects in one same-roster compare-and-swap instead of
rejecting a simultaneous edit. No automatic level-up, spell legality, slot
creation/removal/reorder, or other unproven behavior is inferred.

The backend mutation carries source and target class IDs and levels, the exact
canonical `ClassList` graph hash, destructive-clear confirmation, source and
target package rows, both immutable table identities, and the coupled HP
target. Projection emits one owner for `ClassList`; raw-GIT replanning compares
physical graph/source values without requiring non-GFF catalog descriptors;
compiler admission independently resolves the current `classes.2da` and
`packages.2da`; and the writer changes `Class`, `ClassLevel`, changed-slot
spell lists, `StartingPackage`, and HP in one candidate while preserving
unchanged spell graphs, opaque siblings, GIC, ARE, IFO, and unrelated fields.

The frontend materializer, workspace validator, and Creature properties window
admit the combined edit only when class catalog, package catalog, exact
ClassList level state, and racial/HP provenance agree. Class ID and level
controls are active together under that contract. Missing destructive-clear
confirmation or missing HP coupling is rejected before Area Update export.

Resource-safe verification passes `38/38` focused backend assertions,
`64/64` Area Update atomic-publication assertions, and `614/614` focused
frontend assertions. Capability revision `2026-08-31.119` removes only the
combined class-identity/level implementation blocker. Slot-count mutation,
arbitrary spell-graph authoring, browser Save/reopen, Toolset Save/Build/reopen,
NWN runtime behavior, the remaining object matrices, the full 99-tileset
Add/Render certification, and independent PathConnect/WOK proof remain open.
No Docker command, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## 188. Continued implementation checkpoint — 2026-08-31 (retained Creature tail-only ClassList resize)

Primary Aurora Toolset decompilation closes the slot-count state machine as a
contiguous non-empty prefix of at most eight class selectors. The first slot
cannot be cleared, a later slot can be cleared only when every following slot
is empty, and selecting the first empty slot enables only its successor. The
reciprocal writer emits only non-empty destinations. Aurora Web therefore
implements append-at-tail and truncate-at-tail only; middle insertion,
deletion, reorder, zero slots, and inferred spell behavior remain rejected.

The backend carries one exact graph- and catalog-bound compare-and-swap from
projection through raw-GIT replanning, compiler admission, typed GFF mutation,
candidate readback, and atomic ARE/GIT/GIC/IFO publication. Retained prefix
structs, spell graphs, opaque siblings, and unrelated resources are preserved;
appended structs contain canonical `Class` plus `ClassLevel`, while truncation
requires explicit destructive confirmation. StartingPackage and the HP
triplet are coupled to the target vector.

The frontend exposes exact-count tail controls, locks retained prefix entries
during resize, reloads target package rows, derives HP, and fail-closes both
workspace persistence and final materialization on stale or incomplete
provenance. Verification passes `46/46` focused backend, `64/64` Area Update
integration, `635/635` focused frontend, the complete `21/21` Creature
Properties regression, `13/13` capability-catalog assertions, and both
production builds. Capability revision
`2026-08-31.120` removes only the slot-count implementation blocker.

Browser Save/reopen remains blocked by the unchanged `getaddrinfo ENOTFOUND
mysql` runtime fingerprint, so no service or capture was retried. Toolset
Save/Build/reopen, NWN behavior, arbitrary class spell graphs, the remaining
object-property matrix, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.

## 189. Continued implementation checkpoint — 2026-08-31 (retained Trigger exact Tag offline CAS and Properties flow)

Primary Aurora Toolset decompilation closes the bounded existing-Trigger Tag
lane. Common Trigger reader `FUN_00656720` and reciprocal writer
`FUN_0065752c` access the same exact `Tag : CExoString`; the placed type-`1`
writer delegates to that common serializer. Frozen `TDLGTRIGGEREDIT` RCDATA
sets `eTag.MaxLength = 32`, while the complete `eTagChange` VMT handler invokes
only shared same-control tag validation and establishes no coupled persisted
field. Empty and whitespace-bearing values remain exact; missing, duplicate,
wrong-case, wrong-type, over-budget, aliased, or synthesized storage remains
preserve-only. No xoreos or other GPL source was used.

The backend now carries immutable presence-sensitive Tag provenance through
the parser, HTTP contract, workspace fingerprint, projection, raw-GIT ordinal
CAS planning, exact field replacement, independent candidate readback, and
revision-fenced atomic publication. The integration case publishes exact
`"  AREA_EXIT  "`, reports one Trigger property update, and keeps paired GIC
plus module IFO bytes identical. Tag may coexist with the independently proven
Trigger position and polygon lanes without claiming any other Trigger field.

The frontend carries detached `source.triggerTag` through HTTP mapping,
workspace admission, clone/history, local persistence, and final export.
Trigger Properties exposes an active exact editor only with complete source
authority; otherwise it visibly preserves. Apply, Cancel, reopen, OK, and
Ctrl+S local Save retain whitespace exactly and never overwrite provenance.
The full App regression also found and closed a real UI integration gap:
Trigger/Encounter logical properties are now reachable from the object list
even when their canvas overlays are disabled.

Resource-safe verification passes seven bounded backend suites with
`2130/2130` assertions, the new exact atomic-publication case with `1/1`,
fourteen admitted frontend files including the Trigger Workspace regression
with `966/966`, the targeted hidden-overlay property gate with `1/1`, and both
production builds. A broader combined 15-file frontend run reports `1075`
passing assertions and one independent dirty-tree Placeable
material-sidedness failure; that unchanged loader expectation is outside this
Trigger slice and was not rewritten. Capability revision `2026-08-31.121`
records the implementation while truthfully retaining
`objects_trigger_authoring` as `partial`/`blocked`.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen, NWN Tag lookup behavior, remaining Trigger and other
object-property matrices, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Trigger authoring or the overall Area program to complete.

## 190. Continued implementation checkpoint — 2026-08-31 (retained Encounter exact Tag offline CAS and Properties flow)

Primary Aurora Toolset decompilation closes the bounded existing-Encounter
Tag lane independently of Trigger. Common Encounter reader `FUN_0055d470` and
writer `FUN_0055dbf8` access the same exact `Tag : CExoString`; placed writer
`FUN_0055e71c` delegates the type-`7` GIT payload to that serializer. Frozen
`TDLGENCOUNTEREDIT` RCDATA sets `eTag.MaxLength = 32`, and the complete
`eTagChange` VMT handler invokes only the shared same-control validator. Empty
and whitespace-bearing values remain exact; missing, duplicate, wrong-case,
wrong-type, over-budget, aliased, or synthesized storage remains
preserve-only. No xoreos or other GPL source was used.

Aurora Web now carries detached presence-sensitive `encounterTag` provenance
through parser and HTTP boundaries, scene mapping, workspace admission,
history cloning, Properties Apply/Cancel/reopen/OK, and local Save. The backend
projects one immutable-ordinal compare-and-swap, replans it against raw GIT,
replaces only the canonical native field, verifies the candidate, and
publishes through the existing revision fence. The atomic case writes exact
`"  GNOLL_AMBUSH  "`, reports one Encounter property update, and preserves
complete GIC plus module IFO bytes. The same shared object-Tag validator now
serves Item, Trigger, and Encounter wrappers without normalizing values.

Resource-safe verification passes `2167/2167` assertions across nine backend
suites, all `66/66` Area Update atomic-publication cases, `971/971` assertions
across fourteen focused frontend unit/regression files, and both production
builds. Capability revision `2026-08-31.122` records the implementation while
truthfully retaining Encounter authoring as `partial` and release-blocked.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen, applicable NWN Encounter behavior, spawn points,
remaining Encounter and other object matrices, complete 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, container, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.
This checkpoint does not promote Encounter authoring or the overall Area
program to complete.

## 191. Continued implementation checkpoint — 2026-08-31 (retained Encounter exact `Active : BYTE` offline CAS and Properties flow)

Primary Aurora Toolset decompilation closes the bounded retained-Encounter
Active storage lane. Common reader `FUN_0055d470` reads exact `Active : BYTE`
into native offset `0x48`, common writer `FUN_0055dbf8` writes that same byte,
and placed writer `FUN_0055e71c` delegates the type-`7` GIT payload without
coupling GIC. Frozen `TDLGENCOUNTEREDIT` RCDATA exposes `xbActive`; Properties
load treats every nonzero byte as checked, while Save canonicalizes the boolean
to `0` or `1`. Aurora Web therefore admits only exact source bytes `0|1` and
keeps missing, duplicate, wrong-case, wrong-type, or noncanonical storage
preserve-only. No xoreos or other GPL source was used.

The backend now carries detached `{ activeByte: 0|1 }` provenance through Area
detail and processing, projects a member-level changed compare-and-swap,
replans against one immutable Encounter ordinal, replaces only the canonical
GIT byte, verifies exact candidate readback, and publishes through the existing
revision fence. Active may coexist with independently admitted Encounter Tag
on one property mutation. The atomic integration changes `1` to `0`, reports
one Encounter property update, and preserves complete GIC plus module IFO
bytes.

The frontend admits the exact API tuple, detaches source and target storage,
and exposes an Encounter-only checkbox in the polygon Properties shell. The
control is enabled only as `ACTIVE_NOW`; otherwise it renders disabled as
`PRESERVE_ONLY`. Apply commits polygon, Tag, and Active atomically through the
viewport port/facade, while Cancel, reset, reopen, history cloning, workspace
admission, and local Save preserve immutable source provenance. The external
FE-BE contract and low-cardinality `area_encounter_active_cas.v1` observability
taxonomy record the same boundary.

Resource-safe verification passes `2246/2246` assertions across ten bounded
backend unit suites, all `67/67` Area Update atomic-publication cases,
`974/974` assertions across ten focused frontend unit files, two focused
regression-smoke cases, and both production builds. Capability revision
`2026-08-31.123` records the slice while keeping Encounter authoring `partial`
and release-blocked. An auxiliary backend selection surfaced one unrelated
dirty-worktree Item-export expectation for missing `script.onused`; the four
Encounter pipeline suites in that selection pass independently.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed Active readback, NWN activation behavior,
spawn configuration, remaining Encounter and other object-property matrices,
complete 99-tileset Add/Render certification, and independent PathConnect/WOK
proof remain open. No Docker command, container, service, watcher, browser,
Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used. This checkpoint does not promote Encounter
authoring or the overall Area program to complete.

## 192. Continued implementation checkpoint — 2026-08-31 (retained Encounter exact `PlayerOnly : BYTE` offline CAS and Properties flow)

Primary Aurora Toolset decompilation closes the bounded retained-Encounter
PlayerOnly storage lane. Common reader `FUN_0055d470` reads exact
`PlayerOnly : BYTE` into native offset `0xcc`, common writer `FUN_0055dbf8`
writes that same byte, and placed writer `FUN_0055e71c` delegates the type-`7`
GIT payload without coupling GIC. Frozen `TDLGENCOUNTEREDIT` RCDATA exposes
`xbPlayerTriggeredOnly`; Properties load treats every nonzero byte as checked,
while Save canonicalizes the boolean to `0` or `1`. Aurora Web therefore
admits only exact source bytes `0|1` and keeps missing, duplicate, wrong-case,
wrong-type, or noncanonical storage preserve-only. No xoreos or other GPL
source was used.

The backend now carries detached `{ playerOnlyByte: 0|1 }` provenance through
Area detail, snapshot cloning, and processing identity; projects a member-level
changed compare-and-swap; replans it against one immutable Encounter ordinal;
replaces only the canonical GIT byte; verifies exact candidate readback; and
publishes through the existing revision fence. PlayerOnly may coexist with
independently admitted Encounter Tag and Active on one property mutation. The
atomic integration changes `1` to `0`, reports one Encounter property update,
and preserves complete GIC plus module IFO bytes.

The frontend admits the exact API tuple, detaches immutable source storage from
the target, validates workspace persistence, and exposes an Encounter-only
Player Triggered Only checkbox in the Aurora-shaped polygon Properties shell.
The control is enabled only as `ACTIVE_NOW`; otherwise it is disabled as
`PRESERVE_ONLY`. Apply commits polygon, Tag, Active, and PlayerOnly atomically
through the viewport port/facade, while Reset, Cancel, reopen, OK, history
cloning, and local Save retain immutable source provenance. The external FE-BE
contract and low-cardinality `area_encounter_player_only_cas.v1` taxonomy
record the same boundary.

Resource-safe verification passes five focused backend suites with
`1989/1989` assertions, all `68/68` Area Update atomic-publication cases,
`988/988` assertions across ten focused frontend unit files, two focused
regression-smoke cases, and both production builds. Capability revision
`2026-08-31.124` records this slice while keeping Encounter authoring `partial`
and release-blocked.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed PlayerOnly readback, NWN player-only
activation behavior, spawn configuration, remaining Encounter and other
object-property matrices, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Encounter authoring or the overall Area program to complete.

## 193. Continued implementation checkpoint — 2026-08-31 (retained Encounter exact `Reset : BYTE` offline CAS and Properties flow)

Primary Aurora Toolset decompilation and immutable installed-binary evidence
close the bounded retained-Encounter Reset storage lane. Common reader
`FUN_0055d470` reads exact `Reset : BYTE` into native offset `0x4c`, common
writer `FUN_0055dbf8` writes the same byte, and placed writer `FUN_0055e71c`
delegates the type-`7` GIT payload without coupling GIC. Frozen
`TDLGENCOUNTEREDIT` RCDATA plus its published-method table bind `xbResetClick`
to code VA `0x00499fe8`; that handler changes enabled-state presentation only.
Properties load treats any nonzero byte as checked, while Save canonicalizes
the checkbox to `0` or `1`. Aurora Web therefore admits only exact source
bytes `0|1`; missing, duplicate, wrong-case, wrong-type, or noncanonical
storage remains preserve-only. No xoreos or other GPL source was used.

The backend now carries detached `{ resetByte: 0|1 }` provenance through Area
detail, snapshot cloning, and processing identity; projects a member-level
changed compare-and-swap; replans it against one immutable Encounter ordinal;
replaces only the canonical GIT Reset byte; verifies exact candidate readback;
and publishes through the existing revision fence. Reset may coexist with Tag,
Active, and PlayerOnly on one mutation. Focused writer coverage proves exact
retention of ResetTime and Respawns. Atomic integration changes Reset `0` to
`1`, reports one Encounter property update, and preserves complete GIC plus
module IFO bytes.

The frontend admits the exact API tuple, detaches immutable source storage from
the editable target, validates workspace persistence, and exposes an
Encounter-only Reset checkbox in the Aurora-shaped polygon Properties shell.
The control is enabled only as `ACTIVE_NOW`; otherwise it is disabled as
`PRESERVE_ONLY`. Apply commits polygon, Tag, Active, PlayerOnly, and Reset
atomically through the viewport port/facade. Reset-to-source, Cancel, reopen,
OK, history cloning, and local Save retain immutable source provenance. The
external FE-BE contract and low-cardinality `area_encounter_reset_cas.v1`
taxonomy record the same boundary.

Resource-safe verification passes six focused backend suites with `2010/2010`
assertions, all `69/69` Area Update atomic-publication cases, `1002/1002`
assertions across ten focused frontend unit files, the focused Workspace
Apply/Cancel/reopen/OK/local-Save regression, and both production builds.
Capability revision `2026-08-31.125` records this slice while keeping Encounter
authoring `partial` and release-blocked. The ordinary backend ts-jest runner
exceeded its enforced 1 GiB heap on the large shared dirty tree; the repository
bounded isolated-module runner completed the exact same focused suites without
raising the heap ceiling.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed Reset readback, NWN reset/exhaustion
behavior, spawn configuration, remaining Encounter and other object-property
matrices, complete 99-tileset Add/Render certification, and independent
PathConnect/WOK proof remain open. No Docker command, container, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Encounter authoring or the overall Area program to complete.

## 194. Continued implementation checkpoint — 2026-08-31 (retained Encounter exact `ResetTime : INT` offline CAS and Properties flow)

Primary Aurora Toolset decompilation and immutable installed-form evidence
close the bounded retained-Encounter ResetTime storage lane. Common reader
`FUN_0055d470` reads exact `ResetTime : INT` into native member `0x14`, common
writer `FUN_0055dbf8` writes the same member, and placed writer `FUN_0055e71c`
delegates the type-`7` GIT payload without coupling GIC. Published form members
bind the Reset Time up/down control to `+0x4a0`; initialization sets the exact
inclusive range `1..32000`. Properties load and save transfer the same member.
The Reset handler changes enabled state only, while Save reads ResetTime
regardless of Reset. Missing, duplicate, wrong-case, wrong-type, or out-of-range
storage remains preserve-only. No runtime time unit is claimed, and no xoreos
or other GPL source was used.

The backend now carries detached `{ resetTime: integer 1..32000 }` provenance
through Area detail, snapshot cloning, and processing identity; projects a
member-level changed compare-and-swap; replans it against one immutable
Encounter ordinal; replaces only the canonical GIT INT; verifies exact
candidate readback; and publishes through the existing revision fence.
ResetTime may coexist with Tag, Active, PlayerOnly, and Reset on one property
mutation. Atomic integration changes `60` to `90`, reports one Encounter
property update, and preserves Reset, Respawns, complete GIC, module IFO, and
every unrelated field.

The frontend admits the exact API tuple, detaches immutable source storage from
the editable target, validates workspace persistence, and exposes a bounded
Encounter-only Reset Time spinner. The control is `ACTIVE_NOW` only with exact
ResetTime provenance and an editable Reset target; otherwise it is disabled as
`PRESERVE_ONLY`. Toggling Reset off disables but does not erase ResetTime,
matching the native Save path. Apply commits polygon, Tag, Active, PlayerOnly,
Reset, and ResetTime atomically through the viewport port/facade. Reset-to-
source, Cancel, reopen, OK, history cloning, and local Save retain immutable
source provenance. The external FE-BE contract and low-cardinality
`area_encounter_reset_time_cas.v1` taxonomy record the same boundary.

Resource-safe verification passes six focused backend suites with `2024/2024`
assertions, all `70/70` Area Update atomic-publication cases, `1021/1021`
assertions across ten focused frontend unit files, the focused Workspace
Apply/Cancel/reopen/OK/local-Save regression, and both production builds.
Capability revision `2026-08-31.126` records this slice while keeping Encounter
authoring `partial` and release-blocked.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed ResetTime readback, NWN reset timing and
respawn behavior, spawn configuration, remaining Encounter and other object-
property matrices, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Encounter authoring or the overall Area program to complete.

## 195. Continued implementation checkpoint — 2026-08-31 (retained Encounter exact `SpawnOption : INT` offline CAS and Toolset gating)

Primary Aurora Toolset decompilation, installed form resources, and the exact
English TLK close the bounded retained-Encounter SpawnOption lane. Common
reader `FUN_0055d470` and writer `FUN_0055dbf8` access the same exact
`SpawnOption : INT` member; placed writer `FUN_0055e71c` delegates the type-`7`
GIT payload without coupling GIC. Frozen `TDLGENCOUNTEREDIT` RCDATA binds the
drop-down to member `+0x414`. Constructor `FUN_004964a8` appends exactly two
localized rows in serialized-index order: TLK `7216` is `Continuous` at index
`0`, and TLK `67134` is `Single Shot` at index `1`. Save and load transfer that
selected index unchanged. Load then enables the Reset family only for index
`0`; switching modes changes enabled state but does not erase Reset,
ResetTime, or Respawns. Aurora Web therefore admits only exact source indices
`0|1`; missing, duplicate, aliased, wrong-case, wrong-type, or noncanonical
storage remains preserve-only. No runtime spawn semantics are inferred, and
no xoreos or other GPL source was used.

The backend carries detached `{ spawnOption: 0|1 }` provenance through Area
detail, snapshot cloning, and processing identity; projects a member-level
changed compare-and-swap; replans it against one immutable Encounter ordinal;
replaces only the canonical GIT INT; verifies exact candidate readback; and
publishes through the existing revision fence. SpawnOption may coexist with
Tag, Active, PlayerOnly, Reset, and ResetTime in one mutation. The atomic case
changes index `1` to `0`, reports one Encounter property update, and preserves
Reset, ResetTime, Respawns, complete GIC, module IFO, and every unrelated
field.

The frontend admits only the two exact indices, freezes their Toolset labels,
detaches immutable source storage from the editable target, validates local
workspace persistence, and exposes the exact combo in the Encounter
Properties shell. Reset and ResetTime fail closed without exact SpawnOption
provenance. Choosing Single Shot disables both controls without deleting their
draft targets; returning to Continuous restores editing when their own
provenance is exact. Apply commits polygon, Tag, Active, PlayerOnly, Reset,
ResetTime, and SpawnOption atomically through the viewport port/facade.
Reset-to-source, Cancel, reopen, OK, history cloning, and local Save retain
immutable source provenance. The external FE-BE contract and low-cardinality
`area_encounter_spawn_option_cas.v1` taxonomy record the same boundary.

Resource-safe verification passes six focused backend suites with
`2032/2032` assertions, all `71/71` Area Update atomic-publication cases,
`1042/1042` assertions across eleven focused frontend unit files, the focused
Workspace Apply/Cancel/reopen/OK/local-Save regression, and both production
builds. Capability revision `2026-08-31.127` records this slice while keeping
Encounter authoring `partial` and release-blocked.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed SpawnOption readback, NWN continuous and
single-shot behavior, spawn points, remaining Encounter and other object-
property matrices, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Encounter authoring or the overall Area program to complete.

## 196. Continued implementation checkpoint — 2026-08-31 (retained Encounter exact `Respawns : INT` offline CAS and Toolset-shaped Infinite flow)

Primary Aurora Toolset decompilation and immutable installed-form evidence
close the bounded retained-Encounter Respawns storage lane. Common reader
`FUN_0055d470` and reciprocal writer `FUN_0055dbf8` access the same exact
`Respawns : INT` member; placed writer `FUN_0055e71c` delegates the type-`7`
GIT payload without coupling GIC. Frozen `TDLGENCOUNTEREDIT` RCDATA binds the
finite input and `Infinite Respawn` checkbox. Initialization sets the exact
finite range `0..32000`; native Save stores that finite value when unchecked
and signed sentinel `-1` when checked. Native load maps `-1` to finite display
value `0` plus checked Infinite. Reset and SpawnOption affect enabled-state
presentation without erasing the persisted member. Missing, duplicate,
aliased, wrong-case, wrong-type, or out-of-range storage remains preserve-only.
No runtime respawn-count semantics are inferred, and no xoreos or other GPL
source was used.

The backend carries detached `{ respawns: -1 | integer 0..32000 }` provenance
through Area detail, snapshot cloning, and processing identity; projects a
member-level changed compare-and-swap; replans it against one immutable
Encounter ordinal; replaces only the canonical GIT INT; verifies exact
candidate readback; and publishes through the existing revision fence.
Respawns may coexist with Tag, Active, PlayerOnly, Reset, ResetTime, and
SpawnOption in one mutation. The atomic case changes `0` to `-1`, reports one
Encounter property update, and preserves Reset, ResetTime, SpawnOption,
complete GIC, module IFO, and every unrelated field.

The frontend admits the exact storage union, detaches immutable source from the
editable target, validates local workspace persistence, and exposes the native-
shaped finite spinner plus Infinite checkbox in the Encounter Properties shell.
The sentinel reopens as finite `0` plus Infinite checked. Reset and continuous
SpawnOption gate presentation; the finite editor additionally requires
Infinite unchecked. Toggling those controls never erases the finite draft or
source storage, and independently valid changes still compose atomically.
Apply/Cancel/reopen/OK, history cloning, local Save, the external FE-BE
contract, and low-cardinality `area_encounter_respawns_cas.v1` diagnostics
record the same boundary.

Resource-safe verification passes six focused backend suites with
`2047/2047` assertions, all `72/72` Area Update atomic-publication cases,
`1053/1053` assertions across ten focused frontend unit files, the complete
frontend regression-smoke suite (`43/43` files and `134/134` tests), and both
production builds. Capability revision `2026-08-31.128` records this slice
while keeping Encounter authoring `partial` and release-blocked.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed finite and sentinel Respawns readback,
NWN respawn behavior, spawn points, remaining Encounter and other object-
property matrices, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Encounter authoring or the overall Area program to complete.

## 197. Continued implementation checkpoint — 2026-08-31 (retained Encounter exact `MaxCreatures`/`RecCreatures` pair offline CAS and coupled Properties flow)

Primary Aurora Toolset decompilation and immutable installed-form evidence
close the bounded retained-Encounter creature-count lane. Common reader
`FUN_0055d470` reads exact `MaxCreatures : INT` and `RecCreatures : INT` into
members `0x17` and `0x18`; reciprocal writer `FUN_0055dbf8` writes the same
members, while placed writer `FUN_0055e71c` delegates the type-`7` GIT payload
without coupling GIC. Constructor defaults are Maximum `4` and Minimum `2`.
Frozen `TDLGENCOUNTEREDIT` RCDATA exposes the native `Maximum Creatures` and
`Minimum Creatures` controls, both bounded to `1..8`. Their handlers couple a
crossing edit: lowering Maximum below Minimum lowers Minimum, and raising
Minimum above Maximum raises Maximum. Aurora Web therefore admits and authors
only one complete exact pair satisfying `1 <= Minimum <= Maximum <= 8`.
Missing, duplicate, wrong-case, wrong-type, out-of-range, or incoherent
storage remains preserve-only. No runtime spawning semantics are inferred,
and no xoreos or other GPL source was used.

The backend carries detached `{ maxCreatures, recCreatures }` provenance
through Area detail, snapshot cloning, and processing identity; projects one
complete changed compare-and-swap; replans it against one immutable Encounter
ordinal; requires one canonical INT of each exact label; replaces only those
two existing fields; verifies exact candidate readback; and publishes through
the existing revision fence. The pair composes with Tag, Active, PlayerOnly,
Reset, ResetTime, SpawnOption, and Respawns in one mutation. Atomic integration
changes `4/2` to `6/5`, reports one Encounter property update, and preserves
complete GIC, module IFO, and every unrelated field.

The frontend admits the exact pair, detaches immutable source from the editable
target, validates local workspace persistence, and exposes both bounded
controls in the Encounter Properties shell. Domain reducers implement the two
native crossing corrections without clamping malformed input. Apply commits
the complete Encounter tuple atomically through the viewport port/facade;
Reset-to-source, Cancel, reopen, OK, history cloning, and local Save retain
immutable source provenance. Telemetry records only a bounded changed flag;
the external FE-BE contract and low-cardinality
`area_encounter_creature_counts_cas.v1` taxonomy record the same boundary.

Resource-safe verification passes six focused backend suites with
`2049/2049` assertions, all `73/73` Area Update atomic-publication cases,
`1061/1061` assertions across ten focused frontend unit files, the complete
frontend regression-smoke suite (`43/43` files and `134/134` tests), and both
production builds. Capability revision `2026-08-31.129` records this slice
while keeping Encounter authoring `partial` and release-blocked. The ordinary
backend ts-jest profile reached its enforced 1 GiB heap during the focused
catalog check; the repository bounded isolated-module profile passed the same
assertions without raising the heap ceiling.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed pair readback, NWN spawn-count behavior,
spawn points, remaining Encounter and other object-property matrices, complete
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. No Docker command, container, service, watcher, browser, Chrome,
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or other
GPL source was used. This checkpoint does not promote Encounter authoring or
the overall Area program to complete.

## 198. Continued implementation checkpoint — 2026-09-01 (retained Encounter exact five-event-script ResRef tuple offline CAS and Properties flow)

Primary Aurora Toolset decompilation and immutable installed-form evidence
close the bounded retained-Encounter event-script storage lane. Common reader
`FUN_0055d470` reads exact `OnEntered`, `OnExit`, `OnExhausted`, `OnHeartbeat`,
and `OnUserDefined` ResRefs into distinct Encounter members; reciprocal writer
`FUN_0055dbf8` emits the same five fields. Properties save/load functions
`FUN_00498278` and `FUN_00498b48` bind all five members to the frozen
`TDLGENCOUNTEREDIT` Events surface. Aurora Web admits source values matching
`[A-Za-z0-9_]{0,16}` but authors only `[a-z0-9_]{0,16}` targets. Missing,
partial, duplicate, aliased, wrong-case-label, wrong-type, over-budget, or
malformed storage remains preserve-only. The five fields are one complete
atomic provenance and CAS unit; this slice does not infer script compilation
or runtime event semantics and uses no xoreos or other GPL source.

The backend carries detached complete tuple provenance through Area detail,
snapshot cloning, and processing identity; projects a tuple-level changed
compare-and-swap; replans it against one immutable Encounter ordinal; requires
one exact native ResRef field per label; replaces only those five values; and
requires exact candidate plus persisted readback before revision-fenced
publication. The tuple composes with Tag, Active, PlayerOnly, Reset, ResetTime,
SpawnOption, Respawns, creature counts, origin, and polygon mutations while
preserving field order, every unrelated GIT member, complete GIC, ARE, and IFO.

The frontend validates the complete source tuple, detaches immutable source
from the editable target, and exposes five bounded inputs in the Encounter
Properties shell. A mixed-case retained source may be preserved unchanged;
changed output is emitted only after all five target values are canonical.
Apply/Cancel/reopen/OK, history cloning, and local Save keep source provenance
independent. The viewport exports `scripts={expectedValue,value}` only when the
tuple changed, so an unchanged legacy mixed-case tuple does not block an
independent admitted property or geometry update. The external FE-BE contract
and low-cardinality `area_encounter_script_resrefs_cas.v1` taxonomy freeze the
same boundary without logging script values.

Resource-safe verification passes backend domain/parser `13/13`, projector
`622/622`, planner `418/418`, writer `968/968`, capability catalog `13/13`, and
all `73/73` Area Update atomic-publication cases. Frontend focused validation
passes `1057/1057` assertions, the dedicated Encounter Save/reopen regression
passes `1/1`, the complete regression-smoke gate passes `43/43` files and
`134/134` tests, and both production builds pass. The first combined ts-jest
attempt reached the enforced 1 GiB heap; the same assertions then passed as
four bounded sequential runs without raising the limit. Capability revision
`2026-09-01.130` records this slice while Encounter authoring remains partial.

Difficulty authoring remains deliberately blocked: its numeric storage is
catalog-bound to the effective `EncDifficulty.2da` row set and cannot be
implemented safely by guessing a range. Fresh guarded browser Save/reopen also
remains blocked by the unchanged `getaddrinfo ENOTFOUND mysql` fingerprint and
was not retried. Exact-candidate Toolset Save/Build/reopen with packed tuple
readback, NWN event dispatch, spawn points, remaining Encounter and other
object-property matrices, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Encounter authoring or the overall Area program to complete.

## 199. Continued implementation checkpoint — 2026-09-01 (retained Encounter catalog-bound exact `Faction : DWord` offline CAS and Properties selector)

Primary Aurora Toolset decompilation and immutable installed-resource evidence
close the bounded retained-Encounter faction lane. Common reader
`FUN_0055d470` reads exact `Faction : DWord`; reciprocal writer `FUN_0055dbf8`
writes the same member. Encounter Properties population `FUN_00497798` loops
the physical module faction vector beginning at ordinal `1`, deliberately
excluding row `0`; save `FUN_00498278` stores `selectedIndex + 1`, and load
`FUN_00498b48` restores `Faction - 1`. Aurora Web therefore binds authoring to
the exact immutable module `repute.fac` catalog and admits only physical rows
`1..factionCount-1`. Missing, duplicate, wrong-case-label, wrong-type, row `0`,
out-of-catalog, stale-catalog, or malformed storage remains preserve-only. No
numeric range, display-name identity, runtime behavior, xoreos code, or other
GPL source was inferred or used.

The backend carries detached source value plus catalog digest/count through
Area detail, snapshot cloning, and processing identity; projects a changed
catalog-bound compare-and-swap; replans it against one immutable Encounter
ordinal; freshly re-resolves the exact catalog; replaces only the canonical
GIT DWord; and requires candidate plus persisted readback before revision-
fenced publication. The faction mutation composes with origin, polygon, Tag,
Active, PlayerOnly, Reset, ResetTime, SpawnOption, Respawns, creature counts,
and event scripts while preserving field order, every unrelated GIT member,
complete GIC, ARE, IFO, and all `repute.fac` bytes.

The frontend validates and detaches exact catalog/source provenance across the
HTTP, scene, workspace, history, and clone boundaries. Encounter Properties
exposes a catalog-derived selector containing only physical rows `1..count-1`,
keeps row `0` unavailable, and never uses a label as mutation identity. Apply
exports the faction member only when the final value changed; reset-to-source,
Cancel, reopen, OK, and local Save retain immutable source provenance. The
external FE-BE contract and low-cardinality
`area_encounter_faction_cas.v1` taxonomy freeze the same boundary without
logging faction IDs, names, ordinals, hashes, object IDs, or paths.

Resource-safe verification passes backend domain/parser `21/21`, projector
`623/623`, planner `419/419`, writer `971/971`, candidate compiler `162/162`,
capability catalog `13/13`, and all `74/74` Area Update atomic-publication
cases. Ten focused frontend files pass `1056/1056`; the complete regression-
smoke gate passes `43/43` files and `134/134` tests; both production builds
pass. Capability revision `2026-09-01.131` records this slice while Encounter
authoring remains `partial` and release-blocked. The broader general GFF parser
suite still has two pre-existing ground-item metadata round-trip failures
unrelated to this faction lane; the dedicated Faction parser suite passes.

Difficulty authoring remains deliberately blocked until Aurora Web owns a
complete effective `EncDifficulty.2da` catalog. Fresh guarded browser
Save/reopen remains blocked by the unchanged `getaddrinfo ENOTFOUND mysql`
fingerprint and was not retried. Exact-candidate Toolset Save/Build/reopen with
packed Faction readback, NWN faction behavior, spawn points, remaining
Encounter and other object-property matrices, complete 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, container, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.
This checkpoint does not promote Encounter authoring or the overall Area
program to complete.

## 200. Continued implementation checkpoint — 2026-09-01 (retained Encounter catalog-bound exact `Difficulty` / `DifficultyIndex` pair offline CAS and Properties selector)

Primary Aurora Toolset decompilation and immutable installed-resource evidence
close the bounded retained-Encounter Difficulty lane. Common reader
`FUN_0055d470` reads exact `Difficulty : INT` and `DifficultyIndex : INT`;
reciprocal writer `FUN_0055dbf8` writes the same two members. Properties
catalog loader `FUN_004973ec` reads every physical `EncDifficulty.2da` row's
exact `STRREF` and `VALUE`, preserving row order. Save `FUN_00498278` stores
the numeric `VALUE` plus selected physical row index; load `FUN_00498b48` and
the combo handler `FUN_00499dcc` project the selected row's `VALUE` back to
the numeric control. Aurora Web therefore treats both fields as one complete
catalog-coherent authoring unit and admits only `-20..20` values matching the
selected effective row. Missing, partial, duplicate, wrong-case-label, wrong-
type, out-of-range, stale-catalog, incoherent, or absent storage remains
preserve-only. Display labels are TLK presentation, never mutation identity,
and no xoreos or other GPL source was used.

The backend now resolves exact effective `encdifficulty.2da` through module,
ordered-HAK, and vanilla precedence, localizes admitted `STRREF` values through
the effective TLK, and exposes a bounded immutable catalog descriptor plus
physical rows in Area detail. It retains exact raw pair storage; carries
detached source pair and catalog digest/count through snapshot identity;
projects one changed pair CAS; replans it against one immutable Encounter
ordinal; freshly resolves and validates the catalog; replaces only the two
canonical GIT INT fields; and requires exact candidate plus persisted readback
before revision-fenced publication. Difficulty composes atomically with all
previously admitted Encounter properties and geometry while preserving field
order, complete GIC, ARE, IFO, source 2DA bytes, and every unrelated value.

The frontend validates and deep-clones catalog/source provenance across HTTP,
scene, workspace, history, and viewport boundaries. Encounter Properties
exposes a selector derived only from exact physical catalog rows, detaches the
editable target, marks malformed or incoherent retained storage
`PRESERVE_ONLY`, and exports both fields only when the selected pair changed.
Apply, reset-to-source, Cancel, reopen, OK, clone/history, and local Save keep
immutable source and catalog provenance. The external FE-BE contract and low-
cardinality `area_encounter_difficulty_cas.v1` taxonomy freeze the same
boundary without logging numeric values, row indices, labels, STRREFs,
hashes, object IDs, source keys, or paths.

Resource-safe verification passes eight bounded backend suites with
`2278/2278` tests, the capability catalog `13/13`, and all `75/75` Area Update
atomic-publication cases. Nine focused frontend files pass `1061/1061`; the
dedicated Encounter Difficulty Apply/Cancel/reopen/OK/local-Save regression
passes `1/1`; the complete regression-smoke gate passes `43/43` files and
`134/134` tests; both production builds pass; and `git diff --check` exits `0`
with only repository-wide LF-to-CRLF warnings. Capability revision
`2026-09-01.132` records this slice while Encounter authoring remains
`partial` and release-blocked.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed pair readback, NWN difficulty behavior,
spawn points, remaining Encounter and other object-property matrices,
complete 99-tileset Add/Render certification, and independent PathConnect/WOK
proof remain open. No Docker command, container, service, watcher, browser,
Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used. This checkpoint does not promote Encounter
authoring or the overall Area program to complete.

## 201. Continued implementation checkpoint — 2026-09-01 (retained Encounter exact inline `LocalizedName : CExoLocString` offline CAS and Properties Name control)

Primary Aurora Toolset decompilation, immutable retail UTE evidence, and the
installed Encounter Properties form close the bounded retained-Encounter name
lane. Common reader `FUN_0055d470` and reciprocal writer `FUN_0055dbf8` use the
native localized-string helper family for exact `LocalizedName`. Properties
load `FUN_00498b48` copies the complete value into dialog state and save
`FUN_00498278` copies the complete value back; the form exposes `Name`,
`eLocName`, and the adjacent localization button. Aurora Web therefore retains
complete native storage and permits mutation only for unsigned `strRef`
`0xffffffff` with zero or one non-empty identifier-`0` printable-ASCII entry,
bounded to 256 bytes. TLK-backed, multilingual, malformed, non-ASCII,
explicit-empty-entry, duplicate, wrong-label/type, or over-budget storage is
preserve-only. The retail `x2_gnoll001.UTE` TLK-backed name remains exact
negative authority. No display lookup is serialized and no xoreos or other GPL
source was used.

The backend now parses and retains the complete presence-sensitive storage,
deep-clones it through snapshot and processing identity, projects one changed
inline string CAS, replans it against one immutable type-`7` Encounter ordinal,
revalidates the exact complete source, replaces only the existing native type-
`12` value in place, and requires candidate plus persisted readback before
revision-fenced publication. The mutation composes with origin, polygon, Tag,
Active, PlayerOnly, Reset, ResetTime, SpawnOption, Respawns, creature counts,
event scripts, Faction, and Difficulty while preserving field order, every
unrelated GIT member, complete GIC, ARE, and IFO.

The frontend deep-copies source storage through HTTP, scene, workspace,
history, and clone boundaries and keeps editable target text detached. The
Basic-tab Name control is `ACTIVE_NOW` only for the admitted inline profile;
TLK-backed and otherwise unsupported values remain disabled and
`PRESERVE_ONLY`. Reset, Apply, Cancel, reopen, OK, and local Save keep immutable
source provenance. The viewport emits `{expectedValue,value}` only for a valid
changed target. The external FE-BE contract and low-cardinality
`area_encounter_localized_name_cas.v1` taxonomy freeze the same boundary while
prohibiting names, raw bytes, base64, TLK text, object IDs, hashes, paths, and
source keys from routine labels and logs.

Resource-safe verification passes seven focused backend suites with
`2213/2213` tests, all `75/75` Area Update atomic-publication cases, nine
focused frontend files with `1063/1063` tests, the dedicated Encounter
Save/reopen regression `1/1`, the complete frontend regression-smoke gate at
`43/43` files and `134/134` tests, and both production builds. Capability
revision `2026-09-01.133` records this slice while Encounter authoring remains
`partial` and release-blocked. The broader bounded backend unit gate remains
independently non-green at `436/447` suites and `7602/7626` tests: its `11`
failing suites cover pre-existing adjacent Catalog, Item metadata, template,
HTTP/VFX, placeable-lighting proof, Store metadata, Creature WalkRate,
bootstrap, and general Area GFF expectations; no failing assertion targets
Encounter LocalizedName.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed localized-string readback, NWN name
presentation, spawn points, remaining Encounter and other object-property
matrices, complete 99-tileset Add/Render certification, and independent
PathConnect/WOK proof remain open. No Docker command, container, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Encounter authoring or the overall Area program to complete.

## 202. Continued implementation checkpoint — 2026-09-01 (retained Encounter paired-GIC exact `Comment : CExoString` offline CAS and Properties Comments control)

Primary Aurora Toolset decompilation closes the bounded existing-Encounter
editor-comment lane. Placed-Encounter reader `FUN_0055e1f8` reads exact
same-index paired-GIC label `Comment` through the native CExoString helper into
the Encounter comment member; reciprocal writer `FUN_0055e71c` writes that
same member under the same exact label. The helper enforces native field type
`10`. Aurora Web admits only an already-present single type-`7` Encounter
field in equal-cardinality GIT/GIC `Encounter List` roots. Empty,
whitespace-only, multiline, and Unicode text remains exact up to 4096
ECMAScript UTF-16 code units. Missing, duplicate, wrong-case, wrong-type,
unpaired, NUL-bearing, or over-budget storage remains preserve-only and is
never synthesized. No xoreos or other GPL source was inspected or used.

The backend now parses and detaches `encounterMetadata.editorComment`, carries
it through snapshot cloning and content identity, projects one source-GIC-
digest-bound CAS, replans it against the exact retained Encounter ordinal,
revalidates the source pair, replaces only the paired-GIC field, and verifies
candidate plus persisted readback before revision-fenced publication. A
comment-only update keeps complete GIT, ARE, and IFO byte-identical; the writer
still composes atomically with every independently admitted Encounter GIT
property, transform, and polygon mutation.

The frontend validates and clones the HTTP metadata, retains immutable
`source.encounterEditorComment`, and keeps a detached
`encounterProperties.comments` target. Encounter Properties exposes a
4096-unit Comments textarea only as `ACTIVE_NOW` for exact provenance.
Workspace validation, history/clone, reset-to-source, Apply, Cancel, reopen,
OK, local Save, and export all preserve source/target separation. The external
FE-BE contract and low-cardinality `area_encounter_editor_comment_cas.v1`
taxonomy freeze the same boundary without logging comment text, object IDs,
ordinals, hashes, paths, source keys, or raw fields.

Resource-safe verification passes the backend projector `626/626`, planner
`421/421`, pair writer `975/975`, candidate compiler `167/167`, capability
catalog `13/13`, dedicated domain profile `4/4`, and Area Update atomic
publication `76/76`. The two new general-parser assertions pass; that broader
suite retains only its two pre-existing ground-item metadata failures. Focused
frontend HTTP/mapper/authoring/scene-mutation tests pass `474/474`, dedicated
domain/provenance tests pass `8/8`, and the real Encounter
Apply/Cancel/reopen/OK/local-Save regression passes `1/1`. Both production
builds pass. Immutable capability revision `2026-09-01.134` records the slice
while Encounter authoring remains `partial` and release-blocked.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed paired-GIC readback, spawn points,
remaining Encounter and other object-property matrices, complete 99-tileset
Add/Render certification, and independent PathConnect/WOK proof remain open.
No Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. This checkpoint does not promote Encounter authoring or the
overall Area program to complete.

## 203. Continued implementation checkpoint — 2026-09-01 (retained Encounter exact ordered GIT `VarTable` offline CAS and Properties variable editor)

Primary Aurora Toolset decompilation closes the bounded existing-Encounter
variable-table lane. Common Encounter reader `FUN_0055d470` calls the generic
variable reader `FUN_005e966c`; reciprocal common writer `FUN_0055dbf8` calls
generic writer `FUN_005e9f50`. Placed reader `FUN_0055e1f8` and writer
`FUN_0055e71c` route through those common functions before their placed-only
Geometry, SpawnPoint, and paired-GIC data. The generic path reads an optional
exact `VarTable` list in physical order, requires entry struct type `0`, and
dispatches `Name : CExoString`, `Type : DWord`, and type-specific `Value` for
INT `1`, FLOAT `2`, or CExoString `3`; the writer omits an empty table and
otherwise emits entries in their existing order. The direct-source audit pins
decompilation SHA-256
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
and symbol-index SHA-256
`394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`.
No xoreos or other GPL source was inspected or used.

Aurora Web applies the already-shared bounded web profile: at most 1024
entries; names at most 64 ECMAScript UTF-16 code units; strings at most 4096;
no NUL; signed int32; finite exact float32; and at most 1 MiB aggregate text.
Order, duplicate names, whitespace, and exact variants are preserved without
trim, normalization, sorting, or deduplication. The backend now parses and
detaches immutable Encounter provenance, deep-clones it through snapshot and
processing identity, projects one complete source-to-target CAS, replans it
against one immutable type-`7` ordinal, and uses the shared generic VarTable
writer with exact candidate and persisted readback. A non-empty target creates
or replaces the exact canonical member; an empty target removes it, matching
the proven native writer. Every unrelated GIT field plus complete GIC, ARE,
and IFO remains preserved under revision-fenced atomic publication.

The frontend validates and deep-clones ordered provenance across HTTP, scene,
workspace, history, and viewport boundaries. Encounter Properties exposes the
shared variable-table editor only as `ACTIVE_NOW` for admitted provenance and
supports add, edit, remove, and reorder while keeping the source immutable.
The real regression covers duplicate names, an INT update, a new FLOAT entry,
physical order, Apply, Cancel, reopen, OK, local Save, and exact source
provenance. The external FE-BE contract and low-cardinality
`area_encounter_variable_table_cas.v1` taxonomy freeze the same boundary while
prohibiting variable names/values, raw fields, object IDs, ordinals, hashes,
paths, and source keys from routine telemetry.

Resource-safe focused verification passes the backend domain profile `7/7`,
projector `627/627`, deletion planner `422/422`, pair writer `976/976`,
candidate compiler `167/167`, capability catalog `13/13`, and Area Update
atomic publication `76/76`. The two new Encounter parser assertions pass; the
broader parser file remains `321/323` only because of its two pre-existing
ground-item metadata expectations. Frontend domain/authoring files pass
`33/33`, the grouped HTTP/mapper/workspace/facade/dialog/clone/provenance gate
passes `1043/1043`, the viewport port passes `2/2`, and the expanded real
Encounter regression passes `1/1`. An inadvertent bounded full frontend unit
invocation completed `511/513` files and `5427/5429` tests; its two unrelated
existing failures concern placeable material side selection and a stale
placeable render-package expectation. Both production builds pass. Immutable
capability revision `2026-09-01.135` records the slice while Encounter
authoring remains `partial` and release-blocked.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Exact-candidate
Toolset Save/Build/reopen with packed VarTable readback, NWN runtime behavior,
spawn points, creature-list/runtime spawning authoring, remaining object-
property matrices, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. No Docker command, container,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Encounter authoring or the overall Area program to complete.

## 204. Continued implementation checkpoint — 2026-09-01 (retained Encounter `CreatureList.SingleSpawn` vector CAS)

Primary Aurora Toolset decompilation closes one additional bounded
existing-Encounter lane. Placed reader `FUN_0055e1f8` reaches common reader
`FUN_0055d444`, which calls `FUN_0055d8a8`; that function reads the exact
ordered `CreatureList` and, in both template-resolved and fallback branches,
reads `ResRef : ResRef`, `Appearance : Int`, `CR : Float`, and
`SingleSpawn : Byte`. Common writer `FUN_0055dbf8` calls `FUN_0055ddd0`, which
emits type-`0` entries in exact order as `Appearance`, `CR`, `ResRef`, and
`SingleSpawn`. The frozen decompilation SHA-256 is
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`;
the symbol-index SHA-256 is
`394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`.
No xoreos or other GPL source was inspected or used.

Aurora Web now admits at most 1024 exact type-`0` entries with signed-int32
Appearance, finite exact-float32 CR, `[A-Za-z0-9_]{1,16}` ResRef, and byte
`0|1` SingleSpawn. Count, physical order, duplicate ResRefs, Appearance, CR,
and ResRef remain immutable. The backend parses and detaches this full source
identity, hashes and clones it, projects one complete vector CAS, replans it
against the current immutable type-`7` ordinal, validates the exact nested
schema, and replaces only existing `SingleSpawn` bytes before whole-candidate
readback and revision-fenced publication. Added, removed, reordered, stale,
wrong-case, wrong-type, or identity-mutated lists fail closed.

The frontend validates and independently clones transport, scene, workspace,
history, and viewport state. Encounter Properties displays ResRef,
Appearance, and CR as immutable identity and exposes only one `Single Spawn`
checkbox per retained entry. The same target survives Apply, Cancel, reopen,
OK, and local Save while source provenance remains unchanged. The external
FE-BE contract and additive
`area_encounter_creature_single_spawn_cas.v1` telemetry taxonomy freeze this
boundary without allowing ResRefs, Appearance/CR values, object IDs,
ordinals, hashes, paths, source keys, or raw fields into routine telemetry.

Resource-safe focused verification passes the two new parser cases,
`804/804` backend domain/projector/candidate assertions, `423/423` planner
assertions, `977/977` pair-writer assertions, `1079/1079` frontend transport/
mapper/workspace/authoring/facade/clone/domain assertions, the expanded real
Encounter regression `1/1`, the full Area Update atomic-publication suite
`76/76`, and both production builds. Immutable capability
revision `2026-09-01.136` records the slice while aggregate Encounter
authoring and the overall Area program remain `partial` and release-blocked.

Fresh guarded browser Save/reopen remains blocked by the unchanged
`getaddrinfo ENOTFOUND mysql` fingerprint and was not retried. Native Toolset
Save/Build/reopen, NWN behavior, full CreatureList add/remove/reorder/template
replacement, spawn-point authoring, remaining object-property matrices,
complete 99-tileset Add/Render certification, and independent PathConnect/WOK
proof remain open. No Docker command, container, service, watcher, browser,
Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.

## 208. Continued implementation checkpoint — 2026-09-01 (dynamic current-effective Waypoint UTW construction)

Primary Aurora Toolset decompilation closes the arbitrary/current-effective
Waypoint construction semantics. The common reader/writer pair
`FUN_00658170` / `FUN_00658b4c` proves the exact common UTW field set and
canonical order; placed writer `FUN_00659bfc` proves native origin,
`XOrientation=cos(bearing)`, `YOrientation=-sin(bearing)`, and paired type-`5`
GIC Comment. `PaletteID` and Comment are excluded from GIT. The frozen
decompilation and index SHA-256 values remain
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
and `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE`.
No xoreos or other GPL source was inspected or used.

The additive profile `effective-catalog-utw-waypoint-copy-v1` now spans exact
effective-catalog indexing/listing, a binary-free frontend port and mapper,
bounded workspace pagination/cache, drag/local-draft provenance, backend
projection, current-winner key/size/SHA/GFF/ResRef/Tag validation, canonical
GIT construction, paired GIC construction, candidate readback, and atomic
ARE/GIT/GIC/IFO publication. Accepted gates are `11/11`, `633/633`,
`175/175`, `67/67`, `13/13`, `80/80`, `2/2`, and `37/37` across the dedicated
backend/frontend boundaries, and both production builds pass. Capability
revision `2026-09-01.140` records the slice.

Waypoint target-reference runtime behavior, guarded browser Save/reopen,
exact-candidate Toolset Save/Build/reopen, NWN behavior, remaining object and
property matrices, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. The unchanged browser blocker is
`getaddrinfo ENOTFOUND mysql` and was not retried. No Docker command, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. This checkpoint does
not promote Waypoint authoring or the overall Area program to complete.

## 209. Continued implementation checkpoint — 2026-09-01 (existing retained Waypoint exact `Tag` CAS)

Primary Aurora Toolset decompilation closes one additional bounded retained-
Waypoint lane. Common reader/writer `FUN_00658170` / `FUN_00658b4c` read and
write the exact case-sensitive `Tag : CExoString` member in type-`5`
`WaypointList`; frozen `TDLGWAYPOINTEDIT` RCDATA proves the 32-character native
control budget. Existing accepted native evidence proves Tag-only persisted
coupling without changes to template identity, position, bearing, or object
counts. The immutable decompilation/index and installed Toolset identities are
recorded in the dedicated audit. No xoreos or other GPL source was inspected
or used.

The implementation now spans presence-sensitive backend parse/storage,
hash/clone state, exact source-index compare-and-swap projection and planning,
in-place GIT replacement, candidate readback, GIC/IFO preservation, and
revision-fenced atomic publication. Frontend transport, mapper, workspace,
history clone, guarded facade/viewport ports, Scene Object List, hidden-marker
properties routing, context/sidebar routing, and Waypoint Properties
Apply/Cancel/OK/local-Save are connected end to end. Capability revision
`2026-09-01.141` records the slice while aggregate Waypoint authoring remains
`partial` and release-blocked.

Accepted resource-bounded verification is `38/38` focused backend assertions,
`81/81` full Area Update atomic-publication assertions, `13/13` capability
assertions, `1061/1061` focused frontend assertions, `18/18` Scene Object List
assertions, the targeted hidden-marker properties assertion, one real
Workspace regression, and both production builds. The ordinary Jest transform
hit its fixed 1 GiB heap before executing the large compiler suite; the
repository bounded transform passed the exact test without increasing memory.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
NWN lookup, the remaining Waypoint property matrix and target-reference
behavior, complete 99-tileset Add/Render certification, and independent
PathConnect/WOK proof remain open. The browser dependency blocker remains
`getaddrinfo ENOTFOUND mysql` and was not retried. No Docker command,
container, service, watcher, browser, Chrome, capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used. This
checkpoint does not promote Waypoint authoring or the overall Area program to
complete.

## 216. Continued implementation checkpoint — 2026-09-01 (identity-neutral tile render profiles)

Concrete tile model names no longer choose black crop/void rendering or mask
source-missing multi-cell group members in shared frontend code. Existing
offline visual calibrations are now immutable v1 data profiles selected only
by the exact source MDL SHA-256 delivered by the tile process contract. The
renderer consumes generic black-material and crop-mask policies and publishes
the selected profile revision, evidence state, and hash for diagnosis. Tests
also prove that a model rename does not change the policy path.

Three formerly hardcoded group companions now fail closed in agreement with
the 99-tileset source inventory: a sibling model is not accepted as source
closure. Focused frontend verification passes `59/59` and the production build
completed. Capability revision `2026-09-01.148` records the remediation while
`render_model_material_texture` remains `partial` and release-blocked. The
detailed evidence, hashes, and remaining blockers are recorded in
`docs/brainstorm/2026-09-01-area-tile-identity-neutral-render-profile-checkpoint.md`.

The naming-based `null`/`padding`/`tpad_*` placeholder classifier remains an
explicit identity-neutrality blocker because the current inventory uses the
same convention rather than an independent immutable source-status contract.
Live profile recertification, the source-frozen 99-tileset Add/Render and
adjacency matrix, 34 missing source models, and native PathConnect/WOK proof
also remain open. No live service or capture lane was started.

## 217. Continued implementation checkpoint — 2026-09-01 (typed tile certification dispositions)

The remaining frontend `null`/`padding`/`tpad_*` behavior branch is removed.
Workspace composition now maps the immutable tileset certification row to a
generic `process`, `blocked`, or `excluded` candidate. Scene identity includes
that typed disposition and its definition/reason provenance; excluded rows do
not issue backend requests, blocked rows publish explicit diagnostics, and
uncertified rows conservatively request the ordinary delivery contract.

Renderer settlement consumes certified excluded Tile_IDs rather than model
names. A certified excluded cell is represented without a GLB, while every
non-excluded cell still requires its own ready model and renderer handoff. The
former sibling-model surface bridge is deleted, so a missing group member
cannot borrow an adjacent member's texture.

Focused composition/readiness/renderer tests pass `22/22`, the new regression
passes `1/1`, related Area readiness, tile-light, and scene-mapper tests pass
`21/21`, the bounded capability catalog passes `13/13`, and the frontend
and backend production builds pass. A larger related frontend
sample reached `131/132`; its sole failure is the unrelated existing Placeable
material-side assertion in the shared dirty worktree. The ordinary backend
Jest catalog command exhausted its fixed 1 GiB transform heap before running
assertions and was not retried with a larger heap.

Capability revision `2026-09-01.149` narrows the remaining identity-neutrality
blocker to `placeholder_inventory_identity_neutral_producer_pending`: the two
backend inventory audit producers still select placeholder source status with
a naming regex. Live hash-profile recertification, the source-frozen complete
99-tileset matrix, 34 missing source models, and native PathConnect/WOK proof
remain open. Detailed evidence is recorded in
`docs/brainstorm/2026-09-01-area-tile-certification-disposition-checkpoint.md`.
No Docker command, service, browser, capture, Toolset/NWN process, mutation
test, sub-agent, xoreos source, or other GPL source was used.

## 218. Continued implementation checkpoint — 2026-09-01 (source-bound tile eligibility producers)

Capability revision `2026-09-01.150` removes the remaining model-name behavior
branches from both backend tile inventory producers. The runtime-contract
sweep now requires an exact v2 definition catalog and caller-owned SHA-256,
rehashes every shard, and requires exact live SET fingerprint and tile/model
membership before mapping the typed source status to `process`, `blocked`, or
`excluded`. The three former exact group-companion exceptions are deleted, 34
typed `source_missing` rows remain blocked, and a legacy unbound sweep cannot
be resumed.

The upstream source inventory now requires a versioned, hash-bound placeholder
evidence profile. Each excluded row must bind exact SET bytes, tile identity,
declared model value, verified Toolset/decompilation evidence artifacts, and an
independent review. The producer stops before output when the profile is
absent, stale, incomplete, or not consumed exactly by the selected corpus.

A bounded search of the existing hash-identified decompilation export found no
placeholder/palette semantic, so the historical 8,660 exclusions were not
silently promoted into a new profile. The remaining blocker is explicitly
`placeholder_evidence_profile_population_pending`.

The new four-script offline gate passes, the bounded capability catalog passes
`13/13`, the validator accepts the real 99-tileset/53,700-row catalog binding,
the v19 controller dry run is correctly source-bound, both changed audit
scripts pass syntax checks, and the backend production build passes. No Docker
command, container, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.
The complete matrix, live hash-profile recertification, native placeholder
evidence, 34 missing model sources, and independent PathConnect/WOK proof remain
open; this checkpoint does not claim full Area-program completion.

A follow-up exact scan of all 298 HAK archives in the current NWN user
directory found none of the 34 missing ResRefs. Thirteen are group members, one
is the structurally padding-like `trs02:763` row, and 20 are ordinary
terrain/crosser rows. Similar existing names are diagnostic candidates only;
no alias, spelling rewrite, or sibling model was accepted as source closure.
The bounds-checked ERF/HAK model index is now shared by the producer and its
focused test.

## 219. Continued implementation checkpoint — 2026-09-01 (evidence-profile population transaction)

Capability revision `2026-09-01.151` makes the upstream placeholder-evidence
profile practically and deterministically populateable without restoring an
asset-name classifier. A shared selected-SET corpus parser now owns source
priority, exact SET hashes and tile declarations for both inventory and
profile generation, and rejects duplicate sections, fields, or tile ids.

The new two-phase CLI accepts only explicit `certifiedRowIds` from typed,
hash-validated native or lineage-v2 evidence. `draft` resolves those ids
against the exact current SET corpus and derives the row bindings. `finalize`
requires a separate independent-review artifact whose canonical subject hash
covers every final profile field except the review pointer; it self-validates
through the production loader before atomic publication and refuses to
overwrite an existing output. Arbitrary verdict JSON, free-standing function
addresses, legacy decompilation lineage, unreviewed row changes, stale SET
hashes, and unknown row ids all fail closed.

The KEY/BIF source index is now also bounds-checked and validates that each
declared BIF path stays within the exact resource root, exists, and matches the
resource id's BIF index. The installed `nwn_base.key` passes with 32,832 unique
MDL entries across 32 existing BIFs, confirming that KEY omission does not
explain the 34 historical missing rows.

The mandatory Toolset authoring/proof routing was audited before live work.
No versioned mass-palette proof profile or touched AUR-S05-03 function manifest
exists for 99-tileset exclusion certification, so the native lane remains
`proofCompleteness=missing`, `modelVisibility=not_tested`; Toolset was not
started ad hoc. The seven-script source gate, bounded capability catalog and
backend build pass. Docker, services, browser/Chrome, capture, Toolset/NWN,
mutation tests, sub-agents, xoreos and other GPL sources were not used.

## 220. Continued implementation checkpoint — 2026-09-01 (exact source-gap ownership)

Capability revision `2026-09-01.152` removes the last ambiguity that the 34
`source_missing` rows might be a scanner or source-layer omission. The shared
ERF/HAK audit reader now indexes arbitrary resource types and performs targeted
V1.0/V1.1 payload reads with exact table, resource-id and payload bounds. The
KEY reader now indexes arbitrary resource types while retaining confined BIF
path validation and exact BIF-index checks. Focused test-first coverage was
added to both readers and the seven-script source gate passes.

Each of the nine selected SET resources was rebound to its exact HAK or retail
BIF owner and exact SHA-256. Every SET payload contains its reported missing
model reference, while neither the owner nor the full installed corpus (298
HAKs plus `nwn_base.key` and `nwn_retail.key`) contains that MDL. Binary
readback also proves that `twl01.set` and `twl02.set` belong to
`q_!tilesets.hak`, not `q_tilesets.hak`.

The official Wild Lands and Winter Wild Lands v0.5.5 downloads independently
reproduce all ten Q/Wildlands SET references while omitting all ten MDLs. The
three official Project Q 2.2 patch archives contain no replacement tileset HAK
and none of those target models. This closes source discovery but does not
promote an upstream inconsistency into Aurora placeholder semantics.

The exact source owners, hashes, missing-model groups and external archive
hashes are recorded in
`backend/docs/aurora-reverse/area-tile-source-gap-audit-v1-2026-09-01.md`
and its evidence manifest. All 34 rows remain fail-closed; no alias, sibling
substitution, inferred padding rule or fabricated geometry was introduced.
`placeholder_evidence_profile_population_pending`, live source-bound
99-tileset certification, and independent PathConnect/WOK proof remain open.
No Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## 221. Continued implementation checkpoint — 2026-09-01 (resource-bounded native lineage preparation)

Capability revision `2026-09-01.153` closes the proof-control preparation gap
without changing the fail-closed verdict for the 34 source-missing rows.
AUR-S05-03 is now present in the central Toolset function-manifest registry.
Its existing exact Feature/Group placement, ARE delta, reopen and rollback
packet publishes `acceptedFunctions=["AUR-S05-03"]`; the registry validator
accepts all 12 registered manifests. This proof is deliberately not reused as
evidence that a raw SET row is excluded from rendering.

The lineage-v2 Ghidra exporter gained a resource-bounded targeted mode. A
canonical address selection is stored in the session attestation; all
discovered functions and the full in-program call graph remain recorded, while
non-target functions receive the explicit `decompiler_not_targeted` failure.
The independent lineage validator rejects selection drift, unknown targets,
selected targets mislabeled as excluded, and non-target functions exported as
ordinary records. Focused bounded tests pass `19/19` for the exporter and
lineage validator contracts.

The new pass-1 profile binds:

- current `nwtoolset.exe` SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- existing Ghidra project archive SHA-256
  `b21f5bc50eed79bf93c5198f3aeacc96acb7e94672c210d7eef19ad77ae1758d`;
- the official Ghidra 12.1.3 archive SHA-256
  `93a5d11a9ad510622acaaf908c556a7b9b764d338e78a7567f3689bf5081fd54`;
- exact exporter and 34-row source-gap manifest hashes;
- 15 sorted SET/ARE discovery addresses;
- one CPU, 1536 MiB heap, 30-second per-target timeout, and explicit memory
  headroom gates.

The profile SHA-256 is
`5a31706b37ba98c7d1c0c128c99065bf8edd33fd756c6a9f9afd3e8b1cdc07ba`.
Its executable preflight passed every static identity check and correctly
returned `blocked_resource_headroom` because the observed host snapshot had
only `3,957,813,248` free physical bytes and `4,130,254,848` free virtual
bytes. Ghidra analysis was therefore not launched. The official toolchain is
downloaded and verified under `.codex-tmp`; no Docker, service, browser,
Chrome, Toolset/NWN, mutation test, sub-agent, xoreos, or other GPL source was
used.

The remaining native step is now deterministic: once the preflight reports
`ready`, restore a fresh copy of the exact project snapshot, run one targeted
lineage session, validate its producer packet independently, and review the
selected functions for an explicit raw-SET-row eligibility rule. If no such
rule is proved, the 34 rows stay blocked and the next target set must be derived
from the new packet's call graph/string xrefs rather than from a guessed
runtime exception.

## 222. Continued implementation checkpoint — 2026-09-01 (profile-bound one-shot lineage runner)

Capability revision `2026-09-01.154` turns the prepared pass-1 profile into a
single fail-closed execution lane without starting the resource-blocked native
analysis. The profile now hash-binds the runner, planning and validation
libraries, a Ghidra-compatible `.gar` restore script, and the lineage-v2
producer/validator chain. The resulting profile SHA-256 is
`42b04c134dc9cb8c0da4f370728761ad48736b33d3f1f71e4f57b2f81e89485e`.

The runner validates hashes and the live 8-GiB physical/6-GiB virtual headroom
gate before creating the fixed packet root. A ready run stages byte-verified
copies, reconstructs a fresh `Aurora.gpr`/`Aurora.rep` project from the exact
archive, records an immutable portable invocation, and enforces read-only,
no-analysis, one-CPU, 1536-MiB execution. It owns each child tree, terminates it
on timeout or interruption, performs no automatic retry, and runs the staged
producer plus independent validator only after Ghidra succeeds. Admission
requires authoritative lineage and successful decompilation of all 15 selected
addresses; semantic classification remains separately pending.

The project restore is a bounded reimplementation of the official Ghidra
12.1.3 Apache-2.0 `RestoreTask` contract, not a guessed ZIP extraction. Its
focused fixture proves marker verification, payload placement under the fresh
`.rep`, archived `.gpr`/project-property exclusion, and empty local marker
creation. The profile and runner source gates pass.

The one-shot preflight for the current profile hash correctly returned
`blocked_resource_headroom` with `2,891,554,816` free physical bytes and
`3,054,100,480` free virtual bytes. It did not create the packet root and left
zero Ghidra Java processes. No Docker command, service, browser/Chrome,
Toolset/NWN process, mutation test, sub-agent, xoreos, or other GPL source was
used. The 34 rows remain blocked; the 99-tileset matrix, live source-bound
render recertification, semantic placeholder evidence, and independent
PathConnect/WOK proof remain open.

## 223. Continued implementation checkpoint — 2026-09-01 (two-review decompilation evidence admission)

Capability revision `2026-09-01.155` hardens the evidence boundary that will
consume the future pass-1 output. Decompilation evidence can no longer use the
v1 placeholder envelope. It must use
`aurora-area-tile-placeholder-evidence/v2`, cite a successful lineage function
by exact address and exported-C SHA-256, and bind a one-based nonempty range of
at most 64 source lines. The production loader rehashes the cited output and
cross-checks it against the packet-bound function record.

The v2 envelope also requires a separate hash-bound
`aurora-area-tile-placeholder-decompilation-semantic-review/v1`. Its canonical
subject covers the evidence id, complete certified-row vector, exact lineage
packet and validator identities, and all normalized function citations and
findings. Changing any of those values invalidates the semantic review. The
later profile-level reviewer must be a different identity, creating two review
boundaries between decompiled code and runtime exclusion data.

Focused tests pass for an exact reviewed v2 fixture and reject a legacy
decompilation v1 envelope, unreviewed semantic-finding drift, and a function
address absent from successful lineage. No row is certified by this checkpoint
and no asset identity selects runtime behavior. The native run, 34 source-gap
classifications, 99-tileset matrix, live recertification, and independent
PathConnect/WOK proof remain open.

## 224. Continued implementation checkpoint — 2026-09-01 (deterministic decompilation-evidence transaction)

Capability revision `2026-09-01.156` eliminates manual construction of the v2
decompilation evidence envelope. The new offline CLI provides a two-phase
transaction. `draft` consumes caller-hash-bound lineage packet, independent
validator, and typed proposal inputs, confines all packet evidence to the
evidence root, validates sorted unique rows and function citations against the
actual exports, and emits the canonical semantic-review subject hash.

`finalize` consumes the exact draft plus separately hash-bound semantic review,
rejects subject or row drift, writes a temporary v2 envelope, reloads it with
the production evidence validator, and atomically publishes only to a fresh
path inside the evidence root. The later selected-SET binding and distinct
profile-level review remain mandatory.

The focused end-to-end fixture passes draft, review, finalize, and production
readback, and rejects a review whose subject hash drifted. This checkpoint
certifies zero real rows and does not alter rendering behavior. The Ghidra run,
34 source-gap classifications, complete 99-tileset matrix, live recertification,
and independent PathConnect/WOK proof remain open.

## 225. Continued implementation checkpoint — 2026-09-01 (pass-8 negative placeholder verdict)

Capability revision `2026-09-01.157` records the successful one-core,
1536-MiB pass 8 and its fail-closed semantic result. The exact execution
profile SHA-256 is
`0ace0875c367b1e680f82c0ce4c8c7b758827fb8104964fb90cebed4104df0df`.
The independent validator reports complete lineage, an authoritative targeted
decompilation claim, 13 selected successful functions, 82,351 call-graph
edges, and no diagnostic. Pass 7 remains an immutable failed-preflight
diagnostic and was not overwritten.

The recovered native chain establishes that `DAT_00c39e0c` is the SET `Model`
key; every declared tile is initialized, parsed, and appended; tile offset
`0xc4` is initialized to null and later assigned the group pointer; and loose
retile selection evaluates null-group records by terrain/crosser/height
topology under four rotations before randomly selecting a matching candidate.
No MDL-existence or source-availability predicate appears in that observed
selection path. The tile-instance path copies the model-derived name and calls
model resolution, but it exposes no positive intentional non-rendering
placeholder semantic.

Recomputing the exact SET group relations classifies 13 missing rows as group
members and 21 as standalone tiles. The 13 are excluded only from loose
single-tile selection because they belong to groups; they remain real group
cells. The other 21, including the structurally padding-named `trs02:763`, are
eligible for the observed topology candidate path. Consequently pass 8
certifies zero exclusions, creates no v2 positive evidence envelope, and does
not authorize placeholder-profile population or runtime behavior changes.

The hash-bound findings and row sets are recorded in
`backend/docs/aurora-reverse/area-tile-placeholder-decompilation-pass8-semantic-audit-v1-2026-09-01.md`
and its JSON manifest. All 34 rows remain `source_missing` and blocked. Exact
source repair or narrower row-bound native visibility/suppression proof is now
explicitly required in addition to independently reviewed historical-
placeholder evidence. The source-frozen 99-tileset plan remains stale at
`0/3378`; live render recertification and independent PathConnect/WOK proof
remain open. No Docker command, service, browser/capture, Toolset/NWN session,
mutation test, sub-agent, xoreos source, or other GPL source was used.

## 226. Continued implementation checkpoint — 2026-09-01 (source-corpus group ownership repair)

Capability revision `2026-09-01.158` fixes the source-inventory producer that
feeds placeholder-profile generation and tile audit diagnostics. It previously
read a nonexistent `TILEn.Group` field, causing the historical unresolved CSV
to report blank group ownership for all 34 missing-source rows. The producer
now derives membership from the real `GROUPS`/`GROUPn` graph, preserves `-1`
holes, retains repeated palette membership, and exposes the first ordered
membership through the compatibility `groupId` field.

The parser remains fail-closed for every consumed ambiguity: invalid count or
dimensions, missing/invalid/unknown members, duplicate consumed sections,
conflicting consumed fields, and duplicate tile IDs. Its scope is narrowed to
the sections this contract actually consumes (`GENERAL`, `TILEn`, `GROUPS`,
and `GROUPn`), so repeated unrelated door/rule sections cannot alter the
result. Byte-equal repeated consumed values are deterministic redundancy and
are admitted; conflicting repetitions remain rejected.

Test-first fixtures cover rectangular groups, empty `-1` cells, one tile in
multiple groups, a missing numbered group section, unknown membership,
unconsumed duplicate sections, identical consumed fields, conflicting fields,
and duplicate consumed sections. The focused source-corpus test passes. A
read-only parse of the exact current source root succeeds for all 99 selected
tilesets and recomputes the pass-8 partition exactly: 13 grouped missing rows
and 21 standalone missing rows.

The machine-readable verification manifest binds the producer/test hashes,
the ordered 99-SET identity digest, all 53,700 tile records, 6,695 groups, 260
group holes, 13,734 memberships, and the exact missing-row partition at
`backend/docs/aurora-reverse/evidence/area-tileset-source-corpus-group-membership-2026-09-01/manifest.json`.

No audit inventory or 99-tileset plan was regenerated because the positive
placeholder evidence profile remains absent and all 34 rows remain blocked.
No service, Docker command, browser/capture, Toolset/NWN session, mutation
test, sub-agent, xoreos source, or other GPL source was used.

## 227. Continued implementation checkpoint — 2026-09-01 (pass-9 resolver semantics and conservative catalog repair)

Capability revision `2026-09-01.159` replaces the unproven historical
placeholder denominator with a fail-closed conservative inventory. The
profile-bound one-core, 1536-MiB pass 9 completed with profile SHA-256
`2d7502932b58112662ef82a874ab445a36801c0020ed46289c83fc2941dbabec`.
Its independent validator reports complete authoritative targeted lineage,
five selected successful decompilations, 22,560 discovered functions, 82,351
call-graph edges, and no diagnostic.

The recovered functions prove that terrain and crosser lookup initialize to
`0xffff` and change only on equality, that model-name comparison is case-
insensitive, and that exact `NULL` returns no model before resource lookup.
They do not prove that the row is hidden or unpaintable in the Toolset and do
not extend that semantic to `(null)`, `padding`, or `tpad_*`. The exact
`NULL\0` PE slice and every bounded citation are bound by
`backend/docs/aurora-reverse/area-tile-placeholder-decompilation-pass9-semantic-audit-v1-2026-09-01.md`
and its 19-artifact semantic-audit manifest. The pass certifies zero
exclusions.

The source-corpus parser now consumes and validates terrain/crosser type
sections and each tile's corner-terrain and edge-crosser fields in addition to
the existing exact group graph. A deterministic topology audit reports 8,096
historical-placeholder rows with at least one undeclared corner terrain, 564
with all corner terrains declared, and 41 non-placeholder rows that also use
undeclared topology. Opaque model-name changes leave this partition unchanged.
The result is explicitly `structural_correlation_only` and certifies zero
runtime exclusions.

Test-first review also exposed a production defect: the SET parser discarded
normalized `null` and `(null)` values, and the catalog compiler compensated
with a concrete-name exception. The parser now preserves every nonempty model
and image-map token, including exact `NULL` and `(null)` declarations, while
orientation remains independently validated. The compiler requires exact
normalized SET declaration equality and contains no model-identity behavior
branch. Focused parser verification passes `24/24`; the catalog-plan regression
proves that an explicitly declared `(null)` model survives both boundaries.

The inventory CLI now requires an explicit exclusion mode. `evidence-profile`
retains the independently reviewed positive-evidence contract. `none` rejects
all profile arguments and admits zero exclusions. Missing, partial, unknown,
or conflicting mode configuration fails closed. The resulting conservative
inventory contains all 53,700 selected rows: 45,034 `source_resolved`, 8,666
`source_missing`, zero `intentional_placeholder`, and zero invalid model
declarations. Its summary SHA-256 is
`28d50c170a32697617672737ae3323259cbee373e235b88cf2e371e3cbc3aad2`.
Twenty-eight historically excluded `tpad_*` rows now correctly resolve to the
installed `tpad_498.mdl` source.

The corrected offline catalog v2 contains 99 tilesets, 53,700 tiles, 6,695
groups, and the same 45,034/8,666/0 disposition totals. Its SHA-256 is
`7bfc43a11f13fa1463f7dd0c1a7b4c3354fa57186eadd048ce225b3b0f489bd7`
and definition-identity digest is
`31e59bc74af145dd539681322aee26abaf25329d1799cdbe10894ae66fb1f6d2`.
The old source-bound runtime plan is stale because production source changed;
it must not be resumed. A fresh runtime-build identity is mandatory before the
next live capture plan.

The remaining tile blocker is now explicit:
`conservative_8666_source_missing_rows_unresolved`. The 8,096 structurally
correlated rows require accepted native visibility/nonrenderable proof or exact
source, while the 564 fully declared-topology rows require the same positive
disposition independently. No topology or filename rule may silently exclude
them. Complete 99-tileset Add/Render/adjacency proof and independent
PathConnect/WOK positive/negative proof remain open.

The bounded twelve-script source chain, parser tests (`24/24`), catalog-plan
regression, capability-catalog tests (`13/13`), semantic-manifest validation,
and backend production build all pass for this checkpoint. No Docker command,
service, watcher, browser/Chrome capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source is part of this lane.

## 228. Continued implementation checkpoint — 2026-09-01 (source-bound v13 replacement matrix)

Capability revision `2026-09-01.160` replaces the stale coverage counters and
creates the first source-bound plan from the corrected conservative catalog.
A real planner count-probe establishes 45,031 Add/Render rows, 44,692
connection rows, 8,669 named blocked rows, and 3,380 chunks. The catalog
contains 45,034 source-resolved definitions; the planner's three-row reduction
is generic contract output and not a concrete model-name exception.

After both backend Nest and frontend TypeScript/Vite production builds passed,
the immutable v13 profile bound 1,795 runtime-source files and 30,566,360 bytes
to digest
`06a06931f2a916c604418cba5115b85c615fca4083c3cfdebc1cbe525e8e7934`.
The profile SHA-256 is
`41b9eeb84f02fd9b52002ea3c5df8c24866d7163871ea61312b7e65e05993cdc`;
the adjacent source-manifest SHA-256 is
`309449130864119ccf6743c4149bf300db5b378c5f3dbad22e0810260c58ea82`.

The first count-equivalent plan cited `.codex-tmp` catalog/inventory paths and
was superseded before capture. The inventory and catalog were regenerated
deterministically under `output/proof`. The durable summary SHA-256 is
`6aaaeee7ea448829853588350cc906eedb9465343ef7658ab8043f9d1f53e54d`,
the tiles-array SHA-256 remains
`1624e8f94952bf83d34363a7fc76680f3b8aef861b434c27f8997ff07941b004`,
and the durable catalog SHA-256 is
`ac85696b9e025669818e9ee57e823054969d85d128d97cec75dbe334eb704ec9`.

The active v13 replacement plan id is
`7e760c1a088cde19f4b22ec4479bc55e8ce513dd0daf1a4720cd15d7e6d626b4`.
It replaces no-capture transient id
`6c5396e97ef899ef30138139220c8c23a329ec7967764940fd87afe52af52bb2`,
whose chain points to stale v12 id
`7a3f8a0e8366411e5a6334c260089cf3c184840ade30e6568bbd136fb908c781`.
Offline status reports manifest `ready`, runtime source identity `verified`,
99 tilesets, 53,700 total rows, 45,031 required Add/Render rows, 44,692
required PathConnect rows, 9,100 group rows, and checkpoint `0/3380`. The
active-plan binding test passes.

The capability catalog removes the superseded 34-row source-gap blocker and
uses exact current incomplete-coverage ids for 45,031 render rows, 44,692
connection rows, and all 8,666 conservative source-missing rows. This does not
claim visual or connectivity completion. It only closes profile/plan
regeneration and leaves the next action at `atj02-group-chunk-0001` for a later
controlled runtime lane.

No capture, Docker command, service, watcher, browser/Chrome process,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. Any later runtime-source write invalidates v13 and requires a
new immutable replacement rather than resuming this plan.

## 229. Continued implementation checkpoint — 2026-09-02 (deterministic source-remediation queue and v14 binding)

Capability revision `2026-09-02.161` turns the conservative source gap into a
deterministic, hash-bound remediation queue. Every one of the 8,666 missing-
source rows remains blocked until an exact model source or accepted row-bound
native nonrenderable proof exists. The implementation admits neither inferred
alias/sibling substitution nor behavior based on a model ResRef, filename, or
topology cohort.

The immutable queue artifact SHA-256 is
`f03a339353c04ae63b0016acaf88cdbcea9861c9e6d661df1a907eda7a65b9bc`;
its queue-identity SHA-256 is
`25cf24f4de9ec99610c7fc883738bbfb65086dadd4a954d15b84aac42d5f9b33`.
It covers all 99 tilesets and 53,700 rows, with 8,666 missing rows, 467 unique
opaque missing-model identities, 39 affected tilesets, 13 grouped rows, and
8,653 standalone rows. The current missing-source topology cohorts are 584
rows with all corner terrains declared and 8,082 containing an undeclared
corner terrain; all 8,666 use only declared edge crossers. This current split
does not overwrite the earlier historical-placeholder audit's 8,096/564
partition, and neither partition certifies an exclusion.

The queue test was added before production code and first failed because the
module was absent. It now passes and is part of the bounded 13-script source
chain. Capability tests pass `13/13`; matrix profile/planner tests and matrix-
control/active-binding tests pass; both backend Nest and frontend
TypeScript/Vite production builds pass.

Those runtime-bound writes made v13 historical. The immutable v14 profile now
binds 1,798 files and 30,590,387 bytes to digest
`eeb44fe8876a3a6a34d0307f0ad77511c743d2d41c724f90d5da798e045f330d`.
Its profile SHA-256 is
`25d52f6cf3a95252fda5ae0a1bbfdbe830e9071c7fe28f039722baf7b56cdb98`
and source-manifest SHA-256 is
`812167b009537fb55fd691e4126559fd3c3b44898b93bec56f8f13020a9fed54`.
The active replacement plan id is
`ac93afd6bec7aae959becaf38c3d88f93157bdb171c414229d2908378d17487a`;
it explicitly replaces v13 plan id
`7e760c1a088cde19f4b22ec4479bc55e8ce513dd0daf1a4720cd15d7e6d626b4`.
Offline status is `ready`, runtime-source identity is `verified`, and the
checkpoint remains exactly `0/3380` with 45,031 Add/Render rows, 44,692
connection rows, and 9,100 group rows still requiring proof.

One canonical read-only runtime preflight stopped at
`DOCKER_ENGINE_UNAVAILABLE`, with historical fatal dependency
`DOCKER_INFERENCE_ENDPOINT_FATAL` and unchanged dependency fingerprint
`9ab12020bca69585ebb959f7960ff464acbe37d63249bf65529e750ebee5f538`.
Ports 3000/5173 and proof locks were clear. The preflight was not retried and
Docker Desktop was not started, restarted, or stopped. No service, watcher,
browser/Chrome capture, Toolset/NWN process, mutation test, sub-agent, xoreos
source, or other GPL source was used. Live visual, PathConnect/WOK,
Toolset/NWN, and packed-readback proof remain open.

## 230. Continued implementation checkpoint — 2026-09-02 (retained Waypoint `TemplateResRef` CAS and v16 binding)

Capability revision `2026-09-02.162` closes the remaining known offline
Waypoint property-matrix item by implementing presence-sensitive retained
type-`5` `TemplateResRef : ResRef` compare-and-swap. Primary reader/writer
functions `FUN_00658170` / `FUN_00658b4c` and frozen `TDLGWAYPOINTEDIT`
resources establish the exact GIT member and Advanced-tab `Blueprint ResRef`
control. The implementation accepts only one existing canonical lowercase
`[a-z0-9_]{1,16}` value at an immutable family ordinal; absent, duplicated,
wrongly typed/cased, malformed, stale, or target-only storage remains
preserve-only or fails closed. It neither resolves UTW blueprints nor changes
renderer/catalog `SceneObject.resRef`, palette identity, appearance, or
`LinkedTo`.

Backend parser, snapshot, projector, planner, exact field writer, candidate
readback, and atomic publication are implemented. The focused writer suite
passes `992/992`; the new candidate and atomic-publication assertions pass;
the capability catalog passes `13/13`; and the Nest build passes. Frontend
HTTP, mapper, workspace, clone, provenance, facade, draft, dialog, and history
paths are implemented. Focused coverage passes `773/773`, the HTTP suite
passes `345/345`, the real Workspace Cancel/Apply/reopen/OK/local-Save
regression passes, renderer identity remains unchanged, and the
TypeScript/Vite production build passes. Two aggregate defects exposed during
closure were also fixed: Description-only provenance now enters the Waypoint
property aggregator, and the transform/deletion test uses the intended
fixture mode. The whole candidate-compiler suite passes `183/183`, and the
combined relevant projector suites pass `653/653`.

`remaining_waypoint_property_matrix_incomplete` is removed.
`target_reference_runtime_pending` remains for `LinkedTo`, and exact guarded
browser Save/reopen, Toolset Save/Build/reopen with packed GIT readback, and
NWN TemplateResRef verification remain release blockers. Therefore Waypoint
authoring and the overall Area program remain `partial`/`blocked`.

The source writes make v14 and intermediate v15 historical. Immutable profile
v16 binds 1,801 runtime files and 30,610,969 bytes to digest
`9cc94415bd619d2c40d18f556da540389291987aa566dc623aa7c4f69afa7d39`.
Its profile SHA-256 is
`48aee8acdf610f6b9915c694a2cab9ad220f08e7d658219ab4121cb619cb15c3`
and source-manifest SHA-256 is
`07e06258e08d3ea8bda6d92b2d531cc42a06ca63be2f6d93074dd07bde14b3d3`.
Replacement plan id
`bbfc10446dcdf4bb9719bc6889d1c4241e9f8032a7636939b0a0d11acc99d68d`
explicitly replaces intermediate v15 plan id
`29b68224adda16458d9db7e52d466ced6ae822b757fb484451cfec73dcb9d9e3`
and validates `ready` with verified source identity.
It remains exactly `0/3380`, with the same 99 tilesets, 53,700 rows, 45,031
Add/Render rows, 44,692 connection rows, and 9,100 group rows.

No Docker command, service, watcher, browser/Chrome capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used
for this checkpoint. The previous Docker dependency blocker was not retried.

## 231. Continued implementation checkpoint — 2026-09-02 (retained Placeable property-matrix classification)

Capability revision `2026-09-02.163` replaces the vague
`remaining_placeable_property_matrix_incomplete` blocker with the exact
`placeable_full_localized_string_editor_pending` gate. A consolidated audit
classifies the frozen 5,328-byte `TDLGPLACEABLEEDIT` form against the complete
common situated-object, Placeable-template, and placed type-`9` GIT
reader/writer lineage. Every retained Placeable property is now either bound to
an implemented presence-sensitive offline mutation profile or explicitly
classified as non-storage/preserve-only; no unknown GIT field remains hidden
behind the former generic blocker.

The admitted offline matrix includes dynamic UTP construction, transform,
identity, table-bound appearance/faction/portrait/body-bag/trap type, HP and
derived CurrentHP, durability/saves, booleans, lock/trap fields, script ResRefs,
conversation/interruptability, inventory, variables, localized inline text,
paired-GIC comments, and deletion. Complete candidate readback and the existing
revision-fenced ARE/GIT/GIC/IFO publication remain mandatory. Palette category,
bulk instance update, browse/edit/default actions, and the shared-frame
`OnFailToOpen` row are not additional placed-Placeable GIT members.
`LightState` is absent from both this native form and the placed GIT
reader/writer and remains a separate runtime illumination lane.

This checkpoint does not complete Placeable authoring. `LocName` and
`Description` still support only the bounded inline language-0 printable-ASCII
profile; complete language/gender, active-code-page, TLK transition,
duplicate/empty-entry, and ordered entry editing remains open. Fresh guarded
browser Save/reopen, exact-candidate Toolset Save/Build/reopen plus packed
readback, and NWN behavior remain release blockers. The catalog gate passes
`13/13`.

The capability-catalog source change makes v16 historical. Immutable v17 binds
1,801 files and 30,614,016 bytes to digest
`a304d5b6764346127fc21d3aabed9426a4ab7a1fa5d7eb60c5bc5b221025f357`.
Profile SHA-256 is
`1634333a01be3d8a162bf07b9b6c2c87409652e3e30068827c280dfcca399c35`,
source-manifest SHA-256 is
`0898aae6079d565c258f69f6099498c89e878bd6f87c9d70d38bbbcf836d8e24`,
and replacement plan id is
`179e27a1b9411ff989503c83c3a239b243f0e6ae7add9fbfe4d5d9b9e8365add`.
It explicitly replaces v16, validates `ready` with verified runtime-source
identity, and remains exactly `0/3380`; no capture was performed. No Docker
command, service, watcher, browser/Chrome capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used.

## 232. Continued implementation checkpoint — 2026-09-02 (retained Item property-matrix classification)

Capability revision `2026-09-02.164` replaces the generic
`full_item_property_matrix_incomplete` blocker with the exact
`item_full_localized_string_editor_pending` gate. A consolidated audit
classifies the frozen 18,562-byte `TDLGITEMEDIT` form against the complete
common Item reader/writer and retained type-`0` GIT lineage. Every retained
ground-Item property is now either bound to an implemented presence-sensitive
offline mutation profile or explicitly classified as derived UI state,
non-storage command state, or preserve-only input.

The admitted offline matrix includes all model-type appearance profiles,
`BaseItem`, `TemplateResRef`, `Tag`, charges/cost/additional-cost/stack/flags,
ordered `PropertiesList`, `VarTable`, and nested `ItemList`, three bounded
localized strings, paired-GIC Comment, transform, dynamic UTI construction,
and deletion. Derived combat/cost/armor/property labels are not independent GFF
members. Palette category, restore-default, preview-mode, browse/edit, and bulk
instance-update controls do not authorize new retained storage.

This checkpoint does not complete Item authoring. Complete multilingual
`CExoLocString` editing and the existing fresh browser, Toolset packed
Save/Build/reopen, and NWN gates remain open. The change was test-first: the
catalog assertion failed against `.163`, then passed at `.164`. Focused catalog
coverage passes `13/13`; the bounded Item/catalog group passes `16/16` suites
and `199/199` tests; the backend production build passes.

The source change makes v17 historical. Immutable v18 binds 1,801 runtime
files and 30,614,116 bytes to digest
`2d857a0d8c83974653c98eb07198c26d6cd54c4723d718eca41993e1479aeebb`.
Profile SHA-256 is
`f4e70bd9b0fbe00c8e6c21b36ffdb3f2fc8ee33fdbe20c35eeefa17dcdbe6ee4`,
source-manifest SHA-256 is
`d14b6873cb05e3bfd6a165c266aeea83591db68bf7a1db2e5cb6b5caace82e4b`,
and replacement plan id is
`84d1ac84dd19144e1aa9e7b16b3a39a5a2ade55b050c79c1ae968f259efee630`.
It replaces v17, validates `ready` with verified runtime-source identity, and
remains exactly `0/3380`. The plan still covers 99 tilesets and 53,700 rows,
including 45,031 Add/Render, 44,692 connection, and 9,100 group rows. No live
capture was attempted. No Docker command, service, watcher, browser/Chrome
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or other
GPL source was used.

## 233. Continued implementation checkpoint — 2026-09-02 (retained Creature `Description` localized-string CAS)

Capability revision `2026-09-02.165` adds one source-closed existing-Creature
`Description : CExoLocString` mutation profile. Primary common reader/writer
functions `FUN_00532174` / `FUN_0053521c`, placed type-`4` wrappers
`FUN_0053ab24` / `FUN_0053ae80`, and the frozen 52,662-byte
`TDLGCREATUREEDIT` form establish exact GIT ownership and the Basic-tab editor
surface. The bounded web profile admits only a present inline language-0
printable-ASCII value up to 4,096 bytes; unsupported language/gender, TLK,
encoding, absent, duplicate-field, malformed, stale, or target-only storage
remains preserve-only or fails closed.

The parser, detached provenance, mutation projection, immutable-ordinal
replanning, exact field writer, candidate readback, and transactional Area
publication are implemented. `FirstName`, `LastName`, and `Description` share
one ordered mutation grammar. Frontend API parsing, scene mapping, saved-draft
validation, cloning, materialization, and the Creature dialog preserve the
exact source value and expose the Description textarea only for
`ACTIVE_NOW`; legacy two-member name drafts remain compatible.

Sequential bounded verification passes `2285/2285` backend assertions across
seven suites, `6/6` focused Creature parser assertions, `14/14` catalog
assertions, frontend groups of `1099/1099`, `88/88`, and `15/15`, and both
production builds. Two unrelated Item metadata fixture failures remain in the
complete parser file and are not hidden by this checkpoint.

This does not complete Creature authoring. Full multilingual localized-string
editing, body-part/color/wings/tail authoring, coupled `CRAdjust`, arbitrary
class spell graphs, `SpecialAbilityList`, and all browser/Toolset/NWN proof
gates remain open. The full Area program also still requires actual 99-tileset
Add/Render and connection capture plus independent PathConnect/WOK proof.

Runtime source identity advances from historical v18 to immutable v19. The
profile binds 1,801 files and 30,619,249 bytes to digest
`c3624c07b75038b26cd8f66123287127231a744f1cfa113c50fafa1fd2fce72c`;
profile SHA-256 is
`4ea2a3cf73eebe40b68984f1141f241c67b6cb8ba016fcecc834ee44bcedd9ee`
and source-manifest SHA-256 is
`124738bf135c2d4ca511b8b1cb38ff7d751b59196cbf3556bc26ffa862a114a5`.
Replacement plan id
`b7e2c52aa4f2ee5241ff402462e1fae3ca13b28787f75d006305a394573176e9`
explicitly replaces v18, validates `ready` with verified source identity, and
remains exactly `0/3380`. No capture, Docker command, service, watcher,
browser/Chrome, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.

## 234. Continued implementation checkpoint — 2026-09-02 (retained Creature appearance-color CAS)

Capability revision `2026-09-02.166` adds one source-closed, independently
presence-sensitive mutation group for the exact retained Creature fields
`Color_Skin`, `Color_Hair`, `Color_Tattoo1`, and `Color_Tattoo2`. The common
Creature reader at `decompiled_all.c:194542-194549` and paired writer at
`decompiled_all.c:195212-195218` establish the exact labels, order, and native
type-`0` storage. Repository GFF vocabulary maps that type to `BYTE`, so the
offline contract admits only canonical decimal integers in `0..255`. The
frozen 52,662-byte `TDLGCREATUREEDIT` form independently exposes its dedicated
color-control path. The complete primary-source record and no-guessing boundary
are documented in
`backend/docs/aurora-reverse/area-existing-creature-appearance-colors-audit-v1-2026-09-02.md`.

The backend parser, detached snapshots and cache identity, draft projector,
immutable type-`4` ordinal planner, exact per-member compare-and-swap writer,
candidate compiler, and persisted readback now carry the four-member group.
Only a requested native field is replaced; absent, duplicated, aliased,
wrong-case, wrong-type, malformed, or stale storage remains preserve-only or
fails closed. Unrequested GIT fields and paired GIC/module IFO bytes remain
unchanged. Frontend HTTP parsing, scene mapping, persisted-draft validation,
history cloning, reducer/materializer, workspace Apply, and the Creature dialog
carry detached provenance and gate each member independently. Retained absent
members are visible as `PRESERVE_ONLY`; new Creature drafts may author bounded
values without fabricating retained provenance.

Bounded verification passes all 15 appearance-color-focused backend assertions,
all `1191/1191` assertions across the seven affected frontend files, the
`14/14` capability gate, and both production builds. The broader seven-file
backend run reports `2625/2627`; its only two failures are the already-recorded,
unrelated Item metadata round-trip fixtures. They are neither caused by nor
hidden by this Creature slice.

This does not complete Creature authoring. Body parts, head, phenotype,
wings/tail, coupled `CRAdjust`, arbitrary class spell graphs,
`SpecialAbilityList`, complete multilingual localized strings, guarded browser
readback, Toolset Save/Build/reopen, and NWN behavior remain open. The full Area
program also still requires accepted 99-tileset Add/Render and connection
coverage plus independent PathConnect/WOK proof.

The source writes make v19 historical. Immutable v20 binds 1,804 runtime files
and 30,648,580 bytes to digest
`5f15f9b1626902aff949627626b5a06d775b5625eb86941395317670187dba86`.
Profile SHA-256 is
`a0edb688da0e66d29962dd2c465da029814192812ca6e9f5049892782d6594da`,
source-manifest SHA-256 is
`641402252b1096e8c741dd9a206267628653df2e0c21188e0e4435ffc92bb7bb`,
and binding SHA-256 is
`223033008144c07f983c8adc88377bd9c35bfdf4ac27416e396c9e294d884ce1`.
Replacement plan id
`51bf3ba6cbdf4f41f316f7f1a171e56ae00c810710378835d8c655e627466698`
explicitly replaces v19, validates `ready` with verified runtime-source
identity, and remains exactly `0/3380`. The matrix still covers 99 tilesets,
53,700 rows, 45,031 Add/Render rows, 44,692 connection rows, and 9,100 group
rows. No capture, Docker command, service, watcher, browser/Chrome,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## 235. Continued implementation checkpoint — 2026-09-02 (retained Creature body-part/head compatibility CAS)

Capability revision `2026-09-02.167` implements one source-closed retained
Creature compatibility-storage mutation group for 18 exact body slots plus
`Appearance_Head`. The common reader `FUN_00532174`, common writer
`FUN_0053521c`, compatibility reader helper `FUN_00af0fb4`, compatibility
writer helper `FUN_00af1018`, placed type-`4` wrappers, and frozen
`TDLGCREATUREEDIT` establish the exact GIT ownership and editor surface. Every
slot preserves its independently present legacy `BYTE` and/or `x`-prefixed
`WORD`; a present word is authoritative, the byte is a fallback, and canonical
paired storage clamps the legacy byte to `0` above `255`. `BodyPart_Robe`,
wings, tail, phenotype, colors, equipment, and model availability remain
independent contracts.

Backend domain, strict parsing, detached snapshot/cache identity, draft
projection, immutable-ordinal planning, subset CAS, exact physical-shape
writing, candidate readback, and transactional publication are implemented.
Frontend HTTP parsing, scene mapping, saved-draft validation, history cloning,
provenance reduction/materialization, Workspace Apply, and per-source-capacity
dialog controls are implemented. No absent compatibility field is synthesized
or removed. The seven affected backend suites pass `1660/1660`, the seven
affected frontend suites pass `1201/1201`, the capability catalog passes
`14/14`, and both production builds pass.

The full parser run also exposed and closed two stale Item fixture expectations.
The source-closed Item property matrix proves that root `PaletteID`, root
`CostTable`/`CostValue`, Item script fields, and GIT `Comment` must not be
synthesized; the corrected tests now assert that absence explicitly rather
than treating it as a writer defect.

This does not complete Creature authoring. `BodyPart_Robe`, wings/tail,
coupled `CRAdjust`, arbitrary class spell graphs, `SpecialAbilityList`, full
localized-string editing, guarded browser renderer readback, Toolset
Save/Build/reopen plus packed compatibility-field readback, and NWN behavior
remain open. The full Area program also still requires accepted 99-tileset
Add/Render and connection coverage plus independent PathConnect/WOK proof.

The source writes make v20 historical. Immutable v21, built at
`2026-09-02T09:09:58.371Z`, binds 1,807 runtime files and 30,699,427 bytes to
digest `1dc941848220dd7f2422cd4a498cd4eb6c2a001c01e329cc7bb55ca9a5af1751`.
Profile SHA-256 is
`20d5128c2856c6c800d84fe4e22cfefd982f24c7caea4bc52c49a316313a222e`,
source-manifest SHA-256 is
`e32f2f63e31849ea84f8782a00de29f88c785769d31b9b9c9988ff23d29669b5`,
and binding SHA-256 is
`5f9defe4bc4ad950d7e8e85f1e941fc262553d8da4d445369437a6e75e49a63a`.
Replacement plan id
`872937ea0a16792475b1e06617e9c4ca2774b01223a755fa932e61844e20f4d5`
explicitly replaces v20, validates `ready` with verified runtime-source
identity, and remains exactly `0/3380`. It retains 99 tilesets, 53,700 rows,
45,031 Add/Render rows, 44,692 connection rows, and 9,100 group rows. No
capture, Docker command, service, watcher, browser/Chrome, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used.

## 236. Continued implementation checkpoint — 2026-09-02 (retained Creature Wings/Tail catalog-bound CAS)

Capability revision `2026-09-02.168` implements two independent retained
Creature appendage mutations for exact `Wings_New : DWord` and
`Tail_New : DWord`. Primary common reader/writer evidence closes the modern
labels, native DWord type, modern-over-legacy fallback order, and legacy
`Wings : Byte` / `Tail : Byte` preservation. Frozen Creature-dialog evidence
binds the selectors to physical `WINGMODEL`/`TAILMODEL` rows with required
`LABEL`; it does not prove candidate model-resource availability.

Backend effective-resource resolution, exact storage parsing, detached cache
identity, draft projection, fresh digest/count/row admission, immutable type-
`4` ordinal planning, DWord-only field replacement, candidate readback, and
revision-fenced ARE/GIT/GIC/IFO publication are implemented. The UTC writer
now also emits both modern fields as native DWords. Frontend strict HTTP
contracts, bounded catalog ports/facades, scene and saved-draft provenance,
history cloning, two independent reducers/materializers, Workspace Apply, and
searchable Wings/Tail dialog selectors are implemented. Legacy-only,
malformed, missing, stale, unbound, and unavailable-catalog sources remain
visibly `PRESERVE_ONLY`; legacy siblings and unrelated bytes are retained.

Focused backend domain/admission coverage passes `28/28`; the capability
catalog passes `14/14`; the affected frontend group passes `1238/1238`; and
both production builds pass. A complete nine-suite backend group executes
`2844/2847`; all appendage assertions pass, while three unrelated shared-tree
expectations remain stale for animation source hashing, health/VFX revision,
and a UTM store round-trip fixture.

Creature authoring remains `partial`/`blocked`. `BodyPart_Robe`, coupled
`CRAdjust`, arbitrary known/memorized spell graphs, `SpecialAbilityList`, full
localized-string editing, guarded browser/model readback, Toolset
Save/Build/reopen plus packed-field readback, and NWN appearance proof remain
open. The full Area program also still requires accepted 99-tileset
Add/Render and connection coverage plus independent PathConnect/WOK proof.

The final capability-revision write made the first generated appendage-bound
v22 profile historical. Immutable v23, built at
`2026-09-02T10:43:14.612Z`, binds 1,813 runtime files and 30,798,093 bytes to
digest `6138b516b501ea4df8933de5004a06678c60e69880d9f47d87fb1cdbd1f46c27`.
Profile SHA-256 is
`6f210a9f6ce5090e1836c9ed1a47132a7c67368981a735ebb6b158e916cc7b73`,
source-manifest SHA-256 is
`0035a93f32f6567ae0b7788302a62400e7b5359671cd4fa880e57067648676b2`,
and binding SHA-256 is
`8e342dc9e974de973edceb4e75014001ee272e7ee5c91197ee0a1d70dfe15e00`.
Replacement plan
`0e16f6931f3c113d7474a159437d288e0da87ef0a245d27fa162543ca0cff608`
explicitly replaces intermediate v22 plan
`b3fa5a382051c06604eaab06606ac408d15aca9938d81f81edb86b24967d5c25`,
validates `ready` with verified runtime-source identity, and remains exactly
`0/3380`. It retains 99 tilesets, 53,700 rows, 45,031 Add/Render rows, 44,692
connection rows, 9,100 group rows, 8,669 named-blocked rows, and 9,008 total
blocked rows. No capture, Docker command, service, watcher, browser/Chrome,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## 237. Continued implementation checkpoint — 2026-09-02 (retained Creature `SpecAbilityList` catalog-bound CAS)

Capability revision `2026-09-02.169` implements offline authoring for one
canonical retained Creature `SpecAbilityList`. Primary Toolset decompilation
proves exact type-`4` entries containing `Spell : Word`,
`SpellFlags : Byte`, and `SpellCasterLevel : Byte`. The implementation retains
physical order and duplicates, binds rows to one immutable effective
`spells.2da`, groups duplicate uses for the editor, performs complete-profile
CAS, rebuilds canonical repeated entries, verifies candidate readback, and
publishes through the existing revision-fenced ARE/GIT/GIC/IFO transaction.

Affected backend verification passes `172/172`, frontend verification passes
`223/223`, the capability catalog passes `14/14`, and both production builds
pass. Runtime profile v24, built at `2026-09-02T12:28:51.048Z`, binds 1,819
files and 30,892,302 bytes to digest
`d189a8d867e73e96b4ae21666081051b7958a745aea71ceccaf9d8b5075dd412`;
profile SHA-256 is
`dd44c7c6bbad1f74380adda1a6be58fbc36bb43d960d53c4970405e5e01102d9`,
source-manifest SHA-256 is
`79398efec86167cb5fb0ac1cb4322e92d3f98cc61049df8cc55f1e273f4d21e5`,
and binding SHA-256 is
`fc79a2eeffa8adcc1269db0cfc10166cf48bdece9301e44d1b7f3d00d1c328fa`.
Plan `a66be72840096a8db000e954b7856c8fc0d78d1519ab424923ef0383787ae978`
validates `ready` and remains `0/3380`; no live proof was performed.

## 238. Continued implementation checkpoint — 2026-09-02 (Creature robe ownership correction)

Capability revision `2026-09-02.170` closes a false direct-Creature authoring
path discovered while reconciling the remaining property matrix. Primary
Toolset decompilation proves that the common Creature reader/writer does not
own `BodyPart_Robe` or `ArmorPart_Robe`; native robe state is
`ArmorPart_Robe : Word` on an equipped armor Item. The HTTP Creature blueprint
schema now rejects `bodyPartRobe`, the UTC serializer cannot emit the rogue
field, UTC and placed-Creature parsers do not promote it, and the frontend
wizard cannot copy it from either legacy loose metadata or
`sourceOnlyParts.robe`. Item/embedded-Item robe parsing, writing, rendering,
and preservation remain unchanged.

The red phase demonstrated all four invalid Creature paths. The corrected
schema suite passes `36/36`, the Area parser passes `344/344`, the full
template parser passes `27/27`, the Creature wizard passes `6/6`, the
capability catalog passes `14/14`, and both production builds pass. The full
parser run additionally exposed a stale Store test expectation; it was aligned
to the independently source-closed native five-bucket order `[0,4,2,3,1]`
without changing Store implementation.

The implementation matrix was reconciled with existing completed retained
Creature lanes: `WalkRate`, `SkillList`, `FeatList`, `VarTable`,
`PerceptionRange`, `SoundSetFile`, `StartingPackage`, and `Phenotype` are no
longer listed as unimplemented. Creature authoring truthfully remains
`partial`/`blocked`: arbitrary template Create, coupled `CRAdjust`, arbitrary
class spell graphs, complete localized-string editing, absent-field creation,
browser/native proof, and the broader Area/tile certification gates remain
open.

Runtime profile v24 is historical after these source writes. Immutable v25,
built at `2026-09-02T13:03:29.094Z`, binds 1,819 files and 30,892,451 bytes to
runtime digest
`f53b0eed54c1ceae097b8917ca54a40bb8c35cb07b45b6bc8927e8b295436f37`.
Profile SHA-256 is
`454e1d037815fed75659c02463027b3db0e6211ad66869bc63abc06a0ad594bc`,
source-manifest SHA-256 is
`d08be595354a3aae73de1d58146866d221b5ef35b6fe7202a88b41994b761451`,
and binding SHA-256 is
`803ef54e6b2e1fe4b4b218b67eb3e2492c223f71b0da8cec7e3ad983f86528c9`.
Plan `0aae944e863e27ef5b797d9ab6364d34ea92a5364e2ccf836c106bc4a445e6ac`
explicitly replaces v24 plan
`a66be72840096a8db000e954b7856c8fc0d78d1519ab424923ef0383787ae978`,
validates `ready` with verified runtime-source identity, and remains `0/3380`.
Its static matrix contains 99 tilesets, 53,700 rows, 45,031 Add/Render rows,
44,692 applicable connection rows, 9,100 group rows, 8,669 named-blocked rows,
and 9,008 total blocked rows; PathConnect has zero accepted rows. No Docker
command, container, service, watcher, browser/Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## 239. Continued implementation checkpoint — 2026-09-02 (Creature matrix classification and Race fail-closed UI)

Capability revision `2026-09-02.172` replaces the former vague remaining-
Creature-property blocker with an exhaustive native control/storage matrix and
the exact open implementation gates. A focused primary-source audit binds
`cbRaceChange` to `0x0045BE64`, proves `Race : Byte` common storage at Creature
offset `+0x6C`, and proves that a selection invokes multiple dependent refresh
paths plus the complete `FUN_0052ede0` challenge-rating calculator. Direct Race
mutation therefore remains source-blocked rather than being implemented as an
unsafe lone-byte patch.

The Basic-tab Race selector is now visibly `Race: PRESERVE_ONLY` and disabled.
The retained byte remains readable and remains exact provenance for already
admitted HP and Portrait profiles; Apply/OK/Cancel cannot silently create a
Race edit. Focused unit coverage passes `73/73`, Workspace regression coverage
passes `21/21`, the capability catalog passes `14/14`, and both production
builds pass. Browser visual proof remains intentionally open because this
bounded lane started no runtime service or browser.

Runtime profile v25 is historical after these source writes. Immutable v26,
built at `2026-09-02T13:41:08.623Z`, binds 1,819 files and 30,892,862 bytes to
runtime digest
`fea76e2e6cb3733bb8545bccec00528ae3a662069b7c5a9b51a79b0cf18f067f`.
Profile SHA-256 is
`420fd1bdf4697feb3b6928f7eeed31a38ad067e296054548ca995d1a9a232f4b`,
source-manifest SHA-256 is
`b4264e81a521859f87bf3dc6c93821aea306ebd9c13b9ef4e9f0d0bf45ae4d61`,
and binding SHA-256 is
`08a7f35bd563b4e3a1b58a288b6d3a19367be206abfc7c3fb32de21078e94947`.
Replacement plan
`5da427d9ae588f40211e546766866f1f909d3e1bc0db6f0d8a5cf597e68b7bbf`
explicitly replaces v25, validates `ready` with verified runtime-source
identity, and remains `0/3380`. It retains 99 tilesets, 53,700 rows, 45,031
Add/Render rows, 44,692 connection rows, 9,100 group rows, 8,669 named-blocked
rows, and zero accepted PathConnect rows. Creature authoring remains
`partial`/`blocked` on the Race/CR calculator, arbitrary dynamic construction,
complete localized strings, and arbitrary class-spell graphs; the wider Area
program remains blocked on fresh UI/native proof and tile/path coverage. No
Docker command, container, service, watcher, browser/Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## 240. Continued implementation checkpoint — 2026-09-02 (retained Encounter `TemplateResRef` CAS)

Capability revision `2026-09-02.173` implements one exact retained Encounter
`TemplateResRef : ResRef` mutation. Primary common Encounter reader/writer
evidence proves the exact label, type-`7` GIT ownership, and independence from
Tag, palette identity, renderer identity, scripts, spawning, difficulty,
faction, creature entries, polygon geometry, and the paired GIC Comment. The
frozen `TDLGENCOUNTEREDIT` handler permits only length `1..16` and separately
gates the Toolset's update-instances command; Aurora Web does not claim or
invoke that broader operation.

Backend parsing and snapshot identity, detached expected/target projection,
immutable-ordinal planning, exact case-sensitive CAS writing, whole-candidate
readback, GIC preservation, and revision-fenced ARE/GIT/GIC/IFO publication
are implemented. Frontend HTTP/scene/draft/history state, strict lowercase
ResRef validation, provenance reduction/materialization, a visible
`ACTIVE_NOW`/`PRESERVE_ONLY` dialog field, Workspace Apply/Cancel/reopen/OK/
local-Save behavior, and renderer-`resRef` independence are implemented.
Missing, duplicate, wrong-case, wrong-type, noncanonical, stale, or absent
storage cannot authorize creation or normalization.

The six affected backend suites pass `1681/1681`; the ten affected frontend
suites pass `1216/1216`; the capability catalog passes `14/14`; and both
production builds pass. Browser readback, exact-candidate Toolset
Save/Build/reopen with packed inspection, NWN behavior, the broader Encounter
spawn behavior, and the full Area certification gates remain open.

Runtime profile v26 is historical after these source writes. Immutable v27,
built at `2026-09-02T14:25:41.889Z`, binds 1,822 files and 30,916,246 bytes to
runtime digest
`67ee2a5a286cbea89a96f34514a6bd4ee7284def367c95137abc40e35177a92a`.
Profile SHA-256 is
`4c1392641f0649cad075e0eb5671bb1e96732cfbabeb92e2d1c6979cb4c253ba`,
source-manifest SHA-256 is
`504b6de64e19e0a98941f3451c3d18fe63ca2109c57f4f3dd61c3deae00cfdd2`,
and binding SHA-256 is
`0dd8e2f0e56f8d446966b460786e866a682df86ed8c96e680e2a467204aca23d`.
Replacement plan
`02298824afd6c21eba4fcd36f881c5a290166a4a31a07f12860357dca947e402`
explicitly replaces v26, validates `ready` with verified runtime-source
identity, and remains exactly `0/3380`. It retains 99 tilesets, 53,700 rows,
45,031 Add/Render rows, 44,692 connection rows, 9,100 group rows, 8,669
named-blocked rows, and zero accepted PathConnect rows. No Docker command,
container, service, watcher, browser/Chrome, capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used.

## Checkpoint 241 — retained Trigger TemplateResRef exact CAS (2026-09-02)

The next Aurora-first Trigger gap is closed offline. Immutable decompilation
binds exact `TemplateResRef : ResRef` to the common Trigger member at
`param_1 + 7` in reader `FUN_00656720` and reciprocal writer
`FUN_0065752c`; placed writer `FUN_00657de0` delegates that record before
position, orientation, Geometry, and paired-GIC Comment. Frozen
`TDLGTRIGGEREDIT` independently exposes `eTemplateName` / `Template Name`,
`eTemplateNameChange`, and a separate `Update instances in current area`
control. The bounded web lane therefore changes one retained type-`1` ordinal
only and does not claim blueprint propagation.

Backend parsing, dependency fingerprinting, projection, stale-source planning,
in-place GFF writing, candidate readback, GIC preservation, and transaction
composition are implemented. Frontend HTTP mapping, detached immutable
provenance, saved-draft validation, clone/history, polygon-properties dialog,
reducer/materializer, scene facade/port, renderer identity preservation, and
Apply/Cancel/reopen/OK/Ctrl+S local-Save regression are implemented.

Verification: `696/696` relevant backend assertions and `1,223/1,223`
relevant frontend assertions passed; backend and frontend production builds
passed. Capability catalog revision is `2026-09-02.174`. Fresh guarded browser
readback, exact-candidate Toolset Save/Build/reopen, packed readback, and NWN
behavior remain mandatory release evidence. No Docker command, service,
browser, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used in this checkpoint.

Runtime profile v27 is historical after these source writes. Immutable v28,
built at `2026-09-02T15:06:09.826Z`, binds 1,825 files and 30,936,949 bytes
to runtime digest
`63f413c69c5d40d1e26aaedff1085a2d69ea374e393d8bf2543e5aeed58f947d`.
Profile SHA-256 is
`3e3a4860eaa4482c0360908822bf1a30d2493c77ea4cb4d88b56d99ac6c1ba85`,
source-manifest SHA-256 is
`3e27700052559d0710b7684cb0bacd8d01851a4072c24fa15b7e133f474d2b78`,
and binding SHA-256 is
`2f2152896420c77d1afce017cbe9f907127303b59232b3215144ebd752898d8e`.
Replacement plan
`affe37ef0b73eba3271694893171cf822960dd1bbbd3ae02e81a453c42342435`
explicitly replaces v27 and validates `ready` with verified runtime-source
identity. It remains `0/3380`, with 99 tilesets, 53,700 rows, 45,031 required
Add/Render rows, 44,692 connection rows, 9,100 group rows, 8,669 named-blocked
rows, and zero accepted PathConnect rows. No capture was performed.

## Checkpoint 242 — retained Trigger inline LocalizedName exact CAS (2026-09-02)

The Aurora-first Trigger name slice is source-closed and offline verified.
Immutable reader/writer evidence binds exact case-sensitive
`LocalizedName : CExoLocString` storage to the common Trigger record. The
admitted mutation profile is intentionally narrow: `strRef=0xffffffff`, zero
entries or exactly one non-empty language-`0` entry, printable ASCII, and at
most 256 bytes. TLK-backed, multilingual, duplicate, malformed, wrong-case,
wrong-type, absent, or otherwise noncanonical storage remains preserve-only;
the implementation does not synthesize localization or normalize source data.

Backend parsing, complete storage provenance, dependency fingerprinting,
detached expected/target projection, immutable-ordinal stale-source planning,
in-place GFF replacement, candidate and persisted readback, and
revision-fenced ARE/GIT/GIC/IFO publication are implemented. Frontend HTTP
mapping, immutable source cloning, workspace/history persistence,
`ACTIVE_NOW`/`PRESERVE_ONLY` Trigger Properties presentation, facade/port
mutation, Apply/Cancel/reopen/OK/local-Save behavior, and renderer-identity
independence are implemented.

Verification passed in five focused backend suites (`228/228`), the Area
Update atomic-publication integration (`88/88`), nine focused frontend files
(`1,228/1,228`), and both production builds. Capability catalog revision is
`2026-09-02.175`. Fresh guarded browser readback, exact-candidate Toolset
Save/Build/reopen with packed localized-string inspection, NWN presentation,
remaining Trigger properties, and all wider Area/tile certification gates
remain open. This checkpoint is not program completion.

Runtime profile v28 is historical after these source writes. Immutable v29,
built at `2026-09-02T15:48:48.587Z`, binds 1,828 files and 30,958,350 bytes
to runtime digest
`271a8496398aedbd92dbfb987c1b3147976f68aa2fe3cf4fbfa3d9ddb3ed6911`.
Profile SHA-256 is
`26074783ac4cf4f1f0e5378733ae53946e6cfd9c28137171fae6dfd545c837f0`,
source-manifest SHA-256 is
`46ff547811bd118771eadb48c6f2de7ec18f32a3ada51749400b3bef510f80d9`,
and runtime binding SHA-256 is
`00242c8db22add6a75d4c228cf39777062e1929ecd003c78815b82c6f1631f4e`.
Replacement plan
`ca4a8178e85c04ebf939607ec0ff178513327fb8ed2558dc64b1052c16ced97d`
explicitly replaces v28 and validates `ready` with verified runtime-source
identity. It remains `0/3380`, with 99 tilesets, 53,700 rows, 45,031 required
Add/Render rows, 44,692 connection rows, 9,100 group rows, 8,669
named-blocked rows, and zero accepted PathConnect rows. The active-plan file
SHA-256 is
`cb424e724f4e1da93875c4e232bffcba9e8a124269a373b7571b7a2a4beebd67`.
No Docker command, service, browser/capture, Toolset/NWN process, mutation
test, sub-agent, xoreos source, or other GPL source was used.

## Checkpoint 243 — retained Trigger paired-GIC editor Comment exact CAS (2026-09-02)

The next bounded Aurora-first Trigger lane is source-closed and offline
verified. Immutable primary reader/writer evidence and accepted native
readback bind editor `Comment : CExoString` to the same-index type-`1` GIC
`TriggerList` entry paired with one type-`1` GIT Trigger. The implementation
admits only one exact present field, preserves empty and whitespace-bearing
values without normalization, enforces 4,096 ECMAScript code units with no
NUL, and leaves missing, duplicate, malformed, wrong-case, wrong-type, or
unpaired sources visibly preserve-only. It does not use the GIT or UTT
blueprint Comment as a fallback and makes no NWN behavior claim.

Backend paired-resource parsing, source detachment, dependency identity,
immutable-ordinal replanning, expected-value CAS, GIC-only field replacement,
whole-candidate readback, and revision-fenced ARE/GIT/GIC/IFO publication are
implemented. Frontend HTTP mapping, immutable scene provenance, saved-draft
and history cloning, reducer/materializer, scene facade and viewport port,
Trigger Properties presentation, and one Apply/Cancel/reopen/OK/Ctrl+S flow
are implemented. Comment composes with Tag, TemplateResRef, LocalizedName,
origin, and polygon changes in one transaction while remaining independent of
renderer identity.

Verification passes `2,317/2,317` relevant backend assertions, `88/88` full
Area Update integration assertions, `1,289/1,289` affected frontend
assertions, `137/137` full regression-smoke assertions, `14/14` capability-
catalog assertions, and both production builds. The complete frontend unit
gate passes `5,838/5,840`; its two isolated deterministic failures are outside
this lane in the currently dirty Placeable render-package and material-side
expectations. They remain explicit global blockers rather than being hidden
by the green Trigger-specific gates.

Capability revision is `2026-09-02.176`. Fresh browser Save/reopen and native
Toolset Save/Build/reopen with packed GIC readback remain required. The full
Area program also remains blocked on remaining object-authoring semantics,
accepted 99-tileset Add/Render and adjacency evidence, independent
PathConnect/WOK proof, and final release certification.

Runtime profile v29 is historical after the implementation writes. Immutable
v30, built at `2026-09-02T16:47:19.043Z`, binds 1,831 runtime files and
30,979,373 bytes to digest
`1ca79a5263a3ae55a174a39f6e6e5e90dad0fad821cc50057cf184237669aad7`.
Profile SHA-256 is
`3b3126e52a87297d3010fb706142cb60c85704e0b8171e1f2f18fe545563170b`,
source-manifest SHA-256 is
`21507a7685470ae00586c591a24c68314b3af64c446418c63b22621fb992747c`,
canonical runtime-binding SHA-256 is
`cb0a31f52881b0f5849c3bcd0df3982253e95a602c00da71bee6df17111ce61b`,
and active-plan file SHA-256 is
`aa7d1c4f2c55114b439622be3fbc0c1486a64b8e35dbaa7853352cfbc0b55188`.
Replacement plan
`984f3a2415f3029481058748c270dec5df39d897d132230a96f561a1f6e7b68e`
explicitly replaces v29, validates `ready` with verified current source, and
remains `0/3380`. It retains 99 tilesets, 53,700 rows, 45,031 required
Add/Render rows, 44,692 connection rows, 9,100 group rows, 8,669
named-blocked rows, and zero accepted PathConnect rows. No capture, Docker
command, service, watcher, browser/Chrome, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.

## Checkpoint 244 — retained Trigger complete event-script ResRef tuple exact CAS (2026-09-02)

Capability revision `2026-09-02.177` closes the bounded offline storage lane
for all seven exact retained Trigger event-script fields: `OnDisarm`,
`OnTrapTriggered`, `OnClick`, `ScriptHeartbeat`, `ScriptOnEnter`,
`ScriptOnExit`, and `ScriptUserDefine`. Primary common Trigger reader/writer
evidence proves exact `ResRef` ownership and the writer's ASCII-lowercasing
boundary. The contract admits a complete present tuple only; partial,
missing, duplicate, wrong-case, wrong-type, malformed, stale, or unchanged
tuples remain preserve-only or fail closed. It does not claim script-resource
existence, compilation, dispatch, cadence, ordering, activation, or trap
semantics.

Backend parsing and fingerprinting, detached expected/target projection,
immutable type-`1` ordinal planning, seven-field CAS replacement, whole-
candidate and persisted readback, content-free best-effort telemetry, and
revision-fenced ARE/GIT/GIC/IFO publication are implemented. Frontend HTTP
mapping, immutable provenance, saved drafts and clone/history, visible
`ACTIVE_NOW`/`PRESERVE_ONLY` controls, reducer/materializer, facade/viewport
port, and Apply/Cancel/reopen/OK/Ctrl+S local-Save flow are implemented. The
writer's full-document comparison proves unrelated Trigger siblings remain
unchanged; compiler coverage explicitly preserves paired GIC, ARE, and IFO.

The ten affected backend suites pass `2,039/2,039`, full Area Update
integration passes `88/88`, eleven affected frontend files pass
`1,268/1,268`, full regression-smoke passes `137/137`, the capability catalog
passes `14/14`, and both production builds pass. The full frontend unit gate
passes `5,859/5,861`; the same two deterministic failures remain outside this
slice in Placeable render-package and material-side expectations and remain
global blockers. Fresh guarded browser Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed GIT inspection, targeted NWN event dispatch,
remaining Trigger properties, the 99-tileset matrix, independent
PathConnect/WOK proof, and final release certification remain open.

Runtime profile v30 is historical after the source writes. Immutable v31,
built at `2026-09-02T17:58:09.664Z`, binds 1,836 runtime files and 31,017,487
bytes to digest
`77288c7ed00599a8e29b672bbf45b9142622f4cfd0a843fd99c6d81b2128bac9`.
Profile SHA-256 is
`e8d16c45a8c5456711b368780bee632282b96c83c2f3dab548abb3dc2cbd1e57`,
source-manifest SHA-256 is
`2366e29a615ec330ae703a761f3c6d7ea002df9b9aa0b10d5fadef1fde8afc4b`,
runtime-binding SHA-256 is
`a004d6b0cb7cc317deaa21e51849d9822fddbbd0beb9a015db327e5693a7ccc3`,
and active-plan file SHA-256 is
`3f302ff6d1160b5a61ec00d7dc21f106d45913ec1db1d4860c49563480e34f8b`.
Replacement plan
`ab91aa5c0692fe6810cef46326e00af006a4bf63c773459f3c641ad9beff5744`
explicitly replaces v30, validates `ready` with verified current source, and
remains `0/3380`. It retains 99 tilesets, 53,700 rows, 45,031 required
Add/Render rows, 44,692 connection rows, 9,100 group rows, 8,669
named-blocked rows, and zero accepted PathConnect rows. No Docker command,
service, watcher, browser/Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.

## Checkpoint 245 — retained Trigger raw transition-storage tuple exact CAS (2026-09-05)

Capability revision `2026-09-02.178` closes the bounded offline storage lane
for exact retained Trigger `LinkedTo : CExoString`, `LinkedToFlags : Byte`, and
`LoadScreenID : Word` members. Primary common and placed Trigger reader/writer
evidence proves the labels, types, ownership, and round-trip storage shape. The
contract admits only one complete exact tuple and preserves it as uninterpreted
raw storage. Partial, absent, duplicate, wrong-case, wrong-type, malformed,
over-budget, stale, or unchanged tuples cannot authorize mutation. Destination
kind, flag meaning, target validity, loading-screen catalog identity, and NWN
traversal behavior are explicitly outside this offline claim.

Backend parsing and dependency identity, detached expected/target projection,
immutable type-`1` ordinal planning, three-field CAS replacement, complete
candidate and persisted readback, content-free best-effort telemetry, and
revision-fenced ARE/GIT/GIC/IFO publication are implemented. Frontend HTTP and
scene mapping, immutable provenance, saved drafts and clone/history, visible
raw `ACTIVE_NOW`/`PRESERVE_ONLY` controls, reducer/materializer,
facade/viewport routing, and Apply/Cancel/reopen/OK/local-Save behavior are
implemented. The transition tuple composes atomically with the other admitted
Trigger changes while preserving unrelated fields and resources.

The affected backend suites pass `1705/1705`, full Area Update integration
passes `88/88`, affected frontend tests pass `1294/1294`, full regression-
smoke passes `137/137`, and both production builds pass. Full frontend unit
passes `5893/5895`; the same two deterministic out-of-slice failures remain in
the Placeable render-package shape and renderer material-side expectations.
They remain global blockers rather than being hidden by this green bounded
slice.

The Level 4 Area program remains incomplete. Fresh guarded browser Save/reopen,
exact-candidate Toolset Save/Build/reopen with packed GIT inspection, native
transition semantics, targeted NWN traversal/loading-screen proof, remaining
Trigger properties/variables/activation, the `0/3380` 99-tileset matrix,
independent PathConnect/WOK proof, and final release certification remain open.
Runtime profile v31 is historical after these production source writes; a new
immutable profile and capture must bind the eventual final source state, so no
replacement profile was generated during this continuing implementation lane.
No Docker command, container, service, watcher, browser/Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.
