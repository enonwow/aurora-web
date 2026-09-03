export type AreaCreatureConversationStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export interface ExistingAreaCreatureConversationMutation {
  readonly expectedResRef: string;
  readonly resRef: string;
}

const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;

export function isAreaCreatureConversationSource(value: unknown): value is string {
  return typeof value === "string" && SOURCE_RESREF_PATTERN.test(value);
}

export function isAreaCreatureConversationTarget(value: unknown): value is string {
  return typeof value === "string" && TARGET_RESREF_PATTERN.test(value);
}

export function readExistingAreaCreatureConversationStorage(
  input: unknown,
): AreaCreatureConversationStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "value"]) &&
    input.present === true &&
    isAreaCreatureConversationSource(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function readExistingAreaCreatureConversationMutation(
  input: unknown,
): ExistingAreaCreatureConversationMutation | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["expectedResRef", "resRef"])) {
    return null;
  }
  if (
    !isAreaCreatureConversationSource(input.expectedResRef) ||
    !isAreaCreatureConversationTarget(input.resRef) ||
    input.expectedResRef === input.resRef
  ) {
    return null;
  }
  return Object.freeze({
    expectedResRef: input.expectedResRef,
    resRef: input.resRef,
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
