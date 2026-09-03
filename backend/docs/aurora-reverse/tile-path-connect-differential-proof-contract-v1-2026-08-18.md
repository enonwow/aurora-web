# Tile PathConnect differential proof contract v1

Date: 2026-08-18  
Status: implementation contract; no PathConnect result is accepted by this
document alone.

## Evidence boundary

`PathNode` from a SET file and the versioned reference corpus may select a
candidate edge. They do not prove Aurora/NWN traversability. A matrix row can
change from `blocked` to `accepted` only when one immutable Toolset/NWN profile
and one cross-edge differential packet are bound to the exact matrix row.

The admitted observation is deliberately narrow:

- the positive fixture starts on the source side of the declared shared edge,
  crosses that edge, and reaches the target side in NWN;
- the negative control uses a second Area in the same module, with the same
  dimensions, source cell, partner cell, start/target geometry and timing
  budget, but a declared incompatible boundary, and does not reach the target
  side;
- native Toolset packed ARE readback proves the exact tiles, orientations,
  cells, tileset, Area and module used by both observations;
- the runtime packet is bound to the exact module hash and records zero crash,
  load, script, timeout or unexpected-transition failures.

This contract does not infer navigation from WOK overlap, rendered adjacency,
Terrain/Crosser equality, a reference-corpus match, screenshots, or process
existence.

## Immutable profile

Schema `aurora-tile-path-connect-profile/v2` has exact keys:

- `schema`, `id`, `approved`;
- `moduleSha256`, distinct `positiveAreaResRef` and `negativeAreaResRef`,
  `areaWidth`, `areaHeight`, `tilesetResRef`, and
  `definitionFingerprint`;
- `rowId`;
- `source` and `partner`, each with exact `tileId`, `pathNode`, `orientation`,
  `edge`, `row`, and `col`;
- `matchingLanes` as a sorted, unique, non-empty array of finite numbers;
- `negativeControl` with exact `referenceStatus`, `source`, `partner`,
  `sourceLanes`, `partnerLanes`, `matchingLanes`, `sourceOnlyLanes`,
  `partnerOnlyLanes`, `sourceRegionsByLane`, `partnerRegionsByLane`, and
  `reason`; `source` and `partner` repeat the exact tile, PathNode,
  orientation, edge, row, and column shape used by the placement contract.

The negative control is admissible only when it is the deterministic
`reference-mismatch` candidate persisted in the same immutable matrix row,
uses the same source and cell geometry as the positive fixture, has a distinct
partner, preserves the complete versioned-reference lane and region comparison,
and uses the exact reason `path-node-reference-mismatch`. A mismatch may have a
shared lane but incompatible region membership; therefore an empty-lane
heuristic is forbidden. A caller-supplied tile number or prose reason cannot
create a negative control.

Both Area ResRefs must be valid and different. Both Areas must use the exact
matrix-fixture dimensions in the inclusive range 1..32. The positive pair and
the negative control occupy the same declared cells in their respective Areas;
placing all three tiles in one Area is not admissible because the partner cells
would collide.

The profile SHA-256 is computed from its exact bytes. `approved=true` is
necessary but not sufficient.

## Differential packet

Schema `aurora-tile-path-connect-differential-packet/v2` has exact keys:

- `schema`, `profileId`, `profileSha256`, `moduleSha256`,
  `positiveAreaResRef`, `negativeAreaResRef`, `rowId`;
- `toolsetReadback`, requiring `verified=true`, the same tileset and matrix
  definition fingerprint, exact dimensions, the positive Area ResRef with its
  source/partner placements, and the negative Area ResRef with its complete
  control placement;
- `runtime`, requiring `verified=true`, `engine=nwmain`, exact positive and
  negative outcomes, and zero named failures;
- `artifacts`, with exact regular-file paths and lowercase SHA-256 hashes for
  `toolsetReadback`, `positiveRuntime`, `negativeRuntime`, and `engineLog`.

Positive outcome is exactly `crossedSharedEdge=true`, `reachedTarget=true`,
`timedOut=false`. Negative outcome is exactly
`crossedSharedEdge=false`, `reachedTarget=false`, `timedOut=false`.

## Acceptance envelope

The central validator emits
`aurora-tile-path-connect-differential-proof/v2` only after validating exact
keys, scalar ranges, profile/packet/row cross-binding, and every declared
artifact hash. The envelope preserves:

- `immutableToolsetNwnProfile.approved=true`, profile id and hash;
- `crossEdgeDifferential.verified=true`, packet and artifact hashes;
- the exact row identity and observed positive/negative outcomes.

The envelope also preserves the complete negative-control binding. Matrix
admission compares it byte-for-byte at the JSON value level with the immutable
row before accepting the proof.

Matrix admission must revalidate the envelope against the current row. A stale
definition fingerprint, row, tile, PathNode symbol, orientation, edge, cell,
Area dimension, Area ResRef, lane set, module or artifact fails closed.

## Current proof state

No approved immutable profile or accepted packet exists as of this document.
Therefore native `PathConnect` remains `missing`. Source-WOK seam diagnostics
remain geometry-only and cannot satisfy this contract.
