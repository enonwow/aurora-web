import type {
  SceneObjectItemInstanceStateField,
  SceneObjectItemInstanceStateStorage,
  SceneObjectItemInstanceStateValue,
} from "../contracts";

export const ITEM_INSTANCE_STATE_FIELDS = Object.freeze([
  Object.freeze({ key: "charges", minimum: 0, maximum: 0xff, valueKind: "number" }),
  Object.freeze({ key: "cost", minimum: 0, maximum: 0xffff_ffff, valueKind: "number" }),
  Object.freeze({ key: "stolen", minimum: 0, maximum: 1, valueKind: "boolean" }),
  Object.freeze({ key: "stackSize", minimum: 0, maximum: 0xffff, valueKind: "number" }),
  Object.freeze({ key: "plot", minimum: 0, maximum: 1, valueKind: "boolean" }),
  Object.freeze({ key: "addCost", minimum: 0, maximum: 0xffff_ffff, valueKind: "number" }),
  Object.freeze({ key: "identified", minimum: 0, maximum: 1, valueKind: "boolean" }),
  Object.freeze({ key: "cursed", minimum: 0, maximum: 1, valueKind: "boolean" }),
] as const);

export const ITEM_INSTANCE_STATE_DEFAULTS: SceneObjectItemInstanceStateValue = Object.freeze({
  charges: 50,
  cost: 0,
  stolen: false,
  stackSize: 1,
  plot: false,
  addCost: 0,
  identified: false,
  cursed: false,
});

const VALUE_KEYS = ITEM_INSTANCE_STATE_FIELDS.map((field) => field.key);
const FIELD_INDEX = new Map(
  ITEM_INSTANCE_STATE_FIELDS.map((field, index) => [field.key, index] as const),
);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

export function readItemInstanceStateFieldValue<K extends SceneObjectItemInstanceStateField>(
  field: K,
  input: unknown,
): SceneObjectItemInstanceStateValue[K] | null {
  const profile = ITEM_INSTANCE_STATE_FIELDS.find((entry) => entry.key === field)!;
  if (profile.valueKind === "boolean") {
    return (typeof input === "boolean" ? input : null) as
      SceneObjectItemInstanceStateValue[K] | null;
  }
  return (Number.isSafeInteger(input) && Number(input) >= profile.minimum &&
      Number(input) <= profile.maximum ? input : null) as
    SceneObjectItemInstanceStateValue[K] | null;
}

export function readItemInstanceStateValue(
  input: unknown,
): SceneObjectItemInstanceStateValue | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, VALUE_KEYS)) return null;
  for (const profile of ITEM_INSTANCE_STATE_FIELDS) {
    if (readItemInstanceStateFieldValue(profile.key, input[profile.key]) === null) return null;
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

export function readItemInstanceStateStorage(
  input: unknown,
): SceneObjectItemInstanceStateStorage | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["presentFields", "values"]) ||
    !Array.isArray(input.presentFields)) return null;
  const values = readItemInstanceStateValue(input.values);
  if (!values) return null;
  const presentFields: SceneObjectItemInstanceStateField[] = [];
  let previousIndex = -1;
  for (const rawField of input.presentFields) {
    if (typeof rawField !== "string" ||
      !FIELD_INDEX.has(rawField as SceneObjectItemInstanceStateField)) return null;
    const field = rawField as SceneObjectItemInstanceStateField;
    const index = FIELD_INDEX.get(field)!;
    if (index <= previousIndex) return null;
    previousIndex = index;
    presentFields.push(field);
  }
  const present = new Set(presentFields);
  for (const profile of ITEM_INSTANCE_STATE_FIELDS) {
    if (!present.has(profile.key) && values[profile.key] !== ITEM_INSTANCE_STATE_DEFAULTS[profile.key]) {
      return null;
    }
  }
  return Object.freeze({
    presentFields: Object.freeze(presentFields),
    values,
  });
}

export function cloneItemInstanceStateStorage(
  value: SceneObjectItemInstanceStateStorage,
): SceneObjectItemInstanceStateStorage {
  return {
    presentFields: [...value.presentFields],
    values: { ...value.values },
  };
}

export function itemInstanceStateValueEqual(
  left: SceneObjectItemInstanceStateValue,
  right: SceneObjectItemInstanceStateValue,
): boolean {
  return ITEM_INSTANCE_STATE_FIELDS.every((field) => left[field.key] === right[field.key]);
}

export function itemInstanceStateStorageEqual(
  left: SceneObjectItemInstanceStateStorage,
  right: SceneObjectItemInstanceStateStorage,
): boolean {
  return left.presentFields.length === right.presentFields.length &&
    left.presentFields.every((field, index) => field === right.presentFields[index]) &&
    itemInstanceStateValueEqual(left.values, right.values);
}
