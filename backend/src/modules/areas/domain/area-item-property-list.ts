export const MAX_AREA_ITEM_PROPERTY_LIST_ENTRIES = 4096;

export interface AreaItemPropertyListTargetEntry {
  readonly propertyName: number;
  readonly subtype: number;
  readonly costTable: number;
  readonly costValue: number;
  readonly param1: number;
  readonly param1Value: number;
  readonly chanceAppear: number;
}

export interface AreaItemPropertyListSourceEntry
  extends AreaItemPropertyListTargetEntry {
  readonly sourceIndex: number;
}

export interface AreaItemPropertyListProvenance {
  readonly present: boolean;
  readonly expectedEntries: readonly AreaItemPropertyListSourceEntry[];
}

export interface ExistingAreaItemPropertyListMutation {
  readonly expectedValue: AreaItemPropertyListProvenance;
  readonly entries: readonly AreaItemPropertyListTargetEntry[];
}

export class AreaItemPropertyListValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AreaItemPropertyListValidationError";
  }
}

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

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readUnsigned(
  value: unknown,
  maximum: number,
  path: string,
): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > maximum) {
    throw new AreaItemPropertyListValidationError(`${path}:outside_native_range`);
  }
  return Number(value);
}

function parseTargetEntry(
  value: unknown,
  index: number,
): Readonly<AreaItemPropertyListTargetEntry> {
  const path = `propertiesList.${index}`;
  if (!isRecord(value) || !hasExactKeys(value, TARGET_KEYS)) {
    throw new AreaItemPropertyListValidationError(`${path}:unexpected_keys`);
  }
  const entry = Object.freeze({
    propertyName: readUnsigned(value.propertyName, 0xffff, `${path}.propertyName`),
    subtype: readUnsigned(value.subtype, 0xffff, `${path}.subtype`),
    costTable: readUnsigned(value.costTable, 0xff, `${path}.costTable`),
    costValue: readUnsigned(value.costValue, 0xffff, `${path}.costValue`),
    param1: readUnsigned(value.param1, 0xff, `${path}.param1`),
    param1Value: readUnsigned(value.param1Value, 0xff, `${path}.param1Value`),
    chanceAppear: readUnsigned(value.chanceAppear, 0xff, `${path}.chanceAppear`),
  });
  if (entry.propertyName === 48 && entry.costTable !== 24) {
    throw new AreaItemPropertyListValidationError(
      `${path}:property_48_requires_cost_table_24`,
    );
  }
  return entry;
}

function parseEntryArray(
  value: unknown,
  source: boolean,
): readonly (AreaItemPropertyListSourceEntry | AreaItemPropertyListTargetEntry)[] {
  if (!Array.isArray(value)) {
    throw new AreaItemPropertyListValidationError("propertiesList:expected_array");
  }
  if (value.length > MAX_AREA_ITEM_PROPERTY_LIST_ENTRIES) {
    throw new AreaItemPropertyListValidationError(
      `propertiesList:maximum_${MAX_AREA_ITEM_PROPERTY_LIST_ENTRIES}`,
    );
  }
  return Object.freeze(value.map((rawEntry, index) => {
    if (!source) return parseTargetEntry(rawEntry, index);
    if (!isRecord(rawEntry) ||
      !hasExactKeys(rawEntry, ["sourceIndex", ...TARGET_KEYS])) {
      throw new AreaItemPropertyListValidationError(
        `propertiesList.${index}:unexpected_keys`,
      );
    }
    if (rawEntry.sourceIndex !== index) {
      throw new AreaItemPropertyListValidationError(
        `propertiesList.${index}:invalid_source_index`,
      );
    }
    const target = parseTargetEntry(
      Object.fromEntries(TARGET_KEYS.map((key) => [key, rawEntry[key]])),
      index,
    );
    return Object.freeze({ sourceIndex: index, ...target });
  }));
}

export function parseAreaItemPropertyListSourceEntries(
  value: unknown,
): readonly AreaItemPropertyListSourceEntry[] {
  return parseEntryArray(value, true) as readonly AreaItemPropertyListSourceEntry[];
}

export function parseAreaItemPropertyListTargetEntries(
  value: unknown,
): readonly AreaItemPropertyListTargetEntry[] {
  return parseEntryArray(value, false) as readonly AreaItemPropertyListTargetEntry[];
}

export function parseAreaItemPropertyListProvenance(
  value: unknown,
): Readonly<AreaItemPropertyListProvenance> {
  if (!isRecord(value) || !hasExactKeys(value, ["present", "expectedEntries"]) ||
    typeof value.present !== "boolean") {
    throw new AreaItemPropertyListValidationError("propertiesList:invalid_provenance");
  }
  const expectedEntries = parseAreaItemPropertyListSourceEntries(value.expectedEntries);
  if (!value.present && expectedEntries.length > 0) {
    throw new AreaItemPropertyListValidationError("propertiesList:absent_with_entries");
  }
  return Object.freeze({ present: value.present, expectedEntries });
}

export function parseAreaItemPropertyListMutation(
  value: unknown,
): Readonly<ExistingAreaItemPropertyListMutation> {
  if (!isRecord(value) || !hasExactKeys(value, ["expectedValue", "entries"])) {
    throw new AreaItemPropertyListValidationError("propertiesList:invalid_mutation");
  }
  const expectedValue = parseAreaItemPropertyListProvenance(value.expectedValue);
  if (!expectedValue.present) {
    throw new AreaItemPropertyListValidationError("propertiesList:source_absent");
  }
  const entries = parseAreaItemPropertyListTargetEntries(value.entries);
  if (areaItemPropertyListEntriesEqual(expectedValue.expectedEntries, entries)) {
    throw new AreaItemPropertyListValidationError("propertiesList:unchanged");
  }
  return Object.freeze({ expectedValue, entries });
}

export function areaItemPropertyListEntriesEqual(
  expected: readonly AreaItemPropertyListSourceEntry[],
  entries: readonly AreaItemPropertyListTargetEntry[],
): boolean {
  return expected.length === entries.length && expected.every((entry, index) => {
    const candidate = entries[index];
    return candidate !== undefined && TARGET_KEYS.every(
      (key) => entry[key] === candidate[key],
    );
  });
}

export function areaItemPropertyListSourceEntriesEqual(
  left: readonly AreaItemPropertyListSourceEntry[],
  right: readonly AreaItemPropertyListSourceEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined && entry.sourceIndex === candidate.sourceIndex &&
      TARGET_KEYS.every((key) => entry[key] === candidate[key]);
  });
}

export function cloneAreaItemPropertyListProvenance(
  value: AreaItemPropertyListProvenance,
): AreaItemPropertyListProvenance {
  return Object.freeze({
    present: value.present,
    expectedEntries: Object.freeze(
      value.expectedEntries.map((entry) => Object.freeze({ ...entry })),
    ),
  });
}
