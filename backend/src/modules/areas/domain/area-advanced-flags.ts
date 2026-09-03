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

const ADVANCED_FLAG_KEYS = Object.freeze([
  "terrainType",
  "playerVsPlayer",
  "noRest",
  "listenCheckModifier",
  "spotCheckModifier",
  "loadingScreenId",
] as const);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"] as const);
const TERRAIN_KEYS = Object.freeze(["interior", "natural", "subterranean"] as const);

export function isAreaPlayerVsPlayerMode(value: unknown): value is AreaPlayerVsPlayerMode {
  return Number.isInteger(value) && typeof value === "number" && value >= 0 && value <= 3;
}

export function isAreaCheckModifier(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= -99 && value <= 99;
}

export function isAreaLoadingScreenId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

export function isAreaTerrainTypeFlags(value: unknown): value is AreaTerrainTypeFlags {
  return isRecord(value)
    && hasExactKeys(value, TERRAIN_KEYS)
    && TERRAIN_KEYS.every((key) => typeof value[key] === "boolean");
}

export function decodeAreaTerrainTypeFlags(value: unknown): AreaTerrainTypeFlags | null {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0 || value > 7) {
    return null;
  }
  return Object.freeze({
    interior: (value & 0x01) !== 0,
    natural: (value & 0x04) !== 0,
    subterranean: (value & 0x02) !== 0,
  });
}

export function encodeAreaTerrainTypeFlags(value: AreaTerrainTypeFlags): number {
  return (value.interior ? 0x01 : 0)
    | (value.subterranean ? 0x02 : 0)
    | (value.natural ? 0x04 : 0);
}

export function isAreaAdvancedFlags(value: unknown): value is AreaAdvancedFlags {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !ADVANCED_FLAG_KEYS.includes(key as never))) {
    return false;
  }
  return (!Object.prototype.hasOwnProperty.call(value, "terrainType")
      || isAreaTerrainTypeFlags(value.terrainType))
    && (!Object.prototype.hasOwnProperty.call(value, "playerVsPlayer")
      || isAreaPlayerVsPlayerMode(value.playerVsPlayer))
    && (!Object.prototype.hasOwnProperty.call(value, "noRest")
      || typeof value.noRest === "boolean")
    && (!Object.prototype.hasOwnProperty.call(value, "listenCheckModifier")
      || isAreaCheckModifier(value.listenCheckModifier))
    && (!Object.prototype.hasOwnProperty.call(value, "spotCheckModifier")
      || isAreaCheckModifier(value.spotCheckModifier))
    && (!Object.prototype.hasOwnProperty.call(value, "loadingScreenId")
      || isAreaLoadingScreenId(value.loadingScreenId));
}

export function readExistingAreaAdvancedFlagMutations(
  value: unknown,
): ExistingAreaAdvancedFlagMutations | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !ADVANCED_FLAG_KEYS.includes(key as never))) {
    return null;
  }

  const result: {
    terrainType?: ExistingAreaAdvancedFlagMutation<AreaTerrainTypeFlags>;
    playerVsPlayer?: ExistingAreaAdvancedFlagMutation<AreaPlayerVsPlayerMode>;
    noRest?: ExistingAreaAdvancedFlagMutation<boolean>;
    listenCheckModifier?: ExistingAreaAdvancedFlagMutation<number>;
    spotCheckModifier?: ExistingAreaAdvancedFlagMutation<number>;
    loadingScreenId?: ExistingAreaAdvancedFlagMutation<number>;
  } = {};

  for (const key of ADVANCED_FLAG_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const candidate = value[key];
    if (!isRecord(candidate) || !hasExactKeys(candidate, MUTATION_KEYS)) return null;

    if (key === "terrainType") {
      if (
        !isAreaTerrainTypeFlags(candidate.expectedValue)
        || !isAreaTerrainTypeFlags(candidate.value)
        || terrainTypeFlagsEqual(candidate.expectedValue, candidate.value)
      ) {
        return null;
      }
      result.terrainType = Object.freeze({
        expectedValue: freezeTerrainType(candidate.expectedValue),
        value: freezeTerrainType(candidate.value),
      });
      continue;
    }

    if (key === "playerVsPlayer") {
      if (
        !isAreaPlayerVsPlayerMode(candidate.expectedValue)
        || !isAreaPlayerVsPlayerMode(candidate.value)
        || candidate.expectedValue === candidate.value
      ) {
        return null;
      }
      result.playerVsPlayer = Object.freeze({
        expectedValue: candidate.expectedValue,
        value: candidate.value,
      });
      continue;
    }

    if (key === "listenCheckModifier" || key === "spotCheckModifier") {
      if (
        !isAreaCheckModifier(candidate.expectedValue)
        || !isAreaCheckModifier(candidate.value)
        || candidate.expectedValue === candidate.value
      ) {
        return null;
      }
      const pair = Object.freeze({
        expectedValue: candidate.expectedValue,
        value: candidate.value,
      });
      if (key === "listenCheckModifier") result.listenCheckModifier = pair;
      else result.spotCheckModifier = pair;
      continue;
    }

    if (key === "loadingScreenId") {
      if (
        !isAreaLoadingScreenId(candidate.expectedValue)
        || !isAreaLoadingScreenId(candidate.value)
        || candidate.expectedValue === candidate.value
      ) {
        return null;
      }
      result.loadingScreenId = Object.freeze({
        expectedValue: candidate.expectedValue,
        value: candidate.value,
      });
      continue;
    }

    if (
      typeof candidate.expectedValue !== "boolean"
      || typeof candidate.value !== "boolean"
      || candidate.expectedValue === candidate.value
    ) {
      return null;
    }
    result.noRest = Object.freeze({
      expectedValue: candidate.expectedValue,
      value: candidate.value,
    });
  }

  return Object.freeze(result);
}

export function terrainTypeFlagsEqual(
  left: AreaTerrainTypeFlags,
  right: AreaTerrainTypeFlags,
): boolean {
  return left.interior === right.interior
    && left.natural === right.natural
    && left.subterranean === right.subterranean;
}

function freezeTerrainType(value: AreaTerrainTypeFlags): AreaTerrainTypeFlags {
  return Object.freeze({
    interior: value.interior,
    natural: value.natural,
    subterranean: value.subterranean,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
