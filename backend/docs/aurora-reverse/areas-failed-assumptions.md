# Aurora Areas Failed Assumptions

This file records assumptions disproven by source data, runtime behavior, or visible output.

Rules:

- Keep entries short and evidence-linked.
- Do not delete older failures; append newer corrections.
- Do not promote local preview evidence to canonical Aurora parity.

## Entries

- 2026-06-17T09:33:25.9940984+02:00 - Failed assumption: complete Aurora tile model geometry loading is required before showing any source-backed terrain. Correction: a local source-backed bridge can visibly render ARE TileList and SET model metadata while clearly disclosing that retail/model geometry parity remains pending.
- 2026-06-17T09:49:15.9619351+02:00 - Failed assumption: asymmetric bridge geometry and color alone are enough to make tile source identity readable. Correction: sampled source labels are also needed so real tileId, modelResRef, orientation, and height are visible without inspecting debug internals.
- 2026-06-17T10:10:48.8037642+02:00 - Failed assumption: area list rows can truthfully show tile/model readiness. Correction: `AreaApiListItem` does not carry tile instances, so Terrain Readiness is shown after fetching selected area detail from real `AreaApiDetail.tiles`.
- 2026-06-17T10:27:17.0088605+02:00 - Failed assumption: terrain readiness only needs to appear after opening an area. Correction: tile model loader readiness should also be checkable pre-open from selected detail data, with exact loader blockers and source-backed capture attributes.
- 2026-06-17T10:33:03.7467640+02:00 - Failed assumption: the POC looked better mainly because it was simpler or more placeholder-driven. Correction: inspected `C:\Projects\nwn-last-city\Areas Generator 3d` shows it had a full area scene package/export path from ARE/GIT/SET/2DA/MDL data into `scene.json`; `aurora-web` should use it as observational evidence for a real area render contract, not as code to transplant.
- 2026-06-17T10:44:46.1855191+02:00 - Failed assumption: opened-area runtime proof only needs terrain render status. Correction: after the POC analysis, the proof must expose scene-package readiness for `ARE TileList -> SET tile model -> MDL/GLB/texture availability` with exact per-area blockers.
- 2026-06-17T11:03:52.3017200+02:00 - Failed assumption: `tile_<modelResRef>` can be treated as asset availability. Correction: it is only a source-backed catalog candidate until the runtime wires and verifies tile process/cache, MDL source asset, GLB, and per-tile material texture contracts.
- 2026-06-17T11:35:33.9981437+02:00 - Failed assumption: a ready tile process and texture delivery contract proves full tile render readiness. Correction: it proves only the current backend tile processing/texture proxy path for that candidate; MDL source availability, GLB geometry loading, material parity, WOK/DWK, and retail parity remain separate blockers.
- 2026-06-17T11:55:35.1559744+02:00 - Failed assumption: tile texture delivery readiness can stand in for material readiness. Correction: Alpha008 exposes texture proxy delivery as a source-backed contract only, while material bindings, GLB geometry, browser proof, WOK/DWK, and retail parity remain explicit blockers; MDL source proof is limited to a real process object key ending in `.mdl`.
- 2026-06-17T12:14:34.2489616+02:00 - Failed assumption: `textureAtlas.objectKey` is a sufficient field name for selected-area tile source asset/render readiness. Correction: Alpha009 adds explicit `sourceAsset` and `renderAssetContract` fields so source role/origin, MDL source, GLB, material binding, and render-loader blockers are visible without overloading texture-atlas metadata.
