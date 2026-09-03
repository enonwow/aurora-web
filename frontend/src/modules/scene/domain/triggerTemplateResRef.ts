import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";
import type { SceneObjectSourceMetadata } from "../contracts";

export const TRIGGER_TEMPLATE_RESREF_MAX_CODE_UNITS = 16;

export type TriggerTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export function isTriggerTemplateResRef(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]{1,16}$/u.test(value);
}

export function readTriggerTemplateResRefStorage(
  input: unknown,
): TriggerTemplateResRefStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "resref" &&
    isTriggerTemplateResRef(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "resref",
      value: input.value,
    });
  }
  return null;
}

export function canEditExistingTriggerTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readTriggerTemplateResRefStorage(source?.triggerTemplateResRef);
  return source?.type === "aurora_git" &&
    source.sourceKind === "trigger" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    storage?.present === true;
}
