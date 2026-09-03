# VFX row 22 local tile-lighting Aurora-first audit (2026-07-20)

> Superseded in part on 2026-08-07. Native `ml1/ml2` main lights are recovered
> by `vfx-tile-main-light-native-node-audit-2026-08-07.md`; source carriers are
> created only for available MDL source slots, as proved by
> `vfx-tile-source-light-slot-count-audit-2026-08-07.md`. A non-zero ARE source
> reference without a slot is intentionally absent, not a tile-center preview
> or an unresolved carrier.

## Scope

This audit classifies the local tile-lighting context missing from the row 22
Fireball proof scene. It does not change Fireball emitter, material, alpha, or
lifetime semantics.

No xoreos source was used.

## Primary evidence

- Saved retail ARE:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/sources/enon_test_effect.are`
  (`sha256=bcb728fcbc50701f75b8e822e31639bde0403449bf01296edd99bc8def591e59`).
- Exact retail tile MDLs extracted by the row 22 fixture builder from
  `nwn_base.key` and `q_tilesets.hak`.
- Exact retail `lightcolor.2da` and `tilecolor.2da` from `nwn_base.key`.
- Aurora decompilation:
  `C:/Projects/New Folder/export/decompiled_all.c:453281-453528` resolves
  `Tile_MainLight1/2` through `lightcolor.2da` without creating an
  `fx/AuroraLight` point carrier.
- Aurora decompilation:
  `C:/Projects/New Folder/export/decompiled_all.c:453567-453602` creates
  `fx_flame01` carriers at `sourcelight1/2`.
- Retail `fx_flame01.mdl`, node `AuroraLight01`: radius `7`, shadow radius
  `15`, vertical displacement `2`, priority `4`.
- Aurora decompilation:
  `C:/Projects/New Folder/export/decompiled_all.c:866543-866563` applies
  `color * max(0, 1 - distance / radius) * multiplier`.

## Confirmed row 22 facts

The ARE contains these non-zero light references:

| Tile | Model | Main references | Source references |
| --- | --- | --- | --- |
| 0 / ID 107 | `tin01_h01_02` | `main1=4` | `source1=3`, `source2=3` |
| 1 / ID 147 | `tin01_h01_03` | `main1=4`, `main2=14` | none |
| 2 / ID 364 | `gin01_h01_08` | `main2=13` | `source1=3`, `source2=3` |
| 3 / ID 364 | `gin01_h01_08` | `main1=4`, `main2=13` | `source1=3`, `source2=3` |

Main-light references use `lightcolor.2da`. Source-light references use
`tilecolor.2da`; row `3` is RGB `(0.49, 0.29, 0.07)`. Treating source row `3`
as `lightcolor.2da` BrightWhite `(2, 2, 2)` is incorrect.

The converted source hierarchies expose one matching source-light node in the
four instantiated tiles: `TIN01_H01_02sl1`, directly under the model root, at
Aurora-local position `(-1.2657799721, 1.5742100477, 0.9857010245)`.
`tin01_h01_03` and `gin01_h01_08` expose no `sl1/sl2` nodes.

Therefore the six non-zero ARE source references are not evidence for six
renderable point lights. The current primary evidence proves one source-node
carrier and five unresolved references.

## Implementation boundary

- Reconstruct the one source light whose ARE reference, `tilecolor.2da` RGB,
  and source-hierarchy node are all present.
- Keep main-light rows as static-lane metadata. Do not synthesize point lights
  for them.
- Keep source references without a matching hierarchy node visible as
  unresolved telemetry. Do not place them at tile centers in comparison proof.
- Use radius `7` in the row 22 proof coordinate space, where a tile spans ten
  world units. The production Area viewport scales the same model radius by
  `0.1` because one tile spans one viewport unit.
- The source multiplier is still unrecovered. Neutral `1.0` remains an
  explicit non-parity fallback.

## Open semantics

- Exact retail behavior when an ARE source-light reference is non-zero but the
  selected tile model has no matching `sl1/sl2` source node.
- Exact main-light static material/color composition.
- Exact source-light multiplier.

These open items prevent a claim that row 22 local tile lighting is complete.
