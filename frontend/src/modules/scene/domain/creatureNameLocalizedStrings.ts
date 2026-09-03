import type { SceneObjectCreatureNameLocalizedStrings } from "../contracts";
import {
  MAX_NATIVE_LOCALIZED_STRING_ENTRIES,
  MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  cloneNativeLocalizedStringStorage,
  isNativeInlineAsciiText,
  readNativeInlineAsciiStorage,
  readNativeLocalizedStringStorage,
} from "./nativeLocalizedStringStorage";

export const MAX_CREATURE_LOCALIZED_STRING_ENTRIES = MAX_NATIVE_LOCALIZED_STRING_ENTRIES;
export const MAX_CREATURE_LOCALIZED_STRING_ENTRY_BYTES = MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES;
export const MAX_CREATURE_LOCALIZED_STRING_TOTAL_TEXT_BYTES =
  MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES;
export const MAX_CREATURE_FIRST_NAME_ASCII_BYTES = 256;
export const MAX_CREATURE_LAST_NAME_ASCII_BYTES = 256;
export const MAX_CREATURE_DESCRIPTION_ASCII_BYTES = 4096;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readCreatureNameLocalizedStrings(
  value: unknown,
): SceneObjectCreatureNameLocalizedStrings | undefined {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value);
  if (
    (keys.length !== 2 && keys.length !== 3) ||
    !keys.includes("firstName") ||
    !keys.includes("lastName") ||
    keys.some((key) => !["firstName", "lastName", "description"].includes(key))
  ) return undefined;
  const firstName = readNativeLocalizedStringStorage(value.firstName);
  const lastName = readNativeLocalizedStringStorage(value.lastName);
  const description = Object.prototype.hasOwnProperty.call(value, "description")
    ? readNativeLocalizedStringStorage(value.description)
    : undefined;
  if (!firstName || !lastName || (keys.includes("description") && !description)) return undefined;
  return {
    firstName,
    lastName,
    ...(description ? { description } : {}),
  };
}

export const isCreatureNameInlineAsciiText = isNativeInlineAsciiText;
export const readCreatureNameInlineAsciiStorage = readNativeInlineAsciiStorage;

export function cloneCreatureNameLocalizedStrings(
  value: SceneObjectCreatureNameLocalizedStrings,
): SceneObjectCreatureNameLocalizedStrings {
  return {
    firstName: cloneNativeLocalizedStringStorage(value.firstName),
    lastName: cloneNativeLocalizedStringStorage(value.lastName),
    ...(value.description
      ? { description: cloneNativeLocalizedStringStorage(value.description) }
      : {}),
  };
}
