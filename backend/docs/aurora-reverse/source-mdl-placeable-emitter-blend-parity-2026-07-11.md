# Source-MDL placeable emitter blend parity — 2026-07-11

## Scope

This note closes the previously open blend-factor gap for Aurora particle runtime blend bucket `2`, including source-MDL placeable emitters authored as `Lighten`. The read-only reference is `C:\Projects\New Folder`; the implementation target is `C:\Projects\aurora-web`.

## Confirmed Aurora evidence

- `C:\Projects\New Folder\export\decompiled_all.c:853987-854022` maps authored `Normal` to runtime blend bucket `0`, `Punch-Through` to `1`, and every other preserved literal, including `Lighten`, to bucket `2`.
- `nwtoolset.exe` disassembly at `0x00a2ecbd-0x00a2ecd6` selects blend-table indices `(0,1)` for bucket `0` and `(0,2)` for bucket `2`, then calls `FUN_00a7819c`.
- `FUN_00a7819c` forwards both indices to `FUN_00a6f1ec`. At `0x00a6f1f5-0x00a6f20b`, that wrapper reads both GL enums from the table at `0x00cc99f0` and calls `glBlendFunc`.
- The first three table entries at `0x00cc99f0` are `0x0302`, `0x0303`, `0x0001`, which are `GL_SRC_ALPHA`, `GL_ONE_MINUS_SRC_ALPHA`, and `GL_ONE`.

Therefore the recovered runtime calls are:

- bucket `0`: `glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)`;
- bucket `2` / authored `Lighten`: `glBlendFunc(GL_SRC_ALPHA, GL_ONE)`.

Binary used for the disassembly:

- path: `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`;
- SHA-256: `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`;
- file version: `1.5.0.5`.

## Aurora Web implementation

`frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts` now maps runtime bucket `2` to Three.js custom additive blending with:

- equation: `AddEquation`;
- source factor: `SrcAlphaFactor`;
- destination factor: `OneFactor`;
- `depthWrite=false` for the recovered non-punch transparent lane.

Runtime diagnostics expose the recovered symbolic factors and GL enums. Source-MDL flame/smoke classification, authored model-space transform, the shared `0.1` area-model host scale, and placeable root transform remain unchanged.

The dev asset resolver also now prefers an asset contract `deliveryPath` over a direct SeaweedFS URL when the direct URL points at port `8888` or `/buckets/`. This keeps model delivery on the authenticated Vite-to-backend proxy (`/_aurora/...`) and avoids browser CORS failures from the storage endpoint. The direct storage response observed on 2026-07-11 returned `200` without `Access-Control-Allow-Origin`; before the fix the area queue remained at `4 active / 85 pending / 0 completed` and the terrain runtime reported `4 failed / 0 visible meshes`.

## Remaining parity boundary

This closes the blend-factor gap only. A fresh `enon_bakery` Aurora Web PNG must still be compared with the existing Aurora/NWN oracle after this change. After the delivery URL fix, backend GLB requests completed successfully, but the full restored `enon_bakery` batch still saturated the frontend during mass parse/rebuild and did not yield a valid PNG in this run. The last pre-change Web crop remains visibly non-parity (oversized white flame compared with the smaller orange retail plume), but it is not accepted as post-fix evidence. Atlas checkpoint timing, stochastic particle spawning, frontend batch stability, and shader details remain open until separately proven.
