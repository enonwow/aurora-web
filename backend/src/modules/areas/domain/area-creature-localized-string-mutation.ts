import {
  buildAreaInlineAsciiStorage,
  isAreaInlineAsciiText,
  readAreaInlineAsciiStorage,
  readExistingAreaInlineAsciiLocalizedStringMutations,
} from "./area-inline-ascii-localized-string-mutation";
import type {
  AreaCreatureNameLocalizedStringStorage,
} from "./area-creature-localized-strings";

export const MAX_AREA_CREATURE_FIRST_NAME_ASCII_BYTES = 256;
export const MAX_AREA_CREATURE_LAST_NAME_ASCII_BYTES = 256;
export const MAX_AREA_CREATURE_DESCRIPTION_ASCII_BYTES = 4096;

export type ExistingAreaCreatureNameLocalizedStringField =
  "FirstName" | "LastName" | "Description";

export interface ExistingAreaCreatureNameLocalizedStringMutation {
  readonly field: ExistingAreaCreatureNameLocalizedStringField;
  readonly expectedValue: string;
  readonly value: string;
}

export const AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS = Object.freeze([
  Object.freeze({
    field: "FirstName" as const,
    sourceKey: "firstName" as const,
    targetKey: "firstName" as const,
    maxBytes: MAX_AREA_CREATURE_FIRST_NAME_ASCII_BYTES,
  }),
  Object.freeze({
    field: "LastName" as const,
    sourceKey: "lastName" as const,
    targetKey: "lastName" as const,
    maxBytes: MAX_AREA_CREATURE_LAST_NAME_ASCII_BYTES,
  }),
  Object.freeze({
    field: "Description" as const,
    sourceKey: "description" as const,
    targetKey: "description" as const,
    maxBytes: MAX_AREA_CREATURE_DESCRIPTION_ASCII_BYTES,
  }),
]);

export const isAreaCreatureNameInlineAsciiText = isAreaInlineAsciiText;
export const readAreaCreatureNameInlineAsciiStorage = readAreaInlineAsciiStorage;
export const buildAreaCreatureNameInlineAsciiStorage = (
  value: unknown,
  maxBytes: number,
): AreaCreatureNameLocalizedStringStorage | undefined => buildAreaInlineAsciiStorage(value, maxBytes);

export function readExistingAreaCreatureNameLocalizedStringMutations(
  value: unknown,
): readonly ExistingAreaCreatureNameLocalizedStringMutation[] | null {
  return readExistingAreaInlineAsciiLocalizedStringMutations(
    value,
    AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS,
  );
}
