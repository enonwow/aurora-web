export const AREA_CREATURE_APPEARANCE_COLOR_FIELDS = Object.freeze([
  Object.freeze({ key: "skin", nativeLabel: "Color_Skin" }),
  Object.freeze({ key: "hair", nativeLabel: "Color_Hair" }),
  Object.freeze({ key: "tattoo1", nativeLabel: "Color_Tattoo1" }),
  Object.freeze({ key: "tattoo2", nativeLabel: "Color_Tattoo2" }),
] as const);

export type AreaCreatureAppearanceColorKey =
  typeof AREA_CREATURE_APPEARANCE_COLOR_FIELDS[number]["key"];

export type AreaCreatureAppearanceColorStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type AreaCreatureAppearanceColorsStorage = Readonly<
  Record<AreaCreatureAppearanceColorKey, AreaCreatureAppearanceColorStorage>
>;

export interface ExistingAreaCreatureAppearanceColorMutation {
  readonly expectedValue: number;
  readonly value: number;
}

export type ExistingAreaCreatureAppearanceColorMutations = Readonly<
  Partial<Record<
    AreaCreatureAppearanceColorKey,
    ExistingAreaCreatureAppearanceColorMutation
  >>
>;

const COLOR_KEYS = Object.freeze(
  AREA_CREATURE_APPEARANCE_COLOR_FIELDS.map((field) => field.key),
);

export function isAreaCreatureAppearanceColor(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xff;
}

export function readAreaCreatureAppearanceColorStorage(
  input: unknown,
): AreaCreatureAppearanceColorStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    isAreaCreatureAppearanceColor(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "byte",
      value: input.value,
    });
  }
  return null;
}

export function readAreaCreatureAppearanceColorsStorage(
  input: unknown,
): AreaCreatureAppearanceColorsStorage | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, COLOR_KEYS)) return null;
  const result = {} as Record<
    AreaCreatureAppearanceColorKey,
    AreaCreatureAppearanceColorStorage
  >;
  for (const key of COLOR_KEYS) {
    const member = readAreaCreatureAppearanceColorStorage(input[key]);
    if (!member) return null;
    result[key] = member;
  }
  return Object.freeze(result);
}

export function readExistingAreaCreatureAppearanceColorMutations(
  input: unknown,
): ExistingAreaCreatureAppearanceColorMutations | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  if (
    keys.length === 0 ||
    keys.some((key) => !COLOR_KEYS.includes(key as AreaCreatureAppearanceColorKey))
  ) return null;
  const result: Partial<Record<
    AreaCreatureAppearanceColorKey,
    ExistingAreaCreatureAppearanceColorMutation
  >> = {};
  for (const key of keys as AreaCreatureAppearanceColorKey[]) {
    const pair = input[key];
    if (
      !isPlainRecord(pair) ||
      !hasExactKeys(pair, ["expectedValue", "value"]) ||
      !isAreaCreatureAppearanceColor(pair.expectedValue) ||
      !isAreaCreatureAppearanceColor(pair.value) ||
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
