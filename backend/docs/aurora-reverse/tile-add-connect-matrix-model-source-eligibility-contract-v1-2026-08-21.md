# Tile add/connect matrix model-source eligibility contract v1

Status: active for successor plans created after 2026-08-21.

## Purpose

The immutable tile matrix must not schedule a browser capture merely because a
SET `TileN` record contains a non-empty `Model` value. A declared ResRef is a
reference, not evidence that matching MDL bytes exist in any source available
to the current workspace.

This contract closes the failure exposed by `atj02-group-chunk-0016`:
`atj02` Tile_ID 398 declares `atj02_s08_01`, while the hash-bound tile-source
inventory classifies that model as `source_missing`; direct inspection also
found no matching MDL in `lc_legacy_tiles.hak` or any installed local HAK.
Matrix planner revision `path-node-aware-v5` nevertheless scheduled the row and
its complete SET group. The runtime correctly returned `TILE_NOT_FOUND`.

This is a source-eligibility and proof-control contract. It does not infer an
Aurora replacement model, alter SET bytes, or weaken renderer settlement.

## Hash-bound inputs

The complete catalog compiler requires two independent immutable inputs:

1. the selected tileset summary that binds the exact SET membership and bytes;
2. the per-tile source inventory that binds every
   `(tilesetResRef, tileId, modelResRef)` row and its `modelStatus`.

Both files are supplied with exact SHA-256 values. The catalog records both
paths, hashes, schemas, generation timestamps, and exact row totals. A missing,
duplicate, extra, mismatched, or unknown row fails catalog generation before an
output directory is published.

The source inventory may be a conservative upper-bound inventory that indexes
the workspace snapshot, installed HAKs, and NWN KEY/BIF resources. Therefore
`source_resolved` means only that capture is eligible to try the exact model;
it does not prove the effective module/ordered-HAK winner. The guarded runtime
capture must still prove the actual source, MDL, derived GLB, material closure,
delivery, and visible frame. Conversely, `source_missing` across that upper
bound is a hard missing-source result for the current workstation corpus.

## Row eligibility

Every compiled tile definition carries exactly one of these statuses:

- `source_resolved`: eligible for an Add/Render fixture, subject to all strict
  runtime gates;
- `source_missing`: blocked with `TILE_MODEL_SOURCE_MISSING`; its resume
  condition requires installing or attaching the exact declared model and
  regenerating the hash-bound inventory, catalog, and plan;
- `intentional_placeholder`: excluded with
  `TILE_MODEL_INTENTIONAL_PLACEHOLDER`; a placeholder is not a selectable or
  certifiable production tile;
- `invalid_missing_model_field`: blocked with `TILE_MODEL_UNDECLARED`.

An absent or unsupported status fails the complete catalog compiler. It may not
be interpreted as `source_resolved`.

## SET groups

A multi-cell SET group is capture-eligible only when every non-null member:

1. has an exact tile definition;
2. has a non-empty declared model ResRef;
3. has `modelSourceStatus=source_resolved`.

If one member is missing, invalid, or an intentional placeholder, the planner
does not create a partial group fixture and does not schedule the remaining
members through that group. Each affected row retains its exact named blocker
and resume condition. No underlay, sibling model, filename guess, duplicated
member, or visual bridge may substitute for the unavailable member.

## Immutable successor plan

The completed semantic change bumps the matrix contract to
`path-node-aware-v7`. A v5 plan remains archived evidence but is stale for
continued execution and may not be silently rewritten. The intermediate v6
plan is also archived: its first guarded capture proved that a planner
fingerprint containing source-eligibility annotations cannot serve as the
renderer drift fingerprint. The successor plan is written to a new directory
with `replacesPlanId` bound to the exact superseded plan.

Accepted v5 captures remain historical evidence. They are not counted as v7
captures unless a separate, explicit migration contract later proves exact
plan/chunk/review equivalence. In the absence of that migration, v7 begins at
checkpoint zero.

Every v7 chunk carries two immutable fingerprints:

- `definitionFingerprint` binds the planner definition including
  `modelSourceStatus`;
- `runtimeDefinitionFingerprint` binds renderer-visible SET semantics only and
  is compared with the live tileset endpoint before capture.

Changing source eligibility invalidates the first fingerprint and plan ID but
does not falsely report live SET drift. Changing renderer-visible SET fields
invalidates runtime admission and capture.

## Completion and reporting

Add/Render completion requires every row to be either:

- captured under the strict runtime and independent visual-review gates; or
- statically named as missing, placeholder, or invalid by the immutable v7
  manifest.

`Connect`, native `PathConnect`, WOK, Toolset, and NWN verdicts remain separate.
No source-eligibility status promotes any of those lanes.

## Required tests

1. Catalog v2 rejects a missing source-inventory file or SHA mismatch.
2. Catalog v2 rejects missing, duplicate, extra, ResRef-mismatched, and unknown
   source rows.
3. `source_resolved` remains planned.
4. `source_missing` becomes `TILE_MODEL_SOURCE_MISSING`.
5. `intentional_placeholder` becomes
   `TILE_MODEL_INTENTIONAL_PLACEHOLDER`.
6. A group containing one blocked member produces no partial group fixture.
7. Definition and matrix fingerprints change when source eligibility changes.
8. Current matrix, offline-plan, catalog-plan, and controller tests remain
   green under revision v7.
9. A guarded capture reaches renderer settlement under the dual-fingerprint
   contract; a planner-only annotation difference is not accepted as SET
   drift.
