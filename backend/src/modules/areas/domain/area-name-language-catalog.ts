export const AREA_NAME_LANGUAGE_CATALOG_REVISION =
  "aurora-area-name-language-catalog.v1" as const;

export type AreaNameLanguageCatalogGender = "default" | "male" | "female";

export interface AreaNameLanguageCatalogEntry {
  readonly storageEntryIdentifier: number;
  readonly language: string;
  readonly gender: AreaNameLanguageCatalogGender;
  readonly displayName: string;
}

export const AREA_NAME_LANGUAGE_CATALOG: readonly AreaNameLanguageCatalogEntry[] =
  Object.freeze([
    Object.freeze({ storageEntryIdentifier: 0, language: "English", gender: "default", displayName: "English (default)" }),
    Object.freeze({ storageEntryIdentifier: 2, language: "French", gender: "male", displayName: "French (Male)" }),
    Object.freeze({ storageEntryIdentifier: 3, language: "French", gender: "female", displayName: "French (Female)" }),
    Object.freeze({ storageEntryIdentifier: 4, language: "German", gender: "male", displayName: "German (Male)" }),
    Object.freeze({ storageEntryIdentifier: 5, language: "German", gender: "female", displayName: "German (Female)" }),
    Object.freeze({ storageEntryIdentifier: 6, language: "Italian", gender: "male", displayName: "Italian (Male)" }),
    Object.freeze({ storageEntryIdentifier: 7, language: "Italian", gender: "female", displayName: "Italian (Female)" }),
    Object.freeze({ storageEntryIdentifier: 8, language: "Spanish", gender: "male", displayName: "Spanish (Male)" }),
    Object.freeze({ storageEntryIdentifier: 9, language: "Spanish", gender: "female", displayName: "Spanish (Female)" }),
    Object.freeze({ storageEntryIdentifier: 10, language: "Polish", gender: "male", displayName: "Polish (Male)" }),
    Object.freeze({ storageEntryIdentifier: 11, language: "Polish", gender: "female", displayName: "Polish (Female)" }),
  ] satisfies readonly AreaNameLanguageCatalogEntry[]);

const ADDABLE_AREA_NAME_STORAGE_ENTRY_IDENTIFIERS = new Set(
  AREA_NAME_LANGUAGE_CATALOG.map((entry) => entry.storageEntryIdentifier),
);

export function isAddableAreaNameStorageEntryIdentifier(
  value: unknown,
): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && ADDABLE_AREA_NAME_STORAGE_ENTRY_IDENTIFIERS.has(value);
}
