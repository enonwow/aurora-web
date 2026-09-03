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
    && isIntegerInRange(
      record.fogClipDistance,
      AREA_FOG_CLIP_DISTANCE_MINIMUM,
      AREA_FOG_CLIP_DISTANCE_MAXIMUM,
    )
    && isIntegerInRange(
      record.windPower,
      AREA_WIND_POWER_MINIMUM,
      AREA_WIND_POWER_MAXIMUM,
    );
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

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}
