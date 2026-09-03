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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function readEntry(
  value: unknown,
  sourceIndex: number | null,
): AuroraVariableSourceEntry | AuroraVariableTargetEntry | null {
  if (!isRecord(value) || !hasExactKeys(
    value,
    sourceIndex === null ? ["name", "type", "value"] : ["sourceIndex", "name", "type", "value"],
  ) || (sourceIndex !== null && value.sourceIndex !== sourceIndex) ||
    typeof value.name !== "string" ||
    value.name.length > MAX_AURORA_VARIABLE_NAME_CODE_UNITS || value.name.includes("\0")) {
    return null;
  }
  let entry: AuroraVariableTargetEntry;
  if (value.type === "int" && Number.isSafeInteger(value.value) &&
    Number(value.value) >= -0x80000000 && Number(value.value) <= 0x7fffffff) {
    entry = { name: value.name, type: "int", value: Number(value.value) };
  } else if (value.type === "float" && typeof value.value === "number" &&
    Number.isFinite(value.value) && Math.fround(value.value) === value.value) {
    entry = { name: value.name, type: "float", value: value.value };
  } else if (value.type === "string" && typeof value.value === "string" &&
    value.value.length <= MAX_AURORA_VARIABLE_STRING_CODE_UNITS &&
    !value.value.includes("\0")) {
    entry = { name: value.name, type: "string", value: value.value };
  } else {
    return null;
  }
  return Object.freeze(sourceIndex === null ? entry : { ...entry, sourceIndex });
}

function readEntries<T extends AuroraVariableTargetEntry>(
  value: unknown,
  source: boolean,
): readonly T[] | null {
  if (!Array.isArray(value) || value.length > MAX_AURORA_VARIABLE_ENTRIES) return null;
  const entries: AuroraVariableTargetEntry[] = [];
  let textUnits = 0;
  for (let index = 0; index < value.length; index += 1) {
    const entry = readEntry(value[index], source ? index : null);
    if (!entry) return null;
    textUnits += entry.name.length + (entry.type === "string" ? entry.value.length : 0);
    if (textUnits > MAX_AURORA_VARIABLE_TEXT_CODE_UNITS) return null;
    entries.push(entry);
  }
  return Object.freeze(entries) as readonly T[];
}

export function readAuroraVariableProvenance(value: unknown): AuroraVariableProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, ["expectedEntries"])) return null;
  const expectedEntries = readEntries<AuroraVariableSourceEntry>(value.expectedEntries, true);
  return expectedEntries ? Object.freeze({ expectedEntries }) : null;
}

export function readAuroraVariableSourceEntries(
  value: unknown,
): readonly AuroraVariableSourceEntry[] | null {
  return readEntries<AuroraVariableSourceEntry>(value, true);
}

export function readAuroraVariableTargetEntries(
  value: unknown,
): readonly AuroraVariableTargetEntry[] | null {
  return readEntries<AuroraVariableTargetEntry>(value, false);
}

export function auroraVariableEntriesEqual(
  source: readonly AuroraVariableSourceEntry[],
  target: readonly AuroraVariableTargetEntry[],
): boolean {
  return source.length === target.length && source.every((entry, index) => {
    const candidate = target[index];
    return candidate !== undefined && entry.name === candidate.name &&
      entry.type === candidate.type && Object.is(entry.value, candidate.value);
  });
}

export function auroraVariableTargetEntriesEqual(
  left: readonly AuroraVariableTargetEntry[] | undefined,
  right: readonly AuroraVariableTargetEntry[] | undefined,
): boolean {
  if (left === undefined || right === undefined) return left === right;
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined && entry.name === candidate.name &&
      entry.type === candidate.type && Object.is(entry.value, candidate.value);
  });
}
