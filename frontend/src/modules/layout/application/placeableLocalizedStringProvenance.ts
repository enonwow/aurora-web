import type {
  SceneObjectEditableLocalizedStringEntry,
  SceneObjectPlaceableProperties,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { isAddableAreaNameStorageEntryIdentifier } from "../../areas/domain/areaNameLanguageCatalog";
import {
  MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  MAX_PLACEABLE_LOC_NAME_ASCII_BYTES,
  cloneEditablePlaceableLocalizedStringEntries,
  isPlaceableInlineAsciiText,
  readEditablePlaceableLocalizedStringEntries,
  readEditablePlaceableLocalizedStringStorage,
} from "../../scene/domain/placeableLocalizedStrings";

export type ExistingPlaceableLocalizedStringTarget = "localizedName" | "description";

const FIELD_MAPPINGS = Object.freeze({
  localizedName: Object.freeze({
    sourceKey: "locName" as const,
    entriesTargetKey: "localizedNameEntries" as const,
    maxBytes: MAX_PLACEABLE_LOC_NAME_ASCII_BYTES,
  }),
  description: Object.freeze({
    sourceKey: "description" as const,
    entriesTargetKey: "descriptionEntries" as const,
    maxBytes: MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  }),
});

type LocalizedStringTargets = Partial<Pick<
  SceneObjectPlaceableProperties,
  | ExistingPlaceableLocalizedStringTarget
  | "localizedNameEntries"
  | "descriptionEntries"
>>;

type LocalizedStringDraft = Readonly<{
  localizedName?: unknown;
  localizedNameEntries?: unknown;
  description?: unknown;
  descriptionEntries?: unknown;
}>;

function hasEditablePlaceableSourceIdentity(
  source: SceneObjectSourceMetadata | undefined,
): source is SceneObjectSourceMetadata {
  return source?.type === "aurora_git" &&
    source.sourceKind === "placeable" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0;
}

export function readExistingPlaceableLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingPlaceableLocalizedStringTarget,
): string | undefined {
  if (!hasEditablePlaceableSourceIdentity(source)) return undefined;
  const mapping = FIELD_MAPPINGS[field];
  return readEditablePlaceableLocalizedStringStorage(
    source.placeableLocalizedStrings?.[mapping.sourceKey],
    mapping.maxBytes,
  )?.value;
}

export function readExistingPlaceableLocalizedStringEntries(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingPlaceableLocalizedStringTarget,
): readonly SceneObjectEditableLocalizedStringEntry[] | undefined {
  if (!hasEditablePlaceableSourceIdentity(source)) return undefined;
  const mapping = FIELD_MAPPINGS[field];
  const storage = readEditablePlaceableLocalizedStringStorage(
    source.placeableLocalizedStrings?.[mapping.sourceKey],
    mapping.maxBytes,
  );
  return storage
    ? cloneEditablePlaceableLocalizedStringEntries(storage.entries)
    : undefined;
}

export function canEditExistingPlaceableLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingPlaceableLocalizedStringTarget,
): boolean {
  return readExistingPlaceableLocalizedStringEntries(source, field) !== undefined;
}

export function reduceExistingPlaceableLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingPlaceableLocalizedStringTarget,
  current: string,
  candidate: unknown,
): string {
  const mapping = FIELD_MAPPINGS[field];
  return canEditExistingPlaceableLocalizedString(source, field) &&
    isPlaceableInlineAsciiText(candidate, mapping.maxBytes)
    ? candidate
    : current;
}

function isAdmittedEntryListMutation(
  sourceEntries: readonly SceneObjectEditableLocalizedStringEntry[],
  candidateEntries: readonly SceneObjectEditableLocalizedStringEntry[],
): boolean {
  const sourceIdentifiers = new Set(sourceEntries.map((entry) => entry.languageId));
  return candidateEntries.every((entry) =>
    sourceIdentifiers.has(entry.languageId) ||
    (isAddableAreaNameStorageEntryIdentifier(entry.languageId) && entry.text.length > 0));
}

export function reduceExistingPlaceableLocalizedStringEntries(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingPlaceableLocalizedStringTarget,
  current: readonly SceneObjectEditableLocalizedStringEntry[],
  candidate: unknown,
): readonly SceneObjectEditableLocalizedStringEntry[] {
  const mapping = FIELD_MAPPINGS[field];
  const sourceEntries = readExistingPlaceableLocalizedStringEntries(source, field);
  const candidateEntries = readEditablePlaceableLocalizedStringEntries(
    candidate,
    mapping.maxBytes,
  );
  return sourceEntries && candidateEntries && isAdmittedEntryListMutation(sourceEntries, candidateEntries)
    ? cloneEditablePlaceableLocalizedStringEntries(candidateEntries)
    : cloneEditablePlaceableLocalizedStringEntries(current);
}

function preserveCurrentLocalizedStringTarget(
  current: Readonly<SceneObjectPlaceableProperties> | undefined,
  field: ExistingPlaceableLocalizedStringTarget,
): LocalizedStringTargets {
  const result: LocalizedStringTargets = {};
  const entriesKey = FIELD_MAPPINGS[field].entriesTargetKey;
  if (
    Object.prototype.hasOwnProperty.call(current ?? {}, field) &&
    typeof current?.[field] === "string"
  ) {
    result[field] = current[field];
  }
  const currentEntries = current?.[entriesKey];
  if (Object.prototype.hasOwnProperty.call(current ?? {}, entriesKey) && Array.isArray(currentEntries)) {
    Object.assign(result, {
      [entriesKey]: cloneEditablePlaceableLocalizedStringEntries(currentEntries),
    });
  }
  return result;
}

export function materializeExistingPlaceableLocalizedStrings(
  source: SceneObjectSourceMetadata | undefined,
  current: Readonly<SceneObjectPlaceableProperties> | undefined,
  draft: LocalizedStringDraft,
): LocalizedStringTargets {
  const result: LocalizedStringTargets = {};
  for (const field of Object.keys(FIELD_MAPPINGS) as ExistingPlaceableLocalizedStringTarget[]) {
    const mapping = FIELD_MAPPINGS[field];
    const candidate = draft[field];
    const hasEntryListCandidate = Object.prototype.hasOwnProperty.call(
      draft,
      mapping.entriesTargetKey,
    );
    if (hasEntryListCandidate) {
      const sourceEntries = readExistingPlaceableLocalizedStringEntries(source, field);
      const candidateEntries = readEditablePlaceableLocalizedStringEntries(
        draft[mapping.entriesTargetKey],
        mapping.maxBytes,
      );
      const defaultText = candidateEntries?.find((entry) => entry.languageId === 0)?.text ?? "";
      if (
        sourceEntries &&
        candidateEntries &&
        isAdmittedEntryListMutation(sourceEntries, candidateEntries) &&
        isPlaceableInlineAsciiText(candidate, mapping.maxBytes) &&
        candidate === defaultText
      ) {
        result[field] = candidate;
        Object.assign(result, {
          [mapping.entriesTargetKey]: cloneEditablePlaceableLocalizedStringEntries(candidateEntries),
        });
      } else {
        Object.assign(result, preserveCurrentLocalizedStringTarget(current, field));
      }
      continue;
    }
    if (
      canEditExistingPlaceableLocalizedString(source, field) &&
      isPlaceableInlineAsciiText(candidate, mapping.maxBytes)
    ) {
      result[field] = candidate;
    } else {
      Object.assign(result, preserveCurrentLocalizedStringTarget(current, field));
    }
  }
  return result;
}
