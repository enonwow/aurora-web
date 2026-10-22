const INT_MAX = 0x7fff_ffff;
const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
const MAX_TABLE_ROWS = 65_536;
export const MAX_AREA_CREATURE_CLASS_SPELL_REPLACEMENTS = 256;

const MUTATION_KEYS = [
  "expectedClassIds",
  "expectedLevels",
  "classListGraphSha256",
  "classesTableSha256",
  "classesRowCount",
  "spellsTableSha256",
  "spellsRowCount",
  "replacements",
  "spellReplacementConfirmed",
] as const;
const REPLACEMENT_KEYS = [
  "classSlotIndex",
  "listKind",
  "spellLevel",
  "entryIndex",
  "expectedSpellId",
  "targetSpellId",
] as const;
const SUPPORTED_CLASS_IDS = new Set([1, 2, 3, 6, 7, 9, 10]);
const KNOWN_CLASS_IDS = new Set([1, 9]);

export interface AreaCreatureClassSpellReplacement {
  readonly classSlotIndex: number;
  readonly listKind: "known" | "memorized";
  readonly spellLevel: number;
  readonly entryIndex: number;
  readonly expectedSpellId: number;
  readonly targetSpellId: number;
}

export interface ExistingAreaCreatureClassSpellReplacementMutation {
  readonly expectedClassIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly classListGraphSha256: string;
  readonly classesTableSha256: string;
  readonly classesRowCount: number;
  readonly spellsTableSha256: string;
  readonly spellsRowCount: number;
  readonly replacements: readonly AreaCreatureClassSpellReplacement[];
  readonly spellReplacementConfirmed: true;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isInteger(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function targetOrder(value: AreaCreatureClassSpellReplacement): number {
  return (((value.classSlotIndex * 28 + (value.listKind === "known" ? 0 : 14) +
    value.spellLevel) * MAX_AREA_CREATURE_CLASS_SPELL_REPLACEMENTS) + value.entryIndex);
}

export function readExistingAreaCreatureClassSpellReplacementMutation(
  value: unknown,
): ExistingAreaCreatureClassSpellReplacementMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    value.spellReplacementConfirmed !== true || !isSha256(value.classListGraphSha256) ||
    !isSha256(value.classesTableSha256) || !isSha256(value.spellsTableSha256) ||
    !isInteger(value.classesRowCount, 1, MAX_TABLE_ROWS) ||
    !isInteger(value.spellsRowCount, 1, MAX_TABLE_ROWS) ||
    !Array.isArray(value.expectedClassIds) || value.expectedClassIds.length < 1 ||
    value.expectedClassIds.length > MAX_CLASS_SLOTS ||
    !Array.isArray(value.expectedLevels) ||
    value.expectedLevels.length !== value.expectedClassIds.length ||
    !Array.isArray(value.replacements) || value.replacements.length < 1 ||
    value.replacements.length > MAX_AREA_CREATURE_CLASS_SPELL_REPLACEMENTS) return null;

  const expectedClassIds = value.expectedClassIds.map(Number);
  const expectedLevels = value.expectedLevels.map(Number);
  if (value.expectedClassIds.some((entry) => !isInteger(entry, 0, INT_MAX)) ||
    expectedClassIds.some((entry) => entry >= Number(value.classesRowCount)) ||
    new Set(expectedClassIds).size !== expectedClassIds.length ||
    value.expectedLevels.some((entry) => !isInteger(entry, 1, MAX_CLASS_LEVEL)) ||
    expectedLevels.reduce((sum, level) => sum + level, 0) > MAX_TOTAL_LEVEL) return null;

  const replacements: AreaCreatureClassSpellReplacement[] = [];
  let previousOrder = -1;
  for (const candidate of value.replacements) {
    if (!isPlainRecord(candidate) || !hasExactKeys(candidate, REPLACEMENT_KEYS) ||
      !isInteger(candidate.classSlotIndex, 0, expectedClassIds.length - 1) ||
      (candidate.listKind !== "known" && candidate.listKind !== "memorized") ||
      !isInteger(candidate.spellLevel, 0, 13) ||
      !isInteger(candidate.entryIndex, 0, MAX_AREA_CREATURE_CLASS_SPELL_REPLACEMENTS - 1) ||
      !isInteger(candidate.expectedSpellId, 0, 0xffff) ||
      !isInteger(candidate.targetSpellId, 0, Number(value.spellsRowCount) - 1) ||
      Number(candidate.targetSpellId) > 0xffff ||
      candidate.expectedSpellId === candidate.targetSpellId) return null;
    const classId = expectedClassIds[Number(candidate.classSlotIndex)]!;
    if (!SUPPORTED_CLASS_IDS.has(classId) ||
      (KNOWN_CLASS_IDS.has(classId) ? candidate.listKind !== "known" :
        candidate.listKind !== "memorized")) return null;
    const replacement = Object.freeze({
      classSlotIndex: Number(candidate.classSlotIndex),
      listKind: candidate.listKind,
      spellLevel: Number(candidate.spellLevel),
      entryIndex: Number(candidate.entryIndex),
      expectedSpellId: Number(candidate.expectedSpellId),
      targetSpellId: Number(candidate.targetSpellId),
    });
    const order = targetOrder(replacement);
    if (order <= previousOrder) return null;
    previousOrder = order;
    replacements.push(replacement);
  }

  return Object.freeze({
    expectedClassIds: Object.freeze(expectedClassIds),
    expectedLevels: Object.freeze(expectedLevels),
    classListGraphSha256: value.classListGraphSha256,
    classesTableSha256: value.classesTableSha256,
    classesRowCount: Number(value.classesRowCount),
    spellsTableSha256: value.spellsTableSha256,
    spellsRowCount: Number(value.spellsRowCount),
    replacements: Object.freeze(replacements),
    spellReplacementConfirmed: true,
  });
}
