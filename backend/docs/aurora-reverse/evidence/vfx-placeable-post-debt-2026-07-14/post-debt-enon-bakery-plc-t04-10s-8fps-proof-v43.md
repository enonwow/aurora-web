# Post-debt `plc_t04` placeable VFX proof v43

Status: `matched-with-gaps`. Canonical parity is not promoted.

## Proof contract

- Aurora first: retail `plc_t04.mdl` supplies the static nodes, emitters, textures, animation gates, and source-backed absence of light nodes.
- NWN: the existing 10.00 s / 8 fps oracle MP4 was reused without launching or recapturing NWN.
- aurora-web: fresh deterministic 10.00 s / 8 fps / 80-frame capture after the binary-controller timing fix.
- Lifecycle: three persistent source-area placeables, not repeated fire-and-forget triggers; no overlapping playback.

## Current web result

- Three full static placeable bases are visible with six emitter meshes at `t=5 s`.
- Runtime state at `t=5 s`: `48` particles and textures `fxpa_flame00`, `fxpa_smoke01`.
- Source-MDL lights: `0`; aurora-web point lights: `0`. No light was fabricated.
- All captured requests finished with HTTP 200; runtime exceptions: `0`.
- The deterministic MP4 is byte-identical to v42 because the controller correction does not alter this fixture. The new capture timestamp, frame state, network trace, timeline, and comparison manifest establish the fresh v43 run.

## Artifacts

- Reused NWN MP4 SHA-256: `1599BD2D42A4F9DFD1A3806332B5939EF4CEDB6CB5700572298D254BF65F27C8`.
- Fresh aurora-web MP4 SHA-256: `28443AE99B9A7CDC32671859F43DB7CEBAF7B4DA4A8A96391AA16CA1CB961096`.
- Comparison: `post-debt-nwn-vs-aurora-web-t5-proof-v43.png`.
- Machine-readable comparison: `post-debt-nwn-vs-aurora-web-t5-proof-v43.json`.
- Runtime timeline: `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v43.timeline.json`.

## Open parity gaps

- aurora-web flame luminance and plume silhouette remain weaker and narrower than NWN.
- The isolation backdrop does not reproduce the full bakery context.
- Camera/context parity is not proven; the NWN crop shows two of the three source placeables.

This packet proves the current full placeable composition and synchronized lifecycle. It does not claim retail visual parity.
