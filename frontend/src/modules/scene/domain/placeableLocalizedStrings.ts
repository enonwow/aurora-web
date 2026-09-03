import type {
  SceneObjectPlaceableLocalizedStrings,
} from "../contracts";
import {
  MAX_NATIVE_LOCALIZED_STRING_ENTRIES,
  MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  cloneNativeLocalizedStringStorage,
  isNativeInlineAsciiText,
  readNativeInlineAsciiStorage,
  readNativeLocalizedStringStorage,
} from "./nativeLocalizedStringStorage";

export const MAX_PLACEABLE_LOCALIZED_STRING_ENTRIES = MAX_NATIVE_LOCALIZED_STRING_ENTRIES;
export const MAX_PLACEABLE_LOCALIZED_STRING_ENTRY_BYTES = MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES;
export const MAX_PLACEABLE_LOCALIZED_STRING_TOTAL_TEXT_BYTES =
  MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES;
export const MAX_PLACEABLE_LOC_NAME_ASCII_BYTES = 256;
export const MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES = 4_096;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

export function readPlaceableLocalizedStrings(
  value: unknown,
): SceneObjectPlaceableLocalizedStrings | undefined {
  if (!isRecord(value) || !hasExactKeys(value, ["locName", "description"])) return undefined;
  const locName = readNativeLocalizedStringStorage(value.locName);
  const description = readNativeLocalizedStringStorage(value.description);
  return locName && description ? { locName, description } : undefined;
}

export const isPlaceableInlineAsciiText = isNativeInlineAsciiText;
export const readPlaceableInlineAsciiStorage = readNativeInlineAsciiStorage;

export function clonePlaceableLocalizedStrings(
  value: SceneObjectPlaceableLocalizedStrings,
): SceneObjectPlaceableLocalizedStrings {
  return {
    locName: cloneNativeLocalizedStringStorage(value.locName),
    description: cloneNativeLocalizedStringStorage(value.description),
  };
}
