export type AreaPlayerVsPlayerMode = 0 | 1 | 2 | 3;

export interface AreaTerrainTypeFlags {
  readonly interior: boolean;
  readonly natural: boolean;
  readonly subterranean: boolean;
}

export interface AreaAdvancedFlags {
  readonly terrainType?: AreaTerrainTypeFlags;
  readonly playerVsPlayer?: AreaPlayerVsPlayerMode;
  readonly noRest?: boolean;
  readonly listenCheckModifier?: number;
  readonly spotCheckModifier?: number;
  readonly loadingScreenId?: number;
}

export interface ExistingAreaAdvancedFlagMutation<T> {
  readonly expectedValue: T;
  readonly value: T;
}

export interface ExistingAreaAdvancedFlagMutations {
  readonly terrainType?: ExistingAreaAdvancedFlagMutation<AreaTerrainTypeFlags>;
  readonly playerVsPlayer?: ExistingAreaAdvancedFlagMutation<AreaPlayerVsPlayerMode>;
  readonly noRest?: ExistingAreaAdvancedFlagMutation<boolean>;
  readonly listenCheckModifier?: ExistingAreaAdvancedFlagMutation<number>;
  readonly spotCheckModifier?: ExistingAreaAdvancedFlagMutation<number>;
  readonly loadingScreenId?: ExistingAreaAdvancedFlagMutation<number>;
}

const ADVANCED_KEYS = new Set([
  "terrainType",
  "playerVsPlayer",
  "noRest",
  "listenCheckModifier",
  "spotCheckModifier",
  "loadingScreenId",
]);
const TERRAIN_KEYS = new Set(["interior", "natural", "subterranean"]);

export function isAreaPlayerVsPlayerMode(value: unknown): value is AreaPlayerVsPlayerMode {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;
}

export function isAreaCheckModifier(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= -99 && value <= 99;
}

export function isAreaLoadingScreenId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

export function isAreaTerrainTypeFlags(value: unknown): value is AreaTerrainTypeFlags {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === TERRAIN_KEYS.size
    && keys.every((key) => TERRAIN_KEYS.has(key))
    && typeof value.interior === "boolean"
    && typeof value.natural === "boolean"
    && typeof value.subterranean === "boolean";
}

export function isAreaAdvancedFlags(value: unknown): value is AreaAdvancedFlags {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !ADVANCED_KEYS.has(key))) return false;
  return (value.terrainType === undefined || isAreaTerrainTypeFlags(value.terrainType))
    && (value.playerVsPlayer === undefined || isAreaPlayerVsPlayerMode(value.playerVsPlayer))
    && (value.noRest === undefined || typeof value.noRest === "boolean")
    && (value.listenCheckModifier === undefined
      || isAreaCheckModifier(value.listenCheckModifier))
    && (value.spotCheckModifier === undefined
      || isAreaCheckModifier(value.spotCheckModifier))
    && (value.loadingScreenId === undefined
      || isAreaLoadingScreenId(value.loadingScreenId));
}

export function terrainTypeFlagsEqual(
  left: AreaTerrainTypeFlags,
  right: AreaTerrainTypeFlags,
): boolean {
  return left.interior === right.interior
    && left.natural === right.natural
    && left.subterranean === right.subterranean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
