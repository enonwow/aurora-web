import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  isEditablePlaceableHitPoints,
  readPlaceableHitPointState,
  type PlaceableHitPointState
} from "../../scene/domain/placeableHitPoints";

export function readExistingPlaceableHitPointState(
  source: SceneObjectSourceMetadata | undefined
): Readonly<PlaceableHitPointState> | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "placeable") return null;
  return readPlaceableHitPointState(source.placeableHitPointState);
}

export function canEditExistingPlaceableHitPoints(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return readExistingPlaceableHitPointState(source) !== null;
}

export function reduceExistingPlaceableHitPoints(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number,
  candidateValue: unknown
): number {
  return canEditExistingPlaceableHitPoints(source) && isEditablePlaceableHitPoints(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingPlaceableHitPoints(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  draftValue: unknown
): number | undefined {
  if (currentValue === undefined) return undefined;
  return reduceExistingPlaceableHitPoints(source, currentValue, draftValue);
}
