import type {
  SceneObjectCreatureSkillListStorage,
  SceneObjectCreatureSkillListTable,
  SceneObjectSourceMetadata,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const MAX_ROWS = 4_096;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const STORAGE_KEYS = [
  "present", "nativeType", "structTypeId", "rankNativeType", "ranks",
  "opaqueSiblingFieldCounts",
] as const;

function readRanks(value: unknown, max: number): readonly number[] | null {
  return Array.isArray(value) && value.length <= MAX_ROWS && value.every((entry) =>
    Number.isSafeInteger(entry) && Number(entry) >= 0 && Number(entry) <= max)
    ? Object.freeze(value.map(Number))
    : null;
}

function readTable(value: unknown): SceneObjectCreatureSkillListTable | null {
  if (!isPlainRecord(value) || !hasExactRecordKeys(value, TABLE_KEYS) ||
    value.resourceName !== "skills.2da" || typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 || value.sourceObjectKey.length > 2_048 ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > 16 * 1024 * 1024 ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS) return null;
  return Object.freeze({
    resourceName: "skills.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  });
}

export function readCreatureSkillListStorage(
  value: unknown,
): SceneObjectCreatureSkillListStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactRecordKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactRecordKeys(value, STORAGE_KEYS);
  const bound = hasExactRecordKeys(value, [...STORAGE_KEYS, "table"]);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "list" ||
    value.structTypeId !== 0 || value.rankNativeType !== "byte") return null;
  const ranks = readRanks(value.ranks, 0xff);
  const opaqueSiblingFieldCounts = readRanks(value.opaqueSiblingFieldCounts, 65_535);
  if (!ranks || !opaqueSiblingFieldCounts ||
    ranks.length !== opaqueSiblingFieldCounts.length) return null;
  const base = {
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 0 as const,
    rankNativeType: "byte" as const,
    ranks,
    opaqueSiblingFieldCounts,
  };
  if (unbound) return Object.freeze(base);
  const table = readTable(value.table);
  return table ? Object.freeze({ ...base, table }) : null;
}

export function canEditExistingCreatureSkillList(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreatureSkillListStorage(source?.creatureSkillList);
  return source?.type === "aurora_git" && source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) && Number(source.sourceIndex) >= 0 &&
    storage?.present === true && storage.table !== undefined;
}
