import type {
  SceneObjectCreatureAppearanceColorStorage,
  SceneObjectCreatureAppearanceColorsStorage,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_APPEARANCE_COLOR_FIELDS = Object.freeze([
  Object.freeze({ key: "skin", nativeLabel: "Color_Skin" }),
  Object.freeze({ key: "hair", nativeLabel: "Color_Hair" }),
  Object.freeze({ key: "tattoo1", nativeLabel: "Color_Tattoo1" }),
  Object.freeze({ key: "tattoo2", nativeLabel: "Color_Tattoo2" }),
] as const);

export type CreatureAppearanceColorKey =
  typeof CREATURE_APPEARANCE_COLOR_FIELDS[number]["key"];

const COLOR_KEYS = Object.freeze(
  CREATURE_APPEARANCE_COLOR_FIELDS.map((field) => field.key),
);

export function normalizeCreatureAppearanceColor(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xff
    ? Number(value)
    : null;
}

export function readCreatureAppearanceColorStorage(
  input: unknown,
): SceneObjectCreatureAppearanceColorStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    !hasExactRecordKeys(input, ["present", "nativeType", "value"]) ||
    input.present !== true ||
    input.nativeType !== "byte"
  ) return null;
  const value = normalizeCreatureAppearanceColor(input.value);
  return value === null
    ? null
    : Object.freeze({ present: true, nativeType: "byte", value });
}

export function readCreatureAppearanceColorsStorage(
  input: unknown,
): SceneObjectCreatureAppearanceColorsStorage | null {
  if (!isPlainRecord(input) || !hasExactRecordKeys(input, COLOR_KEYS)) return null;
  const result = {} as Record<
    CreatureAppearanceColorKey,
    SceneObjectCreatureAppearanceColorStorage
  >;
  for (const key of COLOR_KEYS) {
    const member = readCreatureAppearanceColorStorage(input[key]);
    if (!member) return null;
    result[key] = member;
  }
  return Object.freeze(result);
}
