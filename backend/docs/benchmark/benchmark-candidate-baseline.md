# Benchmark Candidate Baseline (Asset Selection)

## Source
- Main source: `scene.json`
- Door context source: area dataset (`wnd_slms_swamp__with_placeables`)

## 1) Heavy Placeable Without VFX (emitters=0)
- Candidate ID: `c_wingsmeph`
- Metrics:
  - `triangles`: `659`
  - `meshes`: `16`
  - `emitters`: `0`
- Source: `scene.json`

## 2) Placeable With VFX (VVXM / VFX)
- Recommended candidate: `ad_top_lion_1`
- Metrics:
  - `triangles`: `798`
  - `meshes`: `28`
  - `emitters`: `1`
- Note: Heaviest VFX candidate in current generated set.
- Source: `scene.json`

### Alternative (more classic `plc`)
- Candidate ID: `plc_x02`
- Metrics:
  - `triangles`: `112`
  - `meshes`: `5`
  - `emitters`: `3`
- Source: `scene.json`

## 3) Heavy Door (from area data)
- Recommended candidate: `tn_sdoor_14`
- Metrics (instance):
  - `triangles`: `250`
  - `meshes`: `10`
- Context:
  - `area`: `wnd_slms_swamp__with_placeables`
  - `doorIndex`: `12`

### Alternative (highest single mesh load)
- Candidate ID: `tn_gdoor_05`
- Metrics (instance):
  - `triangles`: `190`
  - `meshes`: `6`
- Single mesh peak:
  - `triangles`: `102`
- Context:
  - `area`: `wnd_slms_swamp__with_placeables`
  - `doorIndex`: `8`

## Practical benchmark buckets
- `placeable_heavy_no_vfx`: `c_wingsmeph`
- `placeable_heavy_vfx`: `ad_top_lion_1`
- `placeable_vfx_plc_alt`: `plc_x02`
- `door_heavy_instance`: `tn_sdoor_14`
- `door_heavy_single_mesh`: `tn_gdoor_05`
