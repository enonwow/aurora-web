import {
  AREA_NAME_LANGUAGE_CATALOG,
  AREA_NAME_LANGUAGE_CATALOG_REVISION,
  isAddableAreaNameStorageEntryIdentifier,
} from "../../src/modules/areas/domain/area-name-language-catalog";

describe("bounded Area Name language catalog", () => {
  it("publishes the immutable source-closed Western catalog", () => {
    expect(AREA_NAME_LANGUAGE_CATALOG_REVISION).toBe(
      "aurora-area-name-language-catalog.v1",
    );
    expect(AREA_NAME_LANGUAGE_CATALOG).toEqual([
      { storageEntryIdentifier: 0, language: "English", gender: "default", displayName: "English (default)" },
      { storageEntryIdentifier: 2, language: "French", gender: "male", displayName: "French (Male)" },
      { storageEntryIdentifier: 3, language: "French", gender: "female", displayName: "French (Female)" },
      { storageEntryIdentifier: 4, language: "German", gender: "male", displayName: "German (Male)" },
      { storageEntryIdentifier: 5, language: "German", gender: "female", displayName: "German (Female)" },
      { storageEntryIdentifier: 6, language: "Italian", gender: "male", displayName: "Italian (Male)" },
      { storageEntryIdentifier: 7, language: "Italian", gender: "female", displayName: "Italian (Female)" },
      { storageEntryIdentifier: 8, language: "Spanish", gender: "male", displayName: "Spanish (Male)" },
      { storageEntryIdentifier: 9, language: "Spanish", gender: "female", displayName: "Spanish (Female)" },
      { storageEntryIdentifier: 10, language: "Polish", gender: "male", displayName: "Polish (Male)" },
      { storageEntryIdentifier: 11, language: "Polish", gender: "female", displayName: "Polish (Female)" },
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
