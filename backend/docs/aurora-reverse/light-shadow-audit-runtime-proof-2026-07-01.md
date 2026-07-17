# Light/shadow audit runtime proof - 2026-07-01

This ledger separates proven Aurora/source data from preview-only renderer behavior.
It exists because light screenshots alone can look white or ambiguous; every promoted item below needs a source row, runtime diagnostics, or an explicit blocker.

## Runtime artifacts

Placeable LightColor proof:

- `C:\Projects\aurora-web\.codex-tmp\aurora-placeable-light-runtime-proof-2026-07-01\placeable-light-proof.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-placeable-light-runtime-proof-2026-07-01\placeable-light-campfire-plc_plc_i06.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-placeable-light-runtime-proof-2026-07-01\placeable-light-candle-plc_plc_cndl01.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-placeable-light-runtime-proof-2026-07-01\placeable-light-red-flame-vfx-plc_plc_mf319.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-placeable-light-runtime-proof-2026-07-01\placeable-lightcolor-full-catalog-audit.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-placeable-light-runtime-proof-2026-07-01\placeable-lightcolor-full-row-distribution.csv`

Area/tile light proof already captured:

- `C:\Projects\aurora-web\.codex-tmp\aurora-light-shadow-runtime-proof-2026-06-30-tile-light-colors\d-sewers-tile-light-colors-visible-markers.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-light-shadow-runtime-proof-2026-06-30-tile-light-colors\d-sewers-tile-light-colors-visible-markers.png`

Area global fog/lighting runtime toggle proof:

- `C:\Projects\aurora-web\.codex-tmp\aurora-area-global-fog-shadow-proof-2026-07-01\d-sewers-fog-area-lighting-on.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-area-global-fog-shadow-proof-2026-07-01\d-sewers-fog-area-lighting-on.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-area-global-fog-shadow-proof-2026-07-01\d-sewers-fog-area-lighting-off.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-area-global-fog-shadow-proof-2026-07-01\d-sewers-fog-area-lighting-off.png`

Area global shadow source/runtime proof:

- `C:\Projects\aurora-web\.codex-tmp\aurora-area-global-shadow-proof-2026-07-01\winds-study-global-shadow-area-lighting-on.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-area-global-shadow-proof-2026-07-01\winds-study-global-shadow-area-lighting-on.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-area-global-shadow-proof-2026-07-01\winds-study-global-shadow-area-lighting-off.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-area-global-shadow-proof-2026-07-01\winds-study-global-shadow-area-lighting-off.png`

Area shadow opacity factor terrain-only proof:

- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\area-shadow-opacity-factor\winds-study-shadow-opacity-factor-terrain-only.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\area-shadow-opacity-factor\winds-study-shadow-opacity-factor-terrain-only.png`

MDL `node light` runtime proof:

- `C:\Projects\aurora-web\.codex-tmp\aurora-mdl-light-runtime-proof-2026-07-01\plc_dlp_light_08-catalog-vfx-mdl-light.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-mdl-light-runtime-proof-2026-07-01\plc_dlp_light_08-catalog-vfx-mdl-light.png`

Item/ProgFX retail resource proof:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\item-light-retail-proof-2026-07-02\item-light-retail-resource-audit.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\item-light-retail-proof-2026-07-02\fx_light_clr-mdl-light-parser-report.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\item-light-retail-proof-2026-07-02\fx_light_clr-raw-light-controller-dump.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\item-light-retail-proof-2026-07-02\fx_light_clr-animation-light-matrix.json`

ShadowSize retail MDL proof:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\shadowsize-retail-proof-2026-07-02\fx-shadow-mdl-parser-report.json`

## Source anchors

- `C:\Projects\New Folder\export\decompiled_all.c:40249-40266` loads `lightcolor.2da` and `tilecolor.2da`.
- `C:\Projects\New Folder\export\decompiled_all.c:40976-41071` reads `TOOLSETRED`, `TOOLSETGREEN`, and `TOOLSETBLUE` from `lightcolor.2da` display rows.
- `C:\Projects\New Folder\export\decompiled_all.c:255200-255224` reads ARE global lighting/fog/shadow fields.
- `C:\Projects\New Folder\export\decompiled_all.c:255400-255409` reads `Tile_MainLight1`, `Tile_MainLight2`, `Tile_SrcLight1`, `Tile_SrcLight2`.
- `C:\Projects\New Folder\export\decompiled_all.c:255888-255905` writes ARE global lighting/fog/shadow fields.
- `C:\Projects\New Folder\export\decompiled_all.c:255946-255949` writes tile light fields.
- `C:\Projects\New Folder\export\decompiled_all.c:256239-256303` applies Sun/Moon ambient/diffuse colors using byte0/byte1/byte2 divided by `255.0`.
- `C:\Projects\New Folder\export\decompiled_all.c:368987-369024` applies fog color byte order plus `25 - FogAmount*25/15` start and `FogClipDist` end.
- `C:\Projects\New Folder\export\decompiled_all.c:453281-453602` resolves tile main lights as static `lightcolor.2da` RGB and creates `fx_flame01` only for tile source-light nodes.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8599-8611` exposes tile light setters plus `RecomputeStaticLighting`.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8753-8765` documents `SetPlaceableIllumination`, `GetPlaceableIllumination`, and the required recompute call.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:919` defines `VFX_DUR_LIGHT_BLUE_5 = 153`, the owner `visualeffects.2da` row used by the ProgFX Type 4 owner-phase proof.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:1008` defines `VFX_DUR_BLINDVISION = 242`, the owner `visualeffects.2da` row used by the ProgFX Type 4 vision owner-phase proof.
- `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\data\nwn_base.key` contains `visualeffects.2da`, `progfx.2da`, and `fx_light_clr.mdl`; the extracted `fx_light_clr.mdl` hash is `590087f62a93cc76b0ece4e28986a4941766c6c6c7630333d4ecee8f6fec01e5`.
- `nwn_base.key fx_light_clr.mdl` raw light controllers prove normal colored light animations on `AuroraLight01`: controller type `76` stores RGB, type `88` stores radius frames `0 -> 13.3`; `Red_20m` is RGB `1.75,0.75,0.5`, `Blue_10m` is `0.75,0.75,1.25`, and `white_20m` is `1.75,1.75,1.75`.
- `nwn_base.key fx_shadow_s/m/l.mdl` parser report confirms `Fx_Shadow_S` emitter `Small` size `1` alpha `0.6`, `Fx_Shadow_M` emitter `Med` size `1.6` alpha `0.6`, and `Fx_Shadow_L` emitter `Large` size `3` alpha `0.7`, all using `fxpa_Dot01`, `Single`, `Billboard_to_Local_Z`, and position `0,0,0.03`.
- `backend/docs/aurora-reverse/vfx-aurora-first-implementation-readiness-r90.md:3740-3745` records recovered MDL `node light` parser fields/tracks and flare-list constraints.

## Current proof matrix

| Element | Status | Proof | Open blocker |
| --- | --- | --- | --- |
| Placeable `LightColor` -> `lightcolor.2da` RGB | Runtime-proven for sample templates | Frame JSON has `status=active`, `source=runtime-source/vanilla/nwn_base.key/lightcolor.2da`, `colorProof=source-backed-lightcolor-2da`; screenshots show campfire `PaleYellow #6`, candle `PaleDarkYellow #4`, red VFX flame `Red #27`. | Direct decompiled `placeables.2da.LightColor` call-site is not recovered in this pass; source is Aurora 2DA/runtime extraction, not a decompiled field reader. |
| Placeable color is not always white | Runtime-proven and catalog-swept | Campfire sample: RGB `1.9,1.9,1`; candle: `0.94,0.94,0.5`; red flame: `2,0.5,0.2`. Full catalog sweep found 334 LightColor placeables across 14 rows, including `Red #27` on 41 templates. Panel swatch and renderer diagnostics preserve distinct rows/colors. | Visual brightness can still make pale yellow look close to white; use panel RGB/sample diagnostics as canonical proof. |
| Placeable `LightOffset` | Runtime-proven for sample templates | Frame JSON samples expose `offsetSource=placeables.2da.LightOffset` and screenshots show emitter marker at the offset. | World-space offset scale is Aurora Web mapping; verify against retail/toolset for exact placement before claiming pixel parity. |
| Placeable `ShadowSize` | Source-backed retail MDL selection and emitter metadata; projection parity still blocked | Retail `nwmain.exe` maps `ShadowSize=0 -> Fx_Shadow_S`, `2 -> Fx_Shadow_L`, and any other present value -> `Fx_Shadow_M`; extracted `Fx_Shadow_*` emitters provide size/alpha/texture/render-mode metadata. Runtime userData records selected lane, MDL file, emitter size, alpha, and proof status `source-backed-retail-shadowsize-shadow-mdl-selection`. | Aurora Web still uses a Three circle/billboard proxy, not the retail shadow-volume/projection renderer. Pixel/geometry parity remains blocked. |
| Placeable light on/off | Source-backed default, source-backed toggle, unit-tested disable path | Retail `nwserver.exe` proof is reproducible with `backend/scripts/audit-lightstate-default-retail-binary.mjs`: function `0x1404484d0..0x14044a2ec` references `LightState` at `0x140448ed0` and sets `[rbx+0x368]=1` at `0x140448eb5` before the optional read. NWScript documents `SetPlaceableIllumination`/`GetPlaceableIllumination` plus recompute; renderer tests verify `LightState=0` creates no `THREE.PointLight`, and dev captures preserve source RGB while disabling the emitted light. | Need an imported retail/module instance with real serialized `LightState=0` for imported-content proof; the default-on behavior itself is source-backed through the retail binary xref. |
| Tile main/source lights | Source-backed split: main is static `lightcolor.2da`, source is dynamic `fx_flame01` | Tile main lights resolve through `lightcolor.2da` and no longer create fake PointLights. Tile source lights create `fx_flame01/AuroraLight01` with radius `7`, shadowradius `15`, vertical displacement `2`, and active falloff `max(0,1-distance/radius)`. Full `/areas/lighting/evidence` sweep covers decoded tile light refs and audit coverage now reports static main plus dynamic source lanes separately. | Full Aurora static-lighting bake and retail pixel parity are not proven. Source-light unloaded-model fallback remains tile-center until `sourcelight1/2` node transforms are available. |
| `lightcolor.2da` vs `tilecolor.2da` split | Source-backed and runtime-proven with broad sweep | Decomp loads both tables; tile proof shows main lights from `lightcolor.2da` and source lights from `tilecolor.2da`. Broad sweep decoded `4998` main-light refs from `runtime-source/vanilla/nwn_base.key/lightcolor.2da` and `9119` source-light refs from `runtime-source/vanilla/nwn_base.key/tilecolor.2da`; only `1` decoded RGB entry was black/non-renderable. | No tileset-specific override table beyond the vanilla runtime-source table was observed in this imported dataset; exact retail static-lighting bake remains separate. |
| Area global lighting/fog/shadow fields | Source-backed formulas for color/intensity/fog range plus runtime toggle proof | Decomp anchors cover ARE field read/write, Sun/Moon ambient/diffuse byte0/byte1/byte2 color application, fog color byte order, fog start `25 - FogAmount*25/15`, and `FogClipDist` end. The renderer uses source-backed global light intensity `1.0` and scaled fog start/end in the Three adapter. The `d_sewers` ON/OFF pair captured screenshots and frame JSON for Display Fog / Use Area Lighting toggles. | Retail pixel parity and exact downstream renderer output remain separate. OFF capture's canvas sampler can report `blank_or_nearly_black`; use screenshot plus frame JSON together. |
| Area shadow enable/opacity | Source-backed, runtime-proven for enabled ARE fields and normalized opacity factor | Decomp anchors `ShadowOpacity`, `SunShadows`/`MoonShadows`; `_winds_study` runtime frame records `areaGlobalShadowStatus=enabled`, `areaGlobalShadowSourceField=SunShadows`, `areaGlobalShadowOpacity=50`, `areaGlobalShadowOpacityFactor=0.5`, phase `sun`, and a visible-content terrain-only screenshot. | The terrain-only proof intentionally hides the blocked placeable layer; it is not retail/toolset pixel parity for shadow volumes. Need retail/toolset screenshot parity for actual shadow projection before marking renderer behavior canonical. `_IKEA` also has shadow fields but timed out with 1136 placeables, so it is not promoted as runtime proof. |
| MDL `node light` payloads | Runtime-proven for multiple source-MDL previews, canonical parity still blocked | `plc_dlp_light_08` proof frame captures `VFX_AURORA_MDL_LIGHT_PAYLOAD_READY`, `lightNode=pulsing_light03`, `modelFileName=dlp_light_08.mdl`, `lightRadius=3`, `lightMultiplier=3`, `lightColor=0,0.592157,0.141176`, `lightShadow=true`, `lightPriority=2`, edge fields (`ambientOnly=false`, `dynamicType=1`, `affectDynamic=true`, `lensFlares=false`, `fadingLight=false`), `auroraLightPreviewMode=source-mdl-light-node-preview`, and a nonblank screenshot. `plc_plc_core_0060` adds binary-MDL wall torch proof with actual `PointLight` sample `node=torch_light12`, `color=0.94,0.79,0.17`, `intensity=4`, `distance=2`, `castShadow=true`, `flareRadius=1`, and `fadingLight=true`. `plc_phod_lightblob` adds full flare-array payload proof: `textureNames=fxpa_lensflare|fxpa_lensring|fxpa_lensring|fxpa_lensflare`, `flareSizeCount=4`, `flarePositionCount=4`, `flareColorShiftCount=4`, `flareRadius=35`, and actual `PointLight` sample `node=light01`, `color=1,1,0.9`. Follow-up tests cover negative radius/multiplier/shadowradius clamping, multiple-node priority budget behavior, actual PointLight diagnostics, and binary animation-header duration guards. | These are catalog VFX preview routes and explicitly `VFX_AURORA_MDL_LIGHT_PREVIEW_NON_CANONICAL`; the current candidate sweep found `generateFlare=true` count `0`, so remaining flare work is retail/toolset parity or a different content source with a true generate-flare case. |
| MDL light-node budget cap | Source-backed, unit-tested, in-app runtime-proven for the dev override, and workspace-editable | Placeable runtime userData exposes `auroraLightBudgetCap` / `auroraLightBudgetHardCap=128`; creature runtime userData exposes `creatureAuroraLightBudgetCap` / `creatureAuroraLightBudgetHardCap=128`; both carry `C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30 caps light slots at 0x80 unless runtime max-lights is lower` and proof status `source-backed-mdl-light-slot-cap-max-128`. Unit tests verify priority sorting before light creation and lower configured runtime caps for placeable, creature, and tile-light lanes. In-app browser proof for `plc_plc_core_0060&maxLights=16` records `data-aurora-light-budget-cap=16`, `data-aurora-light-budget-hard-cap=128`, `data-aurora-light-configured-max-lights=16`, and actual `source-mdl-point-light` sample `node=torch_light12`. Workspace Options now exposes `Max active lights` (`runtimeMaxLights`, clamped `0..128`) and writes it to `auroraLightConfiguredMaxLights` plus `auroraTerrainTileLightConfiguredMaxLights`. | The active-light contribution formula is recovered, but final retail insertion/order across tile/placeable/MDL/item/VFX lanes is still blocked. |
| Scene-wide light proof-mode | Runtime-proven diagnostic bypass, not a retail arbiter | `workspaceSceneLightDiagnostics` now traverses the runtime scene and reports actual `THREE.PointLight` lanes, lane counts, source-backed counts, `maxLights` preview cap/source/proof, samples, and `budgetMode=diagnostic-only-no-pointlight-mutation`. It also reports non-PointLight light/vision requests such as ProgFX Type 4 without promoting them into fake scene lights. In-app proof captures candle `placeables-2da-light` / `PaleDarkYellow`, campfire `placeables-2da-light` / `PaleYellow`, item light `item-property-light` / `VFX_DUR_LIGHT_RED_20`, and BlindVision `progfx-type4-vision-request` with `scenePointLightCount=0`. Frames carry `scenePointLightProofStatus=preview-only-scene-point-light-audit-no-retail-cross-lane-ordering`, `scenePointLightPreviewBudgetCapProofStatus=source-backed-active-light-slot-cap-max-128`, and `scenePointLightRetailOrderingStatus=blocked-no-recovered-retail-cross-lane-active-light-ordering`. | This is the easy honest bypass: it proves what lights/requests exist in our runtime without hiding the missing retail cross-lane ordering. It does not disable/drop lights globally, does not create fake ProgFX point lights, and does not claim Aurora's final active-light sort, falloff, vision mutation, or shadow policy. |
| Scene-wide shadow proof-mode | Runtime-proven diagnostic bypass for shadow sources, not a retail projection model | `workspaceSceneLightDiagnostics` now also reports `sceneShadow*` fields: MDL `PointLight.castShadow` samples, unique placeable fast-shadow proxy samples, disabled fast-shadow proxy counts, ItemPropertyLight no-shadow policy samples, and ARE `ShadowOpacity` fields/factors. Runtime proof captures campfire `plc_plc_i06` with `sceneShadowFastShadowProxyCount=1`, `ShadowSize=1`, `areaOpacity=50`, `areaFactor=0.5`, final preview fast-shadow opacity `0.0675`; wall torch `plc_plc_core_0060` with `sceneShadowPointLightCastShadowCount=1`, `node=torch_light12`, `sourceShadow=true`, `animatedShadowRadius=0`, and `distance=2`; and red/bright equipped item light with `sceneShadowItemPropertyLightShadowPolicyCount=1`, `castShadow=false`, `status=not-enabled`, and `proof=blocked-no-decompiled-item-light-shadow-rule`. Frames carry `sceneShadowProofStatus=source-backed-scene-shadow-audit-preview-proxies-no-retail-projection-parity` and `sceneShadowRetailProjectionStatus=blocked-no-retail-shadow-volume-projection-parity`. | This closes the runtime audit/proof gap for where known shadow sources and no-shadow policies come from. It still does not recover Aurora's exact shadow-volume/fast-shadow projection, radius, opacity, item-light retail shadow rule, or pixel parity against retail/toolset. |
| Item/equipment `ItemPropertyLight` | Source-backed for item property metadata and retail IPRP token radii/colors, source-family-backed for RGB/source-MDL radius through `VFX_DUR_LIGHT_* -> progfx.2da -> fx_light_clr.mdl`, retail `ApplyLight` bridge recovered, object-level looping VFX owner add/remove recovered, generic MDL `PartLight` creation/Gob attach recovered, and runtime-tested for standalone/equipped item preview | NWScript defines `ITEM_PROPERTY_LIGHT` and `ItemPropertyLight(int nBrightness, int nColor)`. `backend/scripts/audit-retail-item-light-tables.mjs` proves `nwn_base.key -> base_2da.bif` contains `itempropdef.2da` row `44` (`costtable=18`, `param1=9`), `iprp_costtable.2da` row `18` (`IPRP_LIGHTCOST`, `ClientLoad=1`), `iprp_paramtable.2da` row `9` (`IPRP_COLOR`), `iprp_lightcost.2da` rows `1..4` (`Dim 5m`, `Low 10m`, `Normal 15m`, `Bright 20m`), and `iprp_color.2da` rows `0..6` (`Blue`, `Yellow`, `Purple`, `Red`, `Green`, `Orange`, `White`). `backend/scripts/audit-retail-light-function-disasm.py` now emits `applyLightItemPropertyBridge`: `nwmain.exe ApplyLight 0x140472270..0x1404723e4` (`sha256 f8f65f048d2955e1e99a74c96a10d397950d68d0ec9c35909d20e611a6796376`) maps color byte `[CNWItemProperty+9]` / `iprp_color 0..6` to base `VFX_DUR_LIGHT` rows `153/157/161/165/177/169/173`, maps brightness word `[CNWItemProperty+6]` to row add `0..3`, creates a `272` byte `CGameEffect`, and calls internal apply target `0x14048e350`. The same script emits `visualEffectOwnerLifecycle`: `nwmain.exe OnApplyVisualEffect 0x140434fc0..0x140435635` reads `GetObjectID(0)`, `GetInteger(0/1/2)`, `GetFloat(0)`, and `GetVector(0/1)`, then calls `CNWSObject::AddLoopingVisualEffect` at `0x140435400` and `CNWSMessage::SendServerToPlayerGameObjUpdateVisEffect` at `0x140435598`; `OnRemoveVisualEffect 0x140439730..0x140439ac7` calls `CNWSObject::RemoveLoopingVisualEffect` at `0x140439a75`; `CNWSObject::AddLoopingVisualEffect 0x14048da00..0x14048db90` writes 32-byte `CLoopingVisualEffect` records to `CNWSObject+0x160` with count `+0x168` and capacity `+0x16c`, and `RemoveLoopingVisualEffect 0x140498960..0x140498ae1` removes from the same list. The same script emits `mdlNodeLightPartLightLifecycle`: `MdlNodeLight::InternalCreateInstance 0x140091980` creates a `192` byte `PartLight`, writes the `PartLight` vtable inline, and adds it to `Gob +0x470` via `CExoArrayList<PartLight>::Add` at `0x140091acc`; `Gob::CollectLights` then calls the `AsPartLight` vtable slot at `0x14008cdba` while building recursive light lists. `OnRemoveLight` is a trivial `mov eax,1; ret` export. Retail KEY/BIF audit also proves `visualeffects.2da` rows `153..180` point at `progfx.2da` Type 4 rows, which point at `fx_light_clr.mdl` animations. Raw `fx_light_clr.mdl` light controllers prove RGB and model radius: `Red_20m` uses `AuroraLight01`, color controller `76 = 1.75,0.75,0.5`, radius controller `88 = 0 -> 13.3`; `Blue_10m` is `0.75,0.75,1.25`. | The item-property-to-`CGameEffect` bridge, object-level looping VFX owner add/remove, trivial `OnRemoveLight` handler, and generic MDL-light `PartLight` creation/Gob-list attach are recovered. Client render/Gob instantiation from looping VFX into MDL/Gob/PartLight, cross-lane insertion order, and item-light shadow policy are still unrecovered. Current runtime no-shadow policy is explicit and proofed as `blocked-no-decompiled-item-light-shadow-rule`. |
| ProgFX Type 4 light/vision lanes | Source-backed, dev-browser-proven as a distinct diagnostic lane, backend-tested for owner-phase render-contract evidence, frontend-preserved in canonical renderer metadata, and object-level looping VFX owner add/remove source-backed | `progfx.2da` Type 4 rows preserve `Param1..Param7`, token radius metadata such as `Blue_5m`, priority, proximity suppression, scene attachment flag, and `fx_light_clr`. The backend VFX pipeline now accepts optional `progFxTableText`; render contracts emit `progFxType4Light` only when a ready `visualeffects.2da` phase schedule plus `EffectVisualEffect` context points to the matching Type 4 row. The frontend canonical renderer now preserves both `tokenRadiusMeters=5/10/15/20` and the source MDL facts from `fx_light_clr.mdl`; for `Blue_5m`, this is `sourceMdlColor=0.5,0.5,1`, `sourceMdlRadiusMeters=13.3`, and frames `0,13.3`. Runtime proof for `VFX_DUR_BLINDVISION` records `row=242 -> progfx row=329 LightBlindvision`, `animationKind=vision`, `visionMode=Blind_Vision`, `priority=53`, `Param5 proximity=1`, `Param6 attachToScene=0`, `sourceMdlNodeName=AuroraLight02`, `sourceMdlColor=0.3,0.3,0.3`, `sourceMdlRadiusMeters=7`, and empty light-request radius/color fields so no fake PointLight is claimed. Retail disassembly now proves the generic `OnApplyVisualEffect`/`OnRemoveVisualEffect` object-level owner list path through `CNWSObject+0x160/+0x168`. Proof status is `source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified`. | Still no canonical retail scene light, vision mutation, priority/proximity behavior, client attach-to-scene/removal, or shadow semantics. No generic `PointLight` is created from Type 4 without retail/runtime validation. |

## Full placeable LightColor row distribution

The full `/api/v1/catalog/placeables` sweep found `16408` placeables, `334` with `metadata.source2daLightColorRow`, `14` distinct `lightcolor.2da` rows, and `0` templates with `metadata.lightState`.

| Row | Label | RGB | Count | Subtypes |
| --- | --- | --- | ---: | --- |
| 1 | DimWhite | `0.6,0.6,0.6` | 2 | vfx 1, light_source 1 |
| 2 | White | `1.2,1.2,1.2` | 41 | vfx 35, door 6 |
| 4 | PaleDarkYellow | `0.94,0.94,0.5` | 19 | light_source 19 |
| 6 | PaleYellow | `1.9,1.9,1` | 15 | light_source 12, vfx 3 |
| 7 | Yellow | `1.9,1.7,0.06` | 41 | vfx 35, door 6 |
| 11 | Green | `0.12,1.85,0.42` | 41 | vfx 35, door 6 |
| 14 | PaleAqua | `1.3,1.92,1.82` | 18 | vfx 18 |
| 16 | PaleDarkBlue | `0.7,0.7,1.2` | 1 | vfx 1 |
| 19 | Blue | `0.8,0.8,1.9` | 45 | vfx 38, door 6, light_source 1 |
| 23 | Purple | `1.5,0.5,1.9` | 41 | vfx 35, door 6 |
| 27 | Red | `2,0.5,0.2` | 41 | vfx 35, door 6 |
| 28 | PaleDarkOrange | `1,0.75,0.3` | 8 | light_source 8 |
| 29 | DarkOrange | `1,0.5,0` | 3 | light_source 3 |
| 31 | Orange | `1.9,0.7,0` | 18 | vfx 18 |

## Verification commands run this pass

- `npx.cmd vitest tests/unit/modules/layout/PlaceablesModeRightPanel.test.tsx tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "PlaceablesModeRightPanel|placeables\.2da LightColor|runtime LightState"`: passed, 5 tests.
- `npx.cmd tsc --noEmit --pretty false` in `frontend`: passed.
- `node .codex-tmp\capture-placeable-light-preview-cdp.mjs` with `AURORA_PROOF_BASE_URL=http://127.0.0.1:5313`, `AURORA_PROOF_AUTH_BASE_URL=http://127.0.0.1:3211/api/v1`: captured 3 PNGs plus frame JSON.
- Full catalog LightColor sweep through `GET http://127.0.0.1:3211/api/v1/catalog/placeables`: captured JSON/CSV artifacts listed above.
- `node backend\scripts\capture-areas-runtime-cdp.mjs --area d_sewers ... --displayFog true --useAreaLighting true --tileLights false`: captured the area global fog/lighting ON screenshot/frame listed above.
- `node backend\scripts\capture-areas-runtime-cdp.mjs --area d_sewers ... --displayFog false --useAreaLighting false --tileLights false`: captured the area global fog/lighting OFF screenshot/frame listed above.
- `node backend\scripts\capture-areas-runtime-cdp.mjs --area _winds_study ... --displayFog false --useAreaLighting true --tileLights false`: captured source-backed enabled area shadow fields and visible screenshot/frame listed above.
- `node backend\scripts\capture-areas-runtime-cdp.mjs --area _winds_study ... --displayFog false --useAreaLighting false --tileLights false`: captured the matching renderer-toggle control frame/screenshot; source shadow status remains enabled because it represents ARE data.
- `GET /api/v1/areas/lighting/evidence` plus full `/api/v1/areas/:id` scan: verified `catalogLightStateTemplates=0` and no `LightState`/`lightState` match in 169 area details.
- `GET /api/v1/catalog/placeables?query=dlp_light_08` plus `POST /api/v1/catalog/placeables/render-payloads/batch`: found real `plc_dlp_light_08` source MDL light payload.
- Catalog VFX dev-route CDP capture for `plc_dlp_light_08`: captured the MDL light screenshot/frame listed above.

## Next loop candidates

1. Find an imported retail/module instance with serialized `LightState=0` and capture it without the dev-route override; constructed browser proof is now covered.
2. Improve area shadow visual proof beyond source status: capture an angled/close viewport or retail/toolset oracle where `ShadowOpacity` visibly affects projected shadows.
3. Expand MDL light-node proof beyond `plc_dlp_light_08`: full flare arrays are now browser-proofed on `plc_phod_lightblob`; the remaining MDL flare sample gap is a true `generateFlare=true` source/runtime case.

## Follow-up loop - source/status correction

New runtime proof artifacts:

- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_bhp_arcn1a-candle-after-light-rules-v2.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_bhp_arcn1a-candle-after-light-rules-v2.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_plc_i06-campfire-after-light-rules-v2.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_plc_i06-campfire-after-light-rules-v2-detail-3x.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_plc_i06-campfire-after-light-rules-v2.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_dlp_light_08-mdl-shadow-after-light-rules-v2.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_dlp_light_08-mdl-shadow-after-light-rules-v2.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_dlp_light_08-mdl-quadratic-atten-after-light-rules-v2.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_dlp_light_08-mdl-quadratic-atten-after-light-rules-v2.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_dlp_light_08-mdl-edge-fields-after-light-rules-v3.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-node-proof\plc_dlp_light_08-mdl-edge-fields-after-light-rules-v3.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-state-proof\plc_plc_i06-lightstate-on-fixture.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-state-proof\plc_plc_i06-lightstate-on-fixture.frame.json`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-state-proof\plc_plc_i06-lightstate-off-fixture.png`
- `C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence\light-state-proof\plc_plc_i06-lightstate-off-fixture.frame.json`

Corrections made in implementation/proof status:

- Placeable `LightColor` remains source-backed from `lightcolor.2da.RGB`.
- Placeable intensity now exposes `intensityProof=source-backed-lightcolor-rgb-vector-preserved-through-three-color-intensity`; `color=RGB/max` plus `intensity=max` preserves the source `lightcolor.2da` RGB vector as `color*intensity`, while retail pixel/material parity is still not claimed.
- Placeable `ShadowSize` now exposes `shadowProof=source-backed-placeables-2da-value-formula-unverified`; the value is source-backed, while fast-shadow radius/opacity remain preview-only.
- MDL light nodes with `shadow true` now set real `THREE.PointLight.castShadow=true` and expose `source-backed-mdl-shadow-pointlight-castShadow`.
- MDL light-node attenuation now exposes Aurora's recovered quadratic attenuation upload for both placeable/VFX previews and creature source-MDL previews:
  `lightQuadraticAtten = 9 / (max(radius, 0.1)^2 * 2)`, anchored at
  `C:\Projects\New Folder\export\decompiled_all.c:865404-865409`. This is source-backed for MDL light-node radius, not for `placeables.2da LightColor` falloff.
- MDL light parser now accepts Aurora's `isdynamic` token as an alias for the same dynamic-type field as `nDynamicType` / `dynamictype`, matching the decompiled parser storage at
  `C:\Projects\New Folder\export\decompiled_all.c:883214-883223`.
- ARE `ShadowOpacity` now exposes the recovered runtime factor `shadowOpacity / 100`, anchored at
  `C:\Projects\New Folder\export\decompiled_all.c:256306`; shadow-plane alpha later multiplies that factor at
  `C:\Projects\New Folder\export\decompiled_all.c:910844`.
- The dev catalog preview route accepts `lightState=0|1` as a controlled fixture override. This is not promoted as a natural module/GIT proof; it proves renderer handling for parsed `placeableRuntime.state.lightState`.

Fresh sample facts:

- Candle `plc_bhp_arcn1a`: source MDL light node exists, `shadow=false`; placeable 2DA light is row `4`, label `PaleDarkYellow`, RGB `0.94,0.94,0.5`, intensity `1`, offset `0,0.375,0`, `ShadowSize=1`.
- Campfire `plc_plc_i06`: no source MDL light node in payload; placeable 2DA light is row `6`, label `PaleYellow`, RGB `1.9,1.9,1`, intensity `1.9`, offset `0.120356,0.097327,0.005501`, `ShadowSize=1`.
- MDL shadow sample `plc_dlp_light_08`: source MDL light node exists and runtime frame reports `auroraLightShadowCastCount=1`.
- MDL attenuation sample `plc_dlp_light_08`: runtime frame reports `auroraLightAnimatedSourceRadius=7.953405847402922`,
  `auroraLightQuadraticAtten=0.07113874925812898`, `expectedQuadraticAtten=0.07113874925812898`,
  and `quadraticAttenDelta=0`.
- MDL edge-field sample `plc_dlp_light_08`: runtime frame v3 reports `ready=true`, `canvasNonblank=true`,
  `lightAmbientOnly=false`, `lightDynamicType=1`, `lightAffectDynamic=true`, `lightShadow=true`,
  `lightLensFlares=false`, `lightFadingLight=false`, and `auroraLightQuadraticAtten=0.05869225771416945`.
- ARE global shadow opacity factor: runtime terrain-only frame for `_winds_study` records `areaGlobalShadowOpacity=50`,
  `areaGlobalShadowOpacityFactor=0.5`, and source strings for `decompiled_all.c:256306` / `decompiled_all.c:910844`.
- Controlled LightState fixture for campfire `plc_plc_i06`: with `lightState=1`, runtime frame reports `placeableTwoDaLightStatus=active`, `pointLightCount=1`, `fastShadowCount=1`; with `lightState=0`, it reports `placeableTwoDaLightStatus=disabled`, `pointLightCount=0`, `fastShadowCount=0`, `disabledCount=1`, and screenshot shows the same model without the yellow light receiver.

Additional source/network notes:

- Local decompilation still only exposes renderer uniforms such as `lightQuadraticAtten[%d]` and strings `lightCutoffRangeMultiplier` / `lightFalloffFactor`; it does not recover a direct `placeables.2da ShadowSize -> falloff` formula.
- Local decompilation now has an MDL/runtime light-node attenuation rule: `FUN_00a40b60` clamps source radius to at least `0.1` and uploads `lightQuadraticAtten = 9 / (radius^2 * 2)` to light uniform slot `3`.
- Local decompilation maps ARE `ShadowOpacity` to `_DAT_00d023b8 = ShadowOpacity / 100.0`, then uses that normalized factor in shadow-plane alpha math.
- Non-primary external builder documentation found during network search describes `placeables.2da` `LightOffsetX/Y/Z` as the light offset point and `ShadowSize` as the placeable shadow size, with common guidance to leave `ShadowSize=1`; because these are not primary Aurora sources and expose no projection/opacity formula, they are not promoted to implementation evidence.
- NWN Lexicon agrees with local `nwscript.nss`: placeable activation animation is not enough for real lighting; scripts must use `SetPlaceableIllumination` and `RecomputeStaticLighting`.
- xoreos/Torlack BIN MDL docs agree with local decompilation that MDL light nodes carry radius, shadow radius, multiplier, shadow flag, light priority, flare radius, flare arrays, generate-flare, ambient-only, dynamic/affect-dynamic, and fading-light fields.

Verification in this follow-up:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|source MDL light-node"` passed.
- `npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` passed.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "source MDL light-node"` passed after adding quadratic attenuation proof.
- `npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run -t "renders ARE global sun lighting and fog"` passed after adding source-backed `ShadowOpacity/100` proof.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|runtime LightState|static lighting preview"` passed.
- Catalog VFX dev-route capture for `plc_dlp_light_08` saved the MDL quadratic attenuation screenshot/frame listed above.
- `node backend/scripts/capture-areas-runtime-cdp.mjs --area _winds_study --displayFog false --useAreaLighting true --tileLights false --visibility terrain-only --allowPartialEvidence true --requireScreenshot`: captured the terrain-only `ShadowOpacity=50` / `factor=0.5` frame and screenshot listed above.
- `npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/aurora-vfx-mdl-nodes.spec.ts -t "preserves ASCII light nodes"` passed after adding `isdynamic` alias coverage.
- `npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/catalog.application.service.spec.ts -t "source MDL light"` passed after adding `isdynamic` alias coverage to the catalog parser path.
- Browser dev-route capture for `plc_dlp_light_08` saved the MDL edge-field screenshot/frame v3 listed above.

Current closed-vs-open state:

- Closed/source-backed: placeable light color rows, source offsets, source `LightState` handling where present, NWScript on/off/recompute rule, MDL light color/radius/multiplier/shadow flag, `isdynamic`/`nDynamicType` parser aliases, MDL shadow cast flag, MDL flare payload parsing and preview marking.
- Open/blocked: exact Aurora falloff/radius for `placeables.2da LightColor`, exact `ShadowSize` projection/opacity formula, retail-pixel parity for static-lighting bake and shadow volumes, and a true source/runtime `generateFlare=true` sample.
- Retail/toolset blocker as of 2026-07-01: read-only Toolset capture reports `no_visible_toolset_window` and `promotesVisualParity=false` in
  `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\areas-runtime-capture\toolset-readonly-window-capture-manifest.json`.

## Follow-up loop - ToolsetRGB placeable light proof

Stable runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-toolset-color\candle-toolset-color-on.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-toolset-color\candle-toolset-color-on.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-toolset-color\campfire-toolset-color-on.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-toolset-color\campfire-toolset-color-on.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-toolset-color\campfire-toolset-color-off.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-toolset-color\campfire-toolset-color-off.frame.json`

Implementation/proof corrections:

- Visible placeable light emitter tint now uses `lightcolor.2da` `TOOLSETRED`, `TOOLSETGREEN`, and `TOOLSETBLUE` when those values are present. This is anchored to `C:\Projects\New Folder\export\decompiled_all.c:40976-41071` and is separate from the physical point-light energy, which still uses source `RED`, `GREEN`, and `BLUE`.
- Placeables Mode now exposes this split in the inspector: the visible swatch/title use `TOOLSETRED/GREEN/BLUE` when present, while the `RGB` line continues to report source light energy from `RED/GREEN/BLUE`.
- The proof route now accepts `/dev/catalog-vfx-preview` as a first-class CDP capture target and records `data-placeable-2da-light-*` diagnostics, so placeable lights are not forced through VFX particle metrics.
- The CDP capture script now force-terminates only its spawned Chrome child if graceful shutdown hangs after screenshot/frame write.

Fresh stable sample facts:

- Candle `plc_bhp_arcn1a`: frame captured at `2026-07-01T13:37:15.427Z` reports `ok=true`, `devRenderStatus=ready`, `devCanvasNonblank=true`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, row `4` `PaleDarkYellow`, source RGB `0.94,0.94,0.5`, Toolset display RGB `0.59,0.56,0.37`, `toolsetColorEvidence=C:/Projects/New Folder/export/decompiled_all.c:40976-41071 reads TOOLSETRED/GREEN/BLUE from lightcolor.2da`, offset `0,0.375,0`, `ShadowSize=1`, and MDL light node `auroralight01` with quadratic attenuation `0.28125`.
- Campfire `plc_plc_i06` ON: frame captured at `2026-07-01T13:37:30.785Z` reports `ok=true`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, row `6` `PaleYellow`, source RGB `1.9,1.9,1`, Toolset display RGB `0.94,0.94,0.77`, `toolsetColorEvidence=C:/Projects/New Folder/export/decompiled_all.c:40976-41071 reads TOOLSETRED/GREEN/BLUE from lightcolor.2da`, intensity `1.9`, offset `0.120356,0.097327,0.005501`, and `ShadowSize=1`.
- Campfire `plc_plc_i06` OFF fixture: frame captured at `2026-07-01T13:37:44.686Z` reports `ok=true`, `devLightStateOverride=0`, `devPlaceableTwoDaLightStatus=disabled`, `devPlaceableTwoDaLightPointLightCount=0`, `devPlaceableTwoDaLightFastShadowCount=0`, `devPlaceableTwoDaLightDisabledCount=1`, `disabledReason=LightState=0`, and preserves row `6` / `PaleYellow` source values as disabled metadata.

Verification in this follow-up:

- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_bhp_arcn1a&time=0.5&seed=1" --name candle-toolset-color-on --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-toolset-color"`: passed and saved PNG/frame.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=1" --name campfire-toolset-color-on --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-toolset-color"`: passed and saved PNG/frame.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=1&lightState=0" --name campfire-toolset-color-off --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-toolset-color"`: passed and saved PNG/frame.
- `npx.cmd vitest tests/unit/modules/layout/PlaceablesModeRightPanel.test.tsx --run`: passed, 4 tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor"`: passed, 1 focused test.
- `npx.cmd tsc -b --pretty false`: passed.

## Follow-up loop - Aurora ASCII light-node kind coverage

Additional decompilation evidence:

- `C:\Projects\New Folder\export\strings.tsv:15787-15789` contains Aurora model node-kind strings `placeable`, `sourcelight`, `placeablelight`.
- `C:\Projects\New Folder\export\strings.tsv:15819` contains `propagateillumination`.
- `C:\Projects\New Folder\export\strings.tsv:15799-15801` contains `fx_light`, `light`, and `shadowblob`.
- `C:\Projects\New Folder\export\decompiled_all.c:876072` walks the same model node-kind string table while constructing source model nodes.

Implementation correction:

- ASCII MDL light parsing no longer accepts only `node light`; it now treats `node sourcelight`, `node placeablelight`, and `node fx_light` as source-backed Aurora light nodes too.
- Parsed light payloads now preserve `sourceNodeKind`, so runtime/debug proof can distinguish canonical source tokens from normalized `nodeKind: light`.

Verification:

- `npm.cmd test -- --runInBand backend/test/unit/aurora-vfx-mdl-nodes.spec.ts`: passed, 11 tests.
- `npm.cmd test -- --runInBand backend/test/unit/catalog.application.service.spec.ts -t "promotes source MDL light-node VFX without derived model assets"`: passed, 1 focused test.

## Follow-up loop - shadowblob source preservation

Implementation correction:

- ASCII MDL parsing now preserves `node shadowblob` entries as `shadowBlobNodes` with node name, parent, transform, orientation, scale, provenance, and `proofStatus=source-only-no-owning-shadow-policy-callsite`.
- `shadowblob` is intentionally not promoted to `THREE.PointLight`, fast shadow, or any renderer shadow policy. The decompilation/source audit found the node-kind token, but not an owning Aurora call-site that maps `shadowblob` into the same placeable/area shadow behavior already implemented.
- Parser diagnostics now emit `VFX_SPELLS_SHADOWBLOB_NOT_SHADOW_POLICY` when `shadowblob` exists, so runtime/debug evidence can show that the source was seen and deliberately not canonicalized.

Verification:

- `npm.cmd test -- --runInBand backend/test/unit/aurora-vfx-mdl-nodes.spec.ts`: passed, 10 tests, including `preserves ASCII shadowblob nodes as source-only shadow evidence without promoting renderer policy`.
- `npm.cmd test -- --runInBand backend/test/unit/catalog.application.service.spec.ts -t "promotes source MDL light-node VFX without derived model assets"`: passed, 1 focused test.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "source MDL light-node|placeables.2da LightColor"`: passed, 3 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/PlaceablesModeRightPanel.test.tsx --run`: passed, 4 tests.
- `npx.cmd tsc -b --pretty false` in `frontend`: passed.

Current remaining blockers after this loop:

- Exact Aurora falloff/radius for `placeables.2da LightColor` is still not recovered from decompilation.
- Exact Aurora `placeables.2da ShadowSize` projection/opacity formula is still not recovered from decompilation.
- `shadowblob` render behavior remains source-only until an owning call-site is recovered; implementing it visually now would be guesswork.
- `propagateillumination` was re-audited at `C:\Projects\New Folder\export\decompiled_all.c:846642`; it is a model graph propagation callback family, not a recovered light color, falloff, or shadow formula. The source parser now preserves `propagateillumination` and sibling `propagate*` tokens as `propagationEvents` with `proofStatus=source-only-model-graph-propagation-no-render-policy`; it still does not map them into particle tint, shader, point-light, or shadow behavior.
- Retail/toolset pixel parity for shadow volumes/static-lighting bake remains blocked by the unavailable visible Toolset/oracle capture.

External cross-checks:

- NWN Lexicon `SetPlaceableIllumination` confirms that visible placeable illumination changes require `RecomputeStaticLighting`, matching local `nwscript.nss`.
- xoreos `model_nwn.cpp` recognizes NWN MDL light node flags and controller IDs for radius, shadow radius, vertical displacement, and multiplier, but marks binary light payload handling as TODO; it does not provide a missing Aurora shadow formula.
- Torlack/xoreos-docs binary MDL notes list the light-node payload fields: flare radius/lists, light priority, ambient-only, dynamic type, affect-dynamic, shadow flag, generate-flare, and fading-light. They corroborate the parser payload, but do not define `placeables.2da ShadowSize` projection/falloff.

Verification after propagation preservation:

- `npm.cmd test -- --runInBand backend/test/unit/aurora-vfx-mdl-nodes.spec.ts`: passed, 11 tests, including `preserves propagateillumination as source-only model graph evidence`.
- `npm.cmd run build` in `backend`: passed.

## Follow-up loop - source-backed MDL light budget cap

Additional evidence:

- `C:\Projects\New Folder\export\decompiled_all.c:866086-866096` defines `FUN_00a41e30`; it returns `DAT_00cc3098` only when that value is below `0x81`, otherwise it returns `0x80`.
- `C:\Projects\New Folder\export\decompiled_all.c:866410-866424` uses `FUN_00a41e30()` while assigning/clearing light slots through `FUN_00a40b60`.
- `C:\Projects\New Folder\export\decompiled_all.c:899825-899840` allocates shader uniform handles for `lightAmbient[%d]`, `lightDiffuse[%d]`, `lightPosition[%d]`, `lightQuadraticAtten[%d]`, and `lightColor[%d]` over the same `FUN_00a41e30()` slot count.

Implementation correction:

- Source MDL light-node preview userData now carries `auroraLightBudgetCapSource` and `auroraLightBudgetCapProofStatus` on both the light group and accepted light nodes.
- Creature source MDL light-node preview now uses the same source-backed budget cap and priority ordering before creating `PointLight`/`AmbientLight` nodes; runtime userData records total source nodes, accepted nodes, dropped nodes, dropped samples, budget source, and budget proof status.
- Creature source MDL light-node preview now also uses the same recovered quadratic attenuation evidence as placeable source-MDL light nodes; non-ambient creature preview lights use `THREE.PointLight(..., decay=2)` and refresh `creatureAuroraLightQuadraticAtten` from animated radius during playback.
- Area lighting evidence now preserves processed placeable MDL light `sourceNodeKind` and exposes the same recovered `quadraticAtten`, source line, and proof status in `processedMdlLightSources[].nodes[]`. This keeps area audit proof aligned with placeable/creature runtime proof instead of reducing all source node kinds to normalized `light`.
- Existing priority ordering remains `lightpriority-desc-then-source-index`; this is still preview ordering unless a more exact Aurora sort comparator is recovered, but the hard maximum slot cap is now source-backed.

Additional negative/source-only evidence from this pass:

- `C:\Projects\New Folder\export\decompiled_all.c:453567` / `:453602` creates `fx_flame01` child references named `sourcelight1` and `sourcelight2` for tile source-light effects. The area renderer now keeps the center-of-tile fallback for unloaded models, but when a tile model is loaded and exposes `sourcelight1` / `sourcelight2`, the matching `sourceLight1` / `sourceLight2` runtime PointLight group is moved to that source-MDL node world transform and carries proof status `source-backed-tile-mdl-sourcelight-node-transform`.
- `C:\Projects\New Folder\export\strings.tsv:16505-16506` still exposes only shader/config names `lightCutoffRangeMultiplier` and `lightFalloffFactor`; this pass found no owning call-site that maps `placeables.2da LightColor` or tile source-light rows to a retail falloff formula.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "caps placeable source MDL light previews by lightpriority before creating PointLights"`: passed, 1 focused test.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "source MDL light|caps creature source MDL light"`: passed, 2 focused tests.
- `npm.cmd test -- --runInBand test/unit/areas.application.service.spec.ts test/unit/area-lighting-evidence.spec.ts -t "lighting evidence"` in `backend`: passed, 1 focused test after adding area processed-MDL light `sourceNodeKind` and quadratic attenuation proof fields.
- `npm.cmd test -- --runInBand test/unit/area-lighting-evidence.spec.ts` in `backend`: passed, 3 tests.
- `npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run` in `frontend`: passed, 10 tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run -t "tile source lights|tile main/source"` in `frontend`: passed, 2 focused tests after adding loaded tile-model `sourcelight1/2` transform sync.
- `npm.cmd run build` in `backend`: passed.
- `npx.cmd tsc -b --pretty false` in `frontend`: passed.

## Follow-up loop - additional placeable lightcolor examples and item-property light correction

Fresh runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-placeable-lightcolor-contact-sheet.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row07-yellow-curtain.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row07-yellow-curtain.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row11-green-curtain.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row11-green-curtain.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row19-blue-soul-jar.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row19-blue-soul-jar.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row23-purple-curtain.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row23-purple-curtain.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row27-red-curtain.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row27-red-curtain.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row28-paledarkorange-candle.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row28-paledarkorange-candle.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row31-orange-curtain.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-next-loop\next-loop-row31-orange-curtain.frame.json`

Additional placeable samples:

| Row | Label | Template | Source RGB | Toolset/display RGB | Runtime status |
| --- | --- | --- | --- | --- | --- |
| 7 | Yellow | `plc_phod_fx_curtylw` | `1.9,1.7,0.06` | `0.96,0.87,0.03` | `active`, `PointLight=1` |
| 11 | Green | `plc_phod_fx_curtgrn` | `0.12,1.85,0.42` | `0.06,0.93,0.21` | `active`, `PointLight=1` |
| 19 | Blue | `plc_plc_x0_jar` | `0.8,0.8,1.9` | `0,0.06,0.95` | `active`, `PointLight=1`, source MDL node `souljarlight` |
| 23 | Purple | `plc_phod_fx_curtpnk` | `1.5,0.5,1.9` | `0.76,0,0.95` | `active`, `PointLight=1` |
| 27 | Red | `plc_phod_fx_curtred` | `2,0.5,0.2` | `0.95,0.08,0` | `active`, `PointLight=1` |
| 28 | PaleDarkOrange | `plc_ptm_candle01` | `1,0.75,0.3` | `0.59,0.45,0.26` | `active`, `PointLight=1` |
| 31 | Orange | `plc_phod_fx_curtorg` | `1.9,0.7,0` | `0.95,0.35,0` | `active`, `PointLight=1` |

Implementation correction:

- `ItemPropertyLight` is now treated as its own item/equipment-light metadata path, not as a `placeables.2da LightColor` path.
- Local `nwscript.nss` defines `ITEM_PROPERTY_LIGHT = 44`, `IP_CONST_LIGHTBRIGHTNESS_DIM/LOW/NORMAL/BRIGHT`, `IP_CONST_LIGHTCOLOR_BLUE/YELLOW/PURPLE/RED/GREEN/ORANGE/WHITE`, and `ItemPropertyLight(int nBrightness, int nColor)`.
- Runtime `/api/v1/catalog/items/property-dictionary` resolves property `44 Light` to `costTableDefinition=iprp_lightcost` and `param1Table=iprp_color`.
- Frontend item creation validation now requires `costValue` for brightness and `param1Value` for color. It no longer treats item light as a fake subtype/`iprp_lightcolor` path.
- This does not create a scene `PointLight` for equipped-item lights yet. No creature/equipment runtime call-site was recovered in this loop, so renderer promotion remains a separate source-backed task instead of being guessed.

Verification:

- `node backend\scripts\capture-vfx-app-route-cdp.mjs --baseUrl "http://127.0.0.1:5173" --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=<sample>&time=0.5&seed=2" --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-next-loop"`: passed for rows `7`, `11`, `19`, `23`, `27`, `28`, and `31`.
- `npx.cmd vitest tests/unit/modules/items/itemCreationWizard.test.ts --run` in `frontend`: passed, 11 tests.
- `npx.cmd vitest tests/unit/modules/layout/PlaceablesModeRightPanel.test.tsx tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables\.2da LightColor|source MDL light-node|runtime LightState|static lighting preview"` in `frontend`: passed, 5 focused tests.
- `npx.cmd tsc -b --pretty false` in `frontend`: passed.

Current remaining blockers after this loop:

- Exact Aurora falloff/radius for `placeables.2da LightColor` is still not recovered from decompilation.
- Exact Aurora `placeables.2da ShadowSize` projection/opacity formula is still not recovered from decompilation.
- Superseded by later loops below: item/equipment `ItemPropertyLight` is now promoted into standalone item and creature equipment runtime lights; remaining blockers are exact retail RGB/falloff and item/equipment shadow policy.
- Retail/toolset pixel parity for static-lighting bake, shadow volumes, and item/equipment light remains blocked without a visible Toolset/retail oracle capture.

## Follow-up loop - ProgFX Type 4 light/vision source lane

Additional evidence:

- Local `nwscript.nss` exposes `VFX_DUR_LIGHT_BLUE_5..20`, `VFX_DUR_LIGHT_YELLOW_5..20`, `VFX_DUR_LIGHT_PURPLE_5..20`, `VFX_DUR_LIGHT_RED_5..20`, `VFX_DUR_LIGHT_ORANGE_5..20`, `VFX_DUR_LIGHT_WHITE_5..20`, `VFX_DUR_LIGHT_GREY_5..20`, and `VFX_DUR_GLOW_LIGHT_*` constants.
- Existing selected-source VFX audit records `VFX_DUR_LIGHT_BLUE_5` row `153` owning `ProgFX_Duration=304`; the referenced `progfx.2da` row `304` is Type `4` `LightBlue5m` with params `Blue_5m`, `1.0`, `0`, `20`, `0`, `0`, `fx_light_clr`.
- Existing VFX audit also records Type `4` `LightAreaBlackout` row `333`, owned by `VFX_DUR_BLACKOUT` row `5`.

Implementation correction:

- `parseAuroraProgFxTwoDa` now emits Type 4 source-lane diagnostics:
  - `VFX_PROGFX_TYPE4_REQUEST_CONTEXT_REQUIRED`
  - `VFX_PROGFX_TYPE4_NOT_MDL_LIGHT_NODE`
  - `VFX_CLIENT_LIGHT_NOT_GENERIC_POINT_LIGHT`
- This keeps programmed light/vision requests separate from `placeables.2da LightColor`, tile lights, MDL `node light`, item `ItemPropertyLight`, and generic Three.js `PointLight`.
- No scene light was created for Type 4 in this loop. That would require owning `visualeffects.2da` phase, effect-instance context, and profile/retail validation for priority/proximity/vision semantics.

Verification:

- `npm.cmd test -- --runInBand test/unit/aurora-vfx-source.parser.spec.ts` in `backend`: passed, 11 tests.
- `npm.cmd run build` in `backend`: passed.

## Follow-up loop - ItemPropertyLight standalone item renderer promotion

Additional evidence:

- Local `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:617` defines `ITEM_PROPERTY_LIGHT = 44`.
- Local `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:4643-4653` defines `IP_CONST_LIGHTBRIGHTNESS_DIM/LOW/NORMAL/BRIGHT` as values `1..4` and `IP_CONST_LIGHTCOLOR_BLUE/YELLOW/PURPLE/RED/GREEN/ORANGE/WHITE` as values `0..6`.
- Local `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:9732-9734` defines `ItemPropertyLight(int nBrightness, int nColor)`.
- NWN Lexicon `ItemPropertyLight` cross-check confirms that brightness is retrieved through `GetItemPropertyCostTableValue`, color through `GetItemPropertyParam1Value`, and that this light source does not make the item mesh glow.

Implementation correction:

- Standalone item scene objects with property `44 Light` now create a separate `item_property_light_source` group and a real `THREE.PointLight`.
- The renderer reads brightness from `costValue` / `iprp_lightcost` and color from `param1Value` / `iprp_color`; it does not reuse `placeables.2da LightColor`, MDL `node light`, or ProgFX Type 4 lanes.
- The item light preview writes source-proof userData for property id, brightness label/radius, color label, cost/param tables, no-self-glow status, falloff blocker, and shadow blocker.
- The visible item mesh is not made emissive/self-illuminated. The renderer adds a tint core/halo/range diagnostic around the separate light source instead.
- Brightness labels are mapped to item display radii `Dim=5m`, `Low=10m`, `Normal=15m`, and `Bright=20m`, then converted through the existing workspace `soundUnitsPerTile` meter scale.
- Symbolic item light colors are now source-family-backed through `VFX_DUR_LIGHT_*` / `ProgFX Type 4` / `fx_light_clr.mdl` color controllers, while the direct retail `ItemPropertyLight` scheduler RGB/falloff path remains unrecovered.
- A nearby stale light-node test was corrected from old expected attenuation to the recovered source formula: radius `2` now expects `9/(2^2*2)=1.125`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "ItemPropertyLight|placeables\.2da LightColor|source MDL light-node|source MDL light nodes|runtime LightState|static lighting preview"` in `frontend`: passed, 7 focused tests.
- `npx.cmd vitest tests/unit/modules/items/itemCreationWizard.test.ts --run` in `frontend`: passed, 11 tests.
- `npx.cmd tsc -b --pretty false` in `frontend`: passed after a one-line unrelated optional-chain guard in `CreaturesModeRightPanel.tsx`.

Current remaining blockers after this loop:

- Superseded by later loops below: equipped-item `ItemPropertyLight` is now promoted into a creature-attached runtime light; remaining blockers are exact retail RGB/falloff and any different retail item-light shadow rule.
- Exact retail item-light RGB and falloff are still not recovered from decompilation; current renderer proof is source-symbol and display-radius backed, not retail shader parity.
- Superseded by the later ItemPropertyLight shadow-policy proof: current runtime explicitly keeps item lights `castShadow=false` and records `blocked-no-decompiled-item-light-shadow-rule`; no decompiled retail item-light shadow call-site was recovered.

## Follow-up loop - equipped ItemPropertyLight creature attachment

Implementation correction:

- `CreatureRenderEquipmentModelCandidate` now carries `itemProperties` copied from `equippedItems[].itemRuntime.itemProperties`.
- The frontend creature HTTP schema preserves those item properties instead of dropping them from `equipmentModelCandidates`.
- Creature rendering now promotes equipped `ItemPropertyLight` into a creature-attached `THREE.PointLight` using the same source-backed brightness/color rules as standalone item objects.
- The light attaches to the resolved equipment target (`rhand_g`, `lhand_g`, etc.) when a skeleton anchor exists, or to the existing source-backed equipment fallback offset when only the fallback root is available.
- Runtime proof metadata distinguishes this lane from `placeables.2da LightColor` and MDL `node light` via `creatureEquipmentItemPropertyLightNotPlaceableLight=true` and `creatureEquipmentItemPropertyLightNotMdlLightNode=true`.
- The light remains non-shadow-casting until a decompiled item/equipment shadow policy is recovered.

Verification:

- `npm.cmd test -- --runInBand test/unit/catalog-processing.helpers.spec.ts -t "equipment attachment candidates|embeds linked inventory"` in `backend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "equipped ItemPropertyLight|source MDL light|caps creature source MDL light"` in `frontend`: passed, 3 focused tests.
- `npx.cmd tsc -b --pretty false` in `frontend`: passed.
- `npm.cmd run build` in `backend`: passed.

Current remaining blockers after this loop:

- Exact retail item-light RGB and falloff are still not recovered from decompilation; current item/equipment renderer proof is source-symbol plus display-radius backed.
- Item/equipment light shadow behavior is still blocked without an owning decompiled call-site.
- Superseded by later browser-proof loop below: a focused equipped-light creature route now has PNG/frame JSON proof; the remaining visual-fidelity gap is that the route uses the fallback creature body rather than a full retail creature mesh.

## Follow-up loop - equipped ItemPropertyLight browser proof

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\creature-itemproperty-light\creature-equipped-itemproperty-light.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\creature-itemproperty-light\creature-equipped-itemproperty-light.frame.json`

Implementation correction:

- Added `/dev/creature-light-preview` as a focused renderer proof route for an equipped item carrying property `44 Light`.
- Added `backend/scripts/capture-creature-light-preview-cdp.mjs` to capture that route through Chrome DevTools Protocol and fail unless runtime exposes a nonblank canvas, one `PointLight`, one equipped item-light source, and source-proof metadata from `utc.Equip_ItemList.itemRuntime.itemProperties`.
- The runner now exports frame data for `equipmentLightSource`, `equipmentLightProofStatus`, `equipmentLightNotPlaceableLight`, and `equipmentLightNotMdlLightNode`, so the proof distinguishes this lane from `placeables.2da LightColor` and MDL `node light`.

Captured runtime facts from `creature-equipped-itemproperty-light.frame.json`:

- `renderStatus=ready`, `canvasNonblank=true`, `objectPixels=14854`.
- `pointLightCount=1`, `equipmentLightCount=1`, `equipmentLightStatus=active`.
- `equipmentLightSource=utc.Equip_ItemList.itemRuntime.itemProperties`.
- `equipmentLightBrightnessLabels=Low`, `equipmentLightColorLabels=Blue`, `equipmentLightAttachmentTargets=rhand_g`.
- `pointLightDistance=1`, `pointLightIntensity=1`, `pointLightColor=0.18,0.42,1`, `pointLightCastShadow=false`.
- `creatureEquipmentLightNotPlaceableLight=true`, `creatureEquipmentLightNotMdlLightNode=true`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "equipped ItemPropertyLight|source MDL light|caps creature source MDL light"` in `frontend`: passed, 3 focused tests.
- `npm.cmd test -- --runInBand test/unit/catalog-processing.helpers.spec.ts -t "equipment attachment candidates|embeds linked inventory"` in `backend`: passed, 2 focused tests.
- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.
- `npx.cmd tsc -p tsconfig.node.json --pretty false` in `frontend`: passed.
- `node backend/scripts/capture-creature-light-preview-cdp.mjs` behind a temporary `vite --configLoader runner` job: passed and wrote the PNG/frame artifacts above.

Current remaining blockers after this loop:

- The screenshot route uses the renderer fallback creature body, not a full retail creature mesh; it proves the equipped light source and color/radius metadata, but not final creature visual fidelity.
- Exact retail item-light RGB and falloff remain unverified beyond source constants and display-radius labels.
- Item/equipment light shadow behavior remains non-casting until an owning decompiled item/equipment shadow policy is recovered.

## Follow-up loop - ItemPropertyLight runtime iprp route proof

Additional evidence:

- Runtime `/api/v1/catalog/items/property-dictionary` after `builder.user` login resolves `propertyName=44` / `label=Light` to `costTableIndex=18`, `costTableLabel=Light`, `costTableDefinition=iprp_lightcost`, `param1TableIndex=9`, `param1TableLabel=Color`, and `param1Table=iprp_color`.
- The same runtime payload resolved `iprp_lightcost.2da` option labels as `Type:_Dim_(5m)`, `Type:_Low_(10m)`, `Type:_Normal_(15m)`, and `Type:_Bright_(20m)`, but the later local-file audit did not find extracted `iprp_lightcost.2da` or `iprp_color.2da` files. Treat this as route/display-label evidence, not direct retail item-light scheduler proof.
- `C:\Projects\New Folder\item-retail-extract\2da\itempropdef.2da` row `44` points at cost table `18` and param1 table `9`.
- `C:\Projects\New Folder\item-retail-extract\2da\iprp_costtable.2da` row `18` is `IPRP_LIGHTCOST`.
- `C:\Projects\New Folder\item-retail-extract\2da\iprp_paramtable.2da` row `9` is `Color` / `IPRP_COLOR`.
- Runtime `param1Options` resolve only symbolic color labels (`Blue`, `Yellow`, `Purple`, `Red`, `Green`, `Orange`, `White`) from `iprp_color.2da`; no RGB values were present in the table payload.

Implementation correction:

- Superseded by the later retail KEY/BIF loop: item/equipment `ItemPropertyLight` radius proof status is now `source-backed-retail-key-bif-iprp-lightcost-token-radius`.
- Runtime userData now points `itemPropertyLightBrightnessRadiusSource` at `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key -> base_2da.bif`, where `iprp_lightcost.2da` rows `1..4` and `iprp_color.2da` rows `0..6` were recovered directly.
- Color proof is `source-family-backed-fx_light_clr-mdl-animation-rgb`, because `fx_light_clr.mdl` light-color controllers provide the current source-family RGB values; direct retail `ItemPropertyLight` RGB scheduler semantics remain unrecovered.
- Falloff proof is `source-family-backed-fx_light_clr-mdl-radius-linear-falloff-itemproperty-scheduler-unverified`.
- Item/equipment shadow remains non-casting until an owning decompiled item/equipment shadow policy is recovered.

Verification:

- `node -e "<builder login + GET /api/v1/catalog/items/property-dictionary row 44>"` in `backend`: passed and returned the facts above.
- Codex in-app browser capture passed and wrote:
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\creature-itemproperty-light\creature-equipped-itemproperty-light-radius-source-iab.png`
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\creature-itemproperty-light\creature-equipped-itemproperty-light-radius-source-iab.frame.json`
- Historical captured frame facts before the later local-file hardening: `renderStatus=ready`, `canvasNonblank=true`, `objectPixels=14854`, `pointLightCount=1`, `equipmentLightCount=1`, `equipmentLightSource=utc.Equip_ItemList.itemRuntime.itemProperties`, `pointLightDistance=1`, `pointLightIntensity=1`, `pointLightColor=0.18,0.42,1`.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "ItemPropertyLight"` in `frontend`: passed, 1 focused test.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "equipped ItemPropertyLight"` in `frontend`: passed, 1 focused test.
- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.

## Follow-up loop - ItemPropertyLight active light budget cap

Implementation/proof:

- Standalone item `ItemPropertyLight` and creature equipment `ItemPropertyLight` now consume the same recovered active-light cap source as MDL light nodes: `C:\Projects\New Folder\export\decompiled_all.c:866086-866096 FUN_00a41e30` returns `min(configured, 0x80)`.
- Standalone item-light runtime userData now exposes `itemPropertyLightBudgetRank`, `itemPropertyLightBudgetCandidateCount`, `itemPropertyLightBudgetAccepted`, `itemPropertyLightBudgetCap`, `itemPropertyLightBudgetHardCap=128`, `itemPropertyLightConfiguredMaxLights`, `itemPropertyLightBudgetCapSource`, and `itemPropertyLightBudgetCapProofStatus=source-backed-active-light-slot-cap-max-128`.
- If the item-light rank is over the cap, Aurora Web keeps source metadata but does not create the `THREE.PointLight`, core, halo, or range diagnostic geometry.
- Creature equipment item-light runtime userData now exposes candidate/accepted/dropped counts plus the same cap source/proof fields. The accepted order is current equipment/source order; no cross-scene global light sorter is claimed.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "ItemPropertyLight"` in `frontend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "equipped ItemPropertyLight|caps equipped ItemPropertyLight"` in `frontend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run` in `frontend`: passed, 106 tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run` in `frontend`: passed, 61 tests.
- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.
- Codex in-app browser proof route `http://127.0.0.1:5173/dev/creature-light-preview?equipmentLights=2&maxLights=1` passed and wrote:
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\creature-itemproperty-light\creature-equipped-itemproperty-light-budget-cap-inapp.png`
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\creature-itemproperty-light\creature-equipped-itemproperty-light-budget-cap-inapp.frame.json`
- Captured budget-cap frame facts: `renderStatus=ready`, `canvasNonblank=true`, `objectPixels=14854`, `routeEquipmentLightCount=2`, `equipmentLightCandidateCount=2`, `equipmentLightAcceptedCount=1`, `equipmentLightDroppedCount=1`, `droppedEquipmentLightCount=1`, `firstDroppedEquipmentLightRank=2`, `pointLightCount=1`, `equipmentLightBudgetCap=1`, `equipmentLightBudgetHardCap=128`, `equipmentLightConfiguredMaxLights=1`, `equipmentLightBudgetCapProofStatus=source-backed-active-light-slot-cap-max-128`, `equipmentLightBrightnessLabels=Low|Bright`, and `equipmentLightColorLabels=Blue|Red`.

Current remaining blocker after this loop:

- This closes item/equipment lane participation in the recovered active-light cap at the per-object/equipment-preview level. A true global scene-wide active-light arbiter across tile lights, placeables.2da lights, MDL lights, item lights, and ProgFX Type 4 effect-instance lights is still not claimed because no recovered retail ordering across all lanes is mapped yet.

## Follow-up loop - ProgFX Type 4 typed source preservation

Additional evidence:

- Local `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:919-946` exposes `VFX_DUR_LIGHT_*` constants for blue/yellow/purple/red/orange/white/grey 5m/10m/15m/20m light effects.
- Retail `progfx.2da` rows from the later KEY/BIF audit list sample Type 4 rows including `LightBlue5m` as `Blue_5m 1 0 20 0 0 fx_light_clr` and `LightAreaBlackout` as `Blind_Vision 1 0 13 0 1 fx_light_clr`.
- The later `fx_light_clr.mdl` audit supersedes the early interpretation of `5m/10m/15m/20m` as source radius: these suffixes are preserved as tokens, while source MDL controller type `88` supplies the recovered normal colored light radius `0 -> 13.3`.

Implementation correction:

- `parseAuroraProgFxTwoDa` now emits a typed `type4Light` payload for Type 4 rows while preserving raw `Param1..Param8`.
- The typed payload records animation, animation speed, cast-shadow flag, priority, proximity suppression, attach-to-scene flag, model ref, parameter source, and `proofStatus=profile-gated-source-preserved-no-runtime-scheduling`.
- Type 4 `Param1` light tokens are decoded without runtime scheduling: `Blue_5m` style tokens emit `animationKind=light`, `animationSymbolicColor`, `animationTokenRadiusMeters`, and `animationTokenRadiusProofStatus=source-backed-progfx-param1-animation-token-radius`.
- For `fx_light_clr` light animations, the parser/render contract now also emits `sourceMdlNodeName=AuroraLight01`, `sourceMdlColor`, `sourceMdlRadiusMeters=13.3`, `sourceMdlRadiusFrames=0,13.3`, and source-family MDL proof statuses.
- Type 4 vision tokens such as `Blind_Vision` emit `animationKind=vision` and `visionMode=Blind_Vision`.
- Existing diagnostics remain in place:
  - `VFX_PROGFX_TYPE4_REQUEST_CONTEXT_REQUIRED`
  - `VFX_PROGFX_TYPE4_NOT_MDL_LIGHT_NODE`
  - `VFX_CLIENT_LIGHT_NOT_GENERIC_POINT_LIGHT`
- No runtime `THREE.PointLight` is created for Type 4 in this loop. This is deliberate: Type 4 is a visualeffects-owned client light/vision request, not a standalone MDL light or placeable `LightColor` source.

Verification:

- `npm.cmd test -- --runInBand test/unit/aurora-vfx-source.parser.spec.ts -t "progfx.2da Type 4|raw Param1"` in `backend`: passed, 2 focused tests.
- `npm.cmd run build` in `backend`: passed.

Current remaining blockers after this loop:

- Superseded by the later owner-phase render-contract loop: backend packages can now prove selected `visualeffects.2da` owner row/phase plus `EffectVisualEffect` context when `progFxTableText` is supplied. Scene light/vision behavior still needs retail/runtime validation before it can be claimed.
- Type 4 token and source MDL facts are carried separately (`Blue_5m` token radius vs `fx_light_clr.mdl` color/radius), not converted into a generic retail `PointLight`.
- Item/equipment light and ProgFX Type 4 are linked by source families in docs, but they remain separate runtime lanes until a decompiled or retail-validated owner path proves how the engine bridges them.

## Follow-up loop - ProgFX Type 4 simple proof route

Implementation:

- Added `vfx-retail-progfx-type4-blue-5m-light` as a local dev fixture for `progfx.2da` row `304` (`LightBlue5m`).
- The fixture preserves the source lane as `ProgFX_Type4`, not as `placeables.2da LightColor` and not as an MDL `node light`.
- Runtime data attributes now expose `data-progfx-type4-*` on `/dev/vfx-fixture/...`, including:
  - `animation=Blue_5m`
  - `symbolicColor=Blue`
  - `tokenRadiusMeters=5`
  - `tokenRadiusProofStatus=source-backed-progfx-param1-animation-token-radius`
  - `radiusMeters=13.3`
  - `radiusProofStatus=source-family-backed-fx_light_clr-mdl-animation-radius`
  - `sourceMdlNodeName=AuroraLight01`
  - `sourceMdlColor=0.5,0.5,1`
  - `sourceMdlRadiusMeters=13.3`
  - `sourceMdlRadiusFrames=0,13.3`
  - `castShadows=false`
  - `priority=20`
  - `attachToScene=false`
  - `modelRef=fx_light_clr`
  - `notPlaceableLight=true`
  - `notMdlLightNode=true`
  - `runtimeSchedulingStatus=blocked-owner-phase-effect-instance-required`
- The existing `capture=data-url` switch is the lightweight proof path for this runner: `/dev/vfx-fixture/vfx-retail-progfx-type4-blue-5m-light?time=0.5&seed=37&capture=data-url`. This avoids the heavier CDP path for ordinary proof checks.

Runtime artifact:

- Chrome headless screenshot:
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\progfx-type4-light-proof\progfx-type4-blue-5m-light-chrome.png`
- PNG audit sample: `1280x720`, `44134` bytes, sampled non-background pixels `1623`, sampled blue-dominant pixels `1623`, background RGB `7,16,24`.
- A CDP frame JSON capture was not produced in this loop because the follow-up Chrome/CDP approval was rejected; this proof should be read as screenshot + source/test/data-attribute proof, not as a completed CDP frame packet.

Verification:

- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.
- `npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts --run -t "progfx Type 4"` in `frontend`: passed, 1 focused test.
- `npx.cmd vitest tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts --run -t "ProgFX Type 4|progfx Type 4"` in `frontend`: passed, 2 focused tests.

Remaining blocker:

- This closes source-lane preservation and lightweight visible proof for `ProgFX Type 4` examples. It still does not promote retail runtime behavior for priority/proximity/scene-attachment/shadow semantics without an owning `visualeffects.2da` effect instance and retail/toolset validation.

## Follow-up loop - ProgFX Type 4 owner-phase render contract

Implementation/proof:

- The backend VFX pipeline now accepts optional `progFxTableText` next to `sourceTableText`.
- `parseAuroraProgFxTwoDa` rows are preserved in `vfx.progFxRows`, and the auxiliary `progFxHash` participates in the VFX output cache key so different `progfx.2da` content cannot reuse the same processed package.
- `buildAuroraVfxRuntimeRenderContract` now receives `phaseSchedule` plus `progFxRows` and emits `progFxType4Light` only when:
  - the selected `visualeffects.2da` source row has a ready `EffectVisualEffect` phase schedule;
  - a phase such as `duration` points at a matching `progfx.2da` row id;
  - that `progfx.2da` row is `Type=4` and has a typed Type 4 light/vision payload.
- The emitted record carries `ownerVisualEffectRowId`, `ownerVisualEffectLabel`, `ownerPhase`, `ownerProgFxRef`, `ownerEffectConstructorKind`, `ownerDurationType`, Type 4 source fields, and `runtimeSchedulingStatus=source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified`.
- The render contract still records `visualPreviewStatus=backend-render-contract-source-record-no-scene-light` and diagnostic `VFX_PROGFX_TYPE4_RENDER_CONTRACT_NO_POINTLIGHT`; this deliberately avoids fabricating Aurora retail light projection.
- The frontend canonical renderer now reads `progFxType4Light` from the backend render contract and preserves the Type 4 row, symbolic color, radius, RGB, source/proof statuses, and owner-phase fields on both the render group and textured draw mesh `userData`.
- A lightweight dev proof route now exists at `/dev/vfx-fixture/vfx-retail-progfx-type4-blue-5m-owner-phase?time=0.5&seed=37&capture=data-url`. It exposes `data-progfx-type4-owner-*` DOM attributes for row `153` / `VFX_DUR_LIGHT_BLUE_5` while still reporting `backend-render-contract-source-record-no-scene-light`.

Verification:

- `npm.cmd test -- --runInBand test/unit/aurora-vfx-render-contract.spec.ts test/unit/vfx.application.service.spec.ts test/unit/vfx.schemas.spec.ts` in `backend`: passed, 29 tests.
- `npm.cmd run build` in `backend`: passed.
- `npx.cmd vitest tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts --run` in `frontend`: passed, 7 tests.
- `npm.cmd run build` in `frontend`: passed (`tsc -b` plus Vite build).
- `npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run -t "ProgFX Type 4|progfx Type 4"` in `frontend`: passed, 4 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run` in `frontend`: passed, 21 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` and `npx.cmd tsc -p tsconfig.node.json --noEmit --pretty false` in `frontend`: passed.
- A later `npm.cmd run build` in `frontend` initially reached Vite and then failed copying a locked unrelated Chrome profile file under `frontend/public/aurora-evidence/.../chrome-profile/Default/Network/Cookies`; `frontend/vite.config.ts` now disables Vite's raw public-dir copy and copies public assets through a filtered pass that skips `chrome-profile` / `chrome-cdp-profile*` directories.
- `npm.cmd run build` in `frontend`: passed after the filtered public-copy change.
- Post-build check: `frontend/dist/aurora-evidence` contains `0` `chrome-profile` and `0` `chrome-cdp-profile*` directories while normal PNG evidence files remain present.

Current remaining blocker after this loop:

- The previous missing owner-phase/effect-instance context is now closed for backend render-contract evidence and frontend metadata preservation. Canonical Type 4 behavior remains blocked for actual retail scheduling: priority ordering, proximity suppression, attach/remove scene-light semantics, vision mutation, shadow policy, and pixel/runtime parity still need retail/decompiled owner call-site proof before any real `PointLight` or vision effect is claimed.

## Follow-up loop - ItemPropertyLight ProgFX family bridge

Implementation:

- `ItemPropertyLight` metadata now exposes the related `VFX_DUR_LIGHT_*` / `ProgFX Type 4` source family while keeping item/equipment lights separate from placeables and MDL node lights.
- Brightness still comes from `iprp_lightcost` and carries the source-backed display radius (`Dim=5m`, `Low=10m`, `Normal=15m`, `Bright=20m`).
- Color still comes from `iprp_color`; RGB remains a preview mapping, but the symbolic color is now linked to the selected-source VFX/ProgFX light family.
- Runtime userData now includes:
  - `itemPropertyLightProgFxFamilyProofStatus=source-backed-applylight-vfxdur-mdlnodelight-partlight-create-gob-attach-owner-lifecycle-unverified`
  - `itemPropertyLightRelatedVisualEffectRowId`
  - `itemPropertyLightRelatedVisualEffectConstant`
  - `itemPropertyLightRelatedProgFxAnimation`
  - `itemPropertyLightRelatedProgFxSymbolicColor`
  - `itemPropertyLightRelatedProgFxRadiusMeters`
- Example mappings covered by tests:
  - Red + Bright -> `VFX_DUR_LIGHT_RED_20`, visualeffects row `168`, ProgFX animation `Red_20m`.
  - Blue + Low -> `VFX_DUR_LIGHT_BLUE_10`, visualeffects row `154`, ProgFX animation `Blue_10m`.

Verification:

- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "ItemPropertyLight|equipped ItemPropertyLight"` in `frontend`: passed, 2 focused tests.

Remaining blocker:

- This narrows item/equipment color provenance from loose symbolic preview to source-family-backed symbolic/ProgFX mapping. Exact retail RGB, falloff, and shadow behavior remain blocked without the owning engine scheduler or retail/toolset runtime proof.

## Follow-up loop - ItemPropertyLight red/bright proof controls

Implementation/proof:

- `/dev/creature-light-preview` now accepts `equipmentLightBrightness=<dim|low|normal|bright|1..4>` and `equipmentLightColor=<blue|yellow|purple|red|green|grey|orange|white|0..6>` for the first equipped item-light proof.
- The route exposes item-light source fields in DOM/frame proof: brightness label and IPRP radius, color label/RGB, related `VFX_DUR_LIGHT_*` constant, related ProgFX-family animation token, related symbolic color, and related radius.
- This remains the item/equipment `ItemPropertyLight` lane, not a promoted standalone ProgFX Type 4 scene light.

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\itemproperty-red-bright-light-proof-2026-07-02\creature-itemproperty-red-bright-light-inapp.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\itemproperty-red-bright-light-proof-2026-07-02\creature-itemproperty-red-bright-light-inapp.frame.json`

Captured runtime facts:

- Route: `/dev/creature-light-preview?equipmentLights=1&equipmentLightBrightness=bright&equipmentLightColor=red&maxLights=16`.
- `data-render-status=ready`, `data-canvas-nonblank=true`, `data-object-pixels=38846`, `data-point-light-count=1`.
- `data-equipment-light-brightness-labels=Bright`, `data-equipment-light-color-labels=Red`, `data-equipment-light-not-placeable-light=true`, `data-equipment-light-not-mdl-light-node=true`.
- `data-item-property-light-brightness-radius-meters=20`, `data-item-property-light-color=1,0.18,0.08`, `data-point-light-color=1,0.18,0.08`, `data-point-light-distance=2`, `data-point-light-intensity=1.7`, `data-point-light-cast-shadow=false`.
- `data-item-property-light-related-visualeffect-row-id=168`, `data-item-property-light-related-visualeffect-constant=VFX_DUR_LIGHT_RED_20`, `data-item-property-light-related-progfx-animation=Red_20m`, `data-item-property-light-related-progfx-symbolic-color=Red`, `data-item-property-light-related-progfx-radius-meters=20`.

Verification:

- `npx.cmd vitest tests/unit/modules/creatures/CreatureLightPreviewRunner.test.ts --run` in `frontend`: passed, 2 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.

Current remaining blocker after this loop:

- This proves another color/radius source example through the item/equipment lane and its ProgFX-family metadata. It still does not recover the missing retail bridge that would turn item/equipment light metadata into a canonical ProgFX Type 4 scheduler claim.

## Follow-up loop - Area ShadowOpacity multiplier on placeable fast-shadow preview

Implementation:

- `workspaceTerrainMesh` already writes source-backed ARE shadow fields onto `runtime.scene.userData`: `auroraTerrainAreaGlobalShadowOpacity`, `auroraTerrainAreaGlobalShadowOpacitySource`, `auroraTerrainAreaGlobalShadowOpacityFactor`, and `auroraTerrainAreaGlobalShadowOpacityFactorSource`.
- `workspaceObjectMeshLayer` now forwards those area shadow fields into `createPlaceableTwoDaLightPreviewGroup` when creating a `placeables.2da LightColor` preview group.
- `workspacePlaceableModelPresentation` now keeps the preview-only `ShadowSize` fast-shadow base opacity separate from the source-backed area opacity factor:
  - `placeableTwoDaFastShadowBaseOpacity`
  - `placeableTwoDaFastShadowBaseOpacitySource=preview-only-fast-shadow-opacity-blocked-no-decompiled-shadowsize-formula`
  - `placeableTwoDaFastShadowAreaOpacity`
  - `placeableTwoDaFastShadowAreaOpacitySource=ARE.ShadowOpacity read/write at decompiled_all.c:255224/255904; normalized to shadowOpacity/100 at decompiled_all.c:256306`
  - `placeableTwoDaFastShadowAreaOpacityFactor`
  - `placeableTwoDaFastShadowAreaOpacityFactorSource=decompiled_all.c:256306 stores ShadowOpacity/100, then shadow plane alpha multiplies that factor at decompiled_all.c:910844`
  - `placeableTwoDaFastShadowOpacityProofStatus=source-backed-area-shadowopacity-factor-preview-fast-shadow-opacity-multiplier`
- With `ShadowSize=2` and ARE `ShadowOpacity=50`, the test-proven values are now base opacity `0.17`, area factor `0.5`, final fast-shadow opacity `0.085`.
- `placeableTwoDaLightSamples` diagnostics now include the same proof numbers: `fastShadowBaseOpacity`, `fastShadowOpacity`, `fastShadowAreaOpacity`, `fastShadowAreaFactor`, `fastShadowAreaFactorSource`, `fastShadowAreaProof`, and `fastShadowOpacityProof`. This makes future browser frame proof readable without digging into individual mesh userData.

Verification:

- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor"` in `frontend`: passed, 1 focused test, including the diagnostic sample values `fastShadowBaseOpacity=0.17`, `fastShadowAreaFactor=0.5`, and `fastShadowOpacity=0.085`.
- Runtime proof route now supports `areaShadowOpacity=50` / `shadowOpacity=50` on `/dev/catalog-vfx-preview`, writes the source-backed ARE shadow opacity fields into `runtime.scene.userData`, and exports `data-area-shadow-opacity-override` / `data-area-shadow-opacity-factor-override`.
- Runtime artifact:
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-area-shadowopacity-fastshadow.png`
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-area-shadowopacity-fastshadow.frame.json`
- Captured frame facts for `/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=41&areaShadowOpacity=50`: `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=6272`, `devAreaShadowOpacityOverride=50`, `devAreaShadowOpacityFactorOverride=0.5`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`, `devPlaceableTwoDaLightDisabledByLightStateCount=0`, `devPlaceableTwoDaLightDisabledByUseAreaLightingCount=0`.
- The campfire sample has `ShadowSize=1`, so the runtime-proven fast-shadow values are base opacity `0.135`, area factor `0.5`, final opacity `0.0675`. The earlier unit fixture with `ShadowSize=2` proves base `0.17` -> final `0.085`.
- `npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "ShadowOpacity|placeables.2da LightColor"` in `frontend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` in `frontend`: passed, 5 tests, including the dev-only ARE `ShadowOpacity` scene-userData override.

Remaining blocker:

- This closes the missing ARE `ShadowOpacity/100` multiplier in the placeable fast-shadow preview path. It does not recover the exact retail `placeables.2da ShadowSize` projection/radius/opacity formula, so `placeableTwoDaFastShadowProofStatus` stays `preview-only-blocked-no-decompiled-shadowsize-formula`.

## Follow-up loop - unresolved falloff/shadow formula re-audit

Rechecked local decompilation anchors:

- `C:\Projects\New Folder\export\decompiled_all.c:40249-40266` still only proves `lightcolor.2da` / `tilecolor.2da` table loading.
- `C:\Projects\New Folder\export\decompiled_all.c:40976-41071` still only proves Toolset/display RGB reads from `TOOLSETRED`, `TOOLSETGREEN`, and `TOOLSETBLUE`.
- `C:\Projects\New Folder\export\decompiled_all.c:255946-255949` still proves ARE tile light serialization at offsets `0x40..0x43`, not placeable falloff.
- `C:\Projects\New Folder\export\decompiled_all.c:865404-865409` remains the recovered MDL source-light attenuation formula `9 / (max(radius, 0.1)^2 * 2)`.
- `C:\Projects\New Folder\export\decompiled_all.c:899825-899840` still only proves shader uniform slots for `lightAmbient[%d]`, `lightDiffuse[%d]`, `lightPosition[%d]`, `lightQuadraticAtten[%d]`, and `lightColor[%d]`.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8599-8611,8753-8765` confirms tile light color updates, `SetPlaceableIllumination`, `GetPlaceableIllumination`, and the `RecomputeStaticLighting` requirement after tile-light changes, illumination changes, or adding/deleting placeables with lights; it exposes no projection/falloff formula.

Result:

- No direct `placeables.2da LightColor -> attenuation/falloff` formula was recovered in this loop.
- No direct `placeables.2da ShadowSize -> projected shadow radius/opacity` formula was recovered in this loop.
- The implementation should therefore keep current placeable `LightColor` and `ShadowSize` proof statuses as source/table-backed preview formulas, not canonical retail formulas.

## Follow-up loop - MDL flare/source-only closure check

Rechecked implementation and test coverage:

- `backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts` preserves light-node `generateFlare`, `lensFlares`, `fadingLight`, `textureNames`, `flareSizes`, `flarePositions`, `flareColorShifts`, and `flareRadius` for ASCII and binary MDL light nodes.
- `backend/test/unit/aurora-vfx-mdl-nodes.spec.ts` covers ASCII and binary light nodes with `generateFlare=true`, flare arrays, `flareRadius`, `shadow=true`, `shadowRadius`, and light animation timelines.
- Local decompilation confirms those are real MDL light-node source tokens: `C:\Projects\New Folder\export\decompiled_all.c:883241-883285` reads `generateflare`, `texturenames`, `flaresizes`, `flarepositions`, `flarecolorshifts`, `flareradius`, and `fadingLight`.
- `shadowblob` remains source-only by design: parser output is `shadowBlobNodes` with `proofStatus=source-only-no-owning-shadow-policy-callsite`, plus diagnostic `VFX_SPELLS_SHADOWBLOB_NOT_SHADOW_POLICY`.
- `propagateillumination` remains source-only by design: parser output is `propagationEvents` with `proofStatus=source-only-model-graph-propagation-no-render-policy`, plus diagnostic `VFX_MDL_PROPAGATION_TOKEN_SOURCE_ONLY`.
- Local decompilation narrows `propagateillumination` to a model-graph callback path, not a renderer formula: `C:\Projects\New Folder\export\decompiled_all.c:846642-846646` matches the token and invokes the object callback at vtable offset `0xc0`.
- Frontend dev diagnostics already expose source-MDL light `flareRadius`, flare array counts, shadow cast proof, and actual `THREE.PointLight` samples. `plc_phod_lightblob` runtime proof captured full flare arrays; the current content sweep still found no real `generateFlare=true` source sample.
- `CatalogVfxPreviewRunner` now exposes source proof statuses for `generateFlare`, `lensFlares`, `fadingLight`, and flare-array payloads in addition to `flareRadius`.
- Current in-app browser proof for `plc_phod_lightblob` wrote:
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\mdl-light-flare-proof\plc-phod-lightblob-flare-proof-iab.png`
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\mdl-light-flare-proof\plc-phod-lightblob-flare-proof-iab.frame.json`
- Captured frame facts: `renderStatus=ready`, `canvasNonblank=true`, `objectPixels=32444`, `modelFileName=phod_lightblob.mdl`, `lightNode=light01`, `lightTextureNames=fxpa_lensflare|fxpa_lensring|fxpa_lensring|fxpa_lensflare`, `lightFlareSizeCount=4`, `lightFlarePositionCount=4`, `lightFlareColorShiftCount=4`, `lightFlareArrayProofStatus=source-backed-mdl-light-flare-array-payload-preserved`, `lightGenerateFlare=false`, `lightGenerateFlareProofStatus=source-backed-mdl-light-generateflare-token-preserved`, `lightFadingLight=true`, `lightFadingLightProofStatus=source-backed-mdl-light-fadinglight-token-preserved`, `lightFlareRadius=35`, `lightFlareRadiusProofStatus=source-token-preserved-write-target-unverified`.

No new renderer promotion was made in this loop:

- `generateFlare=true` is parser/source-backed, but a retail/runtime visual sample with `generateFlare=true` is still missing.
- `shadowblob` and `propagateillumination` do not become lights, shadows, shader tint, particle color, or fast-shadow geometry without an owning decompiled or retail-validated call-site.

Verification:

- `npm.cmd test -- --runInBand test/unit/aurora-vfx-source.parser.spec.ts -t "progfx.2da Type 4|raw Param1"` in `backend`: passed, 2 focused tests.
- `npm.cmd test -- --runInBand test/unit/aurora-vfx-mdl-nodes.spec.ts -t "binary light nodes|shadowblob|propagateillumination|binary animation header durations"` in `backend`: passed, 4 focused tests.
- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.
- `npx.cmd tsc -p tsconfig.node.json --pretty false` in `frontend`: passed.
- `npm.cmd run build` in `backend`: passed.
- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed after adding flare proof statuses.
- `npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run -t "source-mdl light-node metrics|emitter draw metrics"` in `frontend`: passed, 1 focused test.

Final blocker sweep in this loop:

- `rg` over `C:\Projects\New Folder\export` and `item-retail-extract` found no direct placeable falloff formula; `lightCutoffRangeMultiplier` and `lightFalloffFactor` are still only string tokens in `strings.tsv`.
- `SetPlaceableIllumination`, `GetPlaceableIllumination`, and `RecomputeStaticLighting` remain the only recovered NWScript/static-lighting toggle rule.
- `ItemPropertyLight` search still returns constants/table access only: brightness/color constants plus `GetItemPropertyCostTableValue` and `GetItemPropertyParam1Value`.
- `ProgFX` search still returns `VFX_DUR_LIGHT_*` constants plus a generic `visualeffects` string; no owner scheduler/call-site was recovered.
- `generateflare`, `fadingLight`, `shadowblob`, and `propagateillumination` searches still return token parsing/source paths only, not a renderer policy for unproven visual promotion.

## Follow-up loop - MDL light negative radius/multiplier edge proof

Implementation correction:

- Source MDL light `PointLight` runtime metadata now mirrors the core source facts already present on the wrapping `aurora-light-node`: raw `radius`, `multiplier`, `shadowRadius`, animated source radius, animated multiplier, animated shadow radius, world radius, quadratic attenuation, and proof status.
- This makes the actual Three.js light object self-proving during runtime traversal instead of requiring the audit to infer those values from the parent node.
- Defensive edge handling is now covered for negative source inputs without losing the raw source values:
  - source `radius=-4` is preserved as `auroraLightRadius=-4`;
  - source `multiplier=-2` is preserved as `auroraLightMultiplier=-2`;
  - source `shadowRadius=-5` is preserved as `auroraLightShadowRadius=-5`;
  - runtime color `[1.2, 0.25, -0.5]` clamps to `[1, 0.25, 0]`;
  - runtime intensity clamps to `0`;
  - runtime shadow radius clamps to `0`;
  - recovered MDL quadratic attenuation still uses `9 / (max(radius, 0.1)^2 * 2)`, so negative source radius produces proof value `450`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "negative radius"` in `frontend`: passed, 1 focused test.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "source MDL light"` in `frontend`: passed, 5 focused tests.

Current remaining blocker after this loop:

- This is defensive source-edge handling. The audit has not recovered a retail/decompiled call-site proving that Aurora normally emits negative MDL light radius, multiplier, or shadow radius values.

## Follow-up loop - placeables.2da PointLight proof metadata and ShadowSize zero

Implementation correction:

- The actual `THREE.PointLight` created from `placeables.2da LightColor` now carries the same proof-critical source metadata as the parent group/root:
  - raw source RGB, normalized preview RGB, Toolset display RGB when present;
  - `LightState` source/proof;
  - intensity value plus `source-backed-lightcolor-rgb-vector-preserved-through-three-color-intensity`;
  - preview distance plus `preview-only-radius-blocked-no-decompiled-placeable-falloff-formula`;
  - raw `LightOffset`, mapped offset, offset scale, and offset proof;
  - raw `ShadowSize` and its source/proof status.
- This makes runtime traversal of the object that actually emits light sufficient to prove that the renderer is not creating a generic white light.
- `ShadowSize=0` is now treated as a present source/table value, not as missing metadata. The preview fast-shadow mesh is still suppressed for non-positive sizes, but `placeableTwoDaShadowSizeProofStatus` stays `source-backed-placeables-2da-value-formula-unverified`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|ShadowSize zero|runtime LightState|static lighting preview"` in `frontend`: passed, 4 focused tests.

Current remaining blockers after this loop:

- The exact `placeables.2da LightColor` falloff/radius formula remains blocked; PointLight distance stays explicitly preview-only.
- The exact `ShadowSize` projection/opacity formula remains blocked; only the source value and preview fast-shadow suppression policy are proven.

## Follow-up loop - tile main/source PointLight proof metadata

Implementation correction:

- Tile main/source light `THREE.PointLight` userData now mirrors the proof-critical fields already available on the tile-light group:
  - raw source RGB from `lightcolor.2da` or `tilecolor.2da`;
  - normalized preview RGB;
  - intensity and distance values plus their preview-source labels;
  - tile id/position, source key, renderer mode, and budget rank/source.
- This keeps ARE tile light proof attached to the actual runtime light emitter, not only the wrapper group or scene dataset.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run` in `frontend`: passed, 7 tests.

Current remaining blockers after this loop:

- Tile light distance/intensity remain Aurora Web preview mappings; local decompilation proves ARE/tile serialization and table split, but not the exact retail static-lighting bake.
- Source-node transform syncing is source-backed for loaded models exposing `sourcelight1` / `sourcelight2`; unloaded tile models still use the explicit center-of-tile preview fallback.

## Follow-up loop - placeable LightColor diagnostics sample actual PointLight

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-diagnostics-pointlight.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-diagnostics-pointlight.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\candle-diagnostics-pointlight.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\candle-diagnostics-pointlight.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\red-row27-diagnostics-pointlight.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\red-row27-diagnostics-pointlight.frame.json`

Implementation correction:

- `placeables.2da LightColor` diagnostics now include `role=placeables-2da-point-light` samples from the actual runtime `THREE.PointLight`, not only the wrapper source group.
- The point-light sample carries source RGB, normalized preview RGB, intensity, distance, offset, `ShadowSize`, and proof statuses. This strengthens browser frame evidence for “this emitter is colored/source-backed” instead of only “a wrapper group had metadata.”

Captured runtime facts:

- Campfire `plc_plc_i06`: `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=6270`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `role=placeables-2da-point-light`, row `6` `PaleYellow`, source RGB `1.9,1.9,1`, preview RGB `1,1,0.526316`, Toolset RGB `0.94,0.94,0.77`, intensity `1.9`, offset `0.120356,0.097327,0.005501`, `ShadowSize=1`.
- Candle `plc_bhp_arcn1a`: `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=74800`, `devDrawParticles=1`, `devRenderedVertices=209`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `role=placeables-2da-point-light`, row `4` `PaleDarkYellow`, source RGB `0.94,0.94,0.5`, preview RGB `0.94,0.94,0.5`, Toolset RGB `0.59,0.56,0.37`, intensity `1`, offset `0,0.375,0`, `ShadowSize=1`, source MDL node `auroralight01`, and MDL quadratic attenuation `0.28125`.
- Red VFX curtain `plc_phod_fx_curtred`: `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=624`, `devDrawParticles=4`, `devRenderedVertices=1073`, `devDrawLanes=source-mdl|Fountain|Lighten|Motion_Blur`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `role=placeables-2da-point-light`, row `27` `Red`, source RGB `2,0.5,0.2`, preview RGB `1,0.25,0.1`, Toolset RGB `0.95,0.08,0`, intensity `2`, offset `0.001992,4.5,0.005501`, `ShadowSize=1`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|ShadowSize zero|runtime LightState|static lighting preview"` in `frontend`: passed, 4 focused tests.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=41" --name campfire-diagnostics-pointlight --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-diagnostics-proof"`: passed and wrote PNG/frame.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_bhp_arcn1a&time=0.5&seed=41" --name candle-diagnostics-pointlight --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-diagnostics-proof"`: passed and wrote PNG/frame.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_phod_fx_curtred&time=0.5&seed=41" --name red-row27-diagnostics-pointlight --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-diagnostics-proof"`: passed and wrote PNG/frame.

Current remaining blockers after this loop:

- Candle, campfire, and red row 27 now have current browser PNG/frame proof from actual `PointLight` samples. Other rows can still be recaptured with the same diagnostics path if needed.

## Follow-up loop - Use Area Lighting disables placeable light preview emitters

Implementation/proof:

- The workspace `Use Area Lighting=false` path suppresses `placeables.2da LightColor` preview geometry and runtime `THREE.PointLight` creation.
- The disabled object root now keeps source/proof metadata instead of collapsing to `unknown`: `LightColor` row/raw/label/source, source RGB, Toolset display RGB, `LightState`, `LightOffset`, `ShadowSize`, and static-lighting recompute token.
- The object root keeps disabled metadata with `placeableTwoDaLightPreviewStatus=off-by-use-area-lighting`, `placeableTwoDaLightDisabledReason=Use Area Lighting=false`, and `placeableTwoDaLightDisabledProofStatus=source-backed-toolset-use-area-lighting-toggle`.
- Diagnostics count this as disabled via `disabledByUseAreaLighting`, so a capture can distinguish it from `LightState=0`.
- `Display Shadows=false` keeps the `placeables.2da` point light active and suppresses only the preview fast-shadow proxy. The root proof now reports `placeableTwoDaFastShadowProofStatus=hidden-by-display-shadows-toggle` instead of falsely reporting missing `ShadowSize`.

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-use-area-lighting-off.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-use-area-lighting-off.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-display-shadows-off.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-display-shadows-off.frame.json`

Captured runtime facts:

- `/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=41&useAreaLighting=false`: `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=5111`, `devUseAreaLightingOverride=false`, `devPlaceableTwoDaLightStatus=disabled`, `devPlaceableTwoDaLightSourceCount=0`, `devPlaceableTwoDaLightPointLightCount=0`, `devPlaceableTwoDaLightFastShadowCount=0`, `devPlaceableTwoDaLightDisabledCount=1`, and `devPlaceableTwoDaLightDisabledByUseAreaLightingCount=1`. The sample preserves row `6`, raw `6`, label `PaleYellow`, source RGB `1.9,1.9,1`, Toolset RGB `0.94,0.94,0.77`, `shadow=1`, and `static=1:6:1.9:1.9:1:0.240711:0.011001:0.194654:1`.
- `/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=41&displayShadows=false`: `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=6272`, `devDisplayShadowsOverride=false`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightSourceCount=1`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=0`, and sample `fastShadowProof=hidden-by-display-shadows-toggle` while retaining row `6`, `PaleYellow`, RGB, offset, and `ShadowSize=1`.

Verification:

- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "Use Area Lighting|Display Shadows|placeables.2da LightColor|refreshes static lighting"` in `frontend`: passed, 4 focused tests.
- `npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` in `frontend`: passed, 6 tests.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=41&useAreaLighting=false" --name campfire-use-area-lighting-off --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-diagnostics-proof"`: passed and wrote PNG/frame.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=41&displayShadows=false" --name campfire-display-shadows-off --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-diagnostics-proof"`: passed and wrote PNG/frame.
- Follow-up renderer gate on 2026-07-02 closed the previously listed unrelated failures: full `workspaceObjectMeshLayer.vfxRenderMode.test.ts --run` now passes 104/104.

Additional renderer-gate fixes from the 2026-07-02 loop:

- Aurora atlas playback now preserves source `frameStart/frameEnd` ranges beyond texture-grid capacity and wraps only the final texture address. This keeps raw frame `17` distinct from wrapped atlas frame `1` for 4x4 textures.
- Area shared renderer proof tests now traverse the root object as well as descendants because no-payload shared fallback proxies can carry the runtime marker on the root itself.
- Area visual-transform tests now compute expected offsets/rotation/scale through renderer helpers instead of stale magic positions.
- Area model-load failure proof now waits through the real loader retry budget before expecting `model-load-failed`.
- Protected texture fetch proof now accepts the runtime `AbortSignal` passed with authorization headers.
- `zlc_o45` source-MDL Fountain/Lighten proof now seeds the cache using the resolver-produced texture URL, so `vfxTextureStatus=applied` proves the actual texture contract instead of a fallback/mismatched URL.
- `ShadowSize` no longer drives placeable `PointLight.distance`. The value remains source-backed for the fast-shadow proxy only; the light distance is now explicitly marked as a constant preview radius with `placeableTwoDaLightDistanceUsesShadowSize=false` because no `placeables.2da` radius/falloff field or decompiled formula has been recovered.

Current proof artifacts for that correction:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-no-shadowsize-distance-coupling-2026-07-02.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-no-shadowsize-distance-coupling-2026-07-02.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\candle-no-shadowsize-distance-coupling-2026-07-02.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\candle-no-shadowsize-distance-coupling-2026-07-02.frame.json`

Captured facts:

- Campfire `plc_plc_i06`: historical frame before the retail carrier proof: `renderStatus=ready`, `canvasNonblank=true`, `pointLightCount=1`, `fastShadowCount=1`, row `6` `PaleYellow`, source RGB `1.9,1.9,1`, Toolset RGB `0.94,0.94,0.77`, `distance=2.25`, `distanceSource=preview-only-constant-radius-blocked-no-decompiled-placeable-falloff-formula-no-source-radius-field`, `distanceUsesShadowSize=false`, and `ShadowSize=1` remains only shadow metadata/proxy input. Superseded by the 2026-07-02 `fx_placeable01/AuroraLight01` carrier radius/falloff proof.
- Candle `plc_bhp_arcn1a`: historical frame before the retail carrier proof: `renderStatus=ready`, `canvasNonblank=true`, `pointLightCount=1`, `fastShadowCount=1`, row `4` `PaleDarkYellow`, source RGB `0.94,0.94,0.5`, Toolset RGB `0.59,0.56,0.37`, `distance=2.25`, `distanceSource=preview-only-constant-radius-blocked-no-decompiled-placeable-falloff-formula-no-source-radius-field`, `distanceUsesShadowSize=false`, and `ShadowSize=1` remains only shadow metadata/proxy input. Superseded by the 2026-07-02 `fx_placeable01/AuroraLight01` carrier radius/falloff proof.

Current remaining blocker after this loop:

- This proves the Aurora Web global preview toggle behavior and its Toolset/decomp source anchor; it does not replace retail/toolset pixel parity for static-lighting bake.
- Exact retail `ShadowSize` projection/radius/opacity remains blocked; the display-shadows proof only proves the preview toggle boundary.

## Follow-up loop - tile light runtime max-lights cap

Implementation/proof:

- Tile main/source lights now separate the recovered Aurora hard cap from a lower runtime/configured cap.
- The hard cap remains `128` from `FUN_00a41e30` / `min(configured, 0x80)`.
- `runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLights` can now lower the active tile light budget; `auroraTerrainTileLightBudgetCap` reports the effective cap and `auroraTerrainTileLightBudgetHardCap` reports the recovered `128` maximum.
- PointLight and layer diagnostics carry the same effective cap, hard cap, configured max-lights, rank, and source string, so browser/frame proof can distinguish "Aurora hard maximum" from "current runtime cap".

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run -t "tile light runtime PointLights|lower configured runtime tile light cap"` in `frontend`: passed, 2 focused tests.

Current remaining blocker after this loop:

- Cross-lane runtime cap support for placeable/creature MDL light nodes is handled in the next loop; a workspace UI control for editing that setting is still not exposed.

## Follow-up loop - cross-lane MDL light runtime max-lights cap

Implementation/proof:

- Placeable source-MDL light previews, creature source-MDL light previews, and tile main/source light previews now all respect a lower runtime/configured max-lights cap while preserving the recovered Aurora hard cap `128`.
- The shared object-renderer input is `runtime.scene.userData.auroraLightConfiguredMaxLights` for placeable/creature MDL light nodes.
- Placeable/creature diagnostics now report the effective cap plus hard cap:
  - `auroraLightBudgetCap` / `creatureAuroraLightBudgetCap`
  - `auroraLightBudgetHardCap=128` / `creatureAuroraLightBudgetHardCap=128`
  - `auroraLightConfiguredMaxLights` / `creatureAuroraLightConfiguredMaxLights`
- The cap source remains `C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30 caps light slots at 0x80 unless runtime max-lights is lower`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "configured runtime cap|placeable source MDL light previews"` in `frontend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "configured runtime cap|caps creature source MDL light"` in `frontend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run -t "tile light runtime PointLights|lower configured runtime tile light cap"` in `frontend`: passed, 2 focused tests.

Current remaining blocker after this loop:

- This closes runtime max-lights budget handling for current preview lanes. The next follow-up exposes the cap in workspace UI. It still does not recover retail falloff/radius for `placeables.2da LightColor`, tile lights, item lights, or exact `ShadowSize` projection.

## Follow-up loop - workspace runtime max-lights editor

Implementation/proof:

- `WorkspaceOptionSettings` now includes `runtimeMaxLights`, defaulting to `128` and sanitizing persisted values to integer `0..128`.
- Workspace Options now exposes a `Lighting` group with `Max active lights`.
- `WorkspaceCanvasViewport` writes the option to both runtime cap channels:
  - `runtime.scene.userData.auroraLightConfiguredMaxLights`
  - `runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLights`
- The same helper writes `auroraLightConfiguredMaxLightsSource=workspace-options-runtime-max-lights` and `auroraTerrainTileLightConfiguredMaxLightsSource=workspace-options-runtime-max-lights`.
- Object and terrain rebuild effects include `runtimeMaxLights`, so changing the option rebuilds placeable/creature/item and tile light previews against the new cap.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceOptionSettings.test.ts tests/unit/modules/layout/WorkspaceTopbar.facades.test.tsx tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts --run -t "runtime max-lights|workspaceOptionSettings|WorkspaceTopbar|applyWorkspaceRuntimeLightBudget"` in `frontend`: passed, 18 focused tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- `npm.cmd run build` in `frontend`: passed.

Known unrelated test state:

- Full `WorkspaceCanvasViewport.renderFilter.test.ts` still has existing failures outside this slice (terrain bridge expectation, texture fetch assertions that do not expect `AbortSignal`, loader queue timeouts, and fallback material assertions). The new `applyWorkspaceRuntimeLightBudget` test passes; this slice did not alter those loader/fallback paths.

Current remaining blocker after this loop:

- The UI now edits the recovered active light slot budget. It still does not recover retail falloff/radius for `placeables.2da LightColor`, tile lights, item/equipment lights, or exact `ShadowSize` projection.

## Follow-up loop - catalog preview maxLights proof route

Implementation/proof:

- `/dev/catalog-vfx-preview` now accepts `maxLights=<number>` as a dev-only runtime cap for source-MDL light-node previews.
- The runner writes the query value into `runtime.scene.userData.auroraLightConfiguredMaxLights` before `rebuildObjectMeshes`.
- Frame/DOM proof attributes now expose:
  - `data-max-lights-override`
  - `data-aurora-light-budget-cap`
  - `data-aurora-light-budget-hard-cap`
  - `data-aurora-light-configured-max-lights`

Verification:

- `npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` in `frontend`: passed, 7 tests.
- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\inapp-light-proof-2026-07-02\wall-torch-mdl-light-inapp-maxlights16.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\inapp-light-proof-2026-07-02\wall-torch-mdl-light-inapp-maxlights16.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\inapp-light-proof-2026-07-02\campfire-placeable-light-inapp-maxlights16.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\inapp-light-proof-2026-07-02\campfire-placeable-light-inapp-maxlights16.frame.json`

Captured runtime facts:

- Wall torch route: `/dev/catalog-vfx-preview?templateId=plc_plc_core_0060&time=0.5&seed=41&maxLights=16`.
- Wall torch frame: `data-render-status=ready`, `data-canvas-nonblank=true`, `data-source-mdl-light-payload-ready=true`, `data-max-lights-override=16`, `data-aurora-light-budget-cap=16`, `data-aurora-light-budget-hard-cap=128`, `data-aurora-light-configured-max-lights=16`, `data-aurora-light-budget-strategy=lightpriority-desc-then-source-index`.
- Wall torch actual light sample: `role=source-mdl-point-light`, `node=torch_light12`, `color=0.94,0.79,0.17`, `intensity=4`, `distance=2`, `castShadow=true`, `quadraticAtten=0.2813`, `quadraticProof=source-backed-mdl-radius-quadratic-attenuation`, `shadowProof=source-backed-mdl-shadow-pointlight-castShadow`.
- Campfire route: `/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=41&maxLights=16`.
- Campfire frame: `data-render-status=ready`, `data-canvas-nonblank=true`, `data-placeable-2da-light-point-light-count=1`, row `6` `PaleYellow`, source RGB `1.9,1.9,1`, Toolset display RGB `0.94,0.94,0.77`, `distanceUsesShadowSize=false`, `shadowProof=source-backed-placeables-2da-value-formula-unverified`.

## Follow-up loop - ARE ShadowOpacity factor cleanup

Implementation/proof:

- `clearTerrainAreaGlobalLightingLayer` now deletes both `auroraTerrainAreaGlobalShadowOpacityFactor` and `auroraTerrainAreaGlobalShadowOpacityFactorSource` along with the raw `ShadowOpacity` fields, preventing stale `ShadowOpacity/100` diagnostics from carrying into a later terrain/object render.
- This preserves the recovered Aurora source rule: `ShadowOpacity` is read with default `0x32` at `C:\Projects\New Folder\export\decompiled_all.c:255224`, written at `255904`, normalized to `/100` at `256306`, and then multiplied into shadow-plane alpha at `910844`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run` in `frontend`: passed, 9 tests.
- `npx.cmd tsc -p tsconfig.app.json --pretty false` in `frontend`: passed.

## Follow-up loop - placeable falloff/ShadowSize formula recheck

Rechecked evidence:

- External search for `placeables.2da LightColor ShadowSize LightOffset falloff radius formula` and related NWN/xoreos anchors did not return a usable technical source with a retail formula.
- Local decompilation search in `C:\Projects\New Folder\export\decompiled_all.c` finds `lightcolor` table anchors and Toolset display RGB anchors, but no recovered string/call-site for `placeables.2da`, `LightOffset`, `ShadowSize`, or a placeable `LightColor` falloff formula.
- Confirmed local decompilation anchors:
  - `C:\Projects\New Folder\export\decompiled_all.c:40249-40263`: UI/table path switches between `lightcolor` and `tilecolor`.
  - `C:\Projects\New Folder\export\decompiled_all.c:40976-41071`: reads `TOOLSETRED`, `TOOLSETGREEN`, `TOOLSETBLUE` from `lightcolor.2da`.
  - `C:\Projects\New Folder\export\decompiled_all.c:453281-453602`: tile source-light path uses `lightcolor.2da`/RGB and source-light node placement.
  - `C:\Projects\New Folder\export\decompiled_all.c:866086-866096`: active light slot cap is `min(configured, 0x80)`.

Decision:

- Historical state before the retail carrier proof: no code change mapped `ShadowSize` or MDL light-node `radius` into placeable `LightColor` distance, so the renderer was explicitly marked `preview-only-constant-radius-blocked-no-decompiled-placeable-falloff-formula-no-source-radius-field`. Superseded by the 2026-07-02 `fx_placeable01/AuroraLight01` carrier radius/falloff proof.
- `ShadowSize` remains source-backed metadata plus preview fast-shadow input only; exact projection/radius/opacity is still blocked pending a retail/toolset oracle or a recovered owning call-site.

## Follow-up loop - placeable LightState off browser proof

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-lightstate-off-diagnostics.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\campfire-lightstate-off-diagnostics.frame.json`

Captured runtime facts:

- Route: `/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=41&lightState=0`.
- `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=5115`.
- `devLightStateOverride=0`, `devPlaceableTwoDaLightStatus=disabled`, `devPlaceableTwoDaLightSourceCount=0`, `devPlaceableTwoDaLightPointLightCount=0`, `devPlaceableTwoDaLightFastShadowCount=0`, `devPlaceableTwoDaLightDisabledCount=1`.
- The disabled sample preserves row `6` `PaleYellow`, source RGB `1.9,1.9,1`, Toolset display RGB `0.94,0.94,0.77`, `lightState=0`, `disabledReason=LightState=0`, `lightStateProof=source-backed-lightstate`, and `toggleProof=source-backed-nwscript-static-lighting-recompute`.
- The Placeables right panel now labels runtime `LightState` as `on (1)` / `off (0)` instead of showing only the raw number.

Verification:

- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=41&lightState=0" --name campfire-lightstate-off-diagnostics --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-diagnostics-proof"`: passed and wrote PNG/frame.
- `npx.cmd vitest tests/unit/modules/layout/PlaceablesModeRightPanel.test.tsx --run` in `frontend`: passed, 5 tests.

Current remaining blocker after this loop:

- This proves the off path in Aurora Web and keeps the source toggle anchored to `SetPlaceableIllumination`/`GetPlaceableIllumination` plus `RecomputeStaticLighting`; it still does not prove that the current imported catalog contains a real serialized `LightState=0` instance.

## Follow-up loop - LightState zero evidence preservation

Implementation/proof:

- Backend area-lighting evidence now treats `metadata.lightState=0` as source-backed `utp.LightState` evidence instead of requiring `lightState > 0`.
- This matters for real imported off-lights: a serialized `LightState=0` should count as a present UTP field and remain visible in `/areas/lighting/evidence`, even though the renderer correctly creates no active point light for it.

Verification:

- `npm.cmd run test:unit -- area-lighting-evidence` in `backend`: passed, 4 tests.
- `npm.cmd run test:unit -- areas.application.service` in `backend`: passed, 23 tests.

Current remaining blocker after this loop:

- The current imported catalog still has no natural `LightState=0` sample; this closes the evidence-readiness bug so a future imported off-light will not be dropped from the audit.

## Follow-up loop - ProgFX Type 4 light-lane diagnostic boundary

Implementation/proof:

- `visualeffects.2da` / `progfx.2da` Type 4 light rows are preserved as a separate light/vision lane. They are not promoted to `placeables.2da LightColor` lights and are not treated as MDL `node light` payloads.
- The dev fixture for `progfx.2da` row `304` (`LightBlue5m`, animation `Blue_5m`) keeps the source facts: symbolic color `Blue`, radius `5`, color `0.25,0.45,1`, `castShadows=false`, priority `20`, `attachToScene=false`, model ref `fx_light_clr`.
- The runtime proof explicitly remains diagnostic-only: `progFxType4ProofStatus=source-backed-progfx-type4-light-lane-not-placeable-not-mdl-runtime-scheduling-unverified`, `progFxType4NotPlaceableLight=true`, `progFxType4NotMdlLightNode=true`, and `progFxType4RuntimeSchedulingStatus=blocked-owner-phase-effect-instance-required`.

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\progfx-type4-blue-5m-light-diagnostic.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\progfx-type4-blue-5m-light-diagnostic.frame.json`

Captured runtime facts:

- `/dev/vfx-fixture/vfx-retail-progfx-type4-blue-5m-light?time=0.5&seed=37`: `fixtureRenderStatus=rendered`, `fixtureCanvasNonblank=true`, `fixtureObjectPixels=7003`, `fixtureRenderedDrawParticles=3`, `fixtureRenderedVertices=18`, `fixtureDrawLane=textured_quad`, color arrays `0.25,0.45,1`, and diagnostic codes include `VFX_PROGFX_TYPE4_LIGHT_SOURCE_LANE_PRESERVED`, `VFX_PROGFX_TYPE4_OWNER_VISUALEFFECTS_PHASE_REQUIRED`, `VFX_DEV_PROGFX_TYPE4_LIGHT_DIAGNOSTIC_ONLY`, and `VFX_PROGFX_TYPE4_RETAIL_RUNTIME_REQUIRED`.

Verification:

- `npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts --run` in `frontend`: passed, 10 tests.
- `npx.cmd vitest tests/unit/app/App.vfxFixtureRunner.test.tsx --run` in `frontend`: passed, 2 tests.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/vfx-fixture/vfx-retail-progfx-type4-blue-5m-light?time=0.5&seed=37" --name progfx-type4-blue-5m-light-diagnostic --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-diagnostics-proof"`: passed and wrote PNG/frame.

Current remaining blocker after this loop:

- Canonical ProgFX Type 4 light behavior still needs the owning `visualeffects.2da` phase plus an `EffectVisualEffect` instance/runtime scheduler or retail capture before it can be promoted from source-colored diagnostic to real scene light behavior.

## Follow-up loop - ProgFX Type 4 vision owner-phase proof

Implementation/proof:

- Backend render contracts now preserve `visionMode` for Type 4 owner-phase records. The proof case is `visualeffects.2da` row `242` (`VFX_DUR_BLINDVISION`) pointing through duration phase to `progfx.2da` row `329` (`LightBlindvision`, animation `Blind_Vision`).
- Frontend canonical renderer preserves `auroraVfxProgFxType4VisionMode=Blind_Vision` on the root group and draw mesh metadata.
- The dev fixture route `/dev/vfx-fixture/vfx-retail-progfx-type4-blind-vision-owner-phase?time=0.5&seed=37&capture=data-url` exposes the same fields in DOM/frame proof and deliberately does not create a generic `PointLight`.
- The vision record keeps `animationKind=vision`, `visionMode=Blind_Vision`, `priority=13`, `attachToScene=true`, `castShadows=false`, owner row `242`, owner phase `duration`, and owner constructor `EffectVisualEffect`.
- Missing radius/color are preserved as missing: frame proof records `data-progfx-type4-radius-meters=""`, `data-progfx-type4-radius-proof-status=""`, and `data-progfx-type4-symbolic-color=""`.

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\progfx-type4-vision-proof-2026-07-02\blindvision-progfx-type4-owner-phase-inapp.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\progfx-type4-vision-proof-2026-07-02\blindvision-progfx-type4-owner-phase-inapp.frame.json`

Captured runtime facts:

- `data-render-status=rendered`, `data-canvas-nonblank=true`, `data-object-pixels=5401`, `data-draw-lane=textured_quad`.
- `data-progfx-type4-row-id=329`, `data-progfx-type4-label=LightBlindvision`, `data-progfx-type4-animation=Blind_Vision`, `data-progfx-type4-animation-kind=vision`, `data-progfx-type4-vision-mode=Blind_Vision`.
- `data-progfx-type4-owner-visualeffect-row-id=242`, `data-progfx-type4-owner-visualeffect-label=VFX_DUR_BLINDVISION`, `data-progfx-type4-owner-phase=duration`, `data-progfx-type4-owner-progfx-ref=329`.
- `data-progfx-type4-runtime-scheduling-status=source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified` and `data-progfx-type4-visual-preview-status=backend-render-contract-source-record-no-scene-light`.

Verification:

- `npm.cmd test -- --runInBand test/unit/aurora-vfx-render-contract.spec.ts` in `backend`: passed, 20 tests.
- `npx.cmd vitest tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run` in `frontend`: passed, 24 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- `npm.cmd run build` in `backend`: passed.
- `npm.cmd run build` in `frontend`: passed.

Current remaining blocker after this loop:

- This closes source-backed owner-phase metadata and browser proof for a Type 4 vision example. It still does not implement the actual retail vision mutation, proximity/priority scheduler, attach/remove behavior, or shadow policy.

## Follow-up loop - binary MDL wall torch light proof and animation-duration guard

Additional catalog evidence:

- Full `/api/v1/catalog/placeables` sweep with `limit=1000` pagination found `13922` templates and `496` name/model candidates for light/torch/lamp/candle/fire/flame/brazier/lantern/sconce/glow/pulse/flare/kamin terms.
- Batch render-payload probing found `230` source-MDL light entries among those candidates.
- `plc_plc_core_0060` (`VALE - Wall Torch`) provides a real binary MDL light example: model `plc_core_0060.mdl`, node `torch_light12`, source `aurora-mdl-binary`, radius `4`, multiplier `4`, color `0.94,0.79,0.17`, `shadow=true`, priority `2`, `generateFlare=false`, `fadingLight=true`, `flareRadius=1`, diagnostics `VFX_MDL_LIGHT_FLARE_PAYLOAD_PRESERVED` and `VFX_MDL_LIGHT_FLARERADIUS_WRITE_UNVERIFIED`.
- A follow-up candidate sweep including `node` terms found `250` source-MDL lights, `0` with `generateFlare=true` or `lensFlares=true`, `36` with `textureNames`, `36` with flare size/position/color-shift arrays, and `39` with `flareRadius`.
- `plc_phod_lightblob` (`Crystal Ball: Light`) provides a real full flare-array payload example: model `phod_lightblob.mdl`, node `light01`, source `aurora-mdl-binary`, radius `2.5`, multiplier `1`, color `1,1,0.9`, `shadow=false`, priority `3`, `generateFlare=false`, `fadingLight=true`, `flareRadius=35`, texture names `fxpa_lensflare|fxpa_lensring|fxpa_lensring|fxpa_lensflare`, `flareSizes=4`, `flarePositions=4`, `flareColorShifts=4`.

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\vale-wall-torch-mdl-light-diagnostics-v2.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\vale-wall-torch-mdl-light-diagnostics-v2.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\phod-lightblob-mdl-flare-arrays-diagnostics-v2.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-diagnostics-proof\phod-lightblob-mdl-flare-arrays-diagnostics-v2.frame.json`

Implementation correction:

- `CatalogVfxPreviewRunner` now exports `data-aurora-light-samples` from the actual runtime `THREE.PointLight`, not only the wrapper/source payload. The sample includes role, node, actual Three.js color, intensity, distance, `castShadow`, source radius, animated radius, world radius, multiplier, shadow radius, quadratic attenuation, and proof statuses.
- `backend/scripts/capture-vfx-app-route-cdp.mjs` now records `devAuroraLightSamples` plus source `data-light-*` fields into frame JSON, including light texture names and flare-array counts.
- The binary MDL parser now rejects nonphysical binary animation header durations above `86400` seconds before using them as implicit timeline durations. This fixes the discovered `plc_plc_core_0060` edge where binary animation headers produced `9.326937361585483e32` second timelines and would make light animation proof misleading. Explicit keyframe rows with their own source times are untouched.

Captured runtime facts:

- Route: `/dev/catalog-vfx-preview?templateId=plc_plc_core_0060&time=0.5&seed=41`.
- `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=16532`, `devDrawParticles=1`, `devRenderedVertices=209`, `devModelFileName=plc_core_0060.mdl`.
- `devSourceMdlLightPayloadReady=true`, `devAuroraLightNodes=torch_light12`, `devAuroraLightQuadraticAtten=0.28125`.
- `devAuroraLightSamples=role=source-mdl-point-light;node=torch_light12;color=0.94,0.79,0.17;intensity=4;distance=2;castShadow=true;sourceRadius=4;animatedSourceRadius=4;worldRadius=2;sourceMultiplier=4;animatedMultiplier=4;shadowRadius=0;quadraticAtten=0.2813;quadraticProof=source-backed-mdl-radius-quadratic-attenuation;shadowProof=source-backed-mdl-shadow-pointlight-castShadow`.
- Source payload fields in the same frame: `devLightSource=source-mdl`, `devLightNode=torch_light12`, `devLightRadius=4`, `devLightMultiplier=4`, `devLightColor=0.9399999976158142,0.7900000214576721,0.17000000178813934`, `devLightShadow=true`, `devLightPriority=2`, `devLightGenerateFlare=false`, `devLightFadingLight=true`, `devLightFlareRadius=1`, `devLightFlareRadiusProofStatus=source-token-preserved-write-target-unverified`.
- `phod_lightblob` route `/dev/catalog-vfx-preview?templateId=plc_phod_lightblob&time=0.5&seed=41`: `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=32443`, `devSourceMdlLightPayloadReady=true`, `devAuroraLightNodes=light01`, `devAuroraLightSamples=role=source-mdl-point-light;node=light01;color=1,1,0.9;intensity=1;distance=1.25;castShadow=false;sourceRadius=2.5;animatedSourceRadius=2.5;worldRadius=1.25;sourceMultiplier=1;animatedMultiplier=1;shadowRadius=0;quadraticAtten=0.72;quadraticProof=source-backed-mdl-radius-quadratic-attenuation;shadowProof=source-backed-mdl-shadow-disabled`.
- `phod_lightblob` source payload fields in the same frame: `devLightColor=1,1,0.8999999761581421`, `devLightRadius=2.5`, `devLightMultiplier=1`, `devLightShadow=false`, `devLightPriority=3`, `devLightGenerateFlare=false`, `devLightFadingLight=true`, `devLightTextureNames=fxpa_lensflare|fxpa_lensring|fxpa_lensring|fxpa_lensflare`, `devLightFlareSizeCount=4`, `devLightFlarePositionCount=4`, `devLightFlareColorShiftCount=4`, `devLightFlareRadius=35`.

Verification:

- `npm.cmd test -- --runInBand test/unit/aurora-vfx-mdl-nodes.spec.ts -t "binary animation header durations|binary light nodes"` in `backend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run -t "source-mdl light-node metrics|emitter draw metrics"` in `frontend`: passed, 1 focused test.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_plc_core_0060&time=0.5&seed=41" --name vale-wall-torch-mdl-light-diagnostics-v2 --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-diagnostics-proof"`: passed and wrote PNG/frame.
- `node backend/scripts/capture-vfx-app-route-cdp.mjs --authBaseUrl "http://127.0.0.1:3000/api/v1" --route "/dev/catalog-vfx-preview?templateId=plc_phod_lightblob&time=0.5&seed=41" --name phod-lightblob-mdl-flare-arrays-diagnostics-v2 --outDir "backend/docs/aurora-reverse/artifacts/placeable-light-diagnostics-proof"`: passed and wrote PNG/frame.

Current remaining blockers after this loop:

- This improves runtime proof for binary MDL source lights and prevents nonphysical implicit animation timelines from entering evidence packets. It does not prove retail pixel parity for light falloff/shadow projection.
- The current sweep found `generateFlare=true` count `0`; full texture/size/position/color-shift arrays are now browser-proofed on `plc_phod_lightblob`, but a true generate-flare case still needs a different content source or retail/toolset sample.

## Follow-up loop - broad area/tile light evidence sweep

API proof:

- `GET /api/v1/areas/lighting/evidence` through the same builder auth flow returned `areasScanned=169`, `tileLightTiles=13707`, `tileLightReferences=14117`, `tileLightAreas=169`, `areaGlobalLightingAreas=169`, `areaGlobalLightingFields=3380`, and `areaShadowOpacityAreas=169`.
- Raw tile-light field audit across `mainLight1`, `mainLight2`, `sourceLight1`, and `sourceLight2`: `54828` raw fields scanned, `14117` non-zero refs, `14117` decoded refs, `1` decoded black RGB entry, and `14116` renderable decoded refs.
- Source split: `4998` decoded main-light refs came from `runtime-source/vanilla/nwn_base.key/lightcolor.2da`; `9119` decoded source-light refs came from `runtime-source/vanilla/nwn_base.key/tilecolor.2da`.
- High-volume rows include source-light row `2` RGB `0.43,0.06,0.06` (`3237` sourceLight1 refs, `3234` sourceLight2 refs), source-light row `3` RGB `0.49,0.29,0.07`, main-light row `13` RGB `0.18,0.84,0.94`, main-light row `5` RGB `0.96,0.87,0.03`, and main-light row `30` RGB `1.85,1.2,0.6`.
- Sample decoded tile: `area_appearance:tile:0`, tile `159`, tileset `tin01`, model `tin01_l01_03`, has `mainLight1=4` from `lightcolor.2da` RGB `0.94,0.94,0.5`, `mainLight2=14` RGB `1.3,1.92,1.82`, and `sourceLight1/sourceLight2=3` from `tilecolor.2da` RGB `0.49,0.29,0.07`.

Current remaining blocker after this loop:

- The broad data sweep closes the earlier unknown about black/disabled rows and source-table split for the imported dataset. It still does not recover Aurora's retail static-lighting bake formula or prove pixel parity for tile-light projection.

## Follow-up loop - post-proof blocker refresh 2026-07-02

Rechecked after the ProgFX vision and ItemPropertyLight red/bright proof loops:

- Local decompilation search for `ShadowSize`, `LightOffset`, `LightColor`, `lightCutoffRangeMultiplier`, `lightFalloffFactor`, `falloff`, and `atten` still returns only the known shader/MDL-light anchors:
  - `C:\Projects\New Folder\export\decompiled_all.c:615855` / `899835` for `lightQuadraticAtten[%d]`.
  - Known `lightcolor` / `tilecolor` table-load/read anchors at `40249-40265`, `210241`, `253238`, and `453281`.
- `nwscript.nss` still only exposes the known static-lighting API boundary for placeable on/off:
  - `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8753-8765` documents `SetPlaceableIllumination`, `GetPlaceableIllumination`, and `RecomputeStaticLighting`.
- Local MDL/source search still finds flare parser/source fields but no imported content sample with a true generated flare gate:
  - Decompilation anchors `C:\Projects\New Folder\export\decompiled_all.c:883241-883285` preserve `generateflare`, `flaresizes`, `flarepositions`, `flarecolorshifts`, `flareradius`, and `fadingLight`.
  - Current content search finds real `lensflares 0` rows and flare texture references, but no natural `generateflare 1` / `lensflares 1` sample in the mirrored module sources.
- Web search for exact `generateflare` / `lensflares` NWN MDL samples did not return a usable source sample to admit into this repo.

Current remaining blocker classification:

- Blocked pending retail/toolset/decompiled evidence: exact `placeables.2da LightColor` falloff/radius, exact `ShadowSize` projection/opacity, tile/static-lighting bake parity, item/equipment light falloff/RGB calibration and any different retail item-light shadow rule, true ProgFX Type 4 retail vision mutation/scheduler, and a natural `generateFlare=true` source/runtime sample.
- Still implementable without guessing if new evidence appears: add the natural `LightState=0` imported sample, true `generateFlare=true` content sample, or retail/toolset capture oracle into the existing proof routes and matrix.

## Follow-up loop - scene PointLight diagnostic bypass

Question: is there an easier bypass for the missing retail global active-light arbiter?

Answer implemented in this loop: yes, as a diagnostic/proof-mode only. The renderer now exposes a scene-wide `THREE.PointLight` audit that reports the real runtime lights and Aurora source lanes without claiming or applying the unrecovered retail cross-lane ordering.

Code changes:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Traverses the active scene and classifies actual point lights into `placeables-2da-light`, `item-property-light`, `source-mdl-light-node`, `terrain-tile-light`, or `generic-three-point-light`.
  - Writes `scenePointLight*` dataset/userData fields, including lane counts, source-backed counts, preview budget cap/source/proof, preview accepted/dropped counts, and samples with lane/role/name/source/color/intensity/distance/shadow.
  - Writes `sceneNonPointLightRequest*` fields for source-backed light/vision requests that are intentionally not real scene lights; ProgFX Type 4 light and vision records are reported as `progfx-type4-light-request` / `progfx-type4-vision-request`.
  - Uses `scenePointLightProofStatus=preview-only-scene-point-light-audit-no-retail-cross-lane-ordering`.
  - Uses `scenePointLightPreviewBudgetCapProofStatus=source-backed-active-light-slot-cap-max-128`.
  - Uses `scenePointLightRetailOrderingStatus=blocked-no-recovered-retail-cross-lane-active-light-ordering`.
  - Uses `scenePointLightBudgetMode=diagnostic-only-no-pointlight-mutation`, so no light is silently disabled by this bypass.
- `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx`
  - Exposes the new scene-wide proof fields for candle/campfire/placeable captures.
- `frontend/src/modules/creatures/dev/CreatureLightPreviewRunner.tsx`
  - Exposes the same proof fields for equipped `ItemPropertyLight` captures.
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
  - Writes the same scene-wide diagnostics after terrain rebuilds, object rebuilds, and the debounced runtime diagnostic refresh, so the real workspace runtime exposes the proof fields as well as the dev routes.
- `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`
  - Exposes the same scene diagnostic fields for ProgFX Type 4 VFX fixture routes, including the proof that vision/light requests do not become generic `THREE.PointLight` instances.
- `frontend/tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`
  - Verifies mixed lane detection and that the diagnostic does not mutate lights.

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\candle-scene-point-light-diagnostics.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\candle-scene-point-light-diagnostics.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\campfire-scene-point-light-diagnostics-retry.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\campfire-scene-point-light-diagnostics-retry.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\creature-item-red-bright-scene-point-light-diagnostics.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\creature-item-red-bright-scene-point-light-diagnostics.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\campfire-scene-point-light-diagnostics-cap-source.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\campfire-scene-point-light-diagnostics-cap-source.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\creature-item-red-bright-scene-point-light-diagnostics-cap-source.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\creature-item-red-bright-scene-point-light-diagnostics-cap-source.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\progfx-blindvision-scene-non-point-light-request.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-point-light-diagnostics-2026-07-02\progfx-blindvision-scene-non-point-light-request.frame.json`

Frame facts:

- Candle `plc_bhp_arcn1a`: `renderStatus=ready`, `canvasNonblank=true`, `scenePointLightCount=1`, `sceneSourceBackedPointLightCount=1`, `scenePointLightLanes=placeables-2da-light`, sample `name=PaleDarkYellow`, `source=lightcolor.2da.RGB`, `color=0.94,0.94,0.5`, `intensity=1`, `distance=2.25`.
- Campfire `plc_plc_i06`: `renderStatus=ready`, `canvasNonblank=true`, `scenePointLightCount=1`, `sceneSourceBackedPointLightCount=1`, `scenePointLightLanes=placeables-2da-light`, `scenePointLightPreviewBudgetCapSource=C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30 caps light slots at 0x80 unless runtime max-lights is lower`, `scenePointLightPreviewBudgetCapProofStatus=source-backed-active-light-slot-cap-max-128`, sample `name=PaleYellow`, `source=lightcolor.2da.RGB`, normalized point-light color `1,1,0.5263`, source placeable sample `color=1.9,1.9,1`, `intensity=1.9`, `distance=2.25`.
- Creature equipped item light: `renderStatus=ready`, `canvasNonblank=true`, `scenePointLightCount=1`, `sceneSourceBackedPointLightCount=1`, `scenePointLightLanes=item-property-light`, `scenePointLightPreviewBudgetCapSource=C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30 caps light slots at 0x80 unless runtime max-lights is lower`, `scenePointLightPreviewBudgetCapProofStatus=source-backed-active-light-slot-cap-max-128`, sample `name=VFX_DUR_LIGHT_RED_20`, `source=nwscript.nss ItemPropertyLight(int nBrightness, int nColor)`, `color=1,0.18,0.08`, `intensity=1.7`, `budgetRank=1`, `budgetAccepted=true`.
- ProgFX BlindVision owner-phase: `renderStatus=rendered`, `canvasNonblank=true`, `objectPixels=6632`, `progfxRow=329`, `progfxLabel=LightBlindvision`, `animationKind=vision`, `visionMode=Blind_Vision`, `priority=53`, `proximity=true`, `attachToScene=false`, `scenePointLightCount=0`, `sceneSourceBackedPointLightCount=0`, `sceneNonPointLightRequestCount=1`, `sceneNonPointLightRequestLanes=progfx-type4-vision-request`, sample includes `ownerRow=242`, `ownerLabel=VFX_DUR_BLINDVISION`, `notPlaceable=true`, `notMdl=true`, and `visualPreview=backend-render-contract-source-record-no-scene-light`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/creatures/CreatureLightPreviewRunner.test.ts tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` in `frontend`: passed, 16 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.

Current remaining blocker after this loop:

- The easy bypass is implemented for proof and debugging. A true Aurora retail global active-light arbiter remains blocked until a retail/decompiled ordering source proves how the engine sorts/drops competing tile, placeable, MDL, item/equipment, and effect-instance light lanes together.

## Follow-up loop - scene shadow diagnostic bypass

Question: can the shadow audit be made easier without guessing the retail projection formula?

Answer implemented in this loop: yes, as scene-wide diagnostics. The runtime now exposes where shadow sources are coming from and what proof lane they belong to, while still marking exact retail projection parity as blocked.

Code changes:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Adds `sceneShadow*` diagnostics next to the existing `scenePointLight*` proof fields.
  - Reports `PointLight.castShadow=true` source samples from MDL light nodes.
  - Reports unique placeable fast-shadow proxy samples, deduplicated by Aurora source object/status/`ShadowSize` so child meshes do not inflate counts.
  - Merges split proxy metadata, preserving source proof from the group and visual radius/opacity values from the render mesh.
  - Reports ARE shadow status/source/opacity/factor fields from `runtime.scene.userData`.
  - Uses `sceneShadowProofStatus=source-backed-scene-shadow-audit-preview-proxies-no-retail-projection-parity`.
  - Uses `sceneShadowRetailProjectionStatus=blocked-no-retail-shadow-volume-projection-parity`.
- `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx`
  - Exposes the scene-wide shadow proof fields for campfire/wall-torch captures.
- `frontend/src/modules/creatures/dev/CreatureLightPreviewRunner.tsx`
  - Exposes the same proof fields for equipped item-light captures.
- `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`
  - Exposes the same proof fields for VFX fixture routes.
- `frontend/tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`
  - Verifies MDL `castShadow` samples, ARE `ShadowOpacity/100` factor reporting, and placeable fast-shadow proxy metadata.

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\campfire-fast-shadow-area50-scene-shadow-diagnostics-v2.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\campfire-fast-shadow-area50-scene-shadow-diagnostics-v2.frame.json`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\vale-wall-torch-mdl-castshadow-scene-shadow-diagnostics-v2.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\vale-wall-torch-mdl-castshadow-scene-shadow-diagnostics-v2.frame.json`

Frame facts:

- Campfire `plc_plc_i06`: `renderStatus=ready`, `canvasNonblank=true`, `objectPixels=6510`, `sourceMdlPayloadReady=false`, `sceneShadowProofStatus=source-backed-scene-shadow-audit-preview-proxies-no-retail-projection-parity`, `sceneShadowRetailProjectionStatus=blocked-no-retail-shadow-volume-projection-parity`, `sceneShadowPointLightCastShadowCount=0`, `sceneShadowFastShadowProxyCount=1`, `sceneShadowFastShadowDisabledCount=0`, sample `ShadowSize=1`, `shadowSource=placeables.2da.ShadowSize`, `shadowProof=source-backed-placeables-2da-value-formula-unverified`, `radius=0.18`, `baseOpacity=0.135`, `opacity=0.0675`, `areaOpacity=50`, `areaFactor=0.5`.
- Campfire ARE factor source in the same frame: `sceneShadowAreaOpacity=50`, `sceneShadowAreaOpacityFactor=0.5`, `sceneShadowAreaOpacitySource=ARE.ShadowOpacity read/write at decompiled_all.c:255224/255904; normalized to shadowOpacity/100 at decompiled_all.c:256306`, `sceneShadowAreaOpacityFactorSource=decompiled_all.c:256306 stores ShadowOpacity/100, then shadow plane alpha multiplies that factor at decompiled_all.c:910844`.
- Wall torch `plc_plc_core_0060`: `renderStatus=ready`, `canvasNonblank=true`, `objectPixels=16561`, `sourceMdlPayloadReady=true`, `auroraLightNodes=torch_light12`, `sceneShadowPointLightCastShadowCount=1`, `sceneShadowFastShadowProxyCount=0`.
- Wall torch MDL shadow sample: `lane=source-mdl-light-node`, `name=torch_light12`, `proof=source-backed-mdl-shadow-pointlight-castShadow`, `sourceShadow=true`, `animatedShadowRadius=0`, `distance=2`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/creatures/CreatureLightPreviewRunner.test.ts tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` in `frontend`: passed, 17 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- `npm.cmd run build` in `frontend`: passed; Vite reported only the existing large-chunk warning.
- `git diff --check -- frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx frontend/src/modules/creatures/dev/CreatureLightPreviewRunner.tsx frontend/tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts frontend/tests/unit/app/App.vfxFixtureRunner.test.tsx frontend/tests/unit/modules/creatures/CreatureLightPreviewRunner.test.ts backend/docs/aurora-reverse/light-shadow-audit-runtime-proof-2026-07-01.md`: passed; Git reported only LF/CRLF warnings for pre-existing line-ending normalization.

Current remaining blocker after this loop:

- Scene-wide proof now identifies the active shadow source lane and source metadata. Exact retail shadow projection/volume/radius/opacity behavior remains blocked pending a recovered decompiled owner call-site or a retail/toolset oracle capture.

Negative decompilation/web audit for the same blocker:

- Web search for public `placeables.2da ShadowSize` / `LightOffset` / `LightColor` formula references did not return an admissible formula source.
- Local search in `C:\Projects\New Folder` found no decompiled `ShadowSize` / `shadowsize` field-name owner.
- The recovered ARE side remains source-backed: `ShadowOpacity` is read at `C:\Projects\New Folder\export\decompiled_all.c:255224`, written at `255904`, normalized at `256306`, and multiplied into `shadowplane` alpha at `910844`.
- The recovered MDL side remains source-backed: `shadowradius`, `shadowradiuskey`, and `shadowradiusbezierkey` parser strings are present at `C:\Projects\New Folder\export\decompiled_all.c:883088-883117`.
- The `shadowplane` renderer at `C:\Projects\New Folder\export\decompiled_all.c:910673-910872` builds the projected shadow geometry from runtime object/render-structure offsets and multiplies alpha by `_DAT_00d023b8`, but this pass did not recover a safe assignment from `placeables.2da.ShadowSize` into those offsets.
- Conclusion: keep `placeableTwoDaFastShadowProofStatus=preview-only-blocked-no-decompiled-shadowsize-formula`; do not promote preview radius/opacity to Aurora canonical behavior.

## Follow-up loop - area directional shadow proof route

Question: can the ARE/global shadow proof be made easier than driving the full Areas UI panel?

Answer implemented in this loop: yes, for emitter/source proof. A dev-only route now renders a processed AreaDetail through the same terrain renderer and exports the scene-wide shadow diagnostics directly, avoiding the flaky Areas panel `Opening...` wait while still using real backend/source data.

Code changes:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Adds `sceneShadowDirectionalLightCastShadowCount` and `sceneShadowDirectionalLightSamples`.
  - Counts actual `THREE.DirectionalLight` nodes created by ARE global lighting when `auroraTerrainAreaGlobalLightRole=diffuse` and `castShadow=true`.
  - Samples phase, `SunShadows`/`MoonShadows` source field, enabled/disabled status, implementation status, `ShadowOpacity`, normalized area factor, color, and intensity.
- `frontend/src/modules/areas/dev/AreaLightShadowPreviewRunner.tsx`
  - New route `/dev/area-light-shadow-preview?areaId=area__winds_study`.
  - Uses `processArea -> resolveAreaTileProcessContractReadiness -> mapBackendAreaToScene -> rebuildTerrainMesh -> writeAuroraScenePointLightDiagnostics`.
  - Applies the backend auth token to runtime model/texture loaders before terrain model loading, matching the existing catalog proof routes.
  - Waits for terrain model runtime status to settle out of `loading` before saving the frame snapshot.
  - Exports `data-area-global-shadow-*` and `data-scene-shadow-directional-light-*` fields plus a JSON frame script.
- `frontend/src/App.tsx`
  - Registers the route before auth redirect, matching the other dev proof runners.
- `backend/scripts/capture-areas-runtime-cdp.mjs`
  - Adds `sceneShadow*` fields to `lightShadowRuntimeDataset` so full Areas captures preserve the same proof fields when the normal UI path settles.
- `backend/scripts/capture-area-light-shadow-preview.cjs`
  - Captures the dev proof route as PNG plus frame JSON.
- `frontend/tests/unit/app/App.areaLightShadowPreviewRunner.test.tsx`
  - Verifies the new route does not auth-redirect in test mode.

Runtime proof artifacts:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\winds-study-area-light-shadow-preview.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\winds-study-area-light-shadow-preview.frame.json`

Rejected/non-promoted capture:

- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\winds-study-directional-shadow-scene-diagnostics.png`
- `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\winds-study-directional-shadow-scene-diagnostics.frame.json`
- Reason: the full Areas panel capture produced a fresh screenshot, but the runtime stayed `blank_builder_v1` / `areaTerrainAreaId=null` / `terrainRuntimeStatus=null`, so it is not accepted as ARE shadow proof.

Frame facts from the promoted route:

- `status=ready`, `areaId=area__winds_study`, `areaName=_winds_study`, `cacheHit=true`, `tileCount=4`, `objectCount=4`.
- Tile-process/runtime terrain proof: `tileProcessStatus=ready`, `tileProcessReadyCount=1`, `tileProcessBlockedCount=0`, `tileProcessBlockers=none`, `terrainRuntimeStatus=ready`.
- DOM terrain runtime dataset confirms `data-area-terrain-tile-model-loaded-count=4`, `data-area-terrain-tile-model-visible-mesh-count=4`, `data-area-terrain-tile-model-material-map-count=4`, `data-area-terrain-tile-model-loader-error-sample=none`, and `data-area-terrain-tile-model-runtime-status=ready`.
- Backend AreaDetail carries source ARE fields: `ShadowOpacity=50`, `IsNight=0`, `SunDiffuseColor=16777215`, `SunShadows=1`, and `MoonShadows=1`.
- Runtime area shadow fields: `areaGlobalLightingStatus=active`, `areaGlobalLightingPhase=sun`, `areaGlobalShadowStatus=enabled`, `areaGlobalShadowSourceField=SunShadows`, `areaGlobalShadowOpacity=50`, `areaGlobalShadowOpacityFactor=0.5`.
- Scene-wide directional shadow proof: `sceneShadowDirectionalLightCastShadowCount=1`.
- Directional sample: `lane=area-global-directional-shadow;name=terrain-area-global-diffuse-light;phase=sun;sourceField=SunShadows;status=enabled;implementation=three-directional-castShadow-flag-only-shadow-volume-not-ported;opacity=50;areaFactor=0.5;color=1,1,1;intensity=0.68`.
- `terrainRuntimeStatus=ready`, so the promoted screenshot shows the Area tile model loaded with material texture maps while proving the ARE directional shadow emitter/flag and source fields. It still does not claim retail shadow-volume projection parity.

Verification:

- `npx.cmd vitest tests/unit/app/App.areaLightShadowPreviewRunner.test.tsx tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/creatures/CreatureLightPreviewRunner.test.ts tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` in `frontend`: passed, 18 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- Headless Chrome DOM proof for `/dev/area-light-shadow-preview?areaId=area__winds_study`: `data-render-status=ready`, `data-scene-shadow-directional-light-cast-shadow-count=1`, and sample source field `SunShadows`.
- `node backend/scripts/capture-area-light-shadow-preview.cjs`: passed and wrote the promoted PNG/frame artifacts with `terrainRuntimeStatus=ready`.

Current remaining blocker after this loop:

- The easy bypass now proves the ARE global directional shadow source as a real runtime `DirectionalLight.castShadow=true` on a loaded tile model. Actual shadow projection/pixel parity remains blocked because the implementation status is still `three-directional-castShadow-flag-only-shadow-volume-not-ported`, and no visible retail/toolset oracle is available for the shadow-volume projection.

## Follow-up loop - terrain tile shadow receivers

Question: does the easy proof route only prove an ARE light emitter, or is loaded terrain geometry also configured to receive that light's shadows?

Implementation:

- `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts`
  - Marks every loaded terrain tile mesh with `receiveShadow=true`.
  - Adds `auroraTerrainTileShadowReceiver*` userData on the loaded model and meshes.
  - Adds terrain runtime snapshot/dataset fields:
    - `areaTerrainTileShadowReceiverMeshCount`
    - `areaTerrainTileShadowReceiverStatus`
    - `areaTerrainTileShadowReceiverSource`
    - `areaTerrainTileShadowReceiverSample`
  - Source/status is intentionally scoped to Three preview receiver plumbing: `ARE SunShadows/MoonShadows directional-light preview receiver; retail shadow-plane projection not recovered`.
- `frontend/src/modules/areas/dev/AreaLightShadowPreviewRunner.tsx`
  - Exposes the receiver count/status/source/sample in the proof-route DOM and JSON frame.
- `backend/scripts/capture-area-light-shadow-preview.cjs`
  - Prints the receiver proof fields in the capture summary.
- `frontend/tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts`
  - Adds a cached loaded tile-model test proving `receiveShadow=true`, mesh userData, snapshot count/sample, and dataset fields.

Runtime proof:

- `node backend/scripts/capture-area-light-shadow-preview.cjs`: passed and refreshed:
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\winds-study-area-light-shadow-preview.png`
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\winds-study-area-light-shadow-preview.frame.json`
- Fresh frame facts:
  - `status=ready`
  - `terrainRuntimeStatus=ready`
  - `sceneShadowDirectionalLightCastShadowCount=1`
  - directional sample source is `sourceField=SunShadows`
  - `sceneShadowProgFxType4ShadowRequestCount=0`
  - `terrainTileShadowReceiverMeshCount=4`
  - `terrainTileShadowReceiverStatus=three-preview-terrain-receiveShadow-enabled`
  - `terrainTileShadowReceiverSample=area__winds_study:tile:0:ground01:receiveShadow=1|area__winds_study:tile:1:ground01:receiveShadow=1|area__winds_study:tile:2:ground01:receiveShadow=1|area__winds_study:tile:3:ground01:receiveShadow=1`

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run` in `frontend`: passed, 10 tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.areaLightShadowPreviewRunner.test.tsx --run` in `frontend`: passed, 15 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.

Current remaining blocker after this loop:

- The implementation now proves the renderer has both sides needed for Three preview shadow plumbing: ARE global `DirectionalLight.castShadow=true` and loaded terrain tile meshes with `receiveShadow=true`. It still does not prove Aurora retail shadow-plane/volume projection parity, because that projection path remains marked `three-directional-castShadow-flag-only-shadow-volume-not-ported`.

## Follow-up loop - ProgFX Type 4 shadow request diagnostics

Question: are ProgFX Type 4 `Param3` cast-shadow requests preserved in scene-wide shadow diagnostics without creating fake point lights or fake shadows?

Implementation:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Adds `castShadows` and `parameterSource` to non-PointLight ProgFX Type 4 request samples.
  - Adds shadow-only diagnostics:
    - `sceneShadowProgFxType4ShadowRequestCount`
    - `sceneShadowProgFxType4ShadowRequestSamples`
  - Counts only Type 4 requests with `castShadows=true`, deduped across group/mesh userData.
  - Does not create or mutate any `THREE.PointLight`; this remains diagnostic-only.
- `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`
- `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx`
- `frontend/src/modules/creatures/dev/CreatureLightPreviewRunner.tsx`
- `frontend/src/modules/areas/dev/AreaLightShadowPreviewRunner.tsx`
  - Expose the new scene-shadow ProgFX fields as DOM/proof attributes.
- `backend/scripts/capture-vfx-app-route-cdp.mjs`
- `backend/scripts/capture-areas-runtime-cdp.mjs`
- `backend/scripts/capture-area-light-shadow-preview.cjs`
  - Preserve the new proof fields in captured status/frame data.

Runtime proof:

- Headless DOM proof for `/dev/vfx-fixture/vfx-retail-progfx-type4-blue-5m-owner-phase?time=0.75&seed=7`:
  - `data-render-status=rendered`
  - `data-progfx-type4-cast-shadows=false`
  - `data-scene-non-point-light-request-count=1`
  - non-point sample includes `castShadows=false` and the Type 4 parameter source string for `Param3 cast shadows`
  - `data-scene-shadow-progfx-type4-shadow-request-count=0`
  - `data-scene-point-light-count=0`

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/creatures/CreatureLightPreviewRunner.test.ts tests/unit/app/App.areaLightShadowPreviewRunner.test.tsx --run` in `frontend`: passed, 18 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.

Current remaining blocker after this loop:

- ProgFX Type 4 shadow intent is now preserved as source/request diagnostics. Retail runtime scheduling, scene attachment/proximity behavior, and any actual shadow projection from Type 4 remain blocked until a retail/runtime oracle is available.

## Follow-up loop - negative source refresh for unresolved projection formulas

Question: after the local runtime gaps above were closed, did another decompilation/web pass expose the missing canonical formulas?

Refresh result:

- Local `C:\Projects\New Folder` search still finds:
  - ARE `ShadowOpacity` strings and read/write/normalization anchors.
  - MDL `shadowradius`, `shadowradiuskey`, and `shadowradiusbezierkey` parser strings.
  - Renderer/shader anchors `vs_shadowplane`, `fs_shadowplane`, `_DAT_00d023b8`, `lightQuadraticAtten[%d]`, `lightCutoffRangeMultiplier`, and `lightFalloffFactor`.
  - NWScript `SetPlaceableIllumination`, `GetPlaceableIllumination`, and `RecomputeStaticLighting` comments.
- Local `C:\Projects\New Folder` search still does not find an admitted `ShadowSize`/`shadowsize` owner or a safe `placeables.2da.ShadowSize -> projection/falloff/opacity` formula.
- Local `C:\Projects\New Folder` search did not surface `ProgFX`/`progfx`/`Param3` strings in the decompiled export; current ProgFX Type 4 Param source remains table/parser-side evidence, not a recovered retail scheduler call-site.
- Web search for `progfx.2da Param3`, `placeables.2da ShadowSize`, and `SetPlaceableIllumination RecomputeStaticLighting` returned no usable new source in this pass.

Current remaining blocker after this loop:

- Do not promote exact retail falloff, `ShadowSize` projection/opacity, ProgFX Type 4 runtime shadow scheduling, or shadow-plane pixel parity. The current implementation remains source/request/runtime-proofed where possible and explicitly preview/blocked for the unrecovered formulas.

## Follow-up loop - self-contained area shadow frame

Question: does the promoted area shadow frame prove tile model loading/material binding directly, or only through separate DOM inspection?

Implementation:

- `frontend/src/modules/areas/dev/AreaLightShadowPreviewRunner.tsx`
  - Adds these terrain model fields to the route snapshot, DOM, and JSON frame:
    - `terrainTileModelLoadedCount`
    - `terrainTileModelVisibleMeshCount`
    - `terrainTileModelMaterialMapCount`
    - `terrainTileModelVisibleMeshSample`
- `backend/scripts/capture-area-light-shadow-preview.cjs`
  - Prints the same fields in the capture summary.
  - Uses an isolated temporary Chrome `--user-data-dir` plus background-network/extension disables so headless capture does not hang on an existing Chrome profile.

Runtime proof:

- `node backend/scripts/capture-area-light-shadow-preview.cjs`: passed in 24s and refreshed:
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\winds-study-area-light-shadow-preview.png`
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\scene-shadow-diagnostics-2026-07-02\winds-study-area-light-shadow-preview.frame.json`
- Fresh frame facts:
  - `status=ready`
  - `terrainRuntimeStatus=ready`
  - `terrainTileModelLoadedCount=4`
  - `terrainTileModelVisibleMeshCount=4`
  - `terrainTileModelMaterialMapCount=4`
  - visible mesh sample includes `model=tcm01_a20_04`, `node=ground01`, `material=Aurora material tcm01_cobble01`, and `texture=tcm01_cobble01`
  - `sceneShadowDirectionalLightCastShadowCount=1`
  - directional sample source remains `sourceField=SunShadows`
  - `terrainTileShadowReceiverMeshCount=4`

Verification:

- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- `npx.cmd vitest tests/unit/app/App.areaLightShadowPreviewRunner.test.tsx tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run` in `frontend`: passed, 11 tests.
- `node --check backend/scripts/capture-area-light-shadow-preview.cjs`: passed.

Current remaining blocker after this loop:

- The area frame is now self-contained for source-backed ARE shadow emitter, loaded tile meshes, material maps, and Three preview shadow receivers. It still does not prove retail shadow-plane/volume projection or pixel parity.

## Follow-up loop - ItemPropertyLight shadow-policy proof

Question: can the item/equipment light gap be handled more simply without inventing a retail shadow rule?

Implementation:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Adds scene-wide item/equipment light shadow-policy diagnostics:
    - `sceneShadowItemPropertyLightShadowPolicyCount`
    - `sceneShadowItemPropertyLightShadowPolicySamples`
  - Counts only real ItemPropertyLight `THREE.PointLight` instances, not the helper core/halo/range meshes.
  - Samples include the Aurora source lane, related `VFX_DUR_LIGHT_*` name, brightness/color labels, `castShadow=false`, equipment resref/attachment, and the unresolved shadow-rule blocker.
- `frontend/src/modules/creatures/dev/CreatureLightPreviewRunner.tsx`
  - Exposes direct DOM/frame fields:
    - `itemPropertyLightShadowStatus`
    - `itemPropertyLightShadowProofStatus`
    - `itemPropertyLightNoSelfGlowProofStatus`
  - Exposes the scene shadow-policy count/sample in the same proof frame.
- `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`
- `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx`
- `frontend/src/modules/areas/dev/AreaLightShadowPreviewRunner.tsx`
  - Expose the same scene shadow-policy diagnostics so proof routes share one light/shadow truth layer.
- `backend/scripts/capture-creature-light-preview-cdp.mjs`
  - Requires `itemPropertyLightShadowStatus=not-enabled`, `itemPropertyLightShadowProofStatus=blocked-no-decompiled-item-light-shadow-rule`, and `sceneShadowItemPropertyLightShadowPolicyCount>=1`.
  - Writes those values into the CDP proof frame.
- `backend/scripts/capture-area-light-shadow-preview.cjs`
  - Prints the new scene shadow-policy fields in the area capture summary.

Runtime proof:

- `node backend/scripts/capture-creature-light-preview-cdp.mjs --route "/dev/creature-light-preview?equipmentLights=1&equipmentLightBrightness=bright&equipmentLightColor=red" --name creature-equipped-itemproperty-light-shadow-policy`: passed and wrote:
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\creature-itemproperty-light\creature-equipped-itemproperty-light-shadow-policy.png`
  - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\creature-itemproperty-light\creature-equipped-itemproperty-light-shadow-policy.frame.json`
- Fresh frame facts:
  - `renderStatus=ready`
  - `canvasNonblank=true`
  - `objectPixels=38846`
  - `equipmentLightSource=utc.Equip_ItemList.itemRuntime.itemProperties`
  - `equipmentLightProofStatus=source-backed-equipped-itemproperty-light-preview`
  - `pointLightCount=1`
  - `scenePointLightLanes=["item-property-light"]`
  - `pointLightColor=1,0.18,0.08`
  - `pointLightIntensity=1.7`
  - `pointLightDistance=2`
  - `pointLightCastShadow=false`
  - `itemPropertyLightColorLabel=Red`
  - `itemPropertyLightBrightnessLabel=Bright`
  - `itemPropertyLightRelatedVisualEffectConstant=VFX_DUR_LIGHT_RED_20`
  - `itemPropertyLightRelatedProgFxAnimation=Red_20m`
  - `itemPropertyLightBrightnessRadiusMeters=20`
  - `itemPropertyLightRadiusProofStatus=source-backed-retail-key-bif-iprp-lightcost-token-radius`
  - `itemPropertyLightNoSelfGlowProofStatus=source-backed-no-item-mesh-glow`
  - `itemPropertyLightShadowStatus=not-enabled`
  - `itemPropertyLightShadowProofStatus=blocked-no-decompiled-item-light-shadow-rule`
  - `sceneShadowItemPropertyLightShadowPolicyCount=1`
  - shadow-policy sample includes `lane=item-property-light`, `name=VFX_DUR_LIGHT_RED_20`, `brightness=Bright`, `color=Red`, `castShadow=false`, `equipmentResRef=nw_wswmls001`, and `attachment=rhand_g`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/creatures/CreatureLightPreviewRunner.test.ts --run` in `frontend`: passed, 6 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- `node --check backend/scripts/capture-creature-light-preview-cdp.mjs`: passed.
- `node --check backend/scripts/capture-area-light-shadow-preview.cjs`: passed.

Current remaining blocker after this loop:

- Item/equipment ItemPropertyLight is now proofed as a source-backed PointLight lane with Aurora table/NWScript radius, color, budget, no-self-glow, and explicit no-shadow policy diagnostics. The exact retail item-light falloff, RGB calibration, and any retail shadow rule remain blocked because no decompiled or retail-runtime call-site was recovered for them.

## Follow-up loop - placeable light proof capture shortcut

Question: can the placeable light proof be made simpler without bypassing Aurora data?

Implementation:

- `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx`
  - Adds model/texture proof fields to the catalog preview snapshot:
    - `placeableModelStatus`
    - `placeableModelLoadPhase`
    - `placeableModelTextureStatus`
    - `placeableModelTextureLoaded`
    - `placeableModelTextureCount`
    - `placeableModelTextureSource`
  - Serializes those fields into the existing `devFrameJson` proof script.
- `backend/scripts/capture-vfx-app-route-cdp.mjs`
  - Seeds builder auth through the dev proxy, so the proof route does not require manual login.
  - Captures CDP network events into `networkSummary`.
  - Reads the route-level `devFrameJson`, model texture state, and `devPlaceableTwoDaLightProofReady`.
  - Accepts the placeable-2da light proof once the canvas is ready/nonblank, object pixels are present, and the source-backed placeable light is active. Texture status remains recorded separately and is not hidden.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Adds a bounded placeable texture-reference wait wrapper for normal placeable model material texture requests.

Runtime proof:

- Candle `plc_bhp_arcn1a`:
  - Screenshot: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\candle-plc-bhp-arcn1a-light-proof.png`
  - Frame: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\candle-plc-bhp-arcn1a-light-proof.frame.json`
  - Fresh frame facts:
    - `capturedAt=2026-07-02T11:00:02.029Z`
    - `domStatus.ok=true`
    - `devRenderStatus=ready`
    - `devCanvasNonblank=true`
    - `devObjectPixels=8139`
    - `devPlaceableModelTextureStatus=applied`
    - `devPlaceableModelTextureSource=dds-dxt5`
    - `devPlaceableModelTextureSettled=true`
    - `devPlaceableTwoDaLightProofReady=true`
    - `devPlaceableTwoDaLightStatus=active`
    - `devPlaceableTwoDaLightSourceCount=1`
    - `devPlaceableTwoDaLightPointLightCount=1`
    - `devPlaceableTwoDaLightFastShadowCount=1`
    - `label=PaleDarkYellow`
    - `color=0.94,0.94,0.5`
    - `toolsetColor=0.59,0.56,0.37`
    - `preview=0.94,0.94,0.5`
    - `offset=0,0.375,0`
    - `shadow=1`
    - scene point sample: `lane=placeables-2da-light;role=placeables-2da-point-light;name=PaleDarkYellow;source=lightcolor.2da.RGB;color=0.94,0.94,0.5;intensity=1;distance=2.25;castShadow=false`
- Campfire `plc_plc_i06`:
  - Screenshot: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-plc-plc-i06-light-proof.png`
  - Frame: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-plc-plc-i06-light-proof.frame.json`
  - Fresh frame facts:
    - `capturedAt=2026-07-02T10:58:45.678Z`
    - `domStatus.ok=true`
    - `devRenderStatus=ready`
    - `devCanvasNonblank=true`
    - `devObjectPixels=6818`
    - `devTextureUrlCount=10`
    - `devPlaceableModelTextureStatus=loading`
    - `devPlaceableModelTextureSettled=false`
    - `devPlaceableTwoDaLightProofReady=true`
    - `devPlaceableTwoDaLightStatus=active`
    - `devPlaceableTwoDaLightSourceCount=1`
    - `devPlaceableTwoDaLightPointLightCount=1`
    - `devPlaceableTwoDaLightFastShadowCount=1`
    - `label=PaleYellow`
    - source `color=1.9,1.9,1`
    - `toolsetColor=0.94,0.94,0.77`
    - normalized preview `preview=1,1,0.526316`
    - `offset=0.120356,0.097327,0.005501`
    - `shadow=1`
    - scene point sample: `lane=placeables-2da-light;role=placeables-2da-point-light;name=PaleYellow;source=lightcolor.2da.RGB;color=1,1,0.5263;intensity=1.9;distance=2.25;castShadow=false`

Current remaining blocker after this loop:

- The shortcut is acceptable for runtime proof only: it removes manual login/clicking and records the exact frame state. It does not replace Aurora source rules.
- Candle placeable light is now proofed both visually and through `devFrameJson`.
- Campfire placeable light is source-backed and proofed as an active `placeables.2da` light lane, but the campfire material/model proof is not complete because the frame still reports `devPlaceableModelTextureStatus=loading` and `devPlaceableModelTextureSettled=false` for 10 texture URLs.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to fast-shadow radius/opacity formula
  - retail shadow projection/volume parity
  - decompiled confirmation for default `LightState`
  - final campfire multi-texture loader settling proof

## Follow-up loop - placeable texture proof settled

Question: was the remaining campfire/candle screenshot problem a missing Aurora light rule or a stuck texture proof path?

Implementation:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Treats failed or stalled material-map texture requests as a resolved `null` entry instead of letting one rejected promise keep the whole `Promise.all(...)` path in permanent `loading`.
  - Applies the same bounded wait/catch rule to the single fallback texture path used by simple candle-style placeables.
- `backend/scripts/capture-vfx-app-route-cdp.mjs`
  - Adds `--requirePlaceableTextureSettled true` for stricter visual proof captures.
  - In strict mode, catalog placeable proof no longer returns early just because the source-backed `placeables.2da` light is active; it waits for `applied`, `partial`, `missing`, `fallback`, `skipped`, or `not-applicable`.
  - Treats `partial` as a settled texture status, so missing optional maps do not hang capture forever.

Runtime proof:

- Candle `plc_bhp_arcn1a` settled proof:
  - Screenshot: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\candle-plc-bhp-arcn1a-light-proof-texture-settled.png`
  - Frame: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\candle-plc-bhp-arcn1a-light-proof-texture-settled.frame.json`
  - Fresh frame facts:
    - `capturedAt=2026-07-02T11:13:35.833Z`
    - `renderStatus=ready`
    - `canvasNonblank=true`
    - `objectPixels=8139`
    - `modelStatus=loaded`
    - `loadPhase=complete`
    - `textureStatus=applied`
    - `textureSource=dds-dxt5`
    - `twoDaLightStatus=active`
    - `twoDaLightPointLightCount=1`
    - `twoDaLightFastShadowCount=1`
    - scene point sample: `lane=placeables-2da-light;role=placeables-2da-point-light;name=PaleDarkYellow;source=lightcolor.2da.RGB;color=0.94,0.94,0.5;intensity=1;distance=2.25;castShadow=false`
- Campfire `plc_plc_i06` settled proof:
  - Screenshot: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-plc-plc-i06-light-proof-texture-settled.png`
  - Frame: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-plc-plc-i06-light-proof-texture-settled.frame.json`
  - Fresh frame facts:
    - `capturedAt=2026-07-02T11:09:48.042Z`
    - `renderStatus=ready`
    - `canvasNonblank=true`
    - `objectPixels=6510`
    - `modelStatus=loaded`
    - `loadPhase=complete`
    - `textureStatus=applied`
    - `textureSource=dds-dxt1,dds-bc5,dds-bc4,dds-dxt5,tpc-dxt5`
    - `twoDaLightStatus=active`
    - `twoDaLightPointLightCount=1`
    - `twoDaLightFastShadowCount=1`
    - scene point sample: `lane=placeables-2da-light;role=placeables-2da-point-light;name=PaleYellow;source=lightcolor.2da.RGB;color=1,1,0.5263;intensity=1.9;distance=2.25;castShadow=false`

Current remaining blocker after this loop:

- The campfire/candle material proof gap is closed for these runtime examples: both screenshots now have settled/applied model textures and source-backed active placeable lights.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to fast-shadow radius/opacity formula
  - retail shadow projection/volume parity
  - decompiled confirmation for default `LightState`

## Follow-up loop - LightState provenance and ordering blocker split - 2026-07-02

Question: can the remaining default `LightState` and cross-lane ordering gaps be implemented without inventing Aurora behavior?

New source/decomp checks:

- `C:\Projects\New Folder\export\decompiled_all.c` / `strings.tsv` were re-searched for `LightState`, `light state`, `illumination`, `placeableillumination`, `ShadowSize`, `lightCutoffRangeMultiplier`, and `lightFalloffFactor`.
- Positive local anchors remain:
  - `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8753-8765` documents `SetPlaceableIllumination`, `GetPlaceableIllumination`, and the `RecomputeStaticLighting` requirement.
  - `C:\Projects\New Folder\export\strings.tsv:16505-16506` contains only the renderer-setting strings `lightCutoffRangeMultiplier` and `lightFalloffFactor`; no recovered placeable `ShadowSize` formula is attached to them.
  - `C:\Projects\New Folder\export\decompiled_all.c:865404-865409` and `883088-883117` still prove MDL light-node radius/quadratic attenuation and `shadowradius`, not `placeables.2da ShadowSize`.
- Negative result: no decompiled `LightState` default initializer or `placeables.2da ShadowSize -> radius/opacity/projection` formula was recovered in this pass.
- External xoreos PR #595 (`GRAPHICS: Lights`, open as of downloaded metadata `2024-11-10T11:29:20Z`) was inspected as non-primary context only. Its light manager is WIP, ignores priority, defaults to 8 lights, and is not a retail NWN ordering oracle.

Implementation:

- `backend/src/modules/catalog/application/catalog-processing.helpers.ts`
  - `buildPlaceableRuntimeProjection` now emits `state.lightState=1` when UTP metadata lacks `LightState`, but records it as `lightStateSource=aurora-web-default-on-when-utp-lightstate-missing`, `lightStateProofStatus=default-assumed-no-decompiled-lightstate-default`, and `lightStateDefaulted=true`.
  - Present UTP values remain source-backed: `lightStateSource=utp.LightState`, `lightStateProofStatus=source-backed-utp-lightstate`, `lightStateDefaulted=false`.
- `frontend/src/modules/placeables/contracts.ts` and `frontend/src/modules/placeables/adapters/httpPlaceableApiPort.ts`
  - Frontend API contracts now preserve `lightStateSource`, `lightStateProofStatus`, and `lightStateDefaulted`.
- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Placeable light userData now preserves the runtime source/proof/default fields instead of converting every numeric runtime value into `placeableRuntime.state.lightState parsed from placed instance`.
  - Default-on fallback remains visible as an unproven Aurora default, not a decompiled rule.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Placeable light diagnostics now include `lightStateDefaulted=...` in samples for capture/frame proof.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - Renderer active-light budget remains source-backed only for the recovered 128 slot cap.
  - Cross-lane ordering is now split into its own coverage key, `renderer-active-light-ordering`, with `blocked-no-recovered-retail-cross-lane-active-light-ordering`.

Verification:

- `npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/catalog-processing.helpers.spec.ts -t "PlaceableRuntimeProjection"` in `backend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/placeables/httpPlaceableApiPort.test.ts --run -t "processes placeable"` in `frontend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|missing UTP LightState|runtime LightState|static lighting preview"` in `frontend`: passed, 4 focused tests.
- `npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts` in `backend`: passed, 4 tests.
- `npx.cmd tsc -p tsconfig.json --noEmit --pretty false` in `backend`: passed.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.

Current remaining blocker after this loop:

- Closed in this loop: `LightState` default provenance is now explicit and capture-readable; cross-lane active-light ordering can no longer be confused with the source-backed 128 slot cap.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to fast-shadow radius/opacity/projection formula
  - retail shadow-volume/projection parity
  - decompiled confirmation for default `LightState`
  - full retail ordering between tile/placeable/MDL/item/VFX lanes

## Follow-up loop - full lane coverage diagnostics and shadow projection marker - 2026-07-02

Question: can the current implementation prove that every requested light lane is observed without claiming the missing retail ordering/projection formulas?

Additional source checks:

- Local decompilation anchor for illumination propagation:
  - `C:\Projects\New Folder\export\decompiled_all.c:846642` compares `propagateillumination`.
  - `C:\Projects\New Folder\export\decompiled_all.c:846643-846644` calls the render-object virtual path at offset `+0xc0` when the object is active.
  - This proves the runtime propagation hook, not the default `LightState` value.
- Local Toolset/decomp anchors for placeable tables:
  - `C:\Projects\New Folder\export\decompiled_all.c:376844-377120` opens `placeables` and reads table rows for Toolset UI static/model state.
  - `C:\Projects\New Folder\export\decompiled_all.c:40976-41071` reads `lightcolor.2da` `TOOLSETRED/GREEN/BLUE`.
  - No recovered call in this pass maps `placeables.2da ShadowSize` to final shadow radius/opacity/projection.
- External reimplementation check:
  - xoreos `src/engines/nwn/placeable.cpp` / `placeable.h` was inspected as non-primary retail context only (`https://xoreos.org/doxygen/d0/d6d/nwn_2placeable_8cpp_source.html`, `https://xoreos.org/doxygen/d8/dfd/nwn_2placeable_8h_source.html`).
  - It loads basic placeable appearance/state, but does not provide a retail `LightColor/ShadowSize` falloff, projection, or cross-lane ordering oracle.

Implementation:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Added required retail-ordering lane list: `terrain-tile-light`, `placeables-2da-light`, `source-mdl-light-node`, `item-property-light`, `progfx-type4-light-request`.
  - Runtime diagnostics now expose observed/missing lane sets and `retailOrderingCoverageStatus`.
  - The status becomes `observed-required-tile-placeable-mdl-item-vfx-lanes-ordering-still-blocked` only when all requested lanes are present; it still keeps `retailOrderingStatus=blocked-no-recovered-retail-cross-lane-active-light-ordering`.
  - Dataset/frame fields now carry these values for screenshot proof.
- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Fast-shadow proxy userData now includes `placeableTwoDaFastShadowProjectionStatus=blocked-no-retail-shadow-volume-projection-parity`.
  - The parent placeable light group propagates this value into aggregate diagnostics.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Placeable light sample strings now include `fastShadowProjectionStatus=...`.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` in `frontend`: passed, 4 tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|missing UTP LightState|runtime LightState|static lighting preview"` in `frontend`: passed, 4 focused tests.
- `npx.cmd vitest tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` in `frontend`: passed, 13 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- Runtime capture:
  - Screenshot: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-light-lane-ordering-coverage-proof-2026-07-02.png`
  - Frame: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-light-lane-ordering-coverage-proof-2026-07-02.frame.json`
  - Frame facts:
    - `renderStatus=ready`
    - `canvasNonblank=true`
    - `placeableModelTextureStatus=applied`
    - `placeableTwoDaLightStatus=active`
    - `placeableTwoDaLightPointLightCount=1`
    - `placeableTwoDaLightFastShadowCount=1`
    - `fastShadowProjectionStatus=blocked-no-retail-shadow-volume-projection-parity`
    - `scenePointLightRetailOrderingStatus=blocked-no-recovered-retail-cross-lane-active-light-ordering`
    - `scenePointLightRetailOrderingRequiredLanes=terrain-tile-light, placeables-2da-light, source-mdl-light-node, item-property-light, progfx-type4-light-request`
    - `scenePointLightRetailOrderingObservedLanes=placeables-2da-light`
    - `scenePointLightRetailOrderingMissingLanes=terrain-tile-light, source-mdl-light-node, item-property-light, progfx-type4-light-request`

Current remaining blocker after this loop:

- Closed in this loop: runtime proof can now show whether all tile/placeable/MDL/item/VFX light lanes are observed, and placeable `ShadowSize` preview shadows explicitly report missing retail projection parity.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to fast-shadow radius/opacity/projection formula
  - retail shadow-volume/projection parity
  - decompiled confirmation for default `LightState`
  - recovered retail ordering between tile/placeable/MDL/item/VFX lanes

## Follow-up loop - decompiled MDL active-light score and upload anchors - 2026-07-02

Question: can the renderer ordering diagnostics stop using only the old lane heuristic now that a light-manager score path is recovered?

New decompilation anchors:

- `C:\Projects\New Folder\export\decompiled_all.c:865838-865911` / `FUN_00a41850` computes a per-light score at object offset `+0x84` from runtime distance, source radius, multiplier, and priority-like fields.
- `C:\Projects\New Folder\export\decompiled_all.c:865710-865782` / `FUN_00a4165c`, `FUN_00a417bc`, and comparator `FUN_00a41694` sort the active/shadow candidate lists by that recovered `+0x84` score.
- `C:\Projects\New Folder\export\decompiled_all.c:866101-866201` / `FUN_00a41e50` applies the recovered `min(configured, 0x80)` active-light cap, updates fade/acceptance state, and uploads active light slots through `FUN_00a40b60`.

Implementation:

- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - Renderer light-budget diagnostics now expose the recovered MDL light-manager score, sort, and upload source strings.
  - Processed MDL light candidates carry `retailMdlScoreSource`, `retailMdlScoreProofStatus`, and `prioritySource`.
  - The strategy name is now `source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback`.
  - Cross-lane ordering remains blocked because this pass still does not recover the lane insertion call-sites that place tile lights, placeables.2da lights, MDL lights, item/equipment lights, and ProgFX light requests into one retail precedence order.

Verification:

- `npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts` in `backend`: passed, 4 tests.
- `npx.cmd tsc -p tsconfig.json --noEmit --pretty false` in `backend`: passed.

Current remaining blocker after this loop:

- Closed in this loop: area evidence now distinguishes recovered MDL light-manager score/sort/upload behavior from the still-diagnostic cross-lane fallback.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to fast-shadow radius/opacity/projection formula
  - retail shadow-volume/projection parity
  - decompiled confirmation for default `LightState`
  - recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes

## Follow-up loop - shadow-plane source exposed without ShadowSize promotion - 2026-07-02

Question: can the placeable fast-shadow proof use the recovered shadow-plane renderer without pretending that `placeables.2da ShadowSize` is mapped exactly?

New decompilation anchors:

- `C:\Projects\New Folder\export\decompiled_all.c:910760-910872` / `FUN_00a82d8c` builds the `vs_shadowplane` / `fs_shadowplane` geometry from runtime shadow radius/height and alpha.
- The same function multiplies alpha through the runtime shadow opacity path, but this pass still did not recover a safe owner assigning `placeables.2da ShadowSize` into the renderer offsets/radius fields.

Implementation:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Fast-shadow proxies now expose `placeableTwoDaFastShadowProjectionSource` and `placeableTwoDaFastShadowProjectionProofStatus`.
  - The projection status remains `blocked-no-retail-shadow-volume-projection-parity`.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Placeable 2DA light diagnostic samples now include `fastShadowProjectionSource` and `fastShadowProjectionProof`.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene-wide shadow samples now preserve the same projection source/proof fields after deduplicating fast-shadow proxies.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|ShadowSize zero|runtime LightState|static lighting preview"` in `frontend`: passed, 4 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` in `frontend`: passed, 4 tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- Runtime capture:
  - Screenshot: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-shadowplane-source-proof-2026-07-02.png`
  - Frame: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-shadowplane-source-proof-2026-07-02.frame.json`
  - Frame facts:
    - `devRenderStatus=ready`
    - `devCanvasNonblank=true`
    - `devPlaceableModelTextureStatus=applied`
    - `devPlaceableTwoDaLightPointLightCount=1`
    - `devPlaceableTwoDaLightFastShadowCount=1`
    - `fastShadowProjectionSource=C:/Projects/New Folder/export/decompiled_all.c:910760-910872 FUN_00a82d8c...`
    - `fastShadowProjectionProof=source-backed-shadowplane-renderer-blocked-no-shadowsize-owner-mapping`
    - `sceneShadowFastShadowSamples` preserves the same projection source/proof.

Current remaining blocker after this loop:

- Closed in this loop: proof packets can now say "Aurora shadow-plane renderer recovered here" and "ShadowSize owner mapping still missing" as two separate facts.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to retail runtime radius/opacity/projection assignment
  - retail shadow-volume/projection pixel parity
  - decompiled confirmation for default `LightState`
  - recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes

## Follow-up loop - lane boundary audit for light ordering - 2026-07-02

Question: can the remaining retail ordering goal be closed by merging all light-like sources into one preview order, or do the sources still prove separate lanes without a recovered retail merge call-site?

Decompiler and retail-source evidence:

- MDL node-kind boundary:
  - `C:\Projects\New Folder\export\strings.tsv:15783-15789` contains the source node-kind strings `placeable`, `sourcelight`, `placeablelight`, `fx_light`, `light`, `shadowblob`, and `visualeffect`.
  - `C:\Projects\New Folder\export\decompiled_all.c:876072-876159` copies the model node-kind table and normalizes the object name/path for parsed MDL node instances.
  - `backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts` already preserves `light`, `sourcelight`, `placeablelight`, and `fx_light` as MDL light node kinds; this is a source-lane boundary, not a retail cross-lane order proof.
- Active MDL light manager boundary:
  - `C:\Projects\New Folder\export\decompiled_all.c:865289-865409` (`FUN_00a40b60`) uploads active light uniforms, including `lightQuadraticAtten = 9/(max(radius, 0.1)^2*2)`.
  - `C:\Projects\New Folder\export\decompiled_all.c:865838-865929` (`FUN_00a41850`) computes per-light score into runtime field `+0x84`.
  - `C:\Projects\New Folder\export\decompiled_all.c:866086-866096` (`FUN_00a41e30`) clamps active light slots to `0x80` unless the runtime max-light setting is lower.
  - These anchors prove the active MDL/dynamic light budget mechanics, but not the insertion order for tile/placeable/item/ProgFX lanes.
- Placeable static-light toggle boundary:
  - `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8599-8611` exposes tile light color changes and `RecomputeStaticLighting`.
  - `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8750-8765` exposes `SetPlaceableIllumination` / `GetPlaceableIllumination`, also requiring `RecomputeStaticLighting`.
  - NWN Lexicon corroborates that `SetPlaceableIllumination` buffers placeable illumination and needs `RecomputeStaticLighting()` before players see the visual result.
- Item-property light boundary:
  - `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:617` defines `ITEM_PROPERTY_LIGHT = 44`.
  - `C:\Projects\New Folder\item-retail-extract\2da\itempropdef.2da:44` maps row `44` to `Light`, param table `18`, cost table `9`.
  - `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:4647-4653` defines `IP_CONST_LIGHTCOLOR_*`.
  - `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:9733-9734` exposes `ItemPropertyLight(int nBrightness, int nColor)`.
  - Therefore item-property light is source-backed as a separate item lane; no decompiled call-site has shown it being inserted ahead of or behind placeable/MDL/tile lights.
- ProgFX light request boundary:
  - `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:919-946` defines `VFX_DUR_LIGHT_*` constants for color/radius families.
  - Existing `progfx.2da Type 4` parser/renderer diagnostics preserve these as client light/vision requests and explicitly mark them `notPlaceableTwoDaLight=true` and `notMdlLightNode=true`.
  - This is intentionally tracked as `progfx-type4-light-request`, not as a generic `PointLight`, until a retail scheduler/proximity/priority/shadow call-site is recovered.

Implementation status after this loop:

- `backend/src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository.ts`
  - Adds a runtime-source fallback for vanilla `placeables.2da` when module/HAK `placeables.2da` rows are unavailable or fail to parse.
  - Keeps module/HAK priority first; vanilla fallback does not override custom content.
  - Enriches fallback rows with the existing `lightcolor.2da` lookup, so `LightColor`, `LightOffsetX/Y/Z`, `ShadowSize`, and `Static` metadata remain available for Aurora-first light audits.
  - This closes a metadata-coverage gap only; it does not recover the retail `ShadowSize` radius/opacity/projection formula.
- `backend/test/unit/module-snapshot-template-catalog.repository.spec.ts`
  - Adds focused coverage for the fallback path: no snapshot `placeables.2da`, runtime `sources.placeable.includeVanilla=true`, mocked `NwnKeyBifResourceReader.open("...\\nwn_base.key", vanillaRoot)`, and resource reads for `lightcolor` plus `placeables`.
  - Verifies a runtime-source placeable row carries `source2daLightColorLabel=PaleYellow`, source RGB/toolset RGB, `LightOffsetX/Y/Z`, `ShadowSize=3`, `Static=true`, and `sourceObjectKey=runtime-source/vanilla/nwn_base.key/placeables.2da#row=6`.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Already requires these lanes for coverage:
    - `terrain-tile-light`
    - `placeables-2da-light`
    - `source-mdl-light-node`
    - `item-property-light`
    - `progfx-type4-light-request`
  - Already reports `observed-required-tile-placeable-mdl-item-vfx-lanes-ordering-still-blocked` when all lanes are present, rather than promoting retail ordering.
- `frontend/tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`
  - Already verifies all five source-backed lanes can be observed together while `retailOrderingStatus` remains blocked.

Verification:

- `npx.cmd jest --config ./jest.unit.config.js test/unit/module-snapshot-template-catalog.repository.spec.ts --runInBand -t "falls back to vanilla runtime placeables"` in `backend`: passed, 1 focused test.
- `npx.cmd tsc -p tsconfig.json --noEmit --pretty false` in `backend`: passed.

Conclusion:

- Closed in this loop: source-lane boundary evidence is stronger for MDL node-kind, item-property light, ProgFX light, placeable/tile static-light toggles, active MDL light budget, and vanilla `placeables.2da` metadata fallback coverage.
- Still blocked: full retail ordering. The recovered code proves separate inputs and the active MDL light budget/sort, but not a single retail insertion/merge order across tile/placeable/MDL/item/VFX.

## Follow-up loop - active light radius falloff parity - 2026-07-02

Question: do we have an exact retail falloff rule for lights that already carry a runtime/source radius, without pretending this solves `placeables.2da LightColor` radius?

Decompiler evidence:

- `C:\Projects\New Folder\export\decompiled_all.c:866433-866563` (`FUN_00a423d8`) accumulates active light contribution.
- `C:\Projects\New Folder\export\decompiled_all.c:866543-866563` computes `local_20 = 1.0 - distance / radius`; when non-negative, it multiplies each color channel by `local_20` and the active fade value before adding it to the accumulated color.
- This is a safe linear radius falloff rule for active lights that already have a radius field, matching `max(0, 1 - distance/radius)`.
- Historical state before the retail carrier proof: this still did not identify the missing owner that assigns a radius to `placeables.2da LightColor` rows, so the `placeables.2da` point-light distance remained `preview-only-constant-radius-blocked-no-decompiled-placeable-falloff-formula-no-source-radius-field`. Superseded by the 2026-07-02 `fx_placeable01/AuroraLight01` carrier radius/falloff proof.

Implementation:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Source-MDL placeable/VFX light `THREE.PointLight` now uses `decay=1`, matching the recovered linear active-light falloff.
  - The runtime light and node diagnostics now carry `auroraLightFalloffFormula=max(0,1-distance/radius)`, the `FUN_00a423d8` source line range, and `source-backed-active-light-linear-radius-falloff`.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Creature source-MDL `THREE.PointLight` now uses the same `decay=1` rule and updates that value during animated radius changes.
  - Creature source-MDL point lights and their parent nodes carry the same falloff proof metadata.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "source MDL light|creature source MDL light"` in `frontend`: passed, 9 focused tests.
- `npx.cmd tsc -p tsconfig.json --noEmit --pretty false` in `frontend`: passed.

Conclusion:

- Closed in this loop: exact active-light linear falloff for source-MDL lights that have a radius.
- Still blocked: exact `placeables.2da LightColor` radius/falloff, exact `ShadowSize -> radius/opacity/projection`, retail shadow-volume/projection parity, decompiled default `LightState`, and full cross-lane insertion/ordering.

## Follow-up loop - tile source-light proxy coverage - 2026-07-02

Question: can the ARE tile source-light path be promoted beyond the old tile-center preview label without claiming full ordering/falloff parity?

Decompiler evidence:

- `C:\Projects\New Folder\export\decompiled_all.c:453567-453602` creates `fx_flame01` proxy objects named `sourcelight1` and `sourcelight2` for tile source-light channels.
- This confirms the source-light proxy node names and gives a safe placement hook once the terrain tile MDL is loaded.
- It still does not show the active-light-manager insertion call-site, retail cross-lane order, or tile light falloff formula.

Implementation:

- `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts`
  - Already syncs source-light groups to loaded MDL `sourcelight1/sourcelight2` transforms through `syncTerrainTileSourceLightNodePositionsFromLoadedModel`.
  - Runtime userData exposes `auroraTerrainTileLightPositionSource=C:/Projects/New Folder/export/decompiled_all.c:453567-453602...` and `auroraTerrainTileLightPositionProofStatus=source-backed-tile-mdl-sourcelight-node-transform`.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - Adds a separate audit coverage key, `area-tile-source-light-proxy`, so source-light proxy proof is not mixed with preview-only main-light placement.
  - Keeps `area-tile-light-position` as `preview-only` because main-light placement and unloaded-model fallback are still not retail parity.
- `frontend/src/modules/areas/contracts.ts` and `frontend/src/modules/areas/adapters/httpAreaApiPort.ts`
  - Accept `area-tile-source-light-proxy` as a first-class audit coverage key.

Verification:

- `npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts` in `backend`: passed, 4 tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run -t "moves tile source lights"` in `frontend`: passed, 1 focused test.
- `npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts --run` in `frontend`: passed, 9 tests.
- `npx.cmd tsc -p tsconfig.json --noEmit --pretty false` in `backend`: passed.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.

Current remaining blocker after this loop:

- Closed in this loop: ARE tile `sourceLight1/sourceLight2` proxy-node placement is now explicitly source-backed in the area audit, matching the existing frontend runtime/test proof.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to retail runtime radius/opacity/projection assignment
  - retail shadow-volume/projection pixel parity
  - decompiled confirmation for default `LightState`
  - recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes

## Follow-up loop - falloff and ShadowSize re-audit - 2026-07-02

Question: can the remaining falloff/radius or `ShadowSize` gaps be safely promoted after the tile proxy fix?

Decompiler evidence:

- `C:\Projects\New Folder\export\strings.tsv:16505-16507` still only exposes shader/settings strings `lightCutoffRangeMultiplier`, `lightFalloffFactor`, and `lightMaxIntensityInv`; this pass found no owner tying them to `placeables.2da` or ARE tile light radius.
- `C:\Projects\New Folder\export\decompiled_all.c:865404-865409` remains the exact MDL light-node attenuation source: `lightQuadraticAtten = 9/(max(radius,0.1)^2*2)`.
- `C:\Projects\New Folder\export\decompiled_all.c:866528-866564` shows dynamic light contribution using distance against light radius, but this is still for active light-node state already inserted into the light manager.
- `C:\Projects\New Folder\export\decompiled_all.c:883088-883120` maps MDL `shadowradius*` tokens into light-node shadow radius fields, not `placeables.2da ShadowSize`.
- `C:\Projects\New Folder\export\decompiled_all.c:910760-910872` remains the recovered shadow-plane renderer, but not the missing owner that assigns `placeables.2da ShadowSize` to final runtime radius/opacity/projection.

External reference check:

- `https://forums.beamdog.com/discussion/82343/change-in-lighting-math-since-last-major-update` discusses EE lighting sliders/settings such as cutoff range, max intensity, and intensity-at-range, matching the settings-string family seen in the decompilation, but does not provide the retail falloff formula.
- `https://forum.neverwintervault.org/t/project-with-placeable-anti-lights-patches-of-darkness/7192` discusses MDL light-node edge cases such as negative radius/multiplier/color, but does not provide a documented placeable falloff or `ShadowSize` mapping.

Implementation status after re-audit:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Historical state before the retail carrier proof: kept placeable `.2da` light distance at `preview-only-constant-radius-blocked-no-decompiled-placeable-falloff-formula-no-source-radius-field`. Superseded by the 2026-07-02 `fx_placeable01/AuroraLight01` carrier radius/falloff proof.
  - Keeps `ShadowSize` proof at `source-backed-placeables-2da-value-formula-unverified`, with projection proof explicitly blocked by missing owner mapping.
  - Keeps MDL light-node attenuation separate and source-backed through `source-backed-mdl-radius-quadratic-attenuation`.

Current remaining blocker after this loop:

- Closed in this loop: no implementation promotion was made from the falloff/ShadowSize search, because the recovered source evidence still only proves MDL light-node radius/shadowradius and the shadow-plane renderer.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to retail runtime radius/opacity/projection assignment
  - retail shadow-volume/projection pixel parity
  - decompiled confirmation for default `LightState`
  - recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes

## Follow-up loop - frontend LightState fallback label and placeable field recheck - 2026-07-02

Question: did the decompiled placeable structure reveal a default `LightState`, and are our runtime labels honest when no UTP/runtime LightState is present?

Additional decompilation checks:

- `C:\Projects\New Folder\export\decompiled_all.c:330031-330037` initializes several placeable UTP fields:
  - `+0x19a=0` / `HasInventory`
  - `+0x66=0`
  - `+0x19b=0` / `BodyBag`
  - `+0x199=0` / `Useable`
  - `+0x67=1` / `Static`
- `C:\Projects\New Folder\export\strings.tsv:12643-12647` shows the field sequence around this area as `HasInventory`, `BodyBag`, `Useable`, `Static`.
- The unnamed `+0x66` field sits between `BodyBag` and `Useable`; address spacing strongly fits the `Plot` field (`"Plot"`), not `LightState`. It is therefore not promoted as a LightState default.
- No `LightState`/illumination default field owner was recovered in this pass; NWScript still only proves the on/off API and recompute requirement.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8599-8611` exposes tile main/source light setters and states that `RecomputeStaticLighting()` updates lighting after tile light changes or placeable-light add/delete.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8753-8765` exposes `SetPlaceableIllumination()` / `GetPlaceableIllumination()` and documents the required `RecomputeStaticLighting()` call, but not the default LightState owner.

External reference check:

- `https://nwnlexicon.com/SetPlaceableIllumination` confirms that placeable illumination can be turned on/off and must be followed by `RecomputeStaticLighting()` for visible updates, but it does not confirm the engine's default `LightState`.

Implementation:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - The no-runtime/no-UTP fallback now uses the same explicit marker as backend runtime projection:
    - `lightStateSource=aurora-web-default-on-when-utp-lightstate-missing`
    - `lightStateProofStatus=default-assumed-no-decompiled-lightstate-default`
    - `lightStateDefaulted=true`
  - The older `default-on-fallback-no-runtime-or-utp-lightstate` / `fallback-needs-aurora-default-lightstate-confirmation` label is removed from the active preview path.
- `frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts`
  - Added a no-runtime-LightState fixture to prove this exact fallback path.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|missing UTP LightState|runtime LightState|static lighting preview|explicit Aurora Web LightState"` in `frontend`: passed, 5 focused tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- Runtime capture:
  - Screenshot: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-lightstate-shadowplane-source-proof-2026-07-02.png`
  - Frame: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-lightstate-shadowplane-source-proof-2026-07-02.frame.json`
  - Frame facts:
    - `devRenderStatus=ready`
    - `devCanvasNonblank=true`
    - `devPlaceableTwoDaLightPointLightCount=1`
    - `lightState=1`
    - `lightStateSource=aurora-web-default-on-when-utp-lightstate-missing`
    - `lightStateProof=default-assumed-no-decompiled-lightstate-default`
    - `lightStateDefaulted=true`
    - `fastShadowProjectionSource=C:/Projects/New Folder/export/decompiled_all.c:910760-910872 FUN_00a82d8c...`

Current remaining blocker after this loop:

- Closed in this loop: frontend no-runtime LightState fallback now matches the backend's explicit, non-decompiled default marker, and the tempting decompiled `+0x66` placeable byte is documented as not LightState.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to retail runtime radius/opacity/projection assignment
  - retail shadow-volume/projection pixel parity
  - decompiled confirmation for default `LightState`
  - recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes

## Follow-up loop - frontend MDL budget ordering proof label - 2026-07-02

Question: can the frontend light-slot budget label be promoted to a source-backed Aurora claim, or should it remain a diagnostic fallback?

Decompiler evidence:

- `C:\Projects\New Folder\export\decompiled_all.c:865838-865929` (`FUN_00a41850`) computes an active MDL light score into light state offset `+0x84`.
- `C:\Projects\New Folder\export\decompiled_all.c:865714-865725` (`FUN_00a4165c`) sorts one active light list through `FUN_00a41694`.
- `C:\Projects\New Folder\export\decompiled_all.c:865799-865824` (`FUN_00a417bc`) rebuilds and sorts a second active light list through the same comparator.
- `C:\Projects\New Folder\export\decompiled_all.c:865731-865734` (`FUN_00a41694`) compares `+0x84` scores.
- The frontend preview still lacks the retail object-manager/camera inputs and the recovered cross-lane insertion path that would make the browser's slot trimming identical to the client.

Implementation:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Changes the exposed placeable/MDL light budget strategy to `source-backed-retail-score-ascending-preview-camera-fallback`.
  - Adds `auroraLightBudgetStrategySource=C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850...`.
  - Adds `auroraLightBudgetStrategyProofStatus=source-backed-retail-mdl-score-preview-camera-field-fallback`.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Applies the same diagnostic/source/proof labeling to creature/item MDL light groups.
- `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx` and `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx`
  - Carry the source/proof fields into dev-preview snapshots and canvas datasets so captures can prove whether a light slot is source-backed or diagnostic fallback.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "active slot cap|configured runtime cap"` in `frontend`: passed, 1 focused test.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "light"` in `frontend`: passed, 5 focused tests.
- `npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` in `frontend`: passed, 9 tests.
- `npx.cmd vitest tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts --run -t "readPlaceablesVfxPreviewDrawMetrics"` in `frontend`: passed, 2 focused tests.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false` in `frontend`: passed.
- Runtime capture:
  - Screenshot: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\mdl-light-budget-strategy-proof-2026-07-02.png`
  - Frame: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\mdl-light-budget-strategy-proof-2026-07-02.frame.json`
  - Frame facts:
    - `devRenderStatus=ready`
    - `devCanvasNonblank=true`
    - `devModelFileName=dlp_light_08.mdl`
    - `devAuroraLightNodes=pulsing_light03`
    - `devLightColor=0,0.592157,0.141176`
    - `auroraLightBudgetStrategy=source-backed-retail-score-ascending-preview-camera-fallback`
    - `auroraLightBudgetStrategySource=C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850...`
    - `auroraLightBudgetStrategyProofStatus=source-backed-retail-mdl-score-preview-camera-field-fallback`
- Full `WorkspaceCanvasViewport.renderFilter.test.ts` still has unrelated pre-existing failures in terrain/texture/model loader cases; the two updated draw-metrics tests pass.

Current remaining blocker after this loop:

- Closed in this loop: MDL light budget diagnostics now cite the recovered Aurora score/sort functions, while explicitly marking the browser slot order as a diagnostic fallback instead of retail parity.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to retail runtime radius/opacity/projection assignment
  - retail shadow-volume/projection pixel parity
  - decompiled confirmation for default `LightState`
  - recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes

## Follow-up loop - shadow-plane runtime field owner split - 2026-07-02

Question: did a deeper call-site pass recover the missing `placeables.2da ShadowSize` formula, or only the runtime fields consumed by the recovered shadow-plane renderer?

Decompiler evidence:

- `C:\Projects\New Folder\export\decompiled_all.c:910756-910944` (`FUN_00a82d8c`) renders `vs_shadowplane` / `fs_shadowplane` and consumes runtime object fields:
  - `param_1 + 0x34 -> +0x58/+0x60` as the runtime shadow-plane extent/radius candidate.
  - `param_1 + 0x34 -> +0x90` as an alpha multiplier.
  - `param_1 + 0x34 -> +0x94/+0x98/+0x9c` and `+0x64` as world placement inputs.
  - `_DAT_00d023b8`, sourced from ARE `ShadowOpacity/100`, is multiplied into final shadow-plane alpha.
- `C:\Projects\New Folder\export\decompiled_all.c:911283-911418` (`FUN_00a83fec`) recomputes object bounds/extents into `+0x4c..+0x60` from render geometry vertices.
- `C:\Projects\New Folder\export\decompiled_all.c:911917` shows `FUN_00a84ac8` calling `FUN_00a83fec(iVar4)` after scene/render-object insertion.
- This proves the shadow-plane renderer's runtime inputs better than the earlier string, but still does not prove where `placeables.2da ShadowSize` is assigned into those fields.

Implementation:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Updates `placeableTwoDaFastShadowProjectionSource` to cite `FUN_00a82d8c` runtime fields and `FUN_00a83fec` extents recomputation.
  - Keeps `placeableTwoDaFastShadowProjectionProofStatus=source-backed-shadowplane-renderer-blocked-no-shadowsize-owner-mapping`.
  - Keeps preview radius/opacity sources as blocked preview formulas.
- `frontend/tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`
  - Updates the expected scene shadow diagnostic sample so runtime captures expose the more precise source split.

Verification:

- Unit diagnostics:
  - `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
    - Passes 4 tests.
  - `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "ShadowSize zero|placeables.2da LightColor|static lighting preview"`
    - Passes the 3 focused tests, with unrelated tests skipped by the filter.
  - `cd frontend; npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false`
    - Passes.
- Runtime proof:
  - Capture command:
    - `node .\backend\scripts\capture-vfx-app-route-cdp.mjs --baseUrl http://127.0.0.1:5173 --authBaseUrl http://127.0.0.1:3000/api/v1 --route "/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.5&seed=53&areaShadowOpacity=50" --outDir "C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02" --name "campfire-shadowplane-runtime-fields-proof-2026-07-02" --waitAttempts 360`
  - Screenshot:
    - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-shadowplane-runtime-fields-proof-2026-07-02.png`
  - Frame metadata:
    - `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-02\campfire-shadowplane-runtime-fields-proof-2026-07-02.frame.json`
  - Runtime fields captured:
    - `devRenderStatus=ready`
    - `devCanvasNonblank=true`
    - `devObjectPixels=6818`
    - `devPlaceableTwoDaLightStatus=active`
    - `devPlaceableTwoDaLightPointLightCount=1`
    - `devPlaceableTwoDaLightFastShadowCount=1`
    - `devAreaShadowOpacityOverride=50`
    - `devAreaShadowOpacityFactorOverride=0.5`
  - The captured sample reports `row=6`, `label=PaleYellow`, `LightState=1`, `ShadowSize=1`, `fastShadowOpacity=0.0675`, and the updated `fastShadowProjectionSource` string citing both `FUN_00a82d8c` and `FUN_00a83fec`.
  - The same capture still reports `lightStateProof=default-assumed-no-decompiled-lightstate-default`, `radiusProof=blocked-no-decompiled-placeable-falloff-formula`, `fastShadowProjectionStatus=blocked-no-retail-shadow-volume-projection-parity`, and `localOnlyNotRetailEvidence=true`; therefore this proof must not be promoted as full retail parity.
- Repro note:
  - Direct backend `POST http://127.0.0.1:3000/api/v1/catalog/placeables/process` succeeded for `plc_plc_i06`.
  - Vite proxy on `http://127.0.0.1:5313/_aurora/v1/catalog/placeables/process` timed out during this loop.
  - Vite proxy on `http://127.0.0.1:5173/_aurora/v1/catalog/placeables/process` succeeded and was used for the proof capture.

Current remaining blocker after this loop:

- Closed in this loop: shadow-plane proof now distinguishes source-backed retail renderer inputs from the unrecovered `placeables.2da ShadowSize` owner mapping.
- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to retail runtime radius/opacity/projection assignment
  - retail shadow-volume/projection pixel parity
  - decompiled confirmation for default `LightState`
  - recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes

## Follow-up loop - parity goal reset and source recheck - 2026-07-02

Question: after resetting the active goal to exact light/shadow parity, did another decompilation and web pass reveal any safe promotion for the remaining blockers?

Active goal:

- Exact `placeables.2da` light falloff/radius.
- Exact `ShadowSize -> radius/opacity/projection`.
- Retail shadow-volume/projection parity.
- Decompiled confirmation of default `LightState`.
- Full retail ordering between tile/placeable/MDL/item/VFX light lanes.

Decompiler and local-source recheck:

- `rg -i "LightState|illumination|PlaceableIllumination|RecomputeStaticLighting" "C:\Projects\New Folder"` still finds only:
  - NWScript `SetPlaceableIllumination` / `GetPlaceableIllumination` / `RecomputeStaticLighting` declarations and comments.
  - `propagateillumination` model-token strings and one propagation callback family at `C:\Projects\New Folder\export\decompiled_all.c:846642`.
  - No decompiled `LightState` field name, initializer, or default owner.
- `rg -i "ShadowSize|LightOffsetX|LightOffsetY|LightOffsetZ|LightColor" "C:\Projects\New Folder"` still finds no decompiled `ShadowSize` or `LightOffset*` owner. It only finds `lightcolor` table references, `lightColor[%d]` shader/uniform naming, and item-property light constants.
- `C:\Projects\New Folder\export\strings.tsv:16505-16507` still contains only renderer-setting names `lightCutoffRangeMultiplier`, `lightFalloffFactor`, and `lightMaxIntensityInv`; no recovered owner ties those settings to `placeables.2da.LightColor`, tile source lights, or `placeables.2da.ShadowSize`.
- `C:\Projects\New Folder\export\decompiled_all.c:453567-453602` still proves only the tile source-light proxy path: `fx_flame01` objects named `sourcelight1` and `sourcelight2`.
- `C:\Projects\New Folder\export\strings.tsv:15787-15801` plus the already-covered parser tests prove Aurora MDL node-kind recognition for `placeable`, `sourcelight`, `placeablelight`, `fx_light`, `light`, and `shadowblob`. This is source-lane evidence, not a recovered cross-lane insertion order.
- `C:\Projects\New Folder\export\decompiled_all.c:865289-866563` remains the strongest active-light manager evidence:
  - active slot cap max `0x80`;
  - per-light score/sort path;
  - `lightQuadraticAtten = 9/(max(radius,0.1)^2*2)`;
  - active contribution `max(0,1-distance/radius)*color*fade`.
  - This still starts after a light already has a runtime/source radius, so it cannot assign a missing radius to `placeables.2da.LightColor`.

Network recheck:

- Web searches for `placeables.2da ShadowSize LightColor LightOffset radius falloff formula`, `NWN placeables.2da ShadowSize light radius LightColor falloff`, `Neverwinter Nights MDL placeablelight sourcelight shadowblob lightpriority shadowradius`, and `NWN SetPlaceableIllumination LightState default UTP` did not return a primary source or formula that can be promoted.
- Results again point mostly to builder/community references, Beamdog/forum discussions, NWN Lexicon API pages, or unrelated lighting material. These can corroborate terminology, but they do not close a retail formula or default-state proof.

Implementation decision:

- No new canonical behavior was promoted in this loop.
- Historical state before the retail carrier proof: keep `placeables.2da` light radius/falloff status blocked as `preview-only-constant-radius-blocked-no-decompiled-placeable-falloff-formula-no-source-radius-field`. Superseded by the 2026-07-02 `fx_placeable01/AuroraLight01` carrier radius/falloff proof.
- Keep `ShadowSize` status source/table-backed but formula-unverified, with shadow-plane projection proof blocked by missing owner mapping.
- Keep missing UTP/runtime `LightState` as `aurora-web-default-on-when-utp-lightstate-missing` with `default-assumed-no-decompiled-lightstate-default`.
- Keep cross-lane ordering as diagnostic/source-lane coverage only, not retail insertion parity.

Current remaining blocker after this loop:

- Still blocked from full Aurora parity:
  - exact placeable light falloff/radius formula
  - exact `ShadowSize` to retail runtime radius/opacity/projection assignment
  - retail shadow-volume/projection pixel parity
  - decompiled confirmation for default `LightState`
  - recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes

## Follow-up loop - retail placeable light carrier and LightState default - 2026-07-02

Question: can the active parity goal safely promote any of the remaining blockers using the local retail `nwmain.exe`/`nwserver.exe` and retail BIF assets instead of the older dump alone?

Retail local install used:

- `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights`
- `data\databuild.txt`: `r1284`, `Mon Feb 26 09:14:59 MST 2024`
- `bin\win32\build.txt`: `26c6e57364a45246e3b58e4f2c49366df72d15db`, `Mon Oct 6 12:22:22 MDT 2025`

Placeable `LightColor` radius/falloff evidence recovered:

- `nwmain.exe` string/xref pass with PE `.pdata` function bounds recovered two owner paths:
  - `0x1407d8ed0..0x1407d9599` loads `placeablelight`, `fx_placeable01`, `auroralight01`, and `CNWCArea::AddPlaceableObjectLight()` diagnostics from `game\clientcore\nwcarea.cpp`.
  - `0x140870cc0..0x140871432` loads `placeablelight`, `fx_placeable01`, `auroralight01`, `LoadLight`, and diagnostics from `game\clientcore\nwcplaceable.cpp`.
- `nwn_base.key` contains `fx_placeable01.mdl`; `nwn_retail.key` does not. The extracted model is a 747-byte binary MDL with root `FX_PLACEABLE01` and child `AuroraLight01`.
- Binary MDL controller dump for `fx_placeable01.mdl` / `AuroraLight01`:
  - controller `0x4c` (`color`) = `[0,0,0]`; the retail AddPlaceableObjectLight path supplies `lightcolor.2da` `RED/GREEN/BLUE`.
  - controller `0x58` (`radius`) = `10`.
  - controller `0x60` (`shadowradius`) = `15`.
  - controller `0x64` (`verticaldisplacement`) = `3`.
- Mapping source in older decompilation:
  - `C:\Projects\New Folder\export\decompiled_all.c:883051-883080` maps MDL `radius/radiuskey/radiusbezierkey` to controller `0x58`.
  - `C:\Projects\New Folder\export\decompiled_all.c:883088-883117` maps `shadowradius*` to controller `0x60`.
  - `C:\Projects\New Folder\export\decompiled_all.c:883126-883155` maps `verticaldisplacement*` to controller `0x64`.
  - `C:\Projects\New Folder\export\decompiled_all.c:866543-866563` proves the active light contribution formula `max(0,1-distance/radius)*color*fade`.

Implementation changes from this evidence:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - `placeables.2da LightColor` preview now uses source radius `10 * max(objectRadius, 0.5)` instead of the old `2.25` preview-only constant.
  - The `PointLight` now uses `decay=1` and carries `max(0,1-distance/radius)` falloff proof metadata, matching the recovered active-light linear falloff.
  - `userData` now records `fx_placeable01.mdl`, `AuroraLight01`, source radius `10`, source shadowradius `15`, vertical displacement `3`, controller ids `0x58/0x60/0x64`, and source strings.
- `frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts`
  - Focused proof now expects `distance=5` for the standard `objectRadius=0.5` fixture, `decay=1`, `radiusProof=source-backed-fx-placeable01-auroralight01-radius-controller`, and the retail carrier metadata.

Default `LightState` evidence recovered:

- `nwserver.exe` string/xref pass found `LightState` in `CNWSPlaceable` GFF/template loading paths:
  - `0x1404484d0..0x14044a2ec` contains the full UTP/GFF field load sequence and the `LightState` literal at `0x140448ed0`.
  - The same function sets `mov dword ptr [rbx+0x368], 1` at `0x140448eb5` immediately before preparing the `LightState` read.
  - It then calls an accessor at `0x140447a10`, moves the returned `AL` into the default-argument slot, loads the `LightState` literal, and calls the same bool/int GFF read helper family used by adjacent placeable fields.
  - This is sufficient decompiled/binary confirmation that missing UTP `LightState` defaults to ON (`1`), not just an Aurora Web assumption.

Implementation changes from this evidence:

- `backend/src/modules/catalog/application/catalog-processing.helpers.ts`
  - Missing UTP `LightState` still defaults to `1`, but source/proof now read:
    - `lightStateSource=nwserver.exe CNWSPlaceable::LoadFromTemplate initializes LightState to 1 before optional UTP LightState read`
    - `lightStateProofStatus=source-backed-nwserver-lightstate-default-on`
- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Frontend fallback source/proof uses the same decompiled default, so cached or runtime-missing payloads no longer claim `default-assumed-no-decompiled-lightstate-default`.

`ShadowSize` recheck:

- Retail `nwmain.exe` contains the string block `LightNode`, `LoadLight`, `ShadowSize`, but a RIP-relative xref scan found no direct code reference to `ShadowSize` and no pointer-table hit for the `ShadowSize` string address.
- Retail `placeables.2da` values are broad, including `0`, small fractional values, `1`, `9`, `13`, `15`, `17`, `18`, `21`, `23`, `24`, `25`, `26`, `28`, `30`, `33`, `34`, and `48`; this confirms the old tiny preview formula cannot be treated as retail parity.
- The recovered shadow-plane renderer evidence still stands:
  - `C:\Projects\New Folder\export\decompiled_all.c:910756-910944` (`FUN_00a82d8c`) consumes runtime shadow extents and area opacity factor.
  - `C:\Projects\New Folder\export\decompiled_all.c:911283-911418` (`FUN_00a83fec`) recomputes runtime render-object extents from geometry.
- No safe owner assigning `placeables.2da ShadowSize` into those runtime fields was recovered in this loop.

Cross-lane ordering recheck:

- Retail `nwmain.exe` xrefs show separate owner families:
  - `CNWCArea::AddPlaceableObjectLight()` / `LoadLight` for the `placeablelight` + `fx_placeable01` carrier.
  - `0x14085000a/0x14085008b` source-light proxy owner using `sourcelight` + `fx_flame01`.
  - `0x1400869d0..0x140087196` model node-kind classifier strings: `placeable`, `sourcelight`, `placeablelight`, `fx_light`, `light`, `shadowblob`, and other VFX node lanes.
  - `0x1400add20..0x1400aeebb` shader/uniform upload path with `lightQuadraticAtten[%d]`, `lightColor[%d]`, and `numLights`.
  - `0x14009db90..0x14009e611` MDL light parser path with `shadowradius`, `shadow`, `lightpriority`, and `fadingLight`.
  - `progfx.2DA`, `IPRP_LightCost.2DA`, `LightColor.2DA`, and `TileColor.2DA` table-load strings in a broad resource-table load function.
- This improves lane-owner provenance, but it still does not recover one final retail global ordering function across tile/placeable/MDL/item/VFX lanes.
- Therefore `scenePointLightRetailOrderingStatus` must remain blocked/diagnostic-only until a retail oracle or the missing final insertion/sort path is recovered.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor"`
  - Passed 1 focused test.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|LightState default"`
  - Passed 3 focused tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js test/unit/catalog-processing.helpers.spec.ts test/unit/catalog.application.service.spec.ts --runInBand -t "default LightState|legacy unknown roles|cached generic manifests|cached_lightstate_legacy|LightState"`
  - Passed 3 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - exact `placeables.2da LightColor` carrier radius/falloff source for the default retail placeable light carrier (`fx_placeable01/AuroraLight01 radius=10`, active falloff `max(0,1-distance/radius)`).
  - decompiled/binary confirmation that missing UTP `LightState` defaults to ON (`1`).
- Still blocked from full Aurora parity:
  - exact `ShadowSize` to retail runtime radius/opacity/projection assignment
  - retail shadow-volume/projection pixel parity
  - recovered final retail insertion/order between tile/placeable/MDL/item/VFX light lanes

## Follow-up loop - retail ShadowSize MDL selection and blocker hardening - 2026-07-02

Question: can the remaining `ShadowSize`, shadow projection, and cross-lane ordering goals be promoted without guessing?

Retail `ShadowSize` owner recovered:

- A robust PE/Capstone xref pass over retail `nwmain.exe` recovered the `ShadowSize` code reference at `0x14087094c`, inside function bounds `0x1408708c0..0x140870b0a`.
- That function reads the `placeables.2da` `ShadowSize` column and selects one of three retail shadow MDLs:
  - `ShadowSize == 0` -> `Fx_Shadow_S`
  - `ShadowSize == 2` -> `Fx_Shadow_L`
  - any other present value -> `Fx_Shadow_M`
- The selected resource is then passed to the model load path after the optional vtable path at `+0x138`, so this is a retail placeable shadow model selection, not an Aurora Web heuristic.

Retail shadow MDL metadata recovered from `nwn_base.key`:

- `fx_shadow_s.mdl`
  - model `Fx_Shadow_S`, emitter `Small`, texture `fxpa_Dot01`
  - emitter type `Single`, render mode `Billboard_to_Local_Z`, blend mode `Normal`
  - emitter position `[0, 0, 0.029999999329447746]`
  - `sizeStart=sizeEnd=1`, `alphaStart=alphaEnd=0.6000000238418579`
  - SHA-256 `9eed0521a3a0c16c5ec29a54bd45c1036e5484e1da80a2fdcd3ad6fa4731e14e`
- `fx_shadow_m.mdl`
  - model `Fx_Shadow_M`, emitter `Med`, same texture/type/render/blend/position
  - `sizeStart=sizeEnd=1.600000023841858`, `alphaStart=alphaEnd=0.6000000238418579`
  - SHA-256 `9dd315aab5fb5a5483b0c74fb696dbea7702227b0e662e1d0d6027d84eb99f7d`
- `fx_shadow_l.mdl`
  - model `Fx_Shadow_L`, emitter `Large`, same texture/type/render/blend/position
  - `sizeStart=sizeEnd=3`, `alphaStart=alphaEnd=0.699999988079071`
  - SHA-256 `7bef849b6b31160bc98146f815e75e3492731139e232bb4302ee20f4341a5be1`

Implementation changes:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Replaced the old `ShadowSize` preview formula with the recovered retail selection rule.
  - `ShadowSize=0` now creates the retail small shadow proxy instead of being treated as missing or suppressed.
  - Fast-shadow proxy radius is derived from recovered emitter sprite size for the Three circle proxy: S `0.5`, M `0.8`, L `1.5`.
  - Fast-shadow base opacity now comes from recovered emitter alpha: S/M `0.6`, L `0.7`, still multiplied by ARE `ShadowOpacity/100` when that area field is present.
  - Root and proxy `userData` now record the selected shadow lane, MDL resref/file, emitter node, texture, render mode, emitter size, alpha, SHA-256 hash, source offset, selection proof, and projection proof.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Placeable diagnostic samples now expose `fastShadowModel`, `fastShadowEmitter`, `fastShadowTexture`, `fastShadowRenderMode`, `fastShadowEmitterSize`, `fastShadowEmitterAlpha`, and `fastShadowRadius`.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene shadow diagnostics now preserve placeable fast-shadow MDL/emitter metadata.
  - MDL `shadow=true` point-light samples now explicitly report the recovered shadow-volume source and the Three preview limitation.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - `placeable-radius-falloff` is promoted to `source-backed` when catalog `LightColor` templates exist, because the retail `fx_placeable01/AuroraLight01` carrier radius and active falloff are recovered.
  - `placeable-2da-light-offset-shadow` proof now cites the retail `ShadowSize -> Fx_Shadow_*` selection path.

Shadow-volume/projection parity status:

- The retail MDL shadow-volume path is source-backed at `C:/Projects/New Folder/export/decompiled_all.c:913914-914017`: it loads `vs_shadowvol`/`fs_shadowvol` and renders caster geometry using light-node `radius`, `shadowradius`, and `verticaldisplacement`.
- Aurora Web still uses Three `PointLight` shadow maps and billboard/circle proxies. It does not port Aurora's shadow-volume extrusion/projection path.
- Runtime proof status therefore remains explicit:
  - `blocked-three-shadowmap-preview-no-retail-shadowvol-extrusion-parity`
  - `source-backed-mdl-shadowvol-renderer-blocked-no-three-parity`
  - `blocked-no-retail-shadow-volume-projection-parity`

Cross-lane ordering status:

- The diagnostic coverage lanes are now complete when runtime samples include:
  - `terrain-tile-light`
  - `placeables-2da-light`
  - `source-mdl-light-node`
  - `item-property-light`
  - `progfx-type4-light-request`
- The proof source is intentionally negative/blocked: `C:/Projects/New Folder/export/decompiled_all.c:865803-866424` recovers active-light score/sort/upload and the 128 slot cap, but no common insertion call-site proving retail precedence between tile/placeable/MDL/item/VFX lanes has been recovered.
- `scenePointLightRetailOrderingObservedLanesSource` is now `"diagnostic coverage set sorted by lane name; not retail insertion or render order"`.
- Therefore the final status remains `source-backed-cross-lane-ordering-blocked-no-common-insertion-callsite`, not retail ordering parity.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js test/unit/area-lighting-evidence.spec.ts --runInBand`
  - Passed 4 tests after promoting `placeable-radius-falloff` from blocked to source-backed.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed after the backend lighting evidence changes.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "placeables.2da LightColor|ShadowSize zero|Display Shadows|workspaceSceneLightDiagnostics"`
  - Passed 7 focused/runtime diagnostic tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 10 API/UI lighting evidence tests after updating the source-backed coverage fixture.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed after the frontend ShadowSize/shadowvol/order changes.

Current remaining blocker after this loop:

- Closed in this loop:
  - exact retail `ShadowSize` model selection
  - recovered retail fast-shadow emitter size/alpha metadata
  - source-backed placeable `LightColor` carrier radius/falloff
  - decompiled/binary default `LightState=1`
- Still blocked from full Aurora parity:
  - pixel/geometry parity for Aurora retail shadow-volume/projection
  - full recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes
  - ARE tile-light radius/falloff formula

## Follow-up loop - unfinished-only goal: tile source-light carrier and hardened blockers - 2026-07-02

Question: can any part of the remaining ARE tile-light radius/falloff blocker be promoted without guessing?

Retail tile source-light carrier recovered:

- `C:/Projects/New Folder/export/decompiled_all.c:453567-453602` creates `fx_flame01` at loaded tile `sourcelight1` / `sourcelight2` source nodes.
- `nwn_base.key` contains `fx_flame01.mdl`, SHA-256 `9814d45381cab7ecb5f47f9b16bdeb23b983687ff0b9bcb0244ffc04034dfecf`.
- Parsed binary MDL light node:
  - root `FX_FLAME01`
  - light node `AuroraLight01`, source node offset `21488`
  - `radius=7`
  - `shadowRadius=15`
  - `verticalDisplacement=2`
  - base color `[1, 0.4196079969406128, 0.4196079969406128]`
  - `shadow=true`, `lightPriority=4`, `fadingLight=true`, `affectDynamic=true`
- Active-light contribution remains the recovered linear formula at `C:/Projects/New Folder/export/decompiled_all.c:866543-866563`: `max(0,1-distance/radius)*color*fade`.

Implementation changes:

- `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts`
  - `Tile_SrcLight1/Tile_SrcLight2` preview `PointLight` radius is now `fx_flame01` radius `7 * TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE = 0.7`.
  - Source tile lights now use `decay=1` and carry `falloff=max(0,1-distance/radius)`.
  - Runtime userData records `fx_flame01.mdl`, the model hash, `AuroraLight01`, source node offset `21488`, source radius `7`, shadow radius `15`, vertical displacement `2`, priority `4`, and proof status `source-backed-fx_flame01-auroralight01-radius-controller`.
  - `Tile_MainLight1/Tile_MainLight2` still use `aurora-web-preview-main-light-distance-heuristic-no-recovered-retail-carrier`; no source-backed main-light carrier/radius was recovered.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - `area-tile-light-radius-falloff` now distinguishes source lights from main lights.
  - If only renderable `Tile_SrcLight*` references are present, the status can be `source-backed`.
  - If renderable `Tile_MainLight*` references are present, the overall key remains `blocked`, with evidence that source lights are recovered and main lights are not.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Point-light samples now include distance source, radius proof, falloff formula/proof, source model file name, and source radius. This lets browser/frame proof show `fx_flame01.mdl` directly for tile source-light lanes.

Negative/blocked audit results:

- Tile main-light radius/falloff:
  - `C:/Projects/New Folder/export/decompiled_all.c:255400-255409` reads `Tile_MainLight1`, `Tile_MainLight2`, `Tile_SrcLight1`, and `Tile_SrcLight2`.
  - `C:/Projects/New Folder/export/decompiled_all.c:453200-453602` reads table colors and creates `fx_flame01` only for `sourcelight1/sourcelight2`; this pass did not recover an equivalent retail carrier model or radius owner for `Tile_MainLight1/Tile_MainLight2`.
  - Therefore main tile-light radius/falloff remains blocked, while source tile-light radius/falloff is now source-backed.
- Shadow-volume/projection parity:
  - Rechecked local anchors: `FUN_00a82d8c` shadow-plane alpha/projection path, `FUN_00a83fec` runtime extent recompute, and `FUN_00a878f8` shadowvol shader path.
  - Backend audit proof now cites `C:/Projects/New Folder/export/decompiled_all.c:910673-910872`, `911283-911418`, and `913914-914017`.
  - Aurora Web still uses Three flags/proxies, not the retail projection geometry. Pixel/geometry parity remains blocked until the projection path is ported or a retail/toolset oracle proves equivalent output.
- Cross-lane ordering:
  - Backend and frontend proof now consistently cite the recovered active-light score/sort/upload and 128 slot cap, plus the negative finding that no common tile/placeable/MDL/item/VFX insertion call-site has been recovered.
  - The diagnostic lane set remains coverage, not retail render/insertion order.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run -t "tile main/source light colors|source lights to loaded MDL|caps tile light"`
  - Passed 3 focused tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js test/unit/area-lighting-evidence.spec.ts --runInBand`
  - Passed 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 1 test.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run -t "tile main/source light colors|source lights to loaded MDL|caps tile light|workspaceSceneLightDiagnostics|AreasModePanel lighting evidence"`
  - Passed 8 focused tests after the final scene-diagnostics sample update.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Current remaining blocker after this loop:

- Closed in this loop:
  - ARE `Tile_SrcLight1/Tile_SrcLight2` source-light radius/falloff carrier via retail `fx_flame01/AuroraLight01`.
- Still blocked from full Aurora parity:
  - ARE `Tile_MainLight1/Tile_MainLight2` radius/falloff carrier/formula.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes.

## Follow-up loop - Item/ProgFX light RGB and source-model radius - 2026-07-02

Question: are item/equipment lights and related `VFX_DUR_LIGHT_*` rows using guessed RGB/radius, or is there retail source data for color, strength, and sphere/radius?

Retail resource audit:

- `nwn_base.key` contains `progfx.2da` (`sha256 a570a8f97f7ca238bcfc7c91e4f229f597c51ec581382be2404b1b0b3289e54f`), `visualeffects.2da` (`sha256 acefe76f7fb14e88916ae1ade40dd5108b8a2f601eaada82a67f751b4eb56ea2`), and `fx_light_clr.mdl` (`sha256 590087f62a93cc76b0ece4e28986a4941766c6c6c7630333d4ecee8f6fec01e5`).
- `nwn_retail.key` also contains `progfx.2da`, but not `visualeffects.2da` or `fx_light_clr.mdl`; the active light model is therefore sourced from `nwn_base.key`.
- `visualeffects.2da` rows `153..180` map `VFX_DUR_LIGHT_BLUE/YELLOW/PURPLE/RED/ORANGE/WHITE/GREY_5/10/15/20` to `progfx.2da` Type 4 rows.
- `progfx.2da` Type 4 rows `304..327` map the rows to animation tokens such as `Blue_5m`, `Red_20m`, `white_20m` and model `fx_light_clr`.
- Raw `fx_light_clr.mdl` light-controller dump shows `AuroraLight01` for normal colored lights and `AuroraLight02` for vision modes. `AuroraLight01` has base `shadow=true`, `shadowRadius=15`, `verticalDisplacement=1`; each color animation has controller type `76` for static RGB and controller type `88` for radius frames.

Important correction:

- The `5m/10m/15m/20m` suffix is still preserved as an IPRP/ProgFX token/display value, but the recovered `fx_light_clr.mdl` normal colored light radius controller is `0 -> 13.3` for all normal color animations. The brightness step changes the RGB/intensity vector, not the recovered source-model light radius.
- Examples from `fx_light_clr-animation-light-matrix.json`: `Blue_10m = 0.75,0.75,1.25`, `Red_20m = 1.75,0.75,0.5`, `Gren_20m = 1.25,1.75,1`, `white_20m = 1.75,1.75,1.75`; all have `radiusLast=13.3`.

Implementation changes:

- `workspaceObjectMeshLayer.ts` no longer uses hand-picked item light RGB values such as red `[1,0.18,0.08]`.
- Item/equipment `PointLight` color now normalizes the recovered `fx_light_clr` RGB and puts the max channel into intensity, preserving the source vector as `color * intensity`.
- Item/equipment light distance now uses the source-family `fx_light_clr.mdl` radius `13.3` scaled by workspace units; `BrightnessRadiusMeters` remains as IPRP token metadata.
- Falloff changed from Three preview decay `2` to linear decay `1` with proof status `source-family-backed-fx_light_clr-mdl-radius-linear-falloff-itemproperty-scheduler-unverified`.

Remaining blocker:

- No direct decompiled `ItemPropertyLight` scheduler/call-site was recovered in this loop. The implementation is now Aurora-first for the related retail `VFX_DUR_LIGHT_* -> progfx -> fx_light_clr` source family, but direct item-runtime parity is still explicitly unverified.

Verification:

- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "ItemPropertyLight"` in `frontend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "ItemPropertyLight"` in `frontend`: passed, 2 focused tests.
- `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` in `frontend`: passed, 4 tests.
- `npx.cmd tsc -p tsconfig.json --noEmit --pretty false` in `frontend`: passed.

## Follow-up loop - ShadowSize MDL asset recheck - 2026-07-02

Question: after the item-light source recovery, can `ShadowSize -> radius/opacity/projection` be promoted further, or does the current blocker still stand?

Independent KEY/BIF parser pass:

- Read `fx_shadow_s`, `fx_shadow_m`, and `fx_shadow_l` from `nwn_base.key`.
- Parsed the binary MDLs with the project `parseAuroraMdlVfxSource` path.
- Generated `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\shadowsize-retail-proof-2026-07-02\fx-shadow-mdl-parser-report.json`.

Recovered values:

- `fx_shadow_s.mdl`: emitter `Small`, texture `fxpa_Dot01`, type `Single`, render `Billboard_to_Local_Z`, position `0,0,0.03`, size `1`, alpha `0.6000000238418579`.
- `fx_shadow_m.mdl`: emitter `Med`, same texture/type/render/position, size `1.600000023841858`, alpha `0.6000000238418579`.
- `fx_shadow_l.mdl`: emitter `Large`, same texture/type/render/position, size `3`, alpha `0.699999988079071`.

Implementation check:

- `workspacePlaceableModelPresentation.ts` descriptors already match the recovered hashes, emitter names, sizes, alpha values, texture, render mode, blend mode, and position.
- No code promotion was made in this loop because the recovered data is already implemented as a fast-shadow proxy.

Remaining blocker:

- This recheck still does not recover retail shadow-volume/projection parity. It proves which retail MDL sprite is selected and what size/alpha it carries; it does not prove the exact retail world projection geometry, camera-facing behavior, or pixel parity for Aurora's shadow renderer.

## Follow-up loop - Cross-lane ordering recheck - 2026-07-02

Question: can full retail ordering between tile/placeable/MDL/item/VFX light lanes be implemented now that item/progfx RGB and ShadowSize assets were rechecked?

Local decompilation recheck:

- `C:\Projects\New Folder\export\decompiled_all.c:865838-865929` still proves `FUN_00a41850` computes a per-light score into runtime offset `+0x84` from distance/radius/multiplier/priority-like fields.
- `C:\Projects\New Folder\export\decompiled_all.c:866086-866096` still proves the hard active slot cap `min(configured,0x80)`.
- `C:\Projects\New Folder\export\decompiled_all.c:866102-866424` shows `FUN_00a41e50` fading/removing/adding lights from already-built lists, then uploading accepted entries through `FUN_00a40b60`.
- `C:\Projects\New Folder\export\decompiled_all.c:453567-453602` still proves tile source-light carriers are created from `fx_flame01` at `sourcelight1/2`.
- `C:\Projects\New Folder\export\decompiled_all.c:880307-880381` shows `FUN_00a546cc` is a generic MDL/model object loader and not itself proof of active-light lane precedence.
- `FUN_00a4128c` appears as the light-manager list insertion wrapper, but this decompilation pass did not recover direct, typed owner call-sites proving a single final order between terrain-tile-light, placeables-2da-light, source-mdl-light-node, item-property-light, and progfx-type4-light-request.

Network cross-check:

- Web search for NWN/Aurora light-manager ordering found no primary retail source for cross-lane precedence. xoreos material is useful non-primary context only and not a retail ordering oracle; Beamdog EE update notes a newer lighting engine and dynamic-light count changes, but does not define the classic retail ordering used here.

Implementation decision:

- No ordering implementation was promoted in this loop.
- Current diagnostics remain correct: they prove observed source lanes and the recovered cap/score/upload path, while `scenePointLightRetailOrderingStatus` stays `blocked-no-recovered-retail-cross-lane-active-light-ordering`.

## Follow-up loop - ARE global/fog and static tile main-light correction - 2026-07-02

Question: after another source pass, are the remaining ARE main-light/global-light/fog blockers real runtime lights, or were we treating static Aurora data as dynamic PointLights?

Decompilation evidence recovered/confirmed:

- `C:/Projects/New Folder/export/decompiled_all.c:453281` loads `lightcolor.2da` for tile runtime.
- `C:/Projects/New Folder/export/decompiled_all.c:453323-453528` resolves `Tile_MainLight1/Tile_MainLight2` RGB through `FUN_00af3980`.
- `C:/Projects/New Folder/export/decompiled_all.c:453567-453602` creates `fx_flame01` only for `sourcelight1/sourcelight2`; no equivalent `FUN_00a546cc` carrier is created for tile main lights in this path.
- `C:/Projects/New Folder/export/decompiled_all.c:256239-256303` selects Sun/Moon ambient and diffuse fields by `IsNight`, unpacks packed color as byte0/byte1/byte2 divided by `255.0`, then sends `gidy_sun_amb` / `gidy_sun_diff` color commands.
- `C:/Projects/New Folder/export/decompiled_all.c:368987-369024` enables scene fog, selects Sun/Moon fog amount/color by `IsNight`, unpacks fog color as byte0/byte1/byte2 divided by `255.0`, computes fog start as `25 - FogAmount*25/15`, and reads `FogClipDist` from the area structure for fog end.
- `C:/Projects/New Folder/export/decompiled_all.c:865390-865409` uploads active-light RGB components scaled by fade and computes quadratic attenuation from radius; this supports the Three adapter proof that `color=RGB/max` plus `intensity=max` preserves the source RGB vector.

Implementation changes:

- `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts`
  - `Tile_MainLight1/Tile_MainLight2` no longer create fake `THREE.PointLight` instances.
  - Main tile lights are now represented as static `lightcolor.2da` diagnostic lane entries with `distance=0`, `decay=0`, and `falloff=not-applicable-static-tile-lightcolor`.
  - Only `Tile_SrcLight1/Tile_SrcLight2` are active dynamic PointLight candidates and consume the Aurora active-light slot budget.
  - Scene/layer diagnostics now separate `auroraTerrainTileLightStaticMainCount` from `auroraTerrainTileLightDynamicSourceCount`.
  - ARE global ambient/diffuse packed color byte order now matches the recovered runtime path; renderer intensity is `1.0` instead of the old preview scalar.
  - ARE fog now uses the recovered start formula and `FogClipDist` as fog end, scaled into the Three terrain adapter.
- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Placeable `LightColor` intensity proof is promoted from RGB-energy-unverified to `source-backed-lightcolor-rgb-vector-preserved-through-three-color-intensity`.
  - The renderer still uses normalized Three color plus max-channel intensity, but the proof now states the exact invariant: `color*intensity` equals the source `lightcolor.2da` RGB vector. This is not retail pixel/material parity.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - `area-tile-light-radius-falloff` is source-backed when renderable tile lights exist because main lights are proven static and source lights use recovered `fx_flame01/AuroraLight01`.
  - `area-global-light-intensity` now cites the decompiled byte-order/color command path and no longer reports preview-only scalar behavior.
  - `area-fog-range` now cites the recovered fog start/end formula instead of preview heuristics.
  - `placeable-lightstate-toggle` is now `placeable-lightstate-state` in meaning: it records both the recovered default `LightState=1` path and the NWScript illumination toggle/RecomputeStaticLighting path.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Superseded by the Item/ProgFX loop above: item/equipment `ItemPropertyLight` no longer uses `Three.PointLight` decay `2` as its current preview fallback.
  - It now records source-family `fx_light_clr.mdl` RGB/radius metadata, uses linear decay `1`, reports `falloff=source-family max(0,1-distance/13.3)`, and keeps the direct `ItemPropertyLight` scheduler caveat in `source-family-backed-fx_light_clr-mdl-radius-linear-falloff-itemproperty-scheduler-unverified`.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene-wide light samples now read `itemPropertyLightFalloffFormula` and `itemPropertyLightFalloffProofStatus`, so item-light proof frames preserve the blocker directly in the aggregate point-light sample.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts --run`
  - Passed 10 tests after the static main-light/global/fog changes.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js test/unit/area-lighting-evidence.spec.ts --runInBand`
  - Passed 4 tests after updating LightState/default audit coverage.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 1 test after the source-backed tile/global/fog audit changes.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor"`
  - Passed 1 focused test after promoting the placeable RGB/intensity preservation proof.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "ItemPropertyLight"`
  - Passed 2 focused tests after adding explicit item-light preview decay/falloff metadata.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 4 tests after preserving item-light falloff blockers in scene-wide diagnostics.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Current remaining blocker after this loop:

- Closed in this loop:
  - ARE `Tile_MainLight1/Tile_MainLight2` are no longer a missing point-light radius/falloff problem; they are static `lightcolor.2da` tile lanes.
  - ARE global ambient/diffuse packed color byte order and intensity are source-backed.
  - ARE fog color byte order, start formula, and end distance are source-backed.
  - Placeable `LightColor` RGB/intensity adapter proof is source-backed for preserving source RGB as `color*intensity`.
  - Backend audit now surfaces the recovered default `LightState=1` proof.
- Still blocked from full Aurora parity:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes.
  - Item/equipment `ItemPropertyLight` exact retail RGB calibration, exact falloff, and any retail shadow rule remain blocked by missing scheduler/call-site or retail oracle.

## Follow-up loop - ProgFX Type 4 token/source-MDL split - 2026-07-02

Question: after the `fx_light_clr.mdl` audit, are we still treating `Blue_5m` / `10m` / `15m` / `20m` as the actual light radius anywhere in the ProgFX Type 4 path?

Source evidence reused:

- `backend/docs/aurora-reverse/artifacts/item-light-retail-proof-2026-07-02/item-light-retail-resource-audit.json` proves retail `progfx.2da` Type 4 rows point at `fx_light_clr`.
- `backend/docs/aurora-reverse/artifacts/item-light-retail-proof-2026-07-02/fx_light_clr-animation-light-matrix.json` proves normal colored `fx_light_clr.mdl` animations use `AuroraLight01`, controller type `76` for RGB, and controller type `88` radius frames `0 -> 13.3`.

Implementation correction:

- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts`
  - `Blue_5m` style Type 4 `Param1` values now emit `animationTokenRadiusMeters=5/10/15/20` instead of pretending that suffix is the source MDL radius.
  - Light animations now also emit source MDL facts: `sourceMdlNodeName=AuroraLight01`, `sourceMdlAnimation`, `sourceMdlColor`, `sourceMdlRadiusMeters=13.3`, and `sourceMdlRadiusFrames=0,13.3`.
  - Vision animations now preserve source MDL facts only when `Param7=fx_light_clr`; for `Blind_Vision`, this is `sourceMdlNodeName=AuroraLight02`, `sourceMdlColor=0.3,0.3,0.3`, `sourceMdlRadiusMeters=7`, and `sourceMdlRadiusFrames=0,7`.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts`
  - `progFxType4Light.radiusMeters` / `radiusProofStatus` now refer to the recovered source MDL radius when available.
  - `tokenRadiusMeters` / `tokenRadiusProofStatus` preserve the `5m/10m/15m/20m` token separately.
  - `color` now uses the recovered source MDL RGB (`Blue_5m = 0.5,0.5,1`) rather than the old hand-picked diagnostic blue.
  - Vision requests keep source MDL facts but still leave the main light-request `radiusMeters` and `color` empty/black, so they are not promoted into fake scene lights.
- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`
  - Canonical VFX userData now preserves both token and source MDL facts.
- `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`
  - The dev proof route now exposes `data-progfx-type4-token-radius-*` and `data-progfx-type4-source-mdl-*` attributes.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Non-PointLight ProgFX samples now include token radius, source MDL radius/color, and proof statuses.

Verification:

- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js test/unit/aurora-vfx-source.parser.spec.ts test/unit/aurora-vfx-render-contract.spec.ts test/unit/vfx.application.service.spec.ts --runInBand -t "ProgFX Type 4|progfx"`
  - Passed 6 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "ProgFX Type 4|progfx|canonical renderer preserves ProgFX|workspaceSceneLightDiagnostics"`
  - Passed 13 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - ProgFX Type 4 no longer reports `5m/10m/15m/20m` as the source MDL radius.
  - ProgFX Type 4 diagnostics now preserve recovered `fx_light_clr.mdl` RGB/radius facts alongside the token.
  - ProgFX Type 4 vision diagnostics now preserve `AuroraLight02` source-MDL facts without creating a PointLight.
- Still blocked from full Aurora parity:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes.
  - ProgFX Type 4 retail scheduler behavior: priority, proximity suppression, scene attachment/removal, vision mutation, and shadow semantics.
  - Item/equipment `ItemPropertyLight` direct runtime scheduler/call-site and any item-light retail shadow rule.

## Follow-up loop - placeable light source radius vs scene scale - 2026-07-02

Question: are placeable `LightColor` proof frames mixing the retail `fx_placeable01` source radius with Aurora Web's Three/tile-space preview distance?

Problem found:

- The retail/source carrier is still `fx_placeable01.mdl` / `AuroraLight01` with source radius `10`, shadowradius `15`, and vertical displacement `3`.
- The frontend already used this carrier, but the rendered `THREE.PointLight.distance` was only stored as a generic `distance`. In catalog preview that value is `10 * max(objectRadius,0.5)`, so common proof frames showed `distance=5` while source metadata said `sourceRadius=10`.
- In area rendering, `LightOffset` was scaled with `PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE=0.1`, but the light radius path did not explicitly share/report that same source-unit scale.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Placeable 2DA lights now keep `sourceRadius=10` separate from `sourceRadiusWorldDistance`.
  - Runtime userData records `placeableTwoDaLightSourceRadiusUnits=aurora-model-units`, `placeableTwoDaLightSourceUnitScale`, `placeableTwoDaLightSourceRadiusWorldDistance`, and proof/source strings.
  - `PointLight.distance` is now explicitly source radius multiplied by the current source-unit scale, while `ShadowSize` remains unrelated to light radius.
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Area rendering passes `sourceUnitScale=PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE=0.1` to both `LightOffset` and radius.
  - Catalog/model preview keeps `sourceUnitScale=max(objectRadius,0.5)`, so existing preview framing is preserved but now labelled.
  - Placeable light diagnostics now include `sourceRadius`, `sourceRadiusUnits`, `sourceUnitScale`, and `sourceWorldDistance`.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene-wide PointLight samples now include `sourceRadiusUnits`, `sourceRadiusWorldScale`, and `sourceRadiusWorldDistance`.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "placeables\.2da light|workspaceSceneLightDiagnostics|PointLight lanes|area render"`
  - Passed 7 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Proof data no longer conflates retail/source radius `10` with scaled Three/tile-space `PointLight.distance`.
  - Area placeable light offset and radius now use the same source-unit scale.
- Still blocked from full Aurora parity:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes.
  - ProgFX Type 4 retail scheduler behavior: priority, proximity suppression, scene attachment/removal, vision mutation, and shadow semantics.
  - Item/equipment `ItemPropertyLight` direct runtime scheduler/call-site and any item-light retail shadow rule.

## Follow-up loop - ItemPropertyLight / ProgFX scheduler xref recheck - 2026-07-02

Question: can item/equipment `ItemPropertyLight` or ProgFX Type 4 be promoted from source-family-backed to direct retail runtime scheduler parity?

Local positive evidence:

- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:9728-9734` defines `ItemPropertyLight(int nBrightness, int nColor)` and says the caller supplies `IP_CONST_LIGHTBRIGHTNESS_*` and `IP_CONST_LIGHTCOLOR_*`.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:919-946` defines `VFX_DUR_LIGHT_*` rows `153..180`.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:6932-6935` defines `EffectVisualEffect(int nVisualEffectId, int nMissEffect=FALSE)`.
- `C:\Projects\New Folder\item-retail-extract\2da\iprp_costtable.2da:22` maps cost table row `18` to `IPRP_LIGHTCOST`.
- `C:\Projects\New Folder\export\decompiled_all.c:348242-348248` loads `visualeffects.2da` into a table slot, confirming the table is available to runtime data systems.

Negative audit:

- `rg -n -i "ItemPropertyLight|ITEM_PROPERTY_LIGHT|VFX_DUR_LIGHT|EffectVisualEffect|visualeffects|progfx|fx_light_clr|LightBlue5m|BlindVision" C:\Projects\New Folder\export\decompiled_all.c`
  - Only `visualeffects.2da` table-load strings were found in the decompiled C.
- Broader local sweep across `C:\Projects\New Folder\export` and `C:\Projects\New Folder\item-retail-extract` found NWScript constants/API and item 2DA metadata, but no recovered typed runtime call-site that inserts an item/equipment light or ProgFX Type 4 light into the active-light manager.
- The recovered active-light manager functions (`FUN_00a4128c`, `FUN_00a41850`, `FUN_00a41e50`, `FUN_00a40b60`) operate on already-built light lists and upload/score/fade them; they do not identify a direct `ItemPropertyLight` owner path or a ProgFX Type 4 owner/scheduler path.
- Web cross-check did not produce a primary retail source for item/ProgFX scheduler ordering or shadow semantics. Public NWN references document NWScript constants/functions and 2DA structure, but not the retail active-light insertion call-site.

Implementation decision:

- No code promotion was made in this loop.
- Current implementation remains intentionally conservative:
  - Item/equipment lights use source-family retail data from `ItemPropertyLight` metadata plus `VFX_DUR_LIGHT_* -> visualeffects.2da -> progfx.2da -> fx_light_clr.mdl`.
  - ProgFX Type 4 render contracts remain diagnostic requests with recovered token/source-MDL facts, not generic retail PointLights.
  - Item-light shadow behavior stays `blocked-no-decompiled-item-light-shadow-rule`.

Implementation hygiene from this pass:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Item/equipment light userData now records `itemPropertyLightSourceMdlRadiusUnits=meters`, `itemPropertyLightMetersToWorldScale`, and `itemPropertyLightSourceMdlRadiusWorldDistance`.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene-wide PointLight samples now surface item-light `sourceRadius=13.3`, `sourceRadiusUnits=meters`, the meter-to-world scale, and the scaled source radius distance instead of leaving item source radius as `unknown`.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "ItemPropertyLight|placeables\.2da light|workspaceSceneLightDiagnostics|PointLight lanes|area render"`
  - Passed 9 focused tests.

Current remaining blocker after this loop:

- Still blocked:
  - Direct `ItemPropertyLight` runtime scheduler/call-site.
  - Direct ProgFX Type 4 retail scheduler behavior: owner attachment, priority/proximity suppression, scene attachment/removal, vision mutation, shadow semantics.
  - Full recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - ShadowSize projection status wording hardening - 2026-07-02

Question: do runtime proof fields still overstate `ShadowSize` projection parity?

Problem found:

- The implementation correctly uses recovered `Fx_Shadow_S/M/L` emitter size/alpha/texture metadata, but the field `placeableTwoDaFastShadowProjectionStatus` still used a source-backed-looking value.
- That could be read as retail projection parity even though the renderer is still a Three circle/billboard proxy and not Aurora's retail shadow-volume/projection path.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - `placeableTwoDaFastShadowProjectionStatus` is now `preview-proxy-retail-shadow-mdl-emitter-no-retail-projection-parity`.
  - `placeableTwoDaFastShadowProjectionProofStatus` is now `source-backed-retail-shadowsize-shadow-mdl-selection-projection-blocked`.
  - `placeableTwoDaFastShadowProofStatus` is now `source-backed-retail-placeable-shadow-mdl-emitter-preview-proxy`.
- Tests in `workspaceObjectMeshLayer.vfxRenderMode.test.ts` and `workspaceSceneLightDiagnostics.test.ts` now assert the explicit no-retail-projection-parity status.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "placeables\.2da light|scene-wide shadow|workspaceSceneLightDiagnostics|area render|ItemPropertyLight"`
  - Passed 9 focused tests.

Current remaining blocker after this loop:

- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered retail insertion/order between tile/placeable/MDL/item/VFX light lanes.
  - Direct `ItemPropertyLight` runtime scheduler/call-site and item-light retail shadow rule.
  - Direct ProgFX Type 4 retail scheduler behavior: owner attachment, priority/proximity suppression, scene attachment/removal, vision mutation, shadow semantics.

## Follow-up loop - retail active-light score/sort proof surfaced - 2026-07-02

Question: can the retail active-light ordering blocker be narrowed beyond a generic "ordering unknown" status?

Positive decompilation evidence:

- `C:\Projects\New Folder\export\decompiled_all.c:865731-865735` recovers `FUN_00a41694`, which compares active-light score field `+0x84` with `<`.
- `C:\Projects\New Folder\export\decompiled_all.c:865838-865911` recovers `FUN_00a41850`, which writes score field `+0x84` from runtime camera distance, radius, multiplier, owner priority, and unresolved runtime fields.
- `C:\Projects\New Folder\export\decompiled_all.c:865710-865824` recovers `FUN_00a4165c/FUN_00a417bc`, which sort active/shadow light lists through that comparator.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene diagnostics now expose the retail sort score source, score formula summary, sort direction `ascending-score-field-0x84`, and proof status `source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked`.
  - These fields are written to both `scene.userData` and DOM `dataset` proof fields.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - Area lighting reports now carry the same retail active-light sort-score source/formula/direction/proof status inside `rendererLightBudget`.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 4 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npm.cmd run test:unit -- area-lighting-evidence.spec.ts --runInBand`
  - Passed 4 tests.

Current remaining blocker after this loop:

- Narrowed but still blocked:
  - Retail score/sort inside an already-built light list is source-backed.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes is still not recovered.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Direct `ItemPropertyLight` runtime scheduler/call-site and item-light retail shadow rule.
  - Direct ProgFX Type 4 retail scheduler behavior: owner attachment, priority/proximity suppression, scene attachment/removal, vision mutation, shadow semantics.

## Follow-up loop - tile source-light radius unit proof - 2026-07-02

Question: do tile `sourceLight1/sourceLight2` PointLights expose the same source-radius/unit-scale proof as placeable and item lights?

Problem found:

- Terrain source lights already used recovered `fx_flame01.mdl/AuroraLight01` source radius `7` and rendered `PointLight.distance=0.7` through `TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE=0.1`.
- The runtime metadata exposed `sourceRadius=7`, but did not explicitly expose radius units, source-unit scale, or scaled world distance. Scene diagnostics could therefore show the radius without the same audit clarity now present for placeables and item/equipment lights.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts`
  - Tile source-light userData now records `auroraTerrainTileLightSourceRadiusUnits=aurora-model-units`, `auroraTerrainTileLightSourceUnitScale=0.1`, `auroraTerrainTileLightSourceUnitScaleSource`, `auroraTerrainTileLightSourceRadiusWorldDistance=0.7`, and a world-distance source string.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Existing scene diagnostics now pick these fields up for `terrain-tile-light` samples, making source-radius proof consistent across tile, placeable, and item light lanes.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "tile light|workspaceSceneLightDiagnostics|PointLight lanes"`
  - Passed 14 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Terrain source-light radius proof no longer relies on implicit `7 * 0.1` knowledge.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Direct `ItemPropertyLight` runtime scheduler/call-site and item-light retail shadow rule.
  - Direct ProgFX Type 4 retail scheduler behavior: owner attachment, priority/proximity suppression, scene attachment/removal, vision mutation, shadow semantics.

## Follow-up loop - source MDL light-node radius unit proof - 2026-07-02

Question: do source MDL `light` nodes expose the same source-radius/unit-scale proof as tile, placeable 2DA, and item/equipment lights?

Problem found:

- Source MDL light-node previews already used the parsed MDL radius and animated radius timelines.
- `PointLight.distance` and `auroraLightWorldRadius` were correct for the preview scale, but diagnostics did not explicitly expose `auroraLightSourceRadiusUnits`, `auroraLightSourceUnitScale`, or `auroraLightSourceRadiusWorldDistance`.
- This made scene-wide samples less explicit for `source-mdl-light-node` than for the other light lanes.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`
  - Source MDL light nodes now record `auroraLightSourceRadiusUnits=aurora-model-units`.
  - They record `auroraLightSourceUnitScale=max(objectRadius,0.5)` and `auroraLightSourceRadiusWorldDistance=sourceRadius*sourceUnitScale`.
  - The proof string notes that `auroraLightWorldRadius` may apply the existing preview floor `objectRadius*0.9`, so source-scaled radius and renderer radius remain distinguishable.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Existing scene diagnostics now surface those fields for `source-mdl-light-node` samples.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "source MDL light|source-mdl|workspaceSceneLightDiagnostics|PointLight lanes"`
  - Passed 11 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Source MDL light-node radius proof no longer relies on implicit `sourceRadius*max(objectRadius,0.5)` knowledge.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Direct `ItemPropertyLight` runtime scheduler/call-site and item-light retail shadow rule.
  - Direct ProgFX Type 4 retail scheduler behavior: owner attachment, priority/proximity suppression, scene attachment/removal, vision mutation, shadow semantics.

## Follow-up loop - creature source MDL light-node radius diagnostics - 2026-07-02

Question: do creature source MDL light nodes feed the scene-wide `source-mdl-light-node` radius proof path?

Problem found:

- Creature source MDL lights use their own `creatureAuroraLight*` metadata path.
- The scene-wide light diagnostics already classified them as `source-mdl-light-node`, but radius/falloff/source-model sampling only read the placeable/source-MDL `auroraLight*` fields.
- This could make creature MDL lights appear with `unknown` source radius fields in aggregate proof samples.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Creature source MDL light nodes now record `creatureAuroraLightSourceRadius`, `creatureAuroraLightSourceRadiusUnits=aurora-model-units`, `creatureAuroraLightSourceUnitScale=1`, `creatureAuroraLightSourceRadiusWorldDistance`, and `creatureAuroraLightRadiusProofStatus=source-backed-creature-mdl-light-radius-controller`.
  - Animated creature light updates refresh those same fields as radius keyframes advance.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene-wide `source-mdl-light-node` samples now read creature source radius, units, scale, source-model file, radius proof, and falloff proof from `creatureAuroraLight*` metadata.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "creature source MDL light|creature source MDL|source-mdl|workspaceSceneLightDiagnostics|PointLight lanes"`
  - Passed 7 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Creature source MDL lights no longer lose source-radius proof in scene-wide diagnostics.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Direct `ItemPropertyLight` runtime scheduler/call-site and item-light retail shadow rule.
  - Direct ProgFX Type 4 retail scheduler behavior: owner attachment, priority/proximity suppression, scene attachment/removal, vision mutation, shadow semantics.

## Follow-up loop - catalog proof-route source radius / sort-score fields - 2026-07-02

Question: do catalog proof routes expose the same radius-unit and retail score/sort proof fields as scene diagnostics?

Problem found:

- `CatalogVfxPreviewRunner` source-MDL light samples printed `sourceRadius`, but not units, source-unit scale, or scaled world distance.
- Scene diagnostics had newly added retail active-light score/sort fields, but the catalog proof-route snapshot did not expose them as DOM `data-*` attributes.

Implementation correction:

- `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx`
  - `auroraLightSamples` now include `sourceRadiusUnits`, `sourceUnitScale`, and `sourceWorldDistance`.
  - Snapshot/DOM proof attributes now include `scenePointLightRetailOrderingSortScoreSource`, `scenePointLightRetailOrderingSortScoreFormula`, `scenePointLightRetailOrderingSortDirection`, and `scenePointLightRetailOrderingSortScoreProofStatus`.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run`
  - Passed 9 tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Catalog proof routes no longer hide source radius units/scale for source-MDL light samples.
  - Catalog proof routes now expose recovered active-light score/sort proof fields.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Direct `ItemPropertyLight` runtime scheduler/call-site and item-light retail shadow rule.
  - Direct ProgFX Type 4 retail scheduler behavior: owner attachment, priority/proximity suppression, scene attachment/removal, vision mutation, shadow semantics.

## Follow-up loop - remaining blocker web cross-check - 2026-07-02

Question: does public primary/vendor information close the ProgFX Type 4 scheduler gap?

Web cross-check:

- Beamdog patch 8193.15 documents that ProgFX were unhardcoded and that `progfx.2da` was added to link `visualeffect.2da` columns: https://www.beamdog.com/news/patch-819315-neverwinter-nights-enhanced-edition/
- This supports the table/source-family path already implemented for `visualeffects.2da -> progfx.2da -> fx_light_clr.mdl`.
- It does not document the retail runtime scheduler details still missing here: active-light insertion order, owner attachment/removal, proximity suppression, vision mutation, or shadow semantics.

Decision:

- No ProgFX Type 4 PointLight promotion was made from this web check.
- Current implementation remains correct: ProgFX Type 4 light/vision entries stay diagnostic requests unless decompilation or a retail oracle proves runtime scheduling parity.

## Follow-up loop - scene-wide retail shadow projection source fields - 2026-07-02

Question: do proof routes expose the retail shadow-plane/shadow-volume source path clearly enough to distinguish implemented Three.js shadows from unported Aurora retail projection?

Problem found:

- Scene diagnostics had a global retail shadow projection status, but proof routes did not expose the recovered decompilation source lines, shader names, or explicit blocker.
- This made screenshots/DOM proof ambiguous: a rendered shadow could be mistaken for retail shadow-volume/projection parity.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene shadow diagnostics now expose `retailProjectionSource`, `retailProjectionShaderNames`, `retailProjectionProofStatus`, and `retailProjectionBlocker`.
  - Source proof points at `FUN_00a82d8c` shadow-plane alpha, `FUN_00a83fec` runtime extents, and the shadow-volume shader path using `vs_shadowvol/fs_shadowvol`.
- `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx`
  - Catalog proof route snapshots and DOM attributes now include the retail projection source, shader names, proof status, and blocker.
- `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`
  - VFX fixture proof route snapshots and DOM attributes now include the same scene-wide retail shadow projection fields.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 18 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Proof routes now clearly say the retail shadow-plane/shadow-volume path is source-backed but not ported to active Three.js projection parity.
  - 2026-07-03 update: the paired-vertex/six-index caster buffer schema is now ported as `auroraShadowVolumeGeometry`; active renderer integration and pixel/geometry parity remain blocked.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Direct `ItemPropertyLight` runtime scheduler/call-site and item-light retail shadow rule.
  - Direct ProgFX Type 4 retail scheduler behavior: owner attachment, priority/proximity suppression, scene attachment/removal, vision mutation, shadow semantics.

## Follow-up loop - ProgFX Type 4 scheduler blocker proof fields - 2026-07-02

Question: can ProgFX Type 4 owner-phase fixtures explain exactly which retail runtime semantics remain missing, instead of only saying `runtime-unverified`?

Audit result:

- `C:\Projects\New Folder\export\decompiled_all.c:348244` proves this decompilation loads `visualeffects.2da`.
- String/decompilation search did not recover a `progfx.2da` runtime scheduler call-site or the owner attach/remove, priority, proximity suppression, attach-to-scene, vision mutation, or shadow semantics.
- Public Beamdog patch notes confirm `progfx.2da` was unhardcoded, but do not document those runtime scheduler semantics: https://www.beamdog.com/news/patch-819315-neverwinter-nights-enhanced-edition/

Implementation correction:

- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts`
  - `progFxType4Light` records now include `runtimeSchedulingProofSource`, `runtimeSchedulingBlocker`, `sceneAttachmentPolicyStatus`, `proximitySuppressionPolicyStatus`, `visionMutationPolicyStatus`, and `shadowPolicyStatus`.
  - Render-contract diagnostics now include `VFX_PROGFX_TYPE4_RUNTIME_SCHEDULING_PROOF_SOURCE` and `VFX_PROGFX_TYPE4_RUNTIME_POLICY_BLOCKED`.
- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`
  - Canonical VFX renderer preserves those fields in root/mesh `userData`.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene-wide non-PointLight request samples and ProgFX shadow-request samples now include the explicit runtime/blocker/policy fields.
- `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`
  - Fixture proof routes now expose the fields as `data-progfx-type4-*` attributes.

Verification:

- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npm.cmd run test:unit -- aurora-vfx-render-contract.spec.ts --runInBand`
  - Passed 20 tests.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 29 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - ProgFX Type 4 proof routes no longer hide which runtime scheduler semantics are missing.
  - ProgFX Type 4 `castShadows`, priority, proximity, and attach-to-scene remain source parameters, not promoted retail behavior.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Direct `ItemPropertyLight` runtime scheduler/call-site and item-light retail shadow rule.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - ItemPropertyLight scheduler/shadow negative proof fields - 2026-07-02

Question: can item/equipment `ItemPropertyLight` shadow policy explain exactly why `castShadow=false` remains blocked?

Audit result:

- `C:\Projects\New Folder\export\decompiled_all.c:139994-140007` loads `ItemProps`, `ItemPropDef`, and `IPRP_COSTTABLE`.
- `C:\Projects\New Folder\export\decompiled_all.c:140718` and `140979` load `IPRP_PARAMTABLE`.
- `C:\Projects\New Folder\export\decompiled_all.c:299249` maps `iprp_visualfx`, which is an item-property visual-effect table path, not an item-light scheduler.
- `C:\Projects\New Folder\export\decompiled_all.c:418041` recognizes the NWScript `itemproperty` type.
- No decompiled `ItemPropertyLight` runtime light/shadow scheduler call-site was recovered from these searches.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - Standalone and equipped item-light userData now carries `itemPropertyLightRuntimeSchedulerProofSource`, `itemPropertyLightRuntimeSchedulerBlocker`, and `itemPropertyLightShadowPolicySource`.
  - `itemPropertyLightShadowProofStatus=blocked-no-decompiled-item-light-shadow-rule` remains explicit; no item light is promoted to retail shadow casting.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - ItemPropertyLight shadow-policy samples now include runtime scheduler source, runtime blocker, and shadow-policy source.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "ItemPropertyLight|workspaceSceneLightDiagnostics|equipped ItemPropertyLight|source-backed item PointLight"`
  - Passed 9 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Item/equipment light shadow samples now show the decompilation areas searched and why the retail shadow rule is not claimed.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Direct `ItemPropertyLight` retail scheduler/call-site and item-light shadow rule.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - cross-lane ordering proof source hardening - 2026-07-02

Question: does the global active-light ordering blocker cite the concrete decompilation areas that were searched?

Problem found:

- `retailOrderingProofSource` already said cross-lane ordering was blocked, but the source text was too general.
- The status did not show the newer tile/item/ProgFX negative-proof lines added in later loops.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - `AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_SOURCE` now cites active-light score/sort/upload, terrain source-light carrier creation, item-property table/visualfx paths, and visualeffects table loading with no recovered ProgFX scheduler.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - Backend renderer-light-budget evidence now uses the same hardened cross-lane ordering proof source.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 5 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npm.cmd run test:unit -- area-lighting-evidence.spec.ts --runInBand`
  - Passed 4 tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Cross-lane ordering blocker now carries concrete decompilation references instead of a generic missing-call-site claim.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Direct `ItemPropertyLight` retail scheduler/call-site and item-light shadow rule.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - shadowvol light profile and blocker registry - 2026-07-02

Question: can the shadow-volume blocker expose the recovered retail light profile instead of only saying projection parity is missing?

Audit result:

- `C:\Projects\New Folder\export\decompiled_all.c:913914-913918` loads `vs_shadowvol` and `fs_shadowvol`.
- `C:\Projects\New Folder\export\decompiled_all.c:913930-913955` uses the point-light shadow profile when light radius `+0x58 <= 1000`, chooses `shadowradius +0x60` when positive otherwise `radius +0x58`, and adds `verticaldisplacement +0x64` to the projected light position.
- `C:\Projects\New Folder\export\decompiled_all.c:913956-913980` uses the distant/directional profile when radius `+0x58 > 1000`.
- `C:\Projects\New Folder\export\decompiled_all.c:913986-914017` binds the shadowvol shader path, walks geometry buckets `0xd/0xe/0xb/0xc`, draws caster geometry through `FUN_00a78128`, then clears the per-caster shadow counter.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene shadow diagnostics now expose `retailProjectionLightProfileSource`, `retailProjectionLightProfileStatus`, `retailProjectionGeometrySource`, `retailProjectionGeometryStatus`, and `retailProjectionRenderBuckets`.
  - `writeAuroraScenePointLightDiagnostics` writes those fields to scene `userData` and DOM dataset proof fields.
- `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`
  - Fixture proof routes now expose the recovered shadowvol profile and bucket list as `data-scene-shadow-retail-projection-*` attributes.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - `area-shadow-volume-implementation` proof now includes the recovered radius/shadowradius/verticaldisplacement rule and caster bucket path.
  - Backend audit coverage now has explicit blocked entries for `item-property-light-runtime-scheduler` and `progfx-type4-runtime-scheduler`, so the remaining scheduler blockers are not only visible in preview-specific diagnostics.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 9 focused tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npm.cmd run test:unit -- area-lighting-evidence.spec.ts --runInBand`
  - Passed 4 tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Shadowvol profile is now source-backed: radius threshold, shadowradius fallback, vertical displacement, shader pair, and geometry bucket path are all exposed in diagnostics/proof routes.
  - Area audit coverage now lists ItemPropertyLight and ProgFX Type 4 scheduler blockers explicitly.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection: recovered source metadata is exposed, but the Three renderer still does not port `FUN_00a878f8`/`FUN_00a78128` shadow-volume extrusion/projection or prove pixel parity.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Direct `ItemPropertyLight` retail scheduler/call-site and item-light shadow rule.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - light manager internal insertion proof - 2026-07-02

Question: can we separate recovered retail light-manager insertion from the still-missing cross-lane source ordering?

Audit result:

- `C:\Projects\New Folder\export\decompiled_all.c:865534-865548` recovers `FUN_00a4128c`, which inserts a light into:
  - all-lights list at manager `+0x8`;
  - no-`+0x70` list at manager `+0x20`;
  - shadow/extra list at manager `+0x14` when light field `+0x40` is set and either `+0x70` or `+0x6c` exists.
- `C:\Projects\New Folder\export\decompiled_all.c:865598-865614` removes a light from all internal manager lists.
- `C:\Projects\New Folder\export\decompiled_all.c:865675-865698` selects large-radius/distant lights into manager globals `+0x6c/+0x70`.
- The decompilation still does not expose a direct symbolized call-site that proves terrain tile, placeables.2da, source MDL, item-property, and ProgFX Type 4 insertion precedence into the same manager.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`
  - Scene point-light diagnostics now expose `retailOrderingManagerInternalInsertionSource`, `retailOrderingManagerInternalInsertionProofStatus`, and `retailOrderingManagerCrossLaneCallsiteBlocker`.
  - `writeAuroraScenePointLightDiagnostics` writes those fields to scene `userData` and DOM dataset proof fields.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts`
  - `renderer-active-light-ordering` proof now includes `FUN_00a4128c` internal manager insertion source before sort/upload evidence.
  - The blocker now states that source-lane precedence into the manager is still not proven, instead of implying the entire insertion mechanism is unknown.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 5 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npm.cmd run test:unit -- area-lighting-evidence.spec.ts --runInBand`
  - Passed 4 tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Retail light-manager internal insertion/removal lists are now source-backed and exposed separately from cross-lane ordering.
- Still blocked:
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes, specifically the direct source-lane call-site into `FUN_00a4128c`/vtable.
  - Direct `ItemPropertyLight` retail scheduler/call-site and item-light shadow rule.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - exact ItemPropertyLight fx_light_clr animation tokens - 2026-07-02

Question: are item-light proof fields using the exact retail `progfx.2da`/`fx_light_clr.mdl` animation tokens, not display labels?

Audit result:

- `backend/docs/aurora-reverse/artifacts/item-light-retail-proof-2026-07-02/fx_light_clr-animation-light-matrix.json` proves `AuroraLight01` colored-light animation names:
  - `Blue_5m/10m/15m/20m`;
  - `Yello_5m/10m/15m/20m`;
  - `Purp_5m/10m/15m/20m`;
  - `Red_5m/10m/15m/20m`;
  - `Gren_5m/10m/15m/20m`;
  - `Orng_5m/10m/15m/20m`;
  - `white_5m/10m/15m/20m`.
- `backend/docs/aurora-reverse/artifacts/item-light-retail-proof-2026-07-02/item-light-retail-resource-audit.json` cross-checks `progfx.2da` Type 4 rows:
  - `LightYellow5m` uses `Yello_5m`;
  - `LightOrange5m` uses `Orng_5m`;
  - `LightPurple5m` uses `Purp_5m`;
  - `LightGreen5m` uses `Gren_5m`;
  - `LightWhite5m` uses `White_5m`, while the binary MDL animation table exposes `white_5m`.

Problem found:

- `ItemPropertyLight` preview metadata used display labels such as `Yellow_5m`, `Purple_5m`, `Green_5m`, `Orange_5m`, and `White_5m` when filling `itemPropertyLightRelatedProgFxAnimation` / `itemPropertyLightSourceMdlAnimation`.
- Red and Blue tests did not catch this because their display labels match the retail tokens.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
  - `ItemPropertyLightColorPreview` now stores a separate `progFxAnimationPrefix`.
  - Display/source labels stay `Yellow`, `Purple`, `Green`, `Orange`, `White`, but actual proof/runtime animation fields now use `Yello`, `Purp`, `Gren`, `Orng`, and `white`.
  - Green still maps to NWScript `VFX_DUR_LIGHT_GREY_*` while its `progfx/fx_light_clr` animation token is `Gren_*`.
- `frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts`
  - Added a focused test covering Yellow, Purple, Green, Orange, and White exact animation tokens.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t ItemPropertyLight`
  - Passed 5 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - ItemPropertyLight source-family metadata now references real retail `progfx/fx_light_clr` animation tokens for non-identity color labels.
- Still blocked:
  - Direct `ItemPropertyLight` retail scheduler/call-site and item-light shadow rule.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - reproducible retail LightState default proof - 2026-07-02

Question: czy domyslny `LightState=1` jest tylko zalozeniem Aurora Web, czy mamy odtwarzalny retail-binary proof?

Audit result:

- Added `backend/scripts/audit-lightstate-default-retail-binary.mjs` to parse the local retail PE binary and verify the `LightState` xref path.
- Running `node backend/scripts/audit-lightstate-default-retail-binary.mjs` against `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe` reports:
  - image base `0x140000000`;
  - `LightState` string file offset `0x849c60`, RVA `0x84ae60`, VA `0x14084ae60`;
  - xref at VA `0x140448ed0` inside function `0x1404484d0..0x14044a2ec`;
  - default-on instruction at VA `0x140448eb5`, bytes `c7836803000001000000`, interpreted as `mov dword ptr [rbx+0x368], 1` before the optional `LightState` read;
  - proof status `source-backed-nwserver-lightstate-default-on-retail-binary-xref`.

Implementation correction:

- Backend runtime projection, backend area-lighting evidence, and frontend placeable renderer proof strings now carry the exact retail-binary function/xref/default-on instruction source.
- `placeable-lightstate-toggle` remains `source-backed` in area audit coverage, with the default proof separated from the NWScript Set/Get/RecomputeStaticLighting toggle proof.

Verification:

- `node backend/scripts/audit-lightstate-default-retail-binary.mjs`
  - Passed and emitted `source-backed-nwserver-lightstate-default-on-retail-binary-xref`.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts test/unit/catalog-processing.helpers.spec.ts test/unit/catalog.application.service.spec.ts --runInBand -t LightState`
  - Passed 3 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "missing UTP LightState|explicit Aurora Web LightState|runtime LightState"`
  - Passed 3 focused tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Decompiled/binary confirmation for default `LightState=1` is now reproducible and represented in active code/tests.
- Still blocked:
  - Direct `ItemPropertyLight` retail scheduler/call-site and item-light shadow rule.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - ItemPropertyLight local table hardening - 2026-07-02

Question: czy item/equipment `ItemPropertyLight` promien/kolor sa potwierdzone bezposrednio przez lokalne `iprp_lightcost.2da` / `iprp_color.2da`, czy tylko przez trase tabel i rodzine zrodel `VFX_DUR_LIGHT` / `ProgFX Type 4` / `fx_light_clr.mdl`?

Audit result:

- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:4643-4653` defines `IP_CONST_LIGHTBRIGHTNESS_DIM/LOW/NORMAL/BRIGHT` and `IP_CONST_LIGHTCOLOR_BLUE/YELLOW/PURPLE/RED/GREEN/ORANGE/WHITE`.
- `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:9732-9734` exposes `ItemPropertyLight(int nBrightness, int nColor)`.
- `C:\Projects\New Folder\item-retail-extract\2da\itempropdef.2da` row `44` routes `Light` to `costtable=18` and `param1=9`.
- `C:\Projects\New Folder\item-retail-extract\2da\iprp_costtable.2da` row `18` is `IPRP_LIGHTCOST`; `iprp_paramtable.2da` row `9` is `IPRP_COLOR`.
- The local extract/search did not recover physical `iprp_lightcost.2da` or `iprp_color.2da` files. The item-light display radii therefore must not be represented as direct local `iprp_lightcost.2da` proof.
- The current source-family route remains: NWScript `VFX_DUR_LIGHT_*` constants -> `visualeffects.2da` rows `153..180` -> `progfx.2da` Type `4` rows `300..327` / fade rows `350..377` -> `fx_light_clr.mdl` `AuroraLight01` color/radius animation controllers.

Implementation correction:

- Superseded by the later retail KEY/BIF loop: frontend `ItemPropertyLight` userData now reports `itemPropertyLightRadiusProofStatus=source-backed-retail-key-bif-iprp-lightcost-token-radius`.
- Frontend `itemPropertyLightBrightnessRadiusSource` now explicitly points at `nwn_base.key -> base_2da.bif`, because the physical `iprp_lightcost.2da` and `iprp_color.2da` resources were recovered from retail KEY/BIF even though the partial local extract lacked them.
- Frontend `itemPropertyLightRuntimeSchedulerProofSource` is further superseded by the later retail `ApplyLight` disassembly loop: the `ItemPropertyLight` to `VFX_DUR_LIGHT_*` / `CGameEffect` bridge is recovered, while client `PartLight` lifecycle and item-light shadow policy remain blocked.
- Backend audit coverage for `item-property-light-runtime-scheduler` now asserts the retail KEY/BIF table proof and the recovered `ApplyLight` bridge instead of the partial-extract-missing fact.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t ItemPropertyLight`
  - Passed 5 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - The implementation no longer claims direct local `iprp_lightcost.2da` radius proof where only route/source-family evidence exists.
  - Standalone and equipped item-light proof strings now consistently distinguish item property table routing, VFX source-family RGB/radius, and missing direct retail scheduler proof.
- Still blocked:
  - Direct `ItemPropertyLight` retail runtime scheduler/call-site and item-light shadow rule.
  - Direct ProgFX Type 4 runtime scheduler/owner lifecycle.
  - Full recovered insertion/merge ordering between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - ShadowSize exact MDL emitter provenance - 2026-07-02

Question: do runtime diagnostics preserve all exact retail-resource facts recovered for `placeables.2da ShadowSize`, not just the preview radius/opacity?

Audit result:

- `backend/docs/aurora-reverse/artifacts/shadowsize-retail-proof-2026-07-02/fx-shadow-mdl-parser-report.json` proves:
  - `fx_shadow_s.mdl`: emitter `Small`, hash `9eed0521a3a0c16c5ec29a54bd45c1036e5484e1da80a2fdcd3ad6fa4731e14e`, texture `fxpa_Dot01`, `Single`, `Billboard_to_Local_Z`, `Normal`, position `0,0,0.03`, size `1`, alpha `0.6`;
  - `fx_shadow_m.mdl`: emitter `Med`, hash `9dd315aab5fb5a5483b0c74fb696dbea7702227b0e662e1d0d6027d84eb99f7d`, same texture/type/render/blend/position, size `1.6`, alpha `0.6`;
  - `fx_shadow_l.mdl`: emitter `Large`, hash `7bef849b6b31160bc98146f815e75e3492731139e232bb4302ee20f4341a5be1`, same texture/type/render/blend/position, size `3`, alpha `0.7`.

Implementation correction:

- `resolvePlaceableTwoDaLightRenderDiagnostics` samples now include fast-shadow model hash, source node offset, emitter type, blend mode, and emitter position.
- `resolveAuroraScenePointLightDiagnostics().shadow.fastShadowSamples` now include the same exact fields for scene-level proof.
- Root placeable userData now propagates `placeableTwoDaFastShadowEmitterPosition` from the fast-shadow proxy.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da ShadowSize|placeables.2da LightColor"`
  - Passed 2 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - Exact `ShadowSize -> Fx_Shadow_S/M/L -> emitter hash/type/render/blend/position/size/alpha` provenance is now exposed in runtime diagnostics.
- Still blocked:
  - Retail shadow-volume/projection geometry and pixel parity remain unported/unproven.
  - Exact downstream placement/projection parity against retail/toolset remains blocked by missing retail oracle capture.

## Follow-up loop - exact ItemPropertyLight visualeffects/progfx mapping - 2026-07-02

Question: are item-light proof fields preserving the exact `visualeffects.2da` row, NWScript alias, and `progfx.2da` row instead of deriving a guessed offset?

Audit result:

- Local `nwscript.nss` exposes ids `177..180` as `VFX_DUR_LIGHT_GREY_*`, while extracted `visualeffects.2da` labels the same ids `VFX_DUR_LIGHT_GREEN_*`.
- `visualeffects.2da` rows `153..180` point at explicit `progfx.2da` normal and fade rows; the `progfx.2da` normal row order is `White 300..303`, `Blue 304..307`, `Yellow 308..311`, `Red 312..315`, `Orange 316..319`, `Purple 320..323`, `Green 324..327`, with fade rows `350..377`.
- Therefore `progfx.2da` rows cannot be derived by a simple `visualeffects row - 153` offset.

Implementation correction:

- ItemPropertyLight runtime userData and scene diagnostics now expose exact `visualeffects.2da` row id, NWScript constant alias, visualeffects label, normal `progfx.2da` row id/label, fade `progfx.2da` row id/label, and `fx_light_clr.mdl` animation token.
- Example mappings now asserted in tests:
  - `VFX_DUR_LIGHT_RED_20 -> LightRed20m row 315 / FadeLRed20m row 365 / Red_20m`;
  - `VFX_DUR_LIGHT_GREEN_5` with NWScript alias `VFX_DUR_LIGHT_GREY_5 -> LightGreen5m row 324 / FadeLGreen5m row 374 / Gren_5m`;
  - equipped Blue Low light `VFX_DUR_LIGHT_BLUE_10 -> LightBlue10m row 305 / FadeLBlue10m row 355 / Blue_10m`.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t ItemPropertyLight`
  - Passed 5 focused tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - ItemPropertyLight resource-family mapping is now exact for `visualeffects.2da` label, NWScript alias, `progfx.2da` normal/fade row, and `fx_light_clr.mdl` animation token.
- Still blocked:
  - Direct `ItemPropertyLight` retail scheduler/call-site and item-light shadow rule.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - audit gap registry and frontend contract parity - 2026-07-02

Question: can the area lighting audit expose every remaining non-source-backed point as data, and can the frontend accept the current backend Aurora-first report without silently rejecting new lanes?

Audit result:

- Backend `AreaLightingAuditCoverageKey` already included the current blocked lanes:
  - `item-property-light-runtime-scheduler`;
  - `progfx-type4-runtime-scheduler`;
  - `renderer-active-light-ordering`.
- Frontend `AreaApiLightingAuditCoverageKey` and the `httpAreaApiPort` Zod enum still stopped at `renderer-active-light-budget`, so a real backend report containing those blocked entries could fail client parsing.
- Frontend renderer budget schema still expected the old diagnostic strategy string instead of `source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback` and did not preserve the retail score/sort/upload proof fields.

Implementation correction:

- Frontend API contracts and Zod parsing now accept the current backend audit keys for ItemPropertyLight scheduler, ProgFX Type 4 scheduler, and active-light ordering.
- Frontend renderer budget contracts now preserve:
  - `priorityStrategyProofStatus`;
  - `retailMdlLightScoreSource`;
  - `retailMdlLightSortSource`;
  - `retailActiveLightSortScoreSource`;
  - `retailActiveLightSortScoreFormula`;
  - `retailActiveLightSortDirection`;
  - `retailActiveLightSortScoreProofStatus`;
  - `retailActiveLightUploadSource`;
  - `retailOrderingStatus`;
  - per-candidate `retailMdlScoreSource`, `retailMdlScoreProofStatus`, and `prioritySource`.
- Backend reports now include `auditGaps`: every audit coverage entry with `blocked`, `preview-only`, or `not-observed` status plus a concrete `nextStep`.
- Areas UI now exposes `data-audit-gaps`, `data-audit-coverage-not-observed`, and renders the current audit gaps list from `auditGaps` instead of deriving a partial blocked/preview-only list.
- Areas lighting telemetry now includes `auditCoverageBlocked`, `auditCoverageNotObserved`, and `auditGaps`.

Verification:

- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 10 tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/http-controllers.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Passed 18 tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - The backend/client contract now exposes the full current gap list instead of losing blocked lanes at the HTTP parser/UI boundary.
- Still blocked:
  - Direct `ItemPropertyLight` retail scheduler/call-site and item-light shadow rule.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - exact MDL AuroraLight field parser proof - 2026-07-02

Question: does the MDL light-node audit cite the recovered retail parser fields directly, instead of only saying the local parser extracts radius/color/shadow?

Audit result:

- `C:/Projects/New Folder/export/decompiled_all.c:883029-883250 FUN_00a5872c` parses MDL AuroraLight fields:
  - `color` into offset `+0x54`;
  - `radius` into `+0x58`;
  - `shadowradius` into `+0x60`;
  - `verticaldisplacement` into `+0x64`;
  - `multiplier` into `+0x8c`;
  - `shadow` into `+0xc0`;
  - `lightpriority` into `+0xb0`.

Implementation correction:

- Backend processed MDL light node samples now include:
  - `auroraLightFieldParserSource`;
  - `auroraLightFieldParserProofStatus=source-backed-mdl-auroralight-field-parser`.
- Frontend area API contracts and Zod parser preserve those two proof fields.
- The `mdl-light-node-radius-color-shadow` coverage proof now cites `FUN_00a5872c` directly.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts test/unit/areas.application.service.spec.ts`
  - Passed 27 tests. Jest reported a worker teardown warning after the green run.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts --run`
  - Passed 9 tests.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Current remaining blocker after this loop:

- Closed in this loop:
  - MDL AuroraLight field parser provenance is now carried in backend evidence and accepted by the frontend parser.
- Still blocked:
  - Direct `ItemPropertyLight` retail scheduler/call-site and item-light shadow rule.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Actual ProgFX Type 4 runtime scheduler implementation/parity, because the call-site and owner lifecycle are still unrecovered.

## Follow-up loop - ItemPropertyLight retail light export entrypoints - 2026-07-02

Question: czy `ItemPropertyLight` dalej ma status "brak retail scheduler/call-site", czy retail binary exposes enough light entrypoints to narrow the blocker?

Audit result:

- Added `backend/scripts/audit-retail-light-export-symbols.mjs` to parse the local retail PE export tables for light/item/VFX/manager symbols.
- Running `node backend/scripts/audit-retail-light-export-symbols.mjs` reports these relevant `nwserver.exe` exports:
  - `CNWSItemPropertyHandler::ApplyLight` at `0x140405e40`;
  - `CNWSEffectListHandler::OnApplyLight` at `0x1403c28d0`;
  - `CNWSEffectListHandler::OnRemoveLight` at `0x1403cb370`;
  - `CNWSVirtualMachineCommands::ExecuteCommandEffectVisualEffect` at `0x1404b0380`;
  - `CNWSEffectListHandler::OnApplyVisualEffect` at `0x1403c8b20`;
  - `CNWSEffectListHandler::OnRemoveVisualEffect` at `0x1403cd290`.
- The same script reports matching `nwmain.exe` handlers plus client light-manager exports:
  - `CNWSItemPropertyHandler::ApplyLight` at `0x140472270`;
  - `CNWSEffectListHandler::OnApplyLight` at `0x14042ed70`;
  - `CNWSEffectListHandler::OnRemoveLight` at `0x140437810`;
  - `LightManager::AddLight` at `0x14007dbd0`;
  - `LightManager::PrioritizeLights` at `0x14007ff60`;
  - `LightManager::RemoveLight` at `0x1400802d0`;
  - `LightManager::UpdateLights` at `0x140081100`.

Implementation correction:

- Frontend item/equipment light userData and backend area-lighting evidence no longer claim that no direct ItemPropertyLight light scheduler/call-site was recovered.
- The new blocker is narrower and source-backed: exact `IPRP_LIGHTCOST/IPRP_COLOR` value decode into the runtime light effect, client `PartLight` attach/update/removal, cross-lane insertion order, and item-light shadow policy remain unrecovered.
- API/UI fixtures and tests now use the same corrected blocker text, so `/areas/lighting/evidence`, scene diagnostics, and panel rendering do not regress to the stale "no scheduler call-site" claim.

Verification:

- `node backend/scripts/audit-retail-light-export-symbols.mjs`
  - Passed and emitted the export VA set above.
- `node backend/scripts/audit-lightstate-default-retail-binary.mjs`
  - Passed and still emits `source-backed-nwserver-lightstate-default-on-retail-binary-xref`.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t ItemPropertyLight`
  - Passed 5 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 10 tests.

Current remaining blocker after this loop:

- Closed in this loop:
  - ItemPropertyLight retail light/effect entrypoints are now reproducibly recovered from the local retail binaries and represented in active code, backend evidence, frontend diagnostics, and UI/API fixtures.
- Still blocked:
  - Exact `IPRP_LIGHTCOST/IPRP_COLOR` value decode inside `ApplyLight`/`OnApplyLight`.
  - Client `PartLight` attach/update/removal lifecycle and item-light shadow policy.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Actual ProgFX Type 4 runtime scheduler/owner lifecycle/proximity/vision/shadow semantics.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - ItemPropertyLight retail KEY/BIF light tables - 2026-07-02

Question: czy `iprp_lightcost.2da` i `iprp_color.2da` sa naprawde brakujace, czy tylko nie trafily do lokalnego `item-retail-extract`?

Audit result:

- Added `backend/scripts/audit-retail-item-light-tables.mjs` to read local retail `KEY/BIF` resources without relying on the partial `item-retail-extract`.
- Running `node backend/scripts/audit-retail-item-light-tables.mjs` against `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights` reports:
  - `nwn_base.key` has `597` 2DA resources; `nwn_retail.key` has `20`;
  - `itempropdef.2da` row `44`: `Label=Light`, `CostTableResRef=18`, `Param1ResRef=9`;
  - `iprp_costtable.2da` row `18`: `Name=IPRP_LIGHTCOST`, `Label=Light`, `ClientLoad=1`;
  - `iprp_paramtable.2da` row `9`: `TableResRef=IPRP_COLOR`;
  - `iprp_lightcost.2da` rows `1..4`: `Dim (5m) cost 0.2`, `Low (10m) cost 0.3`, `Normal (15m) cost 0.4`, `Bright (20m) cost 0.5`;
  - `iprp_color.2da` rows `0..6`: `Blue`, `Yellow`, `Purple`, `Red`, `Green`, `Orange`, `White`;
  - proof status `source-backed-retail-key-bif-item-light-tables`.

Implementation correction:

- Frontend `ItemPropertyLight` userData now reports `itemPropertyLightRadiusProofStatus=source-backed-retail-key-bif-iprp-lightcost-token-radius`.
- `itemPropertyLightBrightnessRadiusSource` now points to `nwn_base.key -> base_2da.bif` and lists the exact `iprp_lightcost` / `iprp_color` rows instead of saying only the local extract was missing.
- Backend area-lighting evidence and frontend/UI/API fixtures now include the retail KEY/BIF table proof in the ItemPropertyLight scheduler entry.
- Superseded by the next disassembly loop: the table/value layer is source-backed and the `ApplyLight` conversion into `VFX_DUR_LIGHT_*` / `CGameEffect` is now recovered; what remains blocked is client `PartLight` lifecycle, cross-lane insertion, and item-light shadow policy.

Verification:

- `node backend/scripts/audit-retail-item-light-tables.mjs`
  - Passed and emitted `source-backed-retail-key-bif-item-light-tables`.
- `node backend/scripts/audit-retail-light-export-symbols.mjs`
  - Passed and still emits the recovered `ApplyLight` / `OnApplyLight` / `OnRemoveLight` / `LightManager` export VA set.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t ItemPropertyLight`
  - Passed 5 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 10 tests.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Current remaining blocker after this loop:

- Closed in this loop:
  - Direct retail `iprp_lightcost.2da` and `iprp_color.2da` table proof is recovered from `nwn_base.key -> base_2da.bif`.
  - ItemPropertyLight token radius/color metadata is no longer blocked by the partial local extract.
- Still blocked:
  - Superseded by the next disassembly loop: exact `ApplyLight` conversion into `CGameEffect` is now recovered.
  - Client `PartLight` attach/update/removal lifecycle and item-light shadow policy remain blocked.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Actual ProgFX Type 4 runtime scheduler/owner lifecycle/proximity/vision/shadow semantics.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - ItemPropertyLight ApplyLight disassembly bridge - 2026-07-02

Question: can the retail `ApplyLight` export be promoted from "entrypoint found" to exact `ItemPropertyLight` value-to-light-effect mapping?

Audit result:

- Added `backend/scripts/audit-retail-light-function-disasm.py` fallback handling for exports that have no `.pdata` unwind range.
- Running `python backend/scripts/audit-retail-light-function-disasm.py` reports `proofStatus=source-backed-retail-light-export-function-ranges-disassembled`.
- `nwmain.exe` `CNWSItemPropertyHandler::ApplyLight` is recovered at `0x140472270..0x1404723e4`, size `372`, sha256 `f8f65f048d2955e1e99a74c96a10d397950d68d0ec9c35909d20e611a6796376`.
- `nwserver.exe` `CNWSItemPropertyHandler::ApplyLight` is recovered at `0x140405e40..0x140405fb4`, size `372`, sha256 `e2608e132f7efb5e1adec1a5c1893246d3d3c85c168f9875b1e47380a1afcc65`.
- Script output now proves the `ItemPropertyLight` bridge through `applyLightItemPropertyBridge`:
  - color byte `[CNWItemProperty+9]` uses a jump table from `iprp_color` values `0..6` to `VFX_DUR_LIGHT` base rows `153/157/161/165/177/169/173` for Blue/Yellow/Purple/Red/Green/Orange/White;
  - brightness word `[CNWItemProperty+6]` adds `0..3` for Dim/Low/Normal/Bright;
  - `createdCGameEffectSizeBytes=272`;
  - `internalApplyTargetVa=0x14048e350` in `nwmain.exe` and `0x140421f20` in `nwserver.exe`.
- `CNWSEffectListHandler::OnRemoveLight` has no hidden client light removal body in these retail binaries. The script now disassembles it by linear fallback as:
  - `nwserver.exe 0x1403cb370..0x1403cb376`, sha256 `2db31f4e09597946e56e859813bfdad7046d457c32332c3a882654d1e3ffdf67`, instructions `mov eax,1; ret`;
  - `nwmain.exe 0x140437810..0x140437816`, same sha256, instructions `mov eax,1; ret`.

Implementation correction:

- Frontend item/equipment light userData and backend area-lighting evidence now include the recovered `ApplyLight` value mapping and the trivial `OnRemoveLight` no-op proof.
- The `itemPropertyLightProgFxFamilyProofStatus` is now `source-backed-applylight-vfxdur-mdlnodelight-partlight-create-gob-attach-owner-lifecycle-unverified`: the item property to `VFX_DUR_LIGHT_*` / `CGameEffect` bridge is recovered, and generic `MdlNodeLight` client `PartLight` creation/Gob-list attach is recovered, but not the item-effect owner lifecycle.
- The remaining blocker is narrower: direct IPRP table proof, the `ApplyLight` bridge, and generic MDL-light `PartLight` creation/Gob-list attach are closed; item-effect owner attach/update/removal outside this no-op export, cross-lane insertion order, item-light shadow policy, ProgFX Type 4 runtime scheduler, and retail shadow projection parity are still open.

Verification:

- `node backend/scripts/audit-retail-item-light-tables.mjs`
  - Passed and emitted `source-backed-retail-key-bif-item-light-tables`.
- `python backend/scripts/audit-retail-light-function-disasm.py`
  - Passed and emitted `source-backed-retail-light-export-function-ranges-disassembled`, `applyLightItemPropertyBridge` for both `ApplyLight` exports, and nonzero fallback ranges for both `OnRemoveLight` exports.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t ItemPropertyLight`
  - Passed 5 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 10 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Current remaining blocker after this loop:

- Closed in this loop:
  - Exact `ApplyLight` value mapping from `ItemPropertyLight` brightness/color to `VFX_DUR_LIGHT_*` visualeffects row.
  - `OnRemoveLight` is no longer an unknown zero-size export; it is proven to be a trivial `mov eax,1; ret` handler.
- Still blocked:
  - Client `PartLight` attach/update/removal lifecycle outside the trivial `OnRemoveLight` export.
  - Item-light retail shadow policy.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Actual ProgFX Type 4 runtime scheduler/owner lifecycle/proximity/vision/shadow semantics.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - LightManager cross-lane xrefs - 2026-07-02

Question: can the full retail ordering between tile/placeable/MDL/item/VFX light lanes be recovered from direct `LightManager` call-sites?

Audit result:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `lightManagerRetailXrefs`.
- For `nwserver.exe`, `lightManagerRetailXrefs=null` because the requested `LightManager` client methods are not exported there.
- For `nwmain.exe`, `lightManagerRetailXrefs` reports:
  - `targetCount=4` for `LightManager::AddLight`, `PrioritizeLights`, `RemoveLight`, and `UpdateLights`;
  - `directCallXrefCount=0`;
  - `absoluteAddressRefCount=4`;
  - method address refs live in `.rdata`, consistent with vtable references;
  - `proofStatus=blocked-lightmanager-ordering-indirect-vtable-no-direct-call-xrefs`.

Implementation correction:

- Backend `/areas/lighting/evidence` and frontend scene diagnostics now carry this xref result in the retail ordering proof.
- The ordering blocker is now narrower and more explicit: internal manager insertion/sort/upload are recovered, exported `LightManager` methods are recovered, and binary xref scanning proves the easy direct-call route is empty. Full cross-lane precedence still requires resolving indirect/vtable owner paths or a retail runtime oracle.

Verification:

- `python backend/scripts/audit-retail-light-function-disasm.py`
  - Passed and emitted `lightManagerRetailXrefs` with `directCallXrefCount=0`, `absoluteAddressRefCount=4`, and `blocked-lightmanager-ordering-indirect-vtable-no-direct-call-xrefs`.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 10 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Current remaining blocker after this loop:

- Closed in this loop:
  - Direct-call `LightManager` xref audit is now reproducible and negative, not assumed.
  - Ordering proof explicitly distinguishes recovered manager internals from missing indirect/vtable owner call-sites.
- Still blocked:
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Client `PartLight` attach/update/removal lifecycle outside the trivial `OnRemoveLight` export.
  - Item-light retail shadow policy.
  - Actual ProgFX Type 4 runtime scheduler/owner lifecycle/proximity/vision/shadow semantics.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - generic MdlNodeLight PartLight lifecycle - 2026-07-02

Question: is `PartLight` lifecycle entirely unrecovered, or can the retail client prove the generic MDL light-node creation/list-attach path used by `fx_light_clr.mdl`?

Audit result:

- `backend/scripts/audit-retail-light-function-disasm.py` now includes `PartLight`, `MdlNodeLight`, `Gob::CollectLights`, and `CExoArrayList<PartLight>` exports in the requested-symbol scan.
- The script emits `mdlNodeLightPartLightLifecycle` for `nwmain.exe MdlNodeLight::InternalCreateInstance 0x140091980`:
  - `createdPartLightSizeBytes=192`;
  - `inlinePartLightVtableWriteCount=2`;
  - `gobPartLightListOffsets=0x470`;
  - `partLightListAddCalls` includes `CExoArrayList<PartLight>::Add` at `0x140091acc`;
  - proof status `source-backed-mdlnodelight-internalcreateinstance-partlight-create-gob-list-attach`.
- The script emits `gobCollectLightsEvidence` for `Gob::CollectLights 0x14008cd30`:
  - `asPartLightVtableCallOffsets=["0x14008cdba"]`;
  - list writes at `0x14008ce14` and `0x14008ce6e`;
  - proof status `source-backed-gob-collectlights-aspartlight-recursive-list-build`.
- This is relevant to `ItemPropertyLight` because the recovered item bridge maps to `VFX_DUR_LIGHT_*`, those visualeffects rows map to `progfx.2da` Type 4, and those rows use `fx_light_clr.mdl`, whose light source is the MDL `AuroraLight01` node.

Implementation correction:

- Active backend/frontend proof strings no longer say generic client `PartLight` lifecycle is entirely unrecovered.
- They now say: retail `ApplyLight`, retail IPRP tables, and generic `MdlNodeLight` `PartLight` creation/Gob-list attach are recovered; exact item-effect owner attach/update/removal, cross-lane insertion, and item-light shadow policy remain unrecovered.
- `itemPropertyLightProgFxFamilyProofStatus` is now `source-backed-applylight-vfxdur-mdlnodelight-partlight-create-gob-attach-owner-lifecycle-unverified`.

Verification:

- `python backend/scripts/audit-retail-light-function-disasm.py`
  - Passed and emitted both `mdlNodeLightPartLightLifecycle` and `gobCollectLightsEvidence`.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t ItemPropertyLight`
  - Passed 5 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 10 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Current remaining blocker after this loop:

- Closed in this loop:
  - Generic MDL light-node `PartLight` creation and Gob-list attach path is recovered from retail `nwmain.exe`.
  - `Gob::CollectLights` recursive `AsPartLight` list build is recovered enough to stop calling all client `PartLight` lifecycle unknown.
- Still blocked:
  - Exact item-effect owner attach/update/removal path from the `CGameEffect`/visualeffect owner to the MDL/Gob instance.
  - Item-light retail shadow policy.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Actual ProgFX Type 4 runtime scheduler/owner lifecycle/proximity/vision/shadow semantics.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - VisualEffect looping owner lifecycle - 2026-07-02

Question: can the item/equipment `ItemPropertyLight` and ProgFX Type 4 owner path be narrowed beyond "owner lifecycle unrecovered" by following retail `OnApplyVisualEffect` / `OnRemoveVisualEffect`?

Audit result:

- `backend/scripts/audit-retail-light-function-disasm.py` now includes `CGameEffect::GetInteger`, `GetObjectID`, `GetFloat`, `GetVector`, `CLoopingVisualEffect`, `CExoArrayList<CLoopingVisualEffect>`, `CNWSObject::AddLoopingVisualEffect`, `CNWSObject::RemoveLoopingVisualEffect`, and `CNWSMessage::SendServerToPlayerGameObjUpdateVisEffect` in the requested-symbol scan.
- For `nwmain.exe`, the script emits `visualEffectOwnerLifecycle`:
  - `OnApplyVisualEffect 0x140434fc0..0x140435635` reads `GetObjectID(0)`, `GetInteger(0/1/2)`, `GetFloat(0)`, and `GetVector(0/1)`;
  - it calls `CNWSObject::AddLoopingVisualEffect` at `0x140435400`;
  - it calls `CNWSMessage::SendServerToPlayerGameObjUpdateVisEffect` at `0x140435598`;
  - proof status `source-backed-onapplyvisualeffect-addloopingvisualeffect-owner-list-and-network-update`.
- For removal, the script emits:
  - `OnRemoveVisualEffect 0x140439730..0x140439ac7` calls `CNWSObject::RemoveLoopingVisualEffect` at `0x140439a75`;
  - proof status `source-backed-onremovevisualeffect-removeloopingvisualeffect-owner-list`.
- `CNWSObject::AddLoopingVisualEffect 0x14048da00..0x14048db90` writes 32-byte `CLoopingVisualEffect` records to `CNWSObject+0x160`, with count at `+0x168` and capacity at `+0x16c`.
- `CNWSObject::RemoveLoopingVisualEffect 0x140498960..0x140498ae1` removes from the same `CNWSObject+0x160/+0x168` list. Its `.pdata` entry only covers the first `42` bytes, so the audit script marks the function range as `.pdata+linear-ret-scan` and records the short `.pdata` range separately.
- `CLoopingVisualEffect` record layout is recovered: `visualEffectId +0x0`, `objectId +0x4`, subtype/flags `+0x8`, transform data `+0x10`, default object id `0x7f000000`.
- The same source-backed owner-list proof appears in both `nwserver.exe` and `nwmain.exe`, with client `nwmain.exe` addresses promoted to the active renderer/evidence strings.

Implementation correction:

- Backend and frontend proof strings no longer say exact item-effect owner add/remove is unrecovered at the object-list level.
- New blocker wording is narrower: retail `ApplyLight`, retail IPRP tables, object-level looping VFX owner add/remove, and generic `MdlNodeLight` `PartLight` creation/Gob-list attach are recovered; this wording is superseded by the next loop, which also recovers `CNWSMessage` last-update copy/diff through `CLastUpdateObject+0x108` and `CNWSObject+0x160`; client render/Gob instantiation from looping VFX into MDL/Gob/PartLight, cross-lane insertion order, and item-light shadow policy remain blocked.
- ProgFX Type 4 blocker wording now says object-level looping VFX owner add/remove is source-backed, while client render attach-to-scene, priority/proximity suppression, vision mutation, and shadow policy remain unrecovered.
- `itemPropertyLightProgFxFamilyProofStatus` was `source-backed-applylight-vfxdur-looping-vfx-owner-mdlnodelight-partlight-create-gob-attach-client-render-lifecycle-unverified` in this loop and is superseded by `source-backed-applylight-vfxdur-looping-vfx-owner-message-lastupdate-mdlnodelight-partlight-create-gob-attach-client-render-lifecycle-unverified` in the next loop.

Verification:

- `python backend/scripts/audit-retail-light-function-disasm.py`
  - Passed and emitted `source-backed-onapplyvisualeffect-addloopingvisualeffect-owner-list-and-network-update`, `source-backed-onremovevisualeffect-removeloopingvisualeffect-owner-list`, `source-backed-cnwsobject-addloopingvisualeffect-list-add-offset-0x160-count-0x168`, and `source-backed-cnwsobject-removeloopingvisualeffect-list-remove-offset-0x160-count-0x168`.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t ItemPropertyLight`
  - Passed 5 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 10 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts --run -t "ProgFX Type 4|progfx|canonical renderer preserves ProgFX"`
  - Passed 6 focused tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/aurora-vfx-render-contract.spec.ts test/unit/vfx.application.service.spec.ts -t "ProgFX Type 4|progfx"`
  - Passed 4 focused tests, with the existing worker-force-exit warning after completion.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Current remaining blocker after this loop:

- Closed in this loop:
  - Object-level `OnApplyVisualEffect` / `OnRemoveVisualEffect` owner add/remove is recovered for looping visual effects.
  - `CNWSObject` looping VFX list layout at `+0x160/+0x168/+0x16c` and `CLoopingVisualEffect` 32-byte identity/transform record layout are recovered.
- Still blocked:
  - Client render/Gob instantiation from the looping VFX owner list into concrete MDL/Gob/PartLight instances.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Item-light retail shadow policy.
  - ProgFX Type 4 client render scheduler parity for attach-to-scene, priority/proximity suppression, vision mutation, and shadow policy.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - CNWSMessage looping VFX last-update diff - 2026-07-02

Question: after `OnApplyVisualEffect` writes a `CLoopingVisualEffect` record to `CNWSObject+0x160`, can the retail message/update layer be proven to carry and diff that list before any client render attach?

Audit result:

- `backend/scripts/audit-retail-light-function-disasm.py` now includes `CNWSMessage::AssignVisualEffectLists`, `CompareVisualEffectLists`, `ComputeUpdateRequired`, `CreateNewLastUpdateObject`, `StoreValuesInLastUpdateObject`, `UpdateLastUpdateObject`, `WriteGameObjUpdate_UpdateObject`, plus `CLastUpdateObject::GetVisualTransformData` and `SetVisualTransformData`.
- The script now extends short `.pdata` ranges for `CNWSMessage::ComputeUpdateRequired` and `CNWSMessage::UpdateLastUpdateObject` with a linear scan to the real `ret`; without this, the retail body that copies/diffs VFX lists is partially hidden behind short unwind ranges.
- For `nwmain.exe`, the script emits `visualEffectMessageUpdateEvidence`:
  - `CNWSMessage::UpdateLastUpdateObject 0x1404e5700..0x1404e6305` has proof status `source-backed-cnwsmessage-lastupdate-visual-transform-and-looping-vfx-list-store`;
  - it calls `CLastUpdateObject::SetVisualTransformData` at `0x1404e584e`;
  - it copies `CNWSObject.loopingVisualEffects` at `CNWSObject+0x160` into `CLastUpdateObject.loopingVisualEffectsSnapshot` at `CLastUpdateObject+0x108` via helper `0x1404c76b0`, with the copy call at `0x1404e5a30`;
  - it reports `directRenderPathProofStatus=blocked-no-direct-render-light-call-from-message-update-function`.
- `CNWSMessage::ComputeUpdateRequired 0x1404ca840..0x1404cba1a` has proof status `source-backed-cnwsmessage-computeupdate-looping-vfx-list-compare-offsets-0x108-0x160`:
  - call `0x1404caac1` compares `CLastUpdateObject+0x108` against current `CNWSObject+0x160` using `CNWSMessage::CompareVisualEffectLists`;
  - call `0x1404cb4cb` performs the same comparison on the second object path;
  - it also reports `directRenderPathProofStatus=blocked-no-direct-render-light-call-from-message-update-function`.
- `CNWSMessage::CompareVisualEffectLists 0x1404c8a60..0x1404c8b16` compares list count/data and walks 32-byte looping VFX records, matching the earlier `CLoopingVisualEffect` record-size proof.
- Raw `E8 rel32` xref scanning now reports `visualEffectMessageRetailXrefs directCallXrefCount=14` in both `nwserver.exe` and `nwmain.exe`. For `nwmain.exe`, the first observed xrefs include `CreateNewLastUpdateObject` at `0x1404c8f11`, `WriteGameObjUpdate_UpdateObject` at `0x1404c8f40`, `UpdateLastUpdateObject` at `0x1404c8f56`, `ComputeUpdateRequired` at `0x1404c91cc`, and `CLastUpdateObject::GetVisualTransformData` at `0x1404ca89e`.

Implementation correction:

- Backend area-lighting evidence now appends the `CNWSMessage` last-update copy/diff proof to the `ItemPropertyLight runtime scheduler` proof string.
- Frontend `ItemPropertyLight` userData now exposes the same proof through `itemPropertyLightRuntimeSchedulerProofSource`.
- Item/equipment and ProgFX Type 4 blockers are narrower: object-level owner add/remove and message-layer last-update copy/diff are source-backed; the remaining missing piece is the client render/Gob instantiation from the looping VFX list into concrete MDL/Gob/PartLight instances, plus ordering and shadow policy.
- The preview still does not claim retail item-light shadow policy or full cross-lane ordering. `castShadow=false` for item-property preview lights remains explicit.

Verification:

- `python backend/scripts/audit-retail-light-function-disasm.py`
  - Passed and emitted:
    - `source-backed-cnwsmessage-lastupdate-visual-transform-and-looping-vfx-list-store`;
    - `source-backed-cnwsmessage-computeupdate-looping-vfx-list-compare-offsets-0x108-0x160`;
    - `source-backed-cnwsmessage-comparevisualeffectlists-record-size-32`;
    - `source-backed-visualeffect-message-update-direct-call-xrefs`.

Current remaining blocker after this loop:

- Closed in this loop:
  - Retail message/update copy from `CNWSObject+0x160` to `CLastUpdateObject+0x108`.
  - Retail diff from `CLastUpdateObject+0x108` to current `CNWSObject+0x160`.
  - Negative direct-call proof that these message/update functions do not directly call the recovered render-light targets.
- Still blocked:
  - Client render/Gob instantiation from the looping VFX owner/list snapshot into concrete MDL/Gob/PartLight instances.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Item-light retail shadow policy.
  - ProgFX Type 4 client render scheduler parity for attach-to-scene, priority/proximity suppression, vision mutation, and shadow policy.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - CNWSMessage looping VFX network serialization - 2026-07-02

Question: after the `CNWSMessage` last-update diff proves that `CLastUpdateObject+0x108` is compared with `CNWSObject+0x160`, can the retail game-object update packet writer be proven to serialize looping VFX records before the client-side render attach?

Audit result:

- `backend/scripts/audit-retail-light-function-disasm.py` now includes writer/runtime symbols used by this path:
  - `CLoopingVisualEffect::GetIsBeam`;
  - `CNWMessage::WriteBYTE`;
  - `CNWMessage::WriteWORD`;
  - `CNWSMessage::WriteOBJECTIDServer`;
  - `ObjectVisualTransformData::Write`;
  - `CNWSPlayer::SatisfiesBuild`;
  - `CNWSMessage::WriteGameObjUpdate_UpdateObject`.
- The script now emits `visualEffectNetworkUpdateEvidence` for `CNWSMessage::WriteGameObjUpdate_UpdateObject`.
- For `nwmain.exe`, the recovered network writer is:
  - function range `0x1404eb590..0x1404edc4a`;
  - proof status `source-backed-cnwsmessage-writegameobjupdate-looping-vfx-serializes-record-fields`;
  - current owner list reads from `CNWSObject+0x160`, including `0x1404ec322`, `0x1404ec750`, and `0x1404ec7a5`;
  - last-update snapshot reads from `CLastUpdateObject+0x108`, including `0x1404eb625`, `0x1404ec48c`, and `0x1404ec4db`;
  - four `CLoopingVisualEffect::GetIsBeam` calls at `0x1404ec33e`, `0x1404ec4ec`, `0x1404ec74b`, and `0x1404ec9ef`;
  - message writes through `CNWMessage::WriteBYTE`, `CNWMessage::WriteWORD`, `CNWSMessage::WriteOBJECTIDServer`, and `ObjectVisualTransformData::Write`;
  - transform-data serialization via `ObjectVisualTransformData::Write` at `0x1404eca3a`, with `r8 = CLoopingVisualEffect+0x10`.
- The same proof shape exists in `nwserver.exe`: `WriteGameObjUpdate_UpdateObject 0x14047f160..0x14048181a` emits the same `source-backed-cnwsmessage-writegameobjupdate-looping-vfx-serializes-record-fields` status.
- This writer reports `directRenderPathProofStatus=blocked-no-direct-render-light-call-from-network-update-writer`, so it closes the network serialization layer without pretending to be the client render attach.

Implementation correction:

- Backend `ItemPropertyLight runtime scheduler` proof now appends both:
  - `CNWSMessage` last-update copy/diff proof;
  - `CNWSMessage` game-object update serialization proof.
- Frontend `itemPropertyLightRuntimeSchedulerProofSource` now exposes both proof segments in scene/userData diagnostics.
- ProgFX Type 4 runtime proof now says owner add/remove, last-update copy/diff, and network serialization are source-backed.
- Remaining blocker wording now says `client receive/render/Gob instantiation` to distinguish the already recovered server/update serialization from the still unrecovered client-side construction of concrete MDL/Gob/PartLight instances.

Verification:

- `python backend/scripts/audit-retail-light-function-disasm.py`
  - Passed and emitted `source-backed-cnwsmessage-writegameobjupdate-looping-vfx-serializes-record-fields` for both `nwserver.exe` and `nwmain.exe`.

Current remaining blocker after this loop:

- Closed in this loop:
  - Retail game-object update packet writer serializes looping VFX records from current/snapshot lists.
  - Record fields `visualEffectId`, beam object id path, subtype/flags, and transform data are source-backed at the network serialization layer.
  - Negative direct-call proof that the network writer does not directly call recovered render-light targets.
- Still blocked:
  - Client receive/render/Gob instantiation from serialized looping VFX records into concrete MDL/Gob/PartLight instances.
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - Item-light retail shadow policy.
  - ProgFX Type 4 client scheduler parity for attach-to-scene, priority/proximity suppression, vision mutation, and shadow policy.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - CNWCMessage client receive/render VFX attach - 2026-07-02

Question: after the server/update layer serializes looping VFX records, can the client-side receive path be proven to instantiate visual-effect models/Gobs that flow into the recovered generic MDL `MdlNodeLight -> PartLight -> Gob+0x470` path?

Audit result:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `clientVisualEffectReceiveRenderEvidence` for `nwmain.exe`.
- Top-level proof status is `source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path`.
- Recovered dispatch chain:
  - `CNWCMessage::HandleServerToPlayerMessage 0x1407a41a0..0x1407a4d28` calls `HandleServerToPlayerGameObjectUpdate` at `0x1407a4843`;
  - `HandleServerToPlayerGameObjectUpdate 0x14079bce0..0x14079c048` calls `HandleServerToPlayerUpdate_Update` at `0x14079be47`;
  - `HandleServerToPlayerGenericObjectUpdate_Update 0x14079c050..0x14079cea5` calls `HandleServerToPlayerUpdateVisualEffects` at `0x14079cd60`;
  - `HandleServerToPlayerCreatureUpdate_Update 0x140781e80..0x1407857e8` calls `HandleServerToPlayerUpdateVisualEffects` at `0x140782fb1`.
- `CNWCMessage::HandleServerToPlayerUpdateVisualEffects 0x1407b1f00..0x1407b23db` reads:
  - record count through `CNWMessage::ReadWORD` at `0x1407b1fea`;
  - action byte through `ReadBYTE` at `0x1407b202b`;
  - `visualEffectId` through `ReadWORD` at `0x1407b203c`;
  - object id through client object-id helper `0x1409737c0` at `0x1407b214d`;
  - subtype/flag through `ReadBYTE` at `0x1407b2160`;
  - `ObjectVisualTransformData` through helper `0x140973160` at `0x1407b21ae`;
  - action `0x41` calls client object vtable slot `+0x178` at `0x1407b22a0`;
  - action `0x44` calls client object vtable slot `+0x180` at `0x1407b22bc`.
- Vtable slot recovery:
  - `CNWCObject`, `CNWCCreature`, `CNWCDoor`, `CNWCTrigger`, `CNWCPlaceable`, `CNWCVisualEffect`, and `CNWCAreaOfEffectObject` resolve `+0x178/+0x180` to `0x140762180/0x140762ad0`.
  - `CNWCItem` also exposes an item-specific vtable at `0x140e4ceb0` with slots `0x140765b00/0x140765bd0`, plus a second vtable at `0x140e4cec0` that resolves to the generic `0x140762180/0x140762ad0` pair.
- Generic client add/remove/refresh path:
  - `0x140762180` calls `CNWCVisualEffectOnObject::LoadVisualEffect` at `0x140762276`, adds the visual effect to the linked list through `CExoLinkedListInternal::AddTail` at `0x1407622c6`, and calls refresh/node-attach helpers `0x140970e20`, `0x1409702e0`, `0x14096c180`, and `0x14096c450`.
  - `0x140762ad0` calls the fx-light loader region `0x14096c610` and runtime scene helper `0x14096c450`.
  - `CNWCObject::RefreshVisualEffects 0x140763d60..0x140763f45` calls `0x1409702e0` and walks existing visual effects when the object is active.
- Source model/Gob instantiation:
  - `CNWCVisualEffectOnObject::LoadVisualEffect 0x14096cf10..0x14096ed64` references `ProgFX_Impact`, `ProgFX_Duration`, `ProgFX_Cessation`, `fxground`, `fximpact`, and `fxhead`, and calls `NewCAurObject 0x1400931f0` at `0x14096ea48`, `0x14096eacb`, and `0x14096eb4c`.
  - The `fx_light` loader region starting at `0x14096c610` references `fx_light` and calls `NewCAurObject` at `0x14096cc73` and `0x14096cdba`.
  - `CNWCAnimBaseVisualEffect::LoadModel 0x1409b2cb0..0x1409b2f23` calls `NewCAurObject` at `0x1409b2e7d` and stores the result at object offset `+0xc8`.
  - The existing generic `MdlNodeLight::InternalCreateInstance` evidence in the same script remains the proof that MDL `AuroraLight` nodes become `PartLight` instances attached to the Gob PartLight list at `Gob+0x470`.

Implementation correction:

- Backend area-lighting evidence now appends `LOOPING_VISUAL_EFFECT_CLIENT_RECEIVE_RENDER_PROOF_SOURCE`.
- Frontend item-light diagnostics now include the client receive/render proof in `itemPropertyLightRuntimeSchedulerProofSource`.
- ProgFX Type 4 proof text now says client receive/render object attach and `NewCAurObject/Gob` model instantiation are source-backed.
- The old blocker "client receive/render/Gob instantiation from looping VFX" is superseded by this loop.

Verification:

- `python backend/scripts/audit-retail-light-function-disasm.py`
  - Passed for the full default binary set.
- Targeted status read for `nwmain.exe` emitted:
  - `source-backed-cnwcmessage-client-vfx-update-dispatch-chain`;
  - `source-backed-cnwcmessage-updatevisualeffects-reads-serialized-looping-vfx-and-calls-client-object-vtable`;
  - `source-backed-client-object-looping-vfx-vtable-add-remove-slots`;
  - `source-backed-client-object-add-remove-refresh-looping-vfx-path`;
  - `source-backed-client-vfx-loadvisualeffect-newcaurobject-model-loader-path`;
  - `source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path`.

Current remaining blocker after this loop:

- Closed in this loop:
  - Client receive of serialized looping VFX records.
  - Client add/remove dispatch through `CNWCObject` vtable slots.
  - Client visual-effect source-model/Gob instantiation through `NewCAurObject`.
  - Connection from client VFX source models back to the already recovered generic MDL `AuroraLight -> PartLight -> Gob+0x470` path.
- Still blocked:
  - Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
  - ProgFX Type 4 priority/proximity suppression, scene attachment/removal, and vision mutation parity. Non-item cast-shadow rows were later closed as source-backed absent on 2026-07-03.
  - Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - ItemPropertyLight ProgFX Type 4 Param3 shadow toggle - 2026-07-02

Question: is the item/equipment light shadow toggle source-backed, or was `castShadow=false` only our diagnostic placeholder?

Recovered evidence:

- `backend/docs/aurora-reverse/artifacts/item-light-retail-proof-2026-07-02/item-light-retail-resource-audit.json` reads retail `nwn_base.key -> progfx.2da` and `fx_light_clr.mdl`.
- `progfx.2da` Type 4 schema is preserved by the parser as `Param1 animation`, `Param2 speed`, `Param3 cast shadows`, `Param4 priority`, `Param5 proximity suppression`, `Param6 attach to scene`, `Param7 model`.
- Normal item-light rows `300..327` and fade rows `350..377` are explicit:
  - all `*5m` rows use `Param3 = 0`;
  - all `*10m`, `*15m`, and `*20m` rows use `Param3 = 1`.
- Examples from the artifact:
  - `300 LightWhite5m ... Param3 0 ... fx_light_clr`;
  - `305 LightBlue10m ... Param3 1 ... fx_light_clr`;
  - `315 LightRed20m ... Param3 1 ... fx_light_clr`;
  - `350 FadeLWhite5m ... Param3 0 ... fx_light_clr`;
  - `355 FadeLBlue10m ... Param3 1 ... fx_light_clr`.
- `fx_light_clr.mdl` still supplies the actual source model light family through `AuroraLight01`; the same audit family reports the light node, radius/color animation, and MDL light metadata already used by the item-light preview.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts` now maps item/equipment light `castShadow` from the recovered retail rule:
  - `Dim / 5m` -> `itemPropertyLightRelatedProgFxCastShadowsRaw="0"`, `castShadow=false`, `itemPropertyLightShadowStatus=disabled-by-progfx-param3`;
  - `Low/Normal/Bright / 10m/15m/20m` -> `itemPropertyLightRelatedProgFxCastShadowsRaw="1"`, `castShadow=true`, `itemPropertyLightShadowStatus=enabled-by-progfx-param3`.
- Normal and fade ProgFX rows carry the same recovered raw toggle in `itemPropertyLightRelatedProgFxCastShadowsRaw` and `itemPropertyLightRelatedProgFxFadeCastShadowsRaw`.
- Active evidence strings now use proof status `source-backed-progfx-type4-param3-item-light-shadow-toggle-shadowvol-projection-blocked`.
- Backend area-lighting coverage now says the item-light shadow toggle is recovered and narrows the remaining blocker to cross-lane insertion order plus retail shadow-volume/projection parity.
- `workspaceSceneLightDiagnostics` no longer falls back to the old "blocked-no-decompiled-item-light-shadow-rule" wording when an ad-hoc item light is missing source-backed userData.

Superseded blocker:

- The previous active blocker "item-light shadow policy" is closed for the `ItemPropertyLight -> VFX_DUR_LIGHT -> progfx.2da Type 4 -> fx_light_clr.mdl` family.
- This does not close retail shadow-volume/projection parity: Three.js `PointLight.castShadow` is now driven by the retail toggle, but the exact Aurora shadow-volume geometry/projection/pixel behavior remains blocked.

Remaining blocker after this loop:

- Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
- ProgFX Type 4 priority/proximity suppression, scene attachment/removal, and vision mutation parity. Non-item cast-shadow rows were later closed as source-backed absent on 2026-07-03.
- Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - widened LightManager cross-lane ordering xref audit - 2026-07-02

Question: was the retail ordering blocker only caused by scanning too few `LightManager` exports?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now includes every exported `LightManager` function that resolves into `.text`, not only the requested `AddLight`, `PrioritizeLights`, `RemoveLight`, and `UpdateLights` quartet.
- Fresh `nwmain.exe` extraction reports:
  - `targetCount=23`;
  - `requestedTargetCount=4`;
  - `directCallXrefCount=0`;
  - `absoluteAddressRefCount=12`;
  - `proofStatus=blocked-lightmanager-ordering-indirect-vtable-no-direct-call-xrefs`.
- The `.rdata` vtable region includes `PrioritizeLights`, `EnableLights`, `EnableLightsDynamicOnly`, `AddLight`, `RemoveLight`, `UpdateLights`, `SetupLightsForThisPositionAndRadius`, `CombineLights`, `PrioritizeIllumination`, `PrioritizeShadow`, `GroupLights`, and `ControlLightsFade`.
- No direct call xrefs were recovered even after widening to the full exported `LightManager` function family.

Implementation/evidence correction:

- Backend and frontend ordering evidence now cite `targetCount=23/requestedTargetCount=4`, `directCallXrefCount=0`, and `absoluteAddressRefCount=12`.
- The renderer ordering remains diagnostic-only: source lanes are ordered by recovered MDL score/priority fallback in preview, not by a claimed retail cross-lane insertion order.

Remaining blocker after this loop:

- Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes remains blocked because the binary exposes the `LightManager` family through vtable data but not direct/symbolized lane call-sites.
- ProgFX Type 4 priority/proximity suppression, scene attachment/removal, and vision mutation parity. Non-item cast-shadow rows were later closed as source-backed absent on 2026-07-03.
- Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - source-MDL shadowradius projection distance cleanup - 2026-07-02

Question: does Aurora Web use recovered `shadowradius` as a projection radius, or does it mix source units with Three.js shadow-map blur?

Issue found:

- Source-MDL point lights carried `auroraLightAnimatedShadowRadius`, but `PointLight.shadow.camera.far` mixed world-space light radius with raw source `shadowradius`.
- `PointLight.shadow.radius` is a Three.js shadow-map blur value, not Aurora's retail projection radius; using it as if it were the retail radius made the proof ambiguous.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts` now computes:
  - `auroraLightShadowProjectionSourceRadius = shadowradius > 0 ? shadowradius : radius`;
  - `auroraLightShadowProjectionRadiusWorldDistance = max(0, auroraLightShadowProjectionSourceRadius * sourceUnitScale)`.
- `PointLight.shadow.camera.far` now uses `max(lightWorldRadius, auroraLightShadowProjectionRadiusWorldDistance, 0.5)`.
- `PointLight.shadow.radius` remains exposed separately as `auroraLightShadowMapBlurRadius` with source text saying it is a Three shadow-map blur preview value.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts` now includes `projectionSourceRadius`, `projectionWorldRadius`, `projectionRadiusSource`, and `projectionRadiusProof` in source-MDL shadow samples.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "source MDL light-node|negative radius"`
  - Passed 3 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- This improves the Three preview's source-MDL shadow camera distance and diagnostics, but it still does not port Aurora's `FUN_00a878f8`/`FUN_00a78128` shadow-volume extrusion/caster draw path or prove pixel parity.
- Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
- ProgFX Type 4 priority/proximity suppression, scene attachment/removal, and vision mutation parity. Non-item cast-shadow rows were later closed as source-backed absent on 2026-07-03.

## Follow-up loop - ProgFX Type 4 Param3/4/5/6 source-table preservation - 2026-07-02

Question: were `Param3 cast shadows`, `Param4 priority`, `Param5 proximity suppression`, and `Param6 attach to scene` still missing, or only their retail runtime scheduler behavior?

Recovered evidence:

- `nwn_base.key -> progfx.2da` rows are available in the retail resource audit, including Type 4 light rows `300..333` and fade rows `350..377`.
- The preserved Type 4 schema is:
  - `Param1` animation token;
  - `Param2` animation speed;
  - `Param3` cast shadows;
  - `Param4` priority;
  - `Param5` proximity suppression;
  - `Param6` attach to scene;
  - `Param7` model.
- Examples:
  - item/equipment light row `304 LightBlue5m` has `Param1=Blue_5m`, `Param2=1.0`, `Param3=0`, `Param4=20`, `Param5=0`, `Param6=0`, `Param7=fx_light_clr`;
  - vision row `329 LightBlindvision` has `Param1=Blind_Vision`, `Param3=0`, `Param4=53`, `Param5=1`, `Param6=0`, `Param7=fx_light_clr`;
  - area blackout row `333 LightAreaBlackout` has `Param1=Blind_Vision`, `Param4=13`, `Param5=0`, `Param6=1`.

Implementation correction:

- `backend/src/modules/vfx/domain/aurora-vfx-source.parser.ts` now exposes raw `Param1..Param8` plus per-parameter source-backed statuses for Type 4.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts` carries those raw values/statuses through owner-phase render contracts and emits diagnostics for preserved Param3/4/5/6.
- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`, `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`, and `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts` now expose these fields in userData, DOM data attributes, and scene samples:
  - `param3Raw`, `param3Status`;
  - `param4Raw`, `param4Status`;
  - `param5Raw`, `param5Status`;
  - `param6Raw`, `param6Status`;
  - `parameterPreservationProof=source-backed-progfx-type4-param1-param8-raw-preserved`.
- Backend area-lighting evidence now says Type 4 Param3/4/5/6 are source-table backed and preserved, while retail scheduling remains blocked.

Superseded blocker:

- "No ProgFX Type 4 priority/proximity/shadow parameter recovery" is closed as a source-table/payload preservation gap.
- The remaining blocker is narrower: exact retail runtime behavior for priority ordering, proximity suppression, scene attachment/removal, vision mutation, and cross-lane ordering is still not recovered. Non-item cast-shadow rows were later closed as source-backed absent on 2026-07-03.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/aurora-vfx-source.parser.spec.ts test/unit/aurora-vfx-render-contract.spec.ts`
  - Passed 32 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 18 tests.

Remaining blocker after this loop:

- Retail scheduler parity for ProgFX Type 4 priority ordering, proximity suppression, scene attachment/removal, and vision mutation. Non-item cast-shadow rows were later closed as source-backed absent on 2026-07-03.
- Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes.
- Pixel/geometry parity for Aurora retail shadow-volume/projection.

## Follow-up loop - ShadowSize lane coverage hardening - 2026-07-02

Question: did the implementation cover all recovered `ShadowSize` lanes, or only one visual example?

Recovered rule already in active code:

- `ShadowSize = 0` -> `Fx_Shadow_S` / emitter `Small`;
- `ShadowSize = 2` -> `Fx_Shadow_L` / emitter `Large`;
- any other present numeric value -> `Fx_Shadow_M` / emitter `Med`;
- missing `ShadowSize` stays missing and must not synthesize a retail shadow MDL.

Implementation/test correction:

- `frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts` now has direct coverage for:
  - `ShadowSize=0` -> `fx_shadow_s.mdl`;
  - `ShadowSize=1` -> `fx_shadow_m.mdl`, emitter size `1.6`, radius `0.8`, base opacity `0.6`;
  - missing `ShadowSize` -> no fast-shadow mesh, `placeableTwoDaShadowSizeProofStatus=missing-no-placeables-2da-shadowsize`, and light radius still comes from `fx_placeable01/AuroraLight01`, not from `ShadowSize`.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|ShadowSize zero|ShadowSize one|missing placeables.2da ShadowSize"`
  - Passed 4 focused tests.

Remaining blocker after this loop:

- Exact `ShadowSize -> Fx_Shadow_S/M/L -> emitter radius/alpha/model` provenance is covered in code/tests.
- Retail shadow-volume/projection pixel/geometry parity remains blocked because the browser still uses a Three circle/billboard proxy for placeable fast shadows.
- Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes remains blocked.

## Follow-up loop - reproducible shadow-volume projection extractor proof - 2026-07-02

Question: can the retail shadow-volume/projection blocker be narrowed without guessing the projection formula?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `shadowVolumeProjectionEvidence`.
- Fresh extraction from `C:\Projects\New Folder\export\decompiled_all.c` reports:
  - `proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-projection-geometry-not-ported`;
  - `shaderNamesFound=["vs_shadowvol","fs_shadowvol"]`;
  - `renderBuckets=["0xd","0xe","0xb","0xc"]`;
  - recovered inputs: `ARE.ShadowOpacity`, light radius `+0x58`, light `shadowradius +0x60`, light `verticaldisplacement +0x64`, `vs_shadowvol/fs_shadowvol`, and caster draw through `FUN_00a78128`.
- The extractor preserves the remaining blocker explicitly: retail caster geometry traversal/extrusion is source-backed, but active renderer integration is not proven by the extractor and no pixel/geometry parity capture against retail shadow-volume output exists.
  - 2026-07-03 update: `auroraShadowVolumeGeometry` ports the paired-vertex/six-index caster buffer schema; this still does not prove active renderer integration or pixel/geometry parity.

Implementation/evidence correction:

- Backend area-lighting coverage for `area-shadow-volume-implementation` now cites the extractor proof status directly.
- Frontend `workspaceSceneLightDiagnostics` now reports the same `shadowVolumeProjectionEvidence proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-projection-geometry-not-ported` in scene shadow diagnostics.
- The blocker text now points at the missing `FUN_00a78128` caster traversal/extrusion and pixel/geometry parity rather than a vague "projection unknown".
- `backend/test/unit/audit-retail-light-function-disasm.spec.ts` imports the Python script and runs `scan_shadow_volume_projection_evidence` on a synthetic decompiled-source fixture at the same retail line windows, proving the extractor fields without running the full PE disassembly.
- The Python script can now be imported for source-only scans even if Capstone is unavailable; full binary audits still require Capstone via `require_capstone()`.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Passed 5 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 6 tests after syncing the frontend proof status.
- `python backend/scripts/audit-retail-light-function-disasm.py | python -c "import sys,json; d=json.load(sys.stdin); e=d['shadowVolumeProjectionEvidence']; print(e['proofStatus']); print(','.join(e['shaderNamesFound'])); print(e['renderBuckets']); print(e['remainingBlockedSemantics'])"`
  - Returned `source-backed-shadowplane-shadowvol-shader-caster-path-projection-geometry-not-ported`, `vs_shadowvol,fs_shadowvol`, `['0xd', '0xe', '0xb', '0xc']`, and the two remaining blocked semantics listed above.

Remaining blocker after this loop:

- The shadow-volume source path is now reproducibly extracted and source-backed.
- Aurora Web still does not port retail shadow-volume caster geometry/extrusion/projection or prove pixel parity against retail/toolset output.
- Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes remains blocked.

## Follow-up loop - ProgFX Type 4 client loader proof narrowing - 2026-07-02

Question: is the Type 4 runtime blocker still missing the whole client path, or only scheduler semantics?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` already emits `clientVisualEffectReceiveRenderEvidence` for `nwmain.exe`.
- Fresh extraction reports:
  - `proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path`;
  - `clientObjectVisualEffectLifecycle proofStatus=source-backed-client-object-add-remove-refresh-looping-vfx-path`;
  - `visualEffectSourceModelLoaders proofStatus=source-backed-client-vfx-loadvisualeffect-newcaurobject-model-loader-path`;
  - `CNWCObject::AddLoopingVisualEffect-client-vslot-0x178` calls `CNWCVisualEffectOnObject::LoadVisualEffect` at `0x140762276`, then `CExoLinkedListInternal::AddTail` at `0x1407622c6`, then node/runtime refresh helpers;
  - `CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader 0x14096cf10..0x14096ed64` references `ProgFX_Impact`, `ProgFX_Duration`, `ProgFX_Cessation`, `fxground`, `fximpact`, and `fxhead`, with `NewCAurObject` calls at `0x14096ea48`, `0x14096eacb`, and `0x14096eb4c`;
  - `CNWCVisualEffectOnObject::LoadVisualEffect-fx-light-loader-region 0x14096c610..0x14096d610` references `fx_light` and calls `NewCAurObject`.

Implementation/evidence correction:

- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts`, `frontend/src/modules/vfx/dev/vfxFixturePayloads.ts`, and `backend/src/modules/areas/domain/area-lighting-evidence.ts` now cite the lifecycle and source-model-loader proof statuses directly.
- The Type 4 blocker is narrower now: table params, object add/remove, message serialization, client object attach, `fx_light` model instantiation, and generic MDL `PartLight` creation are source-backed.
- The remaining blocked semantics are now cross-lane insertion order and exact priority/proximity/scene-attachment/vision scheduler parity. The earlier non-item Type 4 shadow scheduler entry was superseded on 2026-07-03 by the retail proof `nonItemCastShadowRows=[]` and `nonItemCastShadowOwnerPhaseCount=0`.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/aurora-vfx-render-contract.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Passed 24 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 39 tests.

Remaining blocker after this loop:

- Type 4 client receive/load/attach path is source-backed enough for diagnostics.
- It is still not valid to promote generic ProgFX Type 4 records into claimed retail scene light behavior without recovered priority/proximity/vision/non-item shadow scheduler semantics.
- Full recovered insertion/merge order between terrain tile, placeables.2da, source MDL, item/equipment, and ProgFX Type 4 lanes remains blocked.

## Follow-up loop - structural remaining retail blocker manifest - 2026-07-03

Question: can the remaining light/shadow gaps be listed by the API as stable blocker records instead of being hidden inside long proof strings?

Implementation/evidence correction:

- `buildAreaLightingEvidenceReport` now emits `remainingRetailBlockers` plus `summary.remainingRetailBlockers`.
- The manifest originally had four stable blockers; current 2026-07-03 state has three after vanilla non-item cast-shadow rows were closed as source-backed absent:
  - `retail-shadow-volume-projection-parity`;
  - `retail-cross-lane-active-light-ordering`;
  - `progfx-type4-priority-proximity-vision-scheduler`.
- Each blocker carries `affectedCoverageKeys`, `evidence`, `proof`, `requiredEvidence`, and `nextStep`.
- Frontend contracts, the HTTP Zod schema, and `AreasModePanel` now preserve and display this manifest. The panel exposes `data-remaining-retail-blockers` and a `remaining retail blockers` list.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 10 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- The blockers are now explicit API data, but not solved: retail shadow-volume projection parity, retail cross-lane active-light ordering, non-item ProgFX Type 4 shadow scheduler, and ProgFX Type 4 priority/proximity/vision scheduler still need decompilation proof, an implementation, or a retail/toolset oracle.

## Follow-up loop - shadow-volume caster draw wrapper narrowing - 2026-07-03

Question: can the retail shadow-volume blocker be narrowed below the recovered `FUN_00a78128` callsite?

Recovered evidence:

- The source-only extractor now reports `casterDrawWrapperEvidence proofStatus=source-backed-shadowvol-caster-draw-wrapper-gl-dispatch`.
- `C:\Projects\New Folder\export\decompiled_all.c:904108-904112` shows `FUN_00a78128` as a thin wrapper into `FUN_00a75e3c`.
- `C:\Projects\New Folder\export\decompiled_all.c:902867-902912` shows `FUN_00a75e3c` binding/choosing draw state and dispatching through `PTR_DAT_00d3dda8` or `glDrawArrays()`.
- `C:\Projects\New Folder\export\decompiled_all.c:914014` is still the shadow-volume caller that passes light radius/profile values into `FUN_00a78128`.

Implementation/evidence correction:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `casterDrawCallSiteHits` and `casterDrawWrapperEvidence`.
- Backend area-lighting evidence and frontend scene-light diagnostics now cite `FUN_00a78128 -> FUN_00a75e3c` rather than leaving the blocker at an anonymous caster draw call.
- `frontend/tests/unit/app/App.vfxFixtureRunner.test.tsx` now expects the current source-backed proof string and blocker wording.

Verification:

- Source-only extractor against `C:\Projects\New Folder\export\decompiled_all.c` returned:
  - `source-backed-shadowplane-shadowvol-shader-caster-path-projection-geometry-not-ported`;
  - `source-backed-shadowvol-caster-draw-wrapper-gl-dispatch`;
  - wrapper/function pair `FUN_00a78128 FUN_00a75e3c`;
  - wrapper hit line `904108`;
  - dispatch hit line `902911 glDrawArrays();`;
  - shadow-volume caller hit line `914014`;
  - remaining blocked semantics at the time: retail caster source buffers/extrusion were not ported to Three, and there was no pixel/geometry parity capture against retail shadow-volume output.
  - 2026-07-03 update: the caster buffer schema is now ported as a helper, but active renderer integration and pixel/geometry parity remain blocked.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts test/unit/aurora-vfx-render-contract.spec.ts`
  - Passed 25 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 40 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- The retail shadow-volume path is now narrowed to the wrapper and draw-dispatch function, but Aurora Web still does not port the caster source buffer/extrusion generation feeding that path.
- Pixel/geometry parity against retail/toolset shadow-volume output is still missing.
- Retail cross-lane active-light ordering and ProgFX Type 4 scheduler parity remain separate blockers in the API manifest.

## Follow-up loop - LightManager source ordering scan - 2026-07-03

Question: can cross-lane active-light ordering be closed from decompiled source without the full binary xref/disassembly path?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `lightManagerSourceOrderingEvidence`.
- Fresh source-only extraction from `C:\Projects\New Folder\export\decompiled_all.c` reports:
  - `proofStatus=source-backed-lightmanager-insert-score-sort-upload-cross-lane-source-callsite-blocked`;
  - `internalInsertionEvidence proofStatus=source-backed-lightmanager-internal-insertion-lists`;
  - `scoreSortUploadEvidence proofStatus=source-backed-lightmanager-score-sort-upload`;
  - first insert function hit: `line=865534 FUN_00a4128c`;
  - `directInsertionCallHits=[]`.
- The decompiled source scan therefore confirms the honest boundary: insert/sort/upload are source-backed, but direct cross-lane insertion callsites are not present in the source-only decompilation view.

Implementation/evidence correction:

- Backend area-lighting evidence now cites `lightManagerSourceOrderingEvidence` and `directInsertionCallHits=[]` in the retail cross-lane blocker.
- Frontend scene light diagnostics now expose the same source-only proof in `retailOrderingProofSource` and `retailOrderingManagerCrossLaneCallsiteBlocker`.
- The API blocker remains blocked instead of being promoted to implemented retail ordering.

Verification:

- Source-only extractor against `C:\Projects\New Folder\export\decompiled_all.c` returned:
  - `source-backed-lightmanager-insert-score-sort-upload-cross-lane-source-callsite-blocked`;
  - `source-backed-lightmanager-internal-insertion-lists`;
  - `source-backed-lightmanager-score-sort-upload`;
  - `directInsertionCallHits=[]`.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Passed 6 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 10 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- Retail cross-lane active-light ordering is still blocked: the recovered source path proves internal insertion and score/sort/upload, but does not prove lane precedence between terrain tile, placeables.2da, source MDL light nodes, item-property lights, and ProgFX Type 4 light requests.
- Closing this requires a vtable/callgraph audit with Capstone or a retail/toolset oracle scene with competing lane priorities.

## Follow-up loop - point inventory after source-only audit - 2026-07-03

Question: which requested light/shadow points are still actual gaps after the source-only decompilation loops?

Closed or implementation-backed points:

- Placeable `LightColor` now creates a real runtime point-light lane with source offset, RGB from `lightcolor.2da`, `LightState` on/off handling, and radius/falloff sourced from `fx_placeable01.mdl` `AuroraLight01`.
- Missing UTP `LightState` defaults to ON with retail binary provenance: `nwserver.exe` `.pdata` function `0x1404484d0..0x14044a2ec` contains the `LightState` xref and `mov [rbx+0x368],1` before optional read.
- `ShadowSize` lane coverage is implemented for `0 -> Fx_Shadow_S`, `1/other -> Fx_Shadow_M`, `2 -> Fx_Shadow_L`, while missing `ShadowSize` stays missing and does not synthesize a retail fast shadow.
- Active-light slot cap `0x80` and score/sort/upload are source-backed, but only as a diagnostic preview arbiter because lane insertion precedence is not recovered.

Remaining blockers:

- Retail shadow-volume/projection parity: source path is narrowed through `FUN_00a78128 -> FUN_00a75e3c`, but caster source buffers/extrusion and pixel/geometry parity are not ported.
- Retail cross-lane active-light ordering: source-only scan reports `directInsertionCallHits=[]`; binary xref/callgraph or retail/toolset oracle is required.
- ProgFX Type 4 non-item shadow scheduler: superseded on 2026-07-03; retail vanilla reports no non-item cast-shadow rows or owner phases.
- ProgFX Type 4 priority/proximity/vision scheduler: Param4/5/6 and vision tokens are preserved, but priority ordering, proximity suppression, attach/remove scene semantics, and Blind_Vision mutation are not recovered.

Verification refresh:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "placeables.2da LightColor|ShadowSize zero|ShadowSize one|missing placeables.2da ShadowSize|LightState default|missing UTP LightState"`
  - Passed 6 focused tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/catalog-processing.helpers.spec.ts test/unit/catalog.application.service.spec.ts test/unit/area-lighting-evidence.spec.ts --testNamePattern "LightState|lighting evidence"`
  - Passed 3 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/placeables/httpPlaceableApiPort.test.ts --run`
  - Passed 12 tests.

## Follow-up loop - ProgFX Type 4 source-only scheduler boundary - 2026-07-03

Question: can the non-item ProgFX Type 4 shadow/priority/proximity/vision scheduler be recovered from the source-only decompiled Aurora output?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `progfxType4SourceSchedulerEvidence`.
- Fresh source-only extraction from `C:\Projects\New Folder\export\decompiled_all.c` reports:
  - `proofStatus=source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation`;
  - first generic `visualeffects` string hit at line `20554`;
  - loader call hit at line `348244`: `FUN_00addae0(local_f0,s_visualeffects_00c5c8df);`;
  - `runtimeSchedulerStringHitCount=0`;
  - `schedulerStringHits=[]`.
- The source-only decompilation exposes `visualeffects.2da` bootstrap and generic table fields such as `Param1`, `Param1Value`, `ReqParam1`, and `ReqParam2`.
- The source-only decompilation does not expose a recoverable runtime scheduler hit for `progfx.2da`, `fx_light_clr`, `Blind_Vision`, or `Param3`/`Param4`/`Param5`/`Param6` Type 4 semantics.

Implementation/evidence correction:

- Backend area-lighting evidence now cites `progfxType4SourceSchedulerEvidence` and the zero scheduler-hit result.
- Backend VFX render contract now cites the same extractor proof while keeping ProgFX Type 4 runtime scheduling blocked.
- Frontend VFX fixture payloads now expose the same source-backed boundary.
- No PointLight, shadow policy, priority ordering, proximity suppression, attach-to-scene behavior, or Blind_Vision mutation is promoted from Type 4 without retail runtime proof.

Verification:

- Source-only extractor against `C:\Projects\New Folder\export\decompiled_all.c` returned:
  - `source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation`;
  - loader hit line `348244`;
  - `runtimeSchedulerStringHitCount=0`;
  - `schedulerStringHits=[]`;
  - remaining blocked semantics: no source-only `progfx.2da/fx_light_clr/Blind_Vision` scheduler string hit, no exposed `Param3/Param4/Param5/Param6` runtime scheduler semantics, and retail scheduler still requires binary disassembly/callgraph or retail runtime oracle.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts test/unit/aurora-vfx-render-contract.spec.ts`
  - Passed 27 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 30 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- Non-item ProgFX Type 4 shadow scheduler is superseded on 2026-07-03: retail vanilla reports `nonItemCastShadowRows=[]` and `nonItemCastShadowOwnerPhaseCount=0`, so there is no vanilla non-item shadow-casting behavior to schedule.
- ProgFX Type 4 priority/proximity/vision scheduler remains blocked: Param4/Param5/Param6 and `Blind_Vision` source references are preserved, but runtime ordering, suppression, scene attachment/removal, and vision mutation semantics require binary callgraph/disassembly or a retail/toolset oracle.
- This leaves the global light/shadow blocker set at three current items: retail shadow-volume/projection parity, retail cross-lane active-light ordering, and ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler.

## Follow-up loop - LightManager upload order narrowing - 2026-07-03

Question: can the cross-lane ordering blocker be narrowed further from source-only decompilation without claiming full tile/placeable/MDL/item/VFX precedence?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `lightManagerSourceOrderingEvidence.retailUploadOrderEvidence`.
- Fresh source-only extraction from `C:\Projects\New Folder\export\decompiled_all.c` reports:
  - `proofStatus=source-backed-lightmanager-insert-score-sort-upload-cross-lane-source-callsite-blocked`;
  - `retailUploadOrderEvidence.proofStatus=source-backed-lightmanager-special-lights-before-sorted-slot-upload`;
  - fixed/special upload hit at line `866325` for `param_1 + 0x70`;
  - fixed/special upload hit at line `866402` for `param_1 + 0x6c` through `FUN_00a40b60(...,0xffffffff,...)`;
  - sorted slot upload hit at line `866410` through `FUN_00a41e30()` and line `866421` through `FUN_00a40b60(*piVar1,uVar15,fVar16)`;
  - unused slot clear hit at line `866425` through `FUN_00a7817c(uVar7)`.
- The recovered ordering inside `FUN_00a41e50` is: handle special manager lights `+0x70/+0x6c`, optionally reserve two headlight slots through `DAT_00cc2314`, upload sorted list slots, then clear unused slots.

Implementation/evidence correction:

- Backend area-lighting evidence now says retail upload order is partially recovered instead of leaving all LightManager ordering at generic score/sort/upload.
- Frontend scene-light diagnostics now expose the same `retailUploadOrderEvidence` boundary in `retailOrderingProofSource` and `retailOrderingManagerCrossLaneCallsiteBlocker`.
- The API still keeps `retail-cross-lane-active-light-ordering` blocked because this does not prove creation/insertion precedence between terrain tile, placeables.2da, source MDL light nodes, item-property lights, and ProgFX Type 4 light requests.

Verification:

- Source-only extractor against `C:\Projects\New Folder\export\decompiled_all.c` returned:
  - `source-backed-lightmanager-insert-score-sort-upload-cross-lane-source-callsite-blocked`;
  - `source-backed-lightmanager-special-lights-before-sorted-slot-upload`;
  - remaining blocked semantics: no direct `FUN_00a4128c` callers, upload order covers special manager lights and sorted slots but not lane creation precedence, and retail cross-lane precedence still requires vtable/callgraph audit or retail oracle.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 3 tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Passed 7 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 16 tests.

Remaining blocker after this loop:

- Retail upload order inside `FUN_00a41e50` is source-backed.
- Retail creation/insertion precedence between tile/placeable/MDL/item/VFX lanes is still blocked because source-only `directInsertionCallHits=[]` and binary xrefs still show indirect/vtable-only LightManager references.

## Follow-up loop - shadow-volume caster buffer preparation narrowing - 2026-07-03

Question: can the retail shadow-volume/projection blocker be narrowed below `FUN_00a78128 -> FUN_00a75e3c` into the caster buffer preparation path?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `shadowVolumeProjectionEvidence.casterBufferPreparationEvidence`.
- Fresh source-only extraction from `C:\Projects\New Folder\export\decompiled_all.c` reports:
  - `proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-projection-geometry-not-ported`;
  - `casterDrawWrapperEvidence.proofStatus=source-backed-shadowvol-caster-draw-wrapper-gl-dispatch`;
  - `casterBufferPreparationEvidence.proofStatus=source-backed-shadowvol-caster-buffer-prep-index-vertex-fill`.
- Source windows now recovered:
  - `888188-888213`: caster count/state preparation, `local_58 = local_30 * 6`, conditional `FUN_00a878f8(DAT_00d0233c)`, light state writes `+0x68` and `+100`, and index buffer allocation through `FUN_00a6a828(local_30 * 6)`;
  - `888245-888256`: shadow caster buffer allocation/mapping through `FUN_00a69868`, `FUN_00a6a370`, `FUN_00a6a6a4`, and `FUN_00a6a6dc`;
  - `888319-888403`: transformed vertex data writes through `FUN_00b2f49c`, vertex pointer writes into `iVar23`, index writes into `puVar13`, finalization through `FUN_00a6a798`, and upload/final map through `FUN_00a6a754`.

Implementation/evidence correction:

- Backend area-lighting evidence now cites `casterBufferPreparationEvidence` and no longer describes the caster buffers as unrecovered.
- Frontend scene-shadow diagnostics now expose the same source-backed buffer-prep boundary in `sceneShadowRetailProjectionSource` and blocker text.
- The renderer still does not port the retail buffer/extrusion/projection path into Three, so `retail-shadow-volume-projection-parity` remains blocked.

Verification:

- Source-only extractor against `C:\Projects\New Folder\export\decompiled_all.c` returned:
  - `source-backed-shadowplane-shadowvol-shader-caster-path-projection-geometry-not-ported`;
  - `source-backed-shadowvol-caster-draw-wrapper-gl-dispatch`;
  - `source-backed-shadowvol-caster-buffer-prep-index-vertex-fill`;
  - remaining blocked semantics at the time: retail caster buffer preparation was source-backed but not ported to Three, and no pixel/geometry parity capture against retail shadow-volume output existed.
  - 2026-07-03 update: the caster buffer schema is now ported as a helper, but active renderer integration and pixel/geometry parity remain blocked.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 3 tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Passed 7 tests.

Remaining blocker after this loop:

- Retail shadow-volume source path is now narrowed through buffer preparation, shader path, light profile, draw wrapper, and GL dispatch.
- Aurora Web still does not port that caster buffer/extrusion/projection path to Three and still lacks retail/toolset pixel/geometry parity.

## Follow-up loop - ProgFX Type 4 local resource inventory - 2026-07-03

Question: is the missing ProgFX Type 4 scheduler information absent from decompilation only, or do we still have a local resource dump that can prove it without guessing?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `progfxType4SourceSchedulerEvidence.localResourceDumpEvidence`.
- Fresh inventory of `C:\Projects\New Folder` reports:
  - `scannedFileCount=155`;
  - `exactResourcePathHits=[]`;
  - `missingResourceNames=[progfx.2da, visualeffects.2da, fx_light_clr.mdl, fx_light_clr.mdb]`;
  - `indexStringHits` sees `visualeffects` only as a string-table/index reference in `export/strings.tsv:13174`;
  - `proofStatus=source-backed-local-reference-root-lacks-progfx-type4-scheduler-resource-dump`.
- This confirms the current local reference folder can prove the `visualeffects.2da` bootstrap in source, but does not contain the physical `progfx.2da` or `fx_light_clr` model resources needed to derive scheduler semantics from a local resource table/model sweep.

Implementation/evidence correction:

- Backend VFX render contract now cites `localResourceDumpEvidence` next to the source-only scheduler absence.
- Frontend VFX fixture payloads expose the same proof string.
- Backend area-lighting evidence now carries the same blocker into `progfx-type4-runtime-scheduler` and remaining retail blockers.
- No Type 4 priority, proximity, attach-to-scene, Blind_Vision mutation, or non-item shadow scheduler behavior is promoted from the local dump because the dump does not contain those scheduler resource candidates.

Verification:

- Direct extractor run against `C:\Projects\New Folder` returned `source-backed-local-reference-root-lacks-progfx-type4-scheduler-resource-dump`.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 3 tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts test/unit/aurora-vfx-render-contract.spec.ts`
  - Passed 27 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 40 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- ProgFX Type 4 scheduler remains blocked, now with an explicit local-resource inventory proof: available `C:\Projects\New Folder` evidence does not include physical `progfx.2da`, `visualeffects.2da`, or `fx_light_clr.*`.
- The remaining route for this point is binary callgraph/disassembly around the client visual-effect loader/scheduler, a wider retail resource extraction, or a retail/toolset oracle capture.

## Follow-up loop - binary callgraph dependency boundary - 2026-07-03

Question: can we continue the ProgFX Type 4 scheduler audit through the existing `nwmain.exe` binary callgraph extractor in this environment?

Recovered evidence:

- Running the binary path without a local disassembler previously crashed because Python `capstone` was unavailable.
- `backend/scripts/audit-retail-light-function-disasm.py` now reports an explicit blocker instead of a traceback:
  - `proofStatus=blocked-capstone-missing-retail-light-binary-disassembly-not-run`;
  - `clientVisualEffectReceiveRenderEvidence.proofStatus=blocked-capstone-missing-client-vfx-binary-callgraph-not-audited`;
  - remaining blocked semantic: client `LoadVisualEffect` / ProgFX Type 4 scheduler callgraph cannot be disassembled in this environment without `capstone` or another local x86-64 disassembler.

Implementation/evidence correction:

- Binary audit failure is now machine-readable and source-backed to the local tool state.
- The script can still emit source-only evidence sections in the same run; the missing binary disassembler no longer masks the source-only light/shadow audit output.
- This does not claim new retail Type 4 semantics. It narrows the next dependency: to reduce the scheduler blocker further, we need a working local disassembler or a retail/toolset oracle capture.

Verification:

- `python backend\scripts\audit-retail-light-function-disasm.py "C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe" | Select-String -Pattern "blocked-capstone-missing|client LoadVisualEffect"`
  - Returned both blocker proof statuses and the client `LoadVisualEffect` blocker text.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts test/unit/aurora-vfx-render-contract.spec.ts`
  - Passed 28 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 40 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- Binary/callgraph audit for exact ProgFX Type 4 scheduler semantics is blocked by missing `capstone` in the current Python environments.
- Source-only and local-resource evidence remain complete for the current local data: no Type 4 scheduler semantics are recovered without binary disassembly or oracle capture.

## Follow-up loop - fast-shadow `fxpa_Dot01` texture binding boundary - 2026-07-03

Question: do placeable `ShadowSize` fast-shadow proxies bind the recovered `fxpa_Dot01` texture evidence, or are they still a flat untextured circle?

Recovered evidence:

- Retail `Fx_Shadow_S/M/L` emitter metadata already proves texture reference `fxpa_Dot01`, emitter type `Single`, render mode `Billboard_to_Local_Z`, and size/alpha per lane.
- `backend/scripts/audit-retail-shadow-texture.ts` now reads local retail `nwn_base.key` directly and finds `fxpa_dot01.tga` plus `fxpa_dot01.txi`.
- The TGA proof reports `byteLength=4140`, `width=32`, `height=32`, `imageType=2` / `uncompressed-true-color`, `pixelDepth=32`, `alphaBits=8`, `expectedPixelCount=1024`, `alphaMin=0`, `alphaMax=255`, `alphaUniqueCount=208`, `alphaZeroPixelCount=340`, `alphaNonZeroPixelCount=684`, `alphaCoverage=0.667969`, and proof status `source-backed-retail-tga-header-alpha-profile`.
- The TXI proof reports `downsamplemax 0` and `downsamplemin 0`.
- Therefore the texture resource itself is no longer missing. The remaining runtime boundary is delivery of the retail texture into the frontend preview path.

Implementation/evidence correction:

- `workspacePlaceableModelPresentation` now accepts a source-backed `fastShadowTexture` hook for `fxpa_Dot01`. When supplied, the fast-shadow material binds it as a Three RGBA `map` and reports `placeableTwoDaFastShadowTextureBindingStatus=source-backed-retail-fxpa-dot01-rgba-texture-bound`, `placeableTwoDaFastShadowTextureBindingMapKind=retail-rgba-map`, and proof `source-backed-retail-key-bif-fxpa-dot01-texture-bound`.
- When the runtime has not delivered the retail texture yet, the proxy still binds a deterministic fallback `DataTexture` alpha-map, but it now reports `placeableTwoDaFastShadowTextureBindingStatus=retail-key-bif-fxpa-dot01-confirmed-procedural-preview-alpha-map` and proof `source-backed-retail-fxpa-dot01-resource-confirmed-preview-procedural-fallback` instead of falsely saying the asset was not found.
- Root placeable userData, fast-shadow mesh userData, and scene-light diagnostics now expose:
  - `placeableTwoDaFastShadowTextureBindingStatus`;
  - `placeableTwoDaFastShadowTextureMapBound`;
  - `placeableTwoDaFastShadowTextureBindingMapKind`;
  - `placeableTwoDaFastShadowTextureBindingProofStatus`.
- This closes the "unbound fast-shadow texture evidence" gap and corrects the retail-resource availability claim. It does not yet close automatic frontend delivery of the retail texture, exact retail `ShadowSize` projection/radius/opacity, or pixel texture/projection parity.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "renders placeables.2da LightColor metadata"`
  - Superseded by the 2026-07-03 hook test below; historical focused test asserted fallback alpha-map userData.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Historical run passed 6 tests and asserted diagnostic samples include texture binding status/map/proof fields.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Historical run passed 118 tests.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Historical run passed.
- `cd backend; npx.cmd ts-node scripts/audit-retail-shadow-texture.ts`
  - Passed and emitted `source-backed-retail-key-bif-fxpa-dot01-shadow-texture` with the TGA/TXI facts listed above.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/aurora-tga-texture-summary.spec.ts`
  - Passed 1 test for the deterministic TGA alpha-profile parser.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 2 files / 119 tests, including the retail texture hook, fallback status, and diagnostics.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- The retail `fxpa_Dot01` pixels are present in local `nwn_base.key`, but automatic delivery of that KEY/BIF texture into the frontend fast-shadow hook is not wired yet.
- Exact retail `ShadowSize` projection/radius/opacity and shadow-volume pixel parity remain blocked pending the active renderer projection port/oracle capture or a recovered owning projection call-site.

## Follow-up loop - capstone-free binary call-target xref scan - 2026-07-03

Question: can the current environment reduce the binary/callgraph blocker without installing `capstone`?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now has a capstone-free x64 `E8 rel32` direct-call scanner plus absolute-VA/string inventory.
- Running it against local `nwmain.exe` reports:
  - top-level `proofStatus=partial-capstone-free-retail-light-binary-call-target-scan-disassembly-blocked`;
  - `lightManagerProofStatus=blocked-lightmanager-core-lane-ordering-no-add-prioritize-remove-update-direct-call-xrefs`;
  - `LightManager targetCount=23`, `requestedTargetCount=4`, `directCallXrefCount=23`, `requestedDirectCallXrefCount=0`, `absoluteAddressRefCount=12`;
  - initial capped sample `clientVisualEffectDirectCallXrefCount=548`, superseded by the later uncapped-per-target summary below;
  - observed client direct-call target families include `CNWMessage::ReadBYTE/WORD/DWORD/FLOAT`, `CExoLinkedListInternal::AddTail`, and `NewCAurObject`;
  - observed client string needles include `ProgFX_Impact`, `ProgFX_Duration`, `ProgFX_Cessation`, `fxground`, `fximpact`, `fxhead`, `fx_light`, and the `CNWCVisualEffectOnObject::LoadVisualEffect` failure strings.
- The LightManager direct calls are helper/query methods such as `GetMaxLights`, `GetShadowLights`, and `GetEmitterLighting`; the four requested core lane methods `AddLight`, `PrioritizeLights`, `RemoveLight`, and `UpdateLights` still have `requestedDirectCallXrefCount=0`.

Implementation/evidence correction:

- Backend/frontend ordering proof strings now report the narrower truth: helper direct-call xrefs exist, but core lane direct-call xrefs remain absent.
- `renderer-active-light-ordering` and `retail-cross-lane-active-light-ordering` stay blocked because the fallback scan does not recover a common insertion/merge call-site or vtable dispatch semantics between tile/placeable/MDL/item/VFX lanes.
- The binary audit no longer collapses to a plain missing-`capstone` blocker when the binary is present; it emits `capstoneFreeCallTargetEvidence` with the above counts and explicit limitations.
- Backend VFX render contract, backend area-lighting evidence, and frontend VFX fixture payloads now also carry this `capstoneFreeCallTargetEvidence` boundary for ProgFX Type 4. The initial capped sample was `clientVisualEffectDirectCallXrefCount=548`; a later loop supersedes it with `clientVisualEffectDirectCallXrefCount=1502`, observed target-family summary, and the same scheduler data-flow blocker.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 5 tests, including a synthetic `.text` `E8 rel32` call to `CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader`.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Passed 9 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 16 tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/aurora-vfx-render-contract.spec.ts test/unit/area-lighting-evidence.spec.ts test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 29 tests after VFX proof-string synchronization.
- `cd frontend; npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 22 tests after VFX proof-string synchronization.

Remaining blocker after this loop:

- Retail cross-lane active-light ordering remains blocked: direct helper/query xrefs are now visible without `capstone`, but the core `AddLight/PrioritizeLights/RemoveLight/UpdateLights` lane insertion path and vtable dispatch semantics are still not recovered.
- ProgFX Type 4 scheduler remains blocked for the same reason: raw call-target/string inventory cannot recover Param4/5/6 priority, proximity, scene attachment, or vision mutation semantics. Non-item cast-shadow rows were later closed as source-backed absent on 2026-07-03.

## Follow-up loop - shadow-volume paired vertex/index buffer narrowing - 2026-07-03

Question: can the retail shadow-volume blocker be narrowed below generic "caster buffer prep" into the actual geometry/index buffer pattern?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `shadowVolumeProjectionEvidence.casterBufferGeometryEvidence`.
- Fresh extraction from `C:\Projects\New Folder\export\decompiled_all.c` reports:
  - `proofStatus=source-backed-shadowvol-caster-geometry-paired-vertex-index-buffer-fill`;
  - `perSourceVertexRecords=2`;
  - `indicesPerCasterEdge=6`;
  - `maxCasterEdgeClamp=0x2aaa`.
- Source windows now classify:
  - `888321` and `888346`: source vertex transforms through `FUN_00b2f49c`;
  - `888326-888361`: paired vertex records written at `iVar23 + n*0x20` and `iVar23 + 0x10 + n*0x20`, with `local_68` toggling `0x3f800000` then `0`;
  - `888370-888397`: six index writes per caster edge through `puVar13`, with alternating `local_61` winding;
  - `888367` and `888403`: buffer finalization/remap through `FUN_00a6a798` and `FUN_00a6a754`.

Implementation/evidence correction:

- Backend area-lighting evidence and frontend scene-shadow diagnostics now cite `casterBufferGeometryEvidence` rather than only `casterBufferPreparationEvidence`.
- Remaining blocker wording now says the exact source-backed piece that is still unported: paired-vertex/six-index caster buffer fill feeding `FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c`.
- This is still not retail projection parity. Aurora Web still uses Three shadow maps and placeable fast-shadow proxies, and there is still no retail/toolset pixel/geometry oracle capture.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Passed 9 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 10 tests.
- `python -m py_compile backend\scripts\audit-retail-light-function-disasm.py`
  - Passed.

Remaining blocker after this loop:

- Retail shadow-volume geometry is now narrowed through source vertex transforms, paired vertex records, six-index caster edge fill, buffer finalization, draw wrapper, and GL dispatch.
- Aurora Web still does not port this geometry/projection path into Three and still lacks pixel/geometry parity against retail/toolset output.

## Follow-up loop - ProgFX client VFX call-target summary widening - 2026-07-03

Question: was the ProgFX Type 4 scheduler blocker hidden by a capped direct-call sample rather than a real lack of evidence?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `clientVisualEffectDirectCallTargetSummary`, `clientVisualEffectObservedTargetFamilies`, and `clientVisualEffectSchedulerDataFlowProofStatus` from the capstone-free `E8 rel32` scan.
- Fresh local `nwmain.exe` fallback extraction reports:
  - `clientVisualEffectDirectCallXrefCount=1502`;
  - `clientVisualEffectObservedTargetFamilies=[message-readers,visual-transform-reader,looping-vfx-list-attach,progfx-source-loader,vfx-2da-row-loader,fx-light-loader-region,aurora-object-gob-construction,runtime-state-scene-helpers]`;
  - `clientVisualEffectSchedulerDataFlowProofStatus=blocked-direct-call-targets-show-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow`.
- The largest direct-call target groups are:
  - `ReadBYTE=416`;
  - `ReadFLOAT=297`;
  - `ReadDWORD=179`;
  - `object-id-read=174`;
  - `ReadWORD=156`;
  - `NewCAurObject=116`;
  - `AddTail=57`.
- This proves the fallback sees message reads, visual transform reads, VFX object/list attach, ProgFX/fx_light loader regions, and Aurora object/Gob construction in the client binary.

Implementation/evidence correction:

- Backend area-lighting evidence, backend VFX render contract, and frontend VFX fixture payloads now cite the widened `1502` measurement, observed target families, and explicit scheduler data-flow proof status.
- Unit tests now assert the new summary fields on a synthetic `.text` image and assert the synchronized proof strings in area evidence, VFX render contract, and frontend fixture payloads.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 5 tests.
- `python -m py_compile backend\scripts\audit-retail-light-function-disasm.py`
  - Passed.
- Direct extractor run against local `nwmain.exe` produced the `1502` count and target family list above.

Remaining blocker after this loop:

- This narrows the ProgFX blocker but does not close it. The capstone-free scan still cannot recover Param4/Param5/Param6 register/data-flow, indirect/vtable scheduler dispatch, priority ordering, proximity suppression, scene attach/remove, or Blind_Vision mutation. Non-item cast-shadow rows were later closed as source-backed absent on 2026-07-03.
- Full ProgFX Type 4 parity still needs a recovered scheduler data-flow from disassembly/callgraph or a paired retail/toolset oracle capture.

## Follow-up loop - LightManager rdata vtable cluster narrowing - 2026-07-03

Question: do the `LightManager` absolute refs prove real lane ordering, or only a vtable/export layout?

Recovered evidence:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `absoluteVtableClusterEvidence` inside `lightManagerRetailXrefs`.
- Fresh local `nwmain.exe` extraction reports:
  - `proofStatus=retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite`;
  - `clusterBeginVa=0x140d85f78`;
  - `clusterEndVa=0x140d85fd0`;
  - `slotCount=12`;
  - `requestedCoreSlotCount=4`;
  - `contiguousSlots=true`;
  - `lightManagerNameStringVa=0x140d86015`;
  - `lightManagerNameDistanceBytes=157`.
- The four requested core slots are:
  - `LightManager::PrioritizeLights` at slot `0x140d85f78` -> `0x14007ff60`;
  - `LightManager::AddLight` at slot `0x140d85f90` -> `0x14007dbd0`;
  - `LightManager::RemoveLight` at slot `0x140d85f98` -> `0x1400802d0`;
  - `LightManager::UpdateLights` at slot `0x140d85fa0` -> `0x140081100`.

Implementation/evidence correction:

- Backend area-lighting evidence and frontend scene diagnostics now cite the vtable cluster in both ordering proof and blocker text.
- The old claim is refined: `absoluteAddressRefCount=12` is not just an unclassified address inventory; it is a contiguous `.rdata` virtual slot cluster with the four core methods present.
- The API still blocks retail cross-lane ordering because the cluster proves exported virtual slots, not lane-owner dispatch or creation precedence between tile/placeable/MDL/item/VFX sources.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 6 tests, including the synthetic `.rdata` LightManager vtable cluster.
- `python -m py_compile backend\scripts\audit-retail-light-function-disasm.py`
  - Passed.
- Direct extractor run against local `nwmain.exe` produced the cluster and slot values above.

Remaining blocker after this loop:

- Retail cross-lane active-light ordering remains blocked. We now know the core methods sit in a retail `.rdata` vtable cluster, but no recovered direct call, indirect dispatch owner, or lane creation/merge call-site ties terrain tile, placeable, MDL, item, and ProgFX lights into a proven retail precedence order.

## Follow-up loop - Placeables panel radius/falloff proof alignment - 2026-07-03

Question: does the user-facing placeable inspector still show stale "blocked" text for radius/falloff after the `fx_placeable01` carrier proof was recovered?

Recovered evidence already in scope:

- Backend area-lighting evidence reports `placeable-radius-falloff` as source-backed:
  - `CNWCArea::AddPlaceableObjectLight` uses `fx_placeable01/AuroraLight01`;
  - `fx_placeable01.mdl` radius controller is `10`;
  - shadowradius is `15`;
  - verticaldisplacement is `3`;
  - `C:/Projects/New Folder/export/decompiled_all.c:866543-866563` proves active-light falloff `max(0,1-distance/radius)`.

Implementation/evidence correction:

- `frontend/src/modules/layout/components/PlaceablesModeRightPanel.tsx` no longer shows `Radius: blocked: no decompiled falloff formula` for placeables with `placeables.2da.LightColor`.
- The panel now shows:
  - `Radius: 10 (fx_placeable01/AuroraLight01)`;
  - `Falloff: max(0, 1 - distance/radius)`;
  - a title/proof string citing `fx_placeable01.mdl radius 10`, `shadowradius 15`, `verticaldisplacement 3`, and `decompiled_all.c:866543-866563`.
- The same inspector now surfaces the source-backed `ShadowSize` retail asset selection:
  - `ShadowSize=0 -> Fx_Shadow_S`;
  - `ShadowSize=2 -> Fx_Shadow_L`;
  - any other present value -> `Fx_Shadow_M`;
  - `Shadow projection: preview proxy; retail parity blocked`.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/PlaceablesModeRightPanel.test.tsx --run`
  - Passed 5 tests.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- This closes a stale UI presentation gap for placeable radius/falloff.
- It also exposes source-backed `ShadowSize -> Fx_Shadow_*` selection in the inspector.
- It does not close `retail-shadow-volume-projection-parity`: exact `ShadowSize` projection geometry/pixel parity remains blocked separately.

## Follow-up loop - ProgFX Type 4 retail table parameter distribution - 2026-07-03

Question: can the Type 4 blocker be narrowed with real retail `progfx.2da` data instead of only saying that Param1..Param7 are preserved?

Recovered evidence:

- `backend/scripts/audit-retail-progfx-type4-table.ts` reads `progfx.2da` through the retail KEY/BIF path and summarizes Type 4 rows with raw parameter preservation.
- Fresh local run against `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key` reports:
  - `rowCount=1301`;
  - `type4RowCount=68`;
  - `itemLightNormalRowCount=28`;
  - `itemLightFadeRowCount=28`;
  - `nonItemType4RowCount=12`;
  - `animationKindCounts light=56 vision=10 unknown=2`;
  - `Param3 castShadows true=42 false=26`;
  - `Param4 priorityRawCounts 13=2/20=56/49=2/50=2/51=2/52=2/53=2`;
  - `Param5 proximity true=8 false=60`;
  - `Param6 attachToScene true=2 false=66`;
  - `modelCounts fx_light_clr=68`;
  - `lightTokenRadiusCounts 5=14/10=14/15=14/20=14/****=12`;
  - `proofStatus=source-backed-progfx-type4-table-parameter-distribution-runtime-scheduler-blocked`.

Implementation/evidence correction:

- Backend area-lighting evidence and VFX render-contract proof now cite the retail table distribution directly.
- Frontend VFX fixture payloads now carry the same proof string, so debug fixtures no longer show only the older generic Type 4 scheduler blocker.
- Unit tests now assert the retail row counts and the key Param3/Param5/animation distribution in backend coverage, backend render contract, and frontend fixture payloads.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/aurora-vfx-source.parser.spec.ts`
  - Passed 13 tests, including `summarizes ProgFX Type 4 table parameters without promoting runtime scheduler parity`.
- `cd backend; npx.cmd ts-node --transpile-only scripts/audit-retail-progfx-type4-table.ts`
  - Produced the retail counts listed above.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed after adding the parser summary and audit script.

Remaining blocker after this loop:

- This closes the table-distribution gap for `progfx.2da` Type 4 lights.
- It does not close runtime scheduler parity. The recovered retail table proves source rows, families, and raw parameters; it still does not prove the runtime data-flow for Param3 shadows, Param4 priority, Param5 proximity suppression, Param6 scene attachment, or cross-lane LightManager insertion order.

## Follow-up loop - Shadow-volume caster buffer schema helper - 2026-07-03

Question: can the recovered retail shadow-volume caster buffer path be moved from "not ported" to a concrete source-backed implementation step?

Recovered evidence already in scope:

- `C:/Projects/New Folder/export/decompiled_all.c:888319-888403` shows `FUN_00a878f8` writing paired vertex records for each source vertex:
  - first record has `w=1`;
  - second record has `w=0`;
  - an additional center/origin pair is appended after the source vertices.
- The same block emits six indices per caster edge and flips orientation every edge via `local_61`.
- The extractor keeps `perSourceVertexRecords=2`, `indicesPerCasterEdge=6`, and `maxCasterEdgeClamp=0x2aaa`.

Implementation/evidence correction:

- Added `frontend/src/modules/layout/adapters/three/auroraShadowVolumeGeometry.ts`.
- The helper now builds the recovered paired-vertex buffer and six-index caster-edge index buffer from source vertices and caster edges.
- Frontend shadow diagnostics now report `source-backed-shadowvol-caster-buffer-schema-helper-ported-active-renderer-blocked` instead of the older generic geometry-not-ported status.
- Backend area-lighting blocker text now says the schema helper exists, but active renderer integration and retail pixel/geometry parity are still missing.

Verification:

- `frontend/tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts` covers:
  - paired `w=1/w=0` vertex records;
  - center near/far pair indices;
  - alternating six-index edge orientation;
  - `0x2aaa` caster-edge clamp;
  - invalid edge endpoint rejection.

Remaining blocker after this loop:

- This narrows `retail-shadow-volume-projection-parity`: caster buffer schema is implemented as a helper.
- It does not close the blocker because the active scene renderer still uses Three shadow maps and placeable fast-shadow proxies, not retail shadow-volume projection, and there is still no retail/toolset pixel or geometry parity capture.

## Follow-up loop - LightManager indirect vtable slot candidates - 2026-07-03

Question: after proving the LightManager `.rdata` vtable cluster, can we find indirect calls to the core slot offsets without Capstone?

Implementation/evidence correction:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `indirectVtableSlotCallEvidence`.
- The scan is capstone-free and decodes the minimal x64 `FF /2 call r/m64` pattern for `[reg]`, `[reg+disp8]`, and `[reg+disp32]` slot-offset candidates.
- Synthetic test coverage proves `call qword ptr [rax + 0x8]` is recognized against a fake LightManager vtable cluster.

Fresh retail result from local `nwmain.exe`:

- `proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked`;
- `candidateCount=8626`;
- slot counts:
  - `PrioritizeLights=5298`;
  - `AddLight=617`;
  - `RemoveLight=2520`;
  - `UpdateLights=191`.

Implementation/evidence correction:

- Backend area-lighting evidence and frontend scene diagnostics now cite the indirect slot-candidate counts.
- The blocker text is narrowed: direct calls are still absent for Add/Prioritize/Remove/Update, vtable slots are proven, indirect slot-offset candidates are proven, but receiver type and lane-owner data-flow remain unproven.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 6 tests after adding the capstone-free indirect call scan.

Remaining blocker after this loop:

- This narrows `retail-cross-lane-active-light-ordering`.
- It does not close it because `[reg+slot]` calls are generic virtual dispatch candidates. We still do not have data-flow proving that terrain tile, placeable, source MDL, item-property, or ProgFX lanes create/merge lights in a specific retail order through those calls.

## Follow-up loop - ProgFX Type 4 concrete non-item rows - 2026-07-03

Question: which retail Type 4 rows are actually non-item rows, and do any of them request Param3 shadows?

Implementation/evidence correction:

- `summarizeAuroraProgFxType4Rows` now reports concrete row lists in addition to counts:
  - `nonItemRows`;
  - `nonItemCastShadowRows`;
  - `proximitySuppressionRows`;
  - `attachToSceneRows`;
  - `visionRows`.
- `backend/scripts/audit-retail-progfx-type4-table.ts` now surfaces those lists from retail `nwn_base.key`.

Fresh retail result from local `progfx.2da`:

- `nonItemRows=[328,329,330,331,332,333,378,379,380,381,382,383]`.
- `nonItemCastShadowRows=[]`.
- `proximityRows=[328,329,330,332,378,379,380,382]`.
- `attachRows=[333,383]`.
- `visionRows=[328,329,330,331,333,378,379,380,381,383]`.
- Concrete labels:
  - `328 LightDarkvision`, `329 LightBlindvision`, `330 LightLowLightVisn`, `331 LightUltravision`, `332 LightDarkness`, `333 LightAreaBlackout`;
  - `378 FadeLDarkvision`, `379 FadeLBlindvision`, `380 FadeLLowLightVisn`, `381 FadeLUltravision`, `382 FadeLDarkness`, `383 FadeLAreaBlackout`.

Implementation/evidence correction:

- Backend area-lighting evidence, backend VFX render contracts, and frontend VFX fixture payloads now cite these concrete row lists.
- The non-item shadow blocker is narrowed: vanilla retail data contains no non-item Type 4 row with `Param3=1`.
- The priority/proximity/vision blocker remains real for rows 328..333 and 378..383 because table rows prove requested parameters, not runtime mutation/suppression behavior.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/aurora-vfx-source.parser.spec.ts`
  - Passed 13 tests after adding the concrete row-list fields.
- `cd backend; npx.cmd ts-node --transpile-only scripts/audit-retail-progfx-type4-table.ts`
  - Produced the row lists above from retail `nwn_base.key`.

Remaining blocker after this loop:

- Vanilla non-item Type 4 shadow requests are source-backed as absent (`nonItemCastShadowRows=[]`).
- Runtime priority/proximity/vision/attach scheduler behavior is still blocked because no decompiled or binary data-flow yet proves how rows 328..333 and 378..383 are applied, suppressed, attached, or removed in-game.

## Follow-up loop - visualeffects.2da owner phases for ProgFX Type 4 - 2026-07-03

Question: which retail `visualeffects.2da` rows actually own the non-item ProgFX Type 4 rows?

Implementation/evidence correction:

- `summarizeAuroraProgFxType4VisualEffectOwners` now maps every `visualeffects.2da` phase (`ProgFX_Impact`, `ProgFX_Duration`, `ProgFX_Cessation`) to the linked `progfx.2da` row.
- `backend/scripts/audit-retail-progfx-type4-table.ts` now reads both retail `progfx.2da` and `visualeffects.2da` from KEY/BIF and emits `visualEffectsOwnerSummary`.
- Backend area-lighting evidence, backend VFX render contracts, and frontend VFX fixture payloads now cite the owner-phase result.

Fresh retail result from local `nwn_base.key`:

- `visualEffectRowCount=10100`.
- `type4OwnerPhaseCount=77`.
- `itemLightOwnerPhaseCount=56`.
- `nonItemOwnerPhaseCount=21`.
- `ownerPhaseCounts impact=0 duration=39 cessation=38`.
- `nonItemVisionOwnerPhaseCount=19`.
- `nonItemCastShadowOwnerPhaseCount=0`.
- `nonItemAttachToSceneOwnerPhaseCount=1`.
- `nonItemProximitySuppressionOwnerPhaseCount=18`.
- `missingProgFxReferenceCount=0`.
- `nonType4ProgFxReferenceCount=120`.

Concrete non-item owner labels:

- `VFX_DUR_BLACKOUT -> 333 LightAreaBlackout`.
- `VFX_DUR_DARKVISION -> 328 LightDarkvision / 378 FadeLDarkvision`.
- `VFX_FNF_SOUND_BURST -> 328 LightDarkvision / 378 FadeLDarkvision`.
- `VFX_FNF_STRIKE_HOLY -> 328 LightDarkvision / 378 FadeLDarkvision`.
- `VFX_DUR_BLINDVISION -> 329 LightBlindvision / 379 FadeLBlindvision`.
- `VFX_DUR_LOWLIGHTVISION -> 330 LightLowLightVisn / 380 FadeLLowLightVisn`.
- `VFX_DUR_ULTRAVISION -> 331 LightUltravision / 381 FadeLUltravision`.
- `VFX_DUR_BLIND -> 332 LightDarkness / 382 FadeLDarkness`.
- `VFX_FNF_SOUND_BURST_SILENT -> 328 LightDarkvision / 378 FadeLDarkvision`.
- `VFX_FNF_TELEPORT_IN -> 328 LightDarkvision / 378 FadeLDarkvision`.
- `VFX_FNF_TELEPORT_OUT -> 328 LightDarkvision / 378 FadeLDarkvision`.

Interpretation:

- Retail vanilla non-item ProgFX Type 4 owner phases are overwhelmingly vision/darkness/blackout semantics, not ordinary scene point-light sources.
- This closes the "are we guessing non-item Type 4 owners?" gap for retail table ownership.
- It also narrows the non-item shadow question: there are no retail non-item owner phases with `Param3=1`.
- It does not close priority/proximity/attach/vision runtime behavior; table ownership still is not the scheduler implementation.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/aurora-vfx-source.parser.spec.ts test/unit/aurora-vfx-render-contract.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Passed 38 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts --run`
  - Passed 12 tests.
- `cd backend; npx.cmd ts-node scripts/audit-retail-progfx-type4-table.ts`
  - Produced the retail counts and owner labels above from `nwn_base.key`.

Remaining blocker after this loop:

- Runtime priority ordering, proximity suppression, attach-to-scene behavior, vision mutation, and cross-lane active-light ordering still require scheduler data-flow or a retail oracle scene.

## Follow-up loop - automatic `fxpa_dot01` fast-shadow texture delivery - 2026-07-03

Question: after recovering the retail `fxpa_dot01` TGA/TXI and adding the frontend texture hook, does the normal placeable render asset path actually deliver that texture to the fast-shadow material?

Implementation/evidence correction:

- `buildPlaceableAssetManifest` now requests `fxpa_dot01` whenever placeable metadata carries a finite `source2daShadowSize`. This routes the retail shadow-dot resource through the same on-demand KEY/BIF/HAK texture lookup used by other placeable texture assets.
- The placeable texture resolver now treats `fxpa_dot01` as a runtime-reference texture, but never as a model diffuse fallback. This prevents the shadow-dot asset from being painted onto the placeable model while still exposing it by reference for the fast-shadow lane.
- `workspaceObjectMeshLayer` now resolves `fxpa_dot01` by reference from the asset contract, uses any cached texture immediately, and asynchronously replaces the procedural preview alpha-map with the delivered retail texture through `bindPlaceableTwoDaFastShadowTexture`.
- The bound runtime status is `placeableTwoDaFastShadowTextureBindingStatus=source-backed-retail-fxpa-dot01-rgba-texture-bound`, `placeableTwoDaFastShadowTextureBindingMapKind=retail-rgba-map`, and proof `source-backed-retail-key-bif-fxpa-dot01-texture-bound`.
- This supersedes the earlier fast-shadow blocker "automatic delivery of that KEY/BIF texture into the frontend fast-shadow hook is not wired yet".

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/catalog.application.service.spec.ts -t "fast-shadow texture|embedded in derived glb"`
  - Passed 2 focused tests. The new case proves `source2daShadowSize` adds `fxpa_dot01.tga` as a texture asset and render-package texture binding.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts --run -t "fxpa|fast shadows|texture contracts"`
  - Passed 5 focused tests. The new cases prove `fxpa_dot01` is exposed by reference, excluded from diffuse fallback, and bound as the fast-shadow `material.map`.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/catalog.application.service.spec.ts test/unit/aurora-tga-texture-summary.spec.ts`
  - Passed 2 files / 153 tests.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/WorkspaceCanvasViewport.renderFilter.test.ts --run`
  - The new `fxpa_dot01` tests passed inside this run, but the full `WorkspaceCanvasViewport.renderFilter` file still has unrelated existing failures in terrain bridge expectations, texture-fetch `AbortSignal` assertions, model-loader timeout tests, and simple fallback batching/material expectations. This run is not promoted as a green proof packet.

Remaining blocker after this loop:

- `fxpa_dot01` resource recovery, contract delivery, and fast-shadow material binding are closed.
- Exact retail `ShadowSize` projection/radius/opacity, active retail shadow-volume/projection parity, retail cross-lane active-light ordering, and ProgFX Type 4 runtime priority/proximity/vision scheduler semantics remain open.

## Follow-up loop - `ShadowSize` fast-shadow geometry from source MDL emitter - 2026-07-03

Question: after wiring `fxpa_dot01`, is the active fast-shadow still an invented circle, or does it use the source MDL emitter shape contract?

Implementation/evidence correction:

- The active placeable fast-shadow proxy no longer uses `CircleGeometry(radius)`.
- `createPlaceableTwoDaFastShadowProxy` now uses `PlaneGeometry(emitterSize, emitterSize)` for `Fx_Shadow_S/M/L`, rotated into the local-Z ground plane. The visible shape comes from `fxpa_Dot01` alpha instead of from a hard-coded circle.
- The proxy now uses the source emitter `z=0.03` position multiplied by the current source-unit scale for its vertical offset instead of the older magic `0.012`.
- Root and mesh userData now expose:
  - `placeableTwoDaFastShadowRendererMode=aurora-fast-shadow-source-mdl-textured-quad-proxy`;
  - `placeableTwoDaFastShadowGeometryType=source-mdl-single-billboard-local-z-plane`;
  - `placeableTwoDaFastShadowQuadSize=<Fx_Shadow_* emitter size>`;
  - `placeableTwoDaFastShadowGeometryProofStatus=source-backed-retail-shadow-mdl-single-billboard-local-z-quad`;
  - projection status `source-backed-retail-shadow-mdl-single-billboard-local-z-textured-quad-shadowvol-caster-buffer-bound-stencil-parity-blocked` after the 2026-07-03 caster-buffer binding update.
- Scene-wide shadow diagnostics and placeable light render diagnostics now include geometry/quad-size/proof fields, so screenshots/proof JSON can distinguish a source-backed textured quad from the older circular proxy.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 2 files / 120 tests. The tests assert the fast-shadow mesh is a `THREE.PlaneGeometry`, has width/height from `Fx_Shadow_*` emitter size, carries the new geometry proof fields, and preserves `ShadowSize` small/medium/large selection.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- Source-backed `ShadowSize -> Fx_Shadow_* -> emitter size/alpha/texture/quad` active preview is implemented.
- Retail shadow-volume projection parity is still not closed: the active renderer still does not port the full `FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c` caster/extrusion/projection path, and there is still no retail/toolset pixel or geometry oracle capture.
- Retail cross-lane active-light ordering and ProgFX Type 4 priority/proximity/vision scheduler semantics remain open.

## Follow-up loop - shadow-volume caster helper to Three BufferGeometry - 2026-07-03

Question: does the recovered retail shadow-volume caster schema stop at a raw array helper, or can it produce a Three geometry without losing the retail homogeneous `w` record?

Implementation/evidence correction:

- `auroraShadowVolumeGeometry` now exports `createAuroraShadowVolumeCasterBufferGeometry`.
- The helper still starts from the recovered retail paired-record schema:
  - records per source vertex: `2`;
  - floats per vertex record: `4`;
  - per-source vertex record pair: `x,y,z,w=1` and `x,y,z,w=0`;
  - indices per caster edge: `6`;
  - caster edge clamp: `0x2aaa`.
- It now creates a `THREE.BufferGeometry` with:
  - `position` attribute from the retail xyz fields;
  - `auroraShadowVolumeW` attribute preserving the retail homogeneous `w`;
  - index buffer from the recovered six-index caster-edge layout;
  - userData proof fields for source vertex count, caster edge count, record/edge sizes, center indices, max edge count, source, and status.
- Scene shadow diagnostics and backend area-lighting evidence now say the project has both the raw retail schema helper and the Three geometry bridge. They still keep active renderer parity blocked.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 2 files / 10 tests. The new test asserts exact `position`, `auroraShadowVolumeW`, and index arrays.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 4 tests after updating the API blocker text to mention `Three BufferGeometry` and `auroraShadowVolumeW`.
- `cd frontend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.
- `cd backend; npx.cmd tsc -p tsconfig.json --noEmit --pretty false`
  - Passed.

Remaining blocker after this loop:

- Shadow-volume raw caster schema and Three BufferGeometry conversion are implemented.
- Active renderer integration is still blocked because we do not yet feed real scene caster geometry through this helper at render time, do not run the retail stencil/shader path, and do not have a retail/toolset pixel or geometry oracle capture.
- Retail cross-lane active-light ordering and ProgFX Type 4 priority/proximity/vision scheduler semantics remain open.

## Follow-up loop - stale non-item ProgFX Type 4 shadow blocker removed - 2026-07-03

Question: is `progfx-type4-non-item-shadow-scheduler` a real remaining blocker, or did the retail table audit already prove there are no vanilla non-item Type 4 rows that request cast shadows?

Implementation/evidence correction:

- The remaining blocker manifest no longer reports `progfx-type4-non-item-shadow-scheduler`.
- The retail table/owner-phase proof already reports `nonItemCastShadowRows=[]` and `nonItemCastShadowOwnerPhaseCount=0`.
- ProgFX Type 4 shadow policy is now split instead of being one generic blocked value:
  - item-light rows report `source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked`;
  - vanilla non-item rows report `source-backed-progfx-type4-non-item-cast-shadow-absent-vanilla-rows`;
  - custom non-item rows with `Param3=1`, if ever loaded outside vanilla retail evidence, stay blocked as custom runtime behavior.
- Area evidence, API contracts, VFX fixture payloads, canonical renderer metadata, scene diagnostics, and App fixture route tests now agree that remaining retail blockers are:
  - retail shadow-volume projection parity;
  - retail cross-lane active-light ordering;
  - ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler semantics.

Verification:

- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts test/unit/aurora-vfx-source.parser.spec.ts test/unit/aurora-vfx-render-contract.spec.ts`
  - Passed 3 files / 38 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 6 files / 40 tests.
- `cd backend; npm.cmd run build`
  - Passed.
- `cd frontend; npm.cmd run build`
  - Passed with the existing large-chunk warning only.

Remaining blocker after this loop:

- Non-item ProgFX Type 4 vanilla shadow-casting is closed as source-backed absent, not implemented behavior.
- Still open: active retail shadow-volume projection parity, retail cross-lane active-light ordering, and exact ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler semantics.

## Follow-up loop - placeable fast-shadow caster buffer bound to active proxy - 2026-07-03

Question: after porting the shadow-volume BufferGeometry helper, does the active placeable fast-shadow render path actually bind any recovered caster buffer, or is the helper still isolated?

Implementation/evidence correction:

- Every active placeable `ShadowSize -> Fx_Shadow_*` fast-shadow proxy now creates a child `placeable_2da_light_fast_shadow_volume_caster`.
- The child geometry is produced by `createAuroraShadowVolumeCasterBufferGeometry` from the source-backed `Fx_Shadow_*` local-Z quad corners.
- The bound geometry carries:
  - 4 source vertices from the fast-shadow quad;
  - 4 caster edges;
  - 10 paired vertex records, because the recovered schema stores two records per source vertex plus the center pair;
  - 24 indices, because retail emits 6 indices per caster edge;
  - the preserved `auroraShadowVolumeW` attribute.
- The fast-shadow root/userData and scene shadow diagnostics now expose `volumeStatus`, `volumeGeometry`, source vertex/edge/record/index counts, `volumeW=auroraShadowVolumeW`, and the Three BufferGeometry proof status.
- The default caster-buffer mesh is hidden so it does not corrupt the visible fast-shadow; diagnostic gizmos can expose it as a wireframe.
- Backend and frontend shadow-volume blocker text now says the renderer binds the placeable source-quad caster buffer, but still does not run the retail stencil/shader projection path.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run`
  - Passed 4 files / 128 tests.
- `cd backend; npx.cmd jest --config ./jest.unit.config.js --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 1 file / 4 tests.
- `cd frontend; npm.cmd run build`
  - Passed after `npx.cmd tsc -b --clean`; the first incremental run had a stale unused-constant diagnostic that disappeared after cleaning `tsc -b`.
- `cd backend; npm.cmd run build`
  - Passed.

Remaining blocker after this loop:

- Placeable fast-shadow proxies now bind a source-backed shadow-volume caster buffer. This closes the isolated-helper gap.
- Retail shadow-volume projection parity remains open: we still do not feed real scene caster buckets `0xd/0xe/0xb/0xc` through the active renderer, do not execute the retail stencil/shader path, and do not have pixel/geometry parity against retail/toolset output.
- Retail cross-lane active-light ordering and exact ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler semantics remain open.

## Follow-up loop - MDL light budget uses recovered LightManager score - 2026-07-03

Question: does the active placeable/creature MDL light preview still sort by the old diagnostic `lightpriority` fallback, or can it use the recovered retail score from `FUN_00a41850` and `FUN_00a41694`?

Implementation/evidence correction:

- Added `frontend/src/modules/layout/adapters/three/auroraLightManagerPreview.ts` with the recovered score shape:
  - invalid radius/multiplier/extent -> `100000`;
  - current-object lane -> `-1`;
  - otherwise `((priority+1)*previewDistance)/((field0x70+4)*(rangeTerm+1))`;
  - ascending sort by score, matching `FUN_00a41694`.
- Placeable source-MDL light previews and creature source-MDL light previews now rank active lights by that score instead of `lightpriority desc`.
- Runtime userData now exposes `auroraLightRetailScore*` / `creatureAuroraLightRetailScore*` fields with score, source, formula, proof status, sort direction, and fallback reason.
- Animated placeable and creature MDL lights refresh the score fields when position/radius/multiplier animation updates.
- Scene light diagnostics now include the retail-score fields in point-light samples.
- Area lighting evidence now exposes `retailMdlPreviewScore*` fields for processed MDL light-node candidates, uses `priority: 300` as the MDL lane bucket, and sorts ties inside that lane by recovered ascending LightManager score instead of the old synthetic `300 + lightpriority` diagnostic order.
- The frontend Areas API contract and Zod schema preserve the new `retailMdlPreviewScore*` fields, so the score/proof data survives HTTP parsing and can be surfaced by Areas diagnostics.
- The proof status remains a preview fallback, not full retail parity, because the browser still lacks the recovered retail camera/object-manager inputs, `field0x70` data-flow, and cross-lane insertion call-site between terrain tile, placeable, MDL, item, and ProgFX lanes.

Verification:

- `cd backend; npm.cmd run test:unit -- --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 1 file / 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run`
  - Passed 2 files / 10 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t "LightManager score|source MDL light previews|lower configured runtime cap|source MDL light-node VFX"`
  - Passed 1 file / 3 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts --run -t "source MDL light nodes|LightManager score|source MDL light previews|lower configured runtime cap"`
  - Passed 1 file / 3 focused tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run`
  - Passed 2 files / 15 tests.
- `cd backend; npm.cmd run build`
  - Passed.
- `cd frontend; npm.cmd run build`
  - Passed; existing Vite chunk-size warning only.
- `WorkspaceCanvasViewport.renderFilter.test.ts` full-file run still has unrelated loader/terrain/model failures; the updated `readPlaceablesVfxPreviewDrawMetrics` diagnostics assertions passed during the run.

Remaining blocker after this loop:

- MDL-lane active-light score/sort is now implemented in preview form with source-backed formula and runtime proof fields.
- Retail cross-lane active-light ordering is still open because no common insertion call-site or vtable receiver data-flow proves the merge order between tile/placeable/MDL/item/VFX lanes.
- Retail shadow-volume projection parity and exact ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler semantics remain open.

## Follow-up loop - placeable fast-shadow exposes recovered shadowvol draw path - 2026-07-03

Question: can the active placeable fast-shadow proxy expose more of the recovered retail shadow-volume path without pretending that WebGL is already running the retail stencil/projection renderer?

Implementation/evidence correction:

- `frontend/src/modules/layout/adapters/three/auroraShadowVolumeGeometry.ts` now exports the source-backed retail shadowvol shader names (`vs_shadowvol`, `fs_shadowvol`), render-bucket order (`0xd -> 0xe -> 0xb -> 0xc`), draw wrapper source (`FUN_00a78128 -> FUN_00a75e3c`), point-light profile source (`radius +0x58`, `shadowradius +0x60`, `verticaldisplacement +0x64`), and the explicit parity-blocked proof status.
- `workspacePlaceableModelPresentation` attaches those fields to the real placeable fast-shadow mesh, its hidden/diagnostic shadow-volume caster mesh, and the root placeable 2DA light group. The existing caster BufferGeometry still carries paired near/far records plus `auroraShadowVolumeW`.
- `workspaceObjectMeshLayer` and `workspaceSceneLightDiagnostics` now include the shader names, bucket order, draw wrapper, light profile, and proof status in text samples. Runtime proof can now show the specific retail draw path for the concrete fast-shadow proxy instead of only saying that a helper exists.
- The blocker remains honest: this still does not run the retail `FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c` stencil/shader path in WebGL and does not provide pixel/geometry parity against retail/toolset output.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 2 files / 11 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t fast-shadow`
  - Passed 1 focused test; 113 skipped by filter.
- `cd frontend; npm.cmd run build`
  - Passed; existing Vite chunk-size warning only.

Remaining blocker after this loop:

- Retail shadow-volume projection parity is narrower but still open: source-backed shader/bucket/draw-wrapper/profile metadata is attached to active fast-shadow/caster proxies, but the renderer still uses the textured fast-shadow quad plus hidden diagnostic caster buffer, not the retail stencil/projection pass.
- Retail cross-lane active-light ordering remains open.
- Exact ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler semantics remain open.

## Follow-up loop - cross-lane recheck and ProgFX Type 4 numeric diagnostics - 2026-07-03

Question: after the MDL score and shadowvol metadata updates, can the remaining cross-lane or ProgFX Type 4 blocker move without guessing?

Cross-lane audit result:

- Re-ran `python backend\scripts\audit-retail-light-function-disasm.py` against the local retail binaries and `C:\Projects\New Folder\export\decompiled_all.c`.
- Source-only LightManager evidence still reports `proofStatus=source-backed-lightmanager-insert-score-sort-upload-cross-lane-source-callsite-blocked` and `directInsertionCallHits=[]`.
- Live retail binary summary still reports `nwmain.exe` LightManager `targetCount=23`, `requestedTargetCount=4`, `directCallXrefCount=23`, `requestedDirectCallXrefCount=0`, vtable cluster `0x140d85f78..0x140d85fd0`, and generic indirect vtable slot candidates with no lane receiver data-flow.
- Local Python currently reports `capstoneImportError=No module named 'capstone'`, so the deeper disassembly/data-flow route cannot be promoted in this run. Cross-lane ordering stays blocked rather than invented.

Implementation/evidence correction:

- `workspaceSceneLightDiagnostics` now reads and formats the numeric/boolean ProgFX Type 4 values already emitted by `auroraVfxCanonicalRenderer`: `priority`, `proximitySuppression`, and `attachToScene`.
- ProgFX Type 4 non-point-light samples now show both raw table fields and parsed values, for example `param4Raw=20;priority=20`, `param5Raw=0;proximity=false`, and `param6Raw=1;attachToScene=true`.
- This improves runtime proof readability for priority/proximity/scene-attachment inputs but still does not claim retail scheduler semantics for priority ordering, proximity suppression, scene attachment, or vision mutation.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "ProgFX Type 4"`
  - Passed 1 focused test; 5 skipped by filter.
- `cd frontend; npm.cmd run build`
  - Passed; existing Vite chunk-size warning only.

Remaining blocker after this loop:

- Retail cross-lane active-light ordering remains blocked by missing lane receiver data-flow/common insertion callsite; current environment lacks `capstone` for the deeper path.
- ProgFX Type 4 has clearer runtime diagnostics for parsed Param4/5/6 values, but exact priority/proximity/scene-attachment/vision scheduler parity remains blocked.
- Retail shadow-volume projection parity remains blocked as above.

## Follow-up loop - LightManager direct helper call summary - 2026-07-03

Question: are the retail binary direct calls to `LightManager` enough to prove lane ordering, or are they only helper/query traffic?

Audit result:

- Local tooling check found no `dumpbin`, `llvm-objdump`, `objdump`, `radare2`, `rizin`, PDB/MAP/SYM/DBG files, or locally available Python `capstone` package.
- `backend/scripts/audit-retail-light-function-disasm.py` still runs its capstone-free binary scan over `nwmain.exe`.
- The scan reports `targetCount=23`, `requestedTargetCount=4`, `directCallXrefCount=23`, and `requestedDirectCallXrefCount=0`.
- New `directCallTargetSummary` proves the direct calls are helper/query methods only: `GetMaxLights=10 calls / 8 caller functions`, `GetEmitterLighting=3 / 2`, `GetShadowLights=3 / 2`, `SetHeadLightProperties=2 / 2`, plus constructor/destructor/lensflare/nearest/render-range helpers with one call each.
- New `requestedDirectCallTargetSummary=[]` proves there are still no direct calls to the requested core lane-order methods: `AddLight`, `PrioritizeLights`, `RemoveLight`, or `UpdateLights`.

Implementation/evidence correction:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `directCallTargetSummary` and `requestedDirectCallTargetSummary`.
- Backend Areas evidence and frontend scene diagnostics now cite the helper-only direct-call summary and keep cross-lane ordering blocked.
- This narrows the blocker: the binary does contain `LightManager` direct call traffic, but the traffic is not the ordering/insertion path we need.

Verification:

- `cd backend; npm.cmd run test:unit -- --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 1 file / 6 tests.
- `cd backend; npm.cmd run test:unit -- --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 1 file / 4 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 1 file / 6 tests.
- `cd backend; npm.cmd run build`
  - Passed.
- `cd frontend; npm.cmd run build`
  - Passed; existing Vite chunk-size warning only.

Remaining blocker after this loop:

- Retail cross-lane active-light ordering remains blocked by missing direct or receiver-proven indirect callsites into `AddLight` / `PrioritizeLights` / `RemoveLight` / `UpdateLights`.
- Retail shadow-volume projection parity remains blocked: source-backed geometry/profile/draw metadata is exposed, but WebGL still does not run the retail stencil/shader projection pass.
- Exact ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler parity remains blocked.

## Follow-up loop - active shadow-volume w-pair projection preview - 2026-07-03

Question: can the recovered shadow-volume caster buffer move from hidden metadata into visible runtime behavior without falsely claiming retail stencil parity?

Implementation:

- `auroraShadowVolumeGeometry` now creates an active Three `ShaderMaterial` preview for the recovered paired `w=1/w=0` caster records.
- The preview shader preserves `auroraShadowVolumeW=1` source records and extrudes `auroraShadowVolumeW=0` records away from the local light position.
- Placeable `Fx_Shadow_*` fast shadows now get a separate child mesh named `placeable_2da_light_fast_shadow_volume_projection_preview`.
- The preview uses the recovered retail light profile inputs: `fx_placeable01` `shadowradius +0x60 = 15` for extrusion distance and `verticaldisplacement +0x64 = 3` for the local light position, both scaled by the current source-unit scale.
- Existing textured `Fx_Shadow_*` fast-shadow quad remains the visible retail MDL emitter proxy; the hidden wireframe caster buffer remains available for diagnostic gizmos.

Evidence correction:

- Backend Areas blocker text now says the caster buffer and active w-pair extrusion preview exist, while the missing part is specifically the retail `FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c` stencil/shader projection path plus pixel/geometry parity.
- Frontend scene diagnostics now include `volumePreview`, `volumePreviewRenderer`, `volumePreviewLight`, `volumePreviewExtrusion`, `volumePreviewOpacity`, `volumePreviewSource`, and `volumePreviewProof` in fast-shadow samples.
- The status remains blocked for retail parity; this is a visible source-backed preview, not a claim that the retail stencil pass is fully ported.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 2 files / 12 tests.
- `cd frontend; npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run -t fast-shadow`
  - Passed 1 focused test; 113 skipped by filter.
- `cd frontend; npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run`
  - Passed 3 files / 16 tests.
- `cd backend; npm.cmd run test:unit -- --runTestsByPath test/unit/area-lighting-evidence.spec.ts`
  - Passed 1 file / 4 tests.
- `cd frontend; npm.cmd run build`
  - Passed; existing Vite chunk-size warning only.

Remaining blocker after this loop:

- Retail shadow-volume projection parity is narrower but still open: active w-pair extrusion preview exists, but the renderer still does not execute the retail stencil/shader pass or prove pixel/geometry parity against retail/toolset output.
- Retail cross-lane active-light ordering remains blocked.
- Exact ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler parity remains blocked.

## Follow-up loop - LightManager indirect slot context inventory - 2026-07-03

Question: do the capstone-free indirect vtable slot candidates carry any same-function context that proves tile/placeable/MDL/item/VFX lane insertion order?

Audit result:

- `backend/scripts/audit-retail-light-function-disasm.py` now records direct `E8` calls to known Aurora exports inside each function that contains a sampled `LightManager` vtable-slot candidate.
- Live `nwmain.exe` scan still reports `requestedDirectCallXrefCount=0` for `AddLight` / `PrioritizeLights` / `RemoveLight` / `UpdateLights`.
- Indirect slot inventory remains `candidateCount=8626`: `PrioritizeLights=5298`, `AddLight=617`, `RemoveLight=2520`, `UpdateLights=191`.
- Saved candidate samples: `sampledCandidateCount=192`.
- Only `16` sampled candidates have known same-function direct-call context, and that context is helper/render/collect traffic: `GetShadowLights=21`, `GetEmitterLighting=20`, `RenderLightRanges=10`, `Gob::CollectLights=10`, `GetNearestLights=3`, `CExoArrayList<PartLight>::Add=3`, `GetLensFlareLights=1`.
- No sampled same-function context proves terrain tile, placeable, source MDL, item-property, or ProgFX creation precedence into the same manager.

Implementation/evidence correction:

- The scanner now emits `sampledCandidateCount`, `sampledCandidatesWithKnownDirectCallContextCount`, and `sampledKnownDirectCallTargetSummary`.
- Backend Areas evidence and frontend scene diagnostics now cite these counts.
- Cross-lane ordering remains blocked, but the blocker is now narrower: indirect candidates are visible and sampled context is inventoried, yet no receiver/lane data-flow is recovered.

Verification:

- `cd backend; npm.cmd run test:unit -- --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts`
  - Passed 1 file / 6 tests.

Remaining blocker after this loop:

- Retail cross-lane active-light ordering remains blocked by missing receiver-proven indirect dispatch or common insertion callsite tying tile/placeable/MDL/item/VFX lanes into `LightManager`.
- Retail shadow-volume projection parity remains blocked as above.
- Exact ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler parity remains blocked.

## Follow-up loop - active WebGL stencil shadow-volume lane - 2026-07-03

Question: can the recovered shadow-volume caster buffer and w-pair projection preview move into a real WebGL stencil lane, while still keeping retail pixel parity blocked until compared against retail/toolset output?

Implementation:

- `workspaceThreeRuntime` now creates `THREE.WebGLRenderer` with `stencil: true`.
- `auroraShadowVolumeGeometry` now exposes front/back shadow-volume stencil materials and a receiver material:
  - back pass: `BackSide`, `IncrementWrapStencilOp`, `colorWrite=false`, `depthWrite=false`.
  - front pass: `FrontSide`, `DecrementWrapStencilOp`, `colorWrite=false`, `depthWrite=false`.
  - receiver pass: nonzero stencil test `NotEqual(0)` with keep ops.
- Placeable `Fx_Shadow_*` fast-shadow proxies now get three additional runtime children:
  - `placeable_2da_light_fast_shadow_volume_stencil_back`
  - `placeable_2da_light_fast_shadow_volume_stencil_front`
  - `placeable_2da_light_fast_shadow_volume_stencil_receiver`
- The stencil lane uses the same source-backed retail profile as the w-pair projection preview:
  - `fx_placeable01/AuroraLight01` `shadowradius +0x60 = 15`, scaled to `7.5`.
  - `fx_placeable01/AuroraLight01` `verticaldisplacement +0x64 = 3`, scaled to `1.5`.
  - recovered paired vertex records with `auroraShadowVolumeW` and six indices per caster edge.
- `CatalogVfxPreviewRunner` now records runtime proof fields in both DOM attributes and `catalog-vfx-preview-frame` JSON:
  - `rendererStencilBuffer`
  - `shadowVolumeStencilMaterialCount`
  - `shadowVolumeStencilReceiverCount`

Runtime proof captures:

- Campfire active:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-runtime-proof-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-runtime-proof-2026-07-03.frame.json`
  - `rendererStencilBuffer=true`, `shadowVolumeStencilMaterialCount=3`, `shadowVolumeStencilReceiverCount=1`.
  - `placeableTwoDaLightStatus=active`, `placeableTwoDaLightPointLightCount=1`, `placeableTwoDaLightFastShadowCount=1`, `sceneShadowFastShadowProxyCount=1`.
  - color source: `lightcolor.2da`, label `PaleYellow`, RGB `1.9,1.9,1`, toolset/display RGB `0.94,0.94,0.77`.
- Candle active:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-candle-stencil-runtime-proof-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-candle-stencil-runtime-proof-2026-07-03.frame.json`
  - `rendererStencilBuffer=true`, `shadowVolumeStencilMaterialCount=3`, `shadowVolumeStencilReceiverCount=1`.
  - `placeableTwoDaLightStatus=active`, `placeableTwoDaLightPointLightCount=1`, `placeableTwoDaLightFastShadowCount=1`, `sceneShadowFastShadowProxyCount=1`.
  - color source: `lightcolor.2da`, label `PaleDarkYellow`, RGB `0.94,0.94,0.5`, toolset/display RGB `0.59,0.56,0.37`.
- Campfire off through `lightState=0`:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-runtime-proof-off-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-runtime-proof-off-2026-07-03.frame.json`
  - `rendererStencilBuffer=true`, but `shadowVolumeStencilMaterialCount=0`, `shadowVolumeStencilReceiverCount=0`.
  - `placeableTwoDaLightStatus=disabled`, `placeableTwoDaLightPointLightCount=0`, `placeableTwoDaLightFastShadowCount=0`, `sceneShadowFastShadowProxyCount=0`.
  - sample says `status=off-by-lightstate`, `disabledReason=LightState=0`, and retains the source-backed `PaleYellow` row metadata.

Evidence correction:

- The implementation no longer has a missing WebGL stencil lane for placeable fast-shadow volume proof: a stencil buffer is requested and runtime captures prove active stencil materials plus receiver for active placeables.
- The status intentionally remains `retail-pixel-parity-blocked` because this is not yet a retail/toolset pixel or exact GL-state oracle match for `FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c`.
- Campfire and candle use the same shadow area because both source rows have `ShadowSize=1`, which maps to `Fx_Shadow_M`; this is source-backed, not guessed.

Verification:

- `cd frontend; npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run`
  - Passed 4 files / 136 tests.
- Runtime capture command for campfire active:
  - `node backend\scripts\capture-vfx-app-route-cdp.mjs --route "/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.32&seed=713" --name "placeable-light-campfire-stencil-runtime-proof-2026-07-03" --outDir "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview" --waitAttempts 520`
- Runtime capture command for candle active:
  - `node backend\scripts\capture-vfx-app-route-cdp.mjs --route "/dev/catalog-vfx-preview?templateId=plc_bhp_arcn1a&time=0.32&seed=714" --name "placeable-light-candle-stencil-runtime-proof-2026-07-03" --outDir "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview" --waitAttempts 320`
- Runtime capture command for campfire off:
  - `node backend\scripts\capture-vfx-app-route-cdp.mjs --route "/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.32&seed=715&lightState=0" --name "placeable-light-campfire-stencil-runtime-proof-off-2026-07-03" --outDir "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview" --waitAttempts 420`

Remaining blocker after this loop:

- Retail shadow-volume projection parity remains blocked only at oracle parity level: the source-backed geometry/profile/stencil implementation is active in Aurora Web, but exact pixel/geometry/GL-state equivalence against retail/toolset output is still not proven.
- Retail cross-lane active-light ordering remains blocked by missing receiver-proven indirect dispatch or common insertion callsite tying tile/placeable/MDL/item/VFX lanes into `LightManager`.
- Exact ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler parity remains blocked.

## Follow-up loop - retail z-pass/z-fail stencil op sequence - 2026-07-03

Question: was the first active stencil lane still a guessed z-pass approximation, or can it follow the recovered retail stencil op sequence from decompilation?

Decompilation evidence:

- `C:/Projects/New Folder/export/decompiled_all.c:913914-914017` recovers `FUN_00a878f8`, which loads `vs_shadowvol/fs_shadowvol`, sets the point-light profile from radius `+0x58`, shadowradius `+0x60`, and verticaldisplacement `+0x64`, then walks shadow-volume render buckets `0xd -> 0xe -> 0xb -> 0xc`.
- `913986-913987` sets `FUN_00a78344(0,0,0,3)` and `FUN_00a78344(1,0,0,4)` before the first bucket draw group.
- `914032-914033` switches to `FUN_00a78344(0,0,4,0)` and `FUN_00a78344(1,0,3,0)` for the later bucket draw group.
- `904308-904311` shows `FUN_00a78344` wrapping `FUN_00a6f2b4`; `898458-898511` caches per-face stencil op triples before dispatch through `PTR_DAT_00d3dd6c`.

Implementation:

- `auroraShadowVolumeGeometry` now exposes z-pass and z-fail volume materials, with explicit `depthPass` metadata and the recovered retail op sequence in `userData`.
- Placeable fast-shadow proxies now create four stencil volume meshes plus receiver:
  - `back:zpass`
  - `front:zpass`
  - `back:zfail`
  - `front:zfail`
  - receiver `NotEqual(0)`
- Runtime proof now expects `shadowVolumeStencilMaterialCount=5` for active placeable lights: four volume passes plus one receiver.
- `workspaceSceneLightDiagnostics` now reports `frontendRuntimePortStatus=source-backed-shadowplane-shadowvol-shader-caster-path-zpass-zfail-stencil-preview-active-retail-parity-blocked` instead of treating the active frontend path as not ported.

Runtime proof captures after z-pass/z-fail:

- Campfire active:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-zpass-zfail-runtime-proof-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-zpass-zfail-runtime-proof-2026-07-03.frame.json`
  - `rendererStencilBuffer=true`, `shadowVolumeStencilMaterialCount=5`, `shadowVolumeStencilReceiverCount=1`.
  - `placeableTwoDaLightStatus=active`, `placeableTwoDaLightPointLightCount=1`, `placeableTwoDaLightFastShadowCount=1`.
  - source color: `PaleYellow`, RGB `1.9,1.9,1`, display/toolset RGB `0.94,0.94,0.77`, source world distance `5`.
- Candle active:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-candle-stencil-zpass-zfail-runtime-proof-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-candle-stencil-zpass-zfail-runtime-proof-2026-07-03.frame.json`
  - `rendererStencilBuffer=true`, `shadowVolumeStencilMaterialCount=5`, `shadowVolumeStencilReceiverCount=1`.
  - `placeableTwoDaLightStatus=active`, `placeableTwoDaLightPointLightCount=1`, `placeableTwoDaLightFastShadowCount=1`.
  - source color: `PaleDarkYellow`, RGB `0.94,0.94,0.5`, display/toolset RGB `0.59,0.56,0.37`, source world distance `5`.
- Campfire off through `lightState=0`:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-zpass-zfail-runtime-proof-off-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-zpass-zfail-runtime-proof-off-2026-07-03.frame.json`
  - `rendererStencilBuffer=true`, but `shadowVolumeStencilMaterialCount=0`, `shadowVolumeStencilReceiverCount=0`.
  - `placeableTwoDaLightStatus=disabled`, `placeableTwoDaLightPointLightCount=0`, `placeableTwoDaLightFastShadowCount=0`, `disabledReason=LightState=0`.

Evidence correction:

- The active Aurora Web placeable fast-shadow path is now source-backed through geometry, profile, shader/bucket metadata, and z-pass/z-fail stencil op sequence.
- The remaining shadow blocker is no longer "no active stencil port"; it is now exact retail oracle parity: face-slot mapping, pixel geometry, opacity, blend/depth/stencil ordering, and comparison against retail/toolset output.
- Cross-lane active-light ordering and ProgFX Type 4 priority/proximity/scene-attachment/vision scheduler semantics remain blocked separately.

## Follow-up loop - refreshed audit artifacts for remaining blockers - 2026-07-03

Question: after z-pass/z-fail was implemented, do the remaining blockers still come from source evidence gaps rather than stale proof text?

Generated artifacts:

- `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/audit-retail-light-function-disasm-2026-07-03.json`
  - `shadowVolumeProjectionEvidence.proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-op-sequence-extracted-retail-parity-blocked`.
  - `stencilOpSequenceEvidence.proofStatus=source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-slot-mapping-blocked`.
  - `lightManagerSourceOrderingEvidence.proofStatus=source-backed-lightmanager-insert-score-sort-upload-cross-lane-source-callsite-blocked`.
  - `directInsertionCallHits=[]`, so the source-only scan still does not prove a common tile/placeable/MDL/item/VFX insertion callsite.
  - `progfxType4SourceSchedulerEvidence.proofStatus=source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation`, with `runtimeSchedulerStringHitCount=0`.
- `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/audit-retail-progfx-type4-table-2026-07-03.json`
  - `summary.proofStatus=source-backed-progfx-type4-table-parameter-distribution-runtime-scheduler-blocked`.
  - `type4RowCount=68`, `itemLightNormalRowCount=28`, `itemLightFadeRowCount=28`, `nonItemType4RowCount=12`.
  - `nonItemCastShadowRows=[]`, `proximitySuppressionRows=8`, `attachToSceneRows=2`, `visionRows=10`.
  - `visualEffectsOwnerSummary.proofStatus=source-backed-visualeffects-progfx-type4-owner-phase-map-runtime-scheduler-blocked`.
  - `nonItemCastShadowOwnerPhaseCount=0`, `nonItemAttachToSceneOwnerPhaseCount=1`, `nonItemProximitySuppressionOwnerPhaseCount=18`.

Runtime captures refreshed after the source string update:

- `placeable-light-campfire-stencil-zpass-zfail-runtime-proof-2026-07-03.frame.json`: active `PaleYellow`, RGB `1.9,1.9,1`, display/toolset RGB `0.94,0.94,0.77`, `pointLights=1`, `fastShadows=1`, `rendererStencilBuffer=true`, `shadowVolumeStencilMaterialCount=5`, `shadowVolumeStencilReceiverCount=1`, `fastShadowVolumeStencilPasses=back:zpass,front:zpass,back:zfail,front:zfail`.
- `placeable-light-candle-stencil-zpass-zfail-runtime-proof-2026-07-03.frame.json`: active `PaleDarkYellow`, RGB `0.94,0.94,0.5`, display/toolset RGB `0.59,0.56,0.37`, `pointLights=1`, `fastShadows=1`, `rendererStencilBuffer=true`, `shadowVolumeStencilMaterialCount=5`, `shadowVolumeStencilReceiverCount=1`, `fastShadowVolumeStencilPasses=back:zpass,front:zpass,back:zfail,front:zfail`.
- `placeable-light-campfire-stencil-zpass-zfail-runtime-proof-off-2026-07-03.frame.json`: disabled `PaleYellow` source row retained, `pointLights=0`, `fastShadows=0`, `shadowVolumeStencilMaterialCount=0`, `shadowVolumeStencilReceiverCount=0`.

Conclusion:

- Shadow-volume implementation is active in Aurora Web for placeable fast shadows, but retail parity still needs an oracle for face-slot mapping, projected pixel geometry, opacity, and full render-state ordering.
- Cross-lane active-light ordering remains blocked by missing common insertion/merge evidence across tile/placeable/MDL/item/ProgFX lanes.
- ProgFX Type 4 remains table/owner/source-backed only for Param and owner-phase facts; exact priority/proximity/scene-attachment/vision scheduler behavior remains blocked.

## Follow-up loop - toolset PE stencil face/op table mapping - 2026-07-03

Question: was `FUN_00a78344(0/1,...)` enough to prove front/back and increment/decrement semantics, or did Aurora Web still have to guess the face slot mapping?

New binary evidence:

- `C:/Projects/New Folder/Aurora.rep/idata/00/00000000.prp` identifies the Ghidra project as `nwtoolset.exe`.
- `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe` image base is `0x400000`.
- `.data 0x00d3dd6c` contains `0x00d12d20`, matching the runtime proc slot loaded for `glStencilOpSeparate`.
- Face table `0x00cc9a38` maps slot `0 -> GL_FRONT/0x404`, slot `1 -> GL_BACK/0x405`, slot `2 -> GL_FRONT_AND_BACK/0x408`.
- Op table `0x00cc99d8` maps slot `0 -> GL_KEEP/0x1e00`, slot `3 -> GL_INCR/0x1e02`, slot `4 -> GL_DECR/0x1e03`.

Resolved retail stencil sequence:

- z-pass group:
  - `FUN_00a78344(0,0,0,3)` -> `glStencilOpSeparate(GL_FRONT, GL_KEEP, GL_KEEP, GL_INCR)`.
  - `FUN_00a78344(1,0,0,4)` -> `glStencilOpSeparate(GL_BACK, GL_KEEP, GL_KEEP, GL_DECR)`.
- z-fail group:
  - `FUN_00a78344(0,0,4,0)` -> `glStencilOpSeparate(GL_FRONT, GL_KEEP, GL_DECR, GL_KEEP)`.
  - `FUN_00a78344(1,0,3,0)` -> `glStencilOpSeparate(GL_BACK, GL_KEEP, GL_INCR, GL_KEEP)`.

Implementation correction:

- `frontend/src/modules/layout/adapters/three/auroraShadowVolumeGeometry.ts` no longer uses `IncrementWrapStencilOp` / `DecrementWrapStencilOp` for the recovered retail path.
- Active materials now use:
  - `front:zpass -> IncrementStencilOp`
  - `back:zpass -> DecrementStencilOp`
  - `front:zfail -> DecrementStencilOp`
  - `back:zfail -> IncrementStencilOp`
- `AURORA_SHADOW_VOLUME_STENCIL_PROOF_STATUS` is now `source-backed-shadowvol-w-pair-stencil-pass-active-retail-face-op-mapped-pixel-parity-blocked`.
- `backend/scripts/audit-retail-light-function-disasm.py` now exposes `toolsetFaceOpTableEvidence.proofStatus=source-backed-toolset-binary-glstencilopseparate-face-op-table-mapped`.

Verification:

- Backend targeted tests passed: `npm.cmd run test:unit -- --runTestsByPath test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts` -> `2 passed, 10 tests`.
- Frontend targeted tests passed: `npx.cmd vitest ... --run` for shadow-volume geometry, VFX render mode, scene diagnostics, fixture runner, VFX preview runner, HTTP area API, and AreasModePanel lighting evidence -> `7 passed, 150 tests`.

Runtime captures after face/op correction:

- Campfire active:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-face-op-mapped-runtime-proof-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-face-op-mapped-runtime-proof-2026-07-03.frame.json`
  - `placeableTwoDaLightStatus=active`, `pointLights=1`, `fastShadows=1`, `rendererStencilBuffer=true`, `shadowVolumeStencilMaterialCount=5`, `shadowVolumeStencilReceiverCount=1`.
  - lightcolor row `PaleYellow`, RGB `1.9,1.9,1`, toolset/display RGB `0.94,0.94,0.77`, source radius `10`, world distance `5`.
- Candle active:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-candle-stencil-face-op-mapped-runtime-proof-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-candle-stencil-face-op-mapped-runtime-proof-2026-07-03.frame.json`
  - `placeableTwoDaLightStatus=active`, `pointLights=1`, `fastShadows=1`, `rendererStencilBuffer=true`, `shadowVolumeStencilMaterialCount=5`, `shadowVolumeStencilReceiverCount=1`.
  - lightcolor row `PaleDarkYellow`, RGB `0.94,0.94,0.5`, toolset/display RGB `0.59,0.56,0.37`, source radius `10`, world distance `5`.
- Campfire off through `lightState=0`:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-face-op-mapped-runtime-proof-off-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-light-campfire-stencil-face-op-mapped-runtime-proof-off-2026-07-03.frame.json`
  - source row remains `PaleYellow`, but runtime output is `placeableTwoDaLightStatus=disabled`, `status=off-by-lightstate`, `disabledReason=LightState=0`, `pointLights=0`, `fastShadows=0`, `shadowVolumeStencilMaterialCount=0`, `shadowVolumeStencilReceiverCount=0`.

Current remaining shadow blocker:

- Face/op mapping is no longer blocked.
- Still blocked: retail/toolset oracle parity for projected pixel geometry, opacity, and full blend/depth/stencil state ordering around `FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c`.

## Follow-up loop - ProgFX Type 4 docs-backed scheduler diagnostic - 2026-07-03

Question: are Type 4 priority/proximity/attach-to-scene/vision policies still totally unknown, or can Aurora Web implement the documented parameter policy while keeping the retail scheduler/oracle blocker honest?

New external policy evidence:

- `https://nwn.wiki/spaces/NWN1/pages/38175071/progfx.2da` Type 4 docs list:
  - Param4 as priority where lower value is higher priority and `0` always applies.
  - Param5 as proximity suppression near another light source.
  - Param6 as Beamdog "Attach to scene", removing scene lights while the effect is active.
  - Param1 as the `fx_light_clr` animation token for light/vision rows.
- Beamdog patch 8193.15 documents `progfx.2da` unhardcoding, so the policy is table/doc-backed, not invented from the current renderer.

Implementation:

- Backend parser/render-contract and frontend dev fixture payload now report:
  - `docs-backed-progfx-type4-param4-priority-lower-value-wins`
  - `docs-backed-progfx-type4-param5-proximity-suppression-near-other-light`
  - `docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights`
  - `docs-backed-progfx-type4-param1-vision-token-param4-priority`
- Scene diagnostics now evaluate existing ProgFX Type 4 non-point-light requests without creating fake `THREE.PointLight` lanes:
  - `data-scene-non-point-light-request-scheduler-status=docs-backed-progfx-type4-policy-diagnostic-retail-scheduler-dataflow-blocked`
  - priority winner is selected by lower Param4 value.
  - Param5/Param6/vision/light request counts are exposed in DOM/frame JSON.
- The remaining blocker is narrowed to retail scheduler data-flow: exact owner grouping, priority tie behavior, proximity distance threshold, scene-light restore timing, cross-lane insertion order, and pixel/runtime vision mutation parity.

Verification:

- Backend targeted tests passed: `npm.cmd run test:unit -- --runTestsByPath test/unit/aurora-vfx-source.parser.spec.ts test/unit/aurora-vfx-render-contract.spec.ts test/unit/area-lighting-evidence.spec.ts` -> `3 passed, 38 tests`.
- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/areas/httpAreaApiPort.test.ts --run` -> `5 passed, 39 tests`.

Runtime captures:

- Blue 5m owner-phase:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-blue-5m-docs-backed-scheduler-proof-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-blue-5m-docs-backed-scheduler-proof-2026-07-03.frame.json`
  - `progFxType4RowId=304`, `progFxType4Label=LightBlue5m`, `progFxType4Priority=20`, `progFxType4AttachToScene=false`.
  - `fixtureSceneNonPointLightRequestSchedulerPriorityWinner=row=304;label=LightBlue5m;...priority=20`.
  - `fixtureSceneNonPointLightRequestSchedulerLightRequestCount=1`, `VisionRequestCount=0`, `SceneAttachmentRequestCount=0`, `fixtureObjectPixels=15702`.
- BlindVision owner-phase:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json`
  - Current retail table correction: `VFX_DUR_BLINDVISION` row `242` maps to `progfx.2da` row `329` (`LightBlindvision`), not row `305` (`LightBlue10m`).
  - `progFxType4RowId=329`, `progFxType4Label=LightBlindvision`, `progFxType4Priority=53`, `progFxType4ProximitySuppression=true`, `progFxType4AttachToScene=false`.
  - `fixtureSceneNonPointLightRequestSchedulerPriorityWinner=row=329;label=LightBlindvision;...priority=53;...attachToScene=false;proximity=true`.
  - `fixtureSceneNonPointLightRequestSchedulerVisionRequestCount=1`, `LightRequestCount=0`, `SceneAttachmentRequestCount=0`, `ProximitySuppressionCandidateCount=1`, `fixtureObjectPixels=6632`.

Current remaining ProgFX blocker:

- Param policy is no longer blocked.
- Still blocked: retail scheduler/oracle parity for owner grouping, priority tie behavior, proximity threshold, attach-to-scene restore timing, cross-lane ordering, and actual vision mutation pixels.

## Follow-up loop - placeable shadow-volume runtime probe - 2026-07-03

Question: can Aurora Web prove the placeable shadow-volume/stencil implementation is present in runtime, separate from the still-missing retail pixel oracle?

Implementation:

- `workspaceSceneLightDiagnostics` now emits a shadow-volume runtime probe for active placeable fast-shadow proxies.
- The probe reports source-backed caster geometry, `auroraShadowVolumeW`, preview/stencil visibility, receiver function, expected and observed z-pass/z-fail passes, shader names, bucket metadata, and a local pixel-proof status.
- The same fields are exposed through VFX fixture/catalog preview DOM attributes and through `capture-vfx-app-route-cdp.mjs` frame JSON.

Verification:

- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.
- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run` -> `3 passed, 19 tests`.

Runtime capture:

- Campfire active:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-campfire-shadowvol-runtime-probe-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-campfire-shadowvol-runtime-probe-2026-07-03.frame.json`
  - `templateId=plc_plc_i06`, name `Campfire`, `devObjectPixels=1686`.
  - `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`.
  - `rendererStencilBuffer=true`, `shadowVolumeStencilMaterialCount=5`, `shadowVolumeStencilReceiverCount=1`.
  - `devSceneShadowRuntimeProbeStatus=source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked`.
  - `devSceneShadowRuntimeProbeActiveCasterCount=1`, `ProjectionPreviewCount=1`, `StencilReceiverCount=1`, `StencilVolumePassCount=4`.
  - expected passes: `back:zpass|front:zpass|back:zfail|front:zfail`.
  - observed passes: `back:zfail|back:zpass|front:zfail|front:zpass`.
  - shader names: `fs_shadowvol|vs_shadowvol`; buckets: `0xb|0xc|0xd|0xe`.

Current remaining shadow blocker:

- Local runtime proof is no longer missing for placeable fast-shadow shadow-volume/stencil preview.
- Still blocked: retail/toolset oracle parity for exact projected pixel geometry, opacity, and full blend/depth/stencil state ordering around `FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c`.

## Follow-up loop - cross-lane runtime coverage probe - 2026-07-03

Question: can Aurora Web prove which light lanes are present in a runtime scene and how local preview budgeting ordered them, without inventing retail cross-lane insertion order?

Implementation:

- `workspaceSceneLightDiagnostics` now emits `retailOrderingRuntimeProbe*` fields.
- The probe scans source-backed `THREE.PointLight` lanes and ProgFX Type 4 non-point requests.
- It reports required lane coverage, point-light/request sample counts, accepted/dropped/unknown local budget lanes, and local order samples.
- The local order is explicitly diagnostic only: budgetRank -> recovered +0x84 score preview -> traversal index for point lights; ProgFX Type 4 rows remain request samples and are not converted into fake PointLights.
- The same fields are exposed through VFX fixture/catalog preview DOM attributes and through `capture-vfx-app-route-cdp.mjs` frame JSON.

Verification:

- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.
- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts --run` -> `3 passed, 19 tests`.

Runtime captures:

- Campfire placeable:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-campfire-cross-lane-runtime-probe-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-campfire-cross-lane-runtime-probe-2026-07-03.frame.json`
  - `devObjectPixels=1686`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`.
  - `devScenePointLightRetailOrderingRuntimeProbeStatus=local-cross-lane-runtime-probe-missing-required-lanes-retail-ordering-still-blocked`.
  - `RequiredLaneCoverageCount=1`, `PointLightSampleCount=1`, `NonPointRequestSampleCount=0`.
  - `BudgetUnknownLanes=placeables-2da-light`.
  - local order sample: `lane=placeables-2da-light;kind=point-light;name=PaleYellow;localOrderKey=20000;...source=lightcolor.2da.RGB;proof=source-backed-fx-placeable01-auroralight01-radius-controller;retailOrdering=blocked`.
  - Shadow-volume runtime probe remains active in the same capture: `ActiveCasterCount=1`, `StencilReceiverCount=1`, `StencilVolumePassCount=4`.
- BlindVision ProgFX Type 4:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json`
  - `fixtureObjectPixels=6632`, `progFxType4RowId=329`, `progFxType4Label=LightBlindvision`, `progFxType4Priority=53`, `progFxType4ProximitySuppression=true`, `progFxType4AttachToScene=false`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeStatus=local-cross-lane-runtime-probe-missing-required-lanes-retail-ordering-still-blocked`.
  - `RequiredLaneCoverageCount=0`, `PointLightSampleCount=0`, `NonPointRequestSampleCount=1`.
  - local order sample: `lane=progfx-type4-vision-request;kind=progfx-type4-request-not-pointlight;name=LightBlindvision;localOrderKey=25053;...priority=53;...retailOrdering=blocked`.
  - This proves the fixture carries the ProgFX scheduler request without creating a fake point-light lane.
- ProgFX Type 4 multi-request policy:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-multi-request-policy-runtime-probe-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-multi-request-policy-runtime-probe-2026-07-03.frame.json`
  - Request rows: `333 LightAreaBlackout`, `304 LightBlue5m`, `328 LightDarkvision`.
  - `progFxType4RequestCount=3`, `RequestPriorities=13|20|51`, `RequestSceneAttachmentCount=1`, `RequestProximitySuppressionCount=1`, `RequestLightCount=1`, `RequestVisionCount=2`.
  - Scheduler priority winner: `row=333;label=LightAreaBlackout;...priority=13;...attachToScene=true;proximity=false`.
  - Cross-lane runtime probe: `RequiredLaneCoverageCount=1`, `PointLightSampleCount=0`, `NonPointRequestSampleCount=3`.
  - local order samples: `LightAreaBlackout localOrderKey=25013`, `LightBlue5m localOrderKey=25020`, `LightDarkvision localOrderKey=25051`.

Current remaining cross-lane blocker:

- Local runtime lane coverage/order proof is now implemented.
- Retail cross-lane active-light ordering is still blocked by missing common insertion/merge evidence across tile/placeable/MDL/item/ProgFX lanes, or an external retail/toolset oracle scene proving lane precedence.

Capstone recheck:

- `capstone` is available in the current Python environment, so the blocker is not merely a missing package.
- `backend/scripts/audit-retail-light-function-disasm.py` over `nwmain.exe` still reports:
  - `lightManagerProof=blocked-lightmanager-core-lane-ordering-no-add-prioritize-remove-update-direct-call-xrefs`.
  - `directCallXrefCount=23`, but `requestedDirectCallXrefCount=0` for `AddLight`, `PrioritizeLights`, `RemoveLight`, and `UpdateLights`.
  - `absoluteVtableClusterEvidence.proofStatus=retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite`.
  - `indirectVtableSlotCallEvidence.proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked`, `candidateCount=8626`, `sampledCandidateCount=192`.
- This confirms the current hard gap: the exported/vtable LightManager methods are visible, but no recovered direct callsite or receiver-proven indirect dispatch ties terrain tile, placeable, MDL, item, and ProgFX lanes into one retail precedence order.

## Follow-up loop - shadow-volume local material state proof - 2026-07-05

Question: can the local shadow-volume proof expose the exact WebGL material state it uses for blend/depth/stencil ordering, instead of only reporting that the stencil preview lane exists?

Implementation:

- `workspacePlaceableModelPresentation` now serializes per-pass stencil material state for the active placeable fast-shadow shadow-volume lane.
- The root placeable light diagnostic, fast-shadow mesh, scene shadow samples, and runtime probe samples now expose:
  - `fastShadowVolumeStencilPassStates` / `volumeStencilPassStates`.
  - `fastShadowVolumeStencilReceiverState` / `volumeStencilReceiverState`.
  - `fastShadowVolumeStencilStateProof=source-backed-shadowvol-local-material-state-captured-retail-op-sequence-pixel-parity-blocked`.
- The serialized local pass state records the four active passes:
  - `back:zpass`: `BackSide`, `colorWrite=false`, `depthWrite=false`, `depthTest=true`, `stencilWrite=true`, `stencilZPass=Decrement`.
  - `front:zpass`: `FrontSide`, `colorWrite=false`, `depthWrite=false`, `depthTest=true`, `stencilWrite=true`, `stencilZPass=Increment`.
  - `back:zfail`: `BackSide`, `colorWrite=false`, `depthWrite=false`, `depthTest=true`, `stencilWrite=true`, `stencilZFail=Increment`.
  - `front:zfail`: `FrontSide`, `colorWrite=false`, `depthWrite=false`, `depthTest=true`, `stencilWrite=true`, `stencilZFail=Decrement`.
- The receiver state is explicit: `receiver=stencil-nonzero-overlay`, `colorWrite=true`, `depthWrite=false`, `depthTest=false`, `stencilWrite=true`, `stencilFunc=NotEqual(0)`.

Verification:

- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.
- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run -t "shadow|Shadow|stencil|placeables.2da LightColor"` -> `2 passed, 10 tests`.

Runtime capture:

- Campfire state proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-campfire-shadowvol-state-proof-2026-07-03.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-campfire-shadowvol-state-proof-2026-07-03.frame.json`
  - `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=1686`.
  - `devAreaShadowOpacityOverride=50`, `devAreaShadowOpacityFactorOverride=0.5`.
  - `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`.
  - `devSceneShadowRuntimeProbeStatus=source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked`.
  - `devSceneShadowRuntimeProbeActiveCasterCount=1`, `ProjectionPreviewCount=1`, `StencilReceiverCount=1`, `StencilVolumePassCount=4`.
  - Frame JSON contains `fastShadowVolumeStencilPassStates=pass=back:zpass...stencilZPass=Decrement...pass=front:zpass...stencilZPass=Increment...pass=back:zfail...stencilZFail=Increment...pass=front:zfail...stencilZFail=Decrement`.
  - Frame JSON contains `fastShadowVolumeStencilReceiverState=receiver=stencil-nonzero-overlay,colorWrite=true,depthWrite=false,depthTest=false,stencilWrite=true,stencilFunc=NotEqual(0),stencilRef=0`.

Current remaining shadow blocker:

- Local Aurora Web blend/depth/stencil material state is no longer hidden or indirect.
- Still blocked: retail/toolset pixel geometry, exact retail opacity/blend/depth/stencil ordering parity, and projection parity against `FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c`.

## Follow-up loop - all required cross-lane light lanes in one runtime fixture - 2026-07-05

Question: can Aurora Web show tile, placeable, source-MDL, item-property, and ProgFX Type 4 light lanes in one runtime scene without pretending that this proves the retail LightManager insertion order?

Implementation:

- Added `vfx-retail-cross-lane-all-light-lanes-policy`, a dev fixture whose payload preserves `progfx.2da` row `304` / `LightBlue5m` as a non-PointLight scheduler request.
- `VfxFixtureRunner` now adds four source-backed diagnostic `THREE.PointLight` lanes only for this fixture:
  - terrain tile source light: `fx_flame01.mdl`, source lane `terrain-tile-light`;
  - placeables.2da light: `fx_placeable01.mdl` / `PaleYellow`, source lane `placeables-2da-light`;
  - source MDL AuroraLight: `fx_light_clr.mdl`, source lane `source-mdl-light-node`;
  - item-property light: `VFX_DUR_LIGHT_RED_20` / `LightRed20m` / `Red_20m`, source lane `item-property-light`.
- The ProgFX row stays a scheduler request: `lane=progfx-type4-light-request`, `row=304`, `label=LightBlue5m`, `priority=20`, `attachToScene=false`, `proximity=false`.
- The fixture also renders visible marker geometry for the four PointLight lanes so a screenshot is not visually blank; those markers are diagnostic-only and are not counted as light lanes.

Verification:

- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.
- Frontend targeted tests passed: `npx.cmd vitest tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts --run` -> `2 passed, 20 tests`.
- Frontend diagnostic tests passed: `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts --run` -> `3 passed, 26 tests`.

Runtime capture:

- Cross-lane all-lanes fixture:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-all-light-lanes-runtime-probe-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-all-light-lanes-runtime-probe-2026-07-05.frame.json`
  - `fixtureCanvasNonblank=true`, `fixtureObjectPixels=22336`.
  - `fixtureDiagnosticCodes` includes `VFX_CROSS_LANE_LIGHT_RUNTIME_COVERAGE_ONLY`.
  - `progFxType4RuntimeSchedulingStatus=docs-backed-progfx-type4-policy-diagnostic-cross-lane-retail-ordering-blocked`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeStatus=local-cross-lane-runtime-probe-observed-required-lanes-retail-ordering-still-blocked`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount=5`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbePointLightSampleCount=4`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount=1`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes=item-property-light|placeables-2da-light|source-mdl-light-node|terrain-tile-light`.
  - local order samples include:
    - `lane=item-property-light;kind=point-light;name=VFX_DUR_LIGHT_RED_20;localOrderKey=1;...retailOrdering=blocked`;
    - `lane=source-mdl-light-node;kind=point-light;name=diagnostic_mdl_light01;localOrderKey=2;...retailOrdering=blocked`;
    - `lane=terrain-tile-light;kind=point-light;name=diagnostic-tile-sourcelight1;localOrderKey=3;...retailOrdering=blocked`;
    - `lane=placeables-2da-light;kind=point-light;name=PaleYellow;localOrderKey=4;...retailOrdering=blocked`;
    - `lane=progfx-type4-light-request;kind=progfx-type4-request-not-pointlight;name=LightBlue5m;localOrderKey=25020;...retailOrdering=blocked`.

Current remaining cross-lane blocker:

- Local runtime coverage for every required lane is now proven in one fixture.
- Still blocked: exact retail active-light ordering between tile/placeable/MDL/item/ProgFX lanes. The fixture proves Aurora Web lane coverage and local diagnostic ordering, not retail precedence; closing this still needs a receiver-proven indirect LightManager dispatch/callsite or a retail/toolset oracle scene.

## Follow-up loop - remaining blocker oracle cases and ProgFX Type 4 tie policy - 2026-07-05

Question: can the remaining light/shadow blockers be made machine-checkable, and can the local ProgFX Type 4 scheduler stop using row/label as a fake tie breaker?

Implementation:

- `remainingRetailBlockers[*].oracleCases` is now part of the backend/frontend API contract. Each remaining blocker carries explicit oracle case ids, required artifacts, current evidence, blocker text, and an acceptance gate.
- Retail shadow-volume blocker now requires:
  - `shadowvol-campfire-pixel-geometry-opacity`;
  - `shadowvol-retail-gl-state-order`.
- Retail cross-lane blocker now requires:
  - `cross-lane-all-required-lanes-retail-precedence`;
  - `lightmanager-vtable-receiver-dispatch`.
- ProgFX Type 4 blocker now requires:
  - `progfx-type4-priority-tie-and-zero-policy`;
  - `progfx-type4-proximity-threshold`;
  - `progfx-type4-attach-to-scene-restore`;
  - `progfx-type4-blind-vision-pixels`.
- `AreasModePanel` now shows the oracle-case count per remaining blocker, so the UI no longer displays a plain `blocked` without the concrete retail cases behind it.
- `workspaceSceneLightDiagnostics` now evaluates ProgFX Type 4 equal-priority requests using the docs-backed policy that equal `Param4` priorities take the last-applied request, not row/label ordering.
- The same diagnostic now exposes:
  - `nonPointLightRequestSchedulerPriorityTiePolicyStatus=docs-backed-progfx-type4-param4-equal-priority-last-applied-retail-dataflow-blocked`;
  - `nonPointLightRequestSchedulerPriorityTieGroupCount`;
  - `nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount`;
  - `priorityZeroPolicy=docs-backed-progfx-type4-param4-zero-always-applies-retail-dataflow-blocked`.
- `VfxFixtureRunner` forwards those scheduler fields to `data-*` attributes, making future CDP frame JSON proof possible.

Source notes:

- Decompiled source still does not expose ProgFX Type 4 runtime scheduler strings beyond `visualeffects.2da` loader evidence: `C:/Projects/New Folder/export/decompiled_all.c:348244`.
- Local decompilation search still shows `FUN_00a4128c` only as the LightManager insertion function definition, not a direct recovered common lane call-site.
- `nwn.wiki` `progfx.2da` Type 4 documentation (last updated 2026-02-18) is the current docs source for Param4 lower-value priority, priority `0` always applies, same-priority last-applied behavior, Param5 proximity suppression, and Param6 attach-to-scene removal while active: https://nwn.wiki/spaces/NWN1/pages/38175071/progfx.2da

Verification:

- Backend lighting evidence tests passed: `npx.cmd jest --config ./jest.unit.config.js test/unit/area-lighting-evidence.spec.ts --runInBand` -> `1 passed, 4 tests`.
- Frontend API/panel tests passed: `npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run` -> `2 passed, 10 tests`.
- Frontend ProgFX/runtime diagnostic tests passed: `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run` -> `3 passed, 27 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- ProgFX Type 4 scheduler tie-policy proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-priority-tie-zero-runtime-probe-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-priority-tie-zero-runtime-probe-2026-07-05.frame.json`
  - `fixtureCanvasNonblank=true`, `fixtureObjectPixels=5969`.
  - `progFxType4RequestRowIds=333|304|308|328`.
  - `progFxType4RequestLabels=LightAreaBlackout|LightBlue5m|LightYellow5m|LightDarkvision`.
  - `progFxType4RequestPriorities=13|20|20|51`.
  - `fixtureSceneNonPointLightRequestSchedulerPriorityWinner=row=333;label=LightAreaBlackout;...priority=13`.
  - `fixtureSceneNonPointLightRequestSchedulerPriorityTiePolicyStatus=docs-backed-progfx-type4-param4-equal-priority-last-applied-retail-dataflow-blocked`.
  - `fixtureSceneNonPointLightRequestSchedulerPriorityTieGroupCount=1`.
  - `fixtureSceneNonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount=0`; vanilla retail rows used in this fixture do not include a priority-0 row, so priority-0 behavior remains unit-covered/docs-backed and still needs a custom retail/toolset oracle case.
  - `fixtureSceneNonPointLightRequestSchedulerSamples` includes `priorityTieGroups=1`, `priorityZeroPolicy=docs-backed-progfx-type4-param4-zero-always-applies-retail-dataflow-blocked`, `lightRequests=2`, `visionRequests=2`.

Current remaining blockers:

- Shadow-volume: exact retail/toolset pixel geometry, opacity, blend/depth/stencil ordering, and projection parity remain open until retail/toolset oracle artifacts exist.
- Cross-lane: local all-lane coverage is proven, but exact retail active-light precedence between tile/placeable/MDL/item/ProgFX lanes remains open until receiver-proven LightManager dispatch/callsite evidence or a retail/toolset oracle scene exists.
- ProgFX Type 4: local docs-backed priority tie/zero diagnostics are implemented, but exact retail owner grouping, proximity distance threshold, attach-to-scene restore timing, and Blind Vision pixel mutation remain open until retail/toolset oracle cases are captured.

## Follow-up loop - ShadowSize zero audit parity - 2026-07-05

Question: does the area lighting evidence treat `ShadowSize=0` as the Aurora small-shadow lane, or does it accidentally drop it as missing shadow data?

Finding:

- Frontend/rendering already maps `ShadowSize=0 -> Fx_Shadow_S`, `ShadowSize=2 -> Fx_Shadow_L`, and every other present value to `Fx_Shadow_M`.
- Backend `collectCatalogShadowDiagnosticEntries` incorrectly filtered `shadowSize <= 0`, so `ShadowSize=0` templates were omitted from `shadowDiagnostic.catalogShadowSizeTemplates` and from the sampled `catalog-placeable-shadow-size` entries.

Implementation:

- `backend/src/modules/areas/domain/area-lighting-evidence.ts` now only drops missing `source2daShadowSize`; `0` is preserved as a valid small-shadow entry.
- Added unit coverage in `backend/test/unit/area-lighting-evidence.spec.ts` proving `source2daShadowSize: 0` produces:
  - `summary.shadowCatalogShadowSizeTemplates=1`;
  - `summary.shadowDiagnosticEntries=1`;
  - `shadowDiagnostic.entries[0].source=catalog-placeable-shadow-size`;
  - `shadowDiagnostic.entries[0].shadowSize=0`.

Verification:

- Backend lighting evidence tests passed: `npx.cmd jest --config ./jest.unit.config.js test/unit/area-lighting-evidence.spec.ts --runInBand` -> `1 passed, 5 tests`.

Current status:

- Closed: area-lighting evidence no longer loses valid small placeable shadows.
- Still open: exact retail/toolset shadow-volume pixel geometry, opacity, and render-state parity remain blocked by the same retail oracle requirement as above.

## Follow-up loop - fast-shadow caster size visible in runtime proof - 2026-07-05

Question: does runtime proof expose the actual `Fx_Shadow_*` caster quad size selected by `ShadowSize`, or does it mostly show the larger local stencil receiver/overlay?

Finding:

- The renderer already created the caster geometry from the selected `Fx_Shadow_*` descriptor:
  - `ShadowSize=0 -> fx_shadow_s.mdl`, source quad size `1`;
  - `ShadowSize=1/other -> fx_shadow_m.mdl`, source quad size `1.600000023841858`;
  - `ShadowSize=2 -> fx_shadow_l.mdl`, source quad size `3`.
- The caster mesh carried `placeableTwoDaFastShadowVolumeCasterSourceQuadSize`, but the root fast-shadow userData and scene diagnostics did not propagate it. Runtime samples emphasized `volumeStencilReceiverSize`, which is a local receiver surface sized for the shadow-volume preview, not the source `Fx_Shadow_*` quad.

Implementation:

- `workspacePlaceableModelPresentation.ts` now propagates:
  - `placeableTwoDaFastShadowVolumeCasterSourceQuadSize`;
  - `placeableTwoDaFastShadowVolumeCasterSourceQuadSizeSource`.
- `workspaceSceneLightDiagnostics.ts` now reads, merges, and formats those fields in:
  - `shadow.fastShadowSamples`;
  - `shadow.retailProjectionRuntimeProbeSamples`.
- `workspaceObjectMeshLayer.ts` now includes the same fields in `writePlaceableTwoDaLightRenderDiagnostics` samples.

Verification:

- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` -> `2 passed, 121 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Placeable fast-shadow source quad size proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-fast-shadow-source-quad-size-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/placeable-fast-shadow-source-quad-size-runtime-proof-2026-07-05.frame.json`
  - `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=1676`.
  - `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`.
  - `devPlaceableTwoDaLightSamples` contains `shadow=1`, `shadowLane=medium`, `fastShadowModel=fx_shadow_m.mdl`, `fastShadowQuadSize=1.6`, `fastShadowVolumeSourceQuadSize=1.6`, and `fastShadowVolumeSourceQuadSizeSource=...Fx_Shadow_* binary MDL emitter sizeStart/sizeEnd...`.
  - `devSceneShadowRuntimeProbeStatus=source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked`.
  - `devSceneShadowRuntimeProbeSamples` contains `sourceQuadSize=1.6`, alongside `receiverOpacity=0.156`, `passes=back:zpass,front:zpass,back:zfail,front:zfail`, and `retailParity=blocked`.

Current status:

- Closed: runtime proof can now distinguish source-backed `ShadowSize` caster geometry from the local receiver/overlay dimensions.
- Still open: retail/toolset pixel geometry and opacity parity still require oracle screenshots/captures.

## Follow-up loop - ProgFX Type 4 Param5/Param6 local scheduler observations - 2026-07-05

Question: after preserving ProgFX Type 4 `Param5` proximity and `Param6` attach-to-scene flags, does runtime proof show enough scene context to evaluate the local scheduler case, or only the raw table booleans?

Finding:

- `workspaceSceneLightDiagnostics` already counted `Param5` proximity candidates and `Param6` attach-to-scene requests, but did not expose the request world position, nearest observed light/request, or the number of live `THREE.PointLight` objects that an attach-to-scene request would locally suppress.
- That made the scheduler proof too abstract for the remaining oracle cases: it could say `Param5=true`, but not show which scene light was the nearest candidate.

Implementation:

- `workspaceSceneLightDiagnostics.ts` now records rounded world positions for:
  - source-backed `THREE.PointLight` samples;
  - ProgFX Type 4 non-point light/vision requests.
- `auroraVfxCanonicalRenderer.ts` now offsets multi-request ProgFX Type 4 diagnostic markers in a small local ring, so runtime scheduler proof can show non-zero request-to-request distances. This is explicitly marked as local diagnostic placement, not retail scheduler position parity.
- The ProgFX Type 4 scheduler sample now adds:
  - `sceneAttachmentSuppressedPointLights=<count>`;
  - `proximityCandidate=...requestPosition=...nearestKind=...nearestLane=...nearestName=...nearestPosition=...nearestDistance=...threshold=unknown-retail-distance-blocked`.
- The implementation remains diagnostics-only. It does not mutate `THREE.PointLight.visible` or claim retail restore timing.

Verification:

- Frontend focused diagnostics test passed: `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` -> `1 passed, 8 tests`.
- Frontend VFX/App scheduler proof tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` -> `4 passed, 37 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- ProgFX Type 4 Param5/Param6 local scheduler proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-param5-param6-local-scheduler-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-param5-param6-local-scheduler-runtime-proof-2026-07-05.frame.json`
  - `fixtureRenderStatus=rendered`, `fixtureCanvasNonblank=true`, `fixtureObjectPixels=5988`.
  - `fixtureSceneNonPointLightRequestSchedulerPriorityWinner=row=333;label=LightAreaBlackout;lane=progfx-type4-vision-request;worldPosition=0.18,0,0;priority=13;...`.
  - `fixtureSceneNonPointLightRequestSchedulerSamples` contains `sceneAttachmentRequests=1`, `sceneAttachmentWouldSuppressPointLights=false`, `sceneAttachmentSuppressedPointLights=0`, `proximitySuppressionCandidates=1`.
  - The same scheduler sample contains `proximityCandidate=row=328;label=LightDarkvision;requestPosition=0,-0.18,0;nearestKind=progfx-type4-request;nearestLane=progfx-type4-vision-request;nearestName=LightAreaBlackout;nearestPosition=0.18,0,0;nearestDistance=0.2546;threshold=unknown-retail-distance-blocked`.
  - No point-light mutation is claimed: `fixtureScenePointLightRetailOrderingRuntimeProbePointLightSampleCount=0`, `fixtureSceneNonPointLightRequestSchedulerWouldSuppressScenePointLights=false`, and `localOnlyNotRetailEvidence=true`.

Current status:

- Closed: runtime/dataset proof can now show the concrete local scene context for `Param5` and `Param6`, including the nearest light candidate and attach-to-scene affected point-light count.
- Still open: exact retail proximity distance threshold, owner grouping, attach-to-scene restore timing, and Blind Vision pixel mutation still require retail/toolset oracle or deeper client scheduler data-flow recovery.

## Follow-up loop - LightManager score inputs visible in cross-lane runtime proof - 2026-07-05

Question: does cross-lane runtime proof expose the recovered `+0x84` LightManager score inputs, or only the final score/rank?

Finding:

- `auroraLightManagerPreview` already preserves `RetailScoreSourceRadius`, `RetailScoreMultiplier`, `RetailScoreField0x70`, `RetailScoreRuntimeExtent`, `RetailScoreRangeTerm`, formula, source, proof status, sort direction, and fallback.
- `workspaceSceneLightDiagnostics` only showed the final `retailScore`, priority, preview distance, range term, formula, proof, sort, and fallback. That made the cross-lane proof less auditable than the renderer state.
- The CDP capture script also skipped `data-scene-point-light-samples`, so the full point-light sample string was present in the DOM but missing from saved frame JSON.

Implementation:

- `workspaceSceneLightDiagnostics.ts` now formats these score input fields in point-light samples:
  - `retailScoreSourceRadius`;
  - `retailScoreMultiplier`;
  - `retailScoreField0x70`;
  - `retailScoreRuntimeExtent`;
  - `retailScoreSource`.
- `VfxFixtureRunner.tsx` now seeds the cross-lane fixture with score input provenance for tile, placeable, source-MDL, and item-property lanes.
- `backend/scripts/capture-vfx-app-route-cdp.mjs` now stores:
  - `fixtureScenePointLightSamples`;
  - `fixtureSceneNonPointLightRequestSamples`.

Verification:

- Frontend focused tests passed: `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run` -> `2 passed, 14 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Cross-lane LightManager score-input proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-lightmanager-score-inputs-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-lightmanager-score-inputs-runtime-proof-2026-07-05.frame.json`
  - `fixtureRenderStatus=rendered`, `fixtureCanvasNonblank=true`, `fixtureObjectPixels=22271`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeStatus=local-cross-lane-runtime-probe-observed-required-lanes-retail-ordering-still-blocked`.
  - `fixtureScenePointLightSamples` now contains, for example, item-property lane `retailScore=60`, `retailScorePriority=0`, `retailScorePreviewDistance=2.5`, `retailScoreSourceRadius=13.3`, `retailScoreMultiplier=1`, `retailScoreField0x70=0`, `retailScoreRuntimeExtent=1`, `retailScoreRangeTerm=20`, and `retailScoreSource=C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850 writes LightManager score +0x84; 865731-865735 FUN_00a41694 sorts ascending`.
  - The same JSON still reports `localOnlyNotRetailEvidence=true`; this proves local score input propagation, not retail lane precedence.

Current status:

- Closed: cross-lane runtime proof now exposes the recovered score-input fields and saves them in frame JSON.
- Still open: exact retail active-light precedence between tile/placeable/MDL/item/ProgFX lanes still requires a common insertion callsite, receiver-proven vtable dispatch, or retail/toolset oracle.

## Follow-up loop - shadow-volume retail face/op table visible in runtime proof - 2026-07-05

Question: does the live placeable shadow-volume proof show the recovered retail `glStencilOpSeparate` face/op table, or only a compressed local `slot0 0/0/3` shorthand?

Finding:

- The source evidence already mapped the shadow-volume calls and Toolset GL tables:
  - `C:/Projects/New Folder/export/decompiled_all.c:913986-913987` sets `FUN_00a78344(0,0,0,3)` and `FUN_00a78344(1,0,0,4)`.
  - `C:/Projects/New Folder/export/decompiled_all.c:914032-914033` switches to `FUN_00a78344(0,0,4,0)` and `FUN_00a78344(1,0,3,0)`.
  - Toolset `.data` maps face slot `0=GL_FRONT/0x404`, face slot `1=GL_BACK/0x405`, op slot `0=GL_KEEP/0x1e00`, op slot `3=GL_INCR/0x1e02`, and op slot `4=GL_DECR/0x1e03`.
- Runtime/userData proof still exposed a compressed sequence: `FUN_00a78344 slot0 0/0/3 + slot1 0/0/4...`, which was source-backed but too hard to audit from screenshots/JSON.

Implementation:

- `auroraShadowVolumeGeometry.ts` now exports:
  - `AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_TABLE`;
  - `AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_TABLE`;
  - `AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE`;
  - formatted summaries for the face/op table and full z-pass/z-fail call sequence.
- `createAuroraShadowVolumeStencilVolumeMaterial` now stores the retail call, face slot, GL face constant, fail/zfail/zpass GL ops, and full sequence sample in material userData.
- `workspacePlaceableModelPresentation.ts` propagates the retail face/op table, full op sequence, and source string to placeable fast-shadow root userData.
- `workspaceSceneLightDiagnostics.ts` now formats those fields in both:
  - `shadow.fastShadowSamples`;
  - `shadow.retailProjectionRuntimeProbeSamples`.

Verification:

- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` -> `3 passed, 129 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Shadow-volume stencil face/op runtime proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-stencil-face-op-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-stencil-face-op-runtime-proof-2026-07-05.frame.json`
  - `devCanvasNonblank=true`, `devObjectPixels=1676`.
  - `devSceneShadowRuntimeProbeStatus=source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked`.
  - `devSceneShadowRuntimeProbeSamples` contains `retailFaceOpTable=faces=slot0=GL_FRONT/0x404,slot1=GL_BACK/0x405;ops=slot0=GL_KEEP/0x1e00,slot3=GL_INCR/0x1e02,slot4=GL_DECR/0x1e03`.
  - The same runtime sample contains the full call mapping, including `pass=front:zpass,call=FUN_00a78344(0,0,0,3),face=GL_FRONT/0x404,...zpass=GL_INCR/0x1e02` and `pass=back:zfail,call=FUN_00a78344(1,0,3,0),face=GL_BACK/0x405,...zfail=GL_INCR/0x1e02`.
  - `retailParity=blocked` remains explicit.

Current status:

- Closed: runtime proof now shows the decompilation-backed retail face/op table and exact z-pass/z-fail call mapping instead of an opaque slot shorthand.
- Still open: retail/toolset pixel geometry, opacity, and blend/depth/stencil state ordering parity remain oracle-bound.

## Follow-up loop - shadow-volume branch-aware bucket/op ordering - 2026-07-05

Question: does the shadow-volume proof preserve the branch-dependent retail bucket order around `FUN_00a878f8`, or does it flatten the path into a misleading single `0xd/0xe/0xb/0xc` list?

Finding:

- The previous runtime proof exposed shader names and the bucket inventory, but the ordering summary was flattened.
- Re-reading `C:/Projects/New Folder/export/decompiled_all.c:913922-914043` shows two branch cases:
  - `local_29=false`: starts bucket `0xd` under z-pass stencil ops, then switches to z-fail and processes `0xe`.
  - `local_29=true`: processes `0xd` and `0xb` under z-pass stencil ops, then switches to z-fail and processes `0xe` and `0xc`.
- The z-fail switch is still the recovered `FUN_00a78344(0,0,4,0)` and `FUN_00a78344(1,0,3,0)` at `914032-914033`.

Implementation:

- `auroraShadowVolumeGeometry.ts` now exports:
  - `AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASES`;
  - `AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASE_SOURCE`;
  - `AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASE_PROOF_STATUS`.
- `AURORA_SHADOW_VOLUME_RENDER_PATH_SOURCE` now describes the branch-dependent bucket order instead of a single flat order.
- `workspacePlaceableModelPresentation.ts` stores branch-aware bucket phases on the fast-shadow root and volume caster node.
- `workspaceSceneLightDiagnostics.ts` formats these fields in:
  - `shadow.fastShadowSamples` as `volumeBucketPhases`, `volumeBucketPhaseSource`, `volumeBucketPhaseProof`;
  - `shadow.retailProjectionRuntimeProbeSamples` as `bucketPhases`, `bucketPhaseSource`, `bucketPhaseProof`.

Verification:

- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` -> `3 passed, 129 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Shadow-volume branch bucket/op order proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-branch-bucket-op-order-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-branch-bucket-op-order-runtime-proof-2026-07-05.frame.json`
  - `devCanvasNonblank=true`, `devObjectPixels=1676`.
  - `devSceneShadowRuntimeProbeStatus=source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked`.
  - `devSceneShadowRuntimeProbeSamples` contains `bucketPhases=case=local_29_false;condition=current-light-branch-not-active;sequence=0xd:zpass->0xe:zfail,case=local_29_true;condition=param_1+0x34==DAT_00cc4350 and differs from scene +0x108/+0x68;sequence=0xd:zpass->0xb:zpass->0xe:zfail->0xc:zfail`.
  - The same sample contains `bucketPhaseSource=C:/Projects/New Folder/export/decompiled_all.c:913922-913928...914021-914043...914032-914033` and keeps `retailParity=blocked`.

Current status:

- Closed: runtime proof now preserves the recovered branch-aware bucket/op order instead of flattening bucket inventory into an implied total order.
- Still open: exact retail/toolset output pixels, projection geometry, opacity, and complete GL blend/depth/stencil state parity still require oracle capture or deeper GL-wrapper mapping beyond the current decompilation anchors.

## Follow-up loop - shadow-volume render-state wrapper call sequence - 2026-07-05

Question: can the current runtime proof expose the recovered retail wrapper-call ordering around the shadow-volume draw path without pretending that the exact wrapped GL caps/factors are fully recovered?

Finding:

- Re-reading `C:/Projects/New Folder/export/decompiled_all.c:913929-914027` shows the call sequence around the shadow-volume traversal:
  - `FUN_00a7818c(3)` before the traversal;
  - lazy `FUN_00a780f0()` before the first caster block;
  - per-caster transform upload through `FUN_00a785d4`;
  - shader bind through `FUN_00a788b0(DAT_00d0247c)`;
  - uniform uploads through `FUN_00a78994(0)` and `FUN_00a78980(1,fVar2)`;
  - draw wrapper through `FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68)`;
  - lazy `FUN_00a780e8()` and post `FUN_00a7816c(3)` after traversal.
- `C:/Projects/New Folder/export/decompiled_all.c:904063-904075` wraps `FUN_00a780e8/FUN_00a780f0`.
- `C:/Projects/New Folder/export/decompiled_all.c:904126-904147` wraps `FUN_00a7816c/FUN_00a7818c`.
- The call ordering is source-backed; exact wrapped GL cap/factor semantics are still not fully mapped.

Implementation:

- `auroraShadowVolumeGeometry.ts` now exports:
  - `AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_SEQUENCE`;
  - `AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_SOURCE`;
  - `AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_PROOF_STATUS`.
- `workspacePlaceableModelPresentation.ts` stores the render-state call sequence/source/proof status on both the fast-shadow root and volume caster node.
- `workspaceSceneLightDiagnostics.ts` exposes the sequence in runtime samples as `stateCalls`, `stateCallSource`, and `stateCallProof`.

Verification:

- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` -> `3 passed, 129 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Shadow-volume render-state call sequence proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-render-state-call-sequence-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-render-state-call-sequence-runtime-proof-2026-07-05.frame.json`
  - `devCanvasNonblank=true`, `devObjectPixels=1676`.
  - `devSceneShadowRuntimeProbeStatus=source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked`.
  - `devSceneShadowRuntimeProbeSamples` contains `stateCalls=pre=FUN_00a7818c(3)...lazyBegin=FUN_00a780f0()...perCaster=FUN_00a788b0(DAT_00d0247c)...draw=FUN_00a78128(...)...post=FUN_00a7816c(3)`.
  - The same sample contains `stateCallSource=C:/Projects/New Folder/export/decompiled_all.c:913929...913995-914015...914024-914027...904063-904075...904126-904147`.
  - `stateCallProof=source-backed-shadowvol-render-state-wrapper-call-sequence-slot3-gl-cull-face-exposed-wrapped-state-factor-parity-blocked`.

Current status:

- Closed: runtime proof now exposes the recovered shadow-volume wrapper-call ordering around shader bind, uniform upload, draw, and begin/end/restore calls.
- Still open: exact retail/toolset output pixels, projection geometry, opacity, and complete wrapped render-state/factor parity remain oracle/disassembly-bound.

## Follow-up loop - shadow-volume render-state wrapper semantics - 2026-07-05

Question: can the wrapper-call proof be narrowed further by exposing what the recovered wrappers do, including the GL cap behind state slot `3`, without inventing any still-unrecovered state factors?

Finding:

- `C:/Projects/New Folder/export/decompiled_all.c:898307-898358` shows `FUN_00a6ef90(param_1)` setting `_DAT_00d01c0c` state bits; for case `3`, it calls `glEnable()`.
- `C:/Projects/New Folder/export/decompiled_all.c:898365-898416` shows `FUN_00a6f0bc(param_1)` clearing `_DAT_00d01c0c` state bits; for case `3`, it calls `glDisable()`.
- A local PE/jump-table read of `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe` maps the `FUN_00a6ef90` and `FUN_00a6f0bc` case-`3` entries through jump tables `0xa6efc4` / `0xa6f0f2`; both case blocks push `0x0b44` before the GL call, which is `GL_CULL_FACE`.
- `C:/Projects/New Folder/export/decompiled_all.c:896387-896475` shows `FUN_00a6c44c/FUN_00a6c520` copying and pushing/popping `0x40` byte render-state blocks.
- `C:/Projects/New Folder/export/decompiled_all.c:898458-898510` shows `FUN_00a6f2b4` cache-checking separate front/back stencil op slots before the `PTR_DAT_00d3dd6c` `glStencilOpSeparate` dispatch.
- The exact GL capability enum behind state slot `3` is now recovered as `GL_CULL_FACE/0x0b44`; full wrapped state-factor parity still remains separate.

Implementation:

- `auroraShadowVolumeGeometry.ts` now exports:
  - `AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SEMANTICS`;
  - `AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SOURCE`;
  - `AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_PROOF_STATUS`.
- `workspacePlaceableModelPresentation.ts` propagates the wrapper semantics/source/proof status to the fast-shadow root and volume caster userData.
- `workspaceSceneLightDiagnostics.ts` exposes the new proof fields as:
  - `volumeStateWrapper`, `volumeStateWrapperSource`, `volumeStateWrapperProof` in fast-shadow samples;
  - `stateWrapper`, `stateWrapperSource`, `stateWrapperProof` in runtime shadow-volume probe samples.

Verification:

- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts --run` -> `3 passed, 129 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Shadow-volume state wrapper GL cull-face proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-state-wrapper-gl-cull-face-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-state-wrapper-gl-cull-face-runtime-proof-2026-07-05.frame.json`
  - `devCanvasNonblank=true`, `devObjectPixels=1676`.
  - `devSceneShadowRuntimeProbeStatus=source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked`.
  - `devSceneShadowRuntimeProbeSamples` contains `stateWrapper=slot3=FUN_00a7818c(3)->FUN_00a6f0bc(3)->glDisable(GL_CULL_FACE/0x0b44);stateBit=_DAT_00d01c0c bit3 cleared,...slot3Restore=FUN_00a7816c(3)->FUN_00a6ef90(3)->glEnable(GL_CULL_FACE/0x0b44)...stateStack=FUN_00a780f0()->FUN_00a6c520...stateRestore=FUN_00a780e8()->FUN_00a6c44c...stencilCache=FUN_00a6f2b4...`.
  - The same runtime sample contains `stateWrapperSource=C:/Projects/New Folder/export/decompiled_all.c:898307-898358...898365-898416...nwtoolset.exe x86 jump tables 0xa6efc4/0xa6f0f2 map case 3 to push 0x0b44...896387-896475...898458-898510`.
  - `stateWrapperProof=source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-and-stencil-cache-exposed-other-state-parity-blocked`.

Current status:

- Closed: wrapper semantics are no longer just a call list; runtime proof now exposes slot `3` as `GL_CULL_FACE/0x0b44`, plus render-state stack behavior and stencil-op cache behavior.
- Still open: exact retail/toolset output pixels, projection geometry, opacity, and complete wrapped render-state/factor parity remain oracle/disassembly-bound.

## Follow-up loop - shadow-volume render-state wrapper audit-script proof - 2026-07-05

Question: can the `GL_CULL_FACE/0x0b44` wrapper finding be made repeatable by the repo audit script instead of relying on a one-off manual PE/jump-table read?

Finding:

- `backend/scripts/audit-retail-light-function-disasm.py` now decodes the `nwtoolset.exe` render-state jump tables at `0xa6efc4` and `0xa6f0f2`.
- The decoder reads slot `3`, follows the case blocks, verifies `push 0x0b44`, and checks the relative-call targets:
  - disable path: case `0xa6f176` -> `callTargetVa=0xb9be5e`;
  - enable path: case `0xa6f048` -> `callTargetVa=0xb9be70`.
- The script now emits `renderStateWrapperEvidence proofStatus=source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-bracket-mapped` and nested `toolsetCapabilityEvidence proofStatus=source-backed-toolset-binary-render-state-slot3-gl-cull-face-mapped`.
- Full real-source run reports:
  - `proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-and-render-state-slot3-mapped-retail-parity-blocked`;
  - `remainingBlockedSemantics=[retail caster paired-vertex/six-index buffer fill is source-backed, but active renderer integration is not proven by this extractor; no pixel/geometry parity capture against retail shadow-volume output]`.

Implementation:

- Added cap-name table and render-state jump-table decoder to `backend/scripts/audit-retail-light-function-disasm.py`.
- Added source-hit collection for:
  - `896387-896475` render-state stack push/pop (`FUN_00a6c44c/FUN_00a6c520`);
  - `898307-898416` wrapper enable/disable (`FUN_00a6ef90/FUN_00a6f0bc`);
  - `913929-914027` shadow-volume wrapper sequence (`FUN_00a7818c/FUN_00a780f0/FUN_00a780e8/FUN_00a7816c`).
- Updated backend Areas evidence and frontend scene diagnostics to report the new combined status:
  - `source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-and-render-state-slot3-mapped-retail-parity-blocked`;
  - `source-backed-shadowplane-shadowvol-shader-caster-path-zpass-zfail-stencil-render-state-slot3-preview-active-retail-face-op-mapped-parity-blocked`.
- Updated the stale call-sequence proof status to:
  - `source-backed-shadowvol-render-state-wrapper-call-sequence-slot3-gl-cull-face-exposed-wrapped-state-factor-parity-blocked`.

Verification:

- Backend targeted tests passed: `npm.cmd run test:unit -- test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts` -> `2 passed, 11 tests`.
- Backend build passed: `npm.cmd run build`.
- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run` -> `6 passed, 145 tests`.
- Frontend follow-up targeted tests passed after the stale proof-status cleanup: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run` -> `4 passed, 135 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Shadow-volume state wrapper audit-script proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-state-wrapper-audit-script-runtime-proof-2026-07-05-final.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-state-wrapper-audit-script-runtime-proof-2026-07-05-final.frame.json`
  - `devCanvasNonblank=true`, `devObjectPixels=1676`.
  - `devSceneShadowRuntimeProbeStatus=source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked`.
  - `devSceneShadowRuntimeProbeSamples` contains `stateCallProof=source-backed-shadowvol-render-state-wrapper-call-sequence-slot3-gl-cull-face-exposed-wrapped-state-factor-parity-blocked`.
  - The same sample contains `stateWrapper=slot3=FUN_00a7818c(3)->FUN_00a6f0bc(3)->glDisable(GL_CULL_FACE/0x0b44)` and `slot3Restore=FUN_00a7816c(3)->FUN_00a6ef90(3)->glEnable(GL_CULL_FACE/0x0b44)`.

Current status:

- Closed: render-state slot `3` capability mapping is now repeatable in the audit script, propagated to backend/frontend proof strings, covered by tests, and visible in runtime capture.
- Still open: exact retail/toolset shadow-volume pixel geometry, projection/opacity parity, and complete wrapped render-state/factor ordering beyond the recovered slot-3 `GL_CULL_FACE` bracket.

## Follow-up loop - shadow-volume shader/uniform wrapper semantics - 2026-07-05

Question: does the shadow-volume path expose the retail shader bind and uniform writes instead of only saying that `vs_shadowvol/fs_shadowvol` exist?

Finding:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `shadowVolumeProjectionEvidence.shaderUniformEvidence`.
- The evidence reports `proofStatus=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed`.
- The recovered call chain is:
  - `913999` `FUN_00a785d4(light-matrix-pointer)` -> `FUN_00a6dda4()` -> `FUN_00a482a8(0xe320d0,param_1)`;
  - `914001` `FUN_00a788b0(DAT_00d0247c)` -> `FUN_00a74fd0`;
  - `914002` `FUN_00a78994(0)` -> `FUN_00a7278c`;
  - `914012` `FUN_00a78980(1,fVar2)` -> `FUN_00a72764`.
- The wrapper/source ranges are preserved in the evidence string:
  - `904560-904969` shader/uniform helper wrappers;
  - `897399-897403` matrix source update;
  - `902170-902176` shader program bind/store;
  - `900870-900884` vec4 uniform copy;
  - `900852-900857` scalar uniform write.

Implementation:

- Backend Areas evidence now includes `shaderUniformEvidence proofStatus=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed` in `RETAIL_SHADOW_VOLUME_PROJECTION_SOURCE`.
- Frontend scene diagnostics now carries the same source-backed shader/uniform proof through `AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SOURCE`.
- Runtime diagnostics already expose the lower-level fields as:
  - `shaderUniforms`;
  - `shaderUniformSource`;
  - `shaderUniformProof`.
- The new high-level source string also includes the exact decompilation line anchors and the helper wrapper ranges above, so the frontend data attributes and Areas evidence do not only report a vague shader name.

Verification:

- Backend targeted tests passed: `npm.cmd run test:unit -- test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts` -> `2 passed, 11 tests`.
- Frontend targeted tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run` -> `6 passed, 145 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Shadow-volume shader/uniform proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-shader-uniform-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-shader-uniform-runtime-proof-2026-07-05.frame.json`
  - `devCanvasNonblank=true`, `devObjectPixels=1676`.
  - `devSceneShadowRuntimeProbeSamples` contains `shaderUniforms=transform=FUN_00a785d4(light-matrix-pointer)->FUN_00a6dda4()->FUN_00a482a8(0xe320d0,param_1);counter=DAT_00e34710`.
  - The same sample contains `shaderBind=FUN_00a788b0(DAT_00d0247c)->FUN_00a74fd0`, `uniformSlot0=FUN_00a78994(0)->FUN_00a7278c`, and `uniformSlot1=FUN_00a78980(1,fVar2)->FUN_00a72764`.
  - `shaderUniformProof=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed-retail-pixel-parity-blocked`.

Current status:

- Closed: shadow-volume shader bind, transform upload, vec4 uniform slot 0, and scalar uniform slot 1 are now source-backed, propagated to backend/frontend evidence strings, covered by tests, and visible in runtime capture.
- Still open: this does not prove retail/toolset pixel geometry, opacity, projection matrix visual equivalence, or the complete retail draw-state/factor ordering. Those remain separate oracle/parity blockers.

## Follow-up loop - ProgFX Type 4 local priority evaluation order observability - 2026-07-05

Question: can Aurora Web show the complete local ProgFX Type 4 priority queue instead of only exposing the winning request?

Finding:

- Retail KEY/BIF table evidence is still source-backed only for ProgFX Type 4 rows, owner phases, Param3/4/5/6 distribution, and fx_light_clr model references.
- Retail scheduler data-flow is still blocked: the current decompilation/binary audits do not recover exact owner grouping, proximity distance threshold, attach-to-scene restore timing, or vision pixel mutation behavior.
- The local diagnostic path can still be made more transparent by exposing the full docs-backed evaluation order:
  - Param4 priority ascending;
  - equal-priority tie uses local traversal order descending;
  - every emitted row explicitly carries `retailDataFlow=blocked`.

Implementation:

- `workspaceSceneLightDiagnostics.ts` now exposes:
  - `nonPointLightRequestSchedulerPriorityEvaluationOrderSource`;
  - `nonPointLightRequestSchedulerPriorityEvaluationOrder`.
- `writeAuroraScenePointLightDiagnostics` writes those fields to scene userData and DOM dataset.
- `VfxFixtureRunner.tsx` exposes:
  - `data-scene-non-point-light-request-scheduler-priority-evaluation-order-source`;
  - `data-scene-non-point-light-request-scheduler-priority-evaluation-order`.
- The multi-request fixture now reports the observed local queue for rows `333`, `308`, `304`, and `328` without promoting it to retail ordering.

Verification:

- Frontend focused tests passed: `npx.cmd vitest tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx --run` -> `2 passed, 14 tests`.
- Frontend wider light/shadow/ProgFX tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run` -> `6 passed, 145 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- ProgFX Type 4 priority evaluation order proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-priority-evaluation-order-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-priority-evaluation-order-runtime-proof-2026-07-05.frame.json`
  - `fixtureRenderStatus=rendered`, `fixtureCanvasNonblank=true`, `fixtureObjectPixels=5969`.
  - `fixtureSceneNonPointLightRequestSchedulerPriorityWinner=row=333;label=LightAreaBlackout;...priority=13`.
  - `fixtureSceneNonPointLightRequestSchedulerSamples` contains:
    - `priorityEvaluationOrderSource=local diagnostics sort ProgFX Type 4 requests by docs-backed Param4 priority ascending, then local traversal order descending for equal priority; this is not retail scheduler data-flow proof`;
    - `priorityEvaluationOrder=rank=1;inputOrder=0;row=333;label=LightAreaBlackout;...priority=13...retailDataFlow=blocked`;
    - `priorityEvaluationOrder=rank=2;inputOrder=2;row=308;label=LightYellow5m;...priority=20...retailDataFlow=blocked`;
    - `priorityEvaluationOrder=rank=3;inputOrder=1;row=304;label=LightBlue5m;...priority=20...retailDataFlow=blocked`;
    - `priorityEvaluationOrder=rank=4;inputOrder=3;row=328;label=LightDarkvision;...priority=51...retailDataFlow=blocked`.

Current status:

- Closed: local ProgFX Type 4 scheduler diagnostics now expose the complete priority evaluation queue, the tie behavior used by the local diagnostic, and the retail-dataflow blocker in runtime JSON/screenshots.
- Still open: this is not retail scheduler parity. Exact retail owner grouping, proximity threshold, attach-to-scene restore timing, Blind_Vision pixel mutation, and cross-lane insertion remain blocked until recovered from binary/decompilation or proven by retail/toolset oracle captures.

## Follow-up loop - shadow-volume local draw-state order evidence - 2026-07-05

Question: can Aurora Web expose the retail local shadow-volume draw sequence recovered from `FUN_00a878f8`, without pretending that outer blend/depth/color-mask state is fully proven?

Finding:

- `backend/scripts/audit-retail-light-function-disasm.py` now scans the decompiled `FUN_00a878f8` window at `C:/Projects/New Folder/export/decompiled_all.c:913929-914033`.
- The recovered local call order is:
  - `FUN_00a7818c(3)`;
  - `FUN_00a78344(0,0,0,3)`;
  - `FUN_00a78344(1,0,0,4)`;
  - `FUN_00a780f0()`;
  - `FUN_00a785d4(light-matrix-pointer)`;
  - `FUN_00a788b0(DAT_00d0247c)`;
  - `FUN_00a78994(0)`;
  - `FUN_00a78980(1,fVar2)`;
  - `FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68)`;
  - `FUN_00a780e8()`;
  - `FUN_00a7816c(3)`;
  - `FUN_00a78344(0,0,4,0)`;
  - `FUN_00a78344(1,0,3,0)`.
- The local shadow-volume draw order is source-backed, including slot-3 render-state disable/restore, z-pass and z-fail stencil face-op setup, shader/matrix/uniform writes, indexed draw, and shader end.
- The same local window does not contain local `glBlendFunc`, `glDepthFunc`, `glDepthMask`, `glColorMask`, or known wrapper hits. That means inherited outer render-state parity is still blocked and must be proven from callers/state setup or retail oracle captures.

Implementation:

- Backend audit output now includes `shadowVolumeProjectionEvidence.localDrawStateOrderEvidence`.
- Backend Areas evidence now includes the new local draw-state order source in `RETAIL_SHADOW_VOLUME_PROJECTION_SOURCE`.
- Frontend shadow-volume constants now expose:
  - `AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER`;
  - `AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_SOURCE`;
  - `AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_BLOCKER`;
  - `AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_PROOF_STATUS`.
- `workspacePlaceableModelPresentation.ts` propagates the source-backed order onto fast-shadow parent status and caster userData.
- `workspaceSceneLightDiagnostics.ts` emits the new fields through fast-shadow samples and retail projection runtime probe samples.

Verification:

- Backend audit passed and reports `shadowVolumeProjectionEvidence.proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked`.
- Backend targeted tests passed: `npm.cmd run test:unit -- test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts` -> `2 passed, 11 tests`.
- Backend build passed: `npm.cmd run build`.
- Frontend wider light/shadow/ProgFX tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx --run` -> `6 passed, 145 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Shadow-volume local draw-state order proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-local-draw-state-order-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-local-draw-state-order-runtime-proof-2026-07-05.frame.json`
  - `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=1676`.
  - `devPlaceableTwoDaLightFastShadowCount=1`.
  - `devSceneShadowRuntimeProbeStatus=source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked`.
  - `devSceneShadowRuntimeProbeSamples` contains `volumeLocalDrawStateOrder=pre=FUN_00a7818c(3);role=disable-render-state-slot-3-before-shadow-volume-traversal,...zfail=FUN_00a78344(1,0,3,0);role=back-face-GL_KEEP-GL_INCR-GL_KEEP`.
  - The same runtime sample contains `volumeLocalDrawStateOrderProof=source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked`.

Current status:

- Closed: the local `FUN_00a878f8` shadow-volume draw order is now source-backed, implemented in backend/frontend evidence, covered by tests/build, and visible in a runtime screenshot/JSON probe.
- Still open: retail pixel geometry, opacity, projection matrix visual equivalence, inherited outer blend/depth/color-mask state, cross-lane active-light ordering, and ProgFX Type 4 retail scheduler data-flow remain separate blockers.

## Follow-up loop - LightManager frame rebuild and cross-lane runtime proof - 2026-07-05

Question: can Aurora Web expose the recovered retail LightManager frame/update order and runtime lane coverage in one proof packet, without claiming that owner-lane precedence is solved?

Finding:

- `C:/Projects/New Folder/export/decompiled_all.c:865534-865548` recovers `FUN_00a4128c` internal LightManager insertion into the all-lights list `+0x8`, no-`0x70` list `+0x20`, and shadow/extra list `+0x14`.
- `865714-866424` recovers active-light score/sort/upload and slot cap, including `FUN_00a41850` score field `+0x84` and ascending comparator `FUN_00a41694`.
- `866325-866425` recovers `FUN_00a41e50` upload order: special manager lights `+0x70` and `+0x6c` are uploaded before sorted slots.
- The new source scan also recovers frame/update order around the manager pointer at scene offset `+0x108`:
  - `905440-905446`: `FUN_00a40f10` LightManager construction.
  - `913205-913227`: frame rebuild/reset dispatch.
  - `918249-918258`: add-light dispatch through vtable slot `+0x10`.
  - `918383-918388`: remove-light dispatch through vtable slot `+0x14`.
  - `919879-919960`: frame rebuild/sort/sample order before active-light count read.
- `866994-867087` recovers `FUN_00a42f5c` direct proximity upload order: optional headlight reservation, special `+0x70/+0x6c` uploads, all-light proximity scan from `+0x8`, then unused-slot clears.

Implementation:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits:
  - `lightManagerSourceOrderingEvidence.frameRebuildOrderingEvidence`;
  - `lightManagerSourceOrderingEvidence.directProximityUploadEvidence`;
  - proof status `source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked`.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts` includes the recovered frame/direct-proximity order in Areas lighting evidence.
- `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts` exposes the new proof source and updated cross-lane blocker.
- `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx` now writes the retail ordering proof source/status and manager blocker to fixture `data-*` attributes.
- `backend/scripts/capture-vfx-app-route-cdp.mjs` now captures those new `data-*` attributes into `.frame.json`, so runtime proof packets include both local lane coverage and the decompilation-backed LightManager evidence.

Verification:

- Backend targeted tests passed: `npm.cmd run test:unit -- test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts` -> `2 passed, 11 tests`.
- Backend build passed: `npm.cmd run build`.
- Frontend wider light/shadow/fixture tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/areas/httpAreaApiPort.test.ts tests/unit/modules/layout/AreasModePanel.lightingEvidence.test.tsx tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts --run` -> `7 passed, 159 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Cross-lane frame rebuild order proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-frame-rebuild-order-runtime-proof-2026-07-05-v3.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-frame-rebuild-order-runtime-proof-2026-07-05-v3.frame.json`
  - `fixtureRenderStatus=rendered`, `fixtureCanvasNonblank=true`, `fixtureObjectPixels=22336`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeStatus=local-cross-lane-runtime-probe-observed-required-lanes-retail-ordering-still-blocked`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount=5`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbePointLightSampleCount=4`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount=1`.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes=item-property-light|placeables-2da-light|source-mdl-light-node|terrain-tile-light`.
  - `fixtureScenePointLightRetailOrderingProofSource` contains `source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked` and `directProximityUploadEvidence proofStatus=source-backed-lightmanager-direct-proximity-upload-order`.
  - `fixtureScenePointLightRetailOrderingManagerCrossLaneCallsiteBlocker` contains `owner-lane data-flow`, so the proof packet still names the unresolved part.
  - `fixtureScenePointLightRetailOrderingRuntimeProbeLocalOrderSamples` contains all five required lanes:
    - `item-property-light`;
    - `source-mdl-light-node`;
    - `terrain-tile-light`;
    - `placeables-2da-light`;
    - `progfx-type4-light-request`.

Current status:

- Closed: frame-level LightManager construction/rebuild/add/remove/sort/sample order and direct proximity upload order are now source-backed, propagated to backend/frontend evidence, covered by tests/build, and visible in runtime JSON/screenshots.
- Still open: exact retail owner-lane precedence between terrain tile, placeables.2da, source MDL light nodes, item-property VFX lights, and ProgFX Type 4 requests is still blocked because the recovered source/binary evidence does not prove the creator-to-manager receiver data-flow or retail/toolset lane precedence.

## Follow-up loop - ProgFX Type 4 capstone-free client callgraph proof - 2026-07-05

Question: can the ProgFX Type 4 runtime proof advance without local Capstone, dumpbin, llvm-objdump, or objdump, while keeping the remaining retail scheduler semantics explicitly blocked?

Finding:

- The available source-only decompilation still loads `visualeffects.2da` at `C:/Projects/New Folder/export/decompiled_all.c:348244`, but it does not expose the client-side ProgFX Type 4 scheduler for `Param3/Param4/Param5/Param6`.
- The new capstone-free `nwmain.exe` scanner follows relative `call rel32` targets and now proves the client visual-effect receive/render path far enough to remove the old "missing Capstone" blocker:
  - `clientVisualEffectReceiveRenderEvidence.proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked`;
  - `messageDispatchChain.proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain`;
  - `clientKnownFunctionCallgraph.proofStatus=source-backed-capstone-free-client-vfx-message-owner-loader-callgraph`;
  - `missingExpectedDirectCallTargets=[]`.
- The capstone-free callgraph proves message dispatch, VFX loader/object construction, and object looping-VFX attach/remove slots, but still does not prove the ProgFX Type 4 parameter scheduler data-flow:
  - `clientVisualEffectSchedulerDataFlowProofStatus=blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow`.

Implementation:

- `backend/scripts/audit-retail-light-function-disasm.py` now includes capstone-free client VFX callgraph scanners:
  - `scan_direct_calls_in_pdata_function`;
  - `scan_client_vfx_message_chain_capstone_free`;
  - `scan_client_vfx_known_function_callgraph_capstone_free`;
  - `scan_client_visual_effect_receive_render_evidence_capstone_free`.
- `backend/src/modules/vfx/domain/aurora-vfx-render-contract.ts` and `backend/src/modules/areas/domain/area-lighting-evidence.ts` now include the capstone-free client callgraph proof in their ProgFX Type 4 scheduler evidence strings.
- `frontend/src/modules/vfx/dev/vfxFixturePayloads.ts` now exposes the same proof in the Type 4 fixture payloads, alongside the old direct-call target summary as a legacy/narrower blocker.
- `frontend/tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts` now asserts the new capstone-free proof status, callgraph proof, and remaining scheduler blocker.

Verification:

- Real `nwmain.exe` audit extract reports:
  - `proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked`;
  - `messageChain=source-backed-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain`;
  - `vtable=source-backed-client-object-looping-vfx-vtable-add-remove-slots`;
  - `callgraph=source-backed-capstone-free-client-vfx-message-owner-loader-callgraph`;
  - `missing=[]`.
- Backend targeted tests passed: `npm.cmd run test:unit -- test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts test/unit/aurora-vfx-render-contract.spec.ts` -> `3 passed, 31 tests`.
- Frontend targeted VFX/light fixture tests passed: `npx.cmd vitest tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/areas/httpAreaApiPort.test.ts --run` -> `6 passed, 160 tests`.
- Frontend TypeScript check passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- ProgFX Type 4 capstone-free client callgraph proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-capstone-free-client-callgraph-runtime-proof-2026-07-05-v2.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-capstone-free-client-callgraph-runtime-proof-2026-07-05-v2.frame.json`
  - `fixtureRenderStatus=rendered`, `fixtureCanvasNonblank=true`, `fixtureObjectPixels=5982`.
  - `fixtureRenderedDrawParticles=4`, `fixtureRenderedVertices=24`.
  - `progFxType4RowId=333`, `progFxType4Label=LightAreaBlackout`, `progFxType4Animation=Blind_Vision`, `progFxType4AnimationKind=vision`.
  - `progFxType4RequestCount=4`.
  - `progFxType4RequestRowIds=333|304|308|328`.
  - `progFxType4RequestLabels=LightAreaBlackout|LightBlue5m|LightYellow5m|LightDarkvision`.
  - `progFxType4RequestPriorities=13|20|20|51`.
  - `progFxType4RequestLightCount=2`, `progFxType4RequestVisionCount=2`.
  - `progFxType4RequestSceneAttachmentCount=1`, `progFxType4RequestProximitySuppressionCount=1`.
  - `fixtureSceneNonPointLightRequestSchedulerStatus=docs-backed-progfx-type4-policy-diagnostic-retail-scheduler-dataflow-blocked`.
  - `fixtureSceneNonPointLightRequestSchedulerPriorityTieGroupCount=1`.
  - `fixtureSceneNonPointLightRequestSchedulerProximitySuppressionCandidateCount=1`.
  - The runtime proof source contains all three new capstone-free proof markers and the remaining scheduler blocker.

Current status:

- Closed: the old "need Capstone to prove client VFX callgraph" gap is now closed with a capstone-free binary scanner and runtime proof packet.
- Still open: exact ProgFX Type 4 `Param4` priority tie retail order, `Param5` proximity threshold, `Param6` attach-to-scene restore timing, `Blind_Vision`/`Dark_Vision` pixel mutation data-flow, exact cross-lane owner precedence, and retail shadow-volume visual parity remain unresolved.

## Follow-up loop - shadow-volume blend/depth/color-mask wrapper and immediate-caller proof - 2026-07-05

Question: can the inherited render-state blocker be narrowed with source-backed wrapper mapping and the immediate caller window, without pretending that retail pixel parity is solved?

Finding:

- `C:/Projects/New Folder/export/decompiled_all.c:898421-898425` maps `FUN_00a6f1ec()` to `glBlendFunc`.
- `898533-898563` maps `FUN_00a6f3bc(r,g,b,a)` to `glColorMask` with the `DAT_00ccb044` cache.
- `898618-898628` maps `FUN_00a6f4f8(flag)` to `glDepthMask` with the `DAT_00ccb04c` cache.
- `898630-898634` maps `FUN_00a6f518()` to `glDepthFunc`.
- `888188-888213` is now source-backed as the immediate caller buffer-flush/capacity window for `FUN_00a878f8(DAT_00d0233c)`.
- The immediate caller window contains no blend/depth/color-mask wrapper calls, so the broader inherited render-state and retail pixel parity blocker still stands.

Implementation:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits:
  - `shadowVolumeProjectionEvidence.blendDepthColorMaskWrapperEvidence`;
  - `shadowVolumeProjectionEvidence.immediateCallerBufferFlushEvidence`;
  - proof status `source-backed-render-state-blend-depth-color-mask-wrappers-mapped`;
  - proof status `source-backed-shadowvol-immediate-caller-buffer-flush-no-blend-depth-color-mask-state-wrapper`.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts` includes the wrapper map, immediate-caller proof, and narrowed blocker in the Areas light/shadow evidence string.
- `frontend/src/modules/layout/adapters/three/auroraShadowVolumeGeometry.ts` exposes wrapper/immediate-caller constants and keeps the remaining blocker explicit.
- `workspacePlaceableModelPresentation.ts` propagates the new metadata onto fast-shadow proxy userData.
- `workspaceSceneLightDiagnostics.ts` emits the wrapper and immediate-caller fields through the shadow runtime probe samples.

Verification:

- Backend targeted tests passed: `npm.cmd run test:unit -- test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts` -> `2 passed, 11 tests`.
- Frontend targeted shadow tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run` -> `3 passed, 129 tests`.
- Backend build passed after the change: `npm.cmd run build`.
- Frontend TypeScript passed after the change: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Shadow-volume wrapper/immediate-caller proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-blend-depth-color-mask-immediate-caller-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-blend-depth-color-mask-immediate-caller-runtime-proof-2026-07-05.frame.json`
  - `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=1676`, `screenshotBytes=9101`.
  - `devSceneShadowRuntimeProbeSamples` contains `blendDepthColorMaskWrappers=blendFunc=FUN_00a6f1ec()->glBlendFunc`.
  - The same runtime sample contains `source-backed-render-state-blend-depth-color-mask-wrappers-mapped`.
  - The same runtime sample contains `source-backed-shadowvol-immediate-caller-buffer-flush-no-blend-depth-color-mask-state-wrapper`.
  - The same runtime sample still contains `source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked`.

Current status:

- Closed: blend/depth/color-mask wrapper identity is now source-backed, immediate caller `888188-888213` is proven as a no-wrapper buffer-flush path, and both are visible in runtime JSON/PNG proof.
- Still open: inherited render state outside the immediate caller, exact retail shadow-volume pixels, projection geometry/opacity parity, exact cross-lane owner precedence, and exact ProgFX Type 4 retail scheduler data-flow.

## Follow-up loop - shadow-volume direct-caller buffer-builder proof - 2026-07-05

Question: can the inherited render-state blocker be narrowed past the immediate caller by proving the full direct caller/buffer-builder window and facade wrappers?

Finding:

- `C:/Projects/New Folder/export/decompiled_all.c:904153-904157` maps facade `FUN_00a7819c()` to `FUN_00a6f1ec()` -> `glBlendFunc`.
- `904335-904339` maps facade `FUN_00a78384(r,g,b,a)` to `FUN_00a6f3bc(r,g,b,a)` -> `glColorMask`.
- `904542-904546` maps facade `FUN_00a785bc(flag)` to `FUN_00a6f4f8(flag)` -> `glDepthMask`.
- `904686-904690` maps facade `FUN_00a78724()` to `FUN_00a6f518()` -> `glDepthFunc`.
- `888069-888414` proves `FUN_00a5fdb4` as the full direct caller/buffer-builder around `FUN_00a878f8(DAT_00d0233c)`: it computes caster edges, triggers the buffer flush at `888209`, allocates/maps buffers, transforms vertices, writes paired `w=1/w=0` records, fills six indices per edge, and finalizes the buffers.
- The direct caller/buffer-builder window contains no raw or facade blend/depth/color-mask wrapper call. The remaining render-state parity question is therefore above `FUN_00a5fdb4`, likely in a higher scene dispatch/retail oracle path rather than in the local caster-buffer builder.

Implementation:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits:
  - `shadowVolumeProjectionEvidence.blendDepthColorMaskWrapperEvidence.facadeWrapperHits`;
  - `shadowVolumeProjectionEvidence.directCallerBufferBuilderEvidence`;
  - proof status `source-backed-render-state-blend-depth-color-mask-wrappers-mapped`;
  - proof status `source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper`.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts` includes the direct-caller proof and facade wrapper map in the Areas light/shadow evidence string.
- `frontend/src/modules/layout/adapters/three/auroraShadowVolumeGeometry.ts` exposes the direct-caller source/blocker/proof constants alongside the local draw and immediate-caller proof.
- `workspacePlaceableModelPresentation.ts` propagates the direct-caller metadata onto placeable fast-shadow proxy userData.
- `workspaceSceneLightDiagnostics.ts` emits the direct-caller fields through the runtime shadow probe and placeable light samples.

Verification:

- Real decompilation audit reports:
  - `blendDepthColorMaskWrapperEvidence.proofStatus=source-backed-render-state-blend-depth-color-mask-wrappers-mapped`;
  - `facadeWrapperHits=8`;
  - `directCallerBufferBuilderEvidence.proofStatus=source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper`;
  - `directCallerBufferBuilderEvidence.blendDepthColorMaskCallHits=[]`.
- Backend targeted tests passed: `npm.cmd run test:unit -- test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts` -> `2 passed, 11 tests`.
- Frontend targeted shadow tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run` -> `3 passed, 129 tests`.
- Backend build passed: `npm.cmd run build`.
- Frontend TypeScript passed: `npx.cmd tsc --noEmit --pretty false`.

Runtime capture:

- Shadow-volume direct-caller buffer-builder proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-direct-caller-buffer-builder-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-direct-caller-buffer-builder-runtime-proof-2026-07-05.frame.json`
  - `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=1676`, `screenshotBytes=9101`.
  - `devSceneShadowRuntimeProbeSamples` contains `blendFuncFacade=FUN_00a7819c()->FUN_00a6f1ec()->glBlendFunc`.
  - `devSceneShadowRuntimeProbeSamples` contains `directCallerBufferBuilderProof=source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper`.
  - The frame text contains `volumeDirectCallerBufferBuilderProof=source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper`.
  - The frame text contains `directCallerBufferBuilderEvidence proofStatus=source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper`.

Current status:

- Closed: raw and facade blend/depth/color-mask wrappers are source-backed; the full `FUN_00a5fdb4` direct caller/buffer-builder window is proven as no-wrapper; the runtime proof packet exposes this in JSON and PNG.
- Still open: inherited render state above `FUN_00a5fdb4`, exact retail shadow-volume pixel/projection/opacity parity, exact cross-lane owner precedence, and exact ProgFX Type 4 retail scheduler data-flow.

## Follow-up loop - shadow-volume active-light render envelope proof - 2026-07-05

Question: can the inherited render-state blocker be narrowed above `FUN_00a5fdb4` without claiming retail pixel parity?

Finding:

- `C:/Projects/New Folder/export/decompiled_all.c:910553-910663` proves `FUN_00a82464` as an active-light render envelope around `DAT_00d0233c`.
- `910600` sets `DAT_00d0233c=param_1`; `910643` and `910661` clear it.
- `910638-910642` exposes render-state facade calls before the `+0x138` vtable dispatch:
  - `FUN_00a7816c(1)`;
  - `FUN_00a78724()` -> depthFunc facade;
  - `FUN_00a7816c(0)`;
  - `FUN_00a7819c()` -> blendFunc facade.
- `910657-910663` runs `FUN_00a78a04()`, `FUN_00a7dda0(param_1)`, then the `+0x108` vtable dispatch and slot restores `FUN_00a7816c(4/5)`.
- The active-light render envelope contains no `colorMask` or `depthMask` raw/facade wrapper hit, so inherited render-state parity is now narrowed to indirect vtable state or retail oracle output, not the known local/direct buffer-builder windows.

Implementation:

- `backend/scripts/audit-retail-light-function-disasm.py` now emits `shadowVolumeProjectionEvidence.activeLightRenderEnvelopeEvidence` with:
  - proof status `source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked`;
  - `renderDispatchSlots=["vtable+0x138","vtable+0x108"]`;
  - `colorDepthMaskCallHits=[]`.
- `backend/src/modules/areas/domain/area-lighting-evidence.ts` includes the active-light render envelope proof and narrowed blocker in Areas light/shadow evidence.
- `frontend/src/modules/layout/adapters/three/auroraShadowVolumeGeometry.ts` exposes active-light render envelope state/source/blocker/proof constants.
- `workspacePlaceableModelPresentation.ts` propagates active-light render envelope metadata onto placeable fast-shadow proxy userData.
- `workspaceSceneLightDiagnostics.ts` emits the active-light render envelope fields through fast-shadow samples and runtime shadow probe samples.

Verification:

- Real decompilation audit reports:
  - `activeLightRenderEnvelopeEvidence.proofStatus=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked`;
  - `envelopeHits=9`;
  - `stateWrapperHits=6`;
  - `vtableDispatchHits=2`;
  - `colorDepthMaskCallHits=[]`.
- Backend targeted tests passed: `npm.cmd run test:unit -- test/unit/audit-retail-light-function-disasm.spec.ts test/unit/area-lighting-evidence.spec.ts` -> `2 passed, 11 tests`.
- Frontend targeted shadow tests passed: `npx.cmd vitest tests/unit/modules/layout/auroraShadowVolumeGeometry.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts --run` -> `3 passed, 129 tests`.
- Frontend TypeScript passed: `npx.cmd tsc --noEmit --pretty false`.
- Backend build passed: `npm.cmd run build`.
- Frontend build passed: `npm.cmd run build`.

Runtime capture:

- Shadow-volume active-light render envelope proof:
  - PNG: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-active-light-render-envelope-runtime-proof-2026-07-05.png`
  - JSON: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/shadowvol-active-light-render-envelope-runtime-proof-2026-07-05.frame.json`
  - `devRenderStatus=ready`, `devCanvasNonblank=true`, `devObjectPixels=1676`, `screenshotBytes=9101`.
  - `devSceneShadowRuntimeProbeSamples` contains `activeLightRenderEnvelopeProof=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked`.
  - `devSceneShadowRuntimeProbeSamples` contains `activeLightRenderEnvelopeSource=C:/Projects/New Folder/export/decompiled_all.c:910553-910663 FUN_00a82464`.
  - The frame text contains `volumeActiveLightRenderEnvelopeProof=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked`.
  - The frame text contains `activeLightRenderEnvelopeEvidence proofStatus=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked`.

Current status:

- Closed: source-backed inherited render-state envelope up through `FUN_00a82464` is implemented and visible in API/frontend/runtime proof; local/direct/immediate/envelope windows now all prove no color/depth-mask wrapper hit.
- Still open: exact retail shadow-volume pixel/projection/opacity parity through indirect vtable output or retail/toolset oracle, exact cross-lane owner precedence, and exact ProgFX Type 4 retail scheduler data-flow.

## Follow-up loop - retail oracle artifact gate and local web inputs - 2026-07-05

Question: can the remaining retail blockers be tracked by a hard artifact gate instead of a prose-only gap list?

Finding:

- The remaining blockers are no longer missing local runtime proof files. They are missing retail/toolset oracle captures, comparison JSON outputs, and two LightManager owner-callgraph artifacts.
- Required retail/oracle artifacts now total 25 across 8 cases:
  - 6 for shadow-volume pixel/state parity;
  - 7 for cross-lane active-light ordering and LightManager owner dispatch;
  - 12 for ProgFX Type 4 priority/proximity/attach/vision scheduler parity.
- Local current-evidence files are complete for the tracked cases: 15/15 file artifacts are present, plus 9 source-backed/doc-backed evidence tokens.

Implementation:

- Added `backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs`.
  - It scans `backend/docs/aurora-reverse/artifacts` and `docs/aurora-reverse/artifacts`.
  - It writes `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-oracle-artifact-gate.json`.
  - It refuses to promote parity unless every required file exists and every required JSON result has an explicit pass verdict.
- Added `backend/scripts/create-area-lighting-local-oracle-inputs.mjs`.
  - It materializes stable Aurora Web oracle inputs from existing local proof artifacts:
    - `aurora-web-shadowvol-campfire.png`;
    - `aurora-web-shadowvol-state-trace.json`;
    - `aurora-web-cross-lane-all-lanes.frame.json`;
    - `area-lighting-local-oracle-inputs-manifest.json`.
  - The generated manifest keeps `canonicalParityPromoted=false` because retail/toolset evidence is still missing.
- Added `backend/scripts/create-lightmanager-lane-owner-artifacts.mjs`.
  - It reads `audit-retail-light-function-disasm-2026-07-03.json`, including its UTF-16LE source encoding.
  - It writes:
    - `lightmanager-vtable-receiver-xrefs.json`;
    - `lightmanager-lane-owner-callgraph.json`.
  - Both files keep `passed=false` because the audit still reports `requestedDirectCallXrefCount=0` and no recovered owner-lane receiver data-flow.
- Added `backend/scripts/create-area-lighting-blocked-compare-reports.mjs`.
  - It writes explicit `passed=false` comparison reports when retail/toolset inputs are missing:
    - `shadowvol-campfire-pixel-compare.json`;
    - `shadowvol-state-order-compare.json`;
    - `cross-lane-precedence-compare.json`;
    - `retail-progfx-blindvision-pixel-compare.json`.
  - This separates "compare report exists but is blocked by missing retail input" from "compare report was never produced".
- Added backend npm scripts:
  - `areas:lighting-local-oracle-inputs`;
  - `areas:lighting-blocked-compare-reports`;
  - `areas:lightmanager-lane-owner-artifacts`;
  - `areas:lighting-retail-oracle-artifact-gate`.
- Updated `remainingRetailBlockers[retail-shadow-volume-projection-parity].oracleCases` current evidence to include the 2026-07-05 direct-caller and active-light-envelope runtime proof artifacts.

Verification:

- Targeted backend tests passed:
  - `npm.cmd run test:unit -- test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Result: `2 passed, 7 tests`.
- Local web input materialization passed:
  - `node scripts/create-area-lighting-local-oracle-inputs.mjs`
  - Output status: `local-web-inputs-ready-retail-oracle-still-required`.
- Retail oracle artifact gate after materialization:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`
  - Status: `blocked`.
  - `oracleCasesPassed=0`, `oracleCasesBlocked=8`.
  - Before LightManager extraction: `requiredArtifacts=25`, `presentRequiredArtifacts=3`, `missingRequiredArtifacts=22`.
  - After LightManager extraction: `requiredArtifacts=25`, `presentRequiredArtifacts=5`, `missingRequiredArtifacts=20`.
  - `currentEvidenceFilesPresent=15`, `currentEvidenceFilesMissing=0`, `currentEvidenceSourceTokens=9`.
- LightManager extraction passed:
  - `node scripts/create-lightmanager-lane-owner-artifacts.mjs`
  - Output status: `lightmanager-lane-owner-artifacts-written-cross-lane-order-still-blocked`.
  - `requestedDirectCallXrefCount=0`, `indirectCandidateCount=8626`.
- Blocked compare report generation passed:
  - `node scripts/create-area-lighting-blocked-compare-reports.mjs`
  - Output status: `blocked-compare-reports-written`.
  - Missing compare inputs are the retail/toolset side only: campfire retail PNG, shadowvol retail state trace, cross-lane retail before/after/slots, and Blind_Vision retail before/active PNGs.
- Final retail oracle artifact gate for this loop:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`
  - Status: `blocked`.
  - `oracleCasesPassed=0`, `oracleCasesBlocked=8`.
  - `requiredArtifacts=25`, `presentRequiredArtifacts=9`, `missingRequiredArtifacts=16`.
  - `failedRequiredJsonArtifacts=6`, covering the 4 blocked compare reports plus the 2 LightManager `passed=false` artifacts.
  - `requiredJsonWithoutExplicitVerdict=2`, covering local web input JSON/frame artifacts that are inputs, not pass/fail verdicts.
- Passive retail runtime availability check:
  - `Get-Process nwtoolset,nwmain -ErrorAction SilentlyContinue`
  - Result: `{"status":"not_running","processes":[]}`.
  - No global cursor, global keyboard, or Toolset window messages were used.

Current status:

- Closed: hard artifact gate for all remaining light/shadow retail blockers; stable local Aurora Web oracle inputs for shadow-volume campfire, shadow-volume state trace, and cross-lane all-lanes frame; stable LightManager receiver/callgraph artifacts extracted from the decompilation audit; explicit blocked compare reports for shadow-volume pixel, shadow-volume state order, cross-lane precedence, and ProgFX Blind_Vision pixels.
- Still open: 16 required retail/toolset artifacts. Current passive blocker: no `nwtoolset`/`nwmain` process is running, and no matching pre-existing retail artifacts were found in `backend/docs`, `docs`, or `C:/Projects/New Folder`.
  - `retail-or-toolset-shadowvol-campfire.png`;
  - `retail-shadowvol-state-trace.json`;
  - `retail-cross-lane-all-lanes-before-budget.png`;
  - `retail-cross-lane-all-lanes-after-budget.png`;
  - `retail-cross-lane-active-slots.json`;
  - `retail-progfx-priority-policy-before.png`;
  - `retail-progfx-priority-policy-after.png`;
  - `retail-progfx-priority-policy.json`;
  - `retail-progfx-proximity-distance-sweep.json`;
  - `retail-progfx-proximity-distance-sweep-contact-sheet.png`;
  - `retail-progfx-attach-scene-before.png`;
  - `retail-progfx-attach-scene-active.png`;
  - `retail-progfx-attach-scene-after-remove.png`;
  - `retail-progfx-attach-scene-restore.json`;
  - `retail-progfx-blindvision-before.png`;
  - `retail-progfx-blindvision-active.png`.

## Follow-up loop - ProgFX Type 4 retail-table policy artifacts - 2026-07-05

Question: can the ProgFX Type 4 policy blockers move from missing JSON artifacts to source-backed retail table artifacts without pretending runtime parity is solved?

Finding:

- Retail `progfx.2da`/`visualeffects.2da` evidence is available locally through `audit-retail-progfx-type4-table-2026-07-03.json`.
- The retail table audit proves:
  - `type4RowCount=68`;
  - `type4OwnerPhaseCount=77`;
  - Param4 priority raw counts include `13`, `20`, and `49..53`;
  - Param5 proximity suppression has 8 true rows;
  - Param6 attach-to-scene has 2 true rows.
- These table facts still do not prove retail runtime winner/tie behavior, distance threshold, attach restore timing, or vision pixels.

Implementation:

- Added `backend/scripts/create-retail-progfx-type4-policy-artifacts.mjs`.
  - It reads `audit-retail-progfx-type4-table-2026-07-03.json`.
  - It writes:
    - `retail-progfx-priority-policy.json`;
    - `retail-progfx-proximity-distance-sweep.json`;
    - `retail-progfx-attach-scene-restore.json`.
  - All three files keep `passed=false` and `canonicalParityPromoted=false`, because they are retail-table-backed policy/blocker artifacts, not retail runtime captures.
- Added backend npm script:
  - `areas:retail-progfx-type4-policy-artifacts`.

Verification:

- ProgFX policy artifact generation passed:
  - `node scripts/create-retail-progfx-type4-policy-artifacts.mjs`
  - Output status: `retail-progfx-type4-policy-artifacts-written-runtime-still-blocked`.
  - `type4RowCount=68`, `type4OwnerPhaseCount=77`.
- Targeted backend tests passed:
  - `npm.cmd run test:unit -- test/unit/create-retail-progfx-type4-policy-artifacts.spec.ts test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Result: `3 passed, 8 tests`.
- Backend build passed:
  - `npm.cmd run build`.
- Retail oracle artifact gate after ProgFX policy artifacts:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`
  - Status: `blocked`.
  - `oracleCasesPassed=0`, `oracleCasesBlocked=8`.
  - `requiredArtifacts=25`, `presentRequiredArtifacts=12`, `missingRequiredArtifacts=13`.
  - `failedRequiredJsonArtifacts=9`, because the 3 new ProgFX policy JSONs correctly stay `passed=false`.
- Gate correction:
  - `aurora-web-shadowvol-state-trace.json`, `aurora-web-cross-lane-all-lanes.frame.json`, and future retail trace/slot JSON inputs are classified as required inputs, not pass/fail verdict files.
  - Pass verdicts are required only from compare/policy/callgraph artifacts.
  - Targeted gate tests now prove input traces do not need a fake `passed=true`.
- Final gate after the correction:
  - `requiredJsonWithoutExplicitVerdict=0`.

Current status:

- Closed in this loop: missing ProgFX policy JSON artifacts are now retail-table-backed and explicit blockers rather than absent files.
- Still open: 13 required retail/toolset runtime artifacts, all image/state/slot capture inputs:
  - `retail-or-toolset-shadowvol-campfire.png`;
  - `retail-shadowvol-state-trace.json`;
  - `retail-cross-lane-all-lanes-before-budget.png`;
  - `retail-cross-lane-all-lanes-after-budget.png`;
  - `retail-cross-lane-active-slots.json`;
  - `retail-progfx-priority-policy-before.png`;
  - `retail-progfx-priority-policy-after.png`;
  - `retail-progfx-proximity-distance-sweep-contact-sheet.png`;
  - `retail-progfx-attach-scene-before.png`;
  - `retail-progfx-attach-scene-active.png`;
  - `retail-progfx-attach-scene-after-remove.png`;
  - `retail-progfx-blindvision-before.png`;
  - `retail-progfx-blindvision-active.png`.

## Follow-up loop - retail shadow-volume decompilation state trace - 2026-07-05

Question: can `retail-shadowvol-state-trace.json` be satisfied by decompilation evidence instead of a live retail GL capture?

Finding:

- The current `backend/scripts/audit-retail-light-function-disasm.py` extractor emits the needed state evidence from `C:/Projects/New Folder/export/decompiled_all.c` plus `nwtoolset.exe` binary table evidence:
  - `stencilOpSequenceEvidence.proofStatus=source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped`;
  - `renderStateWrapperEvidence.proofStatus=source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-bracket-mapped`;
  - `blendDepthColorMaskWrapperEvidence.proofStatus=source-backed-render-state-blend-depth-color-mask-wrappers-mapped`;
  - `localDrawStateOrderEvidence.proofStatus=source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked`;
  - `activeLightRenderEnvelopeEvidence.proofStatus=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked`.

Implementation:

- Added `backend/scripts/create-retail-shadowvol-state-trace.mjs`.
  - By default, it runs the current Python extractor and writes a compact state trace.
  - For tests, it can read a provided source audit via `--sourceAudit`.
  - It writes `retail-shadowvol-state-trace.json` as a decompilation-backed input trace, not a pass/fail pixel comparison.
- Added backend npm script:
  - `areas:retail-shadowvol-state-trace`.

Verification:

- Shadow-volume state trace generation passed:
  - `node scripts/create-retail-shadowvol-state-trace.mjs`
  - Output status: `source-backed-retail-decompilation-state-trace-ready-pixel-parity-blocked`.
  - `stencilProofStatus=source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped`.
  - `activeLightEnvelopeProofStatus=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked`.
- Targeted backend tests passed:
  - `npm.cmd run test:unit -- test/unit/create-retail-shadowvol-state-trace.spec.ts test/unit/create-retail-progfx-type4-policy-artifacts.spec.ts test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Result: `4 passed, 10 tests`.
- Backend build passed:
  - `npm.cmd run build`.
- Retail oracle artifact gate after the trace:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`
  - Status: `blocked`.
  - `requiredArtifacts=25`, `presentRequiredArtifacts=13`, `missingRequiredArtifacts=12`.
  - `failedRequiredJsonArtifacts=9`, `requiredJsonWithoutExplicitVerdict=0`.

Current status:

- Closed in this loop: `retail-shadowvol-state-trace.json` is now source-backed from decompilation/toolset binary evidence.
- Still open: 12 required retail/toolset runtime artifacts:
  - `retail-or-toolset-shadowvol-campfire.png`;
  - `retail-cross-lane-all-lanes-before-budget.png`;
  - `retail-cross-lane-all-lanes-after-budget.png`;
  - `retail-cross-lane-active-slots.json`;
  - `retail-progfx-priority-policy-before.png`;
  - `retail-progfx-priority-policy-after.png`;
  - `retail-progfx-proximity-distance-sweep-contact-sheet.png`;
  - `retail-progfx-attach-scene-before.png`;
  - `retail-progfx-attach-scene-active.png`;
  - `retail-progfx-attach-scene-after-remove.png`;
  - `retail-progfx-blindvision-before.png`;
  - `retail-progfx-blindvision-active.png`.

## Follow-up loop - retail runtime capture readiness harness - 2026-07-05

Question: can the last 12 runtime-only artifacts be managed by a safe harness that refuses fake captures and records the current blocker?

Finding:

- Existing Toolset capture support is read-only and uses Win32 enumeration/`PrintWindow`/screen copy without global cursor or keyboard.
- The remaining 12 artifacts are image/slot captures, not decompilation table facts:
  - shadow-volume campfire retail/toolset PNG;
  - cross-lane before/after PNG and active-slot JSON;
  - ProgFX priority before/after PNG;
  - ProgFX proximity contact sheet;
  - ProgFX attach-to-scene before/active/after PNG;
  - ProgFX Blind_Vision before/active PNG.
- Current machine state has no `nwtoolset` or `nwmain` process running.

Implementation:

- Added `backend/scripts/check-area-lighting-retail-runtime-capture-readiness.mjs`.
  - It reads the oracle gate output.
  - It probes `nwtoolset`/`nwmain` with read-only `Get-Process`.
  - It writes `area-lighting-retail-runtime-capture-readiness.json`.
  - It records all 12 runtime capture targets, required process, expected output path, capture kind, and per-target readiness.
  - It does not launch retail, send input, or create fake screenshot artifacts.
- Added backend npm script:
  - `areas:lighting-retail-runtime-capture-readiness`.

Verification:

- Runtime capture readiness passed as a blocked manifest:
  - `node scripts/check-area-lighting-retail-runtime-capture-readiness.mjs`
  - Output status: `blocked-no-retail-runtime-process`.
  - `requiredRuntimeArtifacts=12`, `presentRuntimeArtifacts=0`, `missingRuntimeArtifacts=12`, `runtimeReadyTargets=0`, `blockedRuntimeTargets=12`.
  - `processStatus=not_running`.
- Targeted backend tests passed:
  - `npm.cmd run test:unit -- test/unit/check-area-lighting-retail-runtime-capture-readiness.spec.ts test/unit/create-retail-shadowvol-state-trace.spec.ts test/unit/create-retail-progfx-type4-policy-artifacts.spec.ts test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts test/unit/area-lighting-evidence.spec.ts`
  - Result: `5 passed, 11 tests`.
- Backend build passed:
  - `npm.cmd run build`.

Current status:

- Closed in this loop: the remaining retail runtime capture prerequisites are explicit, machine-readable, safety-gated, and current-state checked.
- Still open: 12 retail/toolset runtime captures. Current blocker is external runtime state: `nwtoolset`/`nwmain` are not running, and the harness is intentionally not allowed to fabricate the required PNG/slot artifacts.

## Follow-up loop - retail runtime capture queue - 2026-07-05

Question: can the final 12 retail/toolset runtime artifacts be converted into an exact capture queue without pretending the captures already exist?

Finding:

- The oracle gate remains blocked exactly where expected:
  - `requiredArtifacts=25`;
  - `presentRequiredArtifacts=13`;
  - `missingRequiredArtifacts=12`;
  - `oracleCasesPassed=0`;
  - `oracleCasesBlocked=8`.
- The runtime readiness manifest confirms the current machine still has no observed `nwtoolset`/`nwmain` process:
  - `status=blocked-no-retail-runtime-process`;
  - `requiredRuntimeArtifacts=12`;
  - `presentRuntimeArtifacts=0`;
  - `missingRuntimeArtifacts=12`;
  - `runtimeReadyTargets=0`;
  - `blockedRuntimeTargets=12`.
- The remaining gap is not "unknown light math"; it is missing retail/toolset capture evidence for:
  - shadow-volume campfire pixel geometry/opacity;
  - cross-lane tile/placeable/MDL/item/ProgFX ordering under a constrained active-light budget;
  - ProgFX Type 4 priority/tie/zero, proximity, attach-to-scene restore, and Blind_Vision/Darkvision viewport pixels.

Implementation:

- Added `backend/scripts/create-area-lighting-retail-capture-queue.mjs`.
  - It reads `area-lighting-retail-oracle-artifact-gate.json`.
  - It reads `area-lighting-retail-runtime-capture-readiness.json`.
  - It writes `area-lighting-retail-capture-queue.json`.
  - It maps all 12 missing artifacts to 6 capture cases with stage, output path, required runtime, local inputs, comparison artifacts, validation requirements, and operator action.
  - It records `doesNotFabricateArtifacts=true` and `captureRequiresExistingRuntime=true`.
- Added backend npm script:
  - `areas:lighting-retail-capture-queue`.

Verification:

- Capture queue generation passed:
  - `node scripts/create-area-lighting-retail-capture-queue.mjs`
  - Output status: `blocked-no-retail-runtime-process`.
  - `requiredRuntimeArtifactCount=12`, `missingArtifactCount=12`, `queueItemCount=12`, `caseCount=6`, `runtimeReadyItemCount=0`, `blockedItemCount=12`, `missingInOracleGateCount=12`.
- NPM script generation passed:
  - `npm.cmd run areas:lighting-retail-capture-queue`
  - Same output counts as the direct script.
- Retail oracle artifact gate still blocks correctly:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`
  - `requiredArtifacts=25`, `presentRequiredArtifacts=13`, `missingRequiredArtifacts=12`, `failedRequiredJsonArtifacts=9`, `requiredJsonWithoutExplicitVerdict=0`.
- Runtime readiness still blocks correctly:
  - `node scripts/check-area-lighting-retail-runtime-capture-readiness.mjs`
  - `processStatus=not_running`.
- Targeted backend tests passed:
  - `npm.cmd run test:unit -- test/unit/create-area-lighting-retail-capture-queue.spec.ts test/unit/check-area-lighting-retail-runtime-capture-readiness.spec.ts test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts`
  - Result: `3 passed, 5 tests`.
- Backend build passed:
  - `npm.cmd run build`.

Current status:

- Closed in this loop: every remaining runtime artifact now has an exact capture queue entry and validation contract.
- Still open: the 12 real retail/toolset runtime artifacts themselves. They cannot be honestly closed while `nwtoolset`/`nwmain` are not running and no retail/toolset PNG/slot outputs exist.

## Follow-up loop - source-backed global LightManager preview budget plan - 2026-07-05

Question: can Aurora Web move beyond manual/rank-only cross-lane light diagnostics by computing a shared source-backed LightManager budget plan?

Finding:

- The recovered retail LightManager evidence is strong for score/sort/cap:
  - `FUN_00a41694` sorts active-light score field `+0x84` ascending;
  - `FUN_00a41850` computes score `+0x84` from distance, radius, multiplier, priority, field `+0x70`, and runtime extent;
  - `FUN_00a41e30` caps uploaded active slots at `min(runtime max lights, 0x80)`.
- The recovered evidence is still not strong enough to claim final retail cross-lane owner precedence between tile/placeable/MDL/item/ProgFX creation lanes.
- Prior diagnostics exposed lane coverage and local order, but the shared score/sort/cap rule was still not a reusable selector.

Implementation:

- Extended `frontend/src/modules/layout/adapters/three/auroraLightManagerPreview.ts`.
  - Added `selectAuroraLightManagerPreviewBudget(...)`.
  - The selector ranks candidates by recovered `+0x84` score ascending and applies the recovered hard cap `0x80` / `128`.
  - Existing creature MDL light preview budgeting now uses the shared selector instead of a local duplicate sort.
- Extended `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`.
  - It now computes `retailOrderingPreviewBudgetPlan*` diagnostics for source-backed scene PointLight lanes.
  - The plan emits accepted lanes, dropped lanes, ranked samples, strategy, proof source, proof status, and blocker text.
  - ProgFX Type 4 remains a non-point scheduler request and is not converted into a fake PointLight without retail scheduler proof.
- Extended `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`.
  - The dev fixture route now exposes `data-scene-point-light-retail-ordering-preview-budget-plan-*` attributes.

Verification:

- New selector tests passed:
  - `npx.cmd vitest run tests/unit/modules/layout/auroraLightManagerPreview.test.ts`
  - `2 passed`.
- Scene diagnostic tests passed:
  - `npx.cmd vitest run tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`
  - `8 passed`.
- Cross-lane fixture route proof passed:
  - `npx.cmd vitest run tests/unit/app/App.vfxFixtureRunner.test.tsx -t "exposes all required cross-lane light lanes"`
  - `1 passed`.
- Existing affected strategy-string tests passed with targeted filters:
  - `workspaceObjectMeshLayer.creatureRenderPayload.test.ts -t "renders source MDL light nodes|caps creature source MDL light previews"` -> `2 passed`;
  - `workspaceObjectMeshLayer.vfxRenderMode.test.ts -t "caps placeable source MDL light previews"` -> `1 passed`;
  - `WorkspaceCanvasViewport.renderFilter.test.ts -t "exposes source MDL light-node preview diagnostics|applyWorkspaceRuntimeLightBudget"` -> `2 passed`.
- Frontend build passed:
  - `npm.cmd run build`.
- A broad `npm.cmd run test:unit -- ...` invocation accidentally ran the whole current frontend unit suite because the npm script already includes `tests/unit`; that broad run still has unrelated pre-existing failures in texture/model fallback, coordinate parity, and scene facade tests. The targeted light/cross-lane slice above passes.

Current status:

- Closed in this loop: source-backed LightManager score/sort/cap is now a reusable selector and a visible cross-lane runtime diagnostic plan.
- Still open: final retail cross-lane precedence is not claimed. It still requires one of:
  - common LightManager owner-lane insertion callsite proof;
  - receiver-proven vtable dispatch/data-flow proof;
  - real retail/toolset cross-lane before/after PNGs plus `retail-cross-lane-active-slots.json`.

## Follow-up loop - ProgFX Type 4 scheduler policy selector extraction - 2026-07-05

Question: can the local ProgFX Type 4 priority/proximity/attach-to-scene policy stop living as private scene-diagnostic code and become an auditable selector without pretending retail scheduler parity is solved?

Finding:

- Current evidence supports a source/docs-backed local policy diagnostic:
  - `Param4` priority lower value wins;
  - `Param4=0` is preserved as an always-applies policy marker;
  - equal local priorities use the existing last-applied diagnostic order;
  - `Param5` proximity suppression is only a candidate because the retail threshold remains unknown;
  - `Param6` attach-to-scene can report scene-light suppression intent, but exact retail restore timing remains unknown.
- Current evidence still does not recover the retail client scheduler data-flow for owner grouping, tie order, proximity threshold, attach restore, or Blind Vision/Darkvision pixel mutation.

Implementation:

- Added `frontend/src/modules/layout/adapters/three/auroraProgFxType4SchedulerPolicy.ts`.
  - Exports the reusable `resolveAuroraProgFxType4SchedulerPolicy(...)` selector.
  - Keeps ProgFX Type 4 as scheduler requests, not fake `THREE.PointLight` instances.
  - Emits priority winner, full evaluation order, tie/zero counts, attach/proximity counts, nearest-light/request proximity observation, and the retail-dataflow blocker.
- Updated `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`.
  - Scene diagnostics now call the selector and preserve the existing `AURORA_SCENE_PROGFX_TYPE4_*` constants as compatibility aliases.
  - The fixture/dev proof route continues to receive the same `sceneNonPointLightRequestScheduler*` fields.
- Added `frontend/tests/unit/modules/layout/auroraProgFxType4SchedulerPolicy.test.ts`.
  - Covers no-request status, priority ordering, last-applied tie order, `Param4=0`, `Param5` proximity observation, and `Param6` scene-light suppression intent.

Verification:

- Policy + scene diagnostics passed:
  - `npx.cmd vitest run tests/unit/modules/layout/auroraProgFxType4SchedulerPolicy.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`
  - `2 files passed`, `11 tests passed`.
- Fixture route proof surface passed:
  - `npx.cmd vitest run tests/unit/app/App.vfxFixtureRunner.test.tsx -t "exposes ProgFX Type 4 multi-request scheduler policy metadata"`
  - `1 passed`.
- Frontend build passed:
  - `npm.cmd run build`.

Current status:

- Closed in this loop: local ProgFX Type 4 policy evaluation is now a reusable, directly tested selector and still avoids fake point lights.
- Still open: exact retail ProgFX Type 4 priority tie order, proximity distance threshold, attach-to-scene restore timing, Blind Vision/Darkvision runtime pixel mutation, and real retail/toolset oracle captures.

## Follow-up loop - shadow-volume state-order compare evaluator - 2026-07-05

Question: once both `retail-shadowvol-state-trace.json` and `aurora-web-shadowvol-state-trace.json` exist, can the state-order compare report stop being a placeholder while still refusing to promote full pixel parity?

Finding:

- `shadowvol-state-order-compare.json` was stale/placeholder-like: it previously reported a missing retail trace even though the current artifact gate could see `retail-shadowvol-state-trace.json`.
- The available inputs are enough to compare source-state signals:
  - retail trace proves the stencil sequence, face/op mapping, slot 3 cull-face mapping, local draw order, and active-light envelope;
  - Aurora Web trace declares the matching local preview state claims.
- The available inputs are not enough to promote full shadow-volume parity because pixel output, opacity/receiver-footprint tolerance, and inherited blend/depth/color-mask state remain unproven.

Implementation:

- Extended `backend/scripts/create-area-lighting-blocked-compare-reports.mjs`.
  - Added `--repoRoot` and `--artifactDir` test hooks.
  - Added a structural evaluator for `shadowvol-state-order-compare.json`.
  - The report now emits `stateOrderSourceParityPassed=true` when the retail trace and Aurora Web trace agree on:
    - `stencilSequence`;
    - `renderStateSlot3`;
    - `localDrawOrder`;
    - `activeLightEnvelope`.
  - The report intentionally keeps `passed=false` and `canonicalParityPromoted=false` until pixel/opacity/inherited-state parity is actually proven.
- Added `backend/test/unit/create-area-lighting-blocked-compare-reports.spec.ts`.

Verification:

- Script syntax passed:
  - `node --check scripts/create-area-lighting-blocked-compare-reports.mjs`.
- Backend target tests passed:
  - `npm.cmd run test:unit -- test/unit/create-area-lighting-blocked-compare-reports.spec.ts`.
  - `npm.cmd run test:unit -- test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts test/unit/create-area-lighting-blocked-compare-reports.spec.ts`.
- Compare report generation passed:
  - `node scripts/create-area-lighting-blocked-compare-reports.mjs`.
  - `shadowvol-state-order-compare.json` now reports `status=blocked-source-state-order-parity-evaluated-pixel-opacity-parity-blocked`, `stateOrderSourceParityPassed=true`, and four passing source-state checks.
- Retail oracle artifact gate still blocks correctly:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`.
  - Still `missingRequiredArtifacts=12`, because the remaining blockers require retail/toolset PNG/slot/pixel artifacts.

Current status:

- Closed in this loop: shadow-volume state-order compare is now a real structural partial evaluator instead of a generic unevaluated blocker.
- Still open: full `shadowvol-retail-gl-state-order` oracle promotion, because `passed=false` remains correct until pixel/opacity/inherited-state parity has proof.

## Follow-up loop - LightManager lane-owner source anchors and fresh frame-rebuild evidence - 2026-07-05

Question: can the cross-lane LightManager blocker move from a generic "not recovered" report to a machine-readable artifact that shows which lane anchors are source-backed, which are absent, and which LightManager frame-order evidence is current?

Finding:

- The existing `lightmanager-lane-owner-callgraph.json` was generated from an older `audit-retail-light-function-disasm-2026-07-03.json` snapshot and did not expose the later frame-rebuild evidence even though the current Python scanner can recover it.
- The old lane-owner artifact also carried some lane facts as prose strings rather than scanned source/binary anchors.
- The recovered evidence still does not prove final owner precedence:
  - direct `FUN_00a4128c` owner-lane call hits remain `0`;
  - `LightManager::AddLight/PrioritizeLights/RemoveLight/UpdateLights` direct xrefs remain absent;
  - generic indirect vtable candidates are not receiver/data-flow proof for tile/placeable/MDL/item/ProgFX lanes.

Implementation:

- Extended `backend/scripts/create-lightmanager-lane-owner-artifacts.mjs`.
  - Added `--repoRoot`, `--artifactDir`, `--sourceAudit`, and `--decompiledSource` test hooks.
  - Reads `lightManagerSourceOrderingEvidence` from the source audit artifact.
  - Scans the decompiled source for per-lane anchors:
    - `terrain-tile-main-light`: `Tile_MainLight1/2`;
    - `terrain-tile-source-light`: `fx_flame01`, `sourcelight1/2`;
    - `placeables-2da-light`: `placeablelight`, `LightColor`, `ShadowSize`, `LightState`;
    - `progfx-type4-light-or-vision`: `visualeffects`;
  - Adds `recoveredSourceOrdering` and `laneOwnerSourceAnchorScan` to `lightmanager-lane-owner-callgraph.json`.
- Added `backend/test/unit/create-lightmanager-lane-owner-artifacts.spec.ts`.
- Refreshed `audit-retail-light-function-disasm-2026-07-03.json` with the current Python scanner and regenerated:
  - `lightmanager-vtable-receiver-xrefs.json`;
  - `lightmanager-lane-owner-callgraph.json`.

Verification:

- Script syntax passed:
  - `node --check scripts/create-lightmanager-lane-owner-artifacts.mjs`.
- Backend target tests passed:
  - `npm.cmd run test:unit -- test/unit/create-lightmanager-lane-owner-artifacts.spec.ts`;
  - `npm.cmd run test:unit -- test/unit/create-lightmanager-lane-owner-artifacts.spec.ts test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts`.
- Fresh audit regeneration passed:
  - `python scripts\audit-retail-light-function-disasm.py | Set-Content ...audit-retail-light-function-disasm-2026-07-03.json`.
- LightManager artifact generation passed:
  - `node scripts/create-lightmanager-lane-owner-artifacts.mjs`.
  - Output now reports `sourceOrderingProofStatus=source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked`.
- `lightmanager-lane-owner-callgraph.json` now reports:
  - `recoveredSourceOrdering.proofStatus=source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked`;
  - `frameRebuildOrderingProofStatus=source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked`;
  - `directInsertionCallHitCount=0`;
  - source-backed lane anchors for tile main/source and ProgFX visualeffects;
  - retail binary PartLight target evidence for MDL-source lights;
  - no source-only decompilation anchor for placeables.2da lights and no current LightManager artifact anchor for item-property lights.
- Retail oracle artifact gate still blocks correctly:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`.
  - Still `missingRequiredArtifacts=12`, because owner precedence and retail captures remain unresolved.

Current status:

- Closed in this loop: cross-lane callgraph evidence is fresher and more precise; it now separates source-backed lane anchors from missing owner-path proof.
- Still open: exact retail cross-lane owner precedence between tile/placeable/MDL/item/ProgFX lanes.

## Follow-up loop - Lane source-family evidence for placeable/item/ProgFX - 2026-07-05

Question: can the machine-readable LightManager callgraph stop treating placeable and item light lanes as empty when their source family is already retail/source-backed, without falsely promoting cross-lane owner ordering?

Finding:

- The previous `lightmanager-lane-owner-callgraph.json` correctly kept `lightManagerOwnerPath=not-recovered`, but it under-reported two important facts:
  - `placeables-2da-light` has source-family proof for `LightColor`, `LightState`, `ShadowSize`, and the retail `fx_placeable01/AuroraLight01` carrier, even though the source-only C dump does not expose the owner callsite.
  - `item-property-light` has source-family proof through retail item light tables and `visualeffects.2da -> progfx.2da -> fx_light_clr.mdl`, even though the common LightManager lane insertion order is still unrecovered.
- The right distinction is:
  - source family recovered: yes, for 6/6 lanes;
  - common retail owner ordering recovered: no.

Implementation:

- Extended `backend/scripts/create-lightmanager-lane-owner-artifacts.mjs`.
  - Added optional `--progFxAudit`, `--itemLightAudit`, and `--lightStateAudit` inputs.
  - Added `sourceFamilyArtifacts` and `sourceFamilyEvidence` to `lightmanager-lane-owner-callgraph.json`.
  - Added per-lane `sourceFamilyStatus` and `sourceFamilyProofStatus` next to the existing `sourceAnchorStatus`.
  - Kept every lane at `lightManagerOwnerPath=not-recovered`.
- Generated new source-family inputs:
  - `audit-retail-item-light-tables-2026-07-05.json`;
  - `audit-lightstate-default-retail-binary-2026-07-05.json`.
- Updated `backend/test/unit/create-lightmanager-lane-owner-artifacts.spec.ts` to prove placeable/item/ProgFX source-family evidence is materialized without promoting ordering.

Verification:

- Script syntax passed:
  - `node --check scripts/create-lightmanager-lane-owner-artifacts.mjs`.
- Backend target test passed:
  - `npm.cmd run test:unit -- test/unit/create-lightmanager-lane-owner-artifacts.spec.ts`.
- Retail/source audit generation passed:
  - `node scripts/audit-retail-item-light-tables.mjs`;
  - `node scripts/audit-lightstate-default-retail-binary.mjs`.
- LightManager artifact regeneration passed:
  - `node scripts/create-lightmanager-lane-owner-artifacts.mjs`.
  - New `sourceFamilyProofStatuses`:
    - `placeables-2da-light=retail-table-binary-backed-placeable-lightcolor-lightstate-shadowsize-family-owner-order-blocked`;
    - `item-property-light=retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked`;
    - `progfx-type4-light-or-vision=retail-table-backed-progfx-type4-table-owner-phase-family-runtime-scheduler-blocked`.
- Retail oracle artifact gate still blocks correctly:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`.
  - Still `missingRequiredArtifacts=12`, because retail/toolset screenshots and active-slot oracle outputs are still absent.

Current status:

- Closed in this loop: source-family coverage for tile/placeable/MDL/item/ProgFX lanes is now explicit and machine-readable.
- Still open: exact retail cross-lane owner precedence, retail/toolset shadow-volume pixel parity, and ProgFX runtime scheduler oracle captures.

## Follow-up loop - Oracle gate source-family evidence visibility - 2026-07-05

Question: does the retail oracle gate actually surface the newly generated source-family lane artifacts, or do they only exist beside the gate?

Finding:

- Before this follow-up, the gate summary still reported `currentEvidenceEntries=24` and `currentEvidenceFilesPresent=15`.
- The new `audit-retail-item-light-tables-2026-07-05.json` and `audit-lightstate-default-retail-binary-2026-07-05.json` were not listed as current evidence for the cross-lane LightManager case.
- This did not affect oracle pass/fail, but it made the gate less useful for proving what is source-family-backed.

Implementation:

- Extended `backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs`.
  - Added the item-light table audit and LightState binary audit as `currentEvidence` for `lightmanager-vtable-receiver-dispatch`.
  - Added source tokens for placeable, item-property, and ProgFX Type 4 source-family proof statuses.
- Updated `backend/test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts`.
  - New coverage proves these artifacts are visible as current evidence while the retail ordering case remains blocked without required LightManager oracle artifacts.

Verification:

- Backend target tests passed:
  - `npm.cmd run test:unit -- test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts test/unit/create-lightmanager-lane-owner-artifacts.spec.ts`.
- Backend build passed:
  - `npm.cmd run build`.
- Gate still blocks correctly:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`.
  - New summary: `currentEvidenceEntries=29`, `currentEvidenceFilesPresent=17`, `currentEvidenceSourceTokens=12`.
  - Required retail/toolset gaps remain unchanged: `missingRequiredArtifacts=12`.

Current status:

- Closed in this loop: the oracle gate now includes the new source-family lane evidence packet.
- Still open: the 12 required retail/toolset artifacts and the 9 required JSON artifacts with explicit blocked/fail verdicts.

## Follow-up loop - Cross-lane compare local source-family evaluator - 2026-07-05

Question: can `cross-lane-precedence-compare.json` distinguish "Aurora Web has all required local lane families" from "retail precedence is proven"?

Finding:

- Before this follow-up, `cross-lane-precedence-compare.json` only reported `blocked-missing-retail-or-toolset-input`.
- That was truthful, but too coarse: it did not preserve that the current local runtime frame covers the five runtime lane families and the LightManager callgraph covers six source-family lanes.

Implementation:

- Extended `backend/scripts/create-area-lighting-blocked-compare-reports.mjs`.
  - Added a `cross-lane-source-family-coverage` evaluator.
  - It reads `aurora-web-cross-lane-all-lanes.frame.json` and `lightmanager-lane-owner-callgraph.json`.
  - It evaluates:
    - 5/5 runtime lane coverage: tile, placeable, source-MDL, item-property, ProgFX Type 4;
    - 6/6 source-family coverage: tile main, tile source, placeable, MDL, item-property, ProgFX Type 4;
    - all `lightManagerOwnerPath` entries still blocked as `not-recovered`.
  - It intentionally keeps `passed=false` and `canonicalParityPromoted=false`.
- Updated `backend/test/unit/create-area-lighting-blocked-compare-reports.spec.ts`.

Verification:

- Script syntax passed:
  - `node --check scripts/create-area-lighting-blocked-compare-reports.mjs`.
- Target tests passed:
  - `npm.cmd run test:unit -- test/unit/create-area-lighting-blocked-compare-reports.spec.ts`;
  - `npm.cmd run test:unit -- test/unit/create-area-lighting-blocked-compare-reports.spec.ts test/unit/check-area-lighting-retail-oracle-artifacts.spec.ts test/unit/create-lightmanager-lane-owner-artifacts.spec.ts`.
- Backend build passed:
  - `npm.cmd run build`.
- Compare regeneration passed:
  - `node scripts/create-area-lighting-blocked-compare-reports.mjs`.
- Real `cross-lane-precedence-compare.json` now reports:
  - `status=blocked-local-source-family-coverage-evaluated-retail-precedence-missing`;
  - `localSourceFamilyCoveragePassed=true`;
  - `runtimeLaneCoveragePassed=true`;
  - `sourceFamilyCoveragePassed=true`;
  - `ownerPathsStillBlocked=true`;
  - missing retail inputs: `retail-cross-lane-all-lanes-before-budget.png`, `retail-cross-lane-all-lanes-after-budget.png`, `retail-cross-lane-active-slots.json`.
- Retail oracle gate still blocks correctly:
  - `node scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`.
  - Still `missingRequiredArtifacts=12` and `failedRequiredJsonArtifacts=9`.

Current status:

- Closed in this loop: cross-lane local/source coverage is now an explicit partial pass inside the blocked compare JSON.
- Still open: retail active-slot order and constrained-budget before/after captures.

## Follow-up loop - Retail/runtime capture blocker audit - 2026-07-05

Question: are the remaining light/shadow tasks still implementable from local decompilation and Aurora Web evidence, or do they now require a running retail/toolset process?

Finding:

- The oracle gate still reports:
  - `missingRequiredArtifacts=12`;
  - `failedRequiredJsonArtifacts=9`;
  - `currentEvidenceEntries=29`;
  - `currentEvidenceFilesPresent=17`.
- Runtime readiness reports:
  - `status=blocked-no-retail-runtime-process`;
  - `requiredRuntimeArtifacts=12`;
  - `presentRuntimeArtifacts=0`;
  - `missingRuntimeArtifacts=12`;
  - `runtimeReadyTargets=0`;
  - `blockedRuntimeTargets=12`.
- Capture queue reports:
  - `status=blocked-no-retail-runtime-process`;
  - `queueItemCount=12`;
  - `caseCount=6`;
  - `runtimeReadyItemCount=0`;
  - `blockedItemCount=12`.
- A direct Windows process check found no `nwmain`, `nwserver`, `nwtoolset`, `toolset`, `Neverwinter`, or `nwn` process.

Remaining runtime artifacts:

- `retail-or-toolset-shadowvol-campfire.png`;
- `retail-cross-lane-all-lanes-before-budget.png`;
- `retail-cross-lane-all-lanes-after-budget.png`;
- `retail-cross-lane-active-slots.json`;
- `retail-progfx-priority-policy-before.png`;
- `retail-progfx-priority-policy-after.png`;
- `retail-progfx-proximity-distance-sweep-contact-sheet.png`;
- `retail-progfx-attach-scene-before.png`;
- `retail-progfx-attach-scene-active.png`;
- `retail-progfx-attach-scene-after-remove.png`;
- `retail-progfx-blindvision-before.png`;
- `retail-progfx-blindvision-active.png`.

Current status:

- Closed locally: decompilation/source-family coverage, local runtime lane coverage, source-state shadow-volume order, item/placeable/ProgFX table evidence, LightState default, and capture queue/gate tracking.
- Blocked externally: the listed retail/toolset PNG/slot artifacts require a running retail/toolset process or equivalent oracle source. The current local evidence is not enough to fabricate or promote those artifacts.
