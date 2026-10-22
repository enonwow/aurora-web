const INT_MAX = 0x7fff_ffff;
const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
const MAX_SPELL_LISTS = MAX_CLASS_SLOTS * 28;
export const MAX_AREA_CREATURE_CLASS_SPELL_REORDER_ENTRIES = 256;

const MUTATION_KEYS = [
  "expectedClassIds",
  "expectedLevels",
  "classListGraphSha256",
  "reorders",
  "spellReorderConfirmed",
] as const;
const REORDER_KEYS = ["classSlotIndex", "listKind", "spellLevel", "entryOrder"] as const;

export type AreaCreatureClassSpellReorderListKind = "known" | "memorized";

export interface AreaCreatureClassSpellReorder {
  readonly classSlotIndex: number;
  readonly listKind: AreaCreatureClassSpellReorderListKind;
  readonly spellLevel: number;
  readonly entryOrder: readonly number[];
}

export interface ExistingAreaCreatureClassSpellReorderMutation {
  readonly expectedClassIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly classListGraphSha256: string;
  readonly reorders: readonly AreaCreatureClassSpellReorder[];
  readonly spellReorderConfirmed: true;
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

function listOrder(value: Pick<AreaCreatureClassSpellReorder,
  "classSlotIndex" | "listKind" | "spellLevel">): number {
  return value.classSlotIndex * 28 + (value.listKind === "known" ? 0 : 14) + value.spellLevel;
}

function readNonIdentityPermutation(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length < 2 ||
    value.length > MAX_AREA_CREATURE_CLASS_SPELL_REORDER_ENTRIES) return null;
  const entryOrder = value.map(Number);
  if (value.some((entry) => !isInteger(entry, 0, value.length - 1)) ||
    new Set(entryOrder).size !== entryOrder.length ||
    entryOrder.every((entry, index) => entry === index)) return null;
  return Object.freeze(entryOrder);
}

export function readExistingAreaCreatureClassSpellReorderMutation(
  value: unknown,
): ExistingAreaCreatureClassSpellReorderMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    value.spellReorderConfirmed !== true ||
    typeof value.classListGraphSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.classListGraphSha256) ||
    !Array.isArray(value.expectedClassIds) || value.expectedClassIds.length < 1 ||
    value.expectedClassIds.length > MAX_CLASS_SLOTS ||
    !Array.isArray(value.expectedLevels) ||
    value.expectedLevels.length !== value.expectedClassIds.length ||
    !Array.isArray(value.reorders) || value.reorders.length < 1 ||
    value.reorders.length > MAX_SPELL_LISTS) return null;

  const expectedClassIds = value.expectedClassIds.map(Number);
  const expectedLevels = value.expectedLevels.map(Number);
  if (value.expectedClassIds.some((entry) => !isInteger(entry, 0, INT_MAX)) ||
    new Set(expectedClassIds).size !== expectedClassIds.length ||
    value.expectedLevels.some((entry) => !isInteger(entry, 1, MAX_CLASS_LEVEL)) ||
    expectedLevels.reduce((sum, level) => sum + level, 0) > MAX_TOTAL_LEVEL) return null;

  const reorders: AreaCreatureClassSpellReorder[] = [];
  let previous = -1;
  let totalEntries = 0;
  for (const candidate of value.reorders) {
    if (!isPlainRecord(candidate) || !hasExactKeys(candidate, REORDER_KEYS) ||
      !isInteger(candidate.classSlotIndex, 0, expectedClassIds.length - 1) ||
      (candidate.listKind !== "known" && candidate.listKind !== "memorized") ||
      !isInteger(candidate.spellLevel, 0, 13)) return null;
    const entryOrder = readNonIdentityPermutation(candidate.entryOrder);
    if (!entryOrder) return null;
    const reorder = Object.freeze({
      classSlotIndex: Number(candidate.classSlotIndex),
      listKind: candidate.listKind,
      spellLevel: Number(candidate.spellLevel),
      entryOrder,
    });
    const order = listOrder(reorder);
    totalEntries += entryOrder.length;
    if (order <= previous || totalEntries > MAX_AREA_CREATURE_CLASS_SPELL_REORDER_ENTRIES) {
      return null;
    }
    previous = order;
    reorders.push(reorder);
  }

  return Object.freeze({
    expectedClassIds: Object.freeze(expectedClassIds),
    expectedLevels: Object.freeze(expectedLevels),
    classListGraphSha256: value.classListGraphSha256,
    reorders: Object.freeze(reorders),
    spellReorderConfirmed: true,
  });
}
