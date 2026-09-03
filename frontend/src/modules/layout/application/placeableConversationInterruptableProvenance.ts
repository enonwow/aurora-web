import type {
  SceneObjectPlaceableAdvancedSettings,
  SceneObjectSourceMetadata
} from "../../scene/contracts";
import {
  isAuroraConversationResRef,
  isPlaceableInterruptable
} from "../../scene/domain/placeableConversationInterruptable";

type PlaceableAdvancedSettingsDraft = Readonly<{
  conversation: string;
  noInterrupt: boolean;
}>;

function isExistingGitPlaceable(source: SceneObjectSourceMetadata | undefined): boolean {
  return source?.type === "aurora_git" && source.sourceKind === "placeable";
}

export function canEditExistingPlaceableConversation(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return isExistingGitPlaceable(source) &&
    isAuroraConversationResRef(source?.placeableConversation);
}

export function canEditExistingPlaceableInterruptable(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return isExistingGitPlaceable(source) &&
    isPlaceableInterruptable(source?.placeableInterruptable);
}

export function reduceExistingPlaceableConversation(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  nextValue: string
): string {
  return canEditExistingPlaceableConversation(source) &&
    isAuroraConversationResRef(nextValue)
    ? nextValue
    : currentValue;
}

export function reduceExistingPlaceableNoInterrupt(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: boolean,
  nextValue: boolean
): boolean {
  return canEditExistingPlaceableInterruptable(source) ? nextValue : currentValue;
}

export function materializeExistingPlaceableConversationInterruptable(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableAdvancedSettings | undefined,
  draft: PlaceableAdvancedSettingsDraft
): SceneObjectPlaceableAdvancedSettings | undefined {
  if (!current) return undefined;
  const result: SceneObjectPlaceableAdvancedSettings = { ...current };

  if (
    canEditExistingPlaceableConversation(source) &&
    isAuroraConversationResRef(draft.conversation)
  ) {
    result.conversation = draft.conversation;
  }

  if (canEditExistingPlaceableInterruptable(source)) {
    result.noInterrupt = draft.noInterrupt;
  }

  return result;
}
