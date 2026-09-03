# Area tile server materialization admission contract v1

Date: 2026-08-21  
Status: implemented and offline verified  
Scope: Area Create and Area Update validation and materialization

## Authority and safety boundary

This additive v1 contract consumes the immutable
`area-certification-release-report.v1` already governed by
`area-tile-certification-publication-contract-v1-2026-08-21.md`. It is a
project release-safety policy and does not add or infer an Aurora runtime
semantic. No new decompilation or external GPL source is required for this
policy implementation.

The browser placement gate is usability protection, not materialization
authority. Every server-side Area Create and Area Update candidate must pass
this independent gate even when the caller bypasses the frontend. Validation
receipts are evidence only: a committing transaction repeats admission under
the fenced module lease and before the durable journal or any staging write.

The gate proves only eligible tile inventory and accepted render closure. It
does not prove visual seams, SET adjacency, PathReference, PathConnect, WOK
seams, persistence, Toolset Save/Build, or NWN runtime behavior. Those proof
dimensions remain independent completion gates.

## Exact candidate scope

Admission evaluates every distinct `Tile_ID` in the complete resulting Area,
not only definitions changed by the current command. This prevents an
object-only mutation or direct API call from publishing a candidate whose
retained topology has no production render-closure evidence.

For Area Create the authoritative input is the normalized command tile grid
after the compiled ARE/GIT/GIC/IFO candidate passes independent validation.
For Area Update it is the exact `projectedDraft.tiles` carried by the compiled
and independently read-back candidate. A candidate with no tiles is invalid
before this policy is reached. Duplicate Tile_ID values are deduplicated and
the resulting set is strictly ascending.

There is no development fixture, `matrix_*`, actor, role, module, Area, or
asset-identity bypass on the server.

## Admission rule

The server loads only the administrator-configured certification report. The
report must pass the existing full canonical rebuild, ledger SHA-256, report
SHA-256, membership, identity, duplicate, and boundedness validation. A caller
cannot select a report, plan, profile, ledger, or host path.

Every exact `(tilesetResRef, Tile_ID)` in the candidate is admitted only when:

1. one production `tile-definition` row exists under the canonical subject ID
   `<tilesetResRef>:<decimal Tile_ID>`;
2. its eligibility is `eligible`;
3. `inventory`, `assetClosure`, and `render` are each `verified`.

Missing and excluded rows and `missing` or `failed` required proofs fail
closed. The complete candidate is atomic: one blocker rejects the whole
validation or transaction. Connection, native, and persistence proof states
do not influence this render-closure decision.

## Provenance binding

An admitted result carries exact additive metadata:

```json
{
  "schemaVersion": "area-tile-production-admission.v1",
  "policyVersion": "area-tile-production-admission-policy.v1",
  "reportGeneratedAtIso": "2026-08-21T00:00:00.000Z",
  "planId": "area-plan-id",
  "corpusHash": "64-lowercase-hex",
  "profileId": "runtime-profile-id",
  "ledgerSha256": "64-lowercase-hex",
  "reportSha256": "64-lowercase-hex",
  "tilesetResRef": "tno01",
  "uniqueTileIdCount": 17,
  "tileIdSetSha256": "64-lowercase-hex"
}
```

`tileIdSetSha256` is the lowercase SHA-256 of canonical UTF-8 JSON with
recursively sorted object keys for exactly
`{ "tileIds": [strictly ascending unique integers], "tilesetResRef":
"normalized-resref" }`. The raw Tile_ID list is not duplicated in a receipt;
the committed candidate ARE retains it and the hash binds it to the exact
tileset.

The binding is returned by successful Area Create validation, Area Update
validation, Area Create materialization, and Area Update materialization. It
is additive within their existing v1 receipts and remains covered by existing
`no-store`, ETag, idempotency, and readback rules. A replay returns the original
immutable binding. A later ledger change cannot rewrite an existing receipt.

For materialization, the same binding is written into the byte-free candidate
manifest at `journal.begin`. Memory and MySQL control stores compare every
binding field against the verified readback receipt before retaining it. The
manifest therefore binds the prepared transaction to the exact report,
profile, tileset, and canonical Tile_ID-set hash without persisting source
paths, report bytes, or the duplicate raw tile list. A legacy/incomplete
manifest without this binding cannot finalize a new verified readback.

## Ordering and transaction invariants

Area Update validation performs authorization, module revision checks, exact
draft compilation/readback, admission, and only then returns a receipt. Area
Update materialization performs the same admission after compilation while
holding the module lease and before `journal.begin`.

Area Create validation performs candidate compilation, independent resource
validation, admission, and then returns a receipt. Area Create materialization
first retains its separate native creation-profile gate, then repeats normal
transaction checks, compilation and independent resource validation, and
performs admission before `journal.begin`.

A blocked or unavailable admission must preserve all of these invariants:

- `mutationStarted=false`;
- no journal begin or transition;
- no content staging, resource publication, IFO publication, readback,
  compensation, quarantine, cache invalidation, or idempotency finalization;
- the acquired module lease is released exactly once;
- a prior matching idempotency replay remains authoritative and performs no
  new ledger read or mutation.

## Stable errors and bounded diagnostics

An unavailable configured report returns
`503 AREA_TILE_CERTIFICATION_LEDGER_UNAVAILABLE`; a present but invalid report
returns `503 AREA_TILE_CERTIFICATION_LEDGER_INVALID`. Both are retryable and
reuse the certification query's source semantics.

Candidate blockers return `422` with the first deterministic code:

- `AREA_TILE_CERTIFICATION_ROW_MISSING`;
- `AREA_TILE_CERTIFICATION_EXCLUDED`;
- `AREA_TILE_CERTIFICATION_PROOF_MISSING`;
- `AREA_TILE_CERTIFICATION_PROOF_FAILED`.

Diagnostics are ordered by numeric Tile_ID and then required proof order
`inventory`, `assetClosure`, `render`. A missing row or excluded eligibility
stops evaluation of later stages for that Tile_ID. Each bounded diagnostic may
contain only Tile_ID, row ID when present, stage, status, and the stable
`certification_plan_excluded` reason code. HTTP responses return at most 32
diagnostics of at most 256 code units each. Host paths, report bytes, proof
artifact paths, tokens, and free-form exclusion reasons are never returned.

## Payload, versioning, and frontend compatibility

No command body changes. The additive admission binding is bounded below 1
KiB, so the existing Create and Update response budgets remain unchanged.
Pagination, chunking, and streaming do not apply to one candidate. The
frontend Create/Update HTTP adapters validate and retain the exact binding;
error adapters already preserve stable backend codes and bounded details.
Breaking changes require API v2 or a new admission schema/policy version.

## Diagnosability and completion tests

The exact report, policy, tileset, and Tile_ID-set hashes are sufficient to
reproduce an admitted decision without exposing source paths. Required TDD
evidence is:

1. pure policy tests for deduplication, deterministic hashing, missing and
   excluded rows, every missing/failed required proof, ignored independent
   proof dimensions, and mixed-candidate atomic rejection;
2. ledger integration tests proving canonical report bindings and the two
   fail-closed source errors;
3. Update validation tests proving admission follows compile/readback and a
   blocked result returns no receipt;
4. Update transaction tests proving admission is repeated under the lease and
   rejection occurs before journal/staging with exact lease release;
5. equivalent Create validation and transaction tests, including the
   independent native-profile gate ordering;
6. strict backend and frontend receipt-schema tests, authenticated HTTP tests,
   Area regression smoke tests, and production builds.

All listed offline gates pass as recorded in program checkpoint 57, including
274 focused backend unit/controller tests, the two-test atomic Create integration runner,
22 strict frontend adapter tests, the capability catalog, and both production
builds. This implementation does not close the full 99-tileset matrix,
PathConnect/WOK, browser placement proof, Toolset, or NWN certification stages.
