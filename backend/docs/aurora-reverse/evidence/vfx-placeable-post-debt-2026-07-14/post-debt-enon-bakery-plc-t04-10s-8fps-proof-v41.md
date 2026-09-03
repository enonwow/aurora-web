# Post-debt `plc_t04` placeable VFX proof v41

## Verdict

- Status: `matched-with-gaps`.
- This is the only accepted Aurora Web proof in this evidence directory after the final spawn-rectangle and area-model-scale debt fixes.
- Files `v2` through `v40`, and unversioned captures created before `v41`, are diagnostic history only. They are not proof and must not be cited as the current result.
- `canonicalParityPromoted=false` remains required.

## Fixture

- Fixture id: `placeable-tm_pl_lightred-plc_t04-enon_bakery-v41`.
- Lifecycle: persistent placeable, not fire-and-forget.
- Source area: `area_enon_bakery` / `enon_bakery`.
- Placeable: `tm_pl_lightred`, appearance `332`, model `plc_t04`.
- Declared area instances: exactly three, loaded once from the area process result:
  - `(25.57, 25.20, 0.50)` NWN -> `(2.557, 2.520, 0.050)` Aurora Web;
  - `(27.52, 23.47, 0.50)` NWN -> `(2.752, 2.347, 0.050)` Aurora Web;
  - `(23.59, 27.18, 0.50)` NWN -> `(2.359, 2.718, 0.050)` Aurora Web.
- Static source nodes: `Rectangle121`, `Plane25`.
- Emitter nodes: `OmenEmitter240` with `fxpa_flame00`; `fire!02` with `fxpa_smoke01`.
- Source-MDL lights: `0`. Aurora Web point lights: `0`. This is expected source absence, not an omitted implementation.
- Source payload snapshot SHA-256: `398F59BC2AE3718EB8A05030BEC577040C2A5D955133EE011E830BD517039486`.

## Timing and activation

- The saved NWN oracle was reused. NWN was not launched or recaptured for v41.
- NWN oracle: 10.00 s, 8 fps, 80 frames.
- Aurora Web: 10.00 s, 8 fps, 80 frames, deterministic capture from `t=0.000` through `t=9.875`.
- The three persistent placeables are the declared fixture, not repeated triggers of one effect.
- At `t=0`, all three roots are present and only the static placeable geometry is visible: `0` draw meshes and `0` particles from the emitters.
- At `t=1`, the three roots render `6` emitter draw meshes and `24` particles.
- From `t=2` through `t=9.875`, the three roots render `6` emitter draw meshes and `48` particles with `fxpa_flame00` and `fxpa_smoke01`.
- Canonical runtime duration is exactly `10` seconds with `41` simulation frames per root.

## Artifacts

- Reused NWN MP4: `../../artifacts/source-mdl-emitter-oracle/retail-source-mdl-emitter-plc-t04-ovens-removed.mp4`
  - SHA-256: `1599BD2D42A4F9DFD1A3806332B5939EF4CEDB6CB5700572298D254BF65F27C8`.
- Fresh Aurora Web MP4: `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v41.mp4`
  - SHA-256: `3D9623292A0CA4DDC1000161FD0DD0A42D9ED8CAACC8FE4AD881E3D2A5E696E2`.
- Fresh Aurora Web `t=5` PNG: `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v41.png`
  - SHA-256: `72A85D9788133062F0B95B0359F97B191DF22016FBA23E50B0DEF20F1E248C84`.
- Fresh runtime/capture frame: `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v41.frame.json`
  - SHA-256: `0A8715BF5C22DD8718B9D2427AF17E867B7CB5B25F770273EB7E2ACCC9D73AD6`.
- Fresh side-by-side `t=5`: `post-debt-nwn-vs-aurora-web-t5-proof-v41.png`
  - Left: reused NWN oracle frame. Right: fresh Aurora Web v41 frame.
  - SHA-256: `EC4114EB4133780C3DA9E7EAEB49F76EEBE3C652D6962657F7DDB510FBFBDEB8`.
- Fresh lifecycle contact sheet: `frames/v41/post-debt-v41-contact-sheet.png` (`t=0`, `1`, `5`, `9.875`).
- Aurora Web timeline: `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v41.timeline.json`.

## Confirmed matches

- Actual `tm_pl_lightred` / `plc_t04`, not an emitter-only proxy.
- Full spiky static base remains visible under the emitter output.
- Three distinct source area transforms survive into world space.
- Flame and smoke use the two source texture references.
- Spawn rectangle is active; particles no longer collapse into one white overdraw column.
- Area-path canonical source-MDL particles use the same `0.1` authored-model-to-area scale as the owning placeable model.
- No source light is fabricated.
- All 11 captured network resources completed with HTTP `200`; runtime exceptions: `0`.

## Remaining gaps

- The full NWN bakery context is not reproduced in this packet. Aurora Web uses `renderTerrain=false` and a declared `warm-dark` isolation backdrop.
- The real area terrain path is independently blocked by missing tile GLB/material contracts: `blocked_tile_model_geometry_loader_missing`, `tile_glb_contract_missing`, and `tile_material_texture_contract_missing`.
- Camera/context parity is therefore not proven. NWN shows two of the three declared placeables in the saved crop; Aurora Web deliberately shows all three.
- Aurora Web flame luminance and plume silhouette remain visibly weaker/narrower than the NWN oracle at matched `t=5`.
- Blend-wrapper parity for the source Lighten lane is not promoted beyond the currently recovered source evidence.

These gaps prevent `canonical-allowed`. The packet is valid only as a fresh post-debt object/lifecycle comparison with named context and visual differences.
