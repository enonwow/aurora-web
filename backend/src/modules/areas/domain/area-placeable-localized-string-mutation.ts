import {
  buildAreaInlineAsciiStorage,
  isAreaInlineAsciiText,
  readAreaInlineAsciiStorage,
  readExistingAreaInlineAsciiLocalizedStringMutations,
} from "./area-inline-ascii-localized-string-mutation";
import type { AreaPlaceableLocalizedStringStorage } from "./area-placeable-localized-strings";

export const MAX_AREA_PLACEABLE_LOC_NAME_ASCII_BYTES = 256;
export const MAX_AREA_PLACEABLE_DESCRIPTION_ASCII_BYTES = 4_096;

export type ExistingAreaPlaceableLocalizedStringField = "LocName" | "Description";

export interface ExistingAreaPlaceableLocalizedStringMutation {
  readonly field: ExistingAreaPlaceableLocalizedStringField;
  readonly expectedValue: string;
  readonly value: string;
}

export const AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS = Object.freeze([
  Object.freeze({
    field: "LocName" as const,
    sourceKey: "locName" as const,
    targetKey: "localizedName" as const,
    maxBytes: MAX_AREA_PLACEABLE_LOC_NAME_ASCII_BYTES,
  }),
  Object.freeze({
    field: "Description" as const,
    sourceKey: "description" as const,
    targetKey: "description" as const,
    maxBytes: MAX_AREA_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  }),
]);

export const isAreaPlaceableInlineAsciiText = isAreaInlineAsciiText;
export const readAreaPlaceableInlineAsciiStorage = readAreaInlineAsciiStorage;
export const buildAreaPlaceableInlineAsciiStorage = (
  value: unknown,
  maxBytes: number,
): AreaPlaceableLocalizedStringStorage | undefined => buildAreaInlineAsciiStorage(value, maxBytes);

export function readExistingAreaPlaceableLocalizedStringMutations(
  value: unknown,
): readonly ExistingAreaPlaceableLocalizedStringMutation[] | null {
  return readExistingAreaInlineAsciiLocalizedStringMutations(
    value,
    AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS,
  );
}
