const INT_MAX = 0x7fff_ffff;
const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
export const MAX_AREA_CREATURE_CLASS_SPELL_REMOVAL_TARGETS = 256;

const MUTATION_KEYS = [
  "expectedClassIds",
  "expectedLevels",
  "classListGraphSha256",
  "targets",
  "destructiveSpellRemovalConfirmed",
] as const;
const TARGET_KEYS = ["classSlotIndex", "listKind", "spellLevel", "entryIndex"] as const;

export type AreaCreatureClassSpellListKind = "known" | "memorized";

export interface AreaCreatureClassSpellRemovalTarget {
  readonly classSlotIndex: number;
  readonly listKind: AreaCreatureClassSpellListKind;
  readonly spellLevel: number;
  readonly entryIndex: number;
}

export interface ExistingAreaCreatureClassSpellRemovalMutation {
  readonly expectedClassIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly classListGraphSha256: string;
  readonly targets: readonly AreaCreatureClassSpellRemovalTarget[];
  readonly destructiveSpellRemovalConfirmed: true;
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

function targetOrder(target: AreaCreatureClassSpellRemovalTarget): number {
  return target.classSlotIndex * 28 * MAX_AREA_CREATURE_CLASS_SPELL_REMOVAL_TARGETS +
    (target.listKind === "known" ? 0 : 14) * MAX_AREA_CREATURE_CLASS_SPELL_REMOVAL_TARGETS +
    target.spellLevel * MAX_AREA_CREATURE_CLASS_SPELL_REMOVAL_TARGETS + target.entryIndex;
}

export function readExistingAreaCreatureClassSpellRemovalMutation(
  value: unknown,
): ExistingAreaCreatureClassSpellRemovalMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    value.destructiveSpellRemovalConfirmed !== true ||
    typeof value.classListGraphSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.classListGraphSha256) ||
    !Array.isArray(value.expectedClassIds) || value.expectedClassIds.length < 1 ||
    value.expectedClassIds.length > MAX_CLASS_SLOTS ||
    !Array.isArray(value.expectedLevels) ||
    value.expectedLevels.length !== value.expectedClassIds.length ||
    !Array.isArray(value.targets) || value.targets.length < 1 ||
    value.targets.length > MAX_AREA_CREATURE_CLASS_SPELL_REMOVAL_TARGETS) return null;

  const expectedClassIds = value.expectedClassIds.map(Number);
  const expectedLevels = value.expectedLevels.map(Number);
  if (value.expectedClassIds.some((entry) => !isInteger(entry, 0, INT_MAX)) ||
    new Set(expectedClassIds).size !== expectedClassIds.length ||
    value.expectedLevels.some((entry) => !isInteger(entry, 1, MAX_CLASS_LEVEL)) ||
    expectedLevels.reduce((sum, level) => sum + level, 0) > MAX_TOTAL_LEVEL) return null;

  const targets: AreaCreatureClassSpellRemovalTarget[] = [];
  let previous = -1;
  for (const candidate of value.targets) {
    if (!isPlainRecord(candidate) || !hasExactKeys(candidate, TARGET_KEYS) ||
      !isInteger(candidate.classSlotIndex, 0, expectedClassIds.length - 1) ||
      (candidate.listKind !== "known" && candidate.listKind !== "memorized") ||
      !isInteger(candidate.spellLevel, 0, 13) ||
      !isInteger(candidate.entryIndex, 0, MAX_AREA_CREATURE_CLASS_SPELL_REMOVAL_TARGETS - 1)) {
      return null;
    }
    const target = Object.freeze({
      classSlotIndex: Number(candidate.classSlotIndex),
      listKind: candidate.listKind,
      spellLevel: Number(candidate.spellLevel),
      entryIndex: Number(candidate.entryIndex),
    });
    const order = targetOrder(target);
    if (order <= previous) return null;
    previous = order;
    targets.push(target);
  }

  return Object.freeze({
    expectedClassIds: Object.freeze(expectedClassIds),
    expectedLevels: Object.freeze(expectedLevels),
    classListGraphSha256: value.classListGraphSha256,
    targets: Object.freeze(targets),
    destructiveSpellRemovalConfirmed: true,
  });
}
