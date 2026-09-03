# Area tile source remediation queue audit v1

Date: 2026-09-02  
Capability revision: `2026-09-02.161`  
Status: offline queue implemented; live visual certification still open

## Decision

The conservative source gap is now represented by one deterministic,
hash-bound remediation queue rather than by model-name guesses or an
unstructured count. Every one of the 8,666 `source_missing` rows remains
blocked until it receives either an exact model source or accepted row-bound
native evidence for a typed non-renderable disposition.

The queue does not infer aliases, substitute sibling models, classify behavior
from ResRefs or filenames, or turn topology correlation into a render
exclusion. Rows sharing one opaque model identity may be batched for evidence
collection, but that grouping does not change their individual disposition.

## Bound input and immutable output

The queue consumes the exact conservative tiles-array inventory:

- path:
  `output/proof/area-tile-source-inventory-v1-conservative-2026-09-01/tiles.json`;
- SHA-256:
  `1624e8f94952bf83d34363a7fc76680f3b8aef861b434c27f8997ff07941b004`;
- rows: 53,700;
- bytes: 30,532,609.

The immutable result is
`output/proof/area-tile-source-remediation-queue-v1-2026-09-02.json`:

- artifact SHA-256:
  `f03a339353c04ae63b0016acaf88cdbcea9861c9e6d661df1a907eda7a65b9bc`;
- queue-identity SHA-256:
  `25cf24f4de9ec99610c7fc883738bbfb65086dadd4a954d15b84aac42d5f9b33`;
- bytes: 7,462,895;
- schema: `aurora-area-tile-source-remediation-queue-artifact/v1`;
- embedded queue schema: `aurora-area-tile-source-remediation-queue/v1`.

## Exact cohorts

The queue covers all 99 selected tilesets and all 53,700 selected tile rows.
It contains 8,666 blocked missing-source rows from 39 affected tilesets and
467 unique opaque missing-model identities.

Of the missing rows, 13 belong to declared groups and 8,653 are standalone.
The current conservative topology split is 584 rows whose four corner
terrains are declared and 8,082 rows containing at least one undeclared corner
terrain. All 8,666 rows reference only declared edge crossers; none contains
an undeclared edge-crosser reference.

These are current missing-source cohorts. They do not replace the separate
historical-placeholder topology audit's 8,096/564 partition, because that
earlier partition had a different subject. Neither partition certifies a
runtime exclusion.

## Implementation and tests

The implementation consists of:

- `backend/scripts/lib/area-tile-source-remediation-queue.mjs`;
- `backend/scripts/create-area-tile-source-remediation-queue.mjs`;
- `backend/scripts/test-area-tile-source-remediation-queue.mjs`.

The test was introduced before the implementation and initially failed because
the module did not exist. It now verifies deterministic ordering, exact
inventory membership, model-identity mismatch rejection, behavior invariance
under opaque model-name changes, CLI hashing, and immutable output semantics.
It is included in `test:tiles:runtime-sweep-source`.

Validation completed for this checkpoint:

- source chain: 13 scripts passed;
- capability catalog: 13/13 passed;
- runtime profile/matrix tests: passed;
- matrix-control and active-plan binding tests: passed;
- backend Nest production build: passed;
- frontend TypeScript/Vite production build: passed.

## Replacement runtime binding

Because the queue implementation and capability catalog changed runtime-bound
source, v13 remains immutable historical evidence and is no longer the active
source identity. The replacement v14 profile binds 1,798 files and 30,590,387
bytes to runtime digest
`eeb44fe8876a3a6a34d0307f0ad77511c743d2d41c724f90d5da798e045f330d`.

Its profile SHA-256 is
`25d52f6cf3a95252fda5ae0a1bbfdbe830e9071c7fe28f039722baf7b56cdb98`;
its source-manifest SHA-256 is
`812167b009537fb55fd691e4126559fd3c3b44898b93bec56f8f13020a9fed54`.

The active replacement plan is
`output/proof/tile-add-connect-matrix-v14-source-remediation-bound-2026-09-02`
with plan id
`ac93afd6bec7aae959becaf38c3d88f93157bdb171c414229d2908378d17487a`.
It explicitly replaces v13 plan id
`7e760c1a088cde19f4b22ec4479bc55e8ce513dd0daf1a4720cd15d7e6d626b4`.
Offline validation is `ready`, runtime source identity is `verified`, and the
checkpoint remains `0/3380`.

## Live-proof boundary

One canonical read-only runtime preflight returned `blocked` with
`DOCKER_ENGINE_UNAVAILABLE` and the previously observed fatal dependency
`DOCKER_INFERENCE_ENDPOINT_FATAL`. The dependency fingerprint remained
`9ab12020bca69585ebb959f7960ff464acbe37d63249bf65529e750ebee5f538`.
Ports 3000 and 5173 and the repository proof locks were clear, but containers
could not be observed while the engine was unavailable.

The preflight was not retried. Docker Desktop was not started, restarted, or
stopped; no service, watcher, browser/Chrome capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used. Live
Add/Render, PathConnect/WOK, Toolset Save/Build/reopen, packed readback, and NWN
runtime completion remain open.
