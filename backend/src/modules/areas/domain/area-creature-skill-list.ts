import {
  isExactEffectiveCreatureSkillsTwoDaTable,
  type EffectiveCreatureSkillsTwoDaDescriptor,
} from "../../catalog/domain/effective-creature-skills-two-da";

const BYTE_MAX = 0xff;
const MAX_ROWS = 4_096;
const MAX_OPAQUE_SIBLING_FIELDS = 65_535;
const STORAGE_KEYS = [
  "present", "nativeType", "structTypeId", "rankNativeType", "ranks",
  "opaqueSiblingFieldCounts",
] as const;
const BOUND_STORAGE_KEYS = [...STORAGE_KEYS, "table"] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const MUTATION_KEYS = [
  "expectedRanks", "ranks", "tableSha256", "rowCount", "resizeMode",
  "confirmTruncation",
] as const;

export type AreaCreatureSkillListTable = EffectiveCreatureSkillsTwoDaDescriptor;

export type AreaCreatureSkillListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 0;
      rankNativeType: "byte";
      ranks: readonly number[];
      opaqueSiblingFieldCounts: readonly number[];
      table?: AreaCreatureSkillListTable;
    }>;

export type AreaCreatureSkillListResizeMode =
  | "same_length"
  | "expand_zero_tail"
  | "truncate_tail";

export interface ExistingAreaCreatureSkillListMutation {
  readonly expectedRanks: readonly number[];
  readonly ranks: readonly number[];
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly resizeMode: AreaCreatureSkillListResizeMode;
  readonly confirmTruncation: boolean;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readRanks(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length > MAX_ROWS || value.some((entry) =>
    !Number.isSafeInteger(entry) || Number(entry) < 0 || Number(entry) > BYTE_MAX)) return null;
  return Object.freeze(value.map(Number));
}

function readOpaqueSiblingFieldCounts(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length > MAX_ROWS || value.some((entry) =>
    !Number.isSafeInteger(entry) || Number(entry) < 0 ||
    Number(entry) > MAX_OPAQUE_SIBLING_FIELDS)) return null;
  return Object.freeze(value.map(Number));
}

function readTable(value: unknown): AreaCreatureSkillListTable | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  const candidate = { descriptor: value, rows: [] };
  if (!isExactEffectiveCreatureSkillsTwoDaTable(candidate)) return null;
  return Object.freeze({ ...candidate.descriptor });
}

export function readAreaCreatureSkillListStorage(
  value: unknown,
): AreaCreatureSkillListStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactKeys(value, STORAGE_KEYS);
  const bound = hasExactKeys(value, BOUND_STORAGE_KEYS);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "list" ||
    value.structTypeId !== 0 || value.rankNativeType !== "byte") return null;
  const ranks = readRanks(value.ranks);
  const opaqueSiblingFieldCounts = readOpaqueSiblingFieldCounts(
    value.opaqueSiblingFieldCounts,
  );
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

export function bindEffectiveCreatureSkillsTwoDaToCreatureSkillList(
  storageInput: unknown,
  tableInput: unknown,
): AreaCreatureSkillListStorage {
  const storage = readAreaCreatureSkillListStorage(storageInput);
  if (!storage) throw new TypeError("Creature SkillList storage is invalid.");
  if (!storage.present || !isExactEffectiveCreatureSkillsTwoDaTable(tableInput)) return storage;
  return Object.freeze({
    ...storage,
    ranks: Object.freeze([...storage.ranks]),
    opaqueSiblingFieldCounts: Object.freeze([...storage.opaqueSiblingFieldCounts]),
    table: Object.freeze({ ...tableInput.descriptor }),
  });
}

function expectedResizeMode(
  sourceCount: number,
  targetCount: number,
): AreaCreatureSkillListResizeMode {
  return sourceCount === targetCount
    ? "same_length"
    : sourceCount < targetCount ? "expand_zero_tail" : "truncate_tail";
}

export function readExistingAreaCreatureSkillListMutation(
  value: unknown,
): ExistingAreaCreatureSkillListMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    typeof value.tableSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS || typeof value.confirmTruncation !== "boolean") return null;
  const expectedRanks = readRanks(value.expectedRanks);
  const ranks = readRanks(value.ranks);
  if (!expectedRanks || !ranks || ranks.length !== Number(value.rowCount)) return null;
  const resizeMode = expectedResizeMode(expectedRanks.length, ranks.length);
  if (value.resizeMode !== resizeMode ||
    (resizeMode === "truncate_tail") !== value.confirmTruncation ||
    (resizeMode === "same_length" &&
      ranks.every((rank, index) => rank === expectedRanks[index]))) return null;
  return Object.freeze({
    expectedRanks,
    ranks,
    tableSha256: value.tableSha256,
    rowCount: Number(value.rowCount),
    resizeMode,
    confirmTruncation: value.confirmTruncation,
  });
}
