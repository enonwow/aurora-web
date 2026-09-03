# Post-debt `plc_t04` placeable VFX proof v42

## Verdict

- Status: `matched-with-gaps`.
- This is the current accepted Aurora Web proof in this evidence directory after the source-backed Lighten blend-wrapper implementation.
- `v41` and earlier captures are historical evidence only and must not be cited as the current renderer result.
- `canonicalParityPromoted=false` remains required.

## Fixture

- Fixture id: `placeable-tm_pl_lightred-plc_t04-enon_bakery-v42`.
- Lifecycle: persistent placeable, not fire-and-forget.
- Source area: `area_enon_bakery` / `enon_bakery`.
- Placeable: `tm_pl_lightred`, appearance `332`, model `plc_t04`.
- Declared instances: exactly three source area placeables, loaded once.
- Static source nodes: `Rectangle121`, `Plane25`.
- Emitter nodes: `OmenEmitter240` with `fxpa_flame00`; `fire!02` with `fxpa_smoke01`.
- Source-MDL lights: `0`. Aurora Web point lights: `0`. This is expected source absence, not an omitted implementation.
- Source payload snapshot SHA-256: `398F59BC2AE3718EB8A05030BEC577040C2A5D955133EE011E830BD517039486`.

## Timing and activation

- The saved NWN oracle MP4 was reused. NWN was not launched or recaptured for v42.
- NWN oracle: 10.00 s, 8 fps, 80 frames.
- Aurora Web: 10.00 s, 8 fps, 80 frames, deterministic capture from `t=0.000` through `t=9.875`.
- The three persistent placeables are the declared fixture, not repeated triggers of one effect.
- At `t=0`, all three static placeable bases are visible and emitter output is `0` draw meshes / `0` particles.
- At `t=1`, the three roots render `6` emitter draw meshes and `24` particles.
- From `t=2` through `t=9.875`, the three roots render `6` emitter draw meshes and `48` particles.
- Canonical runtime duration is exactly `10` seconds with `41` simulation frames per root.

## Artifacts

- Reused NWN MP4: `../../artifacts/source-mdl-emitter-oracle/retail-source-mdl-emitter-plc-t04-ovens-removed.mp4`
  - SHA-256: `1599BD2D42A4F9DFD1A3806332B5939EF4CEDB6CB5700572298D254BF65F27C8`.
- Fresh Aurora Web MP4: `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v42.mp4`
  - SHA-256: `28443AE99B9A7CDC32671859F43DB7CEBAF7B4DA4A8A96391AA16CA1CB961096`.
- Fresh Aurora Web `t=5` PNG: `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v42.png`
  - SHA-256: `48F06C99A9C9E79AD0842A70F1239995AC77852DE0B797B5786210404C5B1F5A`.
- Fresh runtime/capture frame: `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v42.frame.json`
  - SHA-256: `E696DEF61B4C7DC533080DAD4FA0405F8060DD9A066D64A32830222784530E9C`.
- Fresh labeled side-by-side `t=5`: `post-debt-nwn-vs-aurora-web-t5-proof-v42.png`
  - Left: reused NWN oracle frame. Right: fresh Aurora Web v42 frame.
  - SHA-256: `18F43CA7AEE7275C9A40EF72E80F72809A6EF3179A2620C4CDA61B92127CFE2F`.
- Fresh lifecycle contact sheet: `frames/v42/post-debt-v42-contact-sheet.png` (`t=0`, `1`, `5`, `9.875`).
  - SHA-256: `EDFA7DF375EB1FC72F6567AA7D33B90A1A096A6C649CB2887A3449B0A28CC93C`.
- Aurora Web timeline: `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v42.timeline.json`.

## Confirmed matches

- Actual `tm_pl_lightred` / `plc_t04`, not an emitter-only proxy.
- Full spiky static base remains visible beneath each emitter.
- Three distinct source area transforms survive into world space.
- Flame and smoke use both source texture references.
- Source-backed Lighten uses `GL_SRC_ALPHA` / `GL_ONE` in the current renderer implementation.
- No source light is fabricated.
- All 11 captured network resources completed with HTTP `200`; runtime exceptions: `0`.

## Remaining gaps

- The full NWN bakery context is not reproduced. Aurora Web uses `renderTerrain=false` and a declared `warm-dark` isolation backdrop.
- Camera/context parity is not proven. NWN shows two of the three declared placeables in the saved crop; Aurora Web deliberately shows all three.
- Aurora Web flame luminance and plume silhouette remain visibly weaker and narrower than the NWN oracle at matched `t=5`.
- This packet proves the current placeable composition and lifecycle only; it does not replace missing valid retail packets for other VFX families.

These gaps prevent `canonical-allowed`. The packet is valid as a current post-debt placeable object/lifecycle comparison with named visual differences.
