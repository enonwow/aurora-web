export const AREA_FOG_CLIP_DISTANCE_MINIMUM = 30;
export const AREA_FOG_CLIP_DISTANCE_MAXIMUM = 9999;
export const AREA_WIND_POWER_MINIMUM = 0;
export const AREA_WIND_POWER_MAXIMUM = 2;

export interface AreaVisualEnvironmentScalarControls {
  readonly fogClipDistance: number;
  readonly windPower: number;
}

export interface ExistingAreaVisualEnvironmentScalarControlsMutation {
  readonly expectedValue: AreaVisualEnvironmentScalarControls;
  readonly value: AreaVisualEnvironmentScalarControls;
}

export type AreaVisualEnvironmentScalarLightingField = Readonly<{
  field: "FogClipDist" | "WindPower";
  value: number;
}>;

const EXACT_KEYS = new Set<keyof AreaVisualEnvironmentScalarControls>([
  "fogClipDistance",
  "windPower",
]);

export function isAreaVisualEnvironmentScalarControls(
  value: unknown,
): value is AreaVisualEnvironmentScalarControls {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length === EXACT_KEYS.size
    && keys.every((key) => EXACT_KEYS.has(key as keyof AreaVisualEnvironmentScalarControls))
    && Number.isInteger(record.fogClipDistance)
    && (record.fogClipDistance as number) >= AREA_FOG_CLIP_DISTANCE_MINIMUM
    && (record.fogClipDistance as number) <= AREA_FOG_CLIP_DISTANCE_MAXIMUM
    && Number.isInteger(record.windPower)
    && (record.windPower as number) >= AREA_WIND_POWER_MINIMUM
    && (record.windPower as number) <= AREA_WIND_POWER_MAXIMUM;
}

export function cloneAreaVisualEnvironmentScalarControls(
  value: AreaVisualEnvironmentScalarControls,
): AreaVisualEnvironmentScalarControls {
  return {
    fogClipDistance: value.fogClipDistance,
    windPower: value.windPower,
  };
}

export function areaVisualEnvironmentScalarControlsEqual(
  left: unknown,
  right: unknown,
): boolean {
  return isAreaVisualEnvironmentScalarControls(left)
    && isAreaVisualEnvironmentScalarControls(right)
    && left.fogClipDistance === right.fogClipDistance
    && left.windPower === right.windPower;
}

export function toAreaVisualEnvironmentScalarLightingFields(
  value: AreaVisualEnvironmentScalarControls,
): readonly AreaVisualEnvironmentScalarLightingField[] {
  return [
    { field: "FogClipDist", value: value.fogClipDistance },
    { field: "WindPower", value: value.windPower },
  ];
}
