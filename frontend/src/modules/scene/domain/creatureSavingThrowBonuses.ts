import type {
  SceneObjectCreatureSavingThrowBonusesStorage,
  SceneObjectCreatureSavingThrowBonusStorage,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_SAVING_THROW_BONUS_FIELDS = Object.freeze([
  Object.freeze({ key: "reflex", nativeLabel: "refbonus", statisticsKey: "reflexBonus" }),
  Object.freeze({ key: "will", nativeLabel: "willbonus", statisticsKey: "willBonus" }),
  Object.freeze({ key: "fortitude", nativeLabel: "fortbonus", statisticsKey: "fortitudeBonus" }),
] as const);

export type CreatureSavingThrowBonusKey =
  typeof CREATURE_SAVING_THROW_BONUS_FIELDS[number]["key"];

const CREATURE_SAVING_THROW_BONUS_KEYS = Object.freeze(
  CREATURE_SAVING_THROW_BONUS_FIELDS.map((field) => field.key),
);

export function normalizeCreatureSavingThrowBonus(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 250
    ? Number(value)
    : null;
}

export function readCreatureSavingThrowBonusStorage(
  input: unknown,
): SceneObjectCreatureSavingThrowBonusStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    !hasExactRecordKeys(input, ["present", "nativeType", "value"]) ||
    input.present !== true ||
    input.nativeType !== "short"
  ) return null;
  const value = normalizeCreatureSavingThrowBonus(input.value);
  return value === null
    ? null
    : Object.freeze({ present: true, nativeType: "short", value });
}

export function readCreatureSavingThrowBonusesStorage(
  input: unknown,
): SceneObjectCreatureSavingThrowBonusesStorage | null {
  if (
    !isPlainRecord(input) ||
    !hasExactRecordKeys(input, CREATURE_SAVING_THROW_BONUS_KEYS)
  ) return null;
  const result = {} as Record<
    CreatureSavingThrowBonusKey,
    SceneObjectCreatureSavingThrowBonusStorage
  >;
  for (const key of CREATURE_SAVING_THROW_BONUS_KEYS) {
    const storage = readCreatureSavingThrowBonusStorage(input[key]);
    if (!storage) return null;
    result[key] = storage;
  }
  return Object.freeze(result);
}
