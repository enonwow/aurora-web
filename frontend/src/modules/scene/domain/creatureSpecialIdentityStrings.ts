import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_SPECIAL_IDENTITY_STRING_MAX_CODE_UNITS = 256;

export type CreatureSpecialIdentityStringStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "cexostring"; value: string }>;

export interface CreatureSpecialIdentityStringsStorage {
  readonly subrace: CreatureSpecialIdentityStringStorage;
  readonly deity: CreatureSpecialIdentityStringStorage;
}

export interface CreatureSpecialIdentityStringProvenance {
  readonly expectedValue: string;
}

export interface CreatureSpecialIdentityStringsProvenance {
  readonly subrace?: CreatureSpecialIdentityStringProvenance;
  readonly deity?: CreatureSpecialIdentityStringProvenance;
}

export function isCreatureSpecialIdentityString(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= CREATURE_SPECIAL_IDENTITY_STRING_MAX_CODE_UNITS &&
    /^[\x20-\x7e]*$/u.test(value);
}

export function readCreatureSpecialIdentityStringStorage(
  input: unknown,
): CreatureSpecialIdentityStringStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "cexostring" &&
    isCreatureSpecialIdentityString(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "cexostring",
      value: input.value,
    });
  }
  return null;
}

export function readCreatureSpecialIdentityStringsStorage(
  input: unknown,
): CreatureSpecialIdentityStringsStorage | null {
  if (!isPlainRecord(input) || !hasExactRecordKeys(input, ["subrace", "deity"])) {
    return null;
  }
  const subrace = readCreatureSpecialIdentityStringStorage(input.subrace);
  const deity = readCreatureSpecialIdentityStringStorage(input.deity);
  return subrace && deity ? Object.freeze({ subrace, deity }) : null;
}

export function readCreatureSpecialIdentityStringsProvenance(
  input: unknown,
): CreatureSpecialIdentityStringsProvenance | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  if (
    keys.length === 0 ||
    keys.some((key) => key !== "subrace" && key !== "deity")
  ) {
    return null;
  }
  const readMember = (key: "subrace" | "deity") => {
    if (!Object.prototype.hasOwnProperty.call(input, key)) return undefined;
    const member = input[key];
    if (
      !isPlainRecord(member) ||
      !hasExactRecordKeys(member, ["expectedValue"]) ||
      !isCreatureSpecialIdentityString(member.expectedValue)
    ) {
      return null;
    }
    return Object.freeze({ expectedValue: member.expectedValue });
  };
  const subrace = readMember("subrace");
  const deity = readMember("deity");
  if (subrace === null || deity === null) return null;
  return Object.freeze({
    ...(subrace ? { subrace } : {}),
    ...(deity ? { deity } : {}),
  });
}
