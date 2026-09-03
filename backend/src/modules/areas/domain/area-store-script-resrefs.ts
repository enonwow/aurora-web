export const AREA_STORE_SCRIPT_RESREF_FIELDS = Object.freeze([
  Object.freeze({ key: "onOpenStore", label: "OnOpenStore" }),
  Object.freeze({ key: "onStoreClosed", label: "OnStoreClosed" }),
] as const);

export interface AreaStoreScriptResRefsValue {
  readonly onOpenStore: string;
  readonly onStoreClosed: string;
}

export interface ExistingAreaStoreScriptResRefsMutation {
  readonly expectedValue: AreaStoreScriptResRefsValue;
  readonly value: AreaStoreScriptResRefsValue;
}

const VALUE_KEYS = AREA_STORE_SCRIPT_RESREF_FIELDS.map((field) => field.key);
const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;

export function isAreaStoreScriptSourceResRef(value: unknown): value is string {
  return typeof value === "string" && SOURCE_RESREF_PATTERN.test(value);
}

export function isAreaStoreScriptTargetResRef(value: unknown): value is string {
  return typeof value === "string" && TARGET_RESREF_PATTERN.test(value);
}

export function readAreaStoreScriptResRefsValue(
  input: unknown,
): AreaStoreScriptResRefsValue | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, VALUE_KEYS)) return null;
  if (
    !isAreaStoreScriptSourceResRef(input.onOpenStore) ||
    !isAreaStoreScriptSourceResRef(input.onStoreClosed)
  ) return null;
  return Object.freeze({
    onOpenStore: input.onOpenStore,
    onStoreClosed: input.onStoreClosed,
  });
}

export function readAreaStoreScriptResRefsTargetValue(
  input: unknown,
): AreaStoreScriptResRefsValue | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, VALUE_KEYS)) return null;
  if (
    !isAreaStoreScriptTargetResRef(input.onOpenStore) ||
    !isAreaStoreScriptTargetResRef(input.onStoreClosed)
  ) return null;
  return Object.freeze({
    onOpenStore: input.onOpenStore,
    onStoreClosed: input.onStoreClosed,
  });
}

export function cloneAreaStoreScriptResRefsValue(
  value: AreaStoreScriptResRefsValue,
): AreaStoreScriptResRefsValue {
  return Object.freeze({ ...value });
}

export function areaStoreScriptResRefsValueEqual(
  left: AreaStoreScriptResRefsValue,
  right: AreaStoreScriptResRefsValue,
): boolean {
  return AREA_STORE_SCRIPT_RESREF_FIELDS.every(
    (field) => left[field.key] === right[field.key],
  );
}

export function readAreaStoreScriptResRefsMutation(
  input: unknown,
): ExistingAreaStoreScriptResRefsMutation | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["expectedValue", "value"])) {
    return null;
  }
  const expectedValue = readAreaStoreScriptResRefsValue(input.expectedValue);
  const value = readAreaStoreScriptResRefsTargetValue(input.value);
  if (
    !expectedValue ||
    !value ||
    areaStoreScriptResRefsValueEqual(expectedValue, value)
  ) return null;
  return Object.freeze({ expectedValue, value });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}
