import {
  MAX_AREA_OBJECT_TAG_CODE_UNITS,
  isEditableAreaObjectTag,
  readExistingAreaObjectTagMutation,
  type ExistingAreaObjectTagMutation,
} from "./area-object-tag";

export const MAX_AREA_CREATURE_TAG_CODE_UNITS = MAX_AREA_OBJECT_TAG_CODE_UNITS;

export type AreaCreatureTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export type ExistingAreaCreatureTagMutation = ExistingAreaObjectTagMutation;

export const isEditableAreaCreatureTag = isEditableAreaObjectTag;

export function readExistingAreaCreatureTagStorage(
  input: unknown,
): AreaCreatureTagStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (hasExactKeys(input, ["present", "value"]) &&
      input.present === true &&
      isEditableAreaCreatureTag(input.value)) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function readExistingAreaCreatureTagMutation(
  input: unknown,
): ExistingAreaCreatureTagMutation | null {
  return readExistingAreaObjectTagMutation(input);
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
