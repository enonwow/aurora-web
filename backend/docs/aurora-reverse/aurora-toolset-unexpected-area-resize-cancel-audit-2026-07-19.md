# Unexpected Area Resize modal: cancellation contract

Date: 2026-07-19

## Observed incident

During the central Meshy M0 saved-module HAK route, a failed owner-drawn Edit
menu transport left an unexpected `TfrmAreaResize` / `Resize Area` modal in the
single live Toolset process. The saved module was loaded, the frame was
disabled, and the HAK route had not opened Module Properties or changed the HAK
list. The modal is therefore an independent safety lane: no HAK or palette
action may proceed while it exists.

The read-only native observation recorded exactly one responsive Toolset PID,
one exact loaded module frame, one `TfrmAreaResize`, two blank enabled `TEdit`
controls, one enabled preset `TListBox`, enabled `OK` and `Cancel`, and the
unselected list `Tiny`, `Small`, `Medium`, `Large`.

## Aurora evidence

The binary DFM audit at
`evidence/stage5-live-2026-07-16/s05-06-area-resize/modal-result-root-cause-audit.md`
establishes for `TFRMAREARESIZE` that:

- `bOk` has `ModalResult = 1`;
- `bCancel` has `ModalResult = 2`;
- the resize loops run only when `ShowModal` returns `1`.

Therefore a validated native `Cancel` is the only recovery action authorized
for an unexpected, untouched resize modal. It is not equivalent to `OK`, does
not select a preset, and does not execute the resize loops. The positive resize
transport remains fail-closed and is not reused here.

## Central recovery contract

`bootstrap-reconcile-unexpected-area-resize-cancel` is a one-use public
continuation of the vertical-slice manager. It is authorized only from the
exact saved-but-unattached M0 history ending in
`module_properties_edit_popup_missing`, before the popup-observation lane has
made a new menu request.

Before it posts anything, it requires the exact modal, no other modal, the
unselected four-item preset list, two blank dimension edits, the loaded module
frame, and the single responsive Toolset PID. It posts only `BM_CLICK` to the
freshly resolved `Cancel` control using `PostMessage`, then requires modal
disappearance and the restored exact module frame.

It then reads the persisted ARE and GIT. The recovery is accepted only when the
saved area remains the complete Tiny `2 x 2` / four-tile area and the saved GIT
still has no fixture before the HAK and creature stages. Any missing readback,
extra modal, changed topology, changed fixture state, or unreadable saved
resource fails closed and leaves the HAK lane unauthorized.

The route is recovery only. It makes no Toolset visual-proof, runtime, HAK, or
module-completion claim.

## Post-cancel parser reconciliation

The first live cancellation completed its targeted `Cancel` and the modal
disappeared, but the subsequent central GIT reader incorrectly treated
`parseAreaObjectsFromGitGff` as an array. Its real contract is a
`ParsedAreaObjectBlueprint` containing a `creatures` array. This is a parser
defect after cancellation, not evidence of an Area delta.

The reader now accepts the documented blueprint shape and retains compatibility
with a legacy placement-array shape. Any other shape fails closed. The one-use
`bootstrap-reconcile-unexpected-area-resize-postcheck` continuation is limited
to the exact durable `objects.filter is not a function` failure after the
Cancel route. It requires the clean loaded module frame and no modal, performs
only ARE/GIT reads, and then records the cancellation packet. It never posts a
UI message, reopens the dialog, repeats the menu transport, or authorizes HAK
work.
