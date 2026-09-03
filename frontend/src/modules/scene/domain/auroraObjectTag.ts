export const MAX_AURORA_OBJECT_TAG_CODE_UNITS = 32;

export type AuroraObjectTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export function isEditableAuroraObjectTag(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= MAX_AURORA_OBJECT_TAG_CODE_UNITS &&
    !value.includes("\0");
}

export function readAuroraObjectTagStorage(
  input: unknown,
): AuroraObjectTagStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "value"]) &&
    input.present === true &&
    isEditableAuroraObjectTag(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

export function hasExactRecordKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key));
}
