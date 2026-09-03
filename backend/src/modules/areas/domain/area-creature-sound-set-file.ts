import {
  isCreatureSoundSetFileRowIndex,
  isExactEffectiveCreatureSoundSetsTwoDaTable,
  type EffectiveCreatureSoundSetsTwoDaTable,
} from "../../catalog/domain/effective-creature-sound-sets-two-da";

const WORD_MAX = 0xffff;
const MAX_ROWS = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const MUTATION_KEYS = ["expectedValue", "value", "tableSha256", "rowCount"] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const BOUND_TABLE_KEYS = [...TABLE_KEYS, "rowIndex", "resRef"] as const;

export interface AreaCreatureSoundSetFileTable {
  readonly resourceName: "soundset.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly resRef: string;
}

export type AreaCreatureSoundSetFileStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "word";
      value: number;
      table?: AreaCreatureSoundSetFileTable;
    }>;

export interface ExistingAreaCreatureSoundSetFileMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly tableSha256: string;
  readonly rowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isWord(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= WORD_MAX;
}

function readDescriptor(
  value: unknown,
): Omit<AreaCreatureSoundSetFileTable, "rowIndex" | "resRef"> | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  if (value.resourceName !== "soundset.2da" ||
    typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS) return null;
  return {
    resourceName: "soundset.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  };
}

export function readAreaCreatureSoundSetFileStorage(
  value: unknown,
): AreaCreatureSoundSetFileStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactKeys(value, ["present", "nativeType", "value"]);
  const bound = hasExactKeys(value, ["present", "nativeType", "value", "table"]);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "word" ||
    !isWord(value.value)) return null;
  const base = Object.freeze({
    present: true as const,
    nativeType: "word" as const,
    value: Number(value.value),
  });
  if (!bound) return base;
  const rawTable = value.table;
  if (!isPlainRecord(rawTable) || !hasExactKeys(rawTable, BOUND_TABLE_KEYS)) return null;
  const descriptor = readDescriptor(Object.fromEntries(
    TABLE_KEYS.map((key) => [key, rawTable[key]]),
  ));
  if (!descriptor || !isCreatureSoundSetFileRowIndex(rawTable.rowIndex, descriptor.rowCount) ||
    rawTable.rowIndex !== base.value || typeof rawTable.resRef !== "string" ||
    !/^[a-z0-9_]{1,16}$/u.test(rawTable.resRef)) return null;
  return Object.freeze({
    ...base,
    table: Object.freeze({
      ...descriptor,
      rowIndex: Number(rawTable.rowIndex),
      resRef: rawTable.resRef,
    }),
  });
}

export function bindEffectiveCreatureSoundSetsTwoDaToCreatureSoundSetFile(
  storage: AreaCreatureSoundSetFileStorage,
  tableInput: unknown,
): AreaCreatureSoundSetFileStorage {
  if (!storage.present || !isExactEffectiveCreatureSoundSetsTwoDaTable(tableInput)) return storage;
  const table: EffectiveCreatureSoundSetsTwoDaTable = tableInput;
  const row = table.rows.find((candidate) => candidate.rowIndex === storage.value);
  if (!row) return storage;
  return Object.freeze({
    ...storage,
    table: Object.freeze({ ...table.descriptor, rowIndex: row.rowIndex, resRef: row.resRef }),
  });
}

export function readExistingAreaCreatureSoundSetFileMutation(
  value: unknown,
): ExistingAreaCreatureSoundSetFileMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    typeof value.tableSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS ||
    !isCreatureSoundSetFileRowIndex(value.expectedValue, Number(value.rowCount)) ||
    !isCreatureSoundSetFileRowIndex(value.value, Number(value.rowCount)) ||
    value.expectedValue === value.value) return null;
  return Object.freeze({
    expectedValue: Number(value.expectedValue),
    value: Number(value.value),
    tableSha256: value.tableSha256,
    rowCount: Number(value.rowCount),
  });
}
