import {
  MAX_AREA_LOCALIZED_STRING_ENTRIES,
  MAX_AREA_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_AREA_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  cloneAreaLocalizedStringStorage,
} from "./area-localized-string-storage";
import type {
  AreaLocalizedStringEntry,
  AreaLocalizedStringStorage,
} from "./area-localized-string-storage";

export const MAX_AREA_PLACEABLE_LOCALIZED_STRING_ENTRIES = MAX_AREA_LOCALIZED_STRING_ENTRIES;
export const MAX_AREA_PLACEABLE_LOCALIZED_STRING_ENTRY_BYTES = MAX_AREA_LOCALIZED_STRING_ENTRY_BYTES;
export const MAX_AREA_PLACEABLE_LOCALIZED_STRING_TOTAL_TEXT_BYTES =
  MAX_AREA_LOCALIZED_STRING_TOTAL_TEXT_BYTES;

export type AreaPlaceableLocalizedStringEntry = AreaLocalizedStringEntry;
export type AreaPlaceableLocalizedStringStorage = AreaLocalizedStringStorage;

export interface AreaPlaceableLocalizedStrings {
  readonly locName: AreaPlaceableLocalizedStringStorage;
  readonly description: AreaPlaceableLocalizedStringStorage;
}

export function cloneAreaPlaceableLocalizedStrings(
  value: AreaPlaceableLocalizedStrings,
): AreaPlaceableLocalizedStrings {
  return {
    locName: cloneAreaLocalizedStringStorage(value.locName),
    description: cloneAreaLocalizedStringStorage(value.description),
  };
}
