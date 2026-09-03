# Tile CUD and runtime proof: Aurora-first audit

Date: 2026-07-19  
Branch: `codex/tile-cud-proof-completion`  
Status: active; runtime and visual matrices remain incomplete

## Scope and source policy

This audit covers the current tile CUD implementation, tile render-contract
freshness, model delivery, and the proof workflow used for the all-tileset
matrix.

No xoreos source or comments were used for the implementation described here.
No xoreos observation is accepted as Aurora runtime evidence.

The earlier uncommitted reversal of serialized `Mod_HakList` order was not
supported by primary evidence. `reverse-validation-matrix-r79.md` classifies
exact HAK conflict precedence as hypothesis H4 / gap G6. The implementation now
preserves serialized order and makes no runtime-precedence claim.

## Aurora-semantic classification

Confirmed as infrastructure/diagnostics, not Aurora semantics:

- post-PUT byte readback;
- deterministic selection of the currently configured derived-asset version;
- SHA-256 equality between the processed contract and delivered model;
- re-reading a mutable derived object after a source sync changes it.

Quarantined pending primary Aurora decompilation, retail, or Toolset evidence:

- crop, void, black-background, and ceiling visibility heuristics in
  `workspaceTerrainMesh.ts`;
- HAK collision precedence;
- native eraser/LCG behavior, arbitrary Tile_ID replacement semantics,
  transition propagation/first-match policy, and group rotate/height/source
  group editing.

Existing internal regression tests for those lanes are not runtime-parity proof.

## Reproduced false-ready defect

Affected examples:

- `tile_tdc01_p11_01`
- `tile_tdc01_t20_01`
- `tile_tdc01_a02_03`

The rejected artifact
`output/proof/tdc01-flrcrack-runtime-contract-proof-v18.json` recorded
`accepted=false`. For `tdc01_p11_01`, the contract described 110,704 bytes and
SHA-256 `db422ca...`, while delivery returned 156,896 bytes and SHA-256
`f8d73e...`; the delivered closure had the additional
`tdc01_flrcrack` reference.

Independent S3 polling around one bypass request showed:

- request interval: about 1,516 ms to 24,924 ms;
- initial object: 156,896 bytes / `f8d73e...`;
- overwrite at about 23,492 ms: 110,704 bytes / `db422ca...`;
- overwrite at about 24,795 ms: 156,896 bytes / `f8d73e...`;
- emitted contract: the intermediate 110,704-byte object.

A plain process request reproduced the same two writes while the source MDL
remained stable (109,490 bytes, SHA-256 `4aa702...`). Batch concurrency was one
and the backend was one Node process, excluding a multi-worker race.

The evidence contradicts the earlier keep-alive/socket hypothesis. That
unproved client-session workaround and its comments were removed.

## Root cause and implemented gates

1. `bypassCache` had been changed to regenerate every MDL-backed tile even when
   a current derived model existed. That first generation could overwrite a
   richer GLB with a model-only result. The bypass path once again syncs only a
   missing/non-render-ready model.
2. `ModuleSnapshotTileRepository` selected the largest GLB across every
   converter-version directory. A larger obsolete model could therefore win
   over the current configured converter and trigger unnecessary regeneration.
   Current-version candidates now win independently of LIST order and size.
3. A targeted material-source sync can regenerate the GLB under the same key.
   The contract previously retained the pre-sync inspection. It now re-reads
   the GLB and rebuilds the material closure after the sync.
4. Model delivery now computes the delivered SHA-256 and rejects a mismatch
   with HTTP 409 / `TILE_MODEL_CONTENT_MISMATCH`.
5. Post-PUT verification no longer treats a temporarily missing object as
   success; it retries and fails closed if the acknowledged bytes never appear.

## Verification

Focused test-first reproductions:

- current-version selection, both LIST orders: 2 passed;
- no overwrite of an existing current model on bypass: 1 passed;
- post-material-sync model reinspection: 1 passed;
- mismatched delivery SHA fails closed: 1 passed;
- present-stale and temporarily-missing post-PUT readback: 2 passed.

Combined touched-module gate:

```text
Test Suites: 4 passed, 4 total
Tests:       107 passed, 107 total
```

Backend `npm run build`: passed.

These are implementation gates, not completion proof. The next accepted proof
must rerun the three `tdc01` targets against the restarted backend, compare
contract and delivered SHA/closure, and then pass the guarded browser capture.

## Skill and proof contract

Proof workflow source:

- `aurora-toolset-prove`, suite contract 1.0.1;
- `playwright` for guarded browser automation;
- `playwright-interactive` only for iterative debugging.

The accepted capture must satisfy
`proof-capture-safety-contract-2026-07-10.md`: fresh requested state, fully
settled model/texture/tile contracts, zero unexpected failed/bridge/placeholder
tiles, exact saved capture plus manifest, visual inspection, and validator.

## Remaining completion gates

1. Restart the backend with the built code.
2. Verify the three targeted `tdc01` contracts and exact model deliveries.
3. Produce and visually inspect a fresh guarded Area capture.
4. Resume and finish all 36,997 non-placeholder runtime tile contracts across
   all 99 tilesets.
5. Finish the visual/camera matrix without unexpected failures.
6. Keep semantically quarantined CUD/render lanes out of Aurora-parity claims
   until primary proof exists.

