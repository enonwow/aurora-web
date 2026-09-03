import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";
import type { SceneObjectSourceMetadata } from "../contracts";

export const ENCOUNTER_TEMPLATE_RESREF_MAX_CODE_UNITS = 16;

export type EncounterTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export function isEncounterTemplateResRef(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]{1,16}$/u.test(value);
}

export function readEncounterTemplateResRefStorage(
  input: unknown,
): EncounterTemplateResRefStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "resref" &&
    isEncounterTemplateResRef(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "resref",
      value: input.value,
    });
  }
  return null;
}

export function canEditExistingEncounterTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readEncounterTemplateResRefStorage(source?.encounterTemplateResRef);
  return source?.type === "aurora_git" &&
    source.sourceKind === "encounter" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    storage?.present === true;
}
