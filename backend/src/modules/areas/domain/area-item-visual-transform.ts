export const AREA_ITEM_VISUAL_TRANSFORM_KEYS = Object.freeze([
  "scaleX",
  "scaleY",
  "scaleZ",
  "rotateX",
  "rotateY",
  "rotateZ",
  "translateX",
  "translateY",
  "translateZ",
] as const);

export type AreaItemVisualTransformKey =
  typeof AREA_ITEM_VISUAL_TRANSFORM_KEYS[number];

export interface AreaItemVisualTransformValue {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;
  readonly rotateX: number;
  readonly rotateY: number;
  readonly rotateZ: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly translateZ: number;
}

export type AreaItemVisualTransformStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: AreaItemVisualTransformValue }>;

export interface AreaItemVisualTransformMutation {
  readonly expectedValue: AreaItemVisualTransformStorage;
  readonly value: AreaItemVisualTransformStorage;
}

export const AREA_ITEM_VISUAL_TRANSFORM_DEFAULT_VALUE:
  AreaItemVisualTransformValue = Object.freeze({
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
  });

const SCALE_KEYS = new Set<AreaItemVisualTransformKey>([
  "scaleX",
  "scaleY",
  "scaleZ",
]);
const ROTATION_KEYS = new Set<AreaItemVisualTransformKey>([
  "rotateX",
  "rotateY",
  "rotateZ",
]);

export class AreaItemVisualTransformValidationError extends Error {
  constructor(message: string, readonly path: string) {
    super(message);
    this.name = "AreaItemVisualTransformValidationError";
  }
}

export function parseAreaItemVisualTransformStorage(
  input: unknown,
  path: string,
): AreaItemVisualTransformStorage {
  const record = exactRecord(input, ["present", "value"], path, true);
  if (typeof record.present !== "boolean") {
    fail("Expected a boolean visual-transform presence flag.", `${path}.present`);
  }
  if (!record.present) {
    if (Object.prototype.hasOwnProperty.call(record, "value")) {
      fail("Absent visual-transform storage cannot carry a value.", `${path}.value`);
    }
    return Object.freeze({ present: false });
  }
  if (!Object.prototype.hasOwnProperty.call(record, "value")) {
    fail("Present visual-transform storage requires a value.", `${path}.value`);
  }
  const value = parseAreaItemVisualTransformValue(record.value, `${path}.value`);
  if (areaItemVisualTransformValueEqual(
    value,
    AREA_ITEM_VISUAL_TRANSFORM_DEFAULT_VALUE,
  )) {
    fail(
      "A physically present visual-transform list must be non-default.",
      `${path}.value`,
    );
  }
  return Object.freeze({ present: true, value });
}

export function parseAreaItemVisualTransformValue(
  input: unknown,
  path: string,
): AreaItemVisualTransformValue {
  const record = exactRecord(
    input,
    AREA_ITEM_VISUAL_TRANSFORM_KEYS,
    path,
    false,
  );
  const result = {} as Record<AreaItemVisualTransformKey, number>;
  for (const key of AREA_ITEM_VISUAL_TRANSFORM_KEYS) {
    const value = binary32(record[key], `${path}.${key}`);
    if (SCALE_KEYS.has(key) && (value < 0.01 || value > 1000)) {
      fail("Expected a scale value in 0.01..1000.", `${path}.${key}`);
    }
    if (ROTATION_KEYS.has(key) && Math.abs(value) > 360000) {
      fail("Expected a rotation value in -360000..360000.", `${path}.${key}`);
    }
    if (!SCALE_KEYS.has(key) && !ROTATION_KEYS.has(key) && Math.abs(value) > 1000000) {
      fail("Expected a translation value in -1000000..1000000.", `${path}.${key}`);
    }
    result[key] = value;
  }
  return Object.freeze(result) as unknown as AreaItemVisualTransformValue;
}

export function parseAreaItemVisualTransformMutation(
  input: unknown,
  path: string,
): AreaItemVisualTransformMutation {
  const record = exactRecord(
    input,
    ["expectedValue", "value"],
    path,
    false,
  );
  const expectedValue = parseAreaItemVisualTransformStorage(
    record.expectedValue,
    `${path}.expectedValue`,
  );
  const value = parseAreaItemVisualTransformStorage(
    record.value,
    `${path}.value`,
  );
  if (areaItemVisualTransformStorageEqual(expectedValue, value)) {
    fail("An Item visual-transform mutation must change the source value.", path);
  }
  return Object.freeze({ expectedValue, value });
}

export function areaItemVisualTransformStorageEqual(
  left: AreaItemVisualTransformStorage,
  right: AreaItemVisualTransformStorage,
): boolean {
  if (left.present !== right.present) return false;
  if (!left.present || !right.present) return true;
  return areaItemVisualTransformValueEqual(left.value, right.value);
}

export function areaItemVisualTransformValueEqual(
  left: AreaItemVisualTransformValue,
  right: AreaItemVisualTransformValue,
): boolean {
  return AREA_ITEM_VISUAL_TRANSFORM_KEYS.every((key) => left[key] === right[key]);
}

function binary32(input: unknown, path: string): number {
  if (typeof input !== "number" || !Number.isFinite(input) || Math.fround(input) !== input) {
    fail("Expected an exact finite IEEE-754 binary32 number.", path);
  }
  return input;
}

function exactRecord(
  input: unknown,
  allowedKeys: readonly string[],
  path: string,
  optionalValue: boolean,
): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail("Expected an Item visual-transform object.", path);
  }
  const value = input as Readonly<Record<string, unknown>>;
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    fail(`Unexpected Item visual-transform field '${unexpected}'.`, `${path}.${unexpected}`);
  }
  for (const key of allowedKeys) {
    if (optionalValue && key === "value") continue;
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail(`Missing Item visual-transform field '${key}'.`, `${path}.${key}`);
    }
  }
  return value;
}

function fail(message: string, path: string): never {
  throw new AreaItemVisualTransformValidationError(message, path);
}
