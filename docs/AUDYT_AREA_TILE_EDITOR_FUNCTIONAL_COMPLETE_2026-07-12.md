# Area Tile Editor - milestone completion audit (2026-07-12)

## Result

- Editable implementation: `C:\Projects\aurora-web`.
- Read-only Aurora decompilation/oracle: `C:\Projects\New Folder`.
- Functional inventory: **9/9 grouped rows COMPLETE; 16/16 expanded operations COMPLETE**.
- Independent final cross-audit: **0 open P0, 0 open P1, 0 open P2**.
- Canonical runtime matrix: **14 captured scenarios**; every model-gated packet has
  `loadedTileCount = tileCount`, `failedTileCount = 0`, and `bridgeTileCount = 0`.
- Every mutating runtime scenario has one command relative to its declared prep
  baseline and exact full-state Undo/Redo.

This completes the active web Area-tile milestone. It does not claim byte-layout
identity with every historical GFF writer run or a GUI round-trip through the
retail Aurora Toolset; those boundaries are listed explicitly below.

## Implemented capability matrix

### P0 - recovered Eraser and source-backed groups

- Mode-4 Eraser closure follows the recovered left/right/top/bottom traversal,
  sentinel relaxation, diagonal enqueue, retry, pending/processed de-duplication,
  row-major changed-cell order, SET source/orientation candidate order, and the
  Delphi/Aurora LCG draw.
- Adjacent SET-group propagation is atomic.
- Retiled cells receive the selected SET tile's seven serialized runtime bytes;
  untouched cells, source provenance, unknown GFF fields, Tile_ID, orientation,
  and height remain unchanged.
- Source-backed Cut, Remove, and Rotate use the same conservative mode-4 path.
- A real four-member source group (`wnd_under_test`, `tus01`, `group11`) is
  proven at runtime: orientation `0 -> 1`, exact Undo/Redo, and 64/64 models.

Primary decompilation anchors:

- `decompiled_all.c:368298-368843` - mode-4 closure and adjacent groups.
- `decompiled_all.c:350987-351015`, `351476-351684` - row-major changed cells.
- `decompiled_all.c:281371-281570`, `283363-283411` - SET candidates/signatures.
- `decompiled_all.c:1061777-1061788` - native LCG draw.
- `decompiled_all.c:452870-452921`, `255946-255952` - seven tile bytes.

### P1 - editing workflow

- Ctrl multi-select and Shift marquee over arbitrary loose Area cells.
- Multi Copy/Cut/Paste and Tile Properties; Paste and Properties are each one
  history command with exact Undo/Redo.
- Terrain, Crosser, and Height drag strokes mutate multiple cells as one command.
- Group placement uses one common base height and fails atomically on stepped or
  topology-incompatible footprints.
- New Area creates ARE/GIT/GIC, patches `module.ifo / Mod_Area_list`, verifies
  exact successful read-back, verifies semantic IFO membership, and performs a
  verified rollback on any failed or corrupt write.
- Verify Area and Area Stats combine topology/SET validation with current-scene
  MDL-to-GLB, material, loader, and tile-process readiness.

### P2 - mapping and whole-Area rotation

- `SceneTile.terrain` is recomputed from current topology rather than retaining
  stale scene terrain.
- Whole-Area Rotate rebuilds group anchors from rotated ordered members and covers
  orientations 0..3 and left/right rotations in domain tests.
- Runtime rectangular proof transposes a real-SET local Area from 6x4 to 4x6,
  with exact Undo/Redo and 24/24 models.

## Canonical runtime proof matrix

All paths below are under
`.codex-tmp/aurora-area-tile-milestone-20260712/proof-matrix/` and contain a
fresh page PNG, canvas PNG, frame JSON, state JSON, and summary JSON unless the
scenario is non-mutating.

| Priority | Scenario | Runtime result |
|---|---|---|
| P0 | Eraser | 16/16 loaded; one command; exact Undo/Redo |
| P0 | Source group Remove | 16/16; group count 1 -> 0; exact Undo/Redo |
| P0 | Source group Cut | 16/16; group count 1 -> 0; exact Undo/Redo |
| P0 | Source group Rotate | 16/16; orientation 0 -> 1; exact Undo/Redo |
| P0 | Multi-member source Rotate | real `group11`, 4 cells; 64/64; exact Undo/Redo |
| P1 | Multi-select | exactly two cells; state/history unchanged; 16/16 |
| P1 | Terrain drag | 15 changed cells; one command; exact Undo/Redo; 16/16 |
| P1 | Crosser drag | 15 changed cells; one command; exact Undo/Redo; 16/16 |
| P1 | Height drag | 4 changed cells; one command; exact Undo/Redo; 4/4 |
| P1 | Group base height | real Tile_ID 1201 at base 1; exact Undo/Redo; 4/4 |
| P1 | Tile Properties | MainLight1 0 -> 1; exact Undo/Redo; 16/16 |
| P1 | Multi Copy/Paste | Copy delta 0; Paste two cells as +1 command; 24/24 |
| P2 | Area Rotate | 4x4 real source Area; exact Undo/Redo; 16/16 |
| P2 | Rectangular Area Rotate | 6x4 -> 4x6; exact Undo/Redo; 24/24 |

Key packets:

- `p0/source-group-rotate-multimember-wnd-under-test/wnd-under-test-source-group-rotate-multimember.summary.json`
- `p1/group-base-height-winds-study/winds-study-group-base-height.summary.json`
- `p1/multi-copy-paste-local/copyproof-multi-copy-paste.summary.json`
- `p1/tile-properties/enon-bakery-tile-properties.summary.json`
- `p2/area-rotate-rectangular-local/rotateproof-area-rotate-rectangular.summary.json`

The local `sic11` Copy/Paste and rectangular Rotate packets use the established,
narrow intentional-invisible classification only for exact model
`sic11_a00_00`, node `nero_01`, complete tile/model/material/process contracts,
and the source-backed Area footprint. They do not introduce a general visibility
exception.

## New Area persistence and reopen proof

Artifact:

- `.codex-tmp/aurora-area-tile-milestone-20260712/persistence-cold-reopen/new-area-persistence-cold-reopen.summary.json`

The proof uses an isolated filesystem store, a real 11,956-byte IFO fixture, and
a real `tms01.set` fixture. It verifies exact expected/persisted SHA-256 values for
patched `module.ifo`, ARE, GIT, and GIC; verifies `Mod_Area_list`; then creates new
repository and application-service instances and cold-reopens `area_codex_reopen`
as a 2x2 Area with four tiles and model `tms01_c01_01`. The user module snapshot
and `C:\Projects\New Folder` are not mutated.

The separately captured New Area Verify packet remains the render proof:

- `.codex-tmp/aurora-area-tile-milestone-20260712/new-area-real-tile-proof-classified/sic11-new-area-verify-real-tiles-classified.summary.json`

It reports Verify valid, zero issues, 16/16 contracts and loaded models, failed 0,
bridge 0, and ready asset/process status.

## Final verification gates

- Frontend Area selection: **15 files / 127 tests PASS**.
- Backend Area selection including cold-reopen integration: **10 suites / 122 tests PASS**.
- Frontend `tsc --noEmit`: **PASS**.
- Frontend Vite production bundle: **PASS, 244 modules**.
- Backend Nest build: **PASS**.
- Capture harness `node --check`: **PASS**.
- Relevant `git diff --check`: **PASS**.

## Explicit non-blocking parity boundaries

- No Aurora Toolset GUI open/reopen packet was produced. The completed persistence
  proof is an isolated exact read-back plus cold repository/service reopen.
- The canonical GFF rebuild preserves values, unknown fields, locstrings, and
  struct semantics, but does not promise the same physical table order/offsets.
- The LCG draw is exact; the web editor uses a stable seed bootstrap because the
  global seed of a particular Toolset session was not recovered.
- The retail Whole-Area Rotate UI action is recovered, but the exact native
  transform implementation was not recovered; the web implementation is covered
  by domain tests and square/rectangular runtime invariants.

These are oracle/parity research boundaries, not missing P0-P2 functions in the
active Area tile-editing milestone.
