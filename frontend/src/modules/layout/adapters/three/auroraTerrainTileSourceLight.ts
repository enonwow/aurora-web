export type AuroraTerrainTileSourceLightColor = readonly [number, number, number];

export interface AuroraTerrainTileSourceLightProfile {
  rowId: number;
  animationName: string;
  color: AuroraTerrainTileSourceLightColor;
  colorSource: string;
  multiplier: number;
  multiplierSource: string;
  sourceModelFileName: string;
  sourceModelHash: string;
  proofStatus: string;
  staleColorCorrectionStatus:
    | "corrected-stale-tilecolor-source"
    | "source-model-animation-color"
    | "vanilla-source-model-animation-color";
}

interface AuroraTerrainTileSourceLightInput {
  color?: AuroraTerrainTileSourceLightColor;
  colorSource?: string;
  animationName?: string;
  sourceModelFileName?: string;
  sourceModelHash?: string;
  multiplier?: number;
  multiplierSource?: string;
  proofStatus?: string;
}

export const AURORA_TERRAIN_TILE_SOURCE_LIGHT_MODEL_FILE_NAME = "fx_flame01.mdl";
export const AURORA_TERRAIN_TILE_SOURCE_LIGHT_MODEL_HASH =
  "9814d45381cab7ecb5f47f9b16bdeb23b983687ff0b9bcb0244ffc04034dfecf";
export const AURORA_TERRAIN_TILE_SOURCE_LIGHT_PROOF_STATUS =
  "source-backed-fx_flame01-animation-color-partlight-default-multiplier";
export const AURORA_TERRAIN_TILE_SOURCE_LIGHT_COLOR_SOURCE =
  "nwtoolset.exe FUN_007125ec selects fx_flame01.mdl animation name %i from Tile_SrcLight1/2; admitted retail fx_flame01.mdl AuroraLight01 color timeline";
export const AURORA_TERRAIN_TILE_SOURCE_LIGHT_MULTIPLIER_SOURCE =
  "nwmain.exe PartLight::PartLight 0x140087e00 writes default multiplier 1.0 to PartLight+0xa8 at 0x140087ea2; GetLightAdjustedRadius reads it at 0x14007f4aa";

const animationColors = new Map<number, AuroraTerrainTileSourceLightColor>([
  [1, [2, 2, 2]],
  [2, [Math.fround(0.94), Math.fround(0.94), Math.fround(0.5)]],
  [3, [Math.fround(1.9), Math.fround(1.9), 1]],
  [4, [Math.fround(0.72), Math.fround(0.87), Math.fround(0.56)]],
  [5, [Math.fround(1.4), Math.fround(1.8), Math.fround(1.4)]],
  [6, [Math.fround(0.65), Math.fround(0.96), Math.fround(0.91)]],
  [7, [Math.fround(1.3), Math.fround(1.92), Math.fround(1.82)]],
  [8, [Math.fround(0.7), Math.fround(0.7), Math.fround(1.2)]],
  [9, [Math.fround(1.4), Math.fround(1.4), Math.fround(2.4)]],
  [10, [Math.fround(0.92), Math.fround(0.65), Math.fround(0.92)]],
  [11, [Math.fround(1.84), Math.fround(1.3), Math.fround(1.84)]],
  [12, [1, Math.fround(0.5), Math.fround(0.5)]],
  [13, [2, Math.fround(1.2), Math.fround(1.2)]],
  [14, [1, Math.fround(0.75), Math.fround(0.3)]],
  [15, [Math.fround(1.85), Math.fround(1.2), Math.fround(0.6)]]
]);

export function resolveAuroraTerrainTileSourceLightProfile(
  rowId: number,
  input: AuroraTerrainTileSourceLightInput = {}
): AuroraTerrainTileSourceLightProfile | null {
  if (!Number.isInteger(rowId) || rowId <= 0) {
    return null;
  }
  const canonicalColor = animationColors.get(rowId);
  if (!canonicalColor) {
    return null;
  }
  const normalizedSource = input.colorSource?.trim().toLowerCase() ?? "";
  const hasModelBackedColor =
    normalizedSource.includes("fx_flame01") &&
    input.color?.length === 3 &&
    input.color.every((component) => Number.isFinite(component));
  const staleColorCorrectionStatus = normalizedSource.includes("tilecolor.2da")
    ? "corrected-stale-tilecolor-source"
    : normalizedSource.includes("fx_flame01")
      ? "source-model-animation-color"
      : "vanilla-source-model-animation-color";

  return {
    rowId,
    animationName: input.animationName ?? String(rowId),
    color: hasModelBackedColor && input.color ? input.color : canonicalColor,
    colorSource: hasModelBackedColor
      ? `${AURORA_TERRAIN_TILE_SOURCE_LIGHT_COLOR_SOURCE}; source=${input.colorSource}`
      : AURORA_TERRAIN_TILE_SOURCE_LIGHT_COLOR_SOURCE,
    multiplier:
      typeof input.multiplier === "number" && Number.isFinite(input.multiplier)
        ? input.multiplier
        : 1,
    multiplierSource:
      input.multiplierSource ?? AURORA_TERRAIN_TILE_SOURCE_LIGHT_MULTIPLIER_SOURCE,
    sourceModelFileName:
      input.sourceModelFileName ?? AURORA_TERRAIN_TILE_SOURCE_LIGHT_MODEL_FILE_NAME,
    sourceModelHash:
      input.sourceModelHash ?? AURORA_TERRAIN_TILE_SOURCE_LIGHT_MODEL_HASH,
    proofStatus: input.proofStatus ?? AURORA_TERRAIN_TILE_SOURCE_LIGHT_PROOF_STATUS,
    staleColorCorrectionStatus
  };
}
