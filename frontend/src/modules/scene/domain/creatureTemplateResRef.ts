import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_TEMPLATE_RESREF_MAX_CODE_UNITS = 16;

export type CreatureTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export interface CreatureTemplateResRefProvenance {
  readonly expectedResRef: string;
}

const CREATURE_TEMPLATE_RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;

export function isCreatureTemplateResRef(value: unknown): value is string {
  return typeof value === "string" && CREATURE_TEMPLATE_RESREF_PATTERN.test(value);
}

export function readCreatureTemplateResRefStorage(
  input: unknown,
): CreatureTemplateResRefStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "resref" &&
    isCreatureTemplateResRef(input.value)
  ) {
    return Object.freeze({ present: true, nativeType: "resref", value: input.value });
  }
  return null;
}

export function readCreatureTemplateResRefProvenance(
  input: unknown,
): CreatureTemplateResRefProvenance | null {
  if (
    !isPlainRecord(input) ||
    !hasExactRecordKeys(input, ["expectedResRef"]) ||
    !isCreatureTemplateResRef(input.expectedResRef)
  ) {
    return null;
  }
  return Object.freeze({ expectedResRef: input.expectedResRef });
}
