const DWORD_MAX = 0xffff_ffff;
const BYTE_MAX = 0xff;
const MAX_EFFECTIVE_TABLE_ROWS = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const SHA256 = /^[a-f0-9]{64}$/u;

export const AREA_CREATURE_APPENDAGE_FIELDS = Object.freeze([
  Object.freeze({
    key: "wings",
    modernLabel: "Wings_New",
    legacyLabel: "Wings",
    resourceName: "wingmodel.2da",
  }),
  Object.freeze({
    key: "tail",
    modernLabel: "Tail_New",
    legacyLabel: "Tail",
    resourceName: "tailmodel.2da",
  }),
] as const);

export type AreaCreatureAppendageKey = typeof AREA_CREATURE_APPENDAGE_FIELDS[number]["key"];
export type AreaCreatureAppendageResourceName =
  typeof AREA_CREATURE_APPENDAGE_FIELDS[number]["resourceName"];

export interface AreaCreatureAppendageTable {
  readonly resourceName: AreaCreatureAppendageResourceName;
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type AreaCreatureAppendageDwordStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "dword";
      value: number;
      table?: AreaCreatureAppendageTable;
    }>;

export type AreaCreatureAppendageByteStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type AreaCreatureAppendageStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      value: number;
      modernDword: AreaCreatureAppendageDwordStorage;
      legacyByte: AreaCreatureAppendageByteStorage;
    }>;

export interface AreaCreatureAppendagesStorage {
  readonly wings: AreaCreatureAppendageStorage;
  readonly tail: AreaCreatureAppendageStorage;
}

export interface ExistingAreaCreatureAppendageMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly tableSha256: string;
  readonly rowCount: number;
}

export type ExistingAreaCreatureAppendageMutations = Readonly<
  Partial<Record<AreaCreatureAppendageKey, ExistingAreaCreatureAppendageMutation>>
>;

type TableDescriptor = Omit<AreaCreatureAppendageTable, "rowIndex">;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function isDword(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= DWORD_MAX;
}

function readTableDescriptor(
  input: unknown,
  resourceName?: AreaCreatureAppendageResourceName,
): TableDescriptor | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, [
    "resourceName",
    "sourceObjectKey",
    "sourceLayer",
    "sha256",
    "sizeBytes",
    "rowCount",
  ])) return null;
  if (
    (input.resourceName !== "wingmodel.2da" && input.resourceName !== "tailmodel.2da") ||
    (resourceName !== undefined && input.resourceName !== resourceName) ||
    typeof input.sourceObjectKey !== "string" ||
    input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (input.sourceLayer !== "module" && input.sourceLayer !== "hak" &&
      input.sourceLayer !== "vanilla") ||
    typeof input.sha256 !== "string" ||
    !SHA256.test(input.sha256) ||
    !Number.isSafeInteger(input.sizeBytes) ||
    Number(input.sizeBytes) < 1 ||
    Number(input.sizeBytes) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(input.rowCount) ||
    Number(input.rowCount) < 1 ||
    Number(input.rowCount) > MAX_EFFECTIVE_TABLE_ROWS
  ) return null;
  return Object.freeze({
    resourceName: input.resourceName,
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sha256: input.sha256,
    sizeBytes: Number(input.sizeBytes),
    rowCount: Number(input.rowCount),
  });
}

function readBoundTable(
  input: unknown,
  value: number,
  resourceName?: AreaCreatureAppendageResourceName,
): AreaCreatureAppendageTable | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, [
    "resourceName",
    "sourceObjectKey",
    "sourceLayer",
    "sha256",
    "sizeBytes",
    "rowCount",
    "rowIndex",
  ])) return null;
  const descriptor = readTableDescriptor(Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "rowIndex"),
  ), resourceName);
  if (
    !descriptor ||
    !isDword(input.rowIndex) ||
    input.rowIndex !== value ||
    input.rowIndex >= descriptor.rowCount
  ) return null;
  return Object.freeze({ ...descriptor, rowIndex: value });
}

function readDwordStorage(input: unknown): AreaCreatureAppendageDwordStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactKeys(input, ["present", "nativeType", "value"]);
  const bound = hasExactKeys(input, ["present", "nativeType", "value", "table"]);
  if ((!unbound && !bound) || input.present !== true || input.nativeType !== "dword" ||
    !isDword(input.value)) return null;
  const base = Object.freeze({ present: true as const, nativeType: "dword" as const, value: input.value });
  if (!bound) return base;
  const table = readBoundTable(input.table, input.value);
  return table ? Object.freeze({ ...base, table }) : null;
}

function readByteStorage(input: unknown): AreaCreatureAppendageByteStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    Number.isSafeInteger(input.value) &&
    Number(input.value) >= 0 &&
    Number(input.value) <= BYTE_MAX
  ) return Object.freeze({ present: true, nativeType: "byte", value: Number(input.value) });
  return null;
}

export function readAreaCreatureAppendageStorage(
  input: unknown,
): AreaCreatureAppendageStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (!hasExactKeys(input, ["present", "value", "modernDword", "legacyByte"]) ||
    input.present !== true || !isDword(input.value)) return null;
  const modernDword = readDwordStorage(input.modernDword);
  const legacyByte = readByteStorage(input.legacyByte);
  if (!modernDword || !legacyByte || (!modernDword.present && !legacyByte.present)) return null;
  const effectiveValue = modernDword.present
    ? modernDword.value
    : legacyByte.present
      ? legacyByte.value
      : null;
  if (effectiveValue === null) return null;
  if (input.value !== effectiveValue) return null;
  return Object.freeze({ present: true, value: effectiveValue, modernDword, legacyByte });
}

export function readAreaCreatureAppendagesStorage(
  input: unknown,
): AreaCreatureAppendagesStorage | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["wings", "tail"])) return null;
  const wings = readAreaCreatureAppendageStorage(input.wings);
  const tail = readAreaCreatureAppendageStorage(input.tail);
  return wings && tail ? Object.freeze({ wings, tail }) : null;
}

export function bindEffectiveAppendageTwoDaToCreatureAppendages(
  storage: AreaCreatureAppendagesStorage,
  descriptors: Readonly<Partial<Record<AreaCreatureAppendageKey, unknown>>>,
): AreaCreatureAppendagesStorage {
  const result = {} as Record<AreaCreatureAppendageKey, AreaCreatureAppendageStorage>;
  for (const definition of AREA_CREATURE_APPENDAGE_FIELDS) {
    const member = storage[definition.key];
    if (!member.present || !member.modernDword.present) {
      result[definition.key] = member;
      continue;
    }
    const descriptor = readTableDescriptor(descriptors[definition.key], definition.resourceName);
    if (!descriptor || member.value >= descriptor.rowCount) {
      result[definition.key] = member;
      continue;
    }
    result[definition.key] = Object.freeze({
      ...member,
      modernDword: Object.freeze({
        ...member.modernDword,
        table: Object.freeze({ ...descriptor, rowIndex: member.value }),
      }),
    });
  }
  return Object.freeze(result) as AreaCreatureAppendagesStorage;
}

export function readExistingAreaCreatureAppendageMutations(
  input: unknown,
): ExistingAreaCreatureAppendageMutations | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  if (
    keys.length < 1 ||
    keys.some((key) => key !== "wings" && key !== "tail")
  ) return null;
  const result: Partial<Record<AreaCreatureAppendageKey, ExistingAreaCreatureAppendageMutation>> = {};
  for (const key of keys as AreaCreatureAppendageKey[]) {
    const member = input[key];
    if (!isPlainRecord(member) || !hasExactKeys(member, [
      "expectedValue",
      "value",
      "tableSha256",
      "rowCount",
    ]) || !isDword(member.expectedValue) || !isDword(member.value) ||
      member.expectedValue === member.value ||
      typeof member.tableSha256 !== "string" || !SHA256.test(member.tableSha256) ||
      !Number.isSafeInteger(member.rowCount) || Number(member.rowCount) < 1 ||
      Number(member.rowCount) > MAX_EFFECTIVE_TABLE_ROWS ||
      member.expectedValue >= Number(member.rowCount) || member.value >= Number(member.rowCount)) {
      return null;
    }
    result[key] = Object.freeze({
      expectedValue: member.expectedValue,
      value: member.value,
      tableSha256: member.tableSha256,
      rowCount: Number(member.rowCount),
    });
  }
  return Object.freeze(result);
}
