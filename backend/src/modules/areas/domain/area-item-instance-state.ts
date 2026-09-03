export const AREA_ITEM_INSTANCE_STATE_FIELDS = Object.freeze([
  Object.freeze({ key: "charges", label: "Charges", nativeType: "byte", defaultValue: 50, minimum: 0, maximum: 0xff, valueKind: "number" }),
  Object.freeze({ key: "cost", label: "Cost", nativeType: "dword", defaultValue: 0, minimum: 0, maximum: 0xffff_ffff, valueKind: "number" }),
  Object.freeze({ key: "stolen", label: "Stolen", nativeType: "byte", defaultValue: false, minimum: 0, maximum: 1, valueKind: "boolean" }),
  Object.freeze({ key: "stackSize", label: "StackSize", nativeType: "word", defaultValue: 1, minimum: 0, maximum: 0xffff, valueKind: "number" }),
  Object.freeze({ key: "plot", label: "Plot", nativeType: "byte", defaultValue: false, minimum: 0, maximum: 1, valueKind: "boolean" }),
  Object.freeze({ key: "addCost", label: "AddCost", nativeType: "dword", defaultValue: 0, minimum: 0, maximum: 0xffff_ffff, valueKind: "number" }),
  Object.freeze({ key: "identified", label: "Identified", nativeType: "byte", defaultValue: false, minimum: 0, maximum: 1, valueKind: "boolean" }),
  Object.freeze({ key: "cursed", label: "Cursed", nativeType: "byte", defaultValue: false, minimum: 0, maximum: 1, valueKind: "boolean" }),
] as const);

export type AreaItemInstanceStateField =
  typeof AREA_ITEM_INSTANCE_STATE_FIELDS[number]["key"];

export interface AreaItemInstanceStateValue {
  readonly charges: number;
  readonly cost: number;
  readonly stolen: boolean;
  readonly stackSize: number;
  readonly plot: boolean;
  readonly addCost: number;
  readonly identified: boolean;
  readonly cursed: boolean;
}

export interface AreaItemInstanceStateStorage {
  readonly presentFields: readonly AreaItemInstanceStateField[];
  readonly values: AreaItemInstanceStateValue;
}

export interface ExistingAreaItemInstanceStateMutation {
  readonly expectedValue: AreaItemInstanceStateStorage;
  readonly value: AreaItemInstanceStateValue;
}

export const AREA_ITEM_INSTANCE_STATE_DEFAULTS: AreaItemInstanceStateValue = Object.freeze({
  charges: 50,
  cost: 0,
  stolen: false,
  stackSize: 1,
  plot: false,
  addCost: 0,
  identified: false,
  cursed: false,
});

const VALUE_KEYS = AREA_ITEM_INSTANCE_STATE_FIELDS.map((field) => field.key);
const FIELD_INDEX = new Map(
  AREA_ITEM_INSTANCE_STATE_FIELDS.map((field, index) => [field.key, index] as const),
);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

export function readAreaItemInstanceStateValue(
  input: unknown,
): AreaItemInstanceStateValue | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, VALUE_KEYS)) return null;
  for (const profile of AREA_ITEM_INSTANCE_STATE_FIELDS) {
    const value = input[profile.key];
    if (profile.valueKind === "boolean") {
      if (typeof value !== "boolean") return null;
    } else if (!isIntegerInRange(value, profile.minimum, profile.maximum)) {
      return null;
    }
  }
  return Object.freeze({
    charges: input.charges as number,
    cost: input.cost as number,
    stolen: input.stolen as boolean,
    stackSize: input.stackSize as number,
    plot: input.plot as boolean,
    addCost: input.addCost as number,
    identified: input.identified as boolean,
    cursed: input.cursed as boolean,
  });
}

export function readAreaItemInstanceStateStorage(
  input: unknown,
): AreaItemInstanceStateStorage | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["presentFields", "values"]) ||
    !Array.isArray(input.presentFields)) return null;
  const values = readAreaItemInstanceStateValue(input.values);
  if (!values) return null;
  const presentFields: AreaItemInstanceStateField[] = [];
  let previousIndex = -1;
  for (const rawField of input.presentFields) {
    if (typeof rawField !== "string" || !FIELD_INDEX.has(rawField as AreaItemInstanceStateField)) {
      return null;
    }
    const field = rawField as AreaItemInstanceStateField;
    const index = FIELD_INDEX.get(field)!;
    if (index <= previousIndex) return null;
    previousIndex = index;
    presentFields.push(field);
  }
  const present = new Set(presentFields);
  for (const profile of AREA_ITEM_INSTANCE_STATE_FIELDS) {
    if (!present.has(profile.key) && values[profile.key] !== AREA_ITEM_INSTANCE_STATE_DEFAULTS[profile.key]) {
      return null;
    }
  }
  return Object.freeze({
    presentFields: Object.freeze(presentFields),
    values,
  });
}

export function cloneAreaItemInstanceStateValue(
  value: AreaItemInstanceStateValue,
): AreaItemInstanceStateValue {
  return Object.freeze({ ...value });
}

export function cloneAreaItemInstanceStateStorage(
  value: AreaItemInstanceStateStorage,
): AreaItemInstanceStateStorage {
  return Object.freeze({
    presentFields: Object.freeze([...value.presentFields]),
    values: cloneAreaItemInstanceStateValue(value.values),
  });
}

export function areaItemInstanceStateValueEqual(
  left: AreaItemInstanceStateValue,
  right: AreaItemInstanceStateValue,
): boolean {
  return AREA_ITEM_INSTANCE_STATE_FIELDS.every((field) => left[field.key] === right[field.key]);
}

export function areaItemInstanceStateStorageEqual(
  left: AreaItemInstanceStateStorage,
  right: AreaItemInstanceStateStorage,
): boolean {
  return left.presentFields.length === right.presentFields.length &&
    left.presentFields.every((field, index) => field === right.presentFields[index]) &&
    areaItemInstanceStateValueEqual(left.values, right.values);
}

export function readAreaItemInstanceStateMutation(
  input: unknown,
): ExistingAreaItemInstanceStateMutation | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["expectedValue", "value"])) return null;
  const expectedValue = readAreaItemInstanceStateStorage(input.expectedValue);
  const value = readAreaItemInstanceStateValue(input.value);
  if (!expectedValue || !value || areaItemInstanceStateValueEqual(expectedValue.values, value)) {
    return null;
  }
  return Object.freeze({ expectedValue, value });
}
