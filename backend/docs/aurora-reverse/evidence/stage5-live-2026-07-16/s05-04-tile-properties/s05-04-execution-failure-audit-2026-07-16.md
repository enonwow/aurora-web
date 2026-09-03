# S05-04 execution failure audit — 2026-07-16

Status: saved audit artifact; S05-04 remains incomplete.

## Scope

This audit covers the failed Tile Properties transaction, recovery work, the
later twelve-dialog VCL incident, the reliability of the resulting evidence,
and the gap between the written Stage 5 rules and their executable
enforcement.

## Confirmed evidence

- The first saved Tile Properties transaction changed four fields at tile
  index `38`, not the intended single field: `mainLight1 0 -> 1` and
  `animLoop1/2/3 1 -> 0`. This is recorded in
  `recovery/recovery-verification-exact.json`; `objects.csv` remained equal.
- The production module was later restored semantically. The source packs
  `baseline/area001-source-pack-2026-07-16T163632742Z` and
  `recovery/restored-original-area001-semantic-exact` have identical
  `tile-contract.csv` content for all 64 rows and identical `objects.csv`.
- Twelve visible Toolset `#32770` dialogs with the message
  `Cannot focus a disabled or invisible window.` were found and closed by
  exact `nwtoolset` PID, dialog HWND, and child `OK` button HWND. The closing
  transaction reported `closedCount=12`, `remainingCount=0`, and a responding
  Toolset process.
- The final read-only modal preflight saw only the enabled `TfrmFrame` and
  `TApplication` windows on non-primary `DISPLAY1`.
- The open scratch module had no dirty marker after the incident and its file
  write time did not advance during the failed probes. Because the packed
  module remained locked by Toolset, this is not a substitute for a fresh
  complete source-pack comparison.

## Most likely twelve-dialog reconstruction — inference

The prior audit attributed all twelve dialogs to one direct `WM_SETFOCUS`.
That attribution is not proven and is probably wrong.

The observed operation count matches the dialog count exactly:

1. one targeted viewport right-click at `(733,300)`;
2. one targeted viewport right-click near the centre at `(637,395)`;
3. a brute-force scan of ten additional viewport points.

The context-menu helper checked only for a visible `#32768` menu. It did not
check for a Toolset-owned `#32770` error dialog and did not close such a dialog
when the expected popup was absent. Therefore the strongest reconstruction is
that the two individual attempts plus the ten-point scan accumulated the
twelve errors. The later `WM_SETFOCUS` was independently forbidden and was
sent while Toolset was probably already disabled by those modals, but it
cannot be identified as the sole generator of all twelve dialogs.

## What was done incorrectly

### Live UI execution

1. An unexpected `expected_one_visible_context_menu:0` result was treated as
   a targeting problem instead of a hard stop requiring a PID-scoped modal
   audit.
2. `PostMessage(...) == true` was treated as action success. It proves only
   that a message was queued, not that Toolset accepted the operation.
3. The same unsafe transport was repeated after its first unexplained failure.
4. A ten-point brute-force scan was run against live Toolset UI. Each iteration
   could add another modal and no iteration had atomic cleanup.
5. A direct `WM_SETFOCUS` was sent to an Area `TScrollBox` despite existing VCL
   focus failures and without proof that the internal active viewer state was
   safe.
6. The diagnostic following `WM_SETFOCUS` enumerated the whole desktop rather
   than first filtering by the exact Toolset PID.
7. UI opening, inspection, handling, and zero-modal verification were split
   across operations instead of one atomic executor.
8. Inline PowerShell was used to bypass helper-level guardrails, so the written
   standard was not an effective execution boundary.

### Helper defects

1. `inspect-aurora-toolset-object-context-menu-no-global-input.mjs` verifies a
   Toolset frame and viewer but, after sending right-button messages, checks
   only for `#32768`. It has no post-message `#32770` or complete Toolset-modal
   audit and no guaranteed cleanup path.
2. Popup enumeration in that helper is not filtered by Toolset PID.
3. `inspect-invoke-aurora-toolset-visible-context-menu-no-global-input.mjs`
   also enumerates `#32768` globally. It can theoretically bind another
   application's menu.
4. `preflight-aurora-toolset-no-modal-no-global-input.mjs` is a separate,
   opt-in helper. It is not called automatically by every mutating executor.
   The previous statement that the rule was already “enforced” was false.
5. No automated test or validator proves the required atomic modal lifecycle.

### Tile Properties transaction and recovery

1. A tile with disabled animation controls was used. Saving one intended light
   change normalized three unrelated animation-loop values.
2. The module was saved before a complete all-field delta was accepted.
3. A verified rollback path was not established before the positive mutation;
   native Undo was unavailable after Save.
4. Generic `File > Import` was incorrectly used as an Area recovery path.
5. `Save As` was incorrectly modeled as a common `#32770` file dialog although
   retail Toolset uses `TdlgModuleSelect`.
6. `BackupMod` was incorrectly treated as immutable. `Save As` replaced it
   with the altered state.
7. The first resource restore used already altered Area resources. Its
   `ok: true` meant that bytes were replaced, not that the baseline semantics
   were restored.

## Evidence integrity defects

- `recovery/recovery-verification-exact.json` remains a valid negative result
  showing the four-field mutation, but its filename can be misread as the
  final recovery verdict.
- `recovery/module-recovery-hashes.json` labels the altered SHA-256 as
  `restored`; it is misleading and must not be used as positive recovery
  evidence.
- `recovery/resource-restore-manifest.json` proves a mechanical replacement,
  not semantic equality.
- `repeated-focus-error-audit.md` previously stated an unproven exact cause for
  the twelve dialogs. It has been corrected to separate confirmed facts from
  the 2+10 reconstruction.
- The authoritative recovery result is the exact comparison between the
  baseline source pack and
  `recovery/restored-original-area001-semantic-exact`.

## Containment already completed

- All twelve dialogs were closed; Toolset remained open and responsive.
- The production module was restored to the complete 64-tile baseline with
  unchanged objects.
- Direct `WM_SETFOCUS` for Area/viewer children is forbidden by the Stage 5
  standard.
- `save-as-aurora-toolset-module-no-global-input.mjs` now fails before UI
  mutation until a retail `TdlgModuleSelect` implementation exists.
- A PID-scoped, read-only no-modal preflight exists and currently passes.

These measures contain the incident but do not complete S05-04 and do not yet
make the context-menu path safe.

## Ordered remediation and acceptance gates

1. Fail-close the two generic context-menu helpers for Stage 5 until they
   filter popup ownership by Toolset PID and detect all unexpected Toolset
   top-level windows after every sent message.
2. Build one atomic Tile Properties executor. It must perform preflight, one
   validated context operation, exact dialog/control readback, cancel or
   commit, owner-chain cleanup, and final zero-modal verification in one
   process invocation.
3. Prohibit retries and point scans. One unexplained absent popup or unexpected
   window ends the transaction without another UI message.
4. Require an enabled-control proof before mutation and compare every ARE tile
   field after Save. Acceptance is exactly one intended field at one exact
   source tile with unchanged objects.
5. Establish and prove rollback before the positive mutation. Final acceptance
   requires a fresh packed source pack equal to the complete scratch baseline.
6. Add automated validators that reject evidence containing stale modals,
   ambiguous popup ownership, multiple attempted viewport points, unrelated
   tile-field normalization, or missing final rollback proof.
7. Supersede or relabel the misleading recovery JSON artifacts without
   deleting the negative evidence.

S05-04 may be marked complete only after all gates above pass. It is unfinished,
not blocked.
