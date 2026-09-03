import {
  MAX_AREA_DOOR_LINKED_TO_CODE_UNITS,
  areaDoorTransitionStorageEqual,
  cloneAreaDoorTransitionStorage,
  isAreaDoorTransitionStorage,
  readExistingAreaDoorTransitionStorageMutation,
  type AreaDoorTransitionStorage,
} from "./area-door-transition-storage";

export const MAX_AREA_TRIGGER_LINKED_TO_CODE_UNITS =
  MAX_AREA_DOOR_LINKED_TO_CODE_UNITS;

export type AreaTriggerTransitionStorage = AreaDoorTransitionStorage;

export interface ExistingAreaTriggerTransitionStorageMutation {
  readonly expectedValue: AreaTriggerTransitionStorage;
  readonly value: AreaTriggerTransitionStorage;
}

export function isAreaTriggerTransitionStorage(
  value: unknown,
): value is AreaTriggerTransitionStorage {
  return isAreaDoorTransitionStorage(value);
}

export function areaTriggerTransitionStorageEqual(
  left: unknown,
  right: unknown,
): boolean {
  return areaDoorTransitionStorageEqual(left, right);
}

export function cloneAreaTriggerTransitionStorage(
  value: AreaTriggerTransitionStorage,
): AreaTriggerTransitionStorage {
  return cloneAreaDoorTransitionStorage(value);
}

export function readExistingAreaTriggerTransitionStorageMutation(
  value: unknown,
): ExistingAreaTriggerTransitionStorageMutation | null {
  const mutation = readExistingAreaDoorTransitionStorageMutation(value);
  if (!mutation) return null;
  return Object.freeze({
    expectedValue: cloneAreaTriggerTransitionStorage(mutation.expectedValue),
    value: cloneAreaTriggerTransitionStorage(mutation.value),
  });
}
