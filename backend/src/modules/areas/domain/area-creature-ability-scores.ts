export const AREA_CREATURE_ABILITY_SCORE_FIELDS = Object.freeze([
  Object.freeze({ key: "strength", nativeLabel: "Str" }),
  Object.freeze({ key: "dexterity", nativeLabel: "Dex" }),
  Object.freeze({ key: "constitution", nativeLabel: "Con" }),
  Object.freeze({ key: "intelligence", nativeLabel: "Int" }),
  Object.freeze({ key: "wisdom", nativeLabel: "Wis" }),
  Object.freeze({ key: "charisma", nativeLabel: "Cha" }),
] as const);

export type AreaCreatureAbilityScoreKey =
  typeof AREA_CREATURE_ABILITY_SCORE_FIELDS[number]["key"];

export type AreaCreatureAbilityScoreStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type AreaCreatureAbilityScoresStorage = Readonly<
  Record<AreaCreatureAbilityScoreKey, AreaCreatureAbilityScoreStorage>
>;

export interface ExistingAreaCreatureAbilityScoreMutation {
  readonly expectedValue: number;
  readonly value: number;
}

export type ExistingAreaCreatureAbilityScoreMutations = Readonly<
  Partial<Record<AreaCreatureAbilityScoreKey, ExistingAreaCreatureAbilityScoreMutation>>
>;

const ABILITY_SCORE_KEYS = Object.freeze(
  AREA_CREATURE_ABILITY_SCORE_FIELDS.map((field) => field.key),
);

export function isAreaCreatureAbilityScore(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xff;
}

export function readAreaCreatureAbilityScoreStorage(
  input: unknown,
): AreaCreatureAbilityScoreStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    isAreaCreatureAbilityScore(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "byte",
      value: input.value,
    });
  }
  return null;
}

export function readAreaCreatureAbilityScoresStorage(
  input: unknown,
): AreaCreatureAbilityScoresStorage | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ABILITY_SCORE_KEYS)) return null;
  const result = {} as Record<AreaCreatureAbilityScoreKey, AreaCreatureAbilityScoreStorage>;
  for (const key of ABILITY_SCORE_KEYS) {
    const member = readAreaCreatureAbilityScoreStorage(input[key]);
    if (!member) return null;
    result[key] = member;
  }
  return Object.freeze(result);
}

export function readExistingAreaCreatureAbilityScoreMutations(
  input: unknown,
): ExistingAreaCreatureAbilityScoreMutations | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  if (
    keys.length === 0 ||
    keys.some((key) => !ABILITY_SCORE_KEYS.includes(key as AreaCreatureAbilityScoreKey))
  ) {
    return null;
  }
  const result: Partial<
    Record<AreaCreatureAbilityScoreKey, ExistingAreaCreatureAbilityScoreMutation>
  > = {};
  for (const key of keys as AreaCreatureAbilityScoreKey[]) {
    const pair = input[key];
    if (
      !isPlainRecord(pair) ||
      !hasExactKeys(pair, ["expectedValue", "value"]) ||
      !isAreaCreatureAbilityScore(pair.expectedValue) ||
      !isAreaCreatureAbilityScore(pair.value) ||
      pair.expectedValue === pair.value
    ) {
      return null;
    }
    result[key] = Object.freeze({
      expectedValue: pair.expectedValue,
      value: pair.value,
    });
  }
  return Object.freeze(result);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}
