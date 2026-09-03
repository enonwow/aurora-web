import {
  isExactEffectiveCreatureFeatsTwoDaTable,
  MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_ROWS,
  type EffectiveCreatureFeatsTwoDaDescriptor,
} from "../../catalog/domain/effective-creature-feats-two-da";

const WORD_MAX = 0xffff;
const MAX_OPAQUE_SIBLING_FIELDS = 65_535;
const STORAGE_KEYS = [
  "present", "nativeType", "structTypeId", "featNativeType", "featIds",
  "opaqueSiblingFieldCounts",
] as const;
const BOUND_STORAGE_KEYS = [...STORAGE_KEYS, "table"] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const MUTATION_KEYS = [
  "expectedFeatIds", "featIds", "opaqueSiblingFieldCounts", "tableSha256", "rowCount",
  "row40Transition",
] as const;

export type AreaCreatureFeatListTable = EffectiveCreatureFeatsTwoDaDescriptor;
export type AreaCreatureFeatRow40Transition = "unchanged" | "added" | "removed";

export type AreaCreatureFeatListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 1;
      featNativeType: "word";
      featIds: readonly number[];
      opaqueSiblingFieldCounts: readonly number[];
      table?: AreaCreatureFeatListTable;
    }>;

export interface ExistingAreaCreatureFeatListMutation {
  readonly expectedFeatIds: readonly number[];
  readonly featIds: readonly number[];
  readonly opaqueSiblingFieldCounts: readonly number[];
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly row40Transition: AreaCreatureFeatRow40Transition;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readFeatIds(value: unknown, requireUnique: boolean): readonly number[] | null {
  if (!Array.isArray(value) || value.length > MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_ROWS ||
    value.some((entry) => !Number.isSafeInteger(entry) || Number(entry) < 0 ||
      Number(entry) > WORD_MAX)) return null;
  const featIds = value.map(Number);
  if (requireUnique && new Set(featIds).size !== featIds.length) return null;
  return Object.freeze(featIds);
}

function readOpaqueSiblingFieldCounts(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length > MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_ROWS ||
    value.some((entry) => !Number.isSafeInteger(entry) || Number(entry) < 0 ||
      Number(entry) > MAX_OPAQUE_SIBLING_FIELDS)) return null;
  return Object.freeze(value.map(Number));
}

function readTable(value: unknown): AreaCreatureFeatListTable | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  const candidate = { descriptor: value, rows: [] };
  if (!isExactEffectiveCreatureFeatsTwoDaTable(candidate)) return null;
  return Object.freeze({ ...candidate.descriptor });
}

export function readAreaCreatureFeatListStorage(
  value: unknown,
): AreaCreatureFeatListStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactKeys(value, STORAGE_KEYS);
  const bound = hasExactKeys(value, BOUND_STORAGE_KEYS);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "list" ||
    value.structTypeId !== 1 || value.featNativeType !== "word") return null;
  const featIds = readFeatIds(value.featIds, false);
  const opaqueSiblingFieldCounts = readOpaqueSiblingFieldCounts(
    value.opaqueSiblingFieldCounts,
  );
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

export function bindEffectiveCreatureFeatsTwoDaToCreatureFeatList(
  storageInput: unknown,
  tableInput: unknown,
): AreaCreatureFeatListStorage {
  const storage = readAreaCreatureFeatListStorage(storageInput);
  if (!storage) throw new TypeError("Creature FeatList storage is invalid.");
  if (!storage.present || !isExactEffectiveCreatureFeatsTwoDaTable(tableInput)) return storage;
  return Object.freeze({
    ...storage,
    featIds: Object.freeze([...storage.featIds]),
    opaqueSiblingFieldCounts: Object.freeze([...storage.opaqueSiblingFieldCounts]),
    table: Object.freeze({ ...tableInput.descriptor }),
  });
}

function expectedRow40Transition(
  expectedFeatIds: readonly number[],
  featIds: readonly number[],
): AreaCreatureFeatRow40Transition {
  const source = expectedFeatIds.includes(40);
  const target = featIds.includes(40);
  return source === target ? "unchanged" : target ? "added" : "removed";
}

function hasSameMembership(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) return false;
  const rightIds = new Set(right);
  return left.every((featId) => rightIds.has(featId));
}

export function readExistingAreaCreatureFeatListMutation(
  value: unknown,
): ExistingAreaCreatureFeatListMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    typeof value.tableSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_EFFECTIVE_CREATURE_FEATS_TWO_DA_ROWS) return null;
  const expectedFeatIds = readFeatIds(value.expectedFeatIds, true);
  const featIds = readFeatIds(value.featIds, true);
  const opaqueSiblingFieldCounts = readOpaqueSiblingFieldCounts(
    value.opaqueSiblingFieldCounts,
  );
  if (!expectedFeatIds || !featIds || !opaqueSiblingFieldCounts ||
    opaqueSiblingFieldCounts.length !== expectedFeatIds.length ||
    opaqueSiblingFieldCounts.some((count) => count !== 0) ||
    expectedFeatIds.some((featId) => featId >= Number(value.rowCount)) ||
    featIds.some((featId) => featId >= Number(value.rowCount)) ||
    hasSameMembership(expectedFeatIds, featIds)) return null;
  const row40Transition = expectedRow40Transition(expectedFeatIds, featIds);
  if (value.row40Transition !== row40Transition) return null;
  return Object.freeze({
    expectedFeatIds,
    featIds,
    opaqueSiblingFieldCounts,
    tableSha256: value.tableSha256,
    rowCount: Number(value.rowCount),
    row40Transition,
  });
}
