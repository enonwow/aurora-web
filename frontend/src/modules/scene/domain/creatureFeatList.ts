import type {
  SceneObjectCreatureFeatListStorage,
  SceneObjectCreatureFeatListTable,
  SceneObjectSourceMetadata,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const MAX_ROWS = 65_536;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const STORAGE_KEYS = [
  "present", "nativeType", "structTypeId", "featNativeType", "featIds",
  "opaqueSiblingFieldCounts",
] as const;

function readWordVector(value: unknown, max: number): readonly number[] | null {
  return Array.isArray(value) && value.length <= MAX_ROWS && value.every((entry) =>
    Number.isSafeInteger(entry) && Number(entry) >= 0 && Number(entry) <= max)
    ? Object.freeze(value.map(Number))
    : null;
}

function readTable(value: unknown): SceneObjectCreatureFeatListTable | null {
  if (!isPlainRecord(value) || !hasExactRecordKeys(value, TABLE_KEYS) ||
    value.resourceName !== "feat.2da" || typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 || value.sourceObjectKey.length > 2_048 ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > 64 * 1024 * 1024 ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS) return null;
  return Object.freeze({
    resourceName: "feat.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  });
}

export function readCreatureFeatListStorage(
  value: unknown,
): SceneObjectCreatureFeatListStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactRecordKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactRecordKeys(value, STORAGE_KEYS);
  const bound = hasExactRecordKeys(value, [...STORAGE_KEYS, "table"]);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "list" ||
    value.structTypeId !== 1 || value.featNativeType !== "word") return null;
  const featIds = readWordVector(value.featIds, 65_535);
  const opaqueSiblingFieldCounts = readWordVector(value.opaqueSiblingFieldCounts, 65_535);
  if (!featIds || !opaqueSiblingFieldCounts ||
    featIds.length !== opaqueSiblingFieldCounts.length) return null;
  const base = {
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 1 as const,
    featNativeType: "word" as const,
    featIds,
    opaqueSiblingFieldCounts,
  };
  if (unbound) return Object.freeze(base);
  const table = readTable(value.table);
  return table ? Object.freeze({ ...base, table }) : null;
}

export function canEditExistingCreatureFeatList(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreatureFeatListStorage(source?.creatureFeatList);
  return source?.type === "aurora_git" && source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) && Number(source.sourceIndex) >= 0 &&
    storage?.present === true && storage.table !== undefined &&
    new Set(storage.featIds).size === storage.featIds.length &&
    storage.opaqueSiblingFieldCounts.every((count) => count === 0);
}
