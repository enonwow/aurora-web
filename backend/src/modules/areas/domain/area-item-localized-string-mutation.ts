import {
  buildAreaInlineAsciiStorage,
  isAreaInlineAsciiText,
  readAreaInlineAsciiStorage,
  readExistingAreaInlineAsciiLocalizedStringMutations,
} from "./area-inline-ascii-localized-string-mutation";
import type { AreaItemLocalizedStringStorage } from "./area-item-localized-strings";

export const MAX_AREA_ITEM_LOCALIZED_NAME_ASCII_BYTES = 256;
export const MAX_AREA_ITEM_DESCRIPTION_ASCII_BYTES = 4_096;
export const MAX_AREA_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES = 4_096;

export type ExistingAreaItemLocalizedStringField =
  | "LocalizedName"
  | "Description"
  | "DescIdentified";

export interface ExistingAreaItemLocalizedStringMutation {
  readonly field: ExistingAreaItemLocalizedStringField;
  readonly expectedValue: string;
  readonly value: string;
}

export const AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS = Object.freeze([
  Object.freeze({
    field: "LocalizedName" as const,
    sourceKey: "localizedName" as const,
    targetKey: "localizedName" as const,
    maxBytes: MAX_AREA_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  }),
  Object.freeze({
    field: "Description" as const,
    sourceKey: "description" as const,
    targetKey: "description" as const,
    maxBytes: MAX_AREA_ITEM_DESCRIPTION_ASCII_BYTES,
  }),
  Object.freeze({
    field: "DescIdentified" as const,
    sourceKey: "identifiedDescription" as const,
    targetKey: "identifiedDescription" as const,
    maxBytes: MAX_AREA_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  }),
]);

export const isAreaItemInlineAsciiText = isAreaInlineAsciiText;
export const readAreaItemInlineAsciiStorage = readAreaInlineAsciiStorage;
export const buildAreaItemInlineAsciiStorage = (
  value: unknown,
  maxBytes: number,
): AreaItemLocalizedStringStorage | undefined => buildAreaInlineAsciiStorage(value, maxBytes);

export function readExistingAreaItemLocalizedStringMutations(
  value: unknown,
): readonly ExistingAreaItemLocalizedStringMutation[] | null {
  return readExistingAreaInlineAsciiLocalizedStringMutations(
    value,
    AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS,
  );
}
