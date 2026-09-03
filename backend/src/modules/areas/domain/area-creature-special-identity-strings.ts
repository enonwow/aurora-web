export const MAX_AREA_CREATURE_SPECIAL_IDENTITY_STRING_CODE_UNITS = 256;

export type AreaCreatureSpecialIdentityStringStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "cexostring"; value: string }>;

export interface AreaCreatureSpecialIdentityStringsStorage {
  readonly subrace: AreaCreatureSpecialIdentityStringStorage;
  readonly deity: AreaCreatureSpecialIdentityStringStorage;
}

export interface ExistingAreaCreatureSpecialIdentityStringMutation {
  readonly expectedValue: string;
  readonly value: string;
}

export interface ExistingAreaCreatureSpecialIdentityStringsMutation {
  readonly subrace?: ExistingAreaCreatureSpecialIdentityStringMutation;
  readonly deity?: ExistingAreaCreatureSpecialIdentityStringMutation;
}

export function isAreaCreatureSpecialIdentityString(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= MAX_AREA_CREATURE_SPECIAL_IDENTITY_STRING_CODE_UNITS &&
    /^[\x20-\x7e]*$/u.test(value);
}

export function readAreaCreatureSpecialIdentityStringStorage(
  input: unknown,
): AreaCreatureSpecialIdentityStringStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "cexostring" &&
    isAreaCreatureSpecialIdentityString(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "cexostring",
      value: input.value,
    });
  }
  return null;
}

export function readAreaCreatureSpecialIdentityStringsStorage(
  input: unknown,
): AreaCreatureSpecialIdentityStringsStorage | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["subrace", "deity"])) return null;
  const subrace = readAreaCreatureSpecialIdentityStringStorage(input.subrace);
  const deity = readAreaCreatureSpecialIdentityStringStorage(input.deity);
  if (!subrace || !deity) return null;
  return Object.freeze({ subrace, deity });
}

export function readExistingAreaCreatureSpecialIdentityStringMutation(
  input: unknown,
): ExistingAreaCreatureSpecialIdentityStringMutation | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["expectedValue", "value"])) return null;
  if (
    !isAreaCreatureSpecialIdentityString(input.expectedValue) ||
    !isAreaCreatureSpecialIdentityString(input.value) ||
    input.expectedValue === input.value
  ) {
    return null;
  }
  return Object.freeze({ expectedValue: input.expectedValue, value: input.value });
}

export function readExistingAreaCreatureSpecialIdentityStringsMutation(
  input: unknown,
): ExistingAreaCreatureSpecialIdentityStringsMutation | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  if (
    keys.length === 0 ||
    keys.some((key) => key !== "subrace" && key !== "deity")
  ) {
    return null;
  }
  const subrace = Object.prototype.hasOwnProperty.call(input, "subrace")
    ? readExistingAreaCreatureSpecialIdentityStringMutation(input.subrace)
    : undefined;
  const deity = Object.prototype.hasOwnProperty.call(input, "deity")
    ? readExistingAreaCreatureSpecialIdentityStringMutation(input.deity)
    : undefined;
  if (
    (Object.prototype.hasOwnProperty.call(input, "subrace") && !subrace) ||
    (Object.prototype.hasOwnProperty.call(input, "deity") && !deity)
  ) {
    return null;
  }
  return Object.freeze({
    ...(subrace ? { subrace } : {}),
    ...(deity ? { deity } : {}),
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
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key));
}
