import type {
  SceneObjectCreatureProperties,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  isCreatureNameInlineAsciiText,
  readCreatureNameInlineAsciiStorage,
} from "../../scene/domain/creatureNameLocalizedStrings";

export type ExistingCreatureNameLocalizedStringTarget =
  "firstName" | "lastName" | "description";

const FIELD_MAPPINGS = Object.freeze({
  firstName: Object.freeze({
    sourceKey: "firstName" as const,
    maxBytes: MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  }),
  lastName: Object.freeze({
    sourceKey: "lastName" as const,
    maxBytes: MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  }),
  description: Object.freeze({
    sourceKey: "description" as const,
    maxBytes: MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  }),
});

type CreatureNameTargets = Partial<Pick<
  SceneObjectCreatureProperties,
  ExistingCreatureNameLocalizedStringTarget
>>;

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
  return readCreatureNameInlineAsciiStorage(
    source.creatureLocalizedStrings?.[mapping.sourceKey],
    mapping.maxBytes,
  );
}

export function canEditExistingCreatureNameLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingCreatureNameLocalizedStringTarget,
): boolean {
  return readExistingCreatureNameLocalizedString(source, field) !== undefined;
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
  draft: Readonly<Record<ExistingCreatureNameLocalizedStringTarget, unknown>>,
): CreatureNameTargets {
  const result: CreatureNameTargets = {};
  for (const field of Object.keys(FIELD_MAPPINGS) as ExistingCreatureNameLocalizedStringTarget[]) {
    const currentHasField = Object.prototype.hasOwnProperty.call(current ?? {}, field);
    const currentValue = current?.[field];
    const candidate = draft[field];
    if (
      canEditExistingCreatureNameLocalizedString(source, field) &&
      isCreatureNameInlineAsciiText(candidate, FIELD_MAPPINGS[field].maxBytes)
    ) {
      result[field] = candidate;
    } else if (currentHasField && typeof currentValue === "string") {
      result[field] = currentValue;
    }
  }
  return result;
}
