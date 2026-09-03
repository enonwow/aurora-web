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

const EXACT_KEYS = Object.freeze([
  "areaResRef",
  "x",
  "y",
  "z",
  "directionX",
  "directionY",
] as const);
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;

export function isAreaModuleStartLocation(
  value: unknown,
): value is AreaModuleStartLocation {
  if (!isRecord(value) || !hasExactKeys(value)) return false;
  return typeof value.areaResRef === "string"
    && RESREF_PATTERN.test(value.areaResRef)
    && FLOAT_KEYS.every((key) => isExactFiniteFloat32(value[key]));
}

export function normalizeAreaModuleStartLocation(
  value: unknown,
): AreaModuleStartLocation | null {
  if (!isRecord(value) || !hasExactKeys(value)) return null;
  if (typeof value.areaResRef !== "string" || !RESREF_PATTERN.test(value.areaResRef)) {
    return null;
  }
  const normalized: Record<(typeof FLOAT_KEYS)[number], number> = {
    x: 0,
    y: 0,
    z: 0,
    directionX: 0,
    directionY: 0,
  };
  for (const key of FLOAT_KEYS) {
    const input = value[key];
    if (typeof input !== "number" || !Number.isFinite(input)) return null;
    const stored = Math.fround(input);
    if (!Number.isFinite(stored)) return null;
    normalized[key] = Object.is(stored, -0) ? 0 : stored;
  }
  return Object.freeze({ areaResRef: value.areaResRef, ...normalized });
}

export function areaModuleStartLocationsEqual(
  left: AreaModuleStartLocation,
  right: AreaModuleStartLocation,
): boolean {
  return left.areaResRef === right.areaResRef
    && FLOAT_KEYS.every((key) => left[key] === right[key]);
}

const FLOAT_KEYS = Object.freeze([
  "x",
  "y",
  "z",
  "directionX",
  "directionY",
] as const);

function hasExactKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === EXACT_KEYS.length
    && keys.every((key, index) => key === [...EXACT_KEYS].sort()[index]);
}

function isExactFiniteFloat32(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && Number.isFinite(Math.fround(value))
    && Math.fround(value) === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
