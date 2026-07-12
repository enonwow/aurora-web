# Aurora Toolset tile-focus calibration — 2026-07-11

Status: partial proof. Visual selection and viewport focus are demonstrated;
precise small-angle pitch control is **not** accepted.

## Corrected target source

The prior layout inspector incorrectly hard-coded three columns. It now reads
the active `enon_bakery.are` dimensions from the module:

- module: `the_last_city - codex.mod`
- grid: `Width=4`, `Height=4`, `Tile_List=16`
- candidate source tile: `index=5`, `x=1`, `y=1`, `Tile_ID=197`,
  `Tile_Orientation=1`

The source-derived top-down point was local viewport `(621,355)`. A targeted
`WM_LBUTTONDOWN`/`WM_LBUTTONUP` was sent only to the validated Aurora
`TScrollBox`; no global pointer or keyboard was used. The subsequent physical
viewport capture on the user's physical monitor 2 (`\\.\DISPLAY1`) contains a
new blue selection outline:

```text
blue pixels: 918
outline bounds: left=448, top=178, right=673, bottom=403
candidate point: (621,355), inside outline
```

The Toolset child-text surface does not expose a `Tile_ID` field after the
click, so this is visual selection evidence tied to the source-derived target,
not an unqualified semantic Toolset readback.

## Closed-loop viewport focus

Viewport center is `(645.5,403.5)`.

The blue outline itself became the measured screen anchor. Each movement was
accepted from a before/after image only after the selection anchor changed
well above baseline noise.

| Step | Measured selection center | Delta |
| --- | --- | --- |
| initial selected target | `(560.07,288.43)` | — |
| `Move camera left` | `(644.99,287.96)` | `(+84.92,-0.47)` px |
| `Move camera forward` | `(645.77,375.33)` | `(+0.78,+87.37)` px |
| pitch test then final forward correction | `(645.90,426.80)` | current offset from viewport center: `(+0.40,+23.30)` px |

Final screenshot:

`C:\Projects\aurora-web\.codex-tmp\aurora-precise-camera-20260711\tile-5-focus-after-pitch\move-forward-1783784225840-after.png`

This proves a feedback loop based on selection position, not a fixed delay:
the selected visual region is centered horizontally and within 23.3 pixels
(2.9% of viewport height) vertically.

## Pitch result and rejection

At this focused selection, the minimum tested `bPitchDown` pulse changed the
blue-outline projection from `227 x 227` to `229 x 234` pixels. A square-plane
projection estimate is `90.0° -> 78.134°`, approximately `-11.866°`.

That is not a requestable “few degrees” operation. It is recorded only to show
that the prior 65% pixel-delta claim was the wrong metric. The packet does not
promote this as precise pitch control.

## Remaining acceptance criteria

1. A source-backed Toolset selection readback must identify the selected tile
   directly, rather than only matching a visual outline to a source target.
2. Pitch must accept a requested measured delta range (for example 2–5°) and
   reject a result outside that range.
3. The final proof must show the target tile, its explicit source identity,
   its visual selection outline, focus error, and measured pitch delta in one
   packet.
