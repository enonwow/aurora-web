import type {
  SceneObjectCreatureAppendageByteStorage,
  SceneObjectCreatureAppendageDwordStorage,
  SceneObjectCreatureAppendageKey,
  SceneObjectCreatureAppendageStorage,
  SceneObjectCreatureAppendagesStorage,
  SceneObjectCreatureAppendageTable,
  SceneObjectSourceMetadata,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const DWORD_MAX = 0xffff_ffff;
const BYTE_MAX = 0xff;
const MAX_TABLE_ROWS = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;

export const CREATURE_APPENDAGE_FIELDS = Object.freeze([
  Object.freeze({ key: "wings", resourceName: "wingmodel.2da" }),
  Object.freeze({ key: "tail", resourceName: "tailmodel.2da" }),
] as const);

function isDword(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= DWORD_MAX;
}

function readTable(
  input: unknown,
  key: SceneObjectCreatureAppendageKey,
  expectedValue: number,
): SceneObjectCreatureAppendageTable | null {
  if (!isPlainRecord(input) || !hasExactRecordKeys(input, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes",
    "rowCount", "rowIndex",
  ])) return null;
  const expectedResourceName = key === "wings" ? "wingmodel.2da" : "tailmodel.2da";
  if (
    input.resourceName !== expectedResourceName ||
    typeof input.sourceObjectKey !== "string" ||
    input.sourceObjectKey.length < 1 ||
    input.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (input.sourceLayer !== "module" && input.sourceLayer !== "hak" &&
      input.sourceLayer !== "vanilla") ||
    typeof input.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(input.sha256) ||
    !Number.isSafeInteger(input.sizeBytes) ||
    Number(input.sizeBytes) < 1 ||
    Number(input.sizeBytes) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(input.rowCount) ||
    Number(input.rowCount) < 1 ||
    Number(input.rowCount) > MAX_TABLE_ROWS ||
    !isDword(input.rowIndex) ||
    input.rowIndex !== expectedValue ||
    Number(input.rowIndex) >= Number(input.rowCount)
  ) return null;
  return Object.freeze({
    resourceName: expectedResourceName,
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sha256: input.sha256,
    sizeBytes: Number(input.sizeBytes),
    rowCount: Number(input.rowCount),
    rowIndex: Number(input.rowIndex),
  });
}

function readDwordStorage(
  input: unknown,
  key: SceneObjectCreatureAppendageKey,
): SceneObjectCreatureAppendageDwordStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactRecordKeys(input, ["present", "nativeType", "value"]);
  const bound = hasExactRecordKeys(input, ["present", "nativeType", "value", "table"]);
  if ((!unbound && !bound) || input.present !== true || input.nativeType !== "dword" ||
    !isDword(input.value)) return null;
  const value = Number(input.value);
  if (!bound) return Object.freeze({ present: true, nativeType: "dword", value });
  const table = readTable(input.table, key, value);
  return table
    ? Object.freeze({ present: true, nativeType: "dword", value, table })
    : null;
}

function readByteStorage(input: unknown): SceneObjectCreatureAppendageByteStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    Number.isSafeInteger(input.value) &&
    Number(input.value) >= 0 &&
    Number(input.value) <= BYTE_MAX
  ) return Object.freeze({ present: true, nativeType: "byte", value: Number(input.value) });
  return null;
}

export function readCreatureAppendageStorage(
  input: unknown,
  key: SceneObjectCreatureAppendageKey,
): SceneObjectCreatureAppendageStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (!hasExactRecordKeys(input, ["present", "value", "modernDword", "legacyByte"]) ||
    input.present !== true || !isDword(input.value)) return null;
  const modernDword = readDwordStorage(input.modernDword, key);
  const legacyByte = readByteStorage(input.legacyByte);
  if (!modernDword || !legacyByte || (!modernDword.present && !legacyByte.present)) return null;
  const value = modernDword.present ? modernDword.value : legacyByte.present
    ? legacyByte.value
    : null;
  if (value === null || input.value !== value) return null;
  return Object.freeze({ present: true, value, modernDword, legacyByte });
}

export function readCreatureAppendagesStorage(
  input: unknown,
): SceneObjectCreatureAppendagesStorage | null {
  if (!isPlainRecord(input) || !hasExactRecordKeys(input, ["wings", "tail"])) return null;
  const wings = readCreatureAppendageStorage(input.wings, "wings");
  const tail = readCreatureAppendageStorage(input.tail, "tail");
  return wings && tail ? Object.freeze({ wings, tail }) : null;
}

export function canEditExistingCreatureAppendage(
  source: SceneObjectSourceMetadata | undefined,
  key: SceneObjectCreatureAppendageKey,
): boolean {
  const appendages = readCreatureAppendagesStorage(source?.creatureAppendages);
  const member = appendages?.[key];
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    member?.present === true &&
    member.modernDword.present === true &&
    member.modernDword.table !== undefined;
}
