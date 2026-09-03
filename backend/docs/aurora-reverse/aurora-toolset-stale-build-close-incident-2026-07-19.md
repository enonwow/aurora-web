# Stale Build Session Close Incident — 2026-07-19

## Scope

The explicitly authorized PID-bound close route was exercised for the single
stalled Toolset process `13584`. It did not terminate the process.

## Evidence

The target was initially the exact route contract: one responsive `nwtoolset`
PID, `TdlgVerifyModule / Build Module`, and the dirty frame
`m2a_vs_m0.mod*`. The first targeted `WM_CLOSE` reached Aurora and opened a
native `#32770 / Confirmation` modal. A diagnostic defect then invoked the
subordinate close atom once more while attempting to retrieve its output. That
second post did not force-close the process but created a second identical
confirmation.

The read-only observer records two confirmations. Each has the exact text:

`Would you like to save your changes to the module?`

and three enabled buttons: `&Tak`, `&Nie`, `Anuluj`.

## Corrective standard

1. The public stale-close route now refuses before posting another `WM_CLOSE`
   when any `#32770 / Confirmation` is already visible.
2. The subordinate close atom's JSON failure output is preserved by the public
   wrapper rather than converted to a generic child-process exception.
3. `observe-aurora-toolset-stale-build-close-confirmations.mjs` is the only
   authorized next action. It is read-only and enumerates every matching
   confirmation and its controls.
4. No `Tak`, `Nie`, or `Anuluj` action is authorized by the previous close
   request. The owner must expressly decide whether to save, discard, or cancel
   after seeing the exact native confirmation text.

No force termination, global input, build acknowledgement, save, discard, or
confirmation click was performed by this correction.
