import type { SceneObjectItemLocalizedStrings } from "../contracts";
import {
  MAX_NATIVE_LOCALIZED_STRING_ENTRIES,
  MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  cloneNativeLocalizedStringStorage,
  isNativeInlineAsciiText,
  readNativeInlineAsciiStorage,
  readNativeLocalizedStringStorage,
} from "./nativeLocalizedStringStorage";

export const MAX_ITEM_LOCALIZED_STRING_ENTRIES = MAX_NATIVE_LOCALIZED_STRING_ENTRIES;
export const MAX_ITEM_LOCALIZED_STRING_ENTRY_BYTES = MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES;
export const MAX_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES =
  MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES;
export const MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES = 256;
export const MAX_ITEM_DESCRIPTION_ASCII_BYTES = 4_096;
export const MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES = 4_096;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

export function readItemLocalizedStrings(
  value: unknown,
): SceneObjectItemLocalizedStrings | undefined {
  if (!isRecord(value) || !hasExactKeys(value, [
    "localizedName",
    "description",
    "identifiedDescription",
  ])) {
    return undefined;
  }
  const localizedName = readNativeLocalizedStringStorage(value.localizedName);
  const description = readNativeLocalizedStringStorage(value.description);
  const identifiedDescription = readNativeLocalizedStringStorage(value.identifiedDescription);
  return localizedName && description && identifiedDescription
    ? { localizedName, description, identifiedDescription }
    : undefined;
}

export const isItemLocalizedStringInlineAsciiText = isNativeInlineAsciiText;
export const readItemLocalizedStringInlineAsciiStorage = readNativeInlineAsciiStorage;

export function cloneItemLocalizedStrings(
  value: SceneObjectItemLocalizedStrings,
): SceneObjectItemLocalizedStrings {
  return {
    localizedName: cloneNativeLocalizedStringStorage(value.localizedName),
    description: cloneNativeLocalizedStringStorage(value.description),
    identifiedDescription: cloneNativeLocalizedStringStorage(value.identifiedDescription),
  };
}
