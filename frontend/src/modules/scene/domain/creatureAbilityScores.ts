import type {
  SceneObjectCreatureAbilityScoresStorage,
  SceneObjectCreatureAbilityScoreStorage,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_ABILITY_SCORE_FIELDS = Object.freeze([
  Object.freeze({ key: "strength", nativeLabel: "Str" }),
  Object.freeze({ key: "dexterity", nativeLabel: "Dex" }),
  Object.freeze({ key: "constitution", nativeLabel: "Con" }),
  Object.freeze({ key: "intelligence", nativeLabel: "Int" }),
  Object.freeze({ key: "wisdom", nativeLabel: "Wis" }),
  Object.freeze({ key: "charisma", nativeLabel: "Cha" }),
] as const);

export type CreatureAbilityScoreKey =
  typeof CREATURE_ABILITY_SCORE_FIELDS[number]["key"];

const CREATURE_ABILITY_SCORE_KEYS = Object.freeze(
  CREATURE_ABILITY_SCORE_FIELDS.map((field) => field.key),
);

export function normalizeCreatureAbilityScore(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xff
    ? Number(value)
    : null;
}

export function readCreatureAbilityScoreStorage(
  input: unknown,
): SceneObjectCreatureAbilityScoreStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    !hasExactRecordKeys(input, ["present", "nativeType", "value"]) ||
    input.present !== true ||
    input.nativeType !== "byte"
  ) return null;
  const value = normalizeCreatureAbilityScore(input.value);
  return value === null
    ? null
    : Object.freeze({ present: true, nativeType: "byte", value });
}

export function readCreatureAbilityScoresStorage(
  input: unknown,
): SceneObjectCreatureAbilityScoresStorage | null {
  if (
    !isPlainRecord(input) ||
    !hasExactRecordKeys(input, CREATURE_ABILITY_SCORE_KEYS)
  ) return null;
  const result = {} as Record<CreatureAbilityScoreKey, SceneObjectCreatureAbilityScoreStorage>;
  for (const key of CREATURE_ABILITY_SCORE_KEYS) {
    const storage = readCreatureAbilityScoreStorage(input[key]);
    if (!storage) return null;
    result[key] = storage;
  }
  return Object.freeze(result);
}
