# Area tile editor: Aurora-first completion inventory (2026-07-11)

## Evidence boundary

- Read-only Aurora reference: `C:\Projects\New Folder`.
- Editable implementation: `C:\Projects\aurora-web`.
- Runtime/editor groups are reconstructed from SET membership. The recovered ARE
  loader/writer persists a flat `Width * Height` `Tile_List`; it does not persist
  group IDs or member lists.

## Confirmed Aurora operations

| Capability | Reference evidence | Completion requirement |
| --- | --- | --- |
| Inspect/select tile without mutation | `decompiled_all.c:370702-370728`; Toolset `Select Terrain` command 73 | A canvas click selects one tile or all members of its SET group without changing history. |
| Terrain and feature paint | `decompiled_all.c:359681-359729`, `352344-352463`, `253670-253755` | Separate Terrain and Features/Crosser palettes use SET topology/rules, show a non-mutating preview, reject invalid edges, and commit once. |
| SET group placement | `decompiled_all.c:254199-254283` | Preview covers the rotated full footprint; add/replace of every member is one history command. |
| Raise/Lower | `decompiled_all.c:252556-252601`, `252699-252744`, `358436-358560` | Changes height by one, clamps to the recovered valid range, rebuilds topology, and propagates compatible ungrouped neighbors atomically. |
| Compatible tile reroll | `decompiled_all.c:253446-253499` | Replaces a tile by another compatible SET candidate without changing topology and preserves runtime light/animation bytes. |
| Copy/paste tiles and groups; group Cut | `decompiled_all.c:369597-369689`, `254339-254370`, `369793-369818` | Clipboard uses a relative bounding box, preserves tile payload, validates the target footprint, and commits paste/group Cut atomically. The exact native replacement left by loose-tile Cut is not recovered. |
| Tile Properties | `decompiled_all.c:370754-370779`, `454267-454282` | Multi-edit MainLight1/2, SourceLight1/2 and AnimLoop1/2/3 for the selected tiles, with web undo/redo. |
| Resize | `decompiled_all.c:251795-252520` | All four edges obey the hard `2..32` limits and keep topology/group selection coherent. |
| Undo/redo | `decompiled_all.c:255676-255693`, `256142-256159` | Mutations are one command/composite; tool and palette selection are not history entries. |
| ARE persistence | `decompiled_all.c:255345-255450`, `255916-255955` | Exactly `Width * Height` tiles persist ID, orientation, height, four light bytes and three animation-loop bytes while unknown source GFF fields remain lossless. |

## Implemented state after the completion pass

1. Inspect is an ephemeral, non-mutating tool. Terrain, Crosser, Height and SET
   Group are explicit armed tools; palette state and brush rotation stay outside
   undo history.
2. SET `terrainTypes`, `crosserTypes`, defaults and diagnostics survive the API.
   Terrain, Features/Crossers and Raise/Lower have a shared deterministic
   preview-to-commit path. Eraser remains disabled because its recovered mode-4
   token/group reconstruction semantics are not yet unambiguous.
3. Group placement snapshots the exact overwritten loose-tile underlay. Editor-
   placed groups can be restored losslessly; source-reconstructed groups without
   an underlay fail closed.
4. Loose tile height is bounded to `0..32`, retiles compatible neighbours, and
   has a deterministic compatible-variant reroll which excludes the current
   Tile_ID/orientation and preserves provenance plus all seven runtime bytes.
5. Tile Properties atomically edits MainLight1/2, SourceLight1/2 and AnimLoop1/2/3
   for one loose tile or every selected group member.
6. Tile/group Copy, Cut and Paste use a relative bounding box, expand group
   selection, validate exact SET group layout and destination boundaries, and
   create one history entry. Paste keeps destination-cell provenance (never
   source-cell provenance), preserving unknown destination `Tile_List` fields.
   Loose-tile Cut is a conservative web behavior: it replaces only through one
   unambiguous default-topology tile and otherwise fails closed.
7. Per-tile export preserves source struct type and every unknown field through
   explicit `sourceRow/sourceCol`. Aurora's complete seven-byte light/animation
   field set is always emitted, and `Tile_Orientation` plus `Tile_Height` are
   emitted as integer DWORDs like the recovered Aurora reader/writer path.
8. Single-tile rotation retiles affected loose neighbours. Resize covers all
   four edges, enforces `2..32`, refuses to split a group, and transforms group
   underlays/provenance.
9. The global asset-loading gate now permits the authoritative Area grid while
   tile presentation models load, without permitting object-add or transform
   interactions.

## Completion evidence

The earlier `area-editing-final-actions-20260711` fixtures prove topology and
trusted pointer/history behavior only. Their synthetic `proof_set` has no real
SET `Model` entries, so its `contractTileCount=0`/bridge rendering must not be
used as evidence that retail tile models were displayed.

All final browser artifacts are in
`.codex-tmp/aurora-live-evidence/area-editing-final-actions-20260711`:

- `crosser-hover-final.frame.json`: trusted pointer hover, Road feature, valid
  left-edge preview at row 3 / column 0; the green overlay is visible outside
  the model-loading card in the saved PNG.
- `terrain-commit-undo-post-closure.frame.json`: preview contains the exact
  16-cell transition closure; trusted CDP input commits Tile_ID `0x16 -> 1x16`
  and history `0 -> 1`; normal Undo restores the exact prior state with
  `past=0`, `future=1`, while the Water tool remains armed.
- `group-commit-undo-final.frame.json`: valid two-cell footprint; trusted commit
  changes history `0 -> 1` and group instances `0 -> 1`; normal Undo restores
  the exact prior state and keeps the group brush armed.

Final focused verification: frontend `13` files / `128` tests, frontend
`tsc --noEmit`, direct Vite production build, backend `3` suites / `12` tests,
backend Nest build, and capture-harness syntax check are green.

Real-model correction evidence is in
`.codex-tmp/aurora-live-evidence/area-real-tile-models-20260711` and uses the
actual `sic11.set` plus backend MDL-to-GLB delivery contracts:

- `enon-bakery-real-models-v19.frame.json`: terrain pointer commit changes the
  model mapping in 9/16 cells. The settled commit frame has 16 contracts, 16
  loaded tiles, zero pending/failed/bridge tiles and 69 visible meshes. Undo
  restores the original model key with 16/16 loaded and 26 visible meshes.
- `enon-bakery-real-group-models-v20.frame.json`: real SET `group0` placement
  commits with a preserved underlay and changes the model mapping in 7/16
  cells. The settled commit frame has 16/16 loaded, zero
  pending/failed/bridge tiles and 51 visible meshes. Undo restores the exact
  original model mapping and 16/16 loaded tiles.
- Both runs have `status=captured`, `blocker=null`, strict visual proof passed,
  trusted pointer commit, normal Undo, matching current/readiness scene keys,
  and saved page plus canvas PNGs for commit and restored state.

Post-correction focused verification: frontend 11 files / 73 tests, tile
request/race guards 15/15, frontend `tsc --noEmit`, direct Vite production
build, backend Area/SET/tile 5 suites / 49 tests, backend Nest build, and
capture-harness syntax check are green. `tsc -b` still reports only unrelated
pre-existing errors in Area light preview, creature wizard and placeable/object
rendering; the touched WorkspaceLayout tile path has no remaining build error.

The repository-wide `npm run build` wrapper remains independently blocked by
unrelated TypeScript errors in creature, VFX/placeable-rendering and
WorkspaceLayout work; the Area slice itself has no error in that output.

## Not confirmed as Aurora parity

Do not label rectangle/flood fill, continuous drag painting, editing a committed
group's orientation/height as one native group command, persistent group merge or
split, persistent group metadata, or the unique-default-blank loose Cut fallback
as Aurora behavior without new evidence.
They may remain explicit web extensions, but must not be used to claim Toolset
parity.

### Web-extension selection contract — 2026-08-20

The existing `Shift+drag` marquee is the deterministic rectangle-selection
implementation. It selects intersecting Area cells in row-major order and
uses the configured replace/add/subtract/intersect policy; it is a web editor
interaction and not an Aurora Toolset parity claim.

Connected terrain selection is also a web editor interaction. In Inspect mode,
a primary-button double click selects the exact four-neighbour component whose
tiles have the anchor tile's exact `SceneTile.terrain` value. Diagonal-only
contact does not connect regions. The result is deterministic, retains the
clicked tile as the selection anchor, clears object selection, emits bounded
selection telemetry, and never creates a scene-history entry. Missing or
ambiguous anchors, duplicate tile IDs/cells, invalid coordinates, or an
over-budget tile set fail closed to no selection. This contract must not be
used as native flood-fill evidence.

## Completion gate

The tile-editor goal is complete only when every confirmed operation above is
implemented or explicitly proven already present, an independent audit finds no
missing confirmed capability, focused tests/typecheck/build are green, and saved
runtime PNG/frame evidence proves real terrain, feature and group preview plus
commit/undo without bypassing normal pointer handling.
