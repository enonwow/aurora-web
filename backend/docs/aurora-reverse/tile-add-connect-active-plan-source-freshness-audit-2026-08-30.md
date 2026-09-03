# Tile Add/Connect active-plan source-freshness audit — 2026-08-30

## Scope and classification

This is an Aurora-first, proof-control audit for the authoritative 99-tileset
Add/Render matrix. It does not claim new Aurora tile semantics and therefore
does not require a new decompilation pass. It verifies that repository-owned
control commands fail closed before any browser, service, Docker, Toolset, or
NWN work when the mutable runtime sources no longer match the immutable build
profile bound to the active plan.

The governing contract is
`tile-add-connect-matrix-runtime-build-identity-contract-v1-2026-08-21.md`.
Its offline admission rule requires `status`, `next`, and `capture` to request
a fresh local runtime-source identity check. A mismatch must return
`runtime_build_reprofile_required`; it must not emit a capture command or
contact the runtime.

## Authoritative persisted state

- active binding:
  `backend/docs/aurora-reverse/proof-profiles/tile-add-connect-active-plan.json`;
- plan directory:
  `output/proof/tile-add-connect-matrix-v12-runtime-build-bound-catalog-2026-08-26`;
- plan ID:
  `7a3f8a0e8366411e5a6334c260089cf3c184840ade30e6568bbd136fb908c781`;
- immutable profile ID:
  `tile-add-connect-runtime-build-v12-source-bound-2026-08-26`;
- immutable profile SHA-256:
  `ffe4d7fbbd0e9108e17677882f5859be2cbddd7559121fdeffe5b0b6bfa80ad2`;
- expected runtime-source digest:
  `69f9c763bc1dbf9acb156ea89fb237e34c61e16562d079002bb732b697b4c999`;
- checkpoint: `0/3378` accepted chunks, incomplete;
- matrix: 99 tilesets, 53,700 rows, 45,003 Add/Render capture rows,
  44,664 PathConnect-applicable rows;
- PathConnect differential acceptance: `0/44,664`.

The plan itself remains structurally `ready`. That is intentionally separate
from the mutable source-freshness decision.

## Defect and operational consequence

The matrix controller already supported `--verify-runtime-source`, and the
canonical package scripts included it. The active-plan wrapper did not enforce
the flag itself. A direct invocation such as:

```text
node backend/scripts/aurora-tile-add-connect-active-plan.mjs status
```

therefore returned `runtimeSourceIdentity: null` and could advertise
`capture_next_chunk`. That output was unsafe as an operator decision because
it postponed the required mismatch decision until a later command. Repeating
heavy runtime or capture attempts from that state can waste resources and
cannot produce admissible proof.

## Implemented correction

`aurora-tile-add-connect-active-plan.mjs` now constructs every allowed child
command (`status`, `next`, and `capture`) with a final, wrapper-owned
`--verify-runtime-source` argument. Appending the binding after forwarded
arguments makes the exact boolean flag authoritative even if a caller tries
an option-like value such as `--verify-runtime-source=false`.

The behavior is covered by
`test-tile-add-connect-active-plan-binding.mjs`. The test was first observed
failing because the argument builder did not exist, then passed after the
wrapper change.

## Accepted offline evidence

All commands were sequential and used a one-GiB Node heap ceiling.

1. Active-plan binding regression:
   `node --max-old-space-size=1024 backend/scripts/test-tile-add-connect-active-plan-binding.mjs`
   — passed.
2. Matrix control-plane regression:
   `node --max-old-space-size=1024 backend/scripts/test-aurora-tile-add-connect-matrix-control.mjs`
   — passed.
3. Direct active `status` after the correction recomputed 1,658 files and
   29,189,086 bytes. It observed digest
   `fe8389adcf2f7642f743cc5a5c101fe44c63a84f6be3416988442f64b732565a`
   and returned `runtime_build_reprofile_required` with the four expected
   frontend/backend commit and image-digest mismatch codes.
4. Direct active `next` returned the same blocker with `chunk: null` and
   `captureIntegration: null`.

No Docker command, container, backend/frontend service, watcher, Chrome or
browser capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used.

## Evidence boundary and remaining work

This audit proves only the offline fail-closed control path. It does not make
the stale v12 profile current and does not advance the matrix checkpoint.
Creating a successor profile/plan while implementation sources are still
changing would immediately make it stale again, so no reprofiling or capture
was attempted.

Full completion still requires a final source-frozen successor profile and
checkpoint-zero plan, accepted exact Add/Render captures for every required
row with zero unexpected failed/bridge tiles, separate immutable differential
PathConnect/WOK evidence, and the required Toolset Save/Build/reopen and NWN
runtime proof. The known source-missing model rows remain evidence blockers;
they are not candidates for asset-identity-specific runtime fallbacks.
