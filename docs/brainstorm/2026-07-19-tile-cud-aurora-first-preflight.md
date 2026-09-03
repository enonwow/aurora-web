# Tile CUD and runtime proof: Aurora-first pre-flight

Date: 2026-07-19  
Branch: `codex/tile-cud-proof-completion`  
Status: active

## Scope

Complete tile create/update/delete behavior and validate every available tileset
entry through the authenticated runtime contract and the Area editor. Completion
requires fresh, settled, visually reviewed proof artifacts and no unexpected
model, texture, bridge, or editor-operation failures.

## Rules classification

- Rules-first: repository and canonical project rules were reviewed before
  continuing implementation.
- Aurora-first: storage read-after-write consistency, contract/content hashing,
  and proof freshness are infrastructure and diagnosability concerns. They do
  not require an Aurora runtime-semantic assumption.
- Aurora-semantic boundary: HAK conflict precedence, tileset master-cell
  behavior, neighborhood material precedence, and any new visibility/crop rule
  remain blocked until confirmed by Aurora decompilation, retail, or Toolset
  evidence.
- Contract-first: model content hash, observed byte size, and material-reference
  closure are additive API v1 diagnostics. They must remain backward compatible.
- Test-first: focused unit/regression tests precede implementation changes.
- Diagnosability-first: a runtime proof must compare the model SHA-256 and
  material-reference closure analyzed by the contract with the exact delivered
  model and texture responses.

## External GPL review

No xoreos source code or comments were consulted, copied, ported, translated, or
used for the current implementation.

The working tree contained an uncommitted change that reversed `Mod_HakList`
while citing xoreos paths as runtime authority. That statement is quarantined
and must not be used as implementation evidence:

- accepted xoreos observation: none;
- source class: not applicable because no secondary observation is accepted;
- independent primary status: unconfirmed;
- primary evidence:
  `backend/docs/aurora-reverse/reverse-validation-matrix-r79.md` classifies the
  exact HAK conflict order as hypothesis `H4` and missing proof `G6`;
- behavior not proved: which serialized HAK entry wins when two HAKs provide the
  same resource;
- required follow-up: an Aurora decompilation trace or retail/Toolset collision
  fixture with at least two HAKs containing the same resref and resource type.

Until that follow-up exists, IFO parsing must preserve serialized order and must
not present it as canonical Aurora conflict precedence.

## Current runtime defect

For `tdc01_p11_01`, `tdc01_t20_01`, and `tdc01_a02_03`, the contract analyzed an
older derived GLB while the model delivery endpoint returned a newer GLB under
the same object key. The rejected proof showed:

- contract and delivery SHA-256 mismatch;
- contract material closure smaller by one reference;
- missing `tdc01_flrcrack` in the contract despite its presence in the delivered
  GLB;
- false `ready` with an empty blocker list.

This is not accepted as complete. The contract must fail closed or converge on
the same immutable content that the renderer receives.

## Acceptance gates

1. Backend focused unit tests and build pass.
2. Backend integration/e2e coverage proves contract SHA and delivered SHA match.
3. The targeted `tdc01` proof has exact material-reference closure and all
   referenced texture deliveries return success.
4. The Area editor loads the full requested area with settled counts and zero
   unexpected failures.
5. The resumable all-tileset sweep completes every non-placeholder runtime tile.
6. The full Tile CUD matrix completes without attention/blocked outcomes and
   without worker/unhandled errors.
7. Every accepted visual proof records area identity, freshness, readiness,
   timestamp, and exact artifact path.
