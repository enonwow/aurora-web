import type { SceneObjectPlaceableDurabilitySaveBytes } from "../contracts";

export const PLACEABLE_DURABILITY_SAVE_BYTE_FIELDS = [
  "hardness",
  "fortitudeSave",
  "reflexSave",
  "willSave"
] as const;

export type PlaceableDurabilitySaveByteField =
  (typeof PLACEABLE_DURABILITY_SAVE_BYTE_FIELDS)[number];

export function isPlaceableDurabilitySaveByte(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 255;
}

export function readPlaceableDurabilitySaveBytes(
  metadata: Readonly<Record<string, unknown>> | undefined
): SceneObjectPlaceableDurabilitySaveBytes | undefined {
  const result: SceneObjectPlaceableDurabilitySaveBytes = {};
  let hasValue = false;
  for (const field of PLACEABLE_DURABILITY_SAVE_BYTE_FIELDS) {
    const value = metadata?.[field];
    if (isPlaceableDurabilitySaveByte(value)) {
      (result as Record<PlaceableDurabilitySaveByteField, number>)[field] = value;
      hasValue = true;
    }
  }
  return hasValue ? result : undefined;
}
