# Area Program Completion Audit (2026-08-21)

## Verdict

The user-requested Level 4 Area program is `missing`, not complete. The current
repository contains a substantial implemented CRUD, topology, renderer, and
proof-control foundation, but the authoritative capability catalog still has
partial, preserve-only, and not-started product rows. The canonical native
roadmap also has incomplete Stages 5 through 8, and the build-bound 99-tileset
matrix is still at checkpoint zero.

This audit distinguishes three categories that must not be collapsed:

1. application implementation still missing or partial;
2. Aurora semantics that require reverse/native evidence before product
   implementation may expand;
3. implemented behavior whose release state remains blocked only by fresh
   proof or corpus certification.

## Rules and evidence classification

The initial audit phase was read-only/offline; later application-only
checkpoints are recorded below. They did not introduce a new Aurora semantic,
use xoreos, control Toolset/NWN, or start a browser capture.

Authoritative inputs:

- `docs/brainstorm/2026-08-06-area-authoring-crud-tile-parity-program.md`;
- `backend/src/modules/areas/domain/area-capability-catalog.ts`, revision
  `2026-08-22.21`;
- `backend/test/unit/area-capability-catalog.spec.ts`;
- `backend/docs/aurora-reverse/aurora-toolset-usage-standards-roadmap-2026-07-14.md`;
- `backend/scripts/validate-aurora-toolset-stage-completion.mjs`;
- the v8 matrix profile, plan, checkpoint, heartbeat, and failed capture packet
  identified in
  `tile-add-connect-matrix-runtime-build-identity-audit-2026-08-21.md`.

## Capability catalog result

The immutable catalog contains 79 rows:

| Implementation state | Rows |
| --- | ---: |
| `implemented` | 48 |
| `partial` | 26 |
| `preserve_only` | 1 |
| `not_started` | 4 |

| Release state | Rows |
| --- | ---: |
| `available` | 38 |
| `blocked` | 36 |
| `hidden` | 5 |

The four `not_started` rows are proof/certification capabilities rather than
ordinary editor commands:

- `connectivity_nwn_traversability`;
- `certification_all_definition_render`;
- `certification_all_connection_rows`;
- `certification_nwn_runtime`.

The remaining `preserve_only` row is intentionally gated by incomplete
Aurora behavior:

- `objects_door_hooks_transitions` — native door/transition semantics
  incomplete.

These rows cannot be promoted by UI wiring alone. Aurora-first evidence must
close their semantic boundary before implementation is broadened.

## Confirmed implemented foundation

The catalog records 48 implemented rows. The most important foundation for the
current objective is:

- local draft Create/List/Open/Save/Delete with revision control;
- role-visible production listing and copy-on-open;
- atomic materialization coordinators for Create, Update, and Delete;
- interrupted transaction recovery;
- terrain/crosser/feature/group palette browsing;
- single/brush/group placement, replacement, rotation, height, tile-instance
  properties, erase, selection, connected selection, clipboard, undo/redo,
  dense-grid rotation/resize policy, and neighbourhood validation;
- production tile-placement admission;
- resource lineage, transforms, incremental render rebuild, and GPU disposal;
- immutable certification planning, 99-tileset inventory, and release-report
  generation.

Several implemented rows remain release-blocked because proof is incomplete;
an implemented state alone is not production certification.

## Partial application work

The 25 partial rows span these concrete groups:

- Area properties: basic identity, visual environment, advanced flags, and the
  current-Area-only module Start Location profile;
- all nine object-authoring families plus polygons and inventory/equipment;
- exhaustive model/material/texture closure, special materials, environment,
  and fail-closed renderer certification;
- SET adjacency, PathReference, PathConnect, WOK seams, and connected-component
  diagnostics;
- current Toolset Save/Build/reopen certification.

Some blockers name a proof matrix, while others name a real application gap.
Each row must therefore be re-audited against its tests and visible controls
before changing its catalog state. Broadly relabelling every `partial` row as
"implemented but unproved" would be incorrect.

The application-only `workspace_state_feedback` slice is now implemented and
available in catalog revision `2026-08-21.12`. The Area workspace exposes one
always-visible bar with independent draft, verification, materialization, and
certification lanes. A browser write is explicitly a recovery copy while a
remote CAS is pending; the saved timestamp is published only after remote CAS
success. Scene-version and command-revision ordering prevents completion of an
older save from hiding newer dirty edits. Create, Update, and Delete emit
validation, blocked/ready, materializing, conflict/recovery/failure, and
verified-readback states. The certification lane reports only delivery of the
certification index and does not claim renderer or native proof completion.

The focused evidence is 44 passing frontend tests across the status model,
always-visible component, draft CAS queue, Area verification/Create/Update,
Delete, and panel transport; the frontend production build also passes. The
capability catalog unit gate passes 12/12 with exact totals 45 implemented, 27
partial, 3 preserve-only, 4 not-started; 38 available, 36 blocked, 5 hidden.

The application-only `workspace_cache_budget_clear` implementation is complete
in catalog revision `2026-08-21.14`, while its release remains blocked pending
a browser proof. A dedicated application port owns the immutable-asset cache;
the browser adapter measures exact response bytes, enforces a hard 2 GiB cap,
serializes mutations, evicts least-recently-used entries, separates user scope
and immutable SHA-256 lineage, and rejects one entry larger than the cap. The
runtime installs the same cache-aware fetch function for model and texture
delivery, and application startup enforces the persisted budget before any UI
interaction is required. The Options UI reports measured usage and clears only the owned Cache
Storage namespace, preserving authentication, draft recovery, and unrelated
caches. Cache hit, miss, store, skip, failure, inspect, and clear outcomes are
available through sanitized telemetry. Internal cache metadata headers are not
returned to asset consumers.

Focused evidence is 22 passing frontend unit tests across the cache adapter,
runtime installer, scene-cache disposal, control, and topbar, plus one passing
regression smoke, one passing dedicated performance benchmark, and a passing
frontend production build. The benchmark admits 128 immutable 1 KiB entries
under a 64 KiB eviction budget within 2,500 ms and serves 500 retained cache
hits within 1,000 ms with zero network calls. Its initial red result exposed a
full CacheStorage rescan on every admission; the adapter now loads one metadata
index and updates it transactionally while explicit inspect/enforce/clear
operations refresh from durable storage. The capability catalog gate passes
12/12.
Catalog totals are 46 implemented, 26 partial, 3 preserve-only, and 4
not-started; release totals remain 38 available, 36 blocked, and 5 hidden. The
remaining blocker is `browser_cache_control_proof_pending`; no static test or
build result is being relabelled as browser proof.

The existing-field Area Comments slice is implemented in catalog revision
`2026-08-21.15`; release remains blocked by
`native_area_comments_save_build_reopen_pending` and
`browser_area_comments_proof_pending`. The primary Aurora audit proves that
the Area reader `FUN_005a7fc8` reads the exact root `Comments` field through the
type-10 `CExoString` path and that the Area writer `FUN_005a9f30` writes the
same field. The cross-boundary contract therefore edits only an already
present, exactly cased, uniquely typed `Comments : CExoString` field. Absence,
wrong case/type, duplicates, stale expected values, NUL, and the product
budget above 4,096 ECMAScript code units fail closed. Empty text is valid and
distinct from absence; values are not trimmed, normalized, case-folded, or
truncated.

The backend now parses and transports presence distinctly, projects an exact
CAS pair, preserves the source field position and all unrelated ARE data,
validates the compiled candidate independently, and publishes ARE/GIT/GIC/IFO
through the existing atomic transaction/readback route. The frontend maps the
same exact value through ports and application facades, exposes a Comments tab
in Area Properties, keeps the other property tabs preserve-only, and derives
direct export/verify mutations from the immutable production source rather
than browser draft state.

Focused validation passed 600 backend unit tests, 22 Area-update integration
tests, 90 frontend unit/component tests, the 12-test capability-catalog gate,
and both production builds. The Area-update integration harness also received
the now-required admitted tile-placement dependency so the pre-existing
transaction suite remains executable; this does not alter production
admission behavior. The single attempted combined 10-suite backend invocation
exceeded the mandatory 1 GiB Node heap before completing, so the same suites
were run in three bounded one-shot batches without raising that limit. No
assertion failed in the accepted bounded runs.

Catalog totals are now 47 implemented, 25 partial, 3 preserve-only, and 4
not-started; release totals remain 38 available, 36 blocked, and 5 hidden.
Neither static tests nor builds are being relabelled as native or browser
proof.

The existing Area event-script slice is implemented in catalog revision
`2026-08-22.16`; release remains blocked by script-catalog/compile status,
guarded browser proof, and native Save/Build/runtime proof. The primary Aurora
audit proves that Area reader `FUN_005a7fc8` reads exact root `OnEnter`,
`OnExit`, `OnHeartbeat`, and `OnUserDefined` labels through the type-11 ResRef
reader, while Area writer `FUN_005a9f30` writes the same labels through the
type-11 writer. The recovered writer stores a one-byte length and lowercases
ASCII `A-Z`, establishing the native 16-byte lowercase canonical boundary.

The application therefore admits only empty or 1-16 lowercase ASCII
`[a-z0-9_]` values. Empty explicitly unbinds an event. Absence remains distinct
from empty. Every changed existing slot uses an exact
`{ expectedResRef, resRef }` CAS pair; missing, duplicate, wrong-case,
wrong-type, stale, unchanged, uppercase, invalid-character, and over-length
mutations fail closed without materializing fields. No layer silently trims,
truncates, replaces, or lowercases user input.

The backend now carries exact per-slot presence through parsing, repository and
HTTP detail/processed transport, production-draft projection, schema validation,
preserve-first ARE writing, independent candidate parsing, atomic publication,
and readback. The frontend carries the same contract through the HTTP port,
scene/draft boundary, application facade, direct Verify/Export transfer, and
the Area Properties Events tab. Unsupported individual slots stay visibly
preserve-only.

Accepted offline evidence is 636 backend unit tests, 22 Area-update integration
tests, 99 frontend unit/component tests, the 12-test capability-catalog gate,
and passing backend/frontend production builds. Two combined heavy-backend
runs exceeded the mandatory 1 GiB Node heap before completing; all constituent
suites passed as bounded one-shot runs without increasing the heap. Catalog
totals are now 48 implemented, 24 partial, 3 preserve-only, and 4 not-started;
release totals remain 38 available, 36 blocked, and 5 hidden.

The bounded existing Area `Name`/`Tag` slice is now implemented in capability
catalog revision `2026-08-22.17`, while the broader
`properties_basic_identity` row intentionally remains `partial`. Its label
also covers descriptions, and alternate localized Name layouts remain
preserve-only; neither class is being mislabeled as complete.

Primary audit
`backend/docs/aurora-reverse/area-existing-basic-identity-audit-v1-2026-08-22.md`
proves that Area reader `FUN_005a7fc8` reads exact root `Tag` through the
type-10 string reader and `Name` through the localized-string reader, while
Area writer `FUN_005a9f30` emits the same exact labels through the matching
writer families. The application admits Name mutation only for strRef
`0xffffffff` with exactly one language-id `0` printable-ASCII entry of 1-256
bytes that is not whitespace-only. Tag mutation is admitted only for one exact
`Tag : CExoString` containing 0-64 printable ASCII bytes. Empty Tag is valid;
field absence remains preserve-only.

Every change uses an exact `{ expectedValue, value }` CAS pair. Missing,
duplicate, wrong-case, wrong-type, stale, unchanged, malformed, non-ASCII, and
over-budget values fail closed. No layer trims, normalizes, changes case,
truncates, transliterates, or materializes an absent field. The writer also
rejects an exported `name` that differs from an admitted retained Name unless
the same request contains a coherent Name CAS mutation; this closes the former
silent non-persistence path.

The bounded path now covers parser provenance and dependency identity,
repository/detail/processed transport, production-draft projection, strict
HTTP schema, preserve-first writing, independent candidate parsing, compiler,
atomic ARE/GIT/GIC/IFO publication and readback, frontend HTTP/scene/workspace
boundaries, the Area Properties facade, direct Verify/Export transfer, the
Basic tab, and panel-to-scene mutation. Accepted offline validation comprises
661 backend unit tests in bounded runs, 22 Area-update integration tests, 115
frontend unit/component tests, the 12-test catalog gate, and passing backend
and frontend production builds. One combined backend run exceeded the
mandatory 1 GiB heap; its constituent suites passed separately without raising
the limit.

Release remains blocked by alternate localized-name profiles, the remaining
basic/description native field matrix, guarded browser proof, and native
Toolset Save/Build/runtime proof. Catalog totals therefore remain 48
implemented, 24 partial, 3 preserve-only, and 4 not-started; release totals
remain 38 available, 36 blocked, and 5 hidden.

## Canonical native stage validation

Exact validator commands and results:

```text
node backend/scripts/validate-aurora-toolset-stage-completion.mjs --stage 4
PASS: 8/8 accepted

node backend/scripts/validate-aurora-toolset-stage-completion.mjs --stage 5
FAIL: 6/11 accepted; 5 incomplete

node backend/scripts/validate-aurora-toolset-stage-completion.mjs --stage 6
FAIL: 0/7 accepted; 7 incomplete

node backend/scripts/validate-aurora-toolset-stage-completion.mjs --stage 7
FAIL: 0/6 accepted; 6 incomplete

node backend/scripts/validate-aurora-toolset-stage-completion.mjs --stage 8
FAIL: 0/6 accepted; 6 incomplete
```

Stage 5 remains open for fog/lighting, day/night/weather, music/ambient,
universal camera reset/recenter, and universal Area Save/reopen. Stage 6
remains open for Door properties, transitions, trigger scripts, sound runtime
settings, encounter spawn, merchant runtime, and waypoint-target behavior.
Stage 7 remains open for universal Save/Save As, Build Module, compile scripts,
fresh Test Module/runtime proof, and restart persistence. Stage 8 remains open
for complete function-to-proof coverage, a second-fixture pass, complete
negative coverage, standard versioning, blocker registry, and stage closure.

## Bounded existing Area Advanced gameplay flags and check modifiers checkpoint

The terrain/PvP/NoRest plus Listen/Spot check-modifier slice is implemented in
capability catalog revision `2026-08-22.19`, while the broader
`properties_advanced_flags` row remains `partial`. Loading-screen identity,
variables, and other unverified Advanced controls remain preserve-only;
browser and native proof are still open.

Primary audit
`backend/docs/aurora-reverse/area-existing-advanced-flags-audit-v1-2026-08-22.md`
proves exact root `Flags : DWord`, `PlayerVsPlayer : Byte`, and
`NoRest : Byte` reader/writer paths, the installed Advanced-tab controls, and
the retail `pvpsettings.2da` values. Only Flags `0..7` are editable: bit 0 is
Interior, bit 1 is Subterranean/Underground, and bit 2 is Natural. PvP is
exactly `0..3` (`none`, `party`, `full`, `default`) and NoRest exactly `0|1`.
Any retained Flags value with a high bit set remains preserve-only so unknown
bits can never be erased.

Companion audit
`backend/docs/aurora-reverse/area-existing-check-modifiers-audit-v1-2026-08-22.md`
proves native signed-Int reads/writes for exact root `ModListenCheck : Int` and
`ModSpotCheck : Int`, the Area-to-dialog and dialog-to-Area transfer paths,
and the installed VCL up/down controls. Both fields admit only exact integers
from `-99` through `99`; missing, ambiguous, wrong-case, wrong-type, fractional,
or out-of-range provenance remains preserve-only.

Every change carries an exact complete `{ expectedValue, value }` CAS pair.
Terrain is an exact three-boolean object; PvP, NoRest, Listen, and Spot use
closed scalar domains. Missing, duplicate, wrong-case, wrong-type, stale,
unchanged, fractional, unknown-key, and out-of-domain states fail closed. The
writer changes only the requested retained field and independent parsing
confirms candidate readback before atomic publication.

The offline path covers domain validation, parser provenance and dependency
identity, repository/detail/processed transport, draft projection, strict HTTP
schema, preserve-first writing, independent readback, compiler, atomic
ARE/GIT/GIC/IFO publication, frontend HTTP/scene/workspace boundaries,
application facade, direct Verify/Export transfer, the Advanced tab, and panel
scene mutation. Focused validation comprises 725 backend unit tests, 22
Area-update integration tests, 159 frontend unit/component tests, the 12-test
catalog gate, and both production builds. Catalog totals remain 48
implemented, 24 partial, 3 preserve-only, and 4 not-started; release totals
remain 38 available, 36 blocked, and 5 hidden. One attempted combined heavy
backend run exceeded the mandatory 1 GiB heap; all constituent suites passed
separately without raising the limit.

## Matrix and connectivity state

The original immutable v8 plan contains 99 tilesets, 53,700 rows, and 3,378
Add/Render chunks, but its checkpoint remains zero. Its first guarded attempt
correctly failed before Chrome because five VFX-lane source files changed after
profile generation. That is provenance control working as intended, not a
renderer result.

The old v8 profile/plan/failure packet must remain immutable. After the shared
source set is stable, matrix work requires a successor v8 profile, a new
checkpoint-zero plan and zero-production publication, then one accepted
profile-bound capture before bulk execution.

PathConnect and WOK remain independent. The prepared `tms01` positive/negative
candidate does not close the corpus and cannot be generalized to every
tileset. A fresh central AUR-S07 runtime packet is still required for the exact
prepared module before even that bounded candidate can graduate.

## Ordered continuation

1. Complete guarded browser proof for bounded Area Name/Tag, Area Comments,
   Area event scripts, Area advanced gameplay flags, Area audio, module Start Location,
   and the implemented 2 GiB cache UI after the single
   capture lane is released; do not conflate proof with application
   implementation.
2. Complete native bounded Area Name/Tag, Area Comments, Area event-script,
   Area advanced-gameplay, and module Start Location Save/Build/reopen/runtime
   proof through the central Toolset/NWN route,
   including script compile status.
3. When the VFX lane releases shared runtime source and services, freeze the
   successor v8 profile/plan/publication and accept one guarded capture.
4. Continue the complete 99-tileset matrix with independent visual review.
5. Execute the bounded PathConnect/WOK AUR-S07 candidate, then expand only from
   separately evidenced rules.
6. Close native Stages 5-8 through central Toolset/NWN routes and exact
   validators.
7. Re-run the 79-row catalog audit, all required test gates, release report,
   and requirement-by-requirement completion audit. Level 4 is achieved only
   if every required row and proof is verified.

## Multi-entry inline Area Name checkpoint — 2026-08-25

The bounded default-entry mutation is now implemented for both one-entry and
multi-entry inline printable-ASCII `Name : CExoLocString` storage. Exact
profile provenance flows through backend/frontend contracts, workspace drafts,
profile-bound CAS, candidate validation, atomic publication, and persisted
readback. Ordered alternate entries and GIT/GIC/IFO companions are proven
unchanged by focused and integration tests.

This narrows, but does not close, `properties_basic_identity`: TLK-backed and
non-ASCII values, independent alternate language/gender editing, fresh browser
Save/reopen, Toolset Save/Build/reopen, and NWN localized-display behavior are
still open. Catalog revision `2026-08-25.34` therefore keeps the row partial and
blocked, and does not change the aggregate 51/25/0/5 implementation or
38/37/6 release totals.

## Current resource ownership

At the 2026-08-22 coordination checkpoint, this Area lane stopped its managed
backend/frontend pair. Ports `3000` and `5173` were confirmed free, dead-owner
service locks for PIDs `36420` and `27400` were removed, and backend, frontend,
and global capture locks were confirmed absent. No replacement service,
capture, Chrome process, Toolset process, or NWN process was started; the VFX
lane was explicitly left free to acquire the pair.

## Current-Area module Start Location checkpoint — 2026-08-22

Catalog revision `2026-08-22.20` moves `properties_start_location` from
`preserve_only` to `partial`. The frozen audit
`area-module-start-location-audit-v1-2026-08-22.md` closes the native six-field
IFO storage and engine-consumption boundary, but deliberately does not claim
walkmesh accessibility, Toolset acceptance, or NWN spawn behavior.

The admitted application profile reads one exact membership-bound
`Mod_Entry_Area` plus XYZ and two direction Floats from canonical `module.ifo`,
retains its IFO digest in Area detail and production-draft provenance, and
edits the complete tuple through one immutable expected/target CAS pair. The
current version may target only the Area being materialized. Missing,
duplicate, wrong-case, wrong-type, stale, partial, unknown-key, non-finite, and
non-binary32 source values fail closed; no missing field, coordinate, or
direction is invented.

The backend reparses baseline IFO provenance, preserves every unrelated IFO
field, independently parses baseline and candidate tuples, atomically publishes
ARE/GIT/GIC/IFO, and requires exact candidate-byte/hash readback. The frontend
has strict HTTP and persisted-draft boundaries, exact scene mapping, a
preserve-first properties facade, and complete Start Location controls on the
Advanced tab. The processing cache now includes both the tuple and IFO digest.

Accepted offline validation for this checkpoint is 623 focused backend unit
tests, 23 Area-update integration tests, and 150 focused frontend
unit/component tests, plus passing backend and frontend production builds.
The catalog gate passes 12/12 with totals 48 implemented, 25 partial, 2
preserve-only, and 4 not-started; release totals remain 38 available, 36
blocked, and 5 hidden.

The capability remains partial and release-blocked by cross-Area authoring,
guarded browser interaction/readback, exact-candidate Toolset Save/Build/runtime
proof, and NWN spawn/WOK accessibility proof. No managed service, browser
capture, Toolset, or NWN process was started by this lane while the VFX lane
owned ports 3000/5173.

## Area audio environment checkpoint — 2026-08-22

Immutable capability catalog revision `2026-08-22.21` moves
`properties_audio_environment` from `preserve_only` to `partial`. Current
catalog totals are 48 implemented, 26 partial, 1 preserve-only, and 4
not-started; release totals remain 38 available, 36 blocked, and 5 hidden.
The remaining preserve-only capability is Door hooks/transitions.

The frozen native audit
`backend/docs/aurora-reverse/area-audio-environment-audit-v1-2026-08-22.md`
proves one exact type-100 root `AreaProperties` struct containing nine signed
Int fields. The admitted application contract carries six non-negative raw
IDs, two `0..127` volumes, and a music delay stored in milliseconds from
`-99000..99000` in exact `1000`-millisecond steps. It does not invent 2DA
labels, sound ResRefs, missing fields, defaults, or identity-based fallbacks.

Backend parsing, repository/detail/processed transport, cache identity, draft
projection, strict CAS validation, composed GIT writing, independent candidate
readback, receipt propagation, and atomic snapshot publication now carry the
complete tuple. Frontend HTTP, scene/workspace, facade, Verify/Export transfer,
and Audio-tab controls carry the same exact data with preserve-first behavior.
The real module snapshot repository's prior filename/biome/modulo/synthetic
ambient guessing has been removed.

Accepted bounded offline validation comprises 64 focused backend unit/catalog
assertions, 1/1 dedicated Area-audio atomic-publication integration test, 160
focused frontend unit/component tests, and passing backend/frontend production
builds. Several large legacy Jest files exceed the mandatory 1 GiB heap while
loading; their added audio assertions are present but are not represented as
passing. The bounded integration config provides the accepted transaction
proof without raising the limit.

Release remains blocked by effective provenance-bound audio 2DA catalogs,
fresh browser Save/reopen evidence, exact-candidate Toolset Save/Build/reopen,
and NWN audio-behavior proof. No managed service, capture, Toolset, or NWN
process was started while the VFX lane owned ports 3000/5173.

## Effective Area audio catalog checkpoint — 2026-08-22

Immutable capability catalog revision `2026-08-22.22` removes
`effective_audio_2da_catalogs_not_implemented` from
`properties_audio_environment`. Implementation totals remain 48 implemented,
26 partial, 1 preserve-only, and 4 not-started; release totals remain 38
available, 36 blocked, and 5 hidden because live browser, Toolset, and NWN
proof is still outstanding.

The backend resolves one all-or-nothing provenance-bound bundle from effective
`ambientsound.2da`, `ambientmusic.2da`, and `soundeax.2da` resources using
module, ordered HAK, then vanilla precedence without row merging or weaker
fallback after a malformed strongest source. Exact physical row IDs, source
keys/layers, hashes, sizes, row counts, and bounded TLK-derived display labels
are carried through Area detail, processing, cache identity, and cloning
boundaries. Per-table limits are 4096 rows and 16 MiB; the complete serialized
bundle is capped at 2 MiB and omitted fail-closed when any bound is exceeded.

The frontend validates and persists the exact optional bundle, exposes it via
the Area scene and facade, and replaces the six raw ID controls with exact row
selectors when provenance is available. Native `mus_bat_` classification
separates battle music from day/night music. Missing current rows remain
explicit unresolved numeric values; no label, ResRef, or behavior is inferred.
The existing nine-value GIT mutation contract and atomic publication gates are
unchanged.

Accepted bounded evidence comprises 42 focused backend assertions, the 1/1
dedicated Area-audio atomic-publication test, 166 focused frontend assertions,
12/12 capability-catalog assertions, and passing backend/frontend production
builds. Runtime services and capture remained untouched for VFX coordination.
Browser Save/reopen, exact-candidate Toolset Save/Build/reopen, and NWN audio
behavior remain mandatory release gates.

## Retained Door transition storage checkpoint — 2026-08-22

Immutable capability catalog revision `2026-08-22.23` removes the final
`preserve_only` row. `objects_door_hooks_transitions` is now truthfully
`verified/partial/blocked`; catalog implementation totals are 48 implemented,
27 partial, 0 preserve-only, and 4 not-started. Release totals remain 38
available, 36 blocked, and 5 hidden.

The exact storage authority is frozen in
`area-existing-door-transition-storage-audit-v1-2026-08-22.md`. Only one
complete retained type-`8` GIT Door trio is admitted:
`LinkedTo : CExoString`, `LinkedToFlags : Byte`, and
`LoadScreenID : Word`. No legacy alias, destination inference, flag enum,
loading-screen label, missing-field creation, or new-Door transition authoring
is claimed.

Backend parser provenance, repository/transport/cache cloning, source-bound
draft projection, deletion planning, writer CAS, candidate compiler/readback,
receipt propagation, and atomic snapshot publication now carry this family.
Frontend HTTP, scene, persisted-draft, clone, application, dialog, and
panel-to-scene paths carry the same exact source/target separation. Existing
instance authority is removed from copied and drag-dropped Doors.

Accepted bounded evidence is 1619/1619 backend assertions across seven suites,
1/1 dedicated atomic-publication integration assertion with byte-identical
GIC, 216/216 frontend assertions across twelve suites, 12/12 catalog
assertions, and both production builds. The Area lane owned no runtime process
or capture. At the read-only coordination checkpoint, the VFX-managed pair
occupied ports 3000/5173 and both service locks; the global proof-capture lock
was free. Those processes were not altered.

This is not full program completion. Browser Save/reopen, exact-candidate
Toolset Save/Build/reopen, NWN traversal/loading-screen behavior, and
independent DWK/WOK accessibility remain missing for this capability, while
the wider 99-tileset certification and other partial/not-started rows remain
governed by the requirements above.

## Existing Area loading-screen Word checkpoint — 2026-08-24

Immutable capability catalog revision `2026-08-24.24` removes Area loading
screen identity from the Advanced preserve-only blocker without promoting the
79-row `properties_advanced_flags` capability beyond
`verified/partial/blocked`. Totals remain 48 implemented, 27 partial, 0
preserve-only, and 4 not-started; release remains 38 available, 36 blocked,
and 5 hidden.

Primary native evidence and the exact contract are frozen in
`area-existing-loading-screen-id-audit-v1-2026-08-24.md`. One already-present,
case-unique and exactly cased Area root `LoadScreenID : Word` is admitted as an
uninterpreted integer in `0..65535`. The implementation does not create a
missing field, infer a `loadscreens.2da` row, synthesize a label/image ResRef,
reuse Door transition semantics, or claim runtime behavior.

Backend parser provenance, strict request validation, immutable source-bound
draft projection, exact ARE writer CAS, candidate/persisted readback, cache
identity, and atomic publication carry the field. Frontend HTTP, scene,
workspace, facade, Advanced dialog, regression, and export paths retain exact
source/target separation. The atomic publication test verifies the target Word
while GIT, GIC, and IFO remain byte-identical.

Accepted bounded evidence is 610/610 backend unit assertions, 25/25 Area
Update atomic-publication assertions, 216/216 frontend unit assertions, 1/1
dedicated frontend regression smoke, 12/12 catalog assertions, and both
production builds. This lane did not start or stop any runtime service,
browser capture, Toolset, or NWN process.

Full completion still requires the effective `loadscreens.2da` catalog, Area
variables and other verified Advanced controls, fresh browser Save/reopen,
exact-candidate Toolset Save/Build/reopen, NWN loading-screen behavior, and the
broader tile rendering/connectivity certification.

## Existing Area visual-environment core checkpoint — 2026-08-25

Immutable capability catalog revision `2026-08-25.35` replaces the broad
`toolset_nwn_visual_differential_incomplete` marker with precise implementation
and proof boundaries. `properties_visual_environment` remains
`verified/partial/blocked`; the 81-row totals remain 51 implemented, 25
partial, 0 preserve-only, and 5 not-started, with 38 available, 37 blocked,
and 6 hidden.

The exact 16-field source closure and exclusions are frozen in
`area-existing-visual-environment-core-mutation-audit-v1-2026-08-25.md`.
Backend and frontend now implement the complete admitted CAS from HTTP detail
through renderer refresh, direct export, atomic publication, and persisted
semantic readback. A visual-only integration case proves byte-identical GIT,
GIC, and module IFO companions.

The row stays partial. A follow-on scalar checkpoint now implements
`WindPower` and `FogClipDist`; `LightingScheme` and `SkyBox` remain
catalog-backed preserve-only controls. Fresh browser, exact-candidate Toolset
Save/Build/reopen, and NWN environment behavior proofs are still missing. This
checkpoint started or stopped no shared runtime process or capture.

## Existing Area Name existing-entry checkpoint — 2026-08-25

Immutable capability catalog revision `2026-08-25.36` removes the obsolete
claim that independent existing alternate inline-ASCII Name entries are not
editable. The 81-row totals remain 51 implemented, 25 partial, 0
preserve-only, and 5 not-started; release remains 38 available, 37 blocked,
and 6 hidden. `properties_basic_identity` remains partial and blocked.

Primary Aurora authority is frozen in
`area-existing-basic-name-existing-entry-mutation-audit-v1-2026-08-25.md`.
The admitted scope changes text in one or more already-present ordered
`CExoLocString` substring records. A complete expected/target list CAS retains
the exact count, uint32 identifiers, order, inline `strRef=0xffffffff`, and
derived simple/multi profile. It does not invent locale labels, add or remove
an entry, reorder entries, edit TLK storage, or admit non-ASCII bytes.

Backend schema, production-draft projection, writer, application service,
candidate validation, transaction storage, persisted semantic readback, and
atomic ARE/GIT/GIC/IFO publication carry the complete list. Frontend HTTP,
scene, persisted draft, properties facade, Aurora-shaped dialog, export,
history, and regression flows validate detached source/target lists. Invalid
Name provenance fails closed without erasing an independently valid Tag.

Accepted evidence is 467/467 focused backend layer assertions, 22/22 backend
application-service assertions, 28/28 Area Update integration assertions,
242/242 focused frontend unit/component assertions, 85/85 full frontend
regression assertions, 12/12 catalog assertions, and both production builds.
The standard combined ts-jest attempt exceeded the fixed 1 GiB heap before
assertions; the bounded isolated-module suites passed without increasing it.

Remaining blockers are TLK and non-ASCII Name mutation, entry add/remove/
reorder, fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
NWN localized-display proof, and the broader tileset/render/connectivity
program. This checkpoint started or stopped no shared runtime process or
capture.

## Existing Area Name entry-removal checkpoint — 2026-08-25

Immutable capability catalog revision `2026-08-25.37` removes the obsolete
claim that all localized Name entry removal is unavailable. The 81-row totals
remain 51 implemented, 25 partial, 0 preserve-only, and 5 not-started; release
remains 38 available, 37 blocked, and 6 hidden.

Primary Aurora authority and the bounded contract are frozen in
`area-existing-basic-name-entry-removal-audit-v1-2026-08-25.md`. An admitted
complete target may remove one or more already-existing nonzero identifiers
while retaining identifier `0` and the relative order of every retained
identifier. The same CAS may edit retained text. Removing the final alternate
entry derives a simple target profile while `expectedProfile` remains the
multi-entry source fence.

Backend schema, projector, preserve-first writer, candidate validator,
transaction transfer, persisted readback, and atomic publication implement
the exact ordered-subset rule. Frontend domain, facade, dialog, export, and
history paths preserve complete detached lists and expose deletion as an
explicit action; empty text is not deletion. Profile-only mutation without
complete lists fails closed.

Accepted offline evidence is 573/573 focused backend layer assertions,
150/150 backend application/compiler assertions, 29/29 Area Update
integration assertions, 244/244 focused frontend assertions, 85/85 full
frontend regression assertions, 12/12 catalog assertions, and both production
builds. The atomic case verifies an exact simple target ARE and byte-identical
GIT/GIC/IFO companions.

Entry add/reinsert, explicit order authoring, a complete language/gender label
catalog, TLK and non-ASCII mutation, browser Save/reopen, Toolset
Save/Build/reopen, NWN display proof, and the broader tileset/render/
connectivity program remain open. This checkpoint used no shared runtime,
browser, Toolset, or NWN process.

## Existing Area visual-environment scalar-controls checkpoint — 2026-08-25

Immutable capability catalog revision `2026-08-25.38` replaces the obsolete
four-field visual blocker with the exact remaining catalog boundary. The
81-row totals remain 51 implemented, 25 partial, 0 preserve-only, and 5
not-started; release remains 38 available, 37 blocked, and 6 hidden.

Primary retail decompilation and RCDATA source-close integer-valued
`FogClipDist : Float` from `30..9999` and `WindPower : Int` from `0..2`.
`environment.2da` and `skyboxes.2da` evidence keeps `LightingScheme` and
`SkyBox` preserve-only until effective catalog provenance and scheme
application are implemented. No GPL source is authority for this decision.

The backend carries one additive full-pair CAS through exact parsing, request
validation, projection, preserve-first writing, candidate validation,
transaction storage, persisted readback, atomic publication, and cache
identity. The frontend carries the detached pair through HTTP, scene,
workspace draft, properties facade, active Visual controls, renderer refresh,
direct Verify/Export, and local Save/reopen. Only `FogClipDist` and
`WindPower` renderer entries are replaced; the 16-field core and unrelated
lighting fields remain intact.

Accepted offline evidence is 77/77 focused backend unit assertions, 30/30
Area Update integration assertions, 154/154 impacted frontend unit/component
assertions, 1/1 focused frontend regression assertion, 12/12 catalog
assertions, and both production builds. The integration case independently
reparses the target ARE and proves GIT/GIC/IFO byte-identical.

The row remains partial and blocked on the two catalog-backed fields, fresh
browser incremental-render/Save/reopen, exact-candidate Toolset
Save/Build/reopen, NWN fog/wind/environment proof, and the broader tileset and
connectivity program. This checkpoint used no managed runtime, browser,
Toolset, or NWN process.

## Catalog-bound visual selection and existing Name-order checkpoint — 2026-08-25

Immutable capability catalog revision `2026-08-25.39` removes two obsolete
implementation blockers while leaving the 81-row totals at 51 implemented,
25 partial, 0 preserve-only, and 5 not-started; release remains 38 available,
37 blocked, and 6 hidden.

`properties_visual_environment` now admits `LightingScheme` and `SkyBox` only
through fresh effective `environment.2da` and `skyboxes.2da` provenance. The
hash-bound selection CAS re-resolves physical rows, applies the complete native
environment row for a scheme change, permits only complete native-reachable
manual overrides, and writes the explicit final Sky Box. Candidate validation
and persisted readback independently compare the final selection, visual, and
scalar state. The row stays partial solely for browser, Toolset, and NWN proof.

`properties_basic_identity` now also admits exact ordering of already-existing
inline printable-ASCII `Name` entries. The target retains identifier `0`, uses
only unique source identifiers, and may combine text edits, removal, and
reordering in one complete-list CAS. The frontend exposes explicit move actions
and all backend write/readback boundaries preserve exact target order. Its
remaining implementation blocker is limited to entry add/reinsert plus TLK and
non-ASCII authoring; the language/gender label catalog remains absent.

Accepted offline gates are 9 backend suites with 132 assertions and 5 frontend
suites with 63 assertions for catalog-bound visual selection, plus 7 backend
suites with 578 assertions and 4 frontend suites with 53 assertions for Name
reordering. Both dedicated regression smokes, 12/12 immutable catalog
assertions, and both production builds pass. No managed service, browser,
Toolset, or NWN process was started for this checkpoint. Fresh browser
Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN visual/localized
behavior, and the broader 99-tileset rendering/connectivity program remain
open.

## Existing Area Name bounded Add/Reinsert checkpoint — 2026-08-25

Immutable capability catalog revision `2026-08-25.40` removes the obsolete
blanket Add/Reinsert implementation blocker. The 81-row totals remain 51
implemented, 25 partial, 0 preserve-only, and 5 not-started; release remains
38 available, 37 blocked, and 6 hidden. `properties_basic_identity` remains
partial and blocked on unresolved/TLK/non-ASCII semantics plus runtime proof.

Primary retail decompilation and the pinned retail English TLK source-close
six Western language rows and the native `language * 2 + gender` key, with
English gender forced to zero. Immutable catalog
`aurora-area-name-language-catalog.v1` therefore admits exactly identifiers
`{0,2,3,4,5,6,7,8,9,10,11}`. Identifier `1`, four unresolved native grid rows,
and every other absent identifier fail closed. Existing unknown identifiers
remain source-bound and are never synthesized. No GPL source was inspected or
used.

The existing complete expected/target list CAS now permits a missing admitted
identifier with nonempty printable-ASCII text at an explicit target position.
Backend schema, projector, writer, candidate validator, transaction transfer,
and persisted readback preserve the exact list and derived profile. Frontend
domain, scene/draft/facade, direct export, and Area Properties mirror the
catalog and expose only missing entries through a validated Add/Reinsert form.

Accepted offline gates are 9 backend suites with 621 assertions, 9 frontend
suites with 195 assertions, both dedicated Name-entry regression smokes,
12/12 immutable capability-catalog assertions, and passing backend/frontend
production builds. The frontend build emits only the existing chunk-size
advisory. No managed service, browser, Toolset, or NWN process was started.
Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen, NWN
localized display, the unresolved/TLK/non-ASCII Name scopes, and the full
99-tileset rendering/connectivity program remain open.

## Existing Sound interval/variation storage CAS checkpoint — 2026-08-25

Immutable capability catalog revision `2026-08-25.41` adds source-closed
evidence for one bounded existing-Sound storage mutation while keeping the
81-row totals at 51 implemented, 25 partial, 0 preserve-only, and 5
not-started; release remains 38 available, 37 blocked, and 6 hidden.
`objects_sound_authoring` truthfully remains partial and blocked.

Primary retail decompilation and RCDATA prove exact GFF labels/types plus
Toolset presentation domains for `Interval`, `IntervalVrtn`,
`PitchVariation`, and `VolumeVrtn`. The admitted tuple is nonnegative
`0..60000 ms` in 10 ms increments, pitch hundredths `0..100`, and raw volume
variation byte `0..127`. Negative/high-bit interval variation remains
preserve-only because its NWN runtime meaning is not source-closed. No GPL or
external source was inspected or used.

Backend parsing, projection, independent replanning, complete-tuple CAS,
candidate reconstruction, GIC preservation, and transaction receipt are now
connected. Frontend HTTP, scene, draft, clone, presentation conversion, and
Sound Properties controls share the exact provenance-bound contract. Loose
presentation values cannot invent native storage, and absent/malformed source
tuples keep the controls disabled and preserve-only.

Accepted offline gates are 9 backend suites with 1,751 assertions, 7 frontend
files with 234 tests, 12/12 immutable capability-catalog assertions, and
passing backend/frontend production builds. No managed service, browser,
capture, Toolset, or NWN process was started. Browser Save/reopen,
exact-candidate Toolset Save/Build/reopen, NWN scheduling behavior, excluded
Sound fields, and the full 99-tileset rendering/connectivity program remain
open.

## Existing Sound base-volume storage CAS checkpoint — 2026-08-25

Immutable capability catalog revision `2026-08-25.42` adds a second bounded,
source-closed existing-Sound mutation lane while keeping the 81-row totals at
51 implemented, 25 partial, 0 preserve-only, and 5 not-started; release remains
38 available, 37 blocked, and 6 hidden. `objects_sound_authoring` remains
truthfully partial and blocked.

Primary retail decompilation proves exact `Volume:BYTE` read/write behavior,
direct Sound Properties load/save wiring, and the native `0..127` clamp. The
retail form authority establishes the same raw trackbar domain. Aurora Web
therefore admits only one exact integer byte `0..127` from unique source
provenance. Missing, duplicate, wrong-case, wrong-type, out-of-range, or stale
state stays preserve-only. This does not claim NWN loudness, attenuation,
mixing, priority, or other runtime audio semantics. No GPL or external source
was consulted.

Backend parser, detached projection, draft projector, independent replanner,
field-only CAS writer, complete Sound-struct candidate reconstruction, paired
GIC preservation, and transaction receipts now carry the same contract.
Frontend HTTP, scene/draft/clone boundaries, normalized presentation, and the
Basic Sound Properties slider preserve the exact byte and refuse to synthesize
storage without exact source/current provenance. Base volume can coexist with
the already-admitted position and interval/variation mutations.

Accepted bounded gates are 9 backend suites with 1,766 assertions and 8
frontend files with 254 tests. The immutable capability-catalog gate and both
production builds are executed at handoff. No managed service, browser,
capture, Toolset, or NWN process was started. Fresh browser Save/reopen,
exact-candidate Toolset Save/Build/reopen, NWN audible behavior, remaining
Sound fields, and the complete 99-tileset rendering/connectivity program stay
open.

## Current-state refresh — 2026-08-26

The original headline counts in this audit are historical. The authoritative
catalog is now revision `2026-08-26.50` and contains 81 rows:

| State | Rows |
| --- | ---: |
| `implemented` | 51 |
| `partial` | 26 |
| `preserve_only` | 0 |
| `not_started` | 4 |
| `available` | 38 |
| `blocked` | 37 |
| `hidden` | 6 |

The four not-started rows are `connectivity_nwn_traversability`,
`certification_all_definition_render`,
`certification_all_connection_rows`, and `certification_nwn_runtime`.
The 26 partial rows divide into three materially different classes and must
not be reported as one nearly-complete percentage:

1. Real application or reverse-contract work remains for the NSS
   editor/publication/freshness/UI boundary and for the complete
   authoring/property/equipment/runtime matrices across applicable object
   families.
2. Area visual environment, audio environment, start location, the admitted
   Sound storage surface, transactional materialization, placement, and cache
   paths have substantial implementation coverage but remain blocked on fresh
   browser, Toolset, and NWN proof.
3. Renderer closure, SET adjacency, PathReference, PathConnect, WOK seams,
   connected components, and the certification rows remain corpus-scale or
   live-proof work.

The canonical stage validator was rerun offline on 2026-08-26. Stage 4 passes
`8/8`. Stage 5 passes `6/11`; Fog/lighting, day/night/weather, music/ambient,
universal camera reset, and universal Save/reopen remain incomplete. Stage 6
passes `0/7`; Door properties remain partial and transition, trigger-script,
Sound runtime, encounter, merchant, and waypoint functions remain incomplete.
Stage 7 passes `0/6`; Save/Save As, Build Module, script compilation, Test
Module, runtime proof, and restart persistence are not yet complete. Stage 8
passes `0/6`; its function-to-proof matrix, second fixture, complete negative
coverage, versioning, blocker registry, and closure audit remain incomplete.

The source-bound v12 tile plan remains an immutable structurally ready
historical plan. Before the compiler-provider implementation it was bound to
plan ID
`7a3f8a0e8366411e5a6334c260089cf3c184840ade30e6568bbd136fb908c781`,
profile SHA-256
`ffe4d7fbbd0e9108e17677882f5859be2cbddd7559121fdeffe5b0b6bfa80ad2`,
runtime digest
`69f9c763bc1dbf9acb156ea89fb237e34c61e16562d079002bb732b697b4c999`,
99 tilesets, 53,700 rows, 45,003 Add/Render rows, 44,664 PathConnect rows,
and 3,378 chunks. Its checkpoint is intentionally `0/3378`; PathConnect is
independently `0/44,664`. The 2026-08-26 compiler-provider source changes make
that runtime identity stale for the current worktree. A successor profile and
plan must be created only after the remaining source implementation settles;
no accepted v12 capture is lost. The bounded offline status readback reports
observed digest
`1e8ddfb6e8ab62a206102c51d2dd2b7b9036c26b3756c661dc6d8910c3d99bdd`,
1,455 files, 26,951,086 bytes, and next action
`runtime_build_reprofile_required`.

The live lane is not safe to resume. The single bounded dependency preflight
recorded an unavailable Docker engine and the unchanged fatal Inference
endpoint fingerprint. Its blocker manifest is
`output/proof/proof-runtime-dependency-preflight-2026-08-26T143526Z.blocker.json`
(SHA-256
`3a493d357295ac41cedb2dac6b6fb24b3cad780f249dca5c28ccb03e145aa449`).
No second start or repeated preflight is authorized against that fingerprint.

The exact AUR-S07 v2 PathConnect profile, MOD, ordered HAKs, geometry gate,
packed readback, Toolset captures, runtime binding, and armed handoff all pass
offline identity verification. The required fresh NWN observation, exact
runtime capture, engine/load log, and validated runtime packet remain absent,
so `proofCompleteness=missing` and `modelVisibility=not_tested`. The durable
record is
`output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07-v2-offline-verification-2026-08-26.blocker.json`
(SHA-256
`03a3504b296d19895cd70ed7070b89f3e16a7e2b0230431b8fc16f8c43ada0df`).

### Sequencing decision

Source implementation gaps are completed before the next exhaustive browser
matrix. Any edit under the runtime identity roots requires a successor
runtime-build profile and invalidates v12 as proof of that future build.
Because v12 has zero accepted chunks, this ordering discards no accepted
current-build capture and avoids repeating thousands of captures after code
changes. Documentation and derived blocker records do not change the bound
runtime digest. Full completion remains `missing`; no Area, renderer, or
connectivity row is promoted solely from offline identity or contract checks.

### NWScript provider progress

The exact external compiler-provider execution boundary is now implemented
and verified. The hash-bound `nwn_script_comp` 2.1.2 provider, language
specification, runtime-library set, one-worker execution profile, timeout,
input/output budgets, sanitized diagnostics, deterministic NCS/NDB output,
and freshness receipt are covered by focused tests and a real positive plus
negative execution. Production configuration is disabled by default and
requires a complete exact identity tuple. The durable packet is
`output/proof/area-event-script-compiler-provider-audit-2026-08-26/provider-verification.json`
(SHA-256
`627a1fc21a9feb069d257d395870ff207855cbd01e3548772a233b81cdcdcd79`).

This advances `properties_event_scripts_compile` to
`verified/partial/hidden`, producing the 51 implemented, 26 partial, zero
preserve-only, and four not-started totals above. It does not close the NSS
editor, revision-fenced NSS/NCS/NDB publication/readback, frontend diagnostics,
release-source attribution for bundling, or browser/Toolset/NWN proof.

### NWScript publication and recovery progress

The revision-fenced backend publication gap is now closed. Canonical source
commands, exact committed include capture, provider execution, shared locking,
idempotency, byte-free memory/MySQL journals, immutable three-resource snapshot
publication, independent readback, exact compensation, startup recovery, and
fenced quarantine are wired through the privileged HTTP boundary. Raw request,
source, include-count, aggregate compiler-input, process-output, and artifact
budgets all fail closed. Authorization precedes idempotency replay lookup, and
successful publication invalidates the affected Area/editing/catalog caches.

The focused offline gate is 135/135 assertions across 20 unit suites, 2/2
atomic integration assertions, the catalog check, and a passing backend build.
The durable verification packet is
`output/proof/area-event-script-publication-transaction-audit-2026-08-26/publication-verification.json`
(SHA-256
`1fcf5f5069c47033929faad95107984aefb7e43c9df2d0edab66fa85d50922c8`).
No Docker, service, browser, capture, Toolset, or NWN lane was touched.

Catalog revision `2026-08-26.51` still contains 81 rows with the unchanged
state totals of 51 implemented, 26 partial, zero preserve-only, and four
not-started. The script compilation row remains partial and hidden, but its
transaction-publication blocker is removed. Frontend NSS authoring and
diagnostics, release-source lineage for bundling, browser Save/reopen, Toolset
Save/Build/reopen, NWN dispatch, the complete object/property matrices, and the
99-tileset Add/Render plus independent PathConnect/WOK proof remain open.

### NWScript committed-source editor progress

The source-query and frontend-authoring gaps listed above are now closed
offline. A revision-fenced backend query returns only one verified lossless
UTF-8 NSS snapshot. Strict frontend domain validators, a dedicated port/HTTP
adapter, application facade, browser composition root, and editor-session state
now support existing-source load, deliberate new-source creation, include-set
editing, non-mutating validation, bounded compiler diagnostics, and verified
atomic publication. Any target/source/include/revision change invalidates stale
validation and publication state; cross-command responses and receipts fail
closed.

The final focused checkpoint passes 37/37 backend and 58/58 frontend assertions
plus both production builds. The immutable packet is
`output/proof/area-event-script-editor-offline-audit-2026-08-26/editor-verification.json`
(SHA-256
`d08048fe22586c38953100d699fcf37dfa37a202f1924035a57777bdc29dd2da`).
Catalog revision `2026-08-26.52` still contains 81 rows, now with 52
implemented, 25 partial, zero preserve-only, and four not-started rows; release
totals remain 38 available, 37 blocked, and six hidden. The script compilation
row is `verified/implemented/hidden`, with only compiler release-source lineage
retained as its implementation-catalog blocker.

This does not close the overall Area program. Authenticated browser proof,
native Toolset Save/Build/reopen, NWN dispatch, remaining object/property
matrices, the complete 99-tileset Add/Render matrix, and independent
PathConnect/WOK proof remain open. The unchanged Docker fatal fingerprint was
not probed again, and no live process lane was touched.

## Existing Creature base ability-score Byte CAS checkpoint — 2026-08-28

Capability catalog revision `2026-08-28.77` adds exact evidence and release
blockers for the retained Creature base-score lane while keeping the 81-row
totals unchanged at 52 implemented, 25 partial, zero preserve-only, and four
not-started; release remains 38 available, 37 blocked, and six hidden.
`objects_creature_authoring` remains truthfully partial and blocked.

Primary retail decompilation, retained packed GIT summaries, and the accepted
native Strength transition close the storage contract for exact existing
`Str`, `Dex`, `Con`, `Int`, `Wis`, and `Cha` fields. Each canonical field is an
independently presence-sensitive `BYTE` in `0..255`. Missing, duplicated,
wrong-case, wrong-type, malformed, or stale storage remains preserve-only, and
this lane never creates or removes a field. Racial modifiers, derived totals,
classes, feats, skills, hit points, `CRAdjust`, and other statistics remain
outside the admitted contract. No GPL or external source was consulted.

Backend parsing, snapshot/cache projection, draft projection, independent
ordinal replanning, per-member CAS, native-order subset writing, complete
candidate verification, paired GIC preservation, transaction publication, and
persisted readback now carry the same contract. Frontend HTTP, scene,
workspace-draft, history, UI gating, reducer, and materialization paths retain
exact per-member provenance. Apply, OK, reopen, and local Save were exercised;
new or seed Creature drafts remain authorable within the byte bound without
being mistaken for retained native storage.

Fresh accepted offline gates are 8 backend unit suites with 2,099 tests, the
complete Area Update integration suite with 56 tests, 8 frontend
unit/regression files with 637 tests, 13 immutable capability-catalog tests,
and passing backend/frontend production builds. No Docker command, service,
watcher, browser, capture, Toolset, NWN, or mutation-test process was started.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, NWN behavior proof, remaining Creature properties,
arbitrary Creature-template Create, the complete object-family authoring
matrix, and the full 99-tileset Add/Render plus independent PathConnect/WOK
program remain open. This checkpoint does not promote Creature authoring or the
overall Area program to complete.

## Existing Creature natural armor Byte CAS checkpoint — 2026-08-28

Capability catalog revision `2026-08-28.78` adds exact evidence and three live
release blockers for retained Creature `NaturalAC` while preserving the
truthful partial/blocked state of `objects_creature_authoring`. Primary retail
decompilation and bounded static disassembly establish one case-sensitive
`NaturalAC : Byte` member on type-`4` placed Creatures. The Toolset accepts a
wider text range and narrows it on save; Aurora Web deliberately exposes only
the lossless serialized domain `0..255` and never reproduces byte wraparound.

The complete offline path is implemented for exact existing storage and for
bounded new/seed drafts. Missing, duplicated, wrong-case, wrong-type,
malformed, or stale retained storage remains preserve-only. HTTP, scene,
workspace, history, dialog, reducer, final materialization, parser, cache
identity, projection, ordinal CAS planning, Byte-only GIT writing, complete
candidate readback, and atomic publication all carry the same contract while
GIC/IFO and unrelated GIT fields remain unchanged. Base AC, Dexterity Bonus,
Size Modifier, Total AC, `CRAdjust`, hit points, saves, skills, and other
statistics remain outside this admitted slice.

Final accepted offline gates are `2,116/2,116` assertions across nine bounded
backend unit suites, `57/57` Area Update integration assertions, `656/656`
assertions across eight focused frontend unit/regression files, and passing
backend/frontend production builds. The frontend build retains only its
existing large-chunk advisory. All verification was sequential and bounded;
no Docker command, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, xoreos source, or other GPL source was used.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, NWN inspection, remaining Creature/object property
matrices, arbitrary Creature-template Create, the 99-tileset Add/Render matrix,
and independent PathConnect/WOK proof remain open. This checkpoint does not
promote Creature authoring or the overall Area program to complete.

## Existing Creature saving-throw Short CAS checkpoint — 2026-08-28

Capability catalog revision `2026-08-28.79` adds exact evidence for retained
Creature `fortbonus`, `refbonus`, and `willbonus` while preserving the truthful
partial/blocked state of `objects_creature_authoring`. Primary retail
decompilation and bounded static Toolset disassembly establish three exact
lowercase type-id-`3` GFF Shorts on type-`4` placed Creatures, native save
order `reflex`, `will`, `fortitude`, and the Toolset's inclusive edit interval
`0..250`.

The complete offline path is implemented as independently presence-sensitive
per-field CAS. Missing, duplicated, wrong-case, wrong-type, out-of-range,
malformed, or stale retained storage remains preserve-only; no absent field is
created or removed. HTTP, scene, workspace, history, dialog, reducer, final
materialization, parser, cache identity, projection, ordinal planning,
Short-only GIT writing, complete candidate readback, and atomic publication
all carry the same contract while GIC/IFO and unrelated GIT fields remain
unchanged. Base saves, ability modifiers, totals, progression, feats, effects,
and runtime behavior remain outside this admitted slice.

Final accepted offline gates are `2,133/2,133` assertions across nine bounded
backend unit suites, `58/58` Area Update integration assertions, `671/671`
assertions across eight focused frontend unit/regression files, and passing
backend/frontend production builds. The frontend build retains only its
existing large-chunk advisory. The catalog consolidates ChallengeRating,
ability-score, NaturalAC, and saving-bonus live proof into three still-open
Creature-statistics blockers without losing release truth.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, NWN inspection, remaining Creature/object property
matrices, arbitrary Creature-template Create, the 99-tileset Add/Render matrix,
and independent PathConnect/WOK proof remain open. No Docker command, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test, xoreos
source, or other GPL source was used.

## Existing Creature alignment Byte-pair CAS checkpoint — 2026-08-28

Capability catalog revision `2026-08-28.80` binds the source-closed retained
Creature alignment lane while preserving the truthful `partial`/`blocked`
state of `objects_creature_authoring`. Primary Aurora common and placed
Creature reader/writer evidence establishes exact `GoodEvil : Byte` and
`LawfulChaotic : Byte` storage. Static retail Toolset RTTI and disassembly
establish one coupled selector with nine exact label pairs over values
`{0, 50, 100}`. No xoreos or other GPL source was consulted.

The complete offline path now carries the same coupled contract. Both native
members must be present, canonical, exact-case, and owned by one immutable
type-`4` ordinal before editing is authorized. Partial, absent, duplicated,
wrong-case, wrong-type, intermediate legacy, malformed, or stale storage
remains preserve-only and is never normalized. HTTP, scene, workspace,
history, visible selector gating, reducer, final Apply, Apply/OK/reopen/local
Save, GFF parsing, cache identity, draft projection, ordinal planning,
full-pair CAS, two-Byte replacement, candidate readback, and atomic
publication are implemented while preserving GIC/IFO and unrelated GIT data.

Final accepted offline gates are `2,151/2,151` assertions across nine bounded
backend unit suites, `59/59` assertions in the complete Area Update integration
suite, `688/688` assertions across eight focused frontend unit/regression
files, `13/13` capability-catalog assertions, and passing backend/frontend
production builds. The frontend build retains only its existing large-chunk
advisory.

Two initial Jest commands used the repository's non-isolated unit transform
and terminated at the enforced 1 GB heap cap. They started no service and
touched no Docker state. Verification then moved to the intended isolated,
one-worker bounded config with one fresh process per test file, eliminating
memory accumulation. No Docker command, managed service, watcher, browser,
capture, Toolset/NWN process, or mutation test was started.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN inspection remain independent alignment
release gates. Creature authoring remains partial and blocked; arbitrary
Creature-template Create, remaining Creature/object properties, the complete
99-tileset Add/Render matrix, and independent PathConnect/WOK proof remain
open. This checkpoint does not promote the overall Area program to complete.

## Existing ground-Item VarTable CAS checkpoint — 2026-08-29

Capability catalog revision `2026-08-29.103` binds the exact retained
ground-Item `VarTable` lane while preserving the truthful `partial`/`blocked`
state of `objects_item_authoring`. Primary retail decompilation establishes
that the common Item reader and writer delegate the type-`0` GIT Item's
`VarTable` to Aurora's generic variable-table routines. The supported native
entry types are exact type ids `1` (`Int`), `2` (`Float`), and `3`
(`CExoString`); order and duplicate names are physical state, and absence is
an exact empty table. Static Toolset dialog evidence exposes the native
`Variables...` action and no Item event-script page. The previous arbitrary
Item Scripts shell is therefore removed from the Area Item editor. Unknown
compatibility metadata remains preserved but is no longer presented or
normalized as native Item behavior. No xoreos or other GPL source was used.

The complete offline retained-object path now carries one immutable,
ordinal-bearing source provenance and one complete target list. HTTP parsing,
scene mapping, workspace-draft validation, history cloning, property drafts,
the native Variables editor, reducer/materialization, GFF parsing, snapshot
identity, draft projection, independent ordinal CAS planning, type-preserving
GIT writing, candidate compilation, and persisted readback all share the same
contract. Missing, malformed, wrong-owner, unsupported-type, stale, or
non-float32 provenance remains preserve-only; GIC, IFO, Item placement, and
unrelated GIT fields remain unchanged.

Accepted offline gates are `1,869/1,869` assertions across the focused bounded
backend unit files (including the capability catalog), `792/792` assertions
across the focused frontend unit files, and passing backend/frontend
production builds. The frontend build retains only its existing large-chunk
advisory. One ordinary backend Jest invocation reached the enforced 1 GB heap
cap during `ts-jest` diagnostics; it started no service and touched no Docker
state. The same catalog test then passed `13/13` in 0.5 seconds under the
repository's intended `test:unit:bounded` isolated one-worker profile. Further
backend checks for this lane must keep that bounded profile.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN inspection remain independent Item VarTable
release gates. The wider Item property matrix, arbitrary Item-template Create,
remaining object-family matrices, the complete 99-tileset Add/Render matrix,
and independent PathConnect/WOK proof remain open. No Docker command, managed
service, watcher, browser, Chrome, capture, Toolset/NWN process, or mutation
test was started. This checkpoint does not promote Item authoring or the
overall Area program to complete.

## Item blueprint/Area-instance application safety checkpoint — 2026-08-30

The frontend property-application boundary now distinguishes an Items-mode
wizard blueprint from every retained or placed Area Item before either scene
materialization or backend publication. Only an `itm_wizard_*` Item may use the
existing UTI authoring surface and create/update port. Area mode and non-wizard
catalog objects are scene-only and emit
`ui.workspace.item_properties.blueprint_publication_skipped` with object,
mode, and reason context. This closes the defect where applying properties to
a ground Item could accidentally create or overwrite an unrelated UTI.

The same policy is enforced below the React controls by one pure application
materializer. Exact retained `Tag`, `TemplateResRef`, admitted localized
strings, instance state, GIC Comment, and `VarTable` remain mutable through
their source-bound reducers. Name and StrRef presentation fields, PaletteID,
BaseItem, model/armor/cloak/color payloads, PropertiesList, scripts, and every
other unproven member retain their source values even if a caller forges a
draft. The Item window marks those controls `PRESERVE_ONLY`; the UTI wizard
keeps the supported blueprint controls `ACTIVE_NOW`. Variables remain
source-provenance-gated because the current UTI create/update contract does not
publish a variable table.

Fresh resource-safe verification passes `32/32` focused frontend routing,
materialization, and dialog assertions plus a complete frontend TypeScript and
production Vite build. No capability-catalog revision was needed because this
checkpoint narrows unsafe frontend behavior without claiming a new Aurora
mutation capability. No Docker command, service, watcher, browser, Chrome,
capture, live Toolset/NWN process, mutation test, sub-agent, xoreos source, or
other GPL source was used.

Exact-candidate Toolset Save/Build/reopen, packed GFF readback, NWN inspection,
the remaining retained Item property matrix, full object-family authoring,
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. This checkpoint does not promote Item authoring or the overall
Area program to complete.

## Existing retained Store inventory CAS checkpoint — 2026-08-31

Capability catalog revision `2026-08-31.117` binds the source-closed retained
Store inventory lane while preserving the truthful `partial`/`blocked` state of
`objects_store_authoring`. Primary Aurora Toolset decompilation and independent
first-party Store readbacks establish five mode-`3` repositories in exact
physical order `[0,4,2,3,1]`, a 10-by-10 grid over at most 255 pages, complete
embedded Item storage, optional `Infinite : Byte = 1`, and deterministic
first-fit packing using exact `baseitems.2da` slot dimensions. No xoreos or
other GPL source was consulted.

The complete offline retained-object path now carries immutable five-bucket
provenance, exact catalog identity and dimensions, source coordinates, and an
independent target limited to same-bucket reorder/removal plus Infinite state.
HTTP and scene mapping, workspace and local-draft admission, detached history,
visible Store controls, Apply/Cancel/OK, parser and cache identity, projection,
ordinal CAS planning, deterministic repacking, opaque embedded-field
preservation, paired GIC/IFO preservation, candidate readback, transaction
publication, and content-free seven-stage telemetry share the same fail-closed
contract. New entries, BaseItem/ResRef edits, cross-bucket moves, embedded Item
property edits, and client-authored coordinates remain unavailable.

Fresh resource-safe verification passes eight bounded backend suites with
`1162/1162` assertions, seven focused frontend files with `915/915` assertions,
the Store Apply/Cancel/OK regression with `1/1`, and both production builds.
The broader one-worker frontend suite completes `5086/5088`; two failures
reproduce independently in untouched Placeable `renderPackage` and material
sidedness expectations and are recorded as unrelated baseline blockers.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, applicable NWN merchant behavior, arbitrary
Store-template Create, remaining object matrices, the complete 99-tileset
Add/Render matrix, and independent PathConnect/WOK proof remain open. No Docker
command, managed service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.
This checkpoint does not promote Store authoring or the overall Area program to
complete.

## Dynamic effective-catalog Store construction checkpoint — 2026-08-31

Capability revision `2026-08-31.118` removes the former arbitrary
Store-template implementation blocker. Aurora Web now serializes the complete
native UTM Store profile, returns immutable source provenance immediately after
Create/Update, carries that provenance through the frontend Area object, and
re-resolves the exact effective UTM plus its recursive UTI dependency closure
when compiling an Area update.

The admitted source profile is deliberately narrower than arbitrary GFF: one
`UTM `/`V3.2` root, repository order `[0,4,2,3,1]`, and reference-form
`InventoryRes` entries with Word coordinates plus optional canonical
`Infinite=1`. Hash, size, GFF identity, ResRef/Tag, bucket identity, dependency
closure, effective BaseItem lookup, and byte budgets fail closed. The Store is
expanded into paired GIT/GIC state and passes candidate and atomic persisted
readback without trusting frontend blueprint bytes.

Fresh resource-safe gates pass `7/7` dynamic writer/fail-closed assertions,
`158/158` candidate compiler assertions, `1/1` dynamic atomic-publication case,
`49/49` focused frontend assertions, `13/13` capability assertions, and both
production builds. A wider backend run reached `1031/1032`; its sole failure is
an unrelated ASCII-emitter expectation missing the production
`sourceModelHash` member.

Guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
applicable NWN merchant behavior, remaining object matrices, the complete
99-tileset Add/Render matrix, and independent PathConnect/WOK proof remain
open. No Docker command, managed service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. This checkpoint does not promote Store authoring or the
overall Area program to complete.

## Combined Creature class identity/level checkpoint — 2026-08-31

Capability revision `2026-08-31.119` closes the offline implementation gap
for a simultaneous same-roster Creature class-ID and ClassLevel change. One
compare-and-swap mutation now owns the exact canonical `ClassList` graph,
source and target class/level vectors, explicit changed-slot spell clearing,
source and target `StartingPackage`, immutable `classes.2da` and
`packages.2da` identities, and the source-derived HP target.

Projection, raw-GIT replanning, fresh catalog admission, typed GFF writing,
candidate readback, and atomic ARE/GIT/GIC/IFO publication share the same
fail-closed contract. The planner no longer demands impossible catalog
metadata from raw GIT; those identities remain mandatory in the mutation and
are independently re-resolved by the compiler. The frontend permits class ID
and level controls together only with exact class/package/ClassList/HP
provenance, while missing confirmation or missing HP dependencies fails
closed.

Accepted bounded gates are `38/38` focused backend assertions, `64/64` Area
Update atomic-publication assertions, and `614/614` focused frontend
assertions. Slot add/remove/reorder, arbitrary class spell-graph authoring,
fresh browser Save/reopen, native Toolset Save/Build/reopen, NWN behavior,
remaining object-property matrices, complete 99-tileset visual certification,
and independent PathConnect/WOK proof remain open. The overall Area program
therefore remains incomplete.

## Existing retained Creature tail-only ClassList resize checkpoint — 2026-08-31

Capability revision `2026-08-31.120` closes the offline implementation gap for
changing retained Creature ClassList cardinality within the recovered native
profile: one contiguous non-empty prefix, at most eight slots, append at tail,
or explicitly confirmed truncate at tail. The retained prefix is immutable
during resize; appended slots are unique catalog-bound classes with levels
`1..60`; the total remains at most `180`.

Projection, raw-GIT graph/source CAS, fresh class/package catalog admission,
canonical type-`2` GFF append or exact-tail removal, StartingPackage and HP
coupling, candidate readback, workspace persistence, dialog gating, and atomic
ARE/GIT/GIC/IFO publication share the same fail-closed contract. Focused gates
pass `46/46` backend assertions, `64/64` Area Update integration assertions,
`635/635` focused frontend assertions, the complete `21/21` Creature
Properties regression, `13/13` capability assertions, and both builds.

This does not promote Creature authoring or the Area program to complete.
Arbitrary spell graphs, slot reorder/middle mutation, browser Save/reopen,
Toolset Save/Build/reopen, NWN behavior, remaining object matrices, the full
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. The browser lane was not retried because its unchanged blocker is
`getaddrinfo ENOTFOUND mysql`. No Docker command, service, watcher, browser,
Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.

## Existing retained Trigger exact Tag checkpoint — 2026-08-31

Capability revision `2026-08-31.121` closes the offline implementation gap for
one exact existing type-`1` Trigger `Tag : CExoString`. Primary Toolset
reader/writer decompilation, direct PE label resolution, frozen dialog RCDATA,
and the complete `eTagChange` VMT handler establish the exact case-sensitive
field, the 32-code-unit control boundary, and the absence of another coupled
persisted field. Missing or ambiguous storage remains preserve-only; empty and
whitespace-bearing values remain exact. No xoreos or other GPL source was used.

Parser and HTTP provenance, workspace fingerprinting, detached frontend source,
Apply/Cancel/reopen/OK/local-Save, projection, immutable-ordinal CAS planning,
exact GFF replacement, candidate readback, and revision-fenced publication now
share one fail-closed contract. The atomic integration publishes
`"  AREA_EXIT  "`, reports one Trigger property update, and preserves paired
GIC plus module IFO bytes exactly. Logical Trigger/Encounter Properties routing
also remains usable when the canvas overlay is disabled.

Accepted bounded gates are `2130/2130` across seven backend suites, `1/1` for
the exact atomic-publication case, `966/966` across fourteen admitted frontend
files including the real Workspace Trigger flow, `1/1` for hidden-overlay
Properties reachability, and both production builds. The broader combined
frontend run has `1075` passing assertions and one independent dirty-tree
Placeable material-sidedness failure outside this slice.

This does not promote Trigger authoring or the Area program to complete. Fresh
guarded browser Save/reopen remains blocked by `getaddrinfo ENOTFOUND mysql`;
Toolset Save/Build/reopen, NWN Tag behavior, remaining object matrices, the full
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. No Docker command, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## Existing retained Encounter exact Tag checkpoint — 2026-08-31

Capability revision `2026-08-31.122` closes the offline implementation gap for
one exact existing type-`7` Encounter `Tag : CExoString`. Primary Toolset
reader/writer decompilation, direct PE label resolution, frozen dialog RCDATA,
and the complete `eTagChange` VMT handler establish the case-sensitive field,
the 32-code-unit control boundary, and the absence of another coupled
persisted field. Missing or ambiguous storage remains preserve-only; empty and
whitespace-bearing values remain exact. No xoreos or other GPL source was used.

Parser and HTTP provenance, workspace/history/local Save, the shared
Trigger/Encounter Properties shell, projection, immutable-ordinal CAS
planning, exact GFF replacement, candidate readback, and revision-fenced
publication now share one fail-closed contract. The atomic integration
publishes `"  GNOLL_AMBUSH  "`, reports one Encounter property update, and
preserves paired GIC plus module IFO bytes exactly.

Accepted bounded gates are `2167/2167` across nine backend suites, `66/66`
across the full Area Update atomic-publication integration file, `971/971`
across fourteen focused frontend unit/regression files including real
Workspace Trigger and Encounter flows, and both production builds.

This does not promote Encounter authoring or the Area program to complete.
Fresh guarded browser Save/reopen remains blocked by `getaddrinfo ENOTFOUND
mysql`; Toolset Save/Build/reopen, applicable NWN Encounter behavior,
spawn-point and remaining property authoring, the full 99-tileset Add/Render
certification, and independent PathConnect/WOK proof remain open. No Docker
command, service, watcher, browser, Chrome, capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used.

## Latest retained Encounter property checkpoint — 2026-09-01

The cumulative Encounter lane now reaches implementation checkpoint `204`
and capability revision `2026-09-01.136`. In addition to the earlier exact
Tag/flags/reset/spawn/count/script/Faction/Difficulty/LocalizedName/Comment and
ordered VarTable families, exact retained `CreatureList.SingleSpawn` flags are
now implemented as one complete ordered vector CAS. ResRef, Appearance, CR,
cardinality, physical order, and duplicates remain immutable; the writer
changes only canonical nested bytes and complete candidate readback precedes
revision-fenced publication.

The latest slice passes two focused parser cases, `804/804` backend domain/
projector/candidate assertions, `423/423` planner assertions, `977/977` pair-
writer assertions, `1079/1079` frontend boundary assertions, the complete
Workspace Encounter regression, the full `76/76` Area Update atomic-
publication suite, and both builds. Encounter authoring remains
`partial`: full CreatureList add/remove/reorder/template replacement,
spawn-point editing, fresh browser Save/reopen, native Toolset Save/Build/
reopen, and NWN behavior are still open. The overall program also still
requires complete 99-tileset Add/Render certification and independent
PathConnect/WOK proof.

## Existing retained Encounter ordered SpawnPointList checkpoint — 2026-09-01

Implementation checkpoint `205` and capability revision `2026-09-01.137`
close the offline CRUD gap for one exact retained, stationary Encounter
`SpawnPointList`. Immutable source provenance and a detached complete target
now support add, edit, remove, and reorder under full-vector CAS. Each emitted
entry is one canonical type-`2` struct with ordered `X`, `Y`, `Z`, and
`Orientation` FLOAT fields; source ordinals, non-binary32 values, stale
vectors, malformed schemas, and over-budget lists fail closed.

Parser, projector, raw-GIT planner, pair writer, transform/property composition,
candidate compiler, atomic persisted readback, frontend transport/mapper/
workspace/history, and the real Encounter Apply/Cancel/reopen/OK/local-Save
flow share this boundary. Accepted resource-bounded gates are `25/25` domain
and capability assertions, `2/2` focused parser assertions, `630/630`
projector assertions, `424/424` planner assertions, `979/979` writer
assertions, `168/168` candidate-compiler assertions, `77/77` Area Update
atomic-publication assertions, `1083/1083` focused frontend assertions, and
both production builds.

The full parser file separately reports `325` passes and two unrelated
pre-existing Item-metadata expectation failures; the SpawnPointList parser
cases are green. Encounter origin movement with populated spawn points remains
fail-closed pending proof of Toolset coupling. Browser Save/reopen, populated
Toolset Save/Build/reopen plus rollback, NWN spawning behavior, complete
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. No Docker command, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used. Neither Encounter authoring nor the overall Area program is
promoted to complete.

## Existing retained Encounter ordered CreatureList structural checkpoint — 2026-09-01

Implementation checkpoint `206` and capability revision `2026-09-01.138`
close the offline CRUD gap for one exact retained Encounter `CreatureList`.
The complete target now supports source-bound retain/reorder, removal,
catalog-bound UTC add/replacement, duplicate blueprint selection, empty-list
replacement, and per-entry `SingleSpawn`. Legacy four-field targets remain a
strict same-order compatibility input and are migrated to discriminated
`retained` entries by new authoring sessions.

The backend freshly resolves exact effective creature winners, verifies
source key, byte length, SHA-256, `UTC `/`V3.2`/root identity, and canonical
`TemplateResRef`, `Appearance_Type`, and `ChallengeRating`, then derives the
persisted tuple from those bytes. The writer performs source-vector CAS,
rebuilds canonical type-`0` list entries in requested order, and verifies the
candidate before revision-fenced publication. The frontend admits only exact
catalog bindings and exposes add, replace, remove, move up/down, and
`SingleSpawn` in the Encounter Properties window.

Accepted resource-bounded gates are `2222/2222` focused backend assertions,
including `171/171` candidate-compiler assertions, `78/78` Area Update atomic-
publication assertions, `1096/1096` dependent frontend assertions, `7/7`
dialog and real Workspace regression assertions, and both production builds.
The atomic integration proves physical reorder/replacement with exact GIC and
module IFO preservation.

Browser Save/reopen remains blocked by the recorded `getaddrinfo ENOTFOUND
mysql`; it was not retried. Exact-candidate Toolset Save/Build/reopen plus
rollback, NWN spawning behavior, complete 99-tileset Add/Render certification,
and independent PathConnect/WOK proof remain open. No Docker command, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. Neither Encounter
authoring nor the overall Area program is promoted to complete.

## Dynamic current-effective Encounter construction checkpoint — 2026-09-01

Implementation checkpoint `207` and capability revision `2026-09-01.139`
replace the single immutable `x2_gnoll001` Encounter-addition limit with
bounded construction from any exact current effective UTE catalog winner.
Catalog mapping, binary-free drag/local-draft provenance, backend projection,
current-winner resolution, source-key/size/SHA/native identity checks,
canonical common-field copy, optional `VarTable`, complete ordered
`CreatureList`, backend-owned geometry, empty spawn points, paired empty GIC,
candidate readback, and revision-fenced atomic publication now share one
fail-closed contract.

Accepted resource-bounded gates are `34/34` construction, `632/632` projector,
`174/174` candidate-compiler, `66/66` effective-catalog repository, `13/13`
capability, `79/79` atomic-publication, and `35/35` focused frontend assertions,
plus both production builds. The repository's bounded isolated Jest transform
was used after the ordinary full type-checking transform exhausted its fixed
1 GiB heap; production compilation remained green.

Browser Save/reopen, exact-candidate Toolset Save/Build/reopen plus rollback,
and NWN Encounter spawning remain mandatory live proof. The broader program
also still requires complete 99-tileset Add/Render certification and
independent PathConnect/WOK proof. The unchanged browser dependency blocker is
`getaddrinfo ENOTFOUND mysql`, so it was not retried. No Docker command,
service, watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. Neither Encounter
authoring nor the overall Area program is promoted to complete.

## Dynamic current-effective Waypoint construction checkpoint — 2026-09-01

Implementation checkpoint `208` and capability revision `2026-09-01.140`
replace the single immutable `nw_waypoint001` addition limit with bounded
construction from any exact current effective UTW catalog winner. Catalog
indexing and list/preview endpoints, binary-free frontend mapping, paginated
workspace loading, drag/local-draft provenance, backend projection,
current-winner resolution, exact native identity checks, canonical common
field copy, optional `VarTable`, arbitrary native bearing, paired GIC Comment,
candidate readback, and revision-fenced atomic publication now share one
fail-closed contract.

Accepted resource-bounded gates are `11/11` construction, `633/633`
projector, `175/175` candidate-compiler, `67/67` effective-catalog repository,
`13/13` capability, `80/80` atomic-publication, `2/2` focused backend HTTP/
application, and `37/37` focused frontend assertions, plus both production
builds. The complete backend application/controller files retain two unrelated
dirty-tree expectation failures for an older VFX runtime revision and the
already-produced ASCII `sourceModelHash`; the exact Waypoint endpoint tests
are green.

Browser Save/reopen, exact-candidate Toolset Save/Build/reopen plus rollback,
and NWN Waypoint visibility/target-reference behavior remain mandatory live
proof. The broader program also still requires complete 99-tileset Add/Render
certification and independent PathConnect/WOK proof. The unchanged browser
dependency blocker is `getaddrinfo ENOTFOUND mysql`, so it was not retried.
No Docker command, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.
Neither Waypoint authoring nor the overall Area program is promoted to
complete.

## Existing retained Waypoint exact Tag CAS checkpoint — 2026-09-01

Implementation checkpoint `209` and capability revision `2026-09-01.141`
close one bounded existing-Waypoint property lane. Primary reader/writer
`FUN_00658170` / `FUN_00658b4c` prove the exact case-sensitive
`Tag : CExoString` storage in the type-`5` `WaypointList` record. Frozen
`TDLGWAYPOINTEDIT` RCDATA independently proves the Toolset control's
`MaxLength = 32`. Existing accepted native proof demonstrates that a Tag-only
edit preserves template, placement/orientation, Waypoint count, and total
object count. No xoreos or other GPL source was inspected or used.

Aurora Web now preserves exact absent/empty/whitespace storage, exposes only a
32-code-unit NUL-free target, detaches immutable provenance across transport,
workspace, history, and scene ports, and publishes one source-index-bound
compare-and-swap. The writer replaces only one existing Tag field and permits
safe composition with the independently admitted retained Waypoint transform.
The Scene Object List, hidden-marker properties resolver, context/sidebar
routing, and Waypoint Properties dialog now form one tested UI path.

Accepted resource-bounded gates are `38/38` focused backend assertions, the
full `81/81` Area Update atomic-publication suite, `13/13` capability-catalog
assertions, `1061/1061` focused frontend assertions, `18/18` Scene Object List
assertions, the targeted hidden-marker properties assertion, the real
Workspace Apply/Cancel/reopen/OK/local-Save regression, and both production
builds. The ordinary Jest transform exhausted its fixed 1 GiB heap before the
large candidate-compiler file executed; the repository bounded transform
passed without raising that cap.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
and NWN lookup remain release gates. The wider Waypoint property matrix,
target-reference behavior, complete 99-tileset Add/Render certification, and
independent PathConnect/WOK proof remain open. The unchanged browser blocker
is `getaddrinfo ENOTFOUND mysql` and was not retried. No Docker command,
container, service, watcher, browser, Chrome, capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used. Neither
Waypoint authoring nor the overall Area program is promoted to complete.

## Existing retained Waypoint `LinkedTo` and inline `LocalizedName` checkpoint — 2026-09-01

Checkpoint `210` audited two adjacent common Waypoint members without
conflating storage identity with runtime semantics. Exact
`LinkedTo : CExoString` read and write ownership is source-closed, but the
Toolset form hides its controls and the runtime target namespace/coupling is
not proven; it therefore remains preserve-only under blocker
`target_reference_runtime_pending`.

Exact `LocalizedName : CExoLocString` reciprocal read/write ownership is also
source-closed. Aurora Web now transports complete presence-sensitive storage
and admits only the shared deterministic inline language/gender-0 printable-
ASCII profile with unsigned `strRef=0xffffffff` and a 256-byte product ceiling.
TLK-backed, multilingual, malformed, non-ASCII, absent, or otherwise unsupported
storage remains preserve-only. The mutation composes atomically with exact
Waypoint Tag CAS and preserves the paired GIC plus unrelated ARE/GIT/IFO bytes.

Offline verification passed the backend build, 35 checkpoint unit tests, all
82 Area-update integration tests, the frontend build, 1045 HTTP/mapper/draft/
clone tests, focused properties tests, the full 135-test regression gate, and
the Waypoint Cancel/Apply/reopen/OK/local-Save flow. The complete frontend unit
run passed all new Waypoint coverage but retained two unrelated existing
placeable/renderer expectation failures; they are not Waypoint evidence.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
packed localized-string readback, NWN presentation, and the remaining Waypoint
property matrix remain release gates. Neither Waypoint authoring nor the
overall Area program is promoted to complete.

## Existing retained Waypoint inline `Description` checkpoint — 2026-09-01

Checkpoint `211` and capability revision `2026-09-01.143` close the adjacent
common Waypoint `Description : CExoLocString` application lane. Primary
Aurora reader/writer functions `FUN_00658170` / `FUN_00658b4c` establish exact
case-sensitive storage ownership in type-`5` `WaypointList`; frozen Toolset
form evidence and the accepted Waypoint Properties screenshot establish the
separate Description tab without asserting an unobserved native length limit.

Aurora Web now transports and deep-clones complete presence-sensitive storage
and admits only unsigned `strRef=0xffffffff`, empty or one language/gender-0
printable-ASCII entry, and a 4,096-byte product budget. Unsupported, absent,
TLK-backed, multilingual, malformed, non-ASCII, or over-budget storage remains
preserve-only. The optional Description CAS coalesces with Tag and
LocalizedName, replaces only the existing exact GIT member, survives candidate
readback, and publishes atomically while preserving GIC and module IFO bytes.

Offline verification passed the backend production build, `22/22` initial
Description domain/parser/projector assertions, the new planner/writer/
candidate paths, all `83/83` Area-update atomic-publication assertions, the
frontend production build, `1064/1064` focused frontend assertions across nine
files, and the real Workspace Cancel/Apply/reopen/OK/local-Save regression.
The full frontend unit observation still retains the same two unrelated
placeable/renderer expectation failures, while all new Description tests pass.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
packed Description readback, NWN presentation, and the remaining Waypoint
property matrix remain release gates. No Docker command, container, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. Neither Waypoint
authoring nor the overall Area program is promoted to complete.

## Existing retained Waypoint paired-GIC editor `Comment` checkpoint — 2026-09-01

Checkpoint `212` and capability revision `2026-09-01.144` close the adjacent
editor-only Waypoint `Comment : CExoString` application lane. Primary Aurora
reader/writer functions `FUN_00659970` / `FUN_00659bfc` establish that the
placed type-`5` Waypoint owns the member at offset `0x98` and reads/writes it
through exact paired GIC label `Comment`; the GFF helper confirms native type
ID `10`. No xoreos or other GPL source was inspected or used.

Aurora Web now admits only one exactly paired, same-index type-`5`
`WaypointList` GIT/GIC record with one NUL-free Comment of at most 4,096
ECMAScript code units. Empty and whitespace strings remain exact; absent,
ambiguous, wrong-case, wrongly typed, unpaired, stale, malformed, or
over-budget storage remains preserve-only. The frontend separates immutable
source metadata from the editable Comments target through cloning, history,
Apply, Cancel, reopen, OK, and local Save. The backend binds the value into
snapshot identity and requires a source-GIC-digest-bound compare-and-swap,
exact candidate readback, and revision-fenced atomic publication. A
Comment-only pair mutation preserves every GIT byte.

Resource-bounded verification passed `36/36` dedicated backend/catalog
assertions, `2/2` focused planner/writer assertions, the targeted candidate
compiler and atomic-publication assertions, `1062/1062` frontend transport/
mapper/draft/clone assertions, `20/20` focused domain/provenance/facade/
properties assertions, the full `135/135` frontend regression gate, and both
production builds. Known unrelated candidate and full-unit placeable/renderer
expectation failures remain documented and are not Comment evidence.

Fresh guarded browser Save/reopen and exact-candidate Toolset
Save/Build/reopen with packed GIC readback remain release gates. Because the
field is Toolset editor metadata, no NWN runtime-behavior claim is made. The
remaining Waypoint property matrix, target-reference behavior, complete
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. No Docker command, container, service, watcher, browser, Chrome,
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or
other GPL source was used. Neither Waypoint authoring nor the overall Area
program is promoted to complete.

## Existing retained Waypoint map-note vector checkpoint — 2026-09-01

Checkpoint `213` and capability revision `2026-09-01.145` close the adjacent
Waypoint map-note application lane. Primary Aurora common reader/writer
functions `FUN_00658170` / `FUN_00658b4c` establish reciprocal ownership of
exact `HasMapNote : Byte`, `MapNote : CExoLocString`, and
`MapNoteEnabled : Byte`. Frozen `TDLGWAYPOINTEDIT` resources establish the
matching Advanced-tab controls without claiming unproven runtime behavior.

Aurora Web now admits only one complete physical vector on a retained type-`5`
Waypoint. Both bytes must be binary; the localized member must use unsigned
`strRef=0xffffffff`, empty or one language/gender-0 printable-ASCII entry, and
a 4,096-byte product ceiling. Missing, partial, ambiguous, wrong-case,
wrongly typed, non-binary, TLK-backed, multilingual, malformed, non-ASCII,
or over-budget storage remains preserve-only. Projection, immutable-ordinal
planning, writer validation, candidate readback, and revision-fenced
publication treat the three values as one compare-and-swap. A map-note-only
mutation preserves exact GIC and module IFO bytes.

Offline verification passed backend domain/parser `14/14`, projector `9/9`,
bounded persistence `3/3`, the targeted candidate and atomic-publication
assertions, the backend build, frontend transport/mapper/draft/domain/facade/
properties `1075/1075`, dialog `2/2`, the real Workspace
Cancel/Apply/reopen/OK/local-Save regression, and the frontend build. A
default non-isolated Jest transform hit its fixed 1 GB heap before executing
the historic large suites; the isolated bounded repository configuration
completed the required tests without raising the cap.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
packed GIT readback, and independent NWN map-pin behavior proof remain release
gates. Waypoint `Appearance`, target/reference behavior, the remaining
Waypoint matrix, 99-tileset Add/Render certification, and independent
PathConnect/WOK proof remain open. No Docker command, container, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used. Neither Waypoint
authoring nor the overall Area program is promoted to complete.

## Existing retained Waypoint ordered `VarTable` checkpoint — 2026-09-01

Checkpoint `214` and capability revision `2026-09-01.146` close the retained
Waypoint ordered-variable-table application lane. The Waypoint reader
`FUN_00658170` and writer `FUN_00658b4c` delegate to reciprocal common variable
paths `FUN_005e966c` and `FUN_005e9f50`. Those paths establish exact
`VarTable` list ownership and ordered entries containing `Name : CExoString`,
`Type : DWord`, and type-dependent `Value : Int|Float|CExoString`. Frozen
`TDLGWAYPOINTEDIT` resources establish the native `Variables...` control. No
xoreos or other GPL source was inspected or used.

Aurora Web admits absent storage as an editable empty table and otherwise
requires one unambiguous exact list with type-`0` entries. The shared admission
profile preserves order, duplicates, empty names, and empty strings; caps the
table at 1,024 entries, names at 64 code units, strings at 4,096 code units,
and aggregate text at 1 MiB; and accepts only signed int32 values or finite
exact binary32 floats. Unsupported, malformed, ambiguous, wrongly typed,
over-budget, or non-exact storage remains preserve-only. Projection and
planning compare the complete immutable ordered source, and an empty target
removes the physical list.

Offline verification passed `21/21` dedicated backend domain/parser/projector/
persistence assertions, targeted candidate compilation and atomic publication,
the backend production build, `1081/1081` focused frontend transport/mapper/
draft/domain/facade/properties/dialog/clone assertions, the real Workspace
Cancel/Apply/reopen/OK/local-Save regression, and the frontend production
build. The atomic-publication assertion verifies exact GIC and module IFO byte
preservation.

Fresh guarded browser Save/reopen and exact-candidate Toolset
Save/Build/reopen with packed GIT readback remain release gates. Waypoint
`Appearance`, target/reference behavior, the remaining Waypoint matrix,
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. No Docker command, container, service, watcher, browser, Chrome,
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or other
GPL source was used. Neither Waypoint authoring nor the overall Area program is
promoted to complete.

## Existing retained Waypoint `Appearance : Byte` checkpoint — 2026-09-01

Checkpoint `215` and capability revision `2026-09-01.147` close the offline
retained Waypoint Appearance application lane. Primary reader
`FUN_00658170` and writer `FUN_00658b4c` establish the exact canonical Byte;
model builder `FUN_006519a0` resolves its physical `waypoint.2da` row through
`RESREF`; and selector path `FUN_00658914` displays `STRREF` text while
retaining the physical row ordinal. Frozen native dialog resources establish
the Basic-tab Appearance dropdown. No xoreos or other GPL source was inspected
or used.

Aurora Web now resolves one strongest module/ordered-HAK/vanilla table,
publishes a digest-bound selectable-row catalog, binds exact retained source
provenance, and validates the current descriptor and target row before one
immutable-ordinal Byte CAS. The frontend loads that exact catalog, rejects
stale identity and page metadata, and admits only returned physical rows.
Malformed, absent, duplicated, wrongly typed/cased, stale, blank/reserved, or
out-of-table data remains preserve-only or fails closed.

Offline verification passed `58/58` focused backend assertions, including the
candidate and atomic-publication paths, `626/626` focused frontend assertions,
and both production builds under the fixed 1 GiB heap. The repository's
bounded one-worker Jest configuration was used after the normal type-checking
configuration exceeded that heap during initialization; the cap was not
raised.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
packed GIT readback, and NWN presentation for all admitted rows remain release
gates. Target/reference runtime behavior, the remaining Waypoint matrix,
99-tileset Add/Render certification, and independent PathConnect/WOK proof
remain open. No Docker command, service, browser, capture, Toolset/NWN process,
mutation test, or sub-agent was used. Neither Waypoint authoring nor the Area
program is promoted to complete.

## 2026-09-01 tile-source and active-matrix correction

Capability revision `2026-09-01.160` supersedes the historical placeholder
denominator without changing the overall completion verdict. Authoritative
passes 8 and 9 certify zero exclusions. The SET parser preserves exact `NULL`
and `(null)` declarations, and the compiler has no concrete-name exception.
The conservative 99-tileset catalog contains 45,034 source-resolved and 8,666
source-missing rows out of 53,700; no row is classified as an intentional
placeholder.

The new source-bound v13 plan validates 45,031 Add/Render rows, 44,692
connection rows, 9,100 group rows, and 3,380 chunks. Its active checkpoint is
`0/3380`, its plan id is
`7e760c1a088cde19f4b22ec4479bc55e8ce513dd0daf1a4720cd15d7e6d626b4`,
and current source identity validation passes. This closes only offline
inventory, profile, and plan regeneration. Complete live Add/Render,
adjacency, independent PathConnect/WOK, Toolset Save/Build/reopen, and NWN
runtime proof remain release blockers; the Area program is not complete.

No Docker command, service, browser/Chrome capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used for this
successor.

## Existing retained Waypoint `TemplateResRef : ResRef` checkpoint — 2026-09-02

Checkpoint `230` and capability revision `2026-09-02.162` close the remaining
known offline Waypoint property-matrix item. Primary common reader/writer
functions `FUN_00658170` / `FUN_00658b4c` establish exact type-`5`
`WaypointList` GIT ownership, and frozen `TDLGWAYPOINTEDIT` resources establish
the separate Advanced-tab `Blueprint ResRef` control. Aurora Web now admits
one presence-sensitive existing canonical lowercase ResRef at an immutable
Waypoint ordinal and performs an exact compare-and-swap. It does not resolve
or rewrite UTW, invoke bulk instance updates, change `SceneObject.resRef`, or
mutate appearance, palette metadata, `LinkedTo`, paired GIC, or unrelated
fields.

Offline verification passed backend domain/parser/projector/planner/writer/
candidate coverage, the `992/992` writer suite, the focused atomic Area Update
integration, the `13/13` capability gate, the real frontend
Cancel/Apply/reopen/OK/local-Save regression, focused frontend groups of
`773/773` and `345/345`, and both production builds. A TemplateResRef-only
publication writes the expected candidate ARE, changes only the exact GIT
member, and preserves GIC and module IFO bytes. The two aggregate defects
exposed during closure were fixed: Description-only provenance now enters the
Waypoint property aggregator, and the transform/deletion test uses the
intended fixture mode. The whole candidate compiler passes `183/183`, while
the relevant projector suites pass `653/653`.

The generic `remaining_waypoint_property_matrix_incomplete` blocker is
removed. `LinkedTo` remains preserve-only under
`target_reference_runtime_pending`. Fresh guarded browser Save/reopen,
Toolset Save/Build/reopen plus packed GIT readback, and NWN verification remain
explicit release gates, so neither Waypoint authoring nor the Area program is
promoted to complete.

Runtime sources are rebound to immutable v16 digest
`9cc94415bd619d2c40d18f556da540389291987aa566dc623aa7c4f69afa7d39`
and replacement matrix plan
`bbfc10446dcdf4bb9719bc6889d1c4241e9f8032a7636939b0a0d11acc99d68d`.
Active-plan validation is `ready`, source identity is verified, and the
checkpoint remains `0/3380`. No Docker command, service, watcher, browser,
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or
other GPL source was used.

## Existing retained Placeable property-matrix classification checkpoint — 2026-09-02

Capability revision `2026-09-02.163` replaces the vague
`remaining_placeable_property_matrix_incomplete` blocker with the exact
`placeable_full_localized_string_editor_pending` implementation gate. The new
consolidated audit classifies the frozen 5,328-byte `TDLGPLACEABLEEDIT` form
against the exhaustive common, Placeable-template, and placed-instance
reader/writer lineage. No retained Placeable GIT property remains unclassified.

All admitted ordinary-window profiles have complete offline paths for dynamic
UTP construction, retained update, ordered inventory/variable mutation,
deletion, candidate readback, and revision-fenced ARE/GIT/GIC/IFO publication.
Palette category, bulk instance update, browse/edit buttons, defaults, and the
shared-frame `OnFailToOpen` row are commands or non-Placeable storage rather
than missing retained GIT fields. `LightState` is absent from both the frozen
form and placed GIT reader/writer and remains a separate runtime illumination
lane rather than a guessed persistence field.

This does not complete Placeable authoring. `LocName` and `Description` still
admit only the bounded inline language-0 printable-ASCII profile; complete
language/gender, code-page, TLK transition, duplicate/empty-entry, and ordered
entry editing remains unimplemented. Fresh browser readback, Toolset
Save/Build/reopen with packed readback, and NWN behavior also remain explicit
release gates. The capability test passes `13/13`; no Docker command, service,
browser, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.

Because the capability catalog is runtime source, v16 is historical after this
checkpoint. Immutable v17 now binds 1,801 files and 30,614,016 bytes to runtime
digest `a304d5b6764346127fc21d3aabed9426a4ab7a1fa5d7eb60c5bc5b221025f357`.
Its profile SHA-256 is
`1634333a01be3d8a162bf07b9b6c2c87409652e3e30068827c280dfcca399c35`,
its source-manifest SHA-256 is
`0898aae6079d565c258f69f6099498c89e878bd6f87c9d70d38bbbcf836d8e24`,
and replacement plan id is
`179e27a1b9411ff989503c83c3a239b243f0e6ae7add9fbfe4d5d9b9e8365add`.
It explicitly replaces v16, validates `ready` with verified runtime-source
identity, and remains at checkpoint `0/3380`; no capture was performed.

## Existing retained Item property-matrix classification checkpoint — 2026-09-02

Capability revision `2026-09-02.164` replaces the vague
`full_item_property_matrix_incomplete` blocker with the exact
`item_full_localized_string_editor_pending` implementation gate. The
consolidated audit classifies the frozen 18,562-byte `TDLGITEMEDIT` form
against the exhaustive common Item and retained type-`0` GIT reader/writer
lineage. No retained ground-Item GIT property remains unclassified.

All admitted ordinary-window profiles have complete offline paths for dynamic
UTI construction, retained update, ordered property/inventory/variable
mutation, deletion, candidate readback, and revision-fenced ARE/GIT/GIC/IFO
publication. Derived cost/combat/armor/property summaries are table or property
graph views rather than independent GFF members. Palette category, preview
mode, restore-default, browse/edit, and bulk-update controls are editor commands
or blueprint workflows, not missing retained GIT fields.

This does not complete Item authoring. `LocalizedName`, `Description`, and
`DescIdentified` still admit only the bounded inline language-0 printable-ASCII
profile; full language/gender, code-page, TLK transition, duplicate/empty-entry,
and ordered-entry editing remains unimplemented. The existing browser,
Toolset Save/Build/reopen plus packed readback, and NWN proof blockers also
remain explicit. The test-first catalog gate passes `13/13`, the bounded
Item/catalog group passes `16/16` suites and `199/199` tests, and the backend
production build passes.

Because the capability catalog is runtime source, v17 is historical after this
checkpoint. Immutable v18 binds 1,801 files and 30,614,116 bytes to runtime
digest `2d857a0d8c83974653c98eb07198c26d6cd54c4723d718eca41993e1479aeebb`.
Its profile SHA-256 is
`f4e70bd9b0fbe00c8e6c21b36ffdb3f2fc8ee33fdbe20c35eeefa17dcdbe6ee4`,
its source-manifest SHA-256 is
`d14b6873cb05e3bfd6a165c266aeea83591db68bf7a1db2e5cb6b5caace82e4b`,
and binding SHA-256 is
`5331c59b485e0f7b58907ef6a34ad58ad5ccd64f22112e3ba5d95481ca6fee36`.
Replacement plan id
`84d1ac84dd19144e1aa9e7b16b3a39a5a2ade55b050c79c1ae968f259efee630`
explicitly replaces v17, validates `ready` with verified runtime-source
identity, and remains at checkpoint `0/3380`; no capture was performed. No
Docker command, service, watcher, browser/Chrome capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used.

## Existing retained Creature `Description` localized-string checkpoint — 2026-09-02

Capability revision `2026-09-02.165` implements the bounded existing-Creature
`Description : CExoLocString` lane without widening the already published name
profile. Primary common Creature reader/writer functions `FUN_00532174` /
`FUN_0053521c` load and emit exact `Description`, while placed type-`4`
wrappers `FUN_0053ab24` / `FUN_0053ae80` establish GIT ownership. Frozen
`TDLGCREATUREEDIT` resources expose the Basic-tab Description control and its
localized-editor action.

The backend now retains exact presence-sensitive Description storage beside
`FirstName` and `LastName`, accepts one changed language-0 printable-ASCII
inline value up to 4,096 bytes, replans it against the immutable Creature
ordinal, and replaces only the selected existing type-`12` field. Source
`strRef`, ordered entries, duplicates, empty bytes, unrelated GIT fields, and
the paired GIC remain preserved. Candidate readback and the existing
revision-fenced ARE/GIT/GIC/IFO publication remain mandatory. The frontend
HTTP boundary, scene mapper, saved-draft validator, detached provenance,
workspace cloning, materializer, and Creature properties dialog carry the
same additive contract; older two-member name drafts remain readable.

Bounded verification passes `2285/2285` backend assertions in seven suites,
`6/6` focused Creature parser assertions, the `14/14` capability gate,
non-overlapping frontend groups of `1099/1099`, `88/88`, and `15/15`, and both
production builds. The complete parser file retains two unrelated Item
metadata fixture failures; focused Creature parsing is green and this slice
does not alter those Item paths.

Creature authoring remains `partial`/`blocked`. Full multilingual editing for
all three localized strings remains
`creature_full_localized_string_editor_pending`; body parts, colors, wings,
tail, the coupled `CRAdjust` calculator, arbitrary class spell graphs, special
abilities, live browser readback, Toolset Save/Build/reopen, NWN behavior, and
the full tile/render/connectivity program remain open.

The source writes make v18 historical. Immutable v19 binds 1,801 runtime files
and 30,619,249 bytes to digest
`c3624c07b75038b26cd8f66123287127231a744f1cfa113c50fafa1fd2fce72c`.
Profile SHA-256 is
`4ea2a3cf73eebe40b68984f1141f241c67b6cb8ba016fcecc834ee44bcedd9ee`,
source-manifest SHA-256 is
`124738bf135c2d4ca511b8b1cb38ff7d751b59196cbf3556bc26ffa862a114a5`,
and binding SHA-256 is
`2ada7af95744eab733a075dff513c8c2cac4f762d69dd791766c858f610f4f2a`.
Replacement plan id
`b7e2c52aa4f2ee5241ff402462e1fae3ca13b28787f75d006305a394573176e9`
explicitly replaces v18, validates `ready` with verified runtime-source
identity, and remains at `0/3380`; no capture was performed. No Docker command,
service, watcher, browser/Chrome capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.

## Existing retained Creature appearance-color checkpoint — 2026-09-02

Checkpoint `234` and capability revision `2026-09-02.166` implement bounded
existing-Creature mutation for exact `Color_Skin`, `Color_Hair`,
`Color_Tattoo1`, and `Color_Tattoo2` storage. Primary common reader/writer
evidence establishes four adjacent native type-`0` fields in that exact order;
the repository's native GFF contract maps type `0` to `BYTE`. The frozen
`TDLGCREATUREEDIT` form separately identifies the Creature editor color path.
No body-part, renderer, model, palette, equipment, phenotype, race, gender,
head, wings, tail, or material behavior is inferred from these fields.

Each exact retained member is independently presence-sensitive. Aurora Web
accepts only canonical decimal target values in `0..255`, replans against the
immutable type-`4` ordinal, performs full-value CAS, and replaces only the
requested existing native field. Missing, duplicated, aliased, wrong-case,
wrong-type, malformed, stale, or target-only storage remains preserve-only or
fails closed. Candidate and persisted readback compare the full requested
target while the revision-fenced ARE/GIT/GIC/IFO publication preserves all
unrequested bytes. Frontend API, scene, draft, clone, reducer/materializer,
workspace Apply, and dialog boundaries preserve detached exact provenance and
show each absent retained member as `PRESERVE_ONLY`.

Focused backend coverage passes `15/15`; the seven affected frontend files
pass `1191/1191`; the capability catalog passes `14/14`; and both production
builds pass. A broader seven-file backend run passes `2625/2627`; the two
remaining failures are the known unrelated Item metadata round-trip fixtures.
They remain explicit debt and are not promoted into this Creature result.

Creature authoring remains `partial`/`blocked`. Body-part/head/phenotype,
wings/tail, coupled `CRAdjust`, arbitrary class spell graphs,
`SpecialAbilityList`, full localized-string editing, live browser readback,
Toolset Save/Build/reopen, and NWN proof remain open. Full tile Add/Render,
adjacency, independent PathConnect/WOK, and release certification also remain
open.

Runtime sources are rebound from historical v19 to immutable v20. It binds
1,804 files and 30,648,580 bytes to digest
`5f15f9b1626902aff949627626b5a06d775b5625eb86941395317670187dba86`.
Profile SHA-256 is
`a0edb688da0e66d29962dd2c465da029814192812ca6e9f5049892782d6594da`,
source-manifest SHA-256 is
`641402252b1096e8c741dd9a206267628653df2e0c21188e0e4435ffc92bb7bb`,
and binding SHA-256 is
`223033008144c07f983c8adc88377bd9c35bfdf4ac27416e396c9e294d884ce1`.
Plan `51bf3ba6cbdf4f41f316f7f1a171e56ae00c810710378835d8c655e627466698`
explicitly replaces v19, validates `ready` with verified source identity, and
remains `0/3380`; no capture was performed. No Docker command, service,
watcher, browser/Chrome capture, Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used.

## Existing retained Creature body-part/head compatibility checkpoint — 2026-09-02

Checkpoint `235` and capability revision `2026-09-02.167` implement offline
mutation for 18 native retained Creature body slots plus `Appearance_Head`.
The common Creature reader/writer and their reciprocal compatibility helpers
establish an independently present legacy `BYTE` and/or `x`-prefixed `WORD`
for every member. A present word is authoritative; byte-only sources remain
bounded to `0..255`; canonical pairs write the same byte through `255` and
legacy byte `0` for wider targets. The implementation preserves byte-only,
word-only, and paired physical shapes and never creates or removes an absent
compatibility field.

Backend parser, snapshot/cache, projection, immutable type-`4` ordinal
planning, subset CAS writer, complete-candidate readback, and revision-fenced
ARE/GIT/GIC/IFO publication carry the exact storage. Frontend API, scene,
saved-draft, clone/history, provenance reducer/materializer, Workspace Apply,
and Creature dialog preserve detached source state and expose the native
maximum for each admitted physical shape. `BodyPart_Robe`, wings, tail, and
model availability remain outside this contract.

The complete affected backend group passes `1660/1660`; the complete affected
frontend group passes `1201/1201`; the capability catalog passes `14/14`; and
both production builds pass. Two stale Item fixture expectations found by the
full parser run were corrected to the existing exhaustive Item audit: root
`PaletteID`, root `CostTable`/`CostValue`, Item scripts, and GIT `Comment` are
now explicitly proven absent rather than synthesized.

Creature authoring remains `partial`/`blocked`. Retained robe and wings/tail,
coupled `CRAdjust`, arbitrary class spell graphs, `SpecialAbilityList`, full
localized-string editing, guarded browser/model readback, Toolset
Save/Build/reopen plus packed compatibility-field readback, and NWN behavior
remain open. Tile Add/Render, adjacency, independent PathConnect/WOK, and
release certification remain open as well.

Runtime sources advance from historical v20 to immutable v21. Built at
`2026-09-02T09:09:58.371Z`, it binds 1,807 files and 30,699,427 bytes to digest
`1dc941848220dd7f2422cd4a498cd4eb6c2a001c01e329cc7bb55ca9a5af1751`.
Profile SHA-256 is
`20d5128c2856c6c800d84fe4e22cfefd982f24c7caea4bc52c49a316313a222e`,
source-manifest SHA-256 is
`e32f2f63e31849ea84f8782a00de29f88c785769d31b9b9c9988ff23d29669b5`,
and binding SHA-256 is
`5f9defe4bc4ad950d7e8e85f1e941fc262553d8da4d445369437a6e75e49a63a`.
Plan `872937ea0a16792475b1e06617e9c4ca2774b01223a755fa932e61844e20f4d5`
explicitly replaces v20, validates `ready` with verified source identity, and
remains `0/3380`; no capture was performed. No Docker command, service,
watcher, browser/Chrome capture, Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used.

## Existing retained Creature Wings/Tail checkpoint — 2026-09-02

Checkpoint `236` and capability revision `2026-09-02.168` implement offline
mutation for exact retained `Wings_New : DWord` and `Tail_New : DWord` fields.
The common reader/writer proves modern-over-legacy fallback and DWord output;
the frozen Creature editor binds each selection to a physical row of the
complete effective `wingmodel.2da` or `tailmodel.2da`. Legacy-only
`Wings : Byte` and `Tail : Byte` inputs, missing or malformed fields, stale
table identities, and unavailable catalogs remain preserve-only.

Backend effective-resource resolution, exact storage retention, draft
projection, fresh catalog admission, immutable-ordinal planning, DWord-only
GIT writing, candidate readback, and revision-fenced ARE/GIT/GIC/IFO
publication carry the contract. The UTC generator's modern fields were
corrected from Byte to DWord. Frontend HTTP/scene/draft/history state, bounded
catalog facade, independent Wings/Tail provenance, searchable selectors, and
Workspace Apply remain fail-closed and preserve legacy siblings.

Focused backend coverage passes `28/28`; the capability catalog passes
`14/14`; the affected frontend group passes `1238/1238`; and both production
builds pass. The broader backend group executes `2844/2847`; its three
failures are unrelated stale expectations for animation hash provenance,
health/VFX revision, and one UTM store round-trip fixture. All appendage
assertions pass.

Creature authoring remains `partial`/`blocked`. Retained robe, coupled
`CRAdjust`, arbitrary class spell graphs, `SpecialAbilityList`, full localized-
string editing, guarded browser/model readback, Toolset Save/Build/reopen,
packed-field inspection, and NWN proof remain open. Tile Add/Render, adjacency,
independent PathConnect/WOK, and release certification remain open as well.

The last capability metadata write makes the intermediate v22 appendage
binding historical. Active immutable v23, built at
`2026-09-02T10:43:14.612Z`, binds 1,813 files and 30,798,093 bytes to digest
`6138b516b501ea4df8933de5004a06678c60e69880d9f47d87fb1cdbd1f46c27`.
Profile SHA-256 is
`6f210a9f6ce5090e1836c9ed1a47132a7c67368981a735ebb6b158e916cc7b73`,
source-manifest SHA-256 is
`0035a93f32f6567ae0b7788302a62400e7b5359671cd4fa880e57067648676b2`,
and binding SHA-256 is
`8e342dc9e974de973edceb4e75014001ee272e7ee5c91197ee0a1d70dfe15e00`.
Plan `0e16f6931f3c113d7474a159437d288e0da87ef0a245d27fa162543ca0cff608`
explicitly replaces intermediate v22 id
`b3fa5a382051c06604eaab06606ac408d15aca9938d81f81edb86b24967d5c25`,
validates `ready` with verified source identity, and remains `0/3380`; no
capture was performed. No Docker command, service, watcher, browser/Chrome
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or other
GPL source was used.

## Existing retained Creature SpecAbilityList checkpoint — 2026-09-02

Checkpoint `237` and capability revision `2026-09-02.169` implement offline
authoring for canonical retained `SpecAbilityList` sources. Primary Toolset
decompilation proves the exact type-`4` physical entry shape
`Spell : Word`, `SpellFlags : Byte`, and `SpellCasterLevel : Byte`; the
effective selector uses physical `spells.2da` rows with `UserType` `1|2`, an
empty/`****` `Master`, and a usable localized `NAME`. Repeated physical entries
are one UI row whose count is bounded to the native byte maximum `255`.

Backend parser/snapshot state retains exact list presence, order, duplicates,
flags, caster bytes, and opaque-sibling counts. Effective module/ordered-HAK/
vanilla resolution, digest-bound HTTP catalog paging, detached draft
projection, complete grouped-profile CAS, raw-GIT ordinal replanning, fresh
catalog admission, canonical type-`4` repeated-entry writing, exact candidate
readback, and revision-fenced ARE/GIT/GIC/IFO publication are implemented.
Frontend port/facade/provenance, complete catalog hydration, saved-draft and
history cloning, Toolset-compatible use/caster coupling, fail-closed Apply, and
the editable Creature Special Abilities tab carry only physical row identity.

The affected backend group passes `172/172`, the focused HTTP-controller
delegation passes `1/1`, the affected frontend group passes `223/223`, the
capability catalog passes `14/14`, and both production builds pass. The full
controller file has one unrelated stale expectation for the previous VFX
runtime revision; all 16 other tests, including this endpoint, pass.

Creature authoring remains `partial`/`blocked`. Noncanonical or opaque
`SpecAbilityList` sources remain preserve-only. Retained robe, coupled
`CRAdjust`, arbitrary class spell graphs, full localized-string editing,
guarded browser readback, Toolset Save/Build/reopen with packed GIT inspection,
and NWN behavior remain open. Tile Add/Render, adjacency, independent
PathConnect/WOK, and release certification remain open as well.

Runtime sources advance from historical v23 to immutable v24. Built at
`2026-09-02T12:28:51.048Z`, it binds 1,819 files and 30,892,302 bytes to digest
`d189a8d867e73e96b4ae21666081051b7958a745aea71ceccaf9d8b5075dd412`.
Profile SHA-256 is
`dd44c7c6bbad1f74380adda1a6be58fbc36bb43d960d53c4970405e5e01102d9`,
source-manifest SHA-256 is
`79398efec86167cb5fb0ac1cb4322e92d3f98cc61049df8cc55f1e273f4d21e5`,
and binding SHA-256 is
`fc79a2eeffa8adcc1269db0cfc10166cf48bdece9301e44d1b7f3d00d1c328fa`.
Plan `a66be72840096a8db000e954b7856c8fc0d78d1519ab424923ef0383787ae978`
explicitly replaces v23, validates `ready` with verified source identity, and
remains `0/3380`; no capture was performed. No Docker command, service,
watcher, browser/Chrome capture, Toolset/NWN process, mutation test, sub-agent,
xoreos source, or other GPL source was used.

## Creature robe ownership correction checkpoint — 2026-09-02

Checkpoint `238` and capability revision `2026-09-02.170` remove a non-native
Creature blueprint path. Primary evidence assigns robe state to
`ArmorPart_Robe : Word` on an equipped armor Item and finds no direct
`BodyPart_Robe` member in the common Creature reader/writer. Accordingly, the
Creature HTTP boundary rejects `bodyPartRobe`, UTC writing cannot emit it,
UTC/GIT Creature readers do not promote it, and the frontend creation wizard
does not project legacy loose robe metadata. Item robe behavior remains
unchanged.

Post-correction verification passes the schema `36/36`, Area parser `344/344`,
template parser `27/27`, Creature wizard `6/6`, capability catalog `14/14`,
and both production builds. A combined final backend rerun passes `421/421`.
A stale Store test was aligned to the existing
source-closed bucket order `[0,4,2,3,1]` without a Store code change.

The matrix now reflects already implemented retained `WalkRate`, `SkillList`,
`FeatList`, `VarTable`, `PerceptionRange`, `SoundSetFile`, `StartingPackage`,
and `Phenotype` lanes. This correction does not promote the partial/blocked
Creature or overall Area capability. Arbitrary Creature Create, coupled
`CRAdjust`, arbitrary class spell graphs, complete localized strings, guarded
browser/native evidence, the 99-tileset certification, PathConnect/WOK, and
release closure remain open. Runtime profile v24 is historical. Immutable v25,
built at `2026-09-02T13:03:29.094Z`, binds 1,819 files and 30,892,451 bytes to
runtime digest
`f53b0eed54c1ceae097b8917ca54a40bb8c35cb07b45b6bc8927e8b295436f37`;
profile, source-manifest, and binding SHA-256 values are respectively
`454e1d037815fed75659c02463027b3db0e6211ad66869bc63abc06a0ad594bc`,
`d08be595354a3aae73de1d58146866d221b5ef35b6fe7202a88b41994b761451`,
and `803ef54e6b2e1fe4b4b218b67eb3e2492c223f71b0da8cec7e3ad983f86528c9`.
Replacement plan
`0aae944e863e27ef5b797d9ab6364d34ea92a5364e2ccf836c106bc4a445e6ac`
validates `ready` with verified runtime-source identity and remains `0/3380`
across 99 tilesets and 53,700 rows. No live process or external GPL source was
used.

## Creature property-matrix and Race fail-closed checkpoint — 2026-09-02

Checkpoint `239` and capability revision `2026-09-02.172` account for the
complete frozen ordinary Creature property form and replace an unbounded
remaining-matrix blocker with four exact gates: Race/CR derived calculators,
dynamic template construction, the complete localized-string editor, and
arbitrary class spell-graph mutation. The matrix audit does not promote
Creature completion; it distinguishes retained native fields from calculated
labels, editor commands, and non-native controls.

Focused primary decompilation binds `cbRaceChange` to `0x0045BE64`, exact
`Race : Byte` storage to common Creature offset `+0x6C`, dialog state to
`+0xB00`, and the selection path to `FUN_004574fc`, `FUN_004632d8`, and the
`FUN_00457a4c` materialize-and-calculate path. That final path invokes the full
`FUN_0052ede0` challenge-rating calculator. A direct byte-only Race mutation is
therefore not native-equivalent and remains blocked.

Frontend Race is visible as `PRESERVE_ONLY` and disabled while retaining the
source byte for display and dependent-profile provenance. Unit, Workspace
regression, and capability tests pass `73/73`, `21/21`, and `14/14`;
backend/frontend production builds pass. Browser/native evidence remains open.

Immutable runtime profile v26 binds 1,819 files and 30,892,862 bytes to digest
`fea76e2e6cb3733bb8545bccec00528ae3a662069b7c5a9b51a79b0cf18f067f`.
Its profile, source-manifest, and binding SHA-256 values are respectively
`420fd1bdf4697feb3b6928f7eeed31a38ad067e296054548ca995d1a9a232f4b`,
`b4264e81a521859f87bf3dc6c93821aea306ebd9c13b9ef4e9f0d0bf45ae4d61`,
and `08a7f35bd563b4e3a1b58a288b6d3a19367be206abfc7c3fb32de21078e94947`.
Replacement plan
`5da427d9ae588f40211e546766866f1f909d3e1bc0db6f0d8a5cf597e68b7bbf`
validates `ready`, replaces v25, and remains `0/3380` across 99 tilesets and
53,700 rows with zero accepted PathConnect rows. No Docker command, service,
browser/capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.

## Existing retained Encounter TemplateResRef checkpoint — 2026-09-02

Checkpoint `240` and capability revision `2026-09-02.173` implement offline
mutation for one exact existing type-`7` Encounter
`TemplateResRef : ResRef`. Primary reader/writer and frozen dialog evidence
close its storage and UI boundaries without conflating the retained instance
with its UTE blueprint, palette entry, renderer model, other instances, or
spawn behavior. Only an already present canonical lowercase `[a-z0-9_]{1,16}`
field may be changed; absent or ambiguous storage remains preserve-only.

The implemented pipeline covers strict parsing, detached source provenance,
saved-draft/history cloning, source/target projection, immutable-ordinal
replanning, exact CAS writing, GIC preservation, candidate readback,
transactional publication, visible Workspace editing, Apply/Cancel/reopen/
OK/local-Save regression, and renderer-identity independence. Relevant
backend and frontend groups pass `1681/1681` and `1216/1216`; the capability
catalog passes `14/14`; and both production builds pass.

The Level 4 Area program remains `missing`, not complete. Encounter browser,
Toolset Save/Build/reopen, packed GIT, and NWN runtime proof remain open, as do
other capability blockers and the 99-tileset Add/Render, connection, and
independent PathConnect/WOK certification. Active immutable profile v27 binds
1,822 files and 30,916,246 bytes to digest
`67ee2a5a286cbea89a96f34514a6bd4ee7284def367c95137abc40e35177a92a`.
Replacement plan
`02298824afd6c21eba4fcd36f881c5a290166a4a31a07f12860357dca947e402`
validates `ready` with verified source identity and remains `0/3380`. No live
runtime, Docker, browser/capture, Toolset/NWN, mutation test, sub-agent, xoreos
source, or other GPL source was used.

## Existing retained Trigger TemplateResRef checkpoint (2026-09-02)

One more Trigger property slice is source-closed and offline verified. Exact
presence-sensitive `TemplateResRef : ResRef` provenance now flows from the
type-`1` GIT parser through detached frontend source state, local drafts and
history, visible Trigger Properties authoring, exact immutable-ordinal CAS,
in-place paired writer, complete candidate readback, and revision-fenced
ARE/GIT/GIC/IFO publication. Renderer/catalog identity remains independent,
and the separate native update-instances action is outside the contract.

The bounded gates passed with `696/696` backend and `1,223/1,223` frontend
assertions plus both production builds. This is not Level-4 or program
completion: fresh browser/Toolset/NWN evidence, remaining Trigger rotation,
properties/scripts/links/variables/activation, tile PathConnect/WOK proof, the
uncaptured 99-tileset matrix, and final certification remain open.

The source-complete slice is bound to immutable runtime profile v28, SHA-256
`3e3a4860eaa4482c0360908822bf1a30d2493c77ea4cb4d88b56d99ac6c1ba85`,
runtime digest
`63f413c69c5d40d1e26aaedff1085a2d69ea374e393d8bf2543e5aeed58f947d`,
and ready replacement plan
`affe37ef0b73eba3271694893171cf822960dd1bbbd3ae02e81a453c42342435`.
The plan is still `0/3380`; binding is not visual or runtime completion.

## Existing retained Trigger LocalizedName checkpoint (2026-09-02)

Checkpoint `242` and capability revision `2026-09-02.175` close one bounded
offline Trigger property slice. Exact `LocalizedName : CExoLocString`
provenance now flows from the type-`1` GIT parser through detached frontend
source state, local drafts and history, visible Trigger Properties authoring,
exact immutable-ordinal CAS, in-place paired writing, candidate/persisted
readback, and revision-fenced ARE/GIT/GIC/IFO publication. Renderer/catalog
identity remains independent.

Only the proven inline profile may be edited: `strRef=0xffffffff`, zero
entries or one non-empty language-`0` printable-ASCII entry, maximum 256
bytes. TLK-backed, multilingual, malformed, duplicated, absent, wrong-case,
or wrong-type storage remains preserve-only. The implementation does not
claim a localization editor, TLK mutation, blueprint propagation, or runtime
activation semantics.

The bounded gates passed with `228/228` focused backend tests, `88/88` Area
Update atomic-publication integration tests, `1,228/1,228` focused frontend
tests, and both production builds. The Level 4 Area program remains
`missing`: fresh browser/Toolset/NWN evidence, remaining Trigger properties,
the uncaptured 99-tileset matrix, independent PathConnect/WOK proof, and final
certification remain open.

Immutable runtime profile v29 has SHA-256
`26074783ac4cf4f1f0e5378733ae53946e6cfd9c28137171fae6dfd545c837f0`
and runtime digest
`271a8496398aedbd92dbfb987c1b3147976f68aa2fe3cf4fbfa3d9ddb3ed6911`.
Ready replacement plan
`ca4a8178e85c04ebf939607ec0ff178513327fb8ed2558dc64b1052c16ced97d`
explicitly replaces v28, verifies the current source identity, and remains
`0/3380` with zero accepted PathConnect rows. No Docker command, service,
browser/capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.

## Existing retained Trigger editor Comment checkpoint — 2026-09-02

Checkpoint `243` and capability revision `2026-09-02.176` implement one exact
retained Trigger editor `Comment : CExoString` stored in the same-index
type-`1` GIC `TriggerList` entry paired with its type-`1` GIT Trigger. Primary
reader/writer evidence and accepted readback close this editor-only storage
boundary. The admitted value is exact, including empty strings, whitespace,
CR/LF, and Unicode; it is limited to 4,096 ECMAScript code units and rejects
NUL. Missing, duplicated, wrong-case, wrong-type, malformed, or unpaired
storage remains preserve-only and is never synthesized from GIT or UTT.

Backend exact paired parsing, detached projection, immutable-ordinal planning,
expected-value CAS, GIC-only in-place writing, candidate/persisted readback,
and revision-fenced ARE/GIT/GIC/IFO publication are implemented. Frontend
HTTP validation, immutable scene/source state, saved drafts, clone/history,
facade/viewport ports, visible Trigger Properties UI, and Apply/Cancel/reopen/
OK/local-Save regression are implemented. The mutation composes atomically
with admitted Trigger Tag, TemplateResRef, LocalizedName, origin, and polygon
changes without changing renderer identity.

Relevant backend tests pass `2,317/2,317`, Area Update integration passes
`88/88`, affected frontend tests pass `1,289/1,289`, full regression-smoke
passes `137/137`, the capability catalog passes `14/14`, and both production
builds pass. The full frontend unit gate remains globally red at
`5,838/5,840` because of two reproducible, out-of-slice dirty-tree failures in
Placeable render-package shape and render material side expectations; neither
failure exercises Trigger Comment.

The Level 4 Area program remains `missing`. Fresh guarded browser Save/reopen,
exact-candidate Toolset Save/Build/reopen with packed GIC readback, remaining
Trigger properties, the uncaptured 99-tileset matrix, independent
PathConnect/WOK proof, and final certification remain open. This editor-only
field has no NWN runtime-behavior claim.

Immutable runtime profile v30 binds 1,831 files and 30,979,373 bytes to digest
`1ca79a5263a3ae55a174a39f6e6e5e90dad0fad821cc50057cf184237669aad7`.
Its profile, source-manifest, and canonical runtime-binding SHA-256 values are
respectively
`3b3126e52a87297d3010fb706142cb60c85704e0b8171e1f2f18fe545563170b`,
`21507a7685470ae00586c591a24c68314b3af64c446418c63b22621fb992747c`,
and `cb0a31f52881b0f5849c3bcd0df3982253e95a602c00da71bee6df17111ce61b`.
Replacement plan
`984f3a2415f3029481058748c270dec5df39d897d132230a96f561a1f6e7b68e`
explicitly replaces v29, validates `ready` with verified source identity, and
remains `0/3380` with zero accepted PathConnect rows. No Docker command,
service, watcher, browser/capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.

## Existing retained Trigger event-script ResRefs checkpoint — 2026-09-02

Checkpoint `244` and capability revision `2026-09-02.177` implement one
complete exact tuple of seven retained Trigger event-script ResRefs. Primary
reader/writer evidence binds the precise case-sensitive GIT labels and native
type, while the target contract follows native ASCII lowercasing. Missing,
partial, duplicated, wrong-case, wrong-type, malformed, stale, or unchanged
storage cannot authorize a write. This storage lane does not claim script
existence, compilation, dispatch, cadence, ordering, trap behavior, or
activation semantics.

The implemented path covers parser/fingerprint identity, detached provenance,
immutable-ordinal planning, all-seven-field CAS writing, whole-candidate and
persisted readback, content-free telemetry, visible Trigger Properties
controls, frontend drafts/history, one atomic Apply/Cancel/reopen/OK/local-
Save flow, and revision-fenced ARE/GIT/GIC/IFO publication. Unrelated GIT
siblings and the complete paired GIC, ARE, and IFO remain preserved for a
scripts-only change.

Affected backend tests pass `2,039/2,039`, Area Update integration passes
`88/88`, affected frontend tests pass `1,268/1,268`, full regression-smoke
passes `137/137`, the capability catalog passes `14/14`, and both production
builds pass. Full frontend unit remains globally red at `5,859/5,861` because
of the same two out-of-slice dirty-tree expectation failures. Fresh browser,
Toolset Save/Build/reopen, packed GIT, targeted NWN dispatch, remaining
Trigger semantics, 99-tileset Add/Render and adjacency proof, independent
PathConnect/WOK proof, and final release certification remain open. The Area
program therefore remains `missing`, not complete.

Immutable runtime profile v31 binds 1,836 files and 31,017,487 bytes to digest
`77288c7ed00599a8e29b672bbf45b9142622f4cfd0a843fd99c6d81b2128bac9`.
Its profile, source-manifest, and binding SHA-256 values are respectively
`e8d16c45a8c5456711b368780bee632282b96c83c2f3dab548abb3dc2cbd1e57`,
`2366e29a615ec330ae703a761f3c6d7ea002df9b9aa0b10d5fadef1fde8afc4b`,
and `a004d6b0cb7cc317deaa21e51849d9822fddbbd0beb9a015db327e5693a7ccc3`.
Ready replacement plan
`ab91aa5c0692fe6810cef46326e00af006a4bf63c773459f3c641ad9beff5744`
replaces v30 and remains `0/3380` with zero accepted PathConnect rows. No
Docker command, service, watcher, browser/capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used.

## Existing retained Trigger raw transition-storage checkpoint — 2026-09-05

Checkpoint `245` and capability revision `2026-09-02.178` implement one exact
all-or-nothing retained Trigger tuple: `LinkedTo : CExoString`,
`LinkedToFlags : Byte`, and `LoadScreenID : Word`. Immutable primary
reader/writer evidence closes the labels, types, ownership, and storage
round-trip boundary. The implementation deliberately treats all three as raw
storage; it does not infer destination type, decode flags, validate a target,
resolve a loading-screen catalog row, or claim NWN traversal behavior.

The implemented path covers strict source parsing and fingerprint identity,
detached provenance, source/target projection, immutable type-`1` ordinal
planning, exact three-field CAS writing, whole-candidate and persisted
readback, content-free best-effort telemetry, visible raw Trigger Properties
controls, frontend drafts/history, one Apply/Cancel/reopen/OK/local-Save flow,
and revision-fenced ARE/GIT/GIC/IFO publication. Unrelated Trigger fields and
resources remain preserved, and the tuple composes with other independently
admitted Trigger mutations.

Affected backend tests pass `1705/1705`, Area Update integration passes
`88/88`, affected frontend tests pass `1294/1294`, full regression-smoke
passes `137/137`, and both production builds pass. Full frontend unit remains
globally red at `5893/5895` because of the same two pre-existing out-of-slice
expectation failures in Placeable render-package shape and renderer material
side; neither failure exercises Trigger transition storage.

The Area program remains `missing`, not complete. Fresh browser Save/reopen,
Toolset Save/Build/reopen with packed GIT readback, native transition semantics,
targeted NWN traversal/loading-screen proof, remaining Trigger properties,
variables and activation, 99-tileset Add/Render and adjacency evidence,
independent PathConnect/WOK proof, and final certification remain open. Runtime
profile v31 is now historical after production source writes; the next
immutable profile must be generated only after the continuing source-writing
lane settles. No Docker command, container, service, watcher, browser/capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.
