import type {
  SceneObjectCreaturePerceptionRangeStorage,
  SceneObjectCreaturePerceptionRangeTable,
  SceneObjectSourceMetadata,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const MAX_TABLE_ROWS = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const ADMITTED_ROWS = new Set([8, 9, 10, 11]);
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes",
  "rowCount", "rowIndex",
] as const;

export function isCreaturePerceptionRangeRow(value: unknown): value is 8 | 9 | 10 | 11 {
  return Number.isSafeInteger(value) && ADMITTED_ROWS.has(Number(value));
}

function readTable(value: unknown): SceneObjectCreaturePerceptionRangeTable | null {
  if (!isPlainRecord(value) || !hasExactRecordKeys(value, TABLE_KEYS)) return null;
  if (
    value.resourceName !== "ranges.2da" ||
    typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") ||
    typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !Number.isSafeInteger(value.sizeBytes) || Number(value.sizeBytes) < 1 ||
    Number(value.sizeBytes) > MAX_TABLE_BYTES || !Number.isSafeInteger(value.rowCount) ||
    Number(value.rowCount) < 1 || Number(value.rowCount) > MAX_TABLE_ROWS ||
    !isCreaturePerceptionRangeRow(value.rowIndex) ||
    Number(value.rowIndex) >= Number(value.rowCount)
  ) return null;
  return Object.freeze({
    resourceName: "ranges.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
    rowIndex: value.rowIndex,
  });
}

export function readCreaturePerceptionRangeStorage(
  input: unknown,
): SceneObjectCreaturePerceptionRangeStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactRecordKeys(input, ["present", "nativeType", "value"]);
  const bound = hasExactRecordKeys(input, ["present", "nativeType", "value", "table"]);
  if ((!unbound && !bound) || input.present !== true || input.nativeType !== "byte" ||
    !Number.isSafeInteger(input.value) || Number(input.value) < 0 || Number(input.value) > 0xff) {
    return null;
  }
  const value = Number(input.value);
  if (!bound) return Object.freeze({ present: true, nativeType: "byte", value });
  const table = readTable(input.table);
  if (!table || table.rowIndex !== value) return null;
  return Object.freeze({ present: true, nativeType: "byte", value, table });
}

export function canEditExistingCreaturePerceptionRange(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreaturePerceptionRangeStorage(source?.creaturePerceptionRange);
  return source?.type === "aurora_git" && source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) && Number(source.sourceIndex) >= 0 &&
    storage?.present === true && storage.table !== undefined;
}
