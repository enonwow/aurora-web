# Aurora Toolset Area Camera Standard

Status: coarse transport evidence only; precise camera and tile-focus control
remain unproven.

This document is deliberately split into two levels. The low-level Toolset
transport can now be proven from viewport images. A public `degrees` / absolute
pitch API is still blocked, because the Toolset exposes no readable yaw, pitch,
or distance state in the current reverse-engineering export. A pressed button
or a held duration is therefore never reported as an angle.

## Verified target

- Module: exact title suffix `the_last_city - codex.mod`
- Area: exact normalized viewer title `enon_bakery`
- Toolset processes: exactly one
- Display: the user's physical second monitor, resolved by
  `Screen.FromHandle` as non-primary `\\.\DISPLAY1` on this workstation.
  A coordinate sign or Windows display number alone is not accepted.
- Live proof process: PID `27740`
- Viewport discovered in the verification run: `TScrollBox`,
  `left=-1624 top=99 width=1291 height=807`

Window handles and screen coordinates are evidence from one run, not input to
future runs. The controller discovers the Area viewer, viewport, and 13-button
toolbar again before every command.

## Proven low-level transports

| Command | Toolbar index | Interaction | Proof state |
| --- | ---: | --- | --- |
| `move-left` | 0 | hold | coarse transport only: validated uniform state → textured `enon_bakery` |
| `move-right` | 1 | hold | coarse transport only: left the scene; no tile-focus semantics |
| `move-forward` | 2 | hold | one-shot click was visually inert; hold awaits image-proof run |
| `move-back` | 3 | hold | one-shot click was visually inert; hold awaits image-proof run |
| `rotate-clockwise` | 4 | held press | proven by image diff |
| `rotate-counterclockwise` | 5 | held press | proven by image diff |
| `pitch-up` | 6 | held press | boundary must be detected, not assumed |
| `pitch-down` | 7 | held press | proven by image diff |
| `zoom-in` | 8 | held press | proven by image diff |
| `zoom-out` | 9 | held press | proven by image diff |

Toolbar indices 10, 11, and 12 rotate selected objects/placeables. They are
forbidden in the camera command lane.

## Fail-closed rules

The controller sends no interaction unless all of these checks pass:

1. Exactly one `nwtoolset.exe` process exists.
2. A visible Toolset window ends with the exact requested module name.
3. `Screen.FromHandle` resolves the module window to the approved physical
   proof monitor `\\.\DISPLAY1`.
4. Exactly one `TfrmViewerArea` has the exact normalized requested Area name.
5. The Area contains one large viewport and exactly 13 ordered toolbar buttons.
6. The requested mapping is a camera index from 0 through 9.
7. No AV, recovery dialog, `List index out of bounds`, or inventory-loading
   state is visible.

The critical-state scan is repeated after the command. The controller also
captures two unchanged viewport frames and an after frame. It returns success
only when the action's pixel change is at least 1%, and at least five times the
observed baseline noise. Any failed condition returns a non-zero result. There
is no fallback to a different module, Area, window, monitor, or button.

For rotation, pitch, and zoom, image difference is no longer enough. The
controller runs the visual grid solver on the pre-command and post-command
frames, then requires a corresponding measured value:

| Command class | Required visual result |
| --- | --- |
| rotation | non-zero `yawDeltaModulo90Degrees` |
| pitch | `pitchDeltaDegrees` of at least 0.5 |
| zoom | `zoomRatio` differing by at least 1% |

The returned angle is a measured image-space delta, not a duration converted to
degrees. Translation remains image-proofed only until source-anchor tracking is
implemented. Absolute world yaw remains blocked pending a directed anchor.

## Input isolation

All actions are targeted Win32 messages sent to the validated Area `TBitBtn`.
The controller does not move the global cursor, send global keyboard input, or
send global mouse input. The hold is a private transport detail used only in a
calibration/proof run. It is not the public unit of a camera operation.

## Operator command

```powershell
node backend\scripts\control-aurora-toolset-viewport-camera.mjs `
  --command rotate-clockwise `
  --module "the_last_city - codex.mod" `
  --area enon_bakery `
  --holdMs 700 `
  --proofDir backend\docs\aurora-reverse\artifacts\toolset-camera-20260711\example
```

`--proofDir` is mandatory. `--holdMs` is accepted only by the current
low-level transport and is not a valid camera-angle API. The next semantic
layer may expose `yawDegrees`, `pitchDegrees`, or a zoom factor only after it
can derive and verify those quantities from a real camera-state readout or a
calibrated visual metric.

## Evidence and corrected findings

The former claim that all ten commands passed is withdrawn: it only proved that
messages were sent. The prior toolbar-click zoom and `pitch-up` at the upper
boundary had no visual proof.

The current coarse-transport packet is
[`aurora-toolset-camera-navigation-proof-2026-07-11.md`](aurora-toolset-camera-navigation-proof-2026-07-11.md).
It records a `bPitchUp` extreme transition and pan/recovery packet, including
monitor provenance and the intentional handling of a uniform viewport state.
It must not be cited as a small-angle, selected-tile, or tile-focus proof.

The new proof run used the same `1291 x 807` viewport and `260984` sampled
pixels. Two static captures had zero changed samples in the first baseline;
the mandatory-controller rotation baseline later measured only `0.0054%`.

| Transport | Changed samples | Changed ratio | Result |
| --- | ---: | ---: | --- |
| wheel to `TScrollBox` | 0 | 0% | rejected: no effect |
| held `zoom-in` | 254285 | 97.4332% | proven |
| held `pitch-down` | 231514 | 88.7081% | proven |
| held clockwise rotation | 211624 | 81.0870% | proven |
| proof-gated counter-clockwise rotation | 87537 | 33.5411% | proven |

The durable counter-clockwise proof has a noise ratio of `0.0054%`, an effect
ratio of `33.5411%`, and a required threshold of `1%`:
`backend/docs/aurora-reverse/artifacts/toolset-camera-20260711/proof-required-rotation/`.

## Semantic-angle promotion gate

Do not add public `degrees` parameters until one of these is true:

1. A read-only `CAurCamera` state probe returns yaw, pitch, and distance; or
2. A deterministic, tested visual calibration derives each requested quantity
   and verifies the target within a stated tolerance.

Until then, a request such as `rotate 15 degrees` must stop with
`camera_angle_readback_unavailable`, not translate a degree into milliseconds.

Machine-readable proof summary:
`backend/docs/aurora-reverse/artifacts/toolset-camera-20260711/proof-required-result.json`.
