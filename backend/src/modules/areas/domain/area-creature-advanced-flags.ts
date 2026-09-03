export type AreaCreatureBinaryFlagValue = 0 | 1;

export type AreaCreatureBinaryFlagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: AreaCreatureBinaryFlagValue }>;

export const AREA_CREATURE_ADVANCED_FLAG_FIELDS = Object.freeze([
  Object.freeze({ key: "disarmable", nativeLabel: "Disarmable" }),
  Object.freeze({ key: "plot", nativeLabel: "Plot" }),
  Object.freeze({ key: "immortal", nativeLabel: "IsImmortal" }),
  Object.freeze({ key: "lootable", nativeLabel: "Lootable" }),
  Object.freeze({ key: "noPermanentDeath", nativeLabel: "NoPermDeath" }),
] as const);

export type AreaCreatureAdvancedFlagKey =
  typeof AREA_CREATURE_ADVANCED_FLAG_FIELDS[number]["key"];

export type AreaCreatureAdvancedFlagsStorage = Readonly<
  Record<AreaCreatureAdvancedFlagKey, AreaCreatureBinaryFlagStorage>
>;

export interface ExistingAreaCreatureBinaryFlagMutation {
  readonly expectedValue: AreaCreatureBinaryFlagValue;
  readonly value: AreaCreatureBinaryFlagValue;
}

export type ExistingAreaCreatureAdvancedFlagMutations = Readonly<
  Partial<Record<AreaCreatureAdvancedFlagKey, ExistingAreaCreatureBinaryFlagMutation>>
>;

const ADVANCED_FLAG_KEYS = Object.freeze(
  AREA_CREATURE_ADVANCED_FLAG_FIELDS.map((field) => field.key),
);
const STORAGE_ABSENT_KEYS = Object.freeze(["present"] as const);
const STORAGE_PRESENT_KEYS = Object.freeze(["present", "value"] as const);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"] as const);

export function isAreaCreatureBinaryFlagValue(
  value: unknown,
): value is AreaCreatureBinaryFlagValue {
  return value === 0 || value === 1;
}

export function readAreaCreatureBinaryFlagStorage(
  input: unknown,
): AreaCreatureBinaryFlagStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, STORAGE_ABSENT_KEYS) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, STORAGE_PRESENT_KEYS) &&
    input.present === true &&
    isAreaCreatureBinaryFlagValue(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function readAreaCreatureAdvancedFlagsStorage(
  input: unknown,
): AreaCreatureAdvancedFlagsStorage | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ADVANCED_FLAG_KEYS)) return null;
  const result = {} as Record<AreaCreatureAdvancedFlagKey, AreaCreatureBinaryFlagStorage>;
  for (const key of ADVANCED_FLAG_KEYS) {
    const storage = readAreaCreatureBinaryFlagStorage(input[key]);
    if (!storage) return null;
    result[key] = storage;
  }
  return Object.freeze(result);
}

export function readExistingAreaCreatureAdvancedFlagMutations(
  input: unknown,
): ExistingAreaCreatureAdvancedFlagMutations | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  if (
    keys.length === 0 ||
    keys.some((key) => !ADVANCED_FLAG_KEYS.includes(key as AreaCreatureAdvancedFlagKey))
  ) {
    return null;
  }

  const result: Partial<
    Record<AreaCreatureAdvancedFlagKey, ExistingAreaCreatureBinaryFlagMutation>
  > = {};
  for (const key of keys as AreaCreatureAdvancedFlagKey[]) {
    const pair = input[key];
    if (
      !isPlainRecord(pair) ||
      !hasExactKeys(pair, MUTATION_KEYS) ||
      !isAreaCreatureBinaryFlagValue(pair.expectedValue) ||
      !isAreaCreatureBinaryFlagValue(pair.value) ||
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
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key));
}
