export const MAX_AREA_OBJECT_TAG_CODE_UNITS = 32;

export interface ExistingAreaObjectTagMutation {
  readonly expectedValue: string;
  readonly value: string;
}

export type AreaObjectTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

const MUTATION_KEYS = ["expectedValue", "value"] as const;

export function isEditableAreaObjectTag(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= MAX_AREA_OBJECT_TAG_CODE_UNITS &&
    !value.includes("\0");
}

export function readExistingAreaObjectTagMutation(
  value: unknown,
): ExistingAreaObjectTagMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS)) return null;
  if (!isEditableAreaObjectTag(value.expectedValue) ||
      !isEditableAreaObjectTag(value.value) ||
      value.expectedValue === value.value) {
    return null;
  }
  return Object.freeze({
    expectedValue: value.expectedValue,
    value: value.value,
  });
}

export function readExistingAreaObjectTagStorage(
  input: unknown,
): AreaObjectTagStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "value"]) &&
    input.present === true &&
    isEditableAreaObjectTag(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
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
