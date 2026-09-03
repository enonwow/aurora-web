# Area tile-certification publication contract v1

Date: 2026-08-21  
Status: active

## Purpose

This contract publishes the complete 99-tileset, 53,700-definition source-bound
catalog as one immutable `area-certification-release-report.v1` document. The
report is an honest progress ledger, not a completion claim. It may expose
verified Add/Render rows already accepted by the guarded matrix controller,
but it must not infer PathConnect, WOK, Toolset, NWN, persistence, adjacency,
or visual-seam proof from those captures.

The existing authenticated tile-certification page API remains unchanged. The
publisher produces its configured source document; it does not add another
frontend/backend contract.

## Immutable inputs

Publication requires all of the following explicit inputs:

1. one `aurora-tileset-definition-catalog/v2` catalog and its expected
   lowercase SHA-256;
2. the source-inventory and model-source-inventory files named by that catalog,
   each matching the catalog's exact SHA-256;
3. every one of the catalog's definition shards, with exact path, SHA-256,
   source identity, and row totals;
4. one persisted `aurora-tile-add-connect-matrix/v2` directory and its exact
   plan id, which is also the manifest SHA-256;
5. the current checkpoint and its explicit expected SHA-256;
6. one immutable `aurora-tile-add-connect-runtime-build-profile/v1` file,
   its explicit expected SHA-256, and the exact
   `aurora-tile-add-connect-runtime-build-binding/v1` embedded by the v8
   matrix plan;
7. a bounded immutable publication profile id and a caller-supplied canonical
   ISO generation timestamp.

Before any proof is promoted, the canonical matrix status validator must
accept the complete manifest, chunks, checkpoint, summary, contract revision,
contract fingerprint, runtime-build binding, and plan binding as `ready`.
Publication independently rehashes and reparses the runtime-build profile,
rebuilds its canonical binding, and requires an exact match in the manifest,
status, checkpoint, every accepted review, and every accepted frame.
Publication fails closed if the status command fails, writes non-JSON output,
reports any validation error, or disagrees with catalog row counts.

The publication `corpusHash` is the SHA-256 of a canonical descriptor binding
the publisher policy version, catalog and both inventory hashes, matrix plan
id, matrix schema/revision/fingerprint, runtime-build profile id, profile
SHA-256, runtime-build binding SHA-256, and publication profile id. Checkpoint
progress is deliberately excluded from the corpus identity: proof progress
changes the ledger/report hashes, not immutable plan membership.

## Exact row mapping

The publisher emits exactly one production `tile-definition` row for every
catalog `(tilesetResRef, Tile_ID)`:

- `rowId`: `tile:<tilesetResRef>:<Tile_ID>`;
- `capabilityId`: `topology_certified_placement_gate`;
- subject id: `<tilesetResRef>:<Tile_ID>`;
- release scope: `production`.

Model-source status maps as follows:

| Catalog status | Eligibility | `inventory` | Stable reason |
| --- | --- | --- | --- |
| `source_resolved` | eligible | `verified` | none |
| `source_missing` | eligible | `failed` | none |
| `invalid_missing_model_field` | eligible | `failed` | none |
| `intentional_placeholder` | excluded | `missing` | `TILE_MODEL_INTENTIONAL_PLACEHOLDER` |

An absent, unknown, duplicate, noncanonical, or count-mismatched row aborts
publication. A source-resolved inventory result proves only static source
eligibility; it does not prove renderer asset closure.

## Accepted Add/Render evidence

Only checkpoint entries in `acceptedVisualReviews` may promote Add/Render
proof. For every entry the publisher must verify:

- membership in the exact captured checkpoint prefix and a unique chunk id;
- the independent visual-review file hash, schema, `verified` verdict, reviewer
  identity, valid ISO timestamp, proof-skill contract version, plan/contract
  binding, chunk id/fingerprint, attempt id, and all four required visual
  checks;
- the frame, state, canvas, page, and lifecycle artifact hashes and containment
  within the matrix capture directory;
- the exact v8 runtime-build binding in the checkpoint entry, review, and
  frame, plus `runtimeBuildProof.status=verified` in the frame;
- exact frontend DOM identity and backend `/health` identity through both the
  frontend proxy and direct backend origin, with proxy/direct agreement and a
  backend `processStartedAt` no earlier than the profile build;
- equal, valid preflight and post-capture source-identity summaries whose
  digest reconstructs both declared worktree commits and image digests;
- the persisted chunk's exact identity through the already validated manifest,
  its tileset/source hash binding, and its declared member cells;
- that each promoted member is an existing `source_resolved` catalog row.

SET group fixtures may overlap by design. Multiple accepted chunks may
therefore reference the same member. The publisher retains and validates every
review/artifact binding, deduplicates only the final subject set, reports both
the evidence-reference and unique-row counts, and requires the latter to equal
the canonical matrix `capturedRows` coverage.

For only those exact member rows, `assetClosure` and `render` become
`verified`. Every other proof dimension remains independent:

- `visualSeam`, `setAdjacency`, `pathReference`, `pathConnect`, `wokSeam`,
  `persistence`, `toolset`, and `nwnRuntime` remain `missing` in this publisher;
- review fields explicitly labelled `proofScope=add_render` cannot promote a
  different dimension;
- matrix reference matches are diagnostic candidates, not PathConnect proof.

No failed capture, rejected review, pending capture, historical predecessor
plan, or unbound screenshot contributes proof. In particular, v7 frames with
null or absent build identity remain immutable historical diagnostics and may
not be migrated, backfilled, or published as v8 certification evidence.

## Output and resource budget

The publisher rebuilds the canonical v2 plan and v1 release report through the
domain builders, validates the final document by a second rebuild, writes
compact UTF-8 JSON atomically only when explicitly executed, and verifies the
published file SHA-256. The output must fit the existing 64 MiB adapter budget;
otherwise publication fails without changing the previous file.

For the current 53,700-row corpus, the conservative all-missing baseline is
47,191,803 bytes (45.01 MiB) as compact JSON, so a single immutable file is
within contract. Pretty-printed output is forbidden because it can exceed the
bounded delivery budget without adding semantics.

The CLI prints a bounded manifest containing input hashes, plan/corpus/report
hashes, row and proof-state totals, output bytes/hash, and whether a write was
performed. It also reports the runtime-build profile id, profile SHA-256, and
binding SHA-256. It never prints the complete row ledger.

The backend delivery adapter is configured by setting
`AURORA_AREA_CERTIFICATION_REPORT_PATH` to the published file before the
managed backend process is started. The repository `.env.example` documents
the current source-bound path, but publication never starts or restarts a
service and never mutates an already running process environment.

## Required tests and acceptance

1. Same immutable inputs in different catalog/shard order produce identical
   plan, ledger, report, and output hashes for the same timestamp.
2. Every supported model-source status maps exactly as specified.
3. An exact accepted review promotes only `assetClosure` and `render` for its
   exact member rows.
4. Unknown statuses, duplicates, missing/extra rows, hash drift, plan drift,
   checkpoint drift, runtime-profile drift, runtime-observation drift,
   review/artifact drift, path escape, noncanonical time, and unsupported proof
   bindings fail closed.
5. Preview mode performs no write; execute mode publishes atomically and
   validates the resulting file.
6. The real 99-tileset artifact contains exactly 53,700 rows, fits below
   64 MiB, rebuilds successfully, and is accepted by the file source plus query
   application service.
7. Focused backend tests and the backend production build pass under the
   repository's 1 GiB heap limit.

The accepted publication source is contract revision `path-node-aware-v8`.
Earlier matrix revisions remain inspectable but are not eligible for this
publication contract.

Publication closes only the ledger-delivery blocker. Full certification still
requires the remaining guarded Add/Render matrix, independent PathConnect and
WOK evidence, native Toolset Save/Build/reopen, packed readback, and NWN runtime
proof.
