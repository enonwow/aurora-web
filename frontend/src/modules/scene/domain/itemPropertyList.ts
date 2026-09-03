import type {
  SceneObjectItemPropertyListProvenance,
  SceneObjectItemPropertyListSourceEntry,
  SceneObjectItemPropertyListTargetEntry,
} from "../contracts";

export const MAX_ITEM_PROPERTY_LIST_ENTRIES = 4096;

const TARGET_KEYS = Object.freeze([
  "propertyName",
  "subtype",
  "costTable",
  "costValue",
  "param1",
  "param1Value",
  "chanceAppear",
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readUnsigned(value: unknown, maximum: number): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum
    ? Number(value)
    : null;
}

function readTargetEntry(value: unknown): SceneObjectItemPropertyListTargetEntry | null {
  if (!isRecord(value) || !hasExactKeys(value, TARGET_KEYS)) return null;
  const propertyName = readUnsigned(value.propertyName, 0xffff);
  const subtype = readUnsigned(value.subtype, 0xffff);
  const costTable = readUnsigned(value.costTable, 0xff);
  const costValue = readUnsigned(value.costValue, 0xffff);
  const param1 = readUnsigned(value.param1, 0xff);
  const param1Value = readUnsigned(value.param1Value, 0xff);
  const chanceAppear = readUnsigned(value.chanceAppear, 0xff);
  if (
    propertyName === null || subtype === null || costTable === null ||
    costValue === null || param1 === null || param1Value === null ||
    chanceAppear === null || (propertyName === 48 && costTable !== 24)
  ) return null;
  return {
    propertyName,
    subtype,
    costTable,
    costValue,
    param1,
    param1Value,
    chanceAppear,
  };
}

export function readItemPropertyListTargetEntries(
  value: unknown,
): SceneObjectItemPropertyListTargetEntry[] | null {
  if (!Array.isArray(value) || value.length > MAX_ITEM_PROPERTY_LIST_ENTRIES) return null;
  const entries: SceneObjectItemPropertyListTargetEntry[] = [];
  for (const rawEntry of value) {
    const entry = readTargetEntry(rawEntry);
    if (!entry) return null;
    entries.push(entry);
  }
  return entries;
}

export function readItemPropertyListProvenance(
  value: unknown,
): SceneObjectItemPropertyListProvenance | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["present", "expectedEntries"]) ||
    typeof value.present !== "boolean" ||
    !Array.isArray(value.expectedEntries) ||
    value.expectedEntries.length > MAX_ITEM_PROPERTY_LIST_ENTRIES
  ) return null;
  const expectedEntries: SceneObjectItemPropertyListSourceEntry[] = [];
  for (let index = 0; index < value.expectedEntries.length; index += 1) {
    const rawEntry = value.expectedEntries[index];
    if (
      !isRecord(rawEntry) ||
      !hasExactKeys(rawEntry, ["sourceIndex", ...TARGET_KEYS]) ||
      rawEntry.sourceIndex !== index
    ) return null;
    const target = readTargetEntry(
      Object.fromEntries(TARGET_KEYS.map((key) => [key, rawEntry[key]])),
    );
    if (!target) return null;
    expectedEntries.push({ sourceIndex: index, ...target });
  }
  if (!value.present && expectedEntries.length > 0) return null;
  return { present: value.present, expectedEntries };
}

export function itemPropertyListEntriesEqual(
  expected: readonly SceneObjectItemPropertyListSourceEntry[],
  target: readonly SceneObjectItemPropertyListTargetEntry[],
): boolean {
  return expected.length === target.length && expected.every((entry, index) => {
    const candidate = target[index];
    return candidate !== undefined && TARGET_KEYS.every(
      (key) => entry[key] === candidate[key],
    );
  });
}

export function itemPropertyListSourceEntriesEqual(
  left: readonly SceneObjectItemPropertyListSourceEntry[],
  right: readonly SceneObjectItemPropertyListSourceEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined && entry.sourceIndex === candidate.sourceIndex &&
      TARGET_KEYS.every((key) => entry[key] === candidate[key]);
  });
}
