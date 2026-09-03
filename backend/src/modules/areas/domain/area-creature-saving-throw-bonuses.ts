export const AREA_CREATURE_SAVING_THROW_BONUS_FIELDS = Object.freeze([
  Object.freeze({ key: "reflex", nativeLabel: "refbonus", statisticsKey: "reflexBonus" }),
  Object.freeze({ key: "will", nativeLabel: "willbonus", statisticsKey: "willBonus" }),
  Object.freeze({ key: "fortitude", nativeLabel: "fortbonus", statisticsKey: "fortitudeBonus" }),
] as const);

export type AreaCreatureSavingThrowBonusKey =
  typeof AREA_CREATURE_SAVING_THROW_BONUS_FIELDS[number]["key"];

export type AreaCreatureSavingThrowBonusStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "short"; value: number }>;

export type AreaCreatureSavingThrowBonusesStorage = Readonly<
  Record<AreaCreatureSavingThrowBonusKey, AreaCreatureSavingThrowBonusStorage>
>;

export interface ExistingAreaCreatureSavingThrowBonusMutation {
  readonly expectedValue: number;
  readonly value: number;
}

export type ExistingAreaCreatureSavingThrowBonusMutations = Readonly<
  Partial<Record<AreaCreatureSavingThrowBonusKey, ExistingAreaCreatureSavingThrowBonusMutation>>
>;

const SAVING_THROW_BONUS_KEYS = Object.freeze(
  AREA_CREATURE_SAVING_THROW_BONUS_FIELDS.map((field) => field.key),
);

export function isAreaCreatureSavingThrowBonus(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 250;
}

export function readAreaCreatureSavingThrowBonusStorage(
  input: unknown,
): AreaCreatureSavingThrowBonusStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "short" &&
    isAreaCreatureSavingThrowBonus(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "short",
      value: input.value,
    });
  }
  return null;
}

export function readAreaCreatureSavingThrowBonusesStorage(
  input: unknown,
): AreaCreatureSavingThrowBonusesStorage | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, SAVING_THROW_BONUS_KEYS)) return null;
  const result = {} as Record<
    AreaCreatureSavingThrowBonusKey,
    AreaCreatureSavingThrowBonusStorage
  >;
  for (const key of SAVING_THROW_BONUS_KEYS) {
    const member = readAreaCreatureSavingThrowBonusStorage(input[key]);
    if (!member) return null;
    result[key] = member;
  }
  return Object.freeze(result);
}

export function readExistingAreaCreatureSavingThrowBonusMutations(
  input: unknown,
): ExistingAreaCreatureSavingThrowBonusMutations | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  if (
    keys.length === 0 ||
    keys.some((key) => !SAVING_THROW_BONUS_KEYS.includes(
      key as AreaCreatureSavingThrowBonusKey,
    ))
  ) return null;
  const result: Partial<
    Record<AreaCreatureSavingThrowBonusKey, ExistingAreaCreatureSavingThrowBonusMutation>
  > = {};
  for (const key of keys as AreaCreatureSavingThrowBonusKey[]) {
    const pair = input[key];
    if (
      !isPlainRecord(pair) ||
      !hasExactKeys(pair, ["expectedValue", "value"]) ||
      !isAreaCreatureSavingThrowBonus(pair.expectedValue) ||
      !isAreaCreatureSavingThrowBonus(pair.value) ||
      pair.expectedValue === pair.value
    ) return null;
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
