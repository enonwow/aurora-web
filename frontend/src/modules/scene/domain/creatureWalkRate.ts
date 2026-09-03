import type {
  SceneObjectCreatureWalkRateStorage,
  SceneObjectCreatureWalkRateTable,
  SceneObjectSourceMetadata,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const INT_MIN = -0x8000_0000;
const INT_MAX = 0x7fff_ffff;
const MAX_TABLE_ROWS = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const MAX_TWO_DA_NAME_LENGTH = 128;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes",
  "rowCount", "rowIndex", "twoDaName",
] as const;

function readTable(value: unknown): SceneObjectCreatureWalkRateTable | null {
  if (!isPlainRecord(value) || !hasExactRecordKeys(value, TABLE_KEYS)) return null;
  if (value.resourceName !== "creaturespeed.2da" ||
    typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 2 ||
    Number(value.rowCount) > MAX_TABLE_ROWS || !Number.isSafeInteger(value.rowIndex) ||
    Number(value.rowIndex) < 1 || Number(value.rowIndex) >= Number(value.rowCount) ||
    typeof value.twoDaName !== "string" || value.twoDaName.length < 1 ||
    value.twoDaName.length > MAX_TWO_DA_NAME_LENGTH || value.twoDaName === "****" ||
    value.twoDaName.includes("\0")) return null;
  return Object.freeze({
    resourceName: "creaturespeed.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
    rowIndex: Number(value.rowIndex),
    twoDaName: value.twoDaName,
  });
}

export function readCreatureWalkRateStorage(
  input: unknown,
): SceneObjectCreatureWalkRateStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactRecordKeys(input, ["present", "nativeType", "value"]);
  const bound = hasExactRecordKeys(input, ["present", "nativeType", "value", "table"]);
  if ((!unbound && !bound) || input.present !== true || input.nativeType !== "int" ||
    !Number.isSafeInteger(input.value) || Number(input.value) < INT_MIN ||
    Number(input.value) > INT_MAX) return null;
  const value = Number(input.value);
  if (!bound) return Object.freeze({ present: true, nativeType: "int", value });
  const table = readTable(input.table);
  if (!table || table.rowIndex !== value) return null;
  return Object.freeze({ present: true, nativeType: "int", value, table });
}

export function canEditExistingCreatureWalkRate(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreatureWalkRateStorage(source?.creatureWalkRate);
  return source?.type === "aurora_git" && source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) && Number(source.sourceIndex) >= 0 &&
    storage?.present === true && storage.table !== undefined;
}
