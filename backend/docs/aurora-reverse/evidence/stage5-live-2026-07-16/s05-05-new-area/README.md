# AUR-S05-05 — new Area wizard live proof

Status: **VERIFIED** on the isolated scratch module `s05t0716.mod`. The production
module was not touched and the Toolset remained open.

## Accepted transaction

- Exact native route: `Wizards`, item position `0`, command `133`, dialog class
  `TdlgAreaWizard`.
- Exact choices: tileset `MicroSet` (list index `21`) and size `Tiny` (list index
  `0`), followed by `Finish`.
- Packed source readback after Save: new resref `area002`, name `Area 001`, tag
  `Area001`, tileset `tms01`, dimensions `2x2`, four tiles, present ARE/GIT/GIC,
  zero GIT objects, and a fourth `module.ifo` Area entry.
- Rollback: select the exact tree node `Area 001`, post targeted `VK_DELETE`,
  atomically accept both PID-scoped native prompts (`Confirmation` then
  `Warning`) through their exact localized `&Tak` buttons, Save, and re-read the
  packed module.
- Final packed state: exactly the original resrefs `area`, `area001`, `demo`;
  `area002` and `Area 001` are absent. Final preflight reports only the enabled
  Toolset frame and `TApplication` on non-primary `DISPLAY1`.

## Negative route found and corrected

The first delete implementation used synchronous `SendMessage(VK_DELETE)`.
Aurora blocked that call while showing its confirmation, so the same executor
could not handle the modal. Recovery evidence records both exact prompts and
targeted `BM_CLICK` messages. The accepted helper now uses nonblocking
`PostMessage` for Delete and for both confirmations. The clean atomic rerun is
recorded in `atomic-rerun-delete.json`.

## Machine gate

Run:

`node backend/scripts/validate-aurora-toolset-stage5-new-area.mjs --evidenceDir backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-05-new-area --out backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-05-new-area/validation.json`

The gate requires exact wizard identity and choices, exact packed resources,
both delete confirmations, exact rollback resrefs, no global input, and a clean
final PID-scoped preflight.
