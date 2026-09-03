# Post-debt `plc_t04` placeable VFX proof v44

Status: `comparison-ready-open-parity-gaps`.

## Proof contract

- Aurora first: retail `plc_t04.mdl` supplies the static nodes, emitters, textures, controllers, and absence of light nodes.
- NWN: the saved 10-second oracle MP4 was reused without launching or recapturing NWN.
- Aurora Web: one fresh deterministic 10.00-second, 8 fps, 80-frame capture.
- Lifecycle: three persistent source-area placeables; no repeated fire-and-forget trigger and no overlap.

## Runtime result at t=5 s

- Playback roots: `3`.
- Visible draw meshes: `6`.
- Visible particles: `54`.
- Source textures: `fxpa_flame00, fxpa_smoke01`.
- Source-backed point lights: `0`; fabricated Web point lights: `0`.
- Runtime exceptions: `0`.

## Comparison

- Side-by-side MP4: `nwn-vs-aurora-web-plc_t04-retail-20260716-pixel-aligned-v3.mp4` in the broad comparison directory.
- Open gap: Web flame luminance and plume silhouette remain weaker and narrower than NWN.
- Open gap: camera and scene context differ; canonical pixel parity is not promoted.
