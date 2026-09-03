# Tile Add/Render Matrix Runtime Build Identity Audit (2026-08-21)

## Status

- Audit verdict: `missing` for exact application-build provenance.
- Renderer verdict: unchanged; this audit does not establish a rendering defect.
- Affected proof plan: `output/proof/tile-add-connect-matrix-v7-source-bound-2026-08-21`.
- Required successor: matrix contract revision `path-node-aware-v8` governed by
  [the runtime-build identity contract](tile-add-connect-matrix-runtime-build-identity-contract-v1-2026-08-21.md).
- Remediation implementation: `verified_offline`; the v8 profile, source
  manifest, zero-checkpoint plan, controller gates, and zero-checkpoint
  publication exist and validate.
- Live proof status: `failed` at the first guarded attempt because the current
  runtime-source identity no longer matched the immutable v8 profile. No PNG,
  staged capture, or independent visual acceptance was produced, so matrix
  certification has not resumed.

## Scope and Aurora-first classification

This audit answers one question: can the accepted Add/Render captures be tied
to one exact frontend build and one exact backend build strongly enough to
support a reproducible renderer-certification claim?

The question is proof-control and build provenance. It does not introduce or
change an Aurora runtime semantic, SET/WOK interpretation, tile adjacency
rule, camera rule, or native rendering rule. No new Aurora decompilation audit
is required for this remediation. Existing Aurora-first evidence remains the
authority for the renderer behavior being observed.

No xoreos source was used.

## Audited state

The canonical v7 plan has:

- manifest SHA-256 / plan ID
  `d353e980e48d484eb8c24725163668ce1d2650f78a55af1be9dfcd60e25db002`;
- checkpoint SHA-256
  `e3384d3f71bf230df60616ce4a2d8d6f169ad52af13a76ad8f117d3b080c55a7`;
- 99 tilesets and 53,700 rows;
- 3,378 Add/Render chunks;
- 14 accepted chunks and 3,364 remaining chunks at the audited checkpoint.

The latest accepted capture inspected was:

`output/proof/tile-add-connect-matrix-v7-source-bound-2026-08-21/captures/atj02-group-chunk-0014.attempt-0002.frame.json`

Its backend runtime-build readback is:

```json
{
  "commit": null,
  "imageDigest": null,
  "builtAt": null,
  "processStartedAt": "2026-08-21T14:53:04.772Z",
  "contractVersion": "1.0.0",
  "vfxRuntimeRevision": "vfx-placeable-canonical-host-light-source-v2-emitter-shell-filter"
}
```

The frame does not contain a separate frontend runtime-build identity.

## Confirmed findings

### 1. Backend provenance is incomplete

`GET /health` correctly preserves missing configured provenance as `null`.
The accepted v7 frame therefore proves which backend process start was
observed, but not which immutable source/image build that process executed.

Relevant sources:

- `backend/src/health/health.controller.ts`;
- `backend/src/common/config/app-config.service.ts`;
- `backend/src/common/config/env.schema.ts`.

### 2. Frontend provenance exists as build input but is absent from Area proof

The frontend already consumes:

- `VITE_RUNTIME_BUILD_COMMIT`;
- `VITE_RUNTIME_BUILD_IMAGE_DIGEST`;
- `VITE_RUNTIME_BUILD_BUILT_AT`.

VFX observability records those values, but the ordinary Areas workspace and
`capture-areas-runtime-cdp.mjs` do not expose or persist them. Consequently the
captured WebGL output cannot be tied to an exact frontend build.

### 3. The v7 matrix verifier does not enforce build identity

`matrixFrameVerification` verifies the requested scenario, exact chunk,
settled mutation and presented-frame fences, model/material readiness, and
zero unexpected pending/failed/bridge tiles. It does not compare either
runtime build to an immutable expected profile.

### 4. Acceptance and publication preserve artifact hashes but not builds

The pending-capture, independent-review, checkpoint, and certification
publication paths bind artifact hashes and plan/chunk identity. They do not
bind an immutable runtime-build profile or reject a frame whose build identity
is missing or drifted.

### 5. The defect cannot be repaired by metadata backfill

No artifact in the accepted v7 chain independently proves the missing
frontend identity or the three missing backend fields. A current worktree hash,
current process, CLI argument, or later profile cannot establish what the old
processes executed. Backfilling would be inference presented as observation.

## Impact

The 14 accepted v7 chunks remain useful historical visual evidence. They do
not qualify as final build-bound certification evidence and must not be
silently migrated to v8.

The current publication report is still honest because it reports zero
production-ready rows. However, without this remediation a future fully
captured v7 checkpoint could be published while still lacking exact build
provenance.

## Required remediation

1. Introduce one immutable, hash-bound runtime-build profile for each matrix
   plan.
2. Require complete frontend and backend build identities in that profile.
3. Expose the frontend identity from the running Areas workspace as a dev-only
   readback; never trust only the controller's CLI values.
4. Require backend proxy and direct-health readback to match the profile.
5. Require the captured frame to match the profile byte-for-byte on all static
   identity fields and to contain a backend process start timestamp no earlier
   than the profile build.
6. Derive the worktree token from a canonical source manifest, recompute that
   identity before and after capture, and reject source/HMR drift.
7. Carry the profile binding through manifest, checkpoint, pending capture,
   independent review, accepted-review ledger, status, and release
   publication.
8. Reject missing, malformed, mismatched, or changed profile artifacts.
9. Bump the immutable matrix contract revision to `path-node-aware-v8`.
10. Start a new v8 plan at checkpoint zero. Do not import v7 accepted reviews.

## Implemented successor state

The offline remediation is materialized as the following immutable chain:

- runtime profile
  `backend/docs/aurora-reverse/proof-profiles/tile-add-connect-runtime-build-v8-source-bound-2026-08-21.json`,
  profile id `area-tiles-99-source-bound-v8-20260821`, file SHA-256
  `d91c9fb9a93d06a336c4827953b3bca846e17dd95eeed021af129a2ec011373e`;
- canonical source digest
  `b1e87a720f9d6ce877f5653b229074a15e22e7838e2ab1e7c6ce9da335f9149e`,
  used in the worktree commit and image-digest tokens;
- source manifest
  `backend/docs/aurora-reverse/proof-profiles/tile-add-connect-runtime-build-v8-source-bound-2026-08-21.source-manifest.json`,
  file SHA-256
  `660bc3677139878b463cc7a3d79feb483797573233ee5188b5c1363568d721d1`,
  covering 1,342 ordered files and 25,630,681 source bytes;
- matrix plan
  `output/proof/tile-add-connect-matrix-v8-runtime-build-bound-2026-08-21`,
  plan id / manifest SHA-256
  `06671294cf7009bc969fabac6b5ae75109098e50afe866e65a1f38e77bb03af5`,
  contract fingerprint
  `6ad901f574595fe1d0108bd2ef51c8cecfae02bd0df8703e86e816c19d61aa61`,
  and runtime-build binding SHA-256
  `c0f4b8b1851ac2c92b92ca2dc3ab433e5e6145ffb772e0b0b2c9ba77ab0de8d9`;
- zero checkpoint SHA-256
  `f3013d45ae587f0e16d07d106f0f97a0d67449450ff57727659a3bb67db50869`,
  with zero captured, accepted, or rejected chunks and both review ledgers
  explicitly empty.

The plan contains the complete 99-tileset, 53,700-row corpus and 3,378 chunks.
Canonical status validation is `ready`; the next immutable unit is
`atj02-group-chunk-0001`. This state intentionally imports none of the 14 v7
acceptances.

The zero-checkpoint publication at
`output/proof/area-tile-certification-publication-v8-runtime-build-bound-2026-08-21/release-report.json`
is 48,177,482 bytes and remains truthfully `blocked` with
`production_rows_incomplete`: zero rows are production-ready. Its file
SHA-256 is
`6f1c94e7f2c4401944c50b7f46ed77e883bfad95d110f71eabd0748a33e5dbc0`,
canonical report SHA-256 is
`280b1c012022337c69f0bef6e16656576e8c3d42436f1927cee8f8ecbb222355`,
ledger SHA-256 is
`6e1d75505235b570e9a247ff05b9aa9effcee357d7088d29e0bdfdcf59973362`,
and corpus hash is
`730a3c653c6f35124b8e50f05716aeff1434c88cbb57c79fc21acf5a63a3bc39`.

The real built backend file-source/query path loaded, rebuilt, and indexed
that report in 1,489.07 ms under the 1 GiB Node heap. A subsequent cached page
query took 0.20 ms and a cached production-admission evaluation took 0.64 ms.
The admission correctly returned `AREA_TILE_CERTIFICATION_PROOF_MISSING` for
uncertified checkpoint-zero rows. Peak observed process RSS was 408,510,464
bytes. This is an operational validation of the immutable report path, not a
renderer proof.

## First guarded v8 attempt and source-drift diagnosis

The first profile-bound attempt for `atj02-group-chunk-0001` failed closed at
`2026-08-21T20:03:54.020Z`, before browser work or a runtime-canvas
screenshot. The durable blocker is:

`output/proof/tile-add-connect-matrix-v8-runtime-build-bound-2026-08-21/captures/atj02-group-chunk-0001.failure.frame.json`

Its SHA-256 is
`ee27db3ceee324e0c281f029fab9ddb4e589c4fccf72024e955450d8f7551a89`
and its byte length is 14,120. It records
`runtime_source_identity_mismatch`, a 104 ms bounded attempt, no PNG, no
canonical frame, and no promoted parity. The checkpoint remained at cursor
zero with empty captured, accepted-review, and rejected-review arrays; its
SHA-256 is still
`f3013d45ae587f0e16d07d106f0f97a0d67449450ff57727659a3bb67db50869`.
The blocked heartbeat SHA-256 is
`23f6cb68a66cbb4df5b8263a8f43a0e6b1f6b9e711394b8411881049218c8e05`.

The immutable profile expected source digest
`b1e87a720f9d6ce877f5653b229074a15e22e7838e2ab1e7c6ce9da335f9149e`,
1,342 files, and 25,630,681 bytes. The capture preflight observed digest
`8edd8dc7310472575f63ec81958ad5c25a5584fe9f8140d30cb1ca9be12d0d83`,
the same 1,342 files, and 25,631,705 bytes. A read-only record comparison
identified exactly five changed files, all owned by the concurrently active
VFX proof lane:

- `backend/scripts/create-vfx-nwn-web-row28-fixture.ts`: `+255` bytes;
- `backend/scripts/create-vfx-web-proof-profile.mjs`: `+286` bytes;
- `backend/scripts/test-vfx-nwn-web-row28-fixture.mjs`: `+77` bytes;
- `backend/scripts/test-vfx-row28-web-v6-evidence-pipeline.mjs`: `-3` bytes;
- `backend/scripts/validate-vfx-row28-web-v6.py`: `+409` bytes.

The deltas total exactly `+1,024` bytes. No Area renderer, matrix-controller,
frontend Area workspace, build-toolchain, or runtime-build identity source was
different. This proves shared-worktree drift rather than a cwd mistake,
generated-build inclusion, or a renderer defect. The v8 profile and its failed
packet remain immutable historical evidence and must not be rewritten or
accepted against the newer source digest.

After the blocker was preserved, the capture-owned managed backend and
frontend process trees were stopped. Ports `3000` and `5173`, the backend and
frontend service locks, and the repository-global proof-capture lock were all
confirmed free for the VFX lane. No retry was started.

## Evidence classification

### Confirmed

- exact v7 plan and checkpoint identities;
- exact null backend provenance fields in the inspected accepted frame;
- absence of frontend build identity in that frame;
- absence of build checks in matrix capture acceptance and publication;
- availability of frontend build inputs and backend health fields in source;
- exact fail-closed rejection of the first v8 capture on source-identity
  mismatch;
- exact five-file, `+1,024`-byte VFX-lane drift explaining the observed source
  digest;
- unchanged zero checkpoint and absence of a staged or accepted v8 capture.

### Inference

- None is used to accept or reject a concrete renderer result.
- The risk statement is an engineering inference: two different builds could
  currently satisfy the same v7 artifact gates.

### Missing

- immutable frontend identity for every accepted v7 capture;
- immutable backend commit/image/built-at identity for every accepted v7
  capture;
- a valid migration proof from v7 to v8. Such proof cannot be reconstructed
  from the audited artifacts.

## Resume condition

The v8 contract, negative tests, runtime readback logic, capture verifier,
independent-review binding, and publication binding remain green offline. The
original immutable profile and zero-checkpoint plan correctly rejected a
changed worktree and are retained as a failed historical packet. Resume now
requires the shared runtime-source set to become stable, followed by a new
immutable v8 profile/source manifest, a fresh checkpoint-zero plan and blocked
publication, and one guarded capture from that exact configured
frontend/backend build. Explicit visual inspection and an accepted hash-bound
review must precede bulk capture.

## 2026-08-24 offline admission remediation

The controller previously defaulted to the historical
`tile-add-connect-matrix-v2` directory. Its status therefore reported a legacy
replan while the actual runtime-bound v8 plan already existed and validated as
structurally `ready`. The canonical default now resolves
`output/proof/tile-add-connect-matrix-v8-runtime-build-bound-2026-08-21`.

The canonical `status`, `next`, and `capture` package commands now run the
bounded runtime-source rehash before offering capture. At
`2026-08-24T17:26:18.891Z`, the immutable profile still expected source digest
`b1e87a720f9d6ce877f5653b229074a15e22e7838e2ab1e7c6ce9da335f9149e`,
while the active shared worktree produced
`d02b139d2c5a78a4f8c495d3840ca2600cc97a7139b4a428114ee11cf68f5bf1`
over 1,374 files and 26,003,434 bytes. Status returned
`runtime_build_reprofile_required`; `next` returned no chunk and no capture
integration. No service, HTTP request, browser, Chrome, Toolset, or NWN process
was started by this check.

The control-plane regression covers both axes: a profile built from the exact
current source identity returns `verified` and propagates the admission flag to
the next command, while a drifted profile blocks both `next` and `capture`
before a capture directory is created. `npm.cmd run
test:tiles:matrix-control` passes.

## 2026-08-26 v9 profile-bound capture and diagnostic-fixture admission repair

After the shared source set became stable, profile
`tile-add-connect-runtime-build-v9-source-bound-2026-08-26` bound 1,450 files,
26,897,775 bytes, and runtime-source digest
`77aa80709f104cbb4c94ae114a1f70c205b8137a67a05b8cf52ad3721a632755`.
Its file SHA-256 is
`be4af2922373504788800f7c2ebe6c4a4df859813e3c009e4eca01ff21e62253`.
The managed frontend and backend exposed that exact identity, direct and proxy
health agreed, and the host-local backend catalog contained exactly 99
tilesets.

The first live-API plan was preserved as a diagnostic because its pretty JSON
manifest bytes did not equal the controller's compact canonical `planId` and
the release publisher rejected it with `matrix_manifest_sha256_mismatch`.
The accepted planning route is the hash-bound v2 definition catalog. It wrote
the compact immutable plan at
`output/proof/tile-add-connect-matrix-v9-runtime-build-bound-catalog-2026-08-26`.
The exact plan ID and manifest SHA-256 are
`4f399edc2db05d1da7988fa2293982bada5dd54da5271d4e39fe6f3ee33b7f3f`;
the zero-checkpoint SHA-256 is
`f013001c259a3fdff9ee3e44e422bb38f1a5aabce43174606fc8d42e549b6850`.
It contains 99 tilesets, 53,700 rows, and 3,378 chunks and validates as
`ready` with a verified runtime-source identity.

The corresponding zero-checkpoint publication is
`output/proof/area-tile-certification-publication-v9-runtime-build-bound-2026-08-26/release-report.json`.
It is 48,929,296 bytes, has file SHA-256
`3d0d20cefd5f5f64366e6c4a578c22257defb31b384dc1b3cd6c2f557a3c4244`,
and truthfully reports `productionReady=0` with release blocker
`production_rows_incomplete`.

The first guarded `atj02-group-chunk-0001` capture then reached the real UI
under the exact v9 service pair but failed closed before a PNG. The immutable
failure frame is
`output/proof/tile-add-connect-matrix-v9-runtime-build-bound-catalog-2026-08-26/captures/atj02-group-chunk-0001.failure.frame.json`,
46,794 bytes, SHA-256
`bf29d47c93f32c071552de61af7df059261a64284e281ac94cd89fbd3d5dea60`.
It records `area_editing_new_area_ui_creation_failed` after 99,350 ms and the
sanitized UI alert
`AREA_TILE_CERTIFICATION_UNAVAILABLE: Tile_ID 109 at source.`. No canvas or
page PNG was written, `canonicalParityPromoted=false`, and the checkpoint
remained at cursor zero.

The blocker exposed a proof-control cycle: the visible development-only
initializer was creating the named `matrix_*` local draft, but the generic
new-Area path applied the production tile-certification gate before the
dedicated matrix fixture commands could render the rows that create that
certification. The frozen production-placement contract already reserves a
diagnostic-fixture exception for DEV-only `matrix_*` proof commands. The UI
now applies that exception to initial local-draft creation only when all three
conditions hold: `import.meta.env.DEV`, an Area ResRef beginning `matrix_`, and
the explicit `first-compatible` development proof initializer. Normal Area
creation, a non-matrix ResRef, or the normal initializer remains fail-closed.

TDD first reproduced the exact unavailable-ledger rejection in the panel
suite. The fixed panel and pure production-admission suites pass 44/44 tests,
including a negative non-matrix check. This is a project proof-harness policy
repair, not an Aurora runtime semantic; no decompilation or external GPL
source was used. Because the source changed after v9, its capture packet is
immutable historical evidence and the next attempt requires a fresh source-
bound profile and plan. After the failure, the owned services, Chrome tree,
Docker containers, Docker Desktop, and global capture lock were stopped or
released; ports 3000 and 5173 were confirmed free.

## 2026-08-26 v10 accepted first capture

After the isolated proof-creation repair and its documentation were complete,
the stable source set was reprofiled as
`tile-add-connect-runtime-build-v10-source-bound-2026-08-26`. The profile file
SHA-256 is
`eaa9fb26de179c2f24384ad0d9af522fcf41e92ed1524ef15a406fa9a59d1253`;
its canonical runtime digest is
`27c6b0cd144c1a1d62c64eee05b6689fd2e4a9c941ff2b8c419cb83115e80d0a`,
covering 1,450 files and 26,897,990 bytes. The runtime-build binding SHA-256 is
`b529e80cf43b9b877c4526fbdd703f3ad51b442edf0b448fb61c0ef6f536d243`.

The exact catalog-bound successor plan is
`output/proof/tile-add-connect-matrix-v10-runtime-build-bound-catalog-2026-08-26`.
Its plan ID / manifest SHA-256 is
`090966f3bcf9147de8c1032d01ea2fb54b63cc6ea0679ce20c8ec9978f0ca69e`.
The first guarded capture of `atj02-group-chunk-0001` passed the complete
automated source, runtime-build, service-origin, settlement, tile/model,
material, camera, lifecycle, and artifact-hash gates and staged without
advancing the checkpoint.

Independent inspection of the exact canvas and page PNGs found the complete
proportional 8x2 Area, all three declared fixtures (`Barn01_2x2`,
`RuinPark_1x2`, and `SlumHouse_1x2`), all eight group-member cells, and no
unexpected blank, failed, bridge, placeholder, clipped, collapsed, or internal
void tile. Runtime readback reported 16/16 loaded tiles, zero pending/failed/
bridge tiles, 9/9 ready process candidates, zero process blockers, full
material application, footprint-connected framing, zero excluded meshes, zero
clipped corners, and source identity unchanged after capture.

The accepted independent review is
`captures/atj02-group-chunk-0001.visual-review.json`, SHA-256
`99b4f96db23e9ed5dab9d35b6591ec0180dbe78fb59158d7178dc7bdb38341cb`.
The exact accepted frame SHA-256 is
`0cfba6c810ecce8143bf7fbec8ab7d2d4bd99cc20196a4b33b7cf74d742e2565`.
Acceptance advanced the checkpoint exactly once to `1/3378`; checkpoint
SHA-256 is
`5cdf6e8057f65296258b5075e984b56a161030b7c900381d797d47d423ee0c69`
and heartbeat SHA-256 is
`6a1690e339f0241fe7bd9c58518f9592c9da4bdfba1d61a6e20bd64674c42537`.
Add/render and group coverage are now 8 rows. PathConnect remains 0/44,664 and
was not inferred from the image; WOK, visual seam, persistence, Toolset, and
NWN proof remain independent.

The checkpoint-one release report at
`output/proof/area-tile-certification-publication-v10-checkpoint-0001-2026-08-26/release-report.json`
is 48,767,937 bytes with file SHA-256
`e3d439a5c860e2975ce524f3dc737fe984c7294705eef26bf2aa755833b4be3e`.
It binds one accepted review and eight unique rows, promotes exactly eight
`assetClosure` and eight `render` states, and truthfully remains blocked by
`production_rows_incomplete`; `productionReady` remains zero because the
other proof dimensions were not collapsed into Add/Render evidence.

The capture-owned backend, frontend, Chrome tree, containers, Docker Desktop,
and global capture lock were released after acceptance. Ports 3000, 5173 and
the capture/Docker ports were confirmed free. This documentation is written
after the immutable v10 capture and therefore intentionally requires a fresh
successor runtime profile before the next capture; no v10 proof artifact is
rewritten.

## 2026-08-26 active-plan binding repair and v12 successor

The public `tiles:matrix-status`, `tiles:matrix-next`, and
`tiles:matrix-capture` package commands were still falling through to the
historical v8 default directory. A read-only status call therefore reported
`0/3378` from v8 while the accepted immutable v10 checkpoint was actually
`10/3378`. This was an operator control-plane binding defect, not a mutation or
loss of matrix evidence.

Embedding the current plan directory and plan ID directly in `package.json`
was rejected after TDD exposed a source-identity cycle: `package.json` belongs
to the runtime source digest, so updating the embedded plan ID would
immediately invalidate the profile used to generate that plan. The permanent
repair uses the stable generic runner
`backend/scripts/aurora-tile-add-connect-active-plan.mjs` and the small
non-runtime pointer
`backend/docs/aurora-reverse/proof-profiles/tile-add-connect-active-plan.json`.
The runner rejects caller overrides, requires the plan directory to stay
inside `output/proof`, verifies the complete manifest SHA-256, checkpoint plan
and directory binding, and exact runtime-build profile path, ID, and SHA-256
before delegating. The raw matrix CLI now rejects an omitted output directory
with `MATRIX_OUT_DIRECTORY_REQUIRED`; no versioned default can silently select
an obsolete plan.

Because the Docker lifecycle guard, matrix control repair, and their tests are
inside the declared runtime identity roots, v10 remains valid historical
evidence but is not current-build capture authority. No accepted v10 review or
checkpoint was rewritten or copied to a new build. The current source set was
immutably reprofiled as
`tile-add-connect-runtime-build-v12-source-bound-2026-08-26`, SHA-256
`ffe4d7fbbd0e9108e17677882f5859be2cbddd7559121fdeffe5b0b6bfa80ad2`.
It binds digest
`69f9c763bc1dbf9acb156ea89fb237e34c61e16562d079002bb732b697b4c999`,
1,453 files, and 26,922,913 bytes. Its source manifest SHA-256 is
`39cc0d000015ef9136ca5c383aa538bfccb1362e9be1760ee51b1129666840cb`.

The immutable catalog-bound successor is
`output/proof/tile-add-connect-matrix-v12-runtime-build-bound-catalog-2026-08-26`.
Its plan ID / manifest SHA-256 is
`7a3f8a0e8366411e5a6334c260089cf3c184840ade30e6568bbd136fb908c781`,
its runtime-build binding SHA-256 is
`2c5bf8617099eda4b91d630c937662ede605e3fad162162e750a2f7775e7c783`,
and its zero-checkpoint SHA-256 is
`a103faaea1f6e19b42e84da14beaa94fb2c823d39b166b485a202602a6afa574`.
It records `replacesPlanId` equal to the exact v10 plan ID and preserves the
same 99 tilesets, 53,700 rows, 45,003 Add/Render rows, 44,664 PathConnect rows,
and 3,378 chunks. Fresh source verification is `verified` with zero errors.

Offline regression passed the complete Add/Connect planner profile/source
suite, the matrix control suite including the active-pointer contract, and the
complete PathConnect proof/validator/acceptance/catalog suite. No Docker
command, application service, browser, Toolset, NWN process, or live capture
was started. The next current-build Add/Render action is therefore v12
`atj02-group-chunk-0001` after the Docker resume gate, while native PathConnect
remains independently `missing` at `0/44664`.

## 2026-09-01 conservative-catalog v13 successor

The v12 profile and plan remain immutable historical state but are stale after
the identity-neutral SET parser/catalog correction. The conservative catalog
contains 99 tilesets and 53,700 definitions: 45,034 source-resolved, 8,666
source-missing, and zero certified placeholders. The generic matrix planner
derives 45,031 Add/Render rows, 44,692 connection rows, 8,669 named blocked
rows, and 3,380 chunks.

After both production builds passed, the exact current runtime-source identity
was frozen as profile
`tile-add-connect-runtime-build-v13-source-bound-2026-09-01`. Its digest is
`06a06931f2a916c604418cba5115b85c615fca4083c3cfdebc1cbe525e8e7934`
over 1,795 files and 30,566,360 bytes. The profile SHA-256 is
`41b9eeb84f02fd9b52002ea3c5df8c24866d7163871ea61312b7e65e05993cdc`;
the source-manifest SHA-256 is
`309449130864119ccf6743c4149bf300db5b378c5f3dbad22e0810260c58ea82`.

The first replacement plan still cited `.codex-tmp` inventory/catalog paths,
so it was superseded before capture. Durable regeneration under `output/proof`
produced summary SHA-256
`6aaaeee7ea448829853588350cc906eedb9465343ef7658ab8043f9d1f53e54d`,
unchanged tiles-array SHA-256
`1624e8f94952bf83d34363a7fc76680f3b8aef861b434c27f8997ff07941b004`,
and catalog SHA-256
`ac85696b9e025669818e9ee57e823054969d85d128d97cec75dbe334eb704ec9`.

The active replacement plan at
`output/proof/tile-add-connect-matrix-v13-durable-catalog-2026-09-01`
has id / manifest SHA-256
`7e760c1a088cde19f4b22ec4479bc55e8ce513dd0daf1a4720cd15d7e6d626b4`
and runtime-build binding SHA-256
`ed2d6b3e62951e8635a25d5ec4a1c4876af312822e1360a6cd886401f9532fcb`.
Its replacement chain contains the no-capture transient plan and exact v12
id. Offline status validates the manifest and current source identity with
zero errors. The active binding test passes at checkpoint `0/3380`; no
v10/v12 review was copied forward.

No capture, Docker command, service, browser/Chrome process, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.
Any later write to a runtime-identity root invalidates v13 and requires a new
replacement profile/plan.
