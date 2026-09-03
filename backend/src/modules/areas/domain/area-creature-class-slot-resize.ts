const INT_MAX = 0x7fff_ffff;
const BYTE_MAX = 0xff;
const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
const MAX_CLASS_ROWS = 65_536;
const MAX_PACKAGE_ROWS = 256;

const MUTATION_KEYS = [
  "expectedClassIds", "expectedLevels", "classIds", "levels",
  "classListGraphSha256", "resizeMode", "destructiveRemovedSlotsConfirmed",
  "expectedStartingPackage", "startingPackage", "classesTableSha256",
  "classesRowCount", "packagesTableSha256", "packagesRowCount",
] as const;

export type ExistingAreaCreatureClassSlotResizeMode = "append_tail" | "truncate_tail";

export interface ExistingAreaCreatureClassSlotResizeMutation {
  readonly expectedClassIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly classIds: readonly number[];
  readonly levels: readonly number[];
  readonly classListGraphSha256: string;
  readonly resizeMode: ExistingAreaCreatureClassSlotResizeMode;
  readonly destructiveRemovedSlotsConfirmed: boolean;
  readonly expectedStartingPackage: number;
  readonly startingPackage: number;
  readonly classesTableSha256: string;
  readonly classesRowCount: number;
  readonly packagesTableSha256: string;
  readonly packagesRowCount: number;
}

export function readExistingAreaCreatureClassSlotResizeMutation(
  value: unknown,
): ExistingAreaCreatureClassSlotResizeMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    !isSha256(value.classListGraphSha256) || !isSha256(value.classesTableSha256) ||
    !isSha256(value.packagesTableSha256) ||
    !isBoundedInteger(value.classesRowCount, 1, MAX_CLASS_ROWS) ||
    !isBoundedInteger(value.packagesRowCount, 1, MAX_PACKAGE_ROWS) ||
    !isBoundedInteger(value.expectedStartingPackage, 0, BYTE_MAX) ||
    !isBoundedInteger(value.startingPackage, 0, BYTE_MAX) ||
    Number(value.expectedStartingPackage) >= Number(value.packagesRowCount) ||
    Number(value.startingPackage) >= Number(value.packagesRowCount) ||
    (value.resizeMode !== "append_tail" && value.resizeMode !== "truncate_tail") ||
    typeof value.destructiveRemovedSlotsConfirmed !== "boolean") return null;

  const expectedClassIds = readIds(value.expectedClassIds, Number(value.classesRowCount));
  const classIds = readIds(value.classIds, Number(value.classesRowCount));
  if (!expectedClassIds || !classIds || expectedClassIds.length === classIds.length) return null;
  const expectedLevels = readLevels(value.expectedLevels, expectedClassIds.length);
  const levels = readLevels(value.levels, classIds.length);
  if (!expectedLevels || !levels) return null;

  const retainedCount = Math.min(expectedClassIds.length, classIds.length);
  const retainedPrefixMatches = Array.from({ length: retainedCount }, (_, index) =>
    expectedClassIds[index] === classIds[index] && expectedLevels[index] === levels[index])
    .every(Boolean);
  if (!retainedPrefixMatches) return null;

  const append = classIds.length > expectedClassIds.length;
  if (append !== (value.resizeMode === "append_tail") ||
    append === value.destructiveRemovedSlotsConfirmed) return null;

  return Object.freeze({
    expectedClassIds,
    expectedLevels,
    classIds,
    levels,
    classListGraphSha256: value.classListGraphSha256,
    resizeMode: value.resizeMode,
    destructiveRemovedSlotsConfirmed: value.destructiveRemovedSlotsConfirmed,
    expectedStartingPackage: Number(value.expectedStartingPackage),
    startingPackage: Number(value.startingPackage),
    classesTableSha256: value.classesTableSha256,
    classesRowCount: Number(value.classesRowCount),
    packagesTableSha256: value.packagesTableSha256,
    packagesRowCount: Number(value.packagesRowCount),
  });
}

function readIds(value: unknown, rowCount: number): readonly number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CLASS_SLOTS ||
    value.some((entry) => !isBoundedInteger(entry, 0, INT_MAX) || Number(entry) >= rowCount)) {
    return null;
  }
  const ids = value.map(Number);
  return new Set(ids).size === ids.length ? Object.freeze(ids) : null;
}

function readLevels(value: unknown, count: number): readonly number[] | null {
  if (!Array.isArray(value) || value.length !== count ||
    value.some((entry) => !isBoundedInteger(entry, 1, MAX_CLASS_LEVEL))) return null;
  const levels = value.map(Number);
  return levels.reduce((sum, level) => sum + level, 0) <= MAX_TOTAL_LEVEL
    ? Object.freeze(levels)
    : null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}
