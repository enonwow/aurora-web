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

export const MAX_AREA_ITEM_LOCALIZED_STRING_ENTRIES = MAX_AREA_LOCALIZED_STRING_ENTRIES;
export const MAX_AREA_ITEM_LOCALIZED_STRING_ENTRY_BYTES =
  MAX_AREA_LOCALIZED_STRING_ENTRY_BYTES;
export const MAX_AREA_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES =
  MAX_AREA_LOCALIZED_STRING_TOTAL_TEXT_BYTES;

export type AreaItemLocalizedStringEntry = AreaLocalizedStringEntry;
export type AreaItemLocalizedStringStorage = AreaLocalizedStringStorage;

export interface AreaItemLocalizedStrings {
  readonly localizedName: AreaItemLocalizedStringStorage;
  readonly description: AreaItemLocalizedStringStorage;
  readonly identifiedDescription: AreaItemLocalizedStringStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readAreaItemLocalizedStrings(
  value: unknown,
): AreaItemLocalizedStrings | undefined {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value);
  if (
    keys.length !== 3 ||
    !keys.includes("localizedName") ||
    !keys.includes("description") ||
    !keys.includes("identifiedDescription")
  ) return undefined;
  const localizedName = readAreaLocalizedStringStorage(value.localizedName);
  const description = readAreaLocalizedStringStorage(value.description);
  const identifiedDescription = readAreaLocalizedStringStorage(value.identifiedDescription);
  return localizedName && description && identifiedDescription
    ? { localizedName, description, identifiedDescription }
    : undefined;
}

export function cloneAreaItemLocalizedStrings(
  value: AreaItemLocalizedStrings,
): AreaItemLocalizedStrings {
  return {
    localizedName: cloneAreaLocalizedStringStorage(value.localizedName),
    description: cloneAreaLocalizedStringStorage(value.description),
    identifiedDescription: cloneAreaLocalizedStringStorage(value.identifiedDescription),
  };
}
