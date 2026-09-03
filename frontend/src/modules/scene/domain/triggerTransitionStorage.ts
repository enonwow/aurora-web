import type { SceneObjectSourceMetadata } from "../contracts";
import {
  MAX_AREA_DOOR_LINKED_TO_CODE_UNITS,
  areaDoorTransitionStorageEqual,
  cloneAreaDoorTransitionStorage,
  isAreaDoorTransitionStorage,
  type AreaDoorTransitionStorage,
} from "../../shared/domain/areaDoorTransitionStorage";

export const MAX_TRIGGER_LINKED_TO_CODE_UNITS =
  MAX_AREA_DOOR_LINKED_TO_CODE_UNITS;

export type TriggerTransitionStorage = AreaDoorTransitionStorage;

export function isTriggerTransitionStorage(
  value: unknown,
): value is TriggerTransitionStorage {
  return isAreaDoorTransitionStorage(value);
}

export function cloneTriggerTransitionStorage(
  value: TriggerTransitionStorage,
): TriggerTransitionStorage {
  return cloneAreaDoorTransitionStorage(value);
}

export function triggerTransitionStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  return isTriggerTransitionStorage(left)
    && isTriggerTransitionStorage(right)
    && areaDoorTransitionStorageEqual(left, right);
}

export function canEditExistingTriggerTransitionStorage(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "trigger"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && isTriggerTransitionStorage(source.triggerTransitionStorage);
}
