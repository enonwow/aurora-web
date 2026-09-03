const INT_MAX = 0x7fff_ffff;
const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
const MAX_OPAQUE_SIBLING_FIELDS = 65_535;

const STORAGE_KEYS = [
  "present", "nativeType", "structTypeId", "classNativeType", "levelNativeType",
  "entries",
] as const;
const ENTRY_KEYS = ["classId", "level", "opaqueSiblingFieldCount"] as const;
const MUTATION_KEYS = [
  "expectedClassIds", "expectedLevels", "levels", "opaqueSiblingFieldCounts",
] as const;

export interface AreaCreatureClassLevelEntry {
  readonly classId: number;
  readonly level: number;
  readonly opaqueSiblingFieldCount: number;
}

export type AreaCreatureClassLevelState =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 2;
      classNativeType: "int";
      levelNativeType: "short";
      entries: readonly AreaCreatureClassLevelEntry[];
    }>;

export interface ExistingAreaCreatureClassLevelMutation {
  readonly expectedClassIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly levels: readonly number[];
  readonly opaqueSiblingFieldCounts: readonly number[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isClassId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= INT_MAX;
}

function isClassLevel(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 &&
    Number(value) <= MAX_CLASS_LEVEL;
}

function isOpaqueSiblingFieldCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 &&
    Number(value) <= MAX_OPAQUE_SIBLING_FIELDS;
}

function readClassIds(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CLASS_SLOTS ||
    value.some((entry) => !isClassId(entry))) return null;
  const classIds = value.map(Number);
  return new Set(classIds).size === classIds.length ? Object.freeze(classIds) : null;
}

function readClassLevels(value: unknown, expectedCount?: number): readonly number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CLASS_SLOTS ||
    expectedCount !== undefined && value.length !== expectedCount ||
    value.some((entry) => !isClassLevel(entry))) return null;
  const levels = value.map(Number);
  return levels.reduce((sum, level) => sum + level, 0) <= MAX_TOTAL_LEVEL
    ? Object.freeze(levels)
    : null;
}

function readOpaqueSiblingFieldCounts(
  value: unknown,
  expectedCount: number,
): readonly number[] | null {
  if (!Array.isArray(value) || value.length !== expectedCount ||
    value.some((entry) => !isOpaqueSiblingFieldCount(entry))) return null;
  return Object.freeze(value.map(Number));
}

export function readAreaCreatureClassLevelState(
  value: unknown,
): AreaCreatureClassLevelState | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  if (!hasExactKeys(value, STORAGE_KEYS) || value.present !== true ||
    value.nativeType !== "list" || value.structTypeId !== 2 ||
    value.classNativeType !== "int" || value.levelNativeType !== "short" ||
    !Array.isArray(value.entries) || value.entries.length < 1 ||
    value.entries.length > MAX_CLASS_SLOTS) return null;

  const entries: AreaCreatureClassLevelEntry[] = [];
  for (const candidate of value.entries) {
    if (!isPlainRecord(candidate) || !hasExactKeys(candidate, ENTRY_KEYS) ||
      !isClassId(candidate.classId) || !isClassLevel(candidate.level) ||
      !isOpaqueSiblingFieldCount(candidate.opaqueSiblingFieldCount)) return null;
    entries.push(Object.freeze({
      classId: Number(candidate.classId),
      level: Number(candidate.level),
      opaqueSiblingFieldCount: Number(candidate.opaqueSiblingFieldCount),
    }));
  }
  if (new Set(entries.map((entry) => entry.classId)).size !== entries.length ||
    entries.reduce((sum, entry) => sum + entry.level, 0) > MAX_TOTAL_LEVEL) return null;
  return Object.freeze({
    present: true,
    nativeType: "list",
    structTypeId: 2,
    classNativeType: "int",
    levelNativeType: "short",
    entries: Object.freeze(entries),
  });
}

export function readExistingAreaCreatureClassLevelMutation(
  value: unknown,
): ExistingAreaCreatureClassLevelMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS)) return null;
  const expectedClassIds = readClassIds(value.expectedClassIds);
  if (!expectedClassIds) return null;
  const expectedLevels = readClassLevels(value.expectedLevels, expectedClassIds.length);
  const levels = readClassLevels(value.levels, expectedClassIds.length);
  const opaqueSiblingFieldCounts = readOpaqueSiblingFieldCounts(
    value.opaqueSiblingFieldCounts,
    expectedClassIds.length,
  );
  if (!expectedLevels || !levels || !opaqueSiblingFieldCounts ||
    levels.every((level, index) => level === expectedLevels[index])) return null;
  return Object.freeze({
    expectedClassIds,
    expectedLevels,
    levels,
    opaqueSiblingFieldCounts,
  });
}
