const INT_MAX = 0x7fff_ffff;
const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;

const MUTATION_KEYS = [
  "expectedClassIds",
  "expectedLevels",
  "classListGraphSha256",
  "classSlotIndices",
  "destructiveSpellClearConfirmed",
] as const;

export interface ExistingAreaCreatureClassSpellClearMutation {
  readonly expectedClassIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly classListGraphSha256: string;
  readonly classSlotIndices: readonly number[];
  readonly destructiveSpellClearConfirmed: true;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>): boolean {
  const actual = Object.keys(value);
  return actual.length === MUTATION_KEYS.length &&
    MUTATION_KEYS.every((key) => actual.includes(key));
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

export function readExistingAreaCreatureClassSpellClearMutation(
  value: unknown,
): ExistingAreaCreatureClassSpellClearMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value) ||
    value.destructiveSpellClearConfirmed !== true ||
    typeof value.classListGraphSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.classListGraphSha256) ||
    !Array.isArray(value.expectedClassIds) ||
    value.expectedClassIds.length < 1 || value.expectedClassIds.length > MAX_CLASS_SLOTS ||
    !Array.isArray(value.expectedLevels) ||
    value.expectedLevels.length !== value.expectedClassIds.length ||
    !Array.isArray(value.classSlotIndices) || value.classSlotIndices.length < 1 ||
    value.classSlotIndices.length > value.expectedClassIds.length) return null;

  const expectedClassIdCount = value.expectedClassIds.length;
  if (value.expectedClassIds.some((entry) => !isBoundedInteger(entry, 0, INT_MAX)) ||
    value.expectedLevels.some((entry) => !isBoundedInteger(entry, 1, MAX_CLASS_LEVEL)) ||
    value.expectedLevels.reduce((sum, entry) => sum + Number(entry), 0) > MAX_TOTAL_LEVEL ||
    value.classSlotIndices.some((entry) =>
      !isBoundedInteger(entry, 0, expectedClassIdCount - 1))) return null;

  const expectedClassIds = value.expectedClassIds.map(Number);
  const expectedLevels = value.expectedLevels.map(Number);
  const classSlotIndices = value.classSlotIndices.map(Number);
  if (new Set(expectedClassIds).size !== expectedClassIds.length ||
    classSlotIndices.some((entry, index) => index > 0 &&
      entry <= classSlotIndices[index - 1]!)) return null;

  return Object.freeze({
    expectedClassIds: Object.freeze(expectedClassIds),
    expectedLevels: Object.freeze(expectedLevels),
    classListGraphSha256: value.classListGraphSha256,
    classSlotIndices: Object.freeze(classSlotIndices),
    destructiveSpellClearConfirmed: true,
  });
}
