import type {
  SceneObjectCreatureSoundSetFileStorage,
  SceneObjectCreatureSoundSetFileTable,
  SceneObjectSourceMetadata,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const WORD_MAX = 0xffff;
const MAX_TABLE_ROWS = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes",
  "rowCount", "rowIndex", "resRef",
] as const;

function readTable(value: unknown): SceneObjectCreatureSoundSetFileTable | null {
  if (!isPlainRecord(value) || !hasExactRecordKeys(value, TABLE_KEYS)) return null;
  if (value.resourceName !== "soundset.2da" ||
    typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_TABLE_ROWS || !Number.isSafeInteger(value.rowIndex) ||
    Number(value.rowIndex) < 0 || Number(value.rowIndex) > WORD_MAX ||
    Number(value.rowIndex) >= Number(value.rowCount) || typeof value.resRef !== "string" ||
    !/^[a-z0-9_]{1,16}$/u.test(value.resRef)) return null;
  return Object.freeze({
    resourceName: "soundset.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
    rowIndex: Number(value.rowIndex),
    resRef: value.resRef,
  });
}

export function readCreatureSoundSetFileStorage(
  input: unknown,
): SceneObjectCreatureSoundSetFileStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactRecordKeys(input, ["present", "nativeType", "value"]);
  const bound = hasExactRecordKeys(input, ["present", "nativeType", "value", "table"]);
  if ((!unbound && !bound) || input.present !== true || input.nativeType !== "word" ||
    !Number.isSafeInteger(input.value) || Number(input.value) < 0 ||
    Number(input.value) > WORD_MAX) return null;
  const value = Number(input.value);
  if (!bound) return Object.freeze({ present: true, nativeType: "word", value });
  const table = readTable(input.table);
  if (!table || table.rowIndex !== value) return null;
  return Object.freeze({ present: true, nativeType: "word", value, table });
}

export function canEditExistingCreatureSoundSetFile(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreatureSoundSetFileStorage(source?.creatureSoundSetFile);
  return source?.type === "aurora_git" && source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) && Number(source.sourceIndex) >= 0 &&
    storage?.present === true && storage.table !== undefined;
}
