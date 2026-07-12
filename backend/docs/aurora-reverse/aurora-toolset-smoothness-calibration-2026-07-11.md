# Aurora Toolset camera smoothness calibration — 2026-07-11

Status: **repeatable, reversible discrete pan is proven; smooth sub-step pan is
not proven and must not be claimed.**

## Exact live target and input isolation

- Toolset process: one `nwtoolset.exe`, PID `27740`.
- Module: exact title suffix `the_last_city - codex.mod`.
- Area viewer: exact title `enon_bakery`.
- Viewport: `TScrollBox`, `1291 x 807`, handle `3870170` in this run.
- Monitor: the user's physical second monitor, resolved from the loaded module
  window by `Screen.FromHandle` as non-primary `\\.\DISPLAY1`.
- Interaction: targeted `WM_MOUSEMOVE`, `WM_LBUTTONDOWN`, `WM_LBUTTONUP` only
  to the validated `TBitBtn` camera controls. No global cursor, global mouse,
  global keyboard, new Toolset process, module save, or display-wide capture.

`TScrollBox` has no visible child HWND in this run. Therefore there was no
invented hidden-canvas target to send a finer input to.

## Evidence packet: right then exact return

The selected visual anchor is the blue selection outline. It has no direct
Toolset semantic readback in this run: it is a visual anchor tied to the
source-derived `enon_bakery` candidate tile, not a claim that Toolset exposed
`Tile_ID` text.

| State | Screenshot | SHA-256 | Anchor centre (viewport-local) |
| --- | --- | --- | --- |
| initial | `.codex-tmp/aurora-smooth-camera-20260711/tile-5-micro-right-1ms/move-right-1783786440780-before-a.png` | `6255615EBD4B13FCC350B0D095F0FCBCEB9BBC4056CD9B92A0F8EAD82F228F3B` | `(645.901, 426.797)` |
| one minimum `move-right` pulse | `.codex-tmp/aurora-smooth-camera-20260711/tile-5-micro-right-1ms/move-right-1783786440780-after.png` | `B4DAF60EFCF59287E3F44DC9C13F13D4AEEFAAF4852237E4837DBA4815BEA712` | `(588.128, 427.109)` |
| one minimum `move-left` return pulse | `.codex-tmp/aurora-smooth-camera-20260711/tile-5-micro-left-1ms-return/move-left-1783786468181-after.png` | `CAB501ADC86007E22DBBF55D9AA6D7838513261656F1584F46484DB75DDD7E08` | `(645.901, 426.797)` |

Measured vectors:

```text
move-right: (-57.773, +0.312) px, distance 57.774 px
move-left:  (+57.773, -0.312) px, distance 57.774 px
right then left final anchor minus initial: (0, 0) px
```

The controller captured two static pre-frames on every command. The measured
baseline anchor movement was zero. The minimum visible movement was therefore
well above capture noise, not inferred from button state.

The complete framebuffer return was independently checked between the initial
and final screenshots:

```json
{
  "sampleCount": 260984,
  "changedSamples": 6,
  "changedRatio": 0.000023,
  "meanRgbDelta": 0.0305,
  "maxRgbDelta": 40
}
```

That is normal capture noise (0.0023% sampled pixels), so the test demonstrates
a reversible viewport state rather than merely a returned outline.

## What was disproved

The current native transport is quantized. Reducing the target-button hold to
`1 ms` did **not** produce a one-pixel movement: it produced a 57.774-pixel
horizontal movement. A forward/back minimum pulse was likewise measured at
54.314 px. Thus the toolbar is suitable for measured coarse positioning and
inverse correction, but not for a requested few-pixel move.

Two apparent precision paths were tested and rejected for the current Area:

| Path | Measured effect | Result |
| --- | ---: | --- |
| targeted `WM_MOUSEWHEEL` to the validated viewport | 0 of 260984 sampled pixels | no-op |
| native vertical scrollbar position `0 -> 1` | 0.000038 changed ratio | no usable scene motion |

No unproven viewport drag was sent. In Area selection/edit modes a guessed
drag can affect tiles or placeables, so it is not an acceptable substitute for
camera control.

## Current capability boundary

Proven now:

1. capture and analyse the real `enon_bakery` viewport on the correct physical
   monitor;
2. detect a persistent selected visual region;
3. measure pan direction and magnitude from images;
4. issue an opposite targeted command and verify that the entire viewport has
   returned to baseline.

Still blocked:

1. a continuously adjustable or sub-57-pixel pan transport;
2. a source-backed Toolset readback naming the selected tile;
3. read-only yaw, pitch, and camera-distance state;
4. a valid small-angle camera API.

The next implementation step is to identify a documented read-only camera
state or a source-verified non-mutating viewport gesture. Until that is
proven, a request such as “move 5 px” or “pitch 3 degrees” must fail closed
instead of being translated into a duration.

## Read-only camera-state audit

The local decompilation export was searched for `CAurCamera`, yaw, pitch,
distance, and zoom accessors. It exposes `TAuroraPanel.SetCamera(CAurCamera*)`
but no named `CAurCamera` reader such as `GetYaw`, `GetPitch`, or
`GetDistance`. The available decompiled `SetCamera` body is an
`AuroraPanelError` path (“Application tried to reset Aurora...”), not a
callable camera-query API.

This does not prove that no camera state exists in process memory. It does
prove that the current export gives no safe address or field contract for a
read-only state probe. Reading arbitrary process memory or guessing viewport
drag semantics would violate the proof standard and can destabilise Toolset,
so neither was attempted.
