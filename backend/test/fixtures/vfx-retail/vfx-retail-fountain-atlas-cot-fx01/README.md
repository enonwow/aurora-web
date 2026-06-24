# VFX-P12-F Retail Fixture: Fountain Atlas Cot Fx01

Fixture id: `vfx-retail-fountain-atlas-cot-fx01`

Case: `Fountain emitter plus atlas playback`

Local candidate:

- model: `backend/tmp_cot_fx01.mdl`
- SHA-256: `515F7D53F4A1D683BF7E6D38653C677E9D48B6712A3FF53795ECC611FBC1AFF5`
- emitter: `fire!03`
- family: `Fountain`
- texture: `fxpa_smoke01`
- atlas: `xgrid 4`, `ygrid 4`, `fps 10`, `framestart 0`, `frameend 24`, `random 1`

This directory is a prepared capture pack skeleton only. It is not retail
evidence and must not be used to mark the fixture `passed` or
`behaviorClaim: "canonical"`.

No retail `visualeffects.2da` row or effect context resolving to `cot_fx01` was
found in this repo context. Do not treat the local placeable/GLB preview tests
as parity evidence.

Retail operator steps:

1. First search the retail-selected `visualeffects.2da`, `progfx.2da`, module,
   HAK, and resource graph for a row/context that resolves to `cot_fx01`.
2. If a row is found, update `source-table.snapshot.json`,
   `effect-context.json`, and the manifest before capture.
3. Capture several seconds of video, not just a screenshot.
4. Record spawn rate/birthrate, lifetime, atlas frame progression,
   `random 1` behavior, UV/frame orientation, color/alpha/size timeline,
   billboard orientation, and texture/material/TXI resource lanes.
5. Fill parser, resolver, runtime, render, capture, comparison, and SHA-256
   evidence only from the retail capture pipeline.
