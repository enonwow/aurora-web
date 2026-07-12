# Aurora Toolset coarse camera/navigation transport proof — 2026-07-11

> This packet is **not** acceptance evidence for precise camera control or
> tile focus. It records an intentionally rejected coarse/zero-one experiment:
> large visual transitions prove that a control is connected, but not that the
> controller can request a small measured angle or center a known source tile.

## Scope and capture provenance

- One existing `nwtoolset.exe` only: PID `27740`.
- Exact module: `the_last_city - codex.mod`.
- Exact Area viewer: `enon_bakery`.
- Every PNG below was captured from `TScrollBox` viewport `hwnd=3870170`,
  bounds `(-1624,99,1291x807)`.
- `Screen.FromHandle` for the Toolset frame, Area viewer, and viewport resolved
  to `\\.\DISPLAY1`, non-primary. On this workstation that is the user's
  physical second (left) monitor. The Windows display number is never inferred
  from coordinates.
- Physical-pixel capture was allowed only after five `WindowFromPoint` probes
  resolved to descendants of the expected Aurora Area viewer. No global cursor,
  keyboard, mouse, or display-wide capture was used.

## 1. Pitch: low view to top-down view

The validated `bPitchUp` control (camera toolbar index `6`) was held for
500 ms. It changed the viewport from a nearly horizontal/low view, where only
a thin central scene strip was visible, to the complete top-down Bakery layout.

| State | Screenshot | What is visible |
| --- | --- | --- |
| Before | `C:\Projects\aurora-web\.codex-tmp\aurora-camera-proof-20260711\pitch-up\pitch-up-1783782729089-before-b.png` | Mostly neutral viewport with a black horizon band and only a narrow scene strip. |
| After | `C:\Projects\aurora-web\.codex-tmp\aurora-camera-proof-20260711\pitch-up\pitch-up-1783782729089-after.png` | Complete top-down Bakery: wood rooms, rugs, furniture, and the round north-east chamber. |

Measured image change: `170691 / 260984` samples, `changedRatio=0.654029`,
`meanRgbDelta=340.2493`.

The grid-angle solver deliberately rejected a numeric pitch here because the
before image had `greenPixels=0` (minimum is `200`). Therefore this packet
proves the visual camera transition, but **does not claim an exact degree value**.

## 2. Pan: empty viewport back to the Bakery

First, four one-shot `Move camera right` clicks were measured as inert
(`7 / 260984` changed samples) and were rejected. The control transport was
then corrected to a held button. Holding `Move camera right` moved the camera
to a genuine uniform viewport state; that state was captured only as explicitly
labelled `uniform_scene_state`, never accepted as a scene screenshot.

The inverse action was then proved:

- Target: toolbar index `0`, the confirmed `Move camera Left` control.
- Transport: targeted `WM_LBUTTONDOWN`/`WM_LBUTTONUP`, held `750 ms`.
- Targeted button bounds: `(-1614,916,25x25)`.
- Baseline noise: `0 / 260984` samples.
- Effect: `171654 / 260984` samples, `changedRatio=0.657718`,
  `meanRgbDelta=357.225`, required threshold `0.01`.

| State | Screenshot | What is visible |
| --- | --- | --- |
| Before (explicit uniform state) | `C:\Projects\aurora-web\.codex-tmp\aurora-camera-proof-20260711\move-left-recover\move-left-1783783045112-before-b.png` | Uniform grey pixels from the validated Aurora viewport; this is a camera-outside-scene state, not a scene proof. |
| After | `C:\Projects\aurora-web\.codex-tmp\aurora-camera-proof-20260711\move-left-recover\move-left-1783783045112-after.png` | `enon_bakery` is visible again, centered in the viewport with its full irregular floorplan. |

This is a successful pan proof: the exact Aurora viewport changes from an
empty camera position back to the loaded area. It is not a timer-only claim;
the output requires a textured after-image and an image delta above threshold.

## Current capability boundary

- Proven only: exact current Toolset/Area/viewport ownership on physical
  monitor 2, and that the tested controls can produce large visual state
  transitions.
- Not proven: a requested small pitch delta, a calibrated zoom delta, full yaw,
  a selected source tile, or focus of that selected tile in the viewport.
- Proven fail-closed behavior: inert clicks, uniform viewport pixels, wrong
  monitor, unsafe modal/loading state, and insufficient grid-axis data do not
  produce a success claim.
- Still not claimed from this packet: full world yaw or an exact numeric pitch
  when the colored grid-axis evidence is absent. Those values stay blocked
  rather than guessed.
