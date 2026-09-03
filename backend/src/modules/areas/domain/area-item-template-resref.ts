export interface ExistingAreaItemTemplateResRefMutation {
  readonly expectedResRef: string;
  readonly resRef: string;
}

export type AreaItemTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "resref";
      value: string;
    }>;

export function isAreaItemTemplateResRef(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]{1,16}$/u.test(value);
}

export function readExistingAreaItemTemplateResRefMutation(
  input: unknown,
): ExistingAreaItemTemplateResRefMutation | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["expectedResRef", "resRef"])) {
    return null;
  }
  if (
    !isAreaItemTemplateResRef(input.expectedResRef) ||
    !isAreaItemTemplateResRef(input.resRef) ||
    input.expectedResRef === input.resRef
  ) {
    return null;
  }
  return Object.freeze({
    expectedResRef: input.expectedResRef,
    resRef: input.resRef,
  });
}

export function readAreaItemTemplateResRefStorage(
  input: unknown,
): AreaItemTemplateResRefStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "resref" &&
    isAreaItemTemplateResRef(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "resref",
      value: input.value,
    });
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
