import type {
  SceneObjectEditableLocalizedStringEntry,
  SceneObjectCreatureProperties,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { isAddableAreaNameStorageEntryIdentifier } from
  "../../areas/domain/areaNameLanguageCatalog";
import {
  MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  cloneEditableCreatureLocalizedStringEntries,
  isCreatureNameInlineAsciiText,
  readEditableCreatureLocalizedStringEntries,
  readEditableCreatureLocalizedStringStorage,
} from "../../scene/domain/creatureNameLocalizedStrings";

export type ExistingCreatureNameLocalizedStringTarget =
  "firstName" | "lastName" | "description";

const FIELD_MAPPINGS = Object.freeze({
  firstName: Object.freeze({
    sourceKey: "firstName" as const,
    entriesTargetKey: "firstNameEntries" as const,
    maxBytes: MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  }),
  lastName: Object.freeze({
    sourceKey: "lastName" as const,
    entriesTargetKey: "lastNameEntries" as const,
    maxBytes: MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  }),
  description: Object.freeze({
    sourceKey: "description" as const,
    entriesTargetKey: "descriptionEntries" as const,
    maxBytes: MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  }),
});

type CreatureNameTargets = Partial<Pick<
  SceneObjectCreatureProperties,
  | ExistingCreatureNameLocalizedStringTarget
  | "firstNameEntries"
  | "lastNameEntries"
  | "descriptionEntries"
>>;

type CreatureNameDraft = Readonly<{
  firstName?: unknown;
  firstNameEntries?: unknown;
  lastName?: unknown;
  lastNameEntries?: unknown;
  description?: unknown;
  descriptionEntries?: unknown;
}>;

function hasEditableCreatureSourceIdentity(
  source: SceneObjectSourceMetadata | undefined,
): source is SceneObjectSourceMetadata {
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0;
}

export function readExistingCreatureNameLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingCreatureNameLocalizedStringTarget,
): string | undefined {
  if (!hasEditableCreatureSourceIdentity(source)) return undefined;
  const mapping = FIELD_MAPPINGS[field];
  return readEditableCreatureLocalizedStringStorage(
    source.creatureLocalizedStrings?.[mapping.sourceKey],
    mapping.maxBytes,
  )?.value;
}

export function readExistingCreatureNameLocalizedStringEntries(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingCreatureNameLocalizedStringTarget,
): readonly SceneObjectEditableLocalizedStringEntry[] | undefined {
  if (!hasEditableCreatureSourceIdentity(source)) return undefined;
  const mapping = FIELD_MAPPINGS[field];
  const storage = readEditableCreatureLocalizedStringStorage(
    source.creatureLocalizedStrings?.[mapping.sourceKey],
    mapping.maxBytes,
  );
  return storage ? cloneEditableCreatureLocalizedStringEntries(storage.entries) : undefined;
}

export function canEditExistingCreatureNameLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingCreatureNameLocalizedStringTarget,
): boolean {
  return readExistingCreatureNameLocalizedStringEntries(source, field) !== undefined;
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

export function reduceExistingCreatureNameLocalizedStringEntries(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingCreatureNameLocalizedStringTarget,
  current: readonly SceneObjectEditableLocalizedStringEntry[],
  candidate: unknown,
): readonly SceneObjectEditableLocalizedStringEntry[] {
  const mapping = FIELD_MAPPINGS[field];
  const sourceEntries = readExistingCreatureNameLocalizedStringEntries(source, field);
  const candidateEntries = readEditableCreatureLocalizedStringEntries(candidate, mapping.maxBytes);
  return sourceEntries && candidateEntries && isAdmittedEntryListMutation(sourceEntries, candidateEntries)
    ? cloneEditableCreatureLocalizedStringEntries(candidateEntries)
    : cloneEditableCreatureLocalizedStringEntries(current);
}

function preserveCurrentLocalizedStringTarget(
  current: Readonly<SceneObjectCreatureProperties> | undefined,
  field: ExistingCreatureNameLocalizedStringTarget,
): CreatureNameTargets {
  const result: CreatureNameTargets = {};
  const entriesKey = FIELD_MAPPINGS[field].entriesTargetKey;
  if (
    Object.prototype.hasOwnProperty.call(current ?? {}, field) &&
    typeof current?.[field] === "string"
  ) result[field] = current[field];
  const currentEntries = current?.[entriesKey];
  if (Object.prototype.hasOwnProperty.call(current ?? {}, entriesKey) && Array.isArray(currentEntries)) {
    Object.assign(result, {
      [entriesKey]: cloneEditableCreatureLocalizedStringEntries(currentEntries),
    });
  }
  return result;
}

export function reduceExistingCreatureNameLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingCreatureNameLocalizedStringTarget,
  current: string,
  candidate: unknown,
): string {
  const mapping = FIELD_MAPPINGS[field];
  return canEditExistingCreatureNameLocalizedString(source, field) &&
    isCreatureNameInlineAsciiText(candidate, mapping.maxBytes)
    ? candidate
    : current;
}

export function materializeExistingCreatureNameLocalizedStrings(
  source: SceneObjectSourceMetadata | undefined,
  current: Readonly<SceneObjectCreatureProperties> | undefined,
  draft: CreatureNameDraft,
): CreatureNameTargets {
  const result: CreatureNameTargets = {};
  for (const field of Object.keys(FIELD_MAPPINGS) as ExistingCreatureNameLocalizedStringTarget[]) {
    const mapping = FIELD_MAPPINGS[field];
    const candidate = draft[field];
    const hasEntryListCandidate = Object.prototype.hasOwnProperty.call(
      draft,
      mapping.entriesTargetKey,
    );
    if (hasEntryListCandidate) {
      const sourceEntries = readExistingCreatureNameLocalizedStringEntries(source, field);
      const candidateEntries = readEditableCreatureLocalizedStringEntries(
        draft[mapping.entriesTargetKey],
        mapping.maxBytes,
      );
      const defaultText = candidateEntries?.find((entry) => entry.languageId === 0)?.text ?? "";
      if (
        sourceEntries &&
        candidateEntries &&
        isAdmittedEntryListMutation(sourceEntries, candidateEntries) &&
        isCreatureNameInlineAsciiText(candidate, mapping.maxBytes) &&
        candidate === defaultText
      ) {
        result[field] = candidate;
        Object.assign(result, {
          [mapping.entriesTargetKey]: cloneEditableCreatureLocalizedStringEntries(candidateEntries),
        });
      } else {
        Object.assign(result, preserveCurrentLocalizedStringTarget(current, field));
      }
      continue;
    }
    if (
      canEditExistingCreatureNameLocalizedString(source, field) &&
      isCreatureNameInlineAsciiText(candidate, mapping.maxBytes)
    ) {
      result[field] = candidate;
    } else {
      Object.assign(result, preserveCurrentLocalizedStringTarget(current, field));
    }
  }
  return result;
}
