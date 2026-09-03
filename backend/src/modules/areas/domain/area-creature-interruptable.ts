export type AreaCreatureInterruptableValue = 0 | 1;

export type AreaCreatureInterruptableStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: AreaCreatureInterruptableValue }>;

export interface ExistingAreaCreatureInterruptableMutation {
  readonly expectedValue: AreaCreatureInterruptableValue;
  readonly value: AreaCreatureInterruptableValue;
}

export function isAreaCreatureInterruptableValue(
  value: unknown,
): value is AreaCreatureInterruptableValue {
  return value === 0 || value === 1;
}

export function readAreaCreatureInterruptableStorage(
  input: unknown,
): AreaCreatureInterruptableStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "value"]) &&
    input.present === true &&
    isAreaCreatureInterruptableValue(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function readExistingAreaCreatureInterruptableMutation(
  input: unknown,
): ExistingAreaCreatureInterruptableMutation | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["expectedValue", "value"])) {
    return null;
  }
  if (
    !isAreaCreatureInterruptableValue(input.expectedValue) ||
    !isAreaCreatureInterruptableValue(input.value) ||
    input.expectedValue === input.value
  ) {
    return null;
  }
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
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key));
}
