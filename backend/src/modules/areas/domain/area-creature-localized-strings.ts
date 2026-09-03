import {
  MAX_AREA_LOCALIZED_STRING_ENTRIES,
  MAX_AREA_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_AREA_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  cloneAreaLocalizedStringStorage,
  readAreaLocalizedStringStorage,
} from "./area-localized-string-storage";
import type {
  AreaLocalizedStringEntry,
  AreaLocalizedStringStorage,
} from "./area-localized-string-storage";

export const MAX_AREA_CREATURE_LOCALIZED_STRING_ENTRIES = MAX_AREA_LOCALIZED_STRING_ENTRIES;
export const MAX_AREA_CREATURE_LOCALIZED_STRING_ENTRY_BYTES = MAX_AREA_LOCALIZED_STRING_ENTRY_BYTES;
export const MAX_AREA_CREATURE_LOCALIZED_STRING_TOTAL_TEXT_BYTES =
  MAX_AREA_LOCALIZED_STRING_TOTAL_TEXT_BYTES;

export type AreaCreatureNameLocalizedStringEntry = AreaLocalizedStringEntry;
export type AreaCreatureNameLocalizedStringStorage = AreaLocalizedStringStorage;

export interface AreaCreatureNameLocalizedStrings {
  readonly firstName: AreaCreatureNameLocalizedStringStorage;
  readonly lastName: AreaCreatureNameLocalizedStringStorage;
  readonly description?: AreaCreatureNameLocalizedStringStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readAreaCreatureNameLocalizedStrings(
  value: unknown,
): AreaCreatureNameLocalizedStrings | undefined {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value);
  if (
    (keys.length !== 2 && keys.length !== 3) ||
    !keys.includes("firstName") ||
    !keys.includes("lastName") ||
    keys.some((key) => !["firstName", "lastName", "description"].includes(key))
  ) {
    return undefined;
  }
  const firstName = readAreaLocalizedStringStorage(value.firstName);
  const lastName = readAreaLocalizedStringStorage(value.lastName);
  const description = Object.prototype.hasOwnProperty.call(value, "description")
    ? readAreaLocalizedStringStorage(value.description)
    : undefined;
  if (!firstName || !lastName || (keys.includes("description") && !description)) return undefined;
  return {
    firstName,
    lastName,
    ...(description ? { description } : {}),
  };
}

export function cloneAreaCreatureNameLocalizedStrings(
  value: AreaCreatureNameLocalizedStrings,
): AreaCreatureNameLocalizedStrings {
  return {
    firstName: cloneAreaLocalizedStringStorage(value.firstName),
    lastName: cloneAreaLocalizedStringStorage(value.lastName),
    ...(value.description
      ? { description: cloneAreaLocalizedStringStorage(value.description) }
      : {}),
  };
}
