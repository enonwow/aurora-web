# Tile numbered-MTR diffuse-family recovery contract v1

Date: 2026-07-29

Status: implementation contract for the `mst01-group-chunk-0001` fail-closed
recovery lane.

## Scope

This contract covers one narrow delivery defect:

- a renderable tile primitive names `mtr_nkey_NNNN`;
- no exact raster or MTR resource exists for that resref in the active source
  stack;
- an exact `tex_core_NNNN_d` raster does exist in that same active source
  stack.

It does not invent an Aurora material, substitute an adjacent material, or
claim normal/roughness/shader parity. It only recovers the diffuse binding
already consumed by the current tile renderer.

Policy ID:

`tile-mtr-numbered-exact-diffuse-family/v1`

## Aurora-first source audit

The active module source order was read from runtime settings revision 10.
The relevant files are:

- model source: `vale_core_tis_01.hak`;
- numbered MTR subset: `lc_placeable.hak` and `vale-c_and_m.hak`;
- numbered raster source: `vale_core_tex_04.hak`.

The active local HAK inventory contains 281 exact
`mtr_nkey_NNNN.mtr` manifests. Every one of those 281 manifests binds
`texture0` to exactly `tex_core_NNNN_d`; there are zero exceptions. This is a
source-stack invariant, not a guessed one-off alias.

For `NNNN=0531`:

- `mtr_nkey_0531` is absent from all 174 local HAKs and from
  `nwn_base.key`/`nwn_retail.key`;
- `tex_core_0531_d` exists as DDS resource type 2033 in
  `vale_core_tex_04.hak`, 1,398,256 bytes,
  SHA-256 `3131d5897a39a936fc191c10cbefc35d4b2bf0b9679e6c297c8b8bae5133c0fe`;
- `tex_core_0531_n` exists, 1,398,256 bytes,
  SHA-256 `74f3819f7f3c489fd44788e6d1f1b1ea473a639c55e2f68d87c5b10530d3550e`;
- `tex_core_0531_r` exists, 699,192 bytes,
  SHA-256 `0697df7b3b8049f501afa46c90211febf0f7dc448b9e86b282fa0bdaf9cf2f1f`.

The failed GLB contracts use `mtr_nkey_0531` on one primitive each, all in the
same authored mesh family:

- `mst01_o50_03`: `EVO_NECRO_Wall_D_Top__9_.003`;
- `mst01_o50_09`: `EVO_NECRO_Wall_D_Top__2_.003`;
- `mst01_o50_12`: `EVO_NECRO_Wall_D_Top.003`;
- `mst01_o50_16`: `EVO_NECRO_Wall_D_Top__1_.003`;
- `mst01_o50_20`: `EVO_NECRO_Wall_D_Top__1_.003`.

## Required behavior

For a missing reference matching exactly `^mtr_nkey_(\d{4})$`:

1. derive only `tex_core_$1_d`;
2. include both the authored MTR resref and the derived exact diffuse resref
   in the targeted source sync request;
3. after sync, require a normal texture-delivery contract for the exact
   derived diffuse resref;
4. emit the tile material asset with:
   - `reference = mtr_nkey_NNNN`;
   - `resref = tex_core_NNNN_d`;
   - all object key, hash/etag, source and delivery fields taken from that
     exact delivered raster;
5. keep the authored GLB reference unchanged.

The existing `reference != resref` fields therefore provide observable
provenance without adding an implicit frontend alias.

## Fail-closed rules

Recovery must not occur when:

- the authored reference does not match the exact numbered policy;
- the numbered suffix is not four decimal digits;
- the exact `tex_core_NNNN_d` contract is absent after targeted sync;
- the selected asset is not a browser-decodable raster;
- a different/adjacent numbered texture is the only available candidate.

In every such case the existing
`blocked_tile_material_texture_references_missing:<resref>` blocker remains.

This contract does not make PathConnect eligible. PathConnect remains blocked
until its separate profile and original Toolset/NWN differential proof are
approved.
