# Area PathConnect static reverse and proof gate audit v1 — 2026-08-18

## Verdict

`STATIC_CREATION_PATH_RECOVERED / PACKED_DIFFERENTIAL_CANDIDATE_VERIFIED / NWN_PATH_CONNECT_PENDING`

The local Aurora Toolset decompilation recovers the Area wizard construction
route and its dense tile-lattice initialization, but it does not expose an
authoritative producer or consumer for native `PathConnect`. A later bounded
live pass on 2026-08-19 produced a packed, hash-bound positive/negative
differential candidate and an armed AUR-S07 runtime profile. Native
PathConnect and NWN traversability remain unaccepted until the fresh runtime
packet proves positive crossing and negative non-crossing. No visual seam,
SET edge match, PathNode label, or source-WOK geometric contact is promoted to
that result.

## Authority and scope

Primary evidence for this pass was limited to:

- the local decompilation export at
  `C:\Projects\New Folder\export\decompiled_all.c`;
- the exact decoded retail `tms01.set` fixture carried by the repository;
- the current fail-closed tile matrix and proof tooling.

No xoreos code or implementation structure was used. No Toolset or NWN process
was running during the static pass, and no module, Area, or user-owned game
content was mutated.

## Corrected Area-wizard construction chain

The earlier statement that the Area wizard route was absent is no longer
accurate. The reproducible chain is:

1. `__Areawizard_Initialize` reaches `FUN_00410bc4` and constructs
   `TdlgAreaWizard`;
2. `FUN_0041226c` reads the selected width and height and calls
   `FUN_005a5548(area, 0, width, height, 0)`;
3. `FUN_005a5548` allocates and initializes the dense Area tile lattice;
4. `FUN_005a67cc` participates in the initial tile-selection path.

This closes the static discovery gap for the dialog-to-lattice route. It does
not by itself authorize arbitrary Area dimensions in the application: the
currently frozen live Area Create profile remains the separate authority for
the exact admitted creation shape and defaults.

## PathNode and PathConnect boundary

The exact literal `PathConnect` is absent from the decompilation export.
`PathNode` occurs in 41 duplicated static declarations. Following initialized
globals associated with those declarations found lifecycle construction and
destruction references, but no attributable path-connectivity consumer or NWN
runtime algorithm. Static decompilation therefore cannot close this semantic.

The following observations remain independent and insufficient on their own:

- compatible SET edge labels;
- presence of PathNode metadata;
- visually continuous tile meshes;
- geometric source-WOK boundary contact;
- successful model/material loading.

## Exact differential candidate from `tms01.set`

The exact retail SET fixture and the versioned PathNode reference corpus supply
a bounded differential hypothesis:

- reference-match candidate: Tile 7 PathNode `D`, right edge, to Tile 5
  PathNode `B`, left edge, orientation `0`, matching lane `0`;
- deterministic reference-mismatch control: Tile 7 PathNode `D`, right edge,
  to Tile 6 PathNode `E`, left edge, orientation `0`. Both expose lane `0`, but
  the source binds it to region `0` and the control partner binds it to region
  `1`; the control also exposes partner-only lanes `-4` and `4`.

Neither observation is native authority. The match candidate is not an
accepted PathConnect row until an approved disposable-module profile,
immutable Toolset readback, positive NWN crossing, negative NWN non-crossing,
engine log, and all artifact hashes satisfy the central proof contract.

## Implemented fail-closed proof gate

The following repository components now define and enforce that admission:

- `backend/docs/aurora-reverse/tile-path-connect-differential-proof-contract-v1-2026-08-18.md`;
- `backend/scripts/lib/tile-path-connect-differential-proof.mjs`;
- `backend/scripts/validate-aurora-tile-path-connect-differential.mjs`;
- `backend/scripts/aurora-tile-add-connect-matrix.mjs` command
  `accept-path-connect`;
- focused pure, validator, matrix-acceptance, and persisted-control tests.

The proof envelope binds the exact row, tileset, definition, tile identities,
PathNodes, orientation, directed edge/cells, lane set, two distinct Area
ResRefs, common Area dimensions, profile path and hash, packet path and hash,
four artifact paths and hashes, Toolset readback, positive NWN result,
negative-control NWN result, and zero failures. The positive pair and negative
control live in separate Areas of the same immutable module so their partner
cells cannot collide. Acceptance always creates a new replacement plan
atomically; it never rewrites the source plan.
Every later matrix inspection reopens and rehashes the profile, packet, and
artifacts. Missing or changed evidence returns `replan_required`.

The previous weak shape — an `approved` boolean plus non-empty hash-like
strings — no longer admits PathConnect coverage.

The matrix contract revision `path-node-aware-v5` also persists the complete
negative-control lane and region binding plus the exact direct-fixture width
and height. A hash-bound `plan-inventory` route
can construct a deliberately scoped matrix from one parser-produced inventory
and its exact SET bytes. This is used only when the full host-local catalog is
unavailable and never inflates one tileset into 99-tileset coverage.

## Verification

The following gates passed on 2026-08-18:

- `npm.cmd run test:tiles:path-connect-proof`;
- `npm.cmd run test:tiles:add-connect-matrix`;
- `npm.cmd run test:tiles:matrix-control`;
- backend production build.

The acceptance regression also mutates an artifact after admission and proves
that the next status inspection fails closed with `replan_required`.

## 2026-08-19 packed live-candidate checkpoint

The earlier no-live-profile blocker has advanced, without admitting the final
semantic:

- exact module:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\aw_path_connect_proof_01.mod`;
- packed SHA-256:
  `3cb029d1260d0cfb67249569b9ee5b0b4ace5424cdc5eb232201f2d83b78ba3f`;
- packed positive Area `pc_tms01_pos`: 2x2 `tms01`, row 0 Tile 7 next to
  Tile 5, complete four-tile readback;
- packed negative Area `pc_tms01_neg`: 2x2 `tms01`, row 0 Tile 7 next to
  Tile 6, complete four-tile readback;
- `demo.OnEnter = pc_tms01_run`, with exact NSS source and compiled NCS
  verified inside the packed MOD;
- the post-binding geometry gate proves the two candidate ARE resources are
  byte-identical to their pre-script native Toolset resources;
- readiness, immutable HAK order, fixtures, expectations, and launch boundary
  are frozen in
  `output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07/`.

The profile launch mode is deliberately `user_owned_test_module_action`; the
automation does not start NWN or synthesize user input. The exact remaining
step is the user-owned Toolset **Test Module** action followed by the guarded
AUR-S07 observation and central validation of both outcomes. Until that packet
passes, native PathConnect remains `missing`. Source-WOK diagnostics remain a
geometry/debug feature only and do not certify pathfinding or traversability.

The full host-local catalog replan is independently blocked by a reproducible
Node `invalid table size` out-of-memory failure while materializing SET
definitions. Concurrency `6` and `1`, including a 6 GB requested heap, failed;
the bounded offline route therefore uses the exact effective source already
bound by the preceding matrix, not a guessed fallback. The validated bounded
plan uses `caseLimit=8`, which binds row `tms01:7` to a 4x4 fixture at source
cell `(3,2)` and partner cell `(3,3)`. It is stored at
`output/proof/tile-path-connect-tms01-v5`, plan ID
`a5ba77849aad72b4b5d4bc46990890c4aa9cab922ecc7a4e5dba60346db2797c`.
Toolset Save/Build/reopen, packed binding readback, and candidate geometry
readback are complete for this bounded module. NWN runtime proof remains open.

## 2026-08-26 AUR-S07 profile-contract repair checkpoint

The first immutable AUR-S07 preparation packet remains preserved, but a fresh
fail-closed dry-run found that its runtime profile used the obsolete
`geometryGate.evidence` shape. The current central runtime runner requires an
exact `geometryGate.artifact` plus its SHA-256 and therefore rejected that
profile as `area_geometry_invalid` before starting Toolset or NWN. The gate
itself was present and verified; this was generator/consumer contract drift,
not a failed geometry observation.

`prepare-area-path-connect-aur-s07-profile.mjs` now emits the runner's
hash-bound geometry-gate contract and accepts a validated explicit profile ID
so a repair never overwrites or aliases the earlier packet. The successor is:

- profile ID `aw-path-connect-tms01-7-runtime-v2`;
- profile
  `output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07-v2/aur-s07-runtime-profile.json`;
- readiness
  `output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07-v2/aur-s07-runtime-readiness.json`;
- armed request
  `output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07-v2/execution/aur-s07-runtime-launch-request.json`.

The successor keeps the exact MOD SHA-256
`3cb029d1260d0cfb67249569b9ee5b0b4ace5424cdc5eb232201f2d83b78ba3f`,
the ordered HAK identities, candidate Areas, fixtures, entry point, and
`user_owned_test_module_action` boundary. Its dry-run and arm both passed,
reported `startsNwn=false` and `usesGlobalInput=false`, and left zero
`nwtoolset`/`nwmain` processes. Native positive-cross/negative-no-cross evidence
is still `missing`; arm readiness is not runtime acceptance.

Fresh offline verification passed all three tile control-plane gates:
`test:tiles:path-connect-proof`, `test:tiles:matrix-control`, and
`test:tiles:add-connect-matrix`. Frontend WOK/PathConnect diagnostics passed
131/131 focused assertions. The focused backend WOK parser/geometry Jest suite
reached the mandatory 1 GB Node heap cap twice, including the narrower
`--runTestsByPath` route; its current run status is therefore `missing`, never
inferred as passing. No heap-cap bypass or mutation test was used.

## 2026-08-26 bounded backend WOK verification closure

The missing backend WOK test point is now closed without raising or bypassing
the mandatory 1 GB heap limit. The repository-owned `test:unit:bounded` route
uses one worker and isolated TypeScript transformation, while the separately
passing production build remains the type-check gate. The exact focused run
covered:

- `test/unit/aurora-wok-walkmesh.spec.ts`;
- `test/unit/module-snapshot-area.repository.internals.spec.ts`;
- `test/unit/vfx.schemas.spec.ts`.

All 3 suites and 35 tests passed. The durable Jest JSON report is
`output/proof/area-wok-backend-bounded-2026-08-26.json`, 15,718 bytes,
SHA-256
`ad97cfdf9b36087ce7989222c75ad69a3fef2da898e3de9dd28faf376455aa32`.
It binds parser/AABB behavior, source-precedence and tile-instance projection,
and serialized runtime-schema admission. No mutation test was run and no
production source was changed for this closure.

The AUR-S07 v2 profile was dry-run again after the test closure. The exact MOD,
all four ordered HAKs, and the geometry-gate artifact still exist and match
their frozen SHA-256 values. Zero `nwtoolset` and `nwmain` processes were
present. The profile deliberately remains
`launch.mode=user_owned_test_module_action`; therefore no central dispatch,
synthetic input, Toolset start, or NWN start was attempted. Native positive
crossing, negative non-crossing, runtime capture, and engine-load log remain
`missing`, and no offline WOK result is promoted to native PathConnect.

## 2026-08-26 second accepted v10 Add/Render group capture

The v10 99-tileset matrix remains source-current after the documentation and
bounded WOK-test checkpoints. A fresh `--verify-runtime-source` pass reproduced
the bound digest
`27c6b0cd144c1a1d62c64eee05b6689fd2e4a9c941ff2b8c419cb83115e80d0a`,
1,450 files, and 26,897,990 bytes. The documentation paths are outside the
runtime identity roots. A separately generated v11 diagnostic profile has the
same digest and inventory, but was not substituted into the active v10 plan.

Guarded capture and independent visual review accepted
`atj02-group-chunk-0002`: three declared group fixtures, six group-member
tiles, and the complete proportional 7x2 footprint. Runtime settlement proves
14/14 loaded tiles, 7/7 ready distinct process candidates, 14/14 applied
material contracts, zero pending/failed/bridge tiles, zero failed or in-flight
process requests, zero clipped corners, and no visual blank, placeholder,
collapsed member, or internal black void. The frame SHA-256 is
`6b30205709bf843ec38903b549ada75c947d5c1764c0b5d540c9644742987ab4`;
the independent review SHA-256 is
`0406eb1994f89a7f88001724a6abd2d4b009eb17575eede7e9a9d1cfa993f06f`.

The accepted checkpoint is now `2/3378`, SHA-256
`5c2024e006f237d905b4d9791d95fbd53609a66566dec601d3122b429da2cf75`,
with 14 cumulative Add/Render and group rows. The checkpoint-two publication
at
`output/proof/area-tile-certification-publication-v10-checkpoint-0002-2026-08-26/release-report.json`
is 48,767,747 bytes with SHA-256
`45bf45925fe88cf5ec1af7016c6a8f8077041ff41d925356275acb25cd30fed6`.
It passed the focused evidence regression gate, backend build, and canonical
rebuild; it promotes exactly 14 `assetClosure` and 14 `render` proofs and
remains fail-closed with
`production_rows_incomplete` and zero production-ready rows.

This is render evidence only. PathConnect stays 0/44,664 and `missing`;
neither visible adjacency nor source-WOK geometry is promoted to native
crossing behavior. The next native semantic remains the user-owned AUR-S07
Test Module action and guarded positive cross/negative-no-cross observation.
All capture-owned services, containers, ports, service locks, and the global
proof-capture lock were released.

## 2026-08-26 third accepted v10 Add/Render group capture

Guarded v10 capture and independent review accepted
`atj02-group-chunk-0003`: four exact `Ori_WaterBridge` group110 members and
four exact 2x2 group113 members in one proportional 7x2 Area. Runtime evidence
proves 14/14 loaded tiles, 9/9 ready distinct process candidates, 14/14 applied
material contracts, 361 visible meshes, zero pending/failed/bridge tiles, zero
failed or in-flight process requests, zero clipped corners, and settled
mutation/post-capture/presented-frame contracts. The frame SHA-256 is
`c436063d2dd1df29956b2ff3643edc2ae03f5d58351486ce597a06fc5ab32924`;
the review SHA-256 is
`6d16e955fb1aaec2000193661835f2f7633c86438bfb52d373fa2cb7b6ca3c76`.

The exact checkpoint is `3/3378`, SHA-256
`aa7839c8f7c2c733b92ecf05fb190c886e974fc6fe371feceb451d5e0692569c`,
with 22 cumulative Add/Render and group rows. This remains Add/Render-only
proof: a visible bridge does not certify native crossing. PathConnect stays
0/44,664 and `missing`; the AUR-S07 user-owned Test Module observation remains
the independent native semantic. Services, containers, ports, service locks,
and the proof-capture lock were released after acceptance.

## 2026-08-26 fourth accepted v10 Add/Render group capture

`atj02-group-chunk-0004` passed guarded capture and independent review for a
4x3 Area with seven exact group members: vertical `CaravanFloating_3x1`
group120 and sparse group121 ship/dock geometry. The camera reported four
bounded runtime outliers consisting only of two small rigging segments and two
small source box appendages beyond the footprint. Exact canvas/page review
confirmed both full ships, sails, masts, dock, all declared member cells, zero
clipped corners, and no missing or blank geometry, so the outlier was accepted
without weakening the general camera gate.

Runtime settlement proves 12/12 loaded tiles, 8/8 ready process candidates,
12/12 applied material contracts, 551 visible meshes, zero
pending/failed/bridge tiles, and zero failed or in-flight process requests.
Frame SHA-256 is
`798f681d94a499db070d4059c35ddc3b72d911971df30693dc15731b8956f9e7`;
review SHA-256 is
`84e0ebde364444701bbb3251854b2855e39c082d1f0f9dd828212b51968a8cff`.

The checkpoint is now `4/3378`, SHA-256
`8cd2be8f330988ba3016007896b76df4e1c1d0357054225e362098add3d24892`,
with 29 cumulative Add/Render and group rows. PathConnect stays 0/44,664 and
`missing`; visible marine geometry is not native traversability evidence. All
owned services, containers, ports, and locks were released.

## 2026-08-26 fifth accepted v10 Add/Render group capture

`atj02-group-chunk-0005` passed guarded capture and independent review for the
full proportional 8x2 Area containing group13, group14, and group15. All eight
declared group members are visible. The complete two-member `Inn1_1x2`
group13 fixture is at the left, the four-member 2x2 group14 composition is at
the center, and the two-member group15 composition is at the right. Thin pale
geometry beside the latter two groups was confirmed as source-backed rendered
geometry rather than a blank, failed, bridge, or placeholder tile.

Runtime settlement proves 16/16 loaded tiles, 9/9 ready process candidates,
16/16 applied material contracts, 376 visible meshes, zero
pending/failed/bridge tiles, 11/11 successful process responses, zero clipped
corners, and no excluded camera-bound meshes. Frame SHA-256 is
`a052fcdaec011f50fe3c0e11f306f0d25f0342b0c036a61f090d36f55229215d`;
review SHA-256 is
`98aa337a0c6fd1fcb17f4fc732c510cb1d43805424bbfbb7a828a03329fda590`.

The checkpoint is now `5/3378`, SHA-256
`91cbee55eaa3cb9c898129f9f88a1849520fbb9368cd324328640a595e595e89`,
with 37 cumulative Add/Render and group rows. The remaining Add/Render scope is
3,373 capture chunks and 53,663 rows. PathConnect stays 0/44,664 and
`missing`; visible path/building continuity is not native traversability
evidence. All owned services, containers, coordinated ports, and locks were
released.

## 2026-08-26 sixth accepted v10 Add/Render group capture

The first bounded chunk-0006 preflight stopped before browser capture because
the newly managed backend still addressed the docker-only `seaweedfs`
hostname. It produced no fresh capture artifact and did not mutate the
checkpoint. Restarting the exact source-bound backend with the repository's
`AURORA_HOST_LOCAL_RUNTIME=true` local-module-mirror profile made direct and
proxy health plus the cold `atj02` lookup pass; the immutable chunk and strict
capture contract were then retried unchanged.

`atj02-group-chunk-0006` passed guarded capture and independent review for the
complete proportional 8x2 Area. All eight declared members are visible: the
two-member `Farm03_1x2` group16 at the left, the four-member 2x2 grey
stepped/platform group17 composition at the center, and the two-member grey
stepped/platform group18 composition at the right. Dark bands within the
platforms are source-backed geometry or textures, not missing cells.

Runtime settlement proves 16/16 loaded tiles, 9/9 ready process candidates,
16/16 applied material contracts, 349 visible meshes and material maps, zero
pending/failed/bridge tiles, 11/11 successful process responses, zero clipped
corners, and no excluded camera meshes. Frame SHA-256 is
`1dcbff5b0937686a180b6964cc3aede6a03d9073d1ee9feafce1d3185dbfc671`;
review SHA-256 is
`0646fb14a7f76a6f2a38941eaa10acc64d0c90cb97d78c0f80938c98c1ffcff4`.

The checkpoint is now `6/3378`, SHA-256
`9bff431ce0e714c76f4e0cb5ea2dd9b3f391860ddcd999364f0bddedfb65a0b2`,
with 45 cumulative Add/Render and group rows. The remaining Add/Render scope
is 3,372 capture chunks and 53,655 rows. PathConnect stays 0/44,664 and
`missing`; visible platform geometry is not native traversability evidence.
All owned services, containers, coordinated ports, and locks were released.

## 2026-08-26 seventh accepted v10 Add/Render group capture

`atj02-group-chunk-0007` passed guarded capture and independent review for the
complete proportional 8x2 Area. Exact source SET readback identifies its
three fixtures as the four-member `Windmill_2x2` group21, two-member
`Warzone_1x2` group24, and four-member `ShipDocked01_2x2` group25. The full
windmill/cultivated-plot composition, both grey warzone members, and complete
shoreline, dock connection, and docked ship are visible. All ten declared
members are present with no unexpected blank, failed, bridge, placeholder,
collapsed, internally black, or clipped member.

Runtime settlement proves 16/16 loaded tiles, 11/11 ready process candidates,
16/16 applied material contracts, 332 visible meshes, 335 material maps, zero
pending/failed/bridge tiles, 13/13 successful process responses, zero clipped
corners, and no excluded camera meshes. Frame SHA-256 is
`076c4fb165288c4f1b11d25ad3c48452791a8514ff1153d7553f49688246f540`;
review SHA-256 is
`17ae5bc882399f5ced024d436bd6a62a22f3899f9e8d439f729c0516ea7da85f`.

The checkpoint is now `7/3378`, SHA-256
`421456cf8e51bfd749917af48841aeccfd81672cb36c297d483065a47b46ebcb`,
with 55 cumulative Add/Render and group rows. The remaining Add/Render scope
is 3,371 capture chunks and 53,645 rows. PathConnect stays 0/44,664 and
`missing`; visible dock, shoreline, or water geometry is not native
traversability evidence. All owned services, containers, coordinated ports,
and locks were released.

## 2026-08-26 eighth accepted v10 Add/Render group capture

`atj02-group-chunk-0008` passed guarded capture and independent review for the
complete proportional 8x2 Area. Exact source SET readback identifies its
three fixtures as the two-member `DragSkel_1x2` group3, two-member
`Barracks_1x2` group36, and two-member `Tower_1x2` group37. The skeletal and
debris details, complete barracks roof, and full tower/fortification footprint
are visible across all six declared member cells. No unexpected blank,
failed, bridge, placeholder, collapsed, internally black, or clipped member
is present.

Runtime settlement proves 16/16 loaded tiles, 7/7 ready process candidates,
16/16 applied material contracts, 340 visible meshes and material maps, zero
pending/failed/bridge tiles, 9/9 successful process responses, zero clipped
corners, and no excluded camera meshes. Frame SHA-256 is
`c82cc7b43cc1ce822ec948778deee5ee9c056d3049ecdd814523843162e5e7cc`;
review SHA-256 is
`d93c3a3b29a2acce8adc7f47a5e500c66528c4311126a1640e65193e4fc242ab`.

The checkpoint is now `8/3378`, SHA-256
`b2c490530569d77498889fb67f07dac42e8875c6789e4ee56693bf7449319163`,
with 61 cumulative Add/Render and group rows. The remaining Add/Render scope
is 3,370 capture chunks and 53,639 matrix rows, of which 44,942 still require
fresh capture after named blocked rows are excluded. PathConnect stays
0/44,664 and `missing`; visible skeletal, building, tower, or terrain geometry
is not native traversability evidence. All owned services, containers, Docker
Desktop, coordinated ports, and locks were released.

## 2026-08-26 ninth accepted v10 Add/Render group capture

`atj02-group-chunk-0009` passed guarded capture and independent review for the
complete proportional 5x3 Area. Exact source SET readback identifies the
four-member `Temple02_2x2` group38 and six-member `Temple03_3x2` group40. The
full circular temple ring, central star and perimeter pads are visible at the
left; the full four-lobed upper plaza, paved entrance, connecting stem, and
lower terminal are visible at the right. All ten declared members are present
with no unexpected blank, failed, bridge, placeholder, collapsed, internally
black, or clipped member.

Runtime settlement proves 15/15 loaded tiles, 11/11 ready process candidates,
15/15 applied material contracts, 242 visible meshes, 251 material maps, zero
pending/failed/bridge tiles, 13/13 successful process responses, zero clipped
corners, and no excluded camera meshes. Frame SHA-256 is
`1d7ec196e97c45a1d1fc42cbd05141fdc252bbad5d4e3213321678745161ed83`;
review SHA-256 is
`9dc948a9351c48b7f03ae4ea22e4be9d32cff076866b1616754cedf0e183c883`.

The checkpoint is now `9/3378`, SHA-256
`4e82f1b02a8f7598aba1dc0ad6562705c5a1346810c3377164e07bbbd31254b4`,
with 71 cumulative Add/Render and group rows. The remaining Add/Render scope
is 3,369 capture chunks and 53,629 matrix rows, of which 44,932 still require
fresh capture after named blocked rows are excluded. PathConnect stays
0/44,664 and `missing`; visible temple plazas or paving are not native
traversability evidence. All owned services, containers, Docker Desktop,
coordinated ports, and locks were released.

## 2026-08-26 tenth accepted v10 Add/Render group capture

`atj02-group-chunk-0010` passed guarded capture and independent review for the
complete proportional 8x2 Area. Exact source SET readback identifies its
three fixtures as the sparse three-member `ShipDocked02_2x2` group41,
two-member `House2_1x2` group42, and four-member `Exit02_2x2` group57. The
complete dock and moored ship, paired house sections, and rock-and-vegetation
exit rim are visible across all nine declared member cells. The dark exit
center is an authored opening enclosed by rendered source geometry; it is not
an unexpected blank, failed, bridge, placeholder, collapsed, or missing
member.

Runtime settlement proves 16/16 loaded tiles, 10/10 ready process candidates,
16/16 applied material contracts, 388 visible meshes, 396 material maps, zero
pending/failed/bridge tiles, 12/12 successful process responses, zero clipped
corners, and no excluded camera meshes. Frame SHA-256 is
`544e21eb62c596fb995f921dcdbc462bafb9ee4c31e1275746a17b8cb8ecdfe8`;
review SHA-256 is
`f0c63b0250de75cd375ecd9e8ef291a03535ff49a6b4ea0741935110b8aa1fe0`.

The checkpoint is now `10/3378`, SHA-256
`b0495da1f2f61f5c174d373c3be0d3471d5e444e8cf97aaa92b113eb266c9d9f`,
with 78 cumulative Add/Render and group rows. The remaining Add/Render scope
is 3,368 capture chunks and 53,622 matrix rows, of which 44,925 still require
fresh capture after named blocked rows are excluded. PathConnect stays
0/44,664 and `missing`; visible docks, houses, exits, or terrain geometry are
not native traversability evidence. All owned services, containers, Docker
Desktop, coordinated ports, and locks were released.

## 2026-08-27 central AUR-S07 v4 evidence and host-monitor blocker

The PathConnect runtime lane now has a complete central evidence path rather
than an armed profile plus hand-written packet gap. The exact immutable MOD is
unchanged at SHA-256
`3cb029d1260d0cfb67249569b9ee5b0b4ace5424cdc5eb232201f2d83b78ba3f`.
The new profile
`output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07-v4/aur-s07-runtime-profile.json`
has SHA-256
`93d8f1e92163ee64f10166a0305f55e2c719b1dea32b28a7df4a8ec4a6b00e0f`
and binds the exact module path/hash, ordered HAK list, Demo entry point, both
positive/negative fixtures, native geometry gate, `nwclientLog1.txt`, exact
module-loading resref, four PathConnect completion tokens, and the enhanced
six-artifact evidence policy.

The central AUR-S07 runner now binds the one-time request to the exact profile
hash, waits for one responding NWN process with a non-zero main-window handle,
records a pre-dispatch engine-log baseline, selects only a fresh append or
fresh post-rotation/truncation window, verifies the exact `Loading Module`
line and all declared tokens, binds MP4 metadata to the observation PID and
StartTime, requires the sole non-primary monitor and stable ownership probes,
records an explicit visual verdict, and assembles only a packet accepted by
the same validator. The task-specific
`assemble-area-path-connect-aur-s07-proof.mjs` performs no launch, observation,
capture, or UI control. It first requires an accepted central packet, parses
the exact positive/negative log envelope, revalidates both native geometry
readbacks, writes the v2 differential packet, and invokes the existing
differential validator. One complete timed MP4 is hash-bound to both runtime
artifact roles because the immutable NWScript executes the two trials
sequentially.

Offline contract evidence is:

- `node backend/scripts/test-aur-s07-runtime-execution-contract.mjs` — pass;
- `node backend/scripts/test-assemble-area-path-connect-aur-s07-proof-contract.mjs`
  — pass, including rejection after engine-log drift;
- `node scripts/test-prepare-area-path-connect-aur-s07-profile-contract.mjs`
  from `backend` — pass;
- AUR-S07 v4 `dry-run` — pass with all six required artifact kinds;
- timed MP4 adapter `dry-run` — pass for 10 seconds at 12 fps with ffmpeg
  SHA-256
  `57c56e369d5b4873b4d93fc1a1d833cb7cd8bc9325c14b05c34ce60b22842d8a`;
- v4 `arm` and `baseline-engine-log` — pass for request
  `89d58643-21d1-4e35-8eb0-3a9a1f54a0f9`.

The exact module then opened through the central binary-bootstrap route in one
responsive Toolset PID `16320`, with no Save, module mutation, INI/MRU change,
global input, or NWN process. The first and only dispatch attempt stopped
before `Test Module`: Windows exposed only `\\.\DISPLAY1` with
`primary=true`, so the mandatory exact-one-non-primary-screen guard returned
`expected_one_nonprimary_screen:0`. No dispatch, handoff, observation, MP4, or
NWN process exists. The immutable blocker is
`output/proof/tile-path-connect-native-2026-08-19/runtime-harness/aur-s07-v4/execution/aur-s07-runtime-dispatch.blocker.json`.
No retry or proof-monitor bypass was attempted. The same responsive clean
Toolset session remains open because closing it lacks explicit authorization.

Therefore native PathConnect remains `0/44,664` and proof completeness remains
`missing`; model visibility is `not_tested`. Resume requires Windows to expose
exactly one `primary=false` monitor, followed by a fresh unchanged-profile,
MOD, PID/StartTime, frame/modal, and screen fingerprint. This host-state
blocker does not prevent independent offline authoring implementation.
