# AUR-S05-04 — accepted Tile Properties transaction

Status: **verified and complete** on 2026-07-16.

## Result

- Scratch module: `s05t0716.mod`; production module was not used for mutation.
- Area: `area001`; 64 tiles and 1 GIT object.
- Exact selected source tile: index `38`, row `4`, column `6`, model
  `tcm02_a20_04`, Tile ID `183`, orientation `2`, centre `(65,45)`.
- Positive saved delta: exactly `mainLight1 1 → 2`.
- Unrelated tile-field deltas: `0`.
- Object deltas: `0`; `objects.csv` is byte-identical.
- Rollback: `tiles.csv`, `tile-contract.csv` and `objects.csv` are byte-identical
  to the complete transaction baseline.
- Final Toolset state: responding, exact module frame enabled, no modal window,
  still open on non-primary `DISPLAY1`.

## Accepted execution boundary

`invoke-aurora-toolset-tile-properties-gui-thread-bridge.mjs` validates the
live VCL selection and invokes the exact version-pinned
`actTilePropertiesExecute` handler on the GUI thread through a short-lived
WNDPROC bridge. It handles the Tile Properties and colour dialogs atomically,
restores the original WNDPROC, and verifies zero remaining modals. It never
uses the global cursor, keyboard, mouse or synthetic focus.

The dialog exposes disabled animation-loop controls as `0`. The executor
therefore requires their expected source state as an explicit transaction
input and commits that same state before `OK`; this prevents the unrelated
normalization that invalidated the earlier negative attempt.

## Evidence

- `transaction-baseline/` — fresh packed ARE/GIT baseline of the scratch.
- `tile-properties-gui-thread-bridge-cancel.json` — non-mutating control map.
- `positive-mutation-ui.json` — exact selection, GUI-thread handler, swatch 2,
  modal cleanup and WNDPROC restoration.
- `positive-save.json` and `positive-after-save/` — persisted positive state.
- `rollback-ui.json`, `rollback-save.json` and `rollback-after-save/` — atomic
  return to swatch 1 and persisted rollback.
- `final-validation.json` — executable full-delta and rollback verdict.
- `final-no-modal-preflight.json` — clean final live Toolset state.

Earlier failure and continuation audits remain in this directory as negative
evidence. They are superseded for completion status by `final-validation.json`
but are intentionally not deleted.

## Validator verdict

`validate-aurora-toolset-tile-properties-stage5.mjs` reports `verified`, with
one positive difference:

```text
index 38 / mainLight1 / 1 -> 2
```

The rollback hashes equal the baseline hashes:

- `tiles.csv`: `5c1c79c752aa7744f8e0a42a5c955f483c2daefbaf5c8329fa168e16e2684e8c`
- `tile-contract.csv`: `a806d140d6860a12e47adbd41aadd1adf8040c81fb0fee9b59f1e4c031b8a2ea`
- `objects.csv`: `be2b8f2e0ab2a3db62e0cea1fce4dab34202aaf7c1e5acf0cd9f978fa3f414d2`
