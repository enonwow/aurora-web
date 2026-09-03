import type {
  SceneObjectItemInstanceStateField,
  SceneObjectItemInstanceStateValue,
  SceneObjectItemProperties,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  readItemInstanceStateFieldValue,
  readItemInstanceStateStorage,
  readItemInstanceStateValue,
} from "../../scene/domain/itemInstanceState";

export function canEditExistingItemInstanceState(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "item" &&
    Number.isSafeInteger(source.sourceIndex) && Number(source.sourceIndex) >= 0 &&
    readItemInstanceStateStorage(source.itemInstanceState) !== null;
}

export function reduceExistingItemInstanceStateField<
  K extends SceneObjectItemInstanceStateField,
>(
  source: SceneObjectSourceMetadata | undefined,
  field: K,
  current: SceneObjectItemInstanceStateValue[K] | undefined,
  candidate: unknown,
): SceneObjectItemInstanceStateValue[K] | undefined {
  if (!canEditExistingItemInstanceState(source)) return current;
  return readItemInstanceStateFieldValue(field, candidate) ?? current;
}

export function materializeExistingItemInstanceState(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectItemProperties | undefined,
  draft: unknown,
): SceneObjectItemProperties | undefined {
  if (!canEditExistingItemInstanceState(source)) return current;
  const value = readItemInstanceStateValue(draft);
  return value ? { ...(current ?? {}), ...value } : current;
}
