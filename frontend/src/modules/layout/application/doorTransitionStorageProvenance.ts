import type {
  SceneObjectDoorTransitionPayload,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  cloneAreaDoorTransitionStorage,
  isAreaDoorTransitionStorage,
  type AreaDoorTransitionStorage,
} from "../../shared/domain/areaDoorTransitionStorage";

export function readExistingDoorTransitionStorageProvenance(
  source: SceneObjectSourceMetadata | undefined,
): AreaDoorTransitionStorage | undefined {
  if (source?.type !== "aurora_git" || source.sourceKind !== "door" ||
      !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0 ||
      !isAreaDoorTransitionStorage(source.doorTransitionStorage)) {
    return undefined;
  }
  return cloneAreaDoorTransitionStorage(source.doorTransitionStorage);
}

export function canEditExistingDoorTransitionStorage(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingDoorTransitionStorageProvenance(source) !== undefined;
}

export function materializeExistingDoorTransitionStorage(
  source: SceneObjectSourceMetadata | undefined,
  target: unknown,
): AreaDoorTransitionStorage | null {
  if (!readExistingDoorTransitionStorageProvenance(source) ||
      !isAreaDoorTransitionStorage(target)) {
    return null;
  }
  return cloneAreaDoorTransitionStorage(target);
}

export function materializeExistingDoorTransitionPayload(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectDoorTransitionPayload | undefined,
  target: unknown,
): SceneObjectDoorTransitionPayload | null {
  const storage = materializeExistingDoorTransitionStorage(source, target);
  if (!storage) return null;
  return {
    linkedTarget: current?.linkedTarget ?? "",
    linkedModule: current?.linkedModule ?? "",
    linkedTag: current?.linkedTag ?? "",
    linkedWaypoint: current?.linkedWaypoint ?? "",
    loadScreen: current?.loadScreen ?? "",
    flags: { ...(current?.flags ?? {}) },
    storage,
    ...(current?.extra ? { extra: { ...current.extra } } : {}),
  };
}

export function cloneDoorTransitionPreserveOnlyPayload(
  value: SceneObjectDoorTransitionPayload | undefined,
): SceneObjectDoorTransitionPayload | undefined {
  if (!value) return undefined;
  return {
    linkedTarget: value.linkedTarget,
    linkedModule: value.linkedModule,
    linkedTag: value.linkedTag,
    linkedWaypoint: value.linkedWaypoint,
    loadScreen: value.loadScreen,
    flags: { ...value.flags },
    ...(value.extra ? { extra: { ...value.extra } } : {}),
  };
}
