# Runtime tile sweep source-eligibility contract v1

Date: 2026-09-01  
Status: active for new runtime sweep outputs

## Purpose

The runtime tile-contract sweep must decide whether a catalog row is processed,
blocked, or excluded without selecting behavior from a model ResRef, filename,
tileset identity, or naming pattern. The model ResRef is only an opaque request
identity after an immutable source contract has admitted the row.

This contract removes the sweep-local `null`/`padding`/`tpad_*` classifier and
the three exact group-companion exceptions. It does not promote the upstream
model-source inventory to native Aurora authority. The independent evidence gap
for producing `intentional_placeholder` remains open.

## Required immutable input

Every new or resumed sweep must receive:

1. one `aurora-tileset-definition-catalog/v2` file;
2. its caller-supplied exact lowercase SHA-256;
3. every definition shard named by that catalog, inside the catalog directory
   and matching its exact SHA-256;
4. the live `/areas/editing/tilesets/:tilesetResRef` definition whose SET
   fingerprint and exact tile membership match the catalog shard.

The sweep persists a catalog binding in its checkpoint. A legacy checkpoint,
hash mismatch, schema mismatch, path escape, duplicate/missing row, unknown
status, SET fingerprint drift, or model declaration mismatch aborts before any
runtime tile request or checkpoint advance. Existing legacy sweep artifacts
remain historical and cannot be resumed under this contract.

## Generic disposition mapping

| `modelSourceStatus` | Disposition | Runtime request | Diagnostic |
| --- | --- | --- | --- |
| `source_resolved` | `process` | `tile_<opaque modelResRef>` | runtime contract result |
| `source_missing` | `blocked` | none | `TILE_MODEL_SOURCE_MISSING` |
| `invalid_missing_model_field` | `blocked` | none | `TILE_MODEL_DECLARATION_INVALID` |
| `intentional_placeholder` | `excluded` | none | typed exclusion only |

No model spelling may alter this mapping. In particular, `padding` with
`source_missing` is blocked, while an arbitrary nonempty model name with
`intentional_placeholder` is excluded.

## Evidence limitation

The current v2 catalog consumes the July model-source inventory, whose producer
still uses an unproven naming classifier. Hash binding prevents drift and
duplicate classification inside the runtime sweep, but it does not prove the
Aurora meaning of those rows. Native Toolset/decompilation evidence or a new
independently evidenced producer is still required before the 8,660 excluded
rows can be certified as Aurora-semantic placeholders.

No xoreos or other GPL source is used by this contract.
