import type { SceneObjectCreatureNaturalArmorClassStorage } from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export function normalizeCreatureNaturalArmorClass(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xff
    ? Number(value)
    : null;
}

export function readCreatureNaturalArmorClassStorage(
  input: unknown,
): SceneObjectCreatureNaturalArmorClassStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    !hasExactRecordKeys(input, ["present", "nativeType", "value"]) ||
    input.present !== true ||
    input.nativeType !== "byte"
  ) return null;
  const value = normalizeCreatureNaturalArmorClass(input.value);
  return value === null
    ? null
    : Object.freeze({ present: true, nativeType: "byte", value });
}
