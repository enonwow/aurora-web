export const AREA_DAY_NIGHT_MODES = Object.freeze([
  "cycle",
  "always_day",
  "always_night",
] as const);

export type AreaDayNightMode = (typeof AREA_DAY_NIGHT_MODES)[number];

export interface AreaVisualEnvironmentPhase {
  readonly ambientColor: number;
  readonly diffuseColor: number;
  readonly fogColor: number;
  readonly fogAmount: number;
  readonly shadows: boolean;
}

export interface AreaVisualEnvironment {
  readonly dayNightMode: AreaDayNightMode;
  readonly shadowOpacity: number;
  readonly chanceRain: number;
  readonly chanceSnow: number;
  readonly chanceLightning: number;
  readonly sun: AreaVisualEnvironmentPhase;
  readonly moon: AreaVisualEnvironmentPhase;
}

export interface ExistingAreaVisualEnvironmentMutation {
  readonly expectedValue: AreaVisualEnvironment;
  readonly value: AreaVisualEnvironment;
}

export interface EncodedAreaDayNightMode {
  readonly dayNightCycle: 0 | 1;
  readonly isNight: 0 | 1;
}

const ROOT_KEYS = new Set<keyof AreaVisualEnvironment>([
  "dayNightMode",
  "shadowOpacity",
  "chanceRain",
  "chanceSnow",
  "chanceLightning",
  "sun",
  "moon",
]);
const PHASE_KEYS = new Set<keyof AreaVisualEnvironmentPhase>([
  "ambientColor",
  "diffuseColor",
  "fogColor",
  "fogAmount",
  "shadows",
]);

function hasExactKeys<T extends string>(
  value: Record<string, unknown>,
  expected: ReadonlySet<T>,
): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key as T));
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function isAreaVisualEnvironmentPhase(value: unknown): value is AreaVisualEnvironmentPhase {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return hasExactKeys(record, PHASE_KEYS)
    && isIntegerInRange(record.ambientColor, 0, 0xff_ffff)
    && isIntegerInRange(record.diffuseColor, 0, 0xff_ffff)
    && isIntegerInRange(record.fogColor, 0, 0xff_ffff)
    && isIntegerInRange(record.fogAmount, 0, 15)
    && typeof record.shadows === "boolean";
}

export function isAreaVisualEnvironment(value: unknown): value is AreaVisualEnvironment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return hasExactKeys(record, ROOT_KEYS)
    && AREA_DAY_NIGHT_MODES.includes(record.dayNightMode as AreaDayNightMode)
    && isIntegerInRange(record.shadowOpacity, 0, 100)
    && isIntegerInRange(record.chanceRain, 0, 100)
    && isIntegerInRange(record.chanceSnow, 0, 100)
    && isIntegerInRange(record.chanceLightning, 0, 100)
    && isAreaVisualEnvironmentPhase(record.sun)
    && isAreaVisualEnvironmentPhase(record.moon);
}

export function decodeAreaDayNightMode(
  dayNightCycle: unknown,
  isNight: unknown,
): AreaDayNightMode | undefined {
  if (dayNightCycle === 1 && isNight === 0) return "cycle";
  if (dayNightCycle === 0 && isNight === 0) return "always_day";
  if (dayNightCycle === 0 && isNight === 1) return "always_night";
  return undefined;
}

export function encodeAreaDayNightMode(mode: AreaDayNightMode): EncodedAreaDayNightMode {
  switch (mode) {
    case "cycle":
      return Object.freeze({ dayNightCycle: 1, isNight: 0 });
    case "always_day":
      return Object.freeze({ dayNightCycle: 0, isNight: 0 });
    case "always_night":
      return Object.freeze({ dayNightCycle: 0, isNight: 1 });
  }
}

export function areaVisualEnvironmentsEqual(left: unknown, right: unknown): boolean {
  if (!isAreaVisualEnvironment(left) || !isAreaVisualEnvironment(right)) return false;
  return left.dayNightMode === right.dayNightMode
    && left.shadowOpacity === right.shadowOpacity
    && left.chanceRain === right.chanceRain
    && left.chanceSnow === right.chanceSnow
    && left.chanceLightning === right.chanceLightning
    && phasesEqual(left.sun, right.sun)
    && phasesEqual(left.moon, right.moon);
}

function phasesEqual(
  left: AreaVisualEnvironmentPhase,
  right: AreaVisualEnvironmentPhase,
): boolean {
  return left.ambientColor === right.ambientColor
    && left.diffuseColor === right.diffuseColor
    && left.fogColor === right.fogColor
    && left.fogAmount === right.fogAmount
    && left.shadows === right.shadows;
}
