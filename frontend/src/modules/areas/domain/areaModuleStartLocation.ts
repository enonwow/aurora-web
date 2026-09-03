export interface AreaModuleStartLocation {
  readonly areaResRef: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly directionX: number;
  readonly directionY: number;
}

export interface ExistingAreaModuleStartLocationMutation {
  readonly expectedValue: AreaModuleStartLocation;
  readonly value: AreaModuleStartLocation;
}

const KEYS = ["areaResRef", "x", "y", "z", "directionX", "directionY"] as const;
const FLOAT_KEYS = ["x", "y", "z", "directionX", "directionY"] as const;
export const MAX_MODULE_START_LOCATION_TARGETS = 4096;

export function isAreaModuleStartLocation(value: unknown): value is AreaModuleStartLocation {
  if (!isRecord(value) || !hasExactKeys(value)) return false;
  return typeof value.areaResRef === "string"
    && /^[a-z0-9_]{1,16}$/u.test(value.areaResRef)
    && FLOAT_KEYS.every((key) => typeof value[key] === "number"
      && Number.isFinite(value[key])
      && Math.fround(value[key]) === value[key]);
}

export function normalizeAreaModuleStartLocation(
  value: unknown,
): AreaModuleStartLocation | null {
  if (!isRecord(value) || !hasExactKeys(value)
      || typeof value.areaResRef !== "string"
      || !/^[a-z0-9_]{1,16}$/u.test(value.areaResRef)) return null;
  const numbers: Record<(typeof FLOAT_KEYS)[number], number> = {
    x: 0, y: 0, z: 0, directionX: 0, directionY: 0,
  };
  for (const key of FLOAT_KEYS) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) return null;
    const stored = Math.fround(value[key]);
    if (!Number.isFinite(stored)) return null;
    numbers[key] = Object.is(stored, -0) ? 0 : stored;
  }
  return Object.freeze({ areaResRef: value.areaResRef, ...numbers });
}

export function areaModuleStartLocationsEqual(
  left: AreaModuleStartLocation,
  right: AreaModuleStartLocation,
): boolean {
  return left.areaResRef === right.areaResRef
    && FLOAT_KEYS.every((key) => left[key] === right[key]);
}

export function readModuleStartLocationTargets(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length < 1
      || value.length > MAX_MODULE_START_LOCATION_TARGETS) return null;
  if (!value.every((entry) => typeof entry === "string"
      && /^[a-z0-9_]{1,16}$/u.test(entry))) return null;
  const targets = value as string[];
  const sorted = [...targets].sort((left, right) => left.localeCompare(right));
  if (new Set(targets).size !== targets.length
      || targets.some((target, index) => target !== sorted[index])) return null;
  return Object.freeze([...targets]);
}

function hasExactKeys(value: Record<string, unknown>): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...KEYS].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
