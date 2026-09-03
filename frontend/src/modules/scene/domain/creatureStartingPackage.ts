import type {
  SceneObjectCreatureStartingPackageStorage,
  SceneObjectCreatureStartingPackageTable,
  SceneObjectSourceMetadata,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const BYTE_MAX = 0xff;
const INT_MAX = 0x7fff_ffff;
const MAX_CLASS_IDS = 8;
const MAX_TABLE_ROWS = 256;
const MAX_TABLE_BYTES = 16 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes",
  "rowCount", "rowIndex", "classId",
] as const;

function readClassIds(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CLASS_IDS ||
    value.some((entry) => !Number.isSafeInteger(entry) || Number(entry) < 0 ||
      Number(entry) > INT_MAX)) return null;
  const classIds = value.map(Number);
  return new Set(classIds).size === classIds.length ? Object.freeze(classIds) : null;
}

function readTable(value: unknown): SceneObjectCreatureStartingPackageTable | null {
  if (!isPlainRecord(value) || !hasExactRecordKeys(value, TABLE_KEYS)) return null;
  if (value.resourceName !== "packages.2da" ||
    typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_TABLE_ROWS || !Number.isSafeInteger(value.rowIndex) ||
    Number(value.rowIndex) < 0 || Number(value.rowIndex) > BYTE_MAX ||
    Number(value.rowIndex) >= Number(value.rowCount) || !Number.isSafeInteger(value.classId) ||
    Number(value.classId) < 0 || Number(value.classId) > INT_MAX) return null;
  return Object.freeze({
    resourceName: "packages.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
    rowIndex: Number(value.rowIndex),
    classId: Number(value.classId),
  });
}

export function readCreatureStartingPackageStorage(
  input: unknown,
): SceneObjectCreatureStartingPackageStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactRecordKeys(input, ["present", "nativeType", "value"]);
  const withClasses = hasExactRecordKeys(
    input,
    ["present", "nativeType", "value", "classIds"],
  );
  const bound = hasExactRecordKeys(
    input,
    ["present", "nativeType", "value", "classIds", "table"],
  );
  if ((!unbound && !withClasses && !bound) || input.present !== true ||
    input.nativeType !== "byte" || !Number.isSafeInteger(input.value) ||
    Number(input.value) < 0 || Number(input.value) > BYTE_MAX) return null;
  const value = Number(input.value);
  if (unbound) return Object.freeze({ present: true, nativeType: "byte", value });
  const classIds = readClassIds(input.classIds);
  if (!classIds) return null;
  if (withClasses) {
    return Object.freeze({ present: true, nativeType: "byte", value, classIds });
  }
  const table = readTable(input.table);
  if (!table || table.rowIndex !== value || !classIds.includes(table.classId)) return null;
  return Object.freeze({ present: true, nativeType: "byte", value, classIds, table });
}

export function canEditExistingCreatureStartingPackage(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreatureStartingPackageStorage(source?.creatureStartingPackage);
  return source?.type === "aurora_git" && source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) && Number(source.sourceIndex) >= 0 &&
    storage?.present === true && storage.classIds !== undefined && storage.table !== undefined;
}
