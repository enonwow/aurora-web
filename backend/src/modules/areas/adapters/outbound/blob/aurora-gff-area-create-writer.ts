import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { AreaCreateCommand } from "../../../domain/area-create-command.types";

const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const TILE_STRUCT_TYPE_ID = 1;

/**
 * Emits the strict structural ARE candidate admitted for the narrow
 * AUR-S05-05 MicroSet/Tiny lane. Values not proven by the captured summary
 * remain versioned candidate defaults and require native Toolset/NWN proof
 * before this writer can be exposed as a production persistence route.
 */
export function serializeAurS0505AreaCreateCandidate(command: AreaCreateCommand): Buffer {
  const fields: SupportedGffField[] = [
    { label: "ChanceLightning", type: "int", value: 0 },
    { label: "ChanceRain", type: "int", value: 0 },
    { label: "ChanceSnow", type: "int", value: 0 },
    { label: "Comments", type: "cexostring", value: "" },
    { label: "Creator_ID", type: "int", value: -1 },
    { label: "DayNightCycle", type: "byte", value: 1 },
    { label: "Expansion_List", type: "list", value: [] },
    { label: "Flags", type: "dword", value: 0 },
    { label: "FogClipDist", type: "float", value: 45 },
    { label: "Height", type: "int", value: command.dimensions.height },
    { label: "ID", type: "int", value: -1 },
    { label: "IsNight", type: "byte", value: 0 },
    { label: "LightingScheme", type: "byte", value: 0 },
    { label: "LoadScreenID", type: "word", value: 0 },
    { label: "ModListenCheck", type: "int", value: 0 },
    { label: "ModSpotCheck", type: "int", value: 0 },
    { label: "MoonAmbientColor", type: "dword", value: 0 },
    { label: "MoonDiffuseColor", type: "dword", value: 13132900 },
    { label: "MoonFogAmount", type: "byte", value: 0 },
    { label: "MoonFogColor", type: "dword", value: 6566450 },
    { label: "MoonShadows", type: "byte", value: 1 },
    { label: "Name", type: "cexolocstring", value: { text: command.area.name } },
    { label: "NoRest", type: "byte", value: 0 },
    { label: "OnEnter", type: "resref", value: "" },
    { label: "OnExit", type: "resref", value: "" },
    { label: "OnHeartbeat", type: "resref", value: "" },
    { label: "OnUserDefined", type: "resref", value: "" },
    { label: "PlayerVsPlayer", type: "byte", value: 3 },
    { label: "ResRef", type: "resref", value: command.area.resRef },
    { label: "ShadowOpacity", type: "byte", value: 50 },
    { label: "SkyBox", type: "byte", value: 0 },
    { label: "SunAmbientColor", type: "dword", value: 6566450 },
    { label: "SunDiffuseColor", type: "dword", value: 16777215 },
    { label: "SunFogAmount", type: "byte", value: 0 },
    { label: "SunFogColor", type: "dword", value: 9535080 },
    { label: "SunShadows", type: "byte", value: 1 },
    { label: "Tag", type: "cexostring", value: command.area.tag },
    {
      label: "Tile_List",
      type: "list",
      value: command.tiles.map((tile) => ({
        typeId: TILE_STRUCT_TYPE_ID,
        fields: [
          { label: "Tile_ID", type: "int", value: tile.tileId },
          { label: "Tile_Orientation", type: "int", value: tile.orientation },
          { label: "Tile_Height", type: "int", value: tile.height },
          { label: "Tile_MainLight1", type: "byte", value: tile.mainLight1 },
          { label: "Tile_MainLight2", type: "byte", value: tile.mainLight2 },
          { label: "Tile_SrcLight1", type: "byte", value: tile.sourceLight1 },
          { label: "Tile_SrcLight2", type: "byte", value: tile.sourceLight2 },
          { label: "Tile_AnimLoop1", type: "byte", value: tile.animLoop1 },
          { label: "Tile_AnimLoop2", type: "byte", value: tile.animLoop2 },
          { label: "Tile_AnimLoop3", type: "byte", value: tile.animLoop3 },
        ],
      })),
    },
    { label: "TileBrdrDisabled", type: "byte", value: 0 },
    { label: "Tileset", type: "resref", value: command.tileset.resRef },
    { label: "Version", type: "dword", value: 3 },
    { label: "Width", type: "int", value: command.dimensions.width },
    { label: "WindPower", type: "int", value: 0 },
  ];
  return buildGffBuffer(fields, "ARE ", ROOT_STRUCT_TYPE_ID);
}
