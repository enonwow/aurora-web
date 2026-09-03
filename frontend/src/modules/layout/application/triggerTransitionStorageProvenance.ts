import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingTriggerTransitionStorage,
  cloneTriggerTransitionStorage,
  isTriggerTransitionStorage,
  triggerTransitionStoragesEqual,
  type TriggerTransitionStorage,
} from "../../scene/domain/triggerTransitionStorage";

export function readExistingTriggerTransitionStorageProvenance(
  source: SceneObjectSourceMetadata | undefined,
): TriggerTransitionStorage | undefined {
  if (!canEditExistingTriggerTransitionStorage(source)) return undefined;
  return cloneTriggerTransitionStorage(source!.triggerTransitionStorage!);
}

export function reduceExistingTriggerTransitionStorage(
  source: SceneObjectSourceMetadata | undefined,
  current: TriggerTransitionStorage,
  value: unknown,
): TriggerTransitionStorage {
  if (
    !canEditExistingTriggerTransitionStorage(source)
    || !isTriggerTransitionStorage(current)
    || !isTriggerTransitionStorage(value)
    || triggerTransitionStoragesEqual(current, value)
  ) return current;
  return cloneTriggerTransitionStorage(value);
}

export function materializeExistingTriggerTransitionStorage(
  source: SceneObjectSourceMetadata | undefined,
  current: TriggerTransitionStorage,
  draft: unknown,
): TriggerTransitionStorage {
  if (
    !canEditExistingTriggerTransitionStorage(source)
    || !isTriggerTransitionStorage(current)
    || !isTriggerTransitionStorage(draft)
  ) return cloneTriggerTransitionStorage(current);
  return triggerTransitionStoragesEqual(current, draft)
    ? cloneTriggerTransitionStorage(current)
    : cloneTriggerTransitionStorage(draft);
}

export { canEditExistingTriggerTransitionStorage };
