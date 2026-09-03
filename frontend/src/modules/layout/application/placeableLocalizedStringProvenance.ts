import type {
  SceneObjectPlaceableProperties,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  MAX_PLACEABLE_LOC_NAME_ASCII_BYTES,
  isPlaceableInlineAsciiText,
  readPlaceableInlineAsciiStorage,
} from "../../scene/domain/placeableLocalizedStrings";

export type ExistingPlaceableLocalizedStringTarget = "localizedName" | "description";

const FIELD_MAPPINGS = Object.freeze({
  localizedName: Object.freeze({
    sourceKey: "locName" as const,
    maxBytes: MAX_PLACEABLE_LOC_NAME_ASCII_BYTES,
  }),
  description: Object.freeze({
    sourceKey: "description" as const,
    maxBytes: MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  }),
});

type LocalizedStringTargets = Partial<Pick<
  SceneObjectPlaceableProperties,
  ExistingPlaceableLocalizedStringTarget
>>;

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
  return readPlaceableInlineAsciiStorage(
    source.placeableLocalizedStrings?.[mapping.sourceKey],
    mapping.maxBytes,
  );
}

export function canEditExistingPlaceableLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingPlaceableLocalizedStringTarget,
): boolean {
  return readExistingPlaceableLocalizedString(source, field) !== undefined;
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

export function materializeExistingPlaceableLocalizedStrings(
  source: SceneObjectSourceMetadata | undefined,
  current: Readonly<SceneObjectPlaceableProperties> | undefined,
  draft: Readonly<Record<ExistingPlaceableLocalizedStringTarget, unknown>>,
): LocalizedStringTargets {
  const result: LocalizedStringTargets = {};
  for (const field of Object.keys(FIELD_MAPPINGS) as ExistingPlaceableLocalizedStringTarget[]) {
    const currentHasField = Object.prototype.hasOwnProperty.call(current ?? {}, field);
    const currentValue = current?.[field];
    const candidate = draft[field];
    if (
      canEditExistingPlaceableLocalizedString(source, field) &&
      isPlaceableInlineAsciiText(candidate, FIELD_MAPPINGS[field].maxBytes)
    ) {
      result[field] = candidate;
    } else if (currentHasField && typeof currentValue === "string") {
      result[field] = currentValue;
    }
  }
  return result;
}
