export const MAX_AURORA_VARIABLE_ENTRIES = 1024;
export const MAX_AURORA_VARIABLE_NAME_CODE_UNITS = 64;
export const MAX_AURORA_VARIABLE_STRING_CODE_UNITS = 4096;
export const MAX_AURORA_VARIABLE_TEXT_CODE_UNITS = 1024 * 1024;

export type AuroraVariableTargetEntry =
  | Readonly<{ name: string; type: "int"; value: number }>
  | Readonly<{ name: string; type: "float"; value: number }>
  | Readonly<{ name: string; type: "string"; value: string }>;

export type AuroraVariableSourceEntry = AuroraVariableTargetEntry &
  Readonly<{ sourceIndex: number }>;

export interface AuroraVariableProvenance {
  readonly expectedEntries: readonly AuroraVariableSourceEntry[];
}

export interface AuroraVariableMutation {
  readonly expectedEntries: readonly AuroraVariableSourceEntry[];
  readonly entries: readonly AuroraVariableTargetEntry[];
}

export class AuroraVariableTableValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuroraVariableTableValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readName(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length > MAX_AURORA_VARIABLE_NAME_CODE_UNITS ||
    value.includes("\0")) {
    throw new AuroraVariableTableValidationError(`${path}:invalid_name`);
  }
  return value;
}

function readEntry(
  value: unknown,
  sourceIndex: number | null,
  path: string,
): AuroraVariableSourceEntry | AuroraVariableTargetEntry {
  if (!isRecord(value)) {
    throw new AuroraVariableTableValidationError(`${path}:invalid_entry`);
  }
  const keys = sourceIndex === null
    ? ["name", "type", "value"] as const
    : ["sourceIndex", "name", "type", "value"] as const;
  if (!hasExactKeys(value, keys)) {
    throw new AuroraVariableTableValidationError(`${path}:unexpected_keys`);
  }
  if (sourceIndex !== null && value.sourceIndex !== sourceIndex) {
    throw new AuroraVariableTableValidationError(`${path}:invalid_source_index`);
  }
  const name = readName(value.name, `${path}.name`);
  let entry: AuroraVariableTargetEntry;
  if (value.type === "int" && Number.isSafeInteger(value.value) &&
    Number(value.value) >= -0x80000000 && Number(value.value) <= 0x7fffffff) {
    entry = Object.freeze({ name, type: "int", value: Number(value.value) });
  } else if (value.type === "float" && typeof value.value === "number" &&
    Number.isFinite(value.value) && Math.fround(value.value) === value.value) {
    entry = Object.freeze({ name, type: "float", value: value.value });
  } else if (value.type === "string" && typeof value.value === "string" &&
    value.value.length <= MAX_AURORA_VARIABLE_STRING_CODE_UNITS &&
    !value.value.includes("\0")) {
    entry = Object.freeze({ name, type: "string", value: value.value });
  } else {
    throw new AuroraVariableTableValidationError(`${path}:invalid_typed_value`);
  }
  return sourceIndex === null
    ? entry
    : Object.freeze({ ...entry, sourceIndex });
}

function checkBudgets(entries: readonly AuroraVariableTargetEntry[]): void {
  if (entries.length > MAX_AURORA_VARIABLE_ENTRIES) {
    throw new AuroraVariableTableValidationError(
      `variables:maximum_${MAX_AURORA_VARIABLE_ENTRIES}`,
    );
  }
  const textUnits = entries.reduce(
    (total, entry) => total + entry.name.length + (entry.type === "string" ? entry.value.length : 0),
    0,
  );
  if (textUnits > MAX_AURORA_VARIABLE_TEXT_CODE_UNITS) {
    throw new AuroraVariableTableValidationError("variables:text_budget_exceeded");
  }
}

export function parseAuroraVariableSourceEntries(
  value: unknown,
): readonly AuroraVariableSourceEntry[] {
  if (!Array.isArray(value)) {
    throw new AuroraVariableTableValidationError("variables:expected_array");
  }
  const entries = value.map((entry, index) =>
    readEntry(entry, index, `variables.${index}`) as AuroraVariableSourceEntry);
  checkBudgets(entries);
  return Object.freeze(entries);
}

export function parseAuroraVariableTargetEntries(
  value: unknown,
): readonly AuroraVariableTargetEntry[] {
  if (!Array.isArray(value)) {
    throw new AuroraVariableTableValidationError("variables:expected_array");
  }
  const entries = value.map((entry, index) =>
    readEntry(entry, null, `variables.${index}`) as AuroraVariableTargetEntry);
  checkBudgets(entries);
  return Object.freeze(entries);
}

export function parseAuroraVariableProvenance(
  value: unknown,
): Readonly<AuroraVariableProvenance> {
  if (!isRecord(value) || !hasExactKeys(value, ["expectedEntries"])) {
    throw new AuroraVariableTableValidationError("variables:invalid_provenance");
  }
  return Object.freeze({
    expectedEntries: parseAuroraVariableSourceEntries(value.expectedEntries),
  });
}

export function parseAuroraVariableMutation(
  value: unknown,
): Readonly<AuroraVariableMutation> {
  if (!isRecord(value) || !hasExactKeys(value, ["expectedEntries", "entries"])) {
    throw new AuroraVariableTableValidationError("variables:invalid_mutation");
  }
  const expectedEntries = parseAuroraVariableSourceEntries(value.expectedEntries);
  const entries = parseAuroraVariableTargetEntries(value.entries);
  if (auroraVariableEntriesEqual(expectedEntries, entries)) {
    throw new AuroraVariableTableValidationError("variables:unchanged");
  }
  return Object.freeze({ expectedEntries, entries });
}

export function auroraVariableEntriesEqual(
  expected: readonly AuroraVariableSourceEntry[],
  entries: readonly AuroraVariableTargetEntry[],
): boolean {
  return expected.length === entries.length && expected.every((entry, index) => {
    const candidate = entries[index];
    return candidate !== undefined && entry.name === candidate.name &&
      entry.type === candidate.type && Object.is(entry.value, candidate.value);
  });
}

export function auroraVariableSourceEntriesEqual(
  left: readonly AuroraVariableSourceEntry[],
  right: readonly AuroraVariableSourceEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined && entry.sourceIndex === candidate.sourceIndex &&
      entry.name === candidate.name && entry.type === candidate.type &&
      Object.is(entry.value, candidate.value);
  });
}
