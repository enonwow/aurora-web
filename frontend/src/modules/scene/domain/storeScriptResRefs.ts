export const AREA_STORE_SCRIPT_RESREF_FIELDS = Object.freeze([
  Object.freeze({ key: "onOpenStore", label: "OnOpenStore" }),
  Object.freeze({ key: "onStoreClosed", label: "OnStoreClosed" }),
] as const);
export const AREA_STORE_SCRIPT_RESREF_MAX_CODE_UNITS = 16;

export interface AreaStoreScriptResRefsValue {
  readonly onOpenStore: string;
  readonly onStoreClosed: string;
}

const VALUE_KEYS = AREA_STORE_SCRIPT_RESREF_FIELDS.map((field) => field.key);
const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;

export function isAreaStoreScriptResRefsValue(
  value: unknown,
): value is AreaStoreScriptResRefsValue {
  if (!isPlainRecord(value) || !hasExactKeys(value, VALUE_KEYS)) return false;
  return isSourceResRef(value.onOpenStore) && isSourceResRef(value.onStoreClosed);
}

export function isAreaStoreScriptResRefsTargetValue(
  value: unknown,
): value is AreaStoreScriptResRefsValue {
  if (!isPlainRecord(value) || !hasExactKeys(value, VALUE_KEYS)) return false;
  return isTargetResRef(value.onOpenStore) && isTargetResRef(value.onStoreClosed);
}

export function readAreaStoreScriptResRefsValue(
  value: unknown,
): AreaStoreScriptResRefsValue | undefined {
  return isAreaStoreScriptResRefsValue(value)
    ? cloneAreaStoreScriptResRefsValue(value)
    : undefined;
}

export function cloneAreaStoreScriptResRefsValue(
  value: Readonly<AreaStoreScriptResRefsValue>,
): AreaStoreScriptResRefsValue {
  return Object.freeze({
    onOpenStore: value.onOpenStore,
    onStoreClosed: value.onStoreClosed,
  });
}

export function areaStoreScriptResRefsValueEqual(
  left: Readonly<AreaStoreScriptResRefsValue>,
  right: Readonly<AreaStoreScriptResRefsValue>,
): boolean {
  return AREA_STORE_SCRIPT_RESREF_FIELDS.every(
    (field) => left[field.key] === right[field.key],
  );
}

function isSourceResRef(value: unknown): value is string {
  return typeof value === "string" && SOURCE_RESREF_PATTERN.test(value);
}

function isTargetResRef(value: unknown): value is string {
  return typeof value === "string" && TARGET_RESREF_PATTERN.test(value);
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
