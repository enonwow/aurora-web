# Follow-up audit: Codex task `019f7bd1-f1fe-7ef3-ada7-cb955a27b439`

## Scope

This follow-up covers activity after
`codex-thread-audit-019f7bd1-2026-07-20.md`. It is based on the task transcript,
durable artifacts, and read-only visual inspection of the recorded PNG. It did
not control Toolset, NWN, windows, processes, or module content.

## What is now actually established

The Toolset visual observation has materially improved:

- `viewport-m0-visible-after-pitch-up-20260720/tscrollbox.png` exists and its
  `result.json` identifies `m2a_m0v6.mod`, Area `m2a_m0a6`, a validated physical
  `TScrollBox` rectangle on `\\.\DISPLAY1`, and no global-input method.
- Independent inspection of that PNG shows a large custom humanoid mesh with
  the M0's light-grey/green appearance. It is visibly not the native Dwarf
  Mercenary fallback.
- The task's evidence note binds the saved candidate to ordered HAK
  `m2a_m0_v6`, Appearance_Type `848`, row
  `M2A_M0_MESHY_RIGID`, resource `m2a_m0p01`, and texture `m2a_m0t01`.

Therefore the narrow statement **“M0 is visibly rendered in the Toolset
viewport” is verified**. The previously reported “missing mesh” was a bad
camera/occlusion inference, not a renderer failure.

## What remains missing

This is not yet a complete vertical-slice proof:

- The capture's `result.json` does not itself bind the fixture ID, exact
  Appearance_Type, ordered HAK hash, or exact module SHA. Those details are in
  separate historical evidence and an older bootstrap manifest. A formal proof
  packet should bind them atomically before a stage-completion claim.
- The bootstrap manifest remains `bootstrap_saved_pending_geometry` and still
  records the earlier `(10, 10, 3.2)` fixture state. Later placement claims in
  the transcript are not incorporated into that durable ledger.
- NWN runtime is `missing`. Finding an existing `nwmain` PID is not proof that
  it runs the requested module, Area, start location, HAK, or model. No runtime
  claim is justified without the dedicated AUR-S07 profile/route and fresh
  engine/load/capture evidence.

## New errors and regressions

| Finding | Why it is an error | Required correction |
| --- | --- | --- |
| Marked the goal blocked because Chrome obscured the viewport | The task asked for proof, but an obscured capture was one failed observation, not proof that the goal was blocked. The agent also asked the user to reveal the window rather than first exhausting a canonical observation route. | Record `toolset_viewport_obscured_by_foreground_window` for that attempt only. Preserve the session and continue through a verified route; never use an observation failure as the whole-goal blocker. |
| Used temporary TOPMOST/z-order manipulation to obtain the first useful image | The operating standard treats z-order manipulation as observational only. The transcript describes a temporary TOPMOST atom, while the evidence note states no z-order operation occurred. That provenance conflict weakens the first capture path. | Keep the later validated `TScrollBox` artifact, but state the exact capture method consistently. Do not use TOPMOST as an accepted-proof route unless the canonical proof contract explicitly permits it and records it. |
| Repeated the Adjust Location transport search | After text and spinner failures, the task introduced/used focus-and-type handling and other custom transitions. This is the same recovery proliferation identified in the first audit, despite an existing AUR-S02-03 standard. | One mapped AUR-S02-03 transaction only: baseline, native action, immediate readback, save, parser after-state, capture, rollback. If its precondition fails, stop the lane; do not add another field transport in the live session. |
| Treated camera framing as a series of discovery experiments | The agent spent many steps on pitch/zoom and declared intermediate no-model states that the user correctly identified as occlusion or top-down framing. | Start with the native `Focus on Object` action and one documented camera/readback sequence. Treat a frame as `missing` unless its camera and target context can actually distinguish model visibility. |
| Reintroduced a popup-helper route without an established postcondition | `Focus on Object` eventually helped, but the helper initially expected `TfrmViewerArea` as a top-level window and failed. That proves the route was not fully qualified before use. | Promote it only after an offline/rendering test and a postcondition that verifies the focused target and a settled viewer. Until then call it an experimental observation, not a reusable canonical function. |
| Runtime lane risks repeating the same proof shortcut | The active task found an existing `nwmain` and planned a read-only screen capture. Process existence or a screenshot cannot bind NWN to the M0 module. | Do not use that capture as runtime proof. First apply the AUR-S07 profile gate; if module/Area/engine binding is unavailable, report runtime `missing` and keep the current process untouched. |

## What the agent corrected well

1. It withdrew the unsupported “no mesh” and “dwarf fallback” claims after the
   user pointed out camera/tile occlusion.
2. It reopened the existing Area in the same session after the blank viewport,
   rather than opening another module or process.
3. It used `Focus on Object` for the selected creature and then produced a
   fresh `TScrollBox` artifact rather than relying on Creature Properties.
4. The final Toolset image is real evidence of the custom model, not merely a
   successful command exit or a dialog preview.

## Required continuation

Freeze Toolset mutations and shared-tool edits. First write one proof packet
that binds the visible PNG to the current module SHA, ordered HAK hash,
Appearance_Type, fixture identity, position, Area, capture method, and visual
verdict. Then enter AUR-S07 only through its declared profile. If that profile
cannot bind the currently running NWN process to this module and Area, report
the runtime point as `missing`; do not start a local launcher, click through a
different module, or infer success from a screenshot.

## Verdict

The agent has now achieved the requested Toolset visual result, but inefficiently
and with recurring workflow errors. Toolset visibility is verified; the formal
packet and NWN runtime proof are missing. The next work must be evidence
binding, not more camera movement, position experiments, or controller patches.
