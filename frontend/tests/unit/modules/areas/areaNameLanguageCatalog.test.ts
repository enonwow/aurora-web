import { describe, expect, it } from "vitest";
import {
  AREA_NAME_LANGUAGE_CATALOG,
  AREA_NAME_LANGUAGE_CATALOG_REVISION,
  isAddableAreaNameStorageEntryIdentifier,
} from "../../../../src/modules/areas/domain/areaNameLanguageCatalog";

describe("bounded Area Name language catalog", () => {
  it("mirrors the immutable backend contract exactly", () => {
    expect(AREA_NAME_LANGUAGE_CATALOG_REVISION).toBe(
      "aurora-area-name-language-catalog.v1",
    );
    expect(AREA_NAME_LANGUAGE_CATALOG.map((entry) => [
      entry.storageEntryIdentifier,
      entry.language,
      entry.gender,
      entry.displayName,
    ])).toEqual([
      [0, "English", "default", "English (default)"],
      [2, "French", "male", "French (Male)"],
      [3, "French", "female", "French (Female)"],
      [4, "German", "male", "German (Male)"],
      [5, "German", "female", "German (Female)"],
      [6, "Italian", "male", "Italian (Male)"],
      [7, "Italian", "female", "Italian (Female)"],
      [8, "Spanish", "male", "Spanish (Male)"],
      [9, "Spanish", "female", "Spanish (Female)"],
      [10, "Polish", "male", "Polish (Male)"],
      [11, "Polish", "female", "Polish (Female)"],
    ]);
    expect(Object.isFrozen(AREA_NAME_LANGUAGE_CATALOG)).toBe(true);
    expect(AREA_NAME_LANGUAGE_CATALOG.every(Object.isFrozen)).toBe(true);
  });

  it.each([0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])(
    "admits verified storage identifier %i",
    (identifier) => expect(isAddableAreaNameStorageEntryIdentifier(identifier)).toBe(true),
  );

  it.each([1, 12, -1, 1.5, 0xffff_ffff, "2", undefined])(
    "rejects unverified storage identifier %p",
    (identifier) => expect(isAddableAreaNameStorageEntryIdentifier(identifier)).toBe(false),
  );
});
