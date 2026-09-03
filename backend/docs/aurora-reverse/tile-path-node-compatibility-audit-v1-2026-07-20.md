# Tile PathNode Compatibility Audit v1

Date: 2026-07-20  
Status: `BLOCKED_ON_PRIMARY_RUNTIME_SEMANTICS`  
Scope: the pathfinding meaning of a boundary between two NWN1 tiles. This is
separate from model loading, visual adjacency, terrain descriptors, and SET
multi-cell group layout.

## Decision

Aurora Web must not report two adjacent tiles as path-connected merely because
their `Terrain` and `Crosser` fields match. A path-safe join requires a
versioned `PathNode` compatibility evaluation. Until that evaluator has been
grounded in Aurora/retail evidence, the result is fail-closed with
`PATH_NODE_COMPATIBILITY_UNPROVEN`.

This decision supersedes the meaning of `connect.status = planned` in the
tile-add-connect matrix v1: that status is evidence of a render/descriptor
candidate, not of click-to-move connectivity.

## Evidence inventory

### Local Aurora-facing data path

- `backend/src/modules/areas/adapters/outbound/blob/aurora-set-tileset-parser.ts`
  preserves the raw SET `PathNode` value in a tile definition.
- The backend Area type and frontend Area contract preserve that value as
  `pathNode`; the frontend mapper carries it to a scene tile.
- `backend/scripts/lib/tile-add-connect-matrix.mjs` now preserves raw
  `pathNode`, binds the versioned reference corpus into the definition and
  contract fingerprints, and emits a separate `pathReference` classification.
  Neighbor selection still uses right/left `Terrain` and `Crosser`
  descriptors, so this classification is diagnostic reference coverage rather
  than a claim of retail path connectivity.
- Manifest v2 emits an explicit fail-closed `pathConnect` result for every row.
  The current 99-tileset plan has zero accepted `pathConnect` rows; promotion
  remains blocked until exact primary Aurora/NWN differential evidence is
  bound to each accepted row.
- The local Aurora decompilation source
  `C:\Projects\New Folder\export\decompiled_all.c` registers the literal SET
  key `PathNode` at lines 30677 and 30763. The audited result so far establishes
  key recognition, but not the symbol-to-edge-lane table, rotation transform,
  or region-connectivity algorithm. Those semantics therefore remain unknown.

### Secondary behavioural reference

The community description of
[Tile Path Nodes](https://nwn.wiki/spaces/NWN1/pages/139689996/Tile%2BPath%2BNodes)
states that these nodes accelerate cross-tile pathfinding and that boundary
exits must align. The
[tileset construction tutorial](https://nwn.wiki/pages/viewpage.action?navigatingVersions=true&pageId=139690008)
also distinguishes apparently valid visual placement from click-to-move
pathing. These sources motivate the audit but do not close an Aurora runtime
semantic gap.

## Required compatibility contract v1

The future evaluator input for each directed shared edge must preserve:

1. tileset source identity, SET definition fingerprint, `Tile_ID`, model resref,
   raw `PathNode`, and native tile orientation;
2. requested Area orientation and the exact shared edge;
3. a versioned PathNode resolver provenance record;
4. declared terrain/crosser descriptors as a separate visual/terrain signal.

It must emit one of:

- `PATH_CONNECTED`: exact post-rotation exit lanes and reachable internal
  regions are proven compatible;
- `PATH_DISCONNECTED`: a proven incompatible lane or region relationship;
- `PATH_UNKNOWN`: resolver data or Aurora evidence is incomplete;
- `PATH_INVALID`: malformed or unsupported raw PathNode input.

Only `PATH_CONNECTED` can support a `pathConnect` proof. `PATH_UNKNOWN` and
`PATH_INVALID` are blockers, never fallbacks to a terrain/crosser match.

The contract must include bounded diagnostics: source/neighbor ids, raw and
normalized node values, requested and native orientations, shared edge,
resolver version/hash, lane comparison, region comparison, and blocker code.
The default matrix chunk size remains 16 direct cases; the added diagnostics
must be emitted per case rather than by expanding the payload with whole
tileset data.

## Proof bar

A proof labelled `pathConnect` needs all of the following:

1. unit fixtures for every supported raw symbol and every rotation;
2. a differential retail/Toolset capture that confirms the same boundary
   transition with click-to-move or an equivalent path query;
3. fresh runtime capture with zero unknown, invalid, pending, failed, or bridge
   tiles;
4. a saved PNG plus exact frame JSON containing the compatibility diagnostics.

The existing PNG matrix captures are retained as add/render evidence only and
must not be presented as PathNode proof.

## Next primary-evidence work

1. Locate the local decompiled consumer of the SET `PathNode` value and record
   its function anchors without copying decompiled code.
2. Build a minimal retail/Toolset fixture per node symbol and rotation, then
   capture actual cross-edge path-query outcomes.
3. Define the resolver table only from those primary results, add the
   cross-boundary contract, diagnostics, and tests first, then implement it.

No xoreos implementation or GPL source is used to infer this behaviour.

## Live-proof availability check

The canonical proof-profile, function-manifest, and script inventory was
searched on 2026-07-20 for `PathNode`, `tile path`, `rendertpn`, and `path
connect`. It contains no approved Toolset/NWN runtime profile or central atom
for a PathNode fixture. Under the Toolset proof policy, that makes the live
PathNode proof point `missing`; a generic module capture or arbitrary desktop
screenshot is not an acceptable substitute. The required next artifact is a
versioned central profile that names the immutable module/Area, tileset hashes,
two tile cells/orientations, requested cross-edge path query, capture target,
and validator.

## Static-consumer follow-up

On 2026-07-29 the local `decompiled_all.c`, `functions.tsv`, `strings.tsv`, and
`xrefs_domain.txt` exports were searched again before any live Toolset work.
The C export contains 82 textual `PathNode` occurrences: 41 string
declarations and 41 static string-construction calls. For the first concrete
storage object (`DAT_00b9dd48`), the export exposes only declaration,
construction, and destruction references. The function and domain-xref
inventories expose no named `PathNode`, tile-path, or walkmesh consumer.

This is a negative result, not evidence that the field is unused. The available
export cannot trace the parsed value into a semantic consumer, so it cannot
establish edge lanes, orientation transforms, or region connectivity. The
primary differential profile and cross-edge query therefore remain required;
no resolver table may be promoted from this static corpus alone.

## Live-session follow-up

The canonical read-only session inspection on 2026-07-29 found exactly one
responsive `nwtoolset.exe` process, PID `31196`, started at
`2026-07-29T11:48:15.784Z`. There is no canonical session ledger. Native window
inspection exposes a hidden `TfrmFrame` titled
`BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - vckdemo1.mod` on
the non-primary display and one visible iconic `TApplication`; the module file
is locked by that process.

The process is therefore an unowned, already module-bound session, not an
available blank Toolset. It was left untouched. Starting a second Toolset,
adopting or mutating `vckdemo1.mod`, or closing the process is not authorized
by the current profile or session standard. The live PathConnect proof point
remains `missing`.

Resume requires both:

1. a versioned central PathNode differential profile defining the immutable
   working module/hash, Area, exact two cells and orientations, cross-edge
   runtime query, capture target, rollback, and validator; and
2. a clean zero-process preflight, or a canonical owner-bound adoption route
   whose exact module/session identity matches that profile.
