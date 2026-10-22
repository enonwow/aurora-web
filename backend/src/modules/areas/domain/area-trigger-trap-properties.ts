export const AREA_TRIGGER_TRAP_PROPERTY_FIELDS = Object.freeze([
  Object.freeze({ key: "trapDetectable", label: "TrapDetectable", type: "byte" }),
  Object.freeze({ key: "trapDetectDc", label: "TrapDetectDC", type: "byte" }),
  Object.freeze({ key: "trapDisarmable", label: "TrapDisarmable", type: "byte" }),
  Object.freeze({ key: "disarmDc", label: "DisarmDC", type: "byte" }),
  Object.freeze({ key: "trapFlag", label: "TrapFlag", type: "byte" }),
  Object.freeze({ key: "trapOneShot", label: "TrapOneShot", type: "byte" }),
  Object.freeze({ key: "trapType", label: "TrapType", type: "byte" }),
] as const);

const TRAP_PROPERTY_KEYS = Object.freeze(
  AREA_TRIGGER_TRAP_PROPERTY_FIELDS.map((field) => field.key),
);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"] as const);

export interface AreaTriggerTrapProperties {
  readonly trapDetectable: number;
  readonly trapDetectDc: number;
  readonly trapDisarmable: number;
  readonly disarmDc: number;
  readonly trapFlag: number;
  readonly trapOneShot: number;
  readonly trapType: number;
}

export interface ExistingAreaTriggerTrapPropertiesMutation {
  readonly expectedValue: AreaTriggerTrapProperties;
  readonly value: AreaTriggerTrapProperties;
}

export function isAreaTriggerTrapProperties(
  value: unknown,
): value is AreaTriggerTrapProperties {
  if (!isPlainRecord(value) || !hasExactKeys(value, TRAP_PROPERTY_KEYS)) return false;
  return TRAP_PROPERTY_KEYS.every((key) => isByte(value[key]));
}

export function areaTriggerTrapPropertiesEqual(left: unknown, right: unknown): boolean {
  if (!isAreaTriggerTrapProperties(left) || !isAreaTriggerTrapProperties(right)) return false;
  return TRAP_PROPERTY_KEYS.every((key) => left[key] === right[key]);
}

export function cloneAreaTriggerTrapProperties(
  value: AreaTriggerTrapProperties,
): AreaTriggerTrapProperties {
  return Object.freeze({ ...value });
}

export function readExistingAreaTriggerTrapPropertiesMutation(
  value: unknown,
): ExistingAreaTriggerTrapPropertiesMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS)
    || !isAreaTriggerTrapProperties(value.expectedValue)
    || !isAreaTriggerTrapProperties(value.value)
    || areaTriggerTrapPropertiesEqual(value.expectedValue, value.value)) return null;
  return Object.freeze({
    expectedValue: cloneAreaTriggerTrapProperties(value.expectedValue),
    value: cloneAreaTriggerTrapProperties(value.value),
  });
}

function isByte(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xff;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}
