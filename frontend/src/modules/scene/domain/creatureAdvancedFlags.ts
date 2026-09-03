import type { SceneObjectSourceMetadata } from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export type CreatureBinaryFlagValue = 0 | 1;

export type CreatureBinaryFlagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: CreatureBinaryFlagValue }>;

export const CREATURE_ADVANCED_FLAG_FIELDS = Object.freeze([
  "disarmable",
  "plot",
  "immortal",
  "lootable",
  "noPermanentDeath",
] as const);

export type CreatureAdvancedFlagKey = typeof CREATURE_ADVANCED_FLAG_FIELDS[number];

export type CreatureAdvancedFlagsStorage = Readonly<
  Record<CreatureAdvancedFlagKey, CreatureBinaryFlagStorage>
>;

export function isCreatureBinaryFlagValue(
  value: unknown,
): value is CreatureBinaryFlagValue {
  return value === 0 || value === 1;
}

export function readCreatureBinaryFlagStorage(
  input: unknown,
): CreatureBinaryFlagStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "value"]) &&
    input.present === true &&
    isCreatureBinaryFlagValue(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function readCreatureAdvancedFlagsStorage(
  input: unknown,
): CreatureAdvancedFlagsStorage | null {
  if (!isPlainRecord(input) || !hasExactRecordKeys(input, CREATURE_ADVANCED_FLAG_FIELDS)) {
    return null;
  }
  const result = {} as Record<CreatureAdvancedFlagKey, CreatureBinaryFlagStorage>;
  for (const key of CREATURE_ADVANCED_FLAG_FIELDS) {
    const storage = readCreatureBinaryFlagStorage(input[key]);
    if (!storage) return null;
    result[key] = storage;
  }
  return Object.freeze(result);
}

export function creatureAdvancedFlagToBoolean(value: unknown): boolean | undefined {
  return isCreatureBinaryFlagValue(value) ? value === 1 : undefined;
}

export function canEditExistingCreatureAdvancedFlag(
  source: SceneObjectSourceMetadata | undefined,
  field: CreatureAdvancedFlagKey,
): boolean {
  const flags = readCreatureAdvancedFlagsStorage(source?.creatureAdvancedFlags);
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    flags?.[field].present === true;
}
