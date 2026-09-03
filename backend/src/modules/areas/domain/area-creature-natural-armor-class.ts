const STORAGE_KEYS = ["present", "nativeType", "value"] as const;
const MUTATION_KEYS = ["expectedValue", "value"] as const;

export type AreaCreatureNaturalArmorClassStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export interface ExistingAreaCreatureNaturalArmorClassMutation {
  readonly expectedValue: number;
  readonly value: number;
}

export function isAreaCreatureNaturalArmorClass(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xff;
}

export function readAreaCreatureNaturalArmorClassStorage(
  input: unknown,
): AreaCreatureNaturalArmorClassStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    !hasExactKeys(input, STORAGE_KEYS) ||
    input.present !== true ||
    input.nativeType !== "byte" ||
    !isAreaCreatureNaturalArmorClass(input.value)
  ) return null;
  return Object.freeze({ present: true, nativeType: "byte", value: input.value });
}

export function readExistingAreaCreatureNaturalArmorClassMutation(
  input: unknown,
): ExistingAreaCreatureNaturalArmorClassMutation | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, MUTATION_KEYS)) return null;
  if (
    !isAreaCreatureNaturalArmorClass(input.expectedValue) ||
    !isAreaCreatureNaturalArmorClass(input.value) ||
    input.expectedValue === input.value
  ) return null;
  return Object.freeze({
    expectedValue: input.expectedValue,
    value: input.value,
  });
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
