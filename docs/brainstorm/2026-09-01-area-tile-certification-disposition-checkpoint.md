# Area tile certification-disposition checkpoint

Date: 2026-09-01  
Capability revision: `2026-09-01.149`

## Scope and result

This bounded frontend checkpoint removes the remaining model-name classifier
from Area tile process readiness and renderer settlement. It does not add or
infer a new Aurora runtime semantic. The runtime now consumes the existing
immutable certification row as a typed composition input:

- `process` requests the model delivery contract;
- `blocked` publishes a fail-closed diagnostic without requesting a model;
- `excluded` represents the certified non-rendering tile definition without
  requesting a model.

The model ResRef remains an opaque request/cache identity. It no longer
selects process behavior through `null`, `padding`, `tpad_*`, or any other
naming convention.

## Composition boundary

`areaTileProcessCandidateComposition.ts` is the application-layer boundary
between the Areas certification index and the shared tile process contract.
For a ready, tileset-bound certification source it maps:

1. an excluded eligibility row to `excluded` with its immutable reason code;
2. an eligible row whose inventory proof is `failed` or `missing` to a typed
   `blocked` disposition;
3. an eligible row with verified inventory to `process`.

An unavailable, loading, mismatched, or absent certification row does not
invent an exclusion. It conservatively remains `process`, allowing the
backend delivery contract to fail closed with concrete diagnostics.

The scene identity includes the disposition, tile definition ID, and reason
code. A certification change therefore invalidates stale readiness even when
the model ResRef is unchanged.

## Renderer behavior

Renderer settlement consumes `excludedTileDefinitionIds` from readiness. A
typed excluded cell counts as represented, is omitted from the unique model
request set, and is never loaded into the model layer. All non-excluded cells
still require their own ready GLB and renderer-handoff contract.

The former sibling-contract surface bridge for model-less group members was
removed. No adjacent group member may provide a substitute texture or model
for a blocked definition.

## Verification

Resource-bounded verification completed without a live runtime:

- focused composition, readiness, and renderer unit tests: `22/22`;
- focused certification-disposition regression smoke: `1/1`;
- related Area readiness, tile-light, and scene-mapper tests: `21/21`;
- bounded backend capability-catalog gate: `13/13`;
- frontend TypeScript/Vite and backend Nest production builds: passed.

The larger related frontend sample completed `131/132`. Its only failure is
the pre-existing shared-worktree Placeable material-side assertion in
`WorkspaceCanvasViewport.renderFilter.test.ts`; the changed tile files do not
import or mutate that Placeable material policy. The ordinary backend Jest
catalog command reached the repository's fixed 1 GiB heap during transform
before executing assertions; memory was not increased and the identical
command was not retried. The repository's bounded transform profile then
executed the exact catalog suite successfully (`13/13`).

No Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## Remaining blockers

This checkpoint closes the frontend runtime naming branch, but does not make
the placeholder classification independently authoritative. The upstream
inventory producers still classify `null`/`padding`/`tpad_*` by regex in:

- `backend/scripts/audit-all-area-tiles.mjs`;
- `backend/scripts/audit-all-runtime-tile-contracts.mjs`.

That producer must be replaced by an immutable, evidence-bound source status
before the placeholder lane can be called identity-neutral end to end. The
capability blocker is therefore narrowed to
`placeholder_inventory_identity_neutral_producer_pending`.

The other open blockers are unchanged: live hash-profile recertification,
the source-frozen complete 99-tileset Add/Render and adjacency matrix, 34
missing declared model sources across nine tilesets, and native positive-cross
plus negative-noncross PathConnect/WOK proof.

Successor note: checkpoint 218 removed both backend naming classifiers and
introduced the hash-bound positive-evidence profile. Revisions `.159` and
`.160` subsequently preserved exact `NULL`/`(null)` SET declarations, proved
zero exclusions, regenerated the conservative `45,034 / 8,666 / 0` catalog,
and activated the source-bound v13 matrix at `0/3380`. The current blockers are
recorded in
`docs/brainstorm/2026-09-01-area-tile-source-eligibility-producer-checkpoint.md`.
