# Area tile production-placement admission contract v1

Date: 2026-08-21  
Status: frozen for implementation  
Scope: frontend Area topology authoring before local scene/history mutation

## Authority and non-authority

This contract consumes the immutable `area-certification.v1` tile-definition
ledger published under
`area-tile-certification-publication-contract-v1-2026-08-21.md`. It does not
introduce or infer an Aurora runtime semantic. It is a project release-safety
policy over already recorded evidence, so no new decompilation or external GPL
source is required for this implementation.

The gate proves only that a candidate tile definition is eligible and has a
closed, accepted render path. It does not prove visual seams, SET adjacency,
PathReference, PathConnect, WOK seams, persistence, Toolset behavior, or NWN
runtime behavior. Those proof dimensions remain independent and must not be
collapsed into this gate.

## Admission boundary

Every normal Area topology command must evaluate its exact candidate result
before it is committed to React scene state or undo/redo history. This includes
terrain paint and drag, crosser paint and drag, height paint and drag, SET group
placement, eraser retiling, direct Tile_ID replacement, tile reroll/rotation,
group mutation, cut/delete/paste clipboard commands, Area resize, and Area
rotation when those commands change a resulting tile definition or its
topology projection.

The candidate command remains pure and may be calculated in memory. A blocked
candidate must return the original scene/history object and must not append,
replace, or clear any undo/redo entry.

For every changed result cell, admission is granted only when all of the
following hold:

1. the certification source is `ready` for the exact normalized active
   tileset ResRef;
2. the exact `(tilesetResRef, Tile_ID)` row exists;
3. the row eligibility is `eligible`;
4. `inventory`, `assetClosure`, and `render` are all `verified`.

The source is fail-closed while loading or unavailable. Missing rows, excluded
rows, and `missing` or `failed` required proofs are fail-closed. Multiple
changed cells are admitted atomically: one blocked Tile_ID blocks the complete
candidate.

Commands that produce no topology-changing result remain no-ops and do not
manufacture an admission claim. Property-only edits that retain the same tile
definition, orientation, height, and group projection are outside this gate.

## Diagnostic contract

The application policy returns one stable result code and deterministic,
Tile_ID-sorted diagnostics. Supported blocker codes are:

- `AREA_TILE_CERTIFICATION_LOADING`;
- `AREA_TILE_CERTIFICATION_UNAVAILABLE`;
- `AREA_TILE_CERTIFICATION_TILESET_MISMATCH`;
- `AREA_TILE_CERTIFICATION_ROW_MISSING`;
- `AREA_TILE_CERTIFICATION_EXCLUDED`;
- `AREA_TILE_CERTIFICATION_PROOF_MISSING`;
- `AREA_TILE_CERTIFICATION_PROOF_FAILED`.

Diagnostics identify the active tileset, exact Tile_ID, row ID when present,
eligibility, required proof stage, and proof status. User feedback is sanitized
and must not expose transport or filesystem details.

The workspace emits:

- `scene.area_tiles.certification_index.load_started`;
- `scene.area_tiles.certification_index.load_ready`;
- `scene.area_tiles.certification_index.load_failed`;
- `scene.area_tiles.production_admission.blocked`.

The blocked event records the stable result code, normalized tileset ResRef,
operation kind, changed Tile_ID count, first blocked Tile_ID, and first blocked
stage. It contains no certification artifact path or bearer token.

## State ownership and freshness

`WorkspaceLayout` owns one ephemeral certification source for the active Area
tileset. It loads rows only through `AreaEditingFacade`, which in turn uses the
certification port. The source is never stored in the Area scene, local draft,
undo history, or serialized ARE payload.

Changing the active scene tileset or authentication/facade identity immediately
invalidates the prior source and starts a fresh load. A late response from a
superseded request is discarded. A ready source carries its exact normalized
tileset identity; an index for one tileset can never admit another tileset.

## Diagnostic fixture exception

The existing development-only `matrix_*` exact-fixture commands retain their
named proof-harness bypass. The bypass is limited to the dedicated matrix
fixture functions already guarded by `import.meta.env.DEV` and the `matrix_`
Area ResRef convention. Normal pointer authoring, catalog selection, and normal
Area commands must not inherit or infer this bypass.

## Test and completion criteria

Implementation follows TDD. Required evidence is:

1. pure policy tests for ready, loading, unavailable, tileset mismatch, missing
   row, excluded row, each missing/failed render-closure stage, duplicate Tile_ID
   deduplication, and mixed multi-tile atomic rejection;
2. pointer-workflow tests proving blocked click and drag candidates do not call
   `commitHistory` and retain exact scene/history identity;
3. panel tests proving direct replacement and catalog selection fail closed,
   while the named matrix fixture path remains isolated;
4. clipboard tests proving cut/delete/paste fail closed before clipboard,
   selection, scene, or history mutation and reject mixed multi-tile candidates
   atomically;
5. layout wiring tests proving the active exact-tileset source reaches both the
   panel and viewport paths;
6. frontend unit and regression gates, production build, and a later guarded
   browser proof under the repository capture-safety contract.

The complexity budget is one pure application policy, one ephemeral source in
the existing workspace composition root, and narrow admission calls at existing
mutation boundaries. No ledger copy is added to scene/history state, no new
backend contract is introduced, and no renderer behavior is selected by asset
identity.
