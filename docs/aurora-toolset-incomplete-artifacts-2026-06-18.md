# Aurora Toolset incomplete artifacts - 2026-06-18

Scope: cleanup notes for incomplete live-pilot artifact folders only. This file
does not launch Aurora, touch the Toolset window, use global mouse, or use
SendKeys. It also does not reclassify the complete
`ORCH-006-orchestrator` passive inventory packet.

## Incomplete folders

| Item | Folder | Observed contents | Why this is not evidence |
| --- | --- | --- | --- |
| ORCH-005 | `.codex-tmp/aurora-live-evidence/orch-005-old-file-format-child-button-cleanup-20260618-235841` | Empty directory. No screenshots, no `summary.json`, no window dump, no action result. | It is only a timestamped attempt shell. It cannot prove a Toolset state, a blocker, a sent command, or a cleanup result. Do not cite it as Aurora-derived evidence. |
| ORCH-006 live-pilot | `.codex-tmp/aurora-live-evidence/orch-006-old-file-format-child-inventory-20260619-000115` | `summary.json` only. It records `modalPresent=null`, `childCount=null`, `responding=null`, and a blocker saying the atom was interrupted after the live-lock limit; the prior passive inventory script failed before screenshot/inventory because of a PowerShell uint literal error in the EnumWindows callback. | The file is useful as a blocker record only. It has no screenshot, no child inventory, no modal observation, and no responsive Toolset state. Do not promote it as ORCH-006 evidence. |

## Do not confuse with complete ORCH-006 inventory

`ORCH-006-orchestrator` is a different folder:

`.codex-tmp/aurora-live-evidence/orch-006-orchestrator-old-file-format-child-inventory-20260619-000223-511`

That packet has `summary.json` plus `01-old-file-format-modal.png`. It is valid
only as passive modal/child-window inventory evidence: `modalPresent=true`,
`responding=true`, and the `Old File Format` modal has a visible `Button` child
with text `OK` and `id=2`. It does not prove modal cleanup, but it is complete
for the narrow passive-inventory claim.

## Fail-fast rule for future live pilots

A future live-pilot must fail fast before any Toolset action if preflight cannot
produce a safe target, readable screenshot path, lock ownership, and an
unambiguous atom-specific method.

When fail-fast triggers, create the evidence directory and write `summary.json`
immediately with:

- `result`: a `blocked-*` code, never `success` or `partial`.
- `blocker`: one precise sentence naming the missing precondition or failed
  script step.
- `attemptedInput`: `false` unless a targeted input/control message was already
  sent.
- `responding`, `modalPresent`, and other state fields set to the observed value
  only when actually observed; otherwise `null`.
- `evidenceFiles`: a list of screenshots/window dumps actually written, or an
  empty list.
- `endedAt`: timestamp of the abort.

If a script fails before screenshot or window inventory, the blocker must name
the script failure and the missing evidence class, for example:
`blocked-preflight-script-error-before-window-inventory`. Empty folders are not
acceptable final artifacts; a no-evidence abort must still leave a blocker
`summary.json`.
