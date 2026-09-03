import type {
  SceneObjectItemProperties,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  isItemLocalizedStringInlineAsciiText,
  readItemLocalizedStringInlineAsciiStorage,
} from "../../scene/domain/itemLocalizedStrings";

export type ExistingItemLocalizedStringTarget =
  | "localizedName"
  | "description"
  | "identifiedDescription";

const FIELD_MAPPINGS = Object.freeze({
  localizedName: Object.freeze({
    sourceKey: "localizedName" as const,
    maxBytes: MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  }),
  description: Object.freeze({
    sourceKey: "description" as const,
    maxBytes: MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  }),
  identifiedDescription: Object.freeze({
    sourceKey: "identifiedDescription" as const,
    maxBytes: MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  }),
});

type ItemLocalizedStringTargets = Partial<Pick<
  SceneObjectItemProperties,
  ExistingItemLocalizedStringTarget
>>;

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
  return readItemLocalizedStringInlineAsciiStorage(
    source.itemLocalizedStrings?.[mapping.sourceKey],
    mapping.maxBytes,
  );
}

export function canEditExistingItemLocalizedString(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingItemLocalizedStringTarget,
): boolean {
  return readExistingItemLocalizedString(source, field) !== undefined;
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
  draft: Readonly<Record<ExistingItemLocalizedStringTarget, unknown>>,
): ItemLocalizedStringTargets {
  const result: ItemLocalizedStringTargets = {};
  for (const field of Object.keys(FIELD_MAPPINGS) as ExistingItemLocalizedStringTarget[]) {
    const currentHasField = Object.prototype.hasOwnProperty.call(current ?? {}, field);
    const currentValue = current?.[field];
    const candidate = draft[field];
    if (
      canEditExistingItemLocalizedString(source, field) &&
      isItemLocalizedStringInlineAsciiText(candidate, FIELD_MAPPINGS[field].maxBytes)
    ) {
      result[field] = candidate;
    } else if (currentHasField && typeof currentValue === "string") {
      result[field] = currentValue;
    }
  }
  return result;
}
