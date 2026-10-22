import type {
  SceneObjectEditableLocalizedStringEntry,
  SceneObjectItemProperties,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { isAddableAreaNameStorageEntryIdentifier } from
  "../../areas/domain/areaNameLanguageCatalog";
import {
  MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  cloneEditableItemLocalizedStringEntries,
  isItemLocalizedStringInlineAsciiText,
  readEditableItemLocalizedStringEntries,
  readEditableItemLocalizedStringStorage,
} from "../../scene/domain/itemLocalizedStrings";

export type ExistingItemLocalizedStringTarget =
  | "localizedName"
  | "description"
  | "identifiedDescription";

const FIELD_MAPPINGS = Object.freeze({
  localizedName: Object.freeze({
    sourceKey: "localizedName" as const,
    entriesTargetKey: "localizedNameEntries" as const,
    maxBytes: MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  }),
  description: Object.freeze({
    sourceKey: "description" as const,
    entriesTargetKey: "descriptionEntries" as const,
    maxBytes: MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  }),
  identifiedDescription: Object.freeze({
    sourceKey: "identifiedDescription" as const,
    entriesTargetKey: "identifiedDescriptionEntries" as const,
    maxBytes: MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  }),
});

type ItemLocalizedStringTargets = Partial<Pick<
  SceneObjectItemProperties,
  | ExistingItemLocalizedStringTarget
  | "localizedNameEntries"
  | "descriptionEntries"
  | "identifiedDescriptionEntries"
>>;

type ItemLocalizedStringDraft = Readonly<{
  localizedName?: unknown;
  localizedNameEntries?: unknown;
  description?: unknown;
  descriptionEntries?: unknown;
  identifiedDescription?: unknown;
  identifiedDescriptionEntries?: unknown;
}>;

function hasEditableItemSourceIdentity(
  source: SceneObjectSourceMetadata | undefined,
): source is SceneObjectSourceMetadata {
  return source?.type === "aurora_git" &&
    source.sourceKind === "item" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0;
}

export function readExistingItemLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingItemLocalizedStringTarget,
): string | undefined {
  if (!hasEditableItemSourceIdentity(source)) return undefined;
  const mapping = FIELD_MAPPINGS[field];
  return readEditableItemLocalizedStringStorage(
    source.itemLocalizedStrings?.[mapping.sourceKey],
    mapping.maxBytes,
  )?.value;
}

export function readExistingItemLocalizedStringEntries(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingItemLocalizedStringTarget,
): readonly SceneObjectEditableLocalizedStringEntry[] | undefined {
  if (!hasEditableItemSourceIdentity(source)) return undefined;
  const mapping = FIELD_MAPPINGS[field];
  const storage = readEditableItemLocalizedStringStorage(
    source.itemLocalizedStrings?.[mapping.sourceKey],
    mapping.maxBytes,
  );
  return storage ? cloneEditableItemLocalizedStringEntries(storage.entries) : undefined;
}

export function canEditExistingItemLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingItemLocalizedStringTarget,
): boolean {
  return readExistingItemLocalizedStringEntries(source, field) !== undefined;
}

function isAdmittedEntryListMutation(
  sourceEntries: readonly SceneObjectEditableLocalizedStringEntry[],
  candidateEntries: readonly SceneObjectEditableLocalizedStringEntry[],
): boolean {
  const sourceIdentifiers = new Set(sourceEntries.map((entry) => entry.languageId));
  return candidateEntries.every((entry) => sourceIdentifiers.has(entry.languageId) || (
    isAddableAreaNameStorageEntryIdentifier(entry.languageId) && entry.text.length > 0
  ));
}

export function reduceExistingItemLocalizedStringEntries(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingItemLocalizedStringTarget,
  current: readonly SceneObjectEditableLocalizedStringEntry[],
  candidate: unknown,
): readonly SceneObjectEditableLocalizedStringEntry[] {
  const mapping = FIELD_MAPPINGS[field];
  const sourceEntries = readExistingItemLocalizedStringEntries(source, field);
  const candidateEntries = readEditableItemLocalizedStringEntries(candidate, mapping.maxBytes);
  return sourceEntries && candidateEntries && isAdmittedEntryListMutation(sourceEntries, candidateEntries)
    ? cloneEditableItemLocalizedStringEntries(candidateEntries)
    : cloneEditableItemLocalizedStringEntries(current);
}

function preserveCurrentLocalizedStringTarget(
  current: Readonly<SceneObjectItemProperties> | undefined,
  field: ExistingItemLocalizedStringTarget,
): ItemLocalizedStringTargets {
  const result: ItemLocalizedStringTargets = {};
  const entriesKey = FIELD_MAPPINGS[field].entriesTargetKey;
  if (
    Object.prototype.hasOwnProperty.call(current ?? {}, field) &&
    typeof current?.[field] === "string"
  ) result[field] = current[field];
  const currentEntries = current?.[entriesKey];
  if (Object.prototype.hasOwnProperty.call(current ?? {}, entriesKey) && Array.isArray(currentEntries)) {
    Object.assign(result, {
      [entriesKey]: cloneEditableItemLocalizedStringEntries(currentEntries),
    });
  }
  return result;
}

export function reduceExistingItemLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingItemLocalizedStringTarget,
  current: string,
  candidate: unknown,
): string {
  const mapping = FIELD_MAPPINGS[field];
  return canEditExistingItemLocalizedString(source, field) &&
    isItemLocalizedStringInlineAsciiText(candidate, mapping.maxBytes)
    ? candidate
    : current;
}

export function materializeExistingItemLocalizedStrings(
  source: SceneObjectSourceMetadata | undefined,
  current: Readonly<SceneObjectItemProperties> | undefined,
  draft: ItemLocalizedStringDraft,
): ItemLocalizedStringTargets {
  const result: ItemLocalizedStringTargets = {};
  for (const field of Object.keys(FIELD_MAPPINGS) as ExistingItemLocalizedStringTarget[]) {
    const mapping = FIELD_MAPPINGS[field];
    const candidate = draft[field];
    const hasEntryListCandidate = Object.prototype.hasOwnProperty.call(
      draft,
      mapping.entriesTargetKey,
    );
    if (hasEntryListCandidate) {
      const sourceEntries = readExistingItemLocalizedStringEntries(source, field);
      const candidateEntries = readEditableItemLocalizedStringEntries(
        draft[mapping.entriesTargetKey],
        mapping.maxBytes,
      );
      const defaultText = candidateEntries?.find((entry) => entry.languageId === 0)?.text ?? "";
      if (
        sourceEntries &&
        candidateEntries &&
        isAdmittedEntryListMutation(sourceEntries, candidateEntries) &&
        isItemLocalizedStringInlineAsciiText(candidate, mapping.maxBytes) &&
        candidate === defaultText
      ) {
        result[field] = candidate;
        Object.assign(result, {
          [mapping.entriesTargetKey]: cloneEditableItemLocalizedStringEntries(candidateEntries),
        });
      } else {
        Object.assign(result, preserveCurrentLocalizedStringTarget(current, field));
      }
      continue;
    }
    if (
      canEditExistingItemLocalizedString(source, field) &&
      isItemLocalizedStringInlineAsciiText(candidate, mapping.maxBytes)
    ) {
      result[field] = candidate;
    } else {
      Object.assign(result, preserveCurrentLocalizedStringTarget(current, field));
    }
  }
  return result;
}
