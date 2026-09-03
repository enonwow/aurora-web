import type {
  SceneObjectSourceMetadata,
  SceneObjectWaypointVariableTargetEntry,
} from "../../scene/contracts";
import {
  readWaypointVariableProvenance,
  readWaypointVariableTargetEntries,
} from "../../scene/domain/waypointVariableTable";

export function canEditExistingWaypointVariables(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git" && source.sourceKind === "waypoint" &&
    Number.isSafeInteger(source.sourceIndex) &&
    readWaypointVariableProvenance(source.waypointVariables) !== null;
}

export function readExistingWaypointVariables(
  source: SceneObjectSourceMetadata | undefined,
): readonly SceneObjectWaypointVariableTargetEntry[] | undefined {
  if (!canEditExistingWaypointVariables(source)) return undefined;
  const provenance = readWaypointVariableProvenance(source?.waypointVariables);
  return provenance?.expectedEntries.map(({ sourceIndex: _, ...entry }) => ({ ...entry }));
}

export function reduceExistingWaypointVariables(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectWaypointVariableTargetEntry[],
  candidate: unknown,
): readonly SceneObjectWaypointVariableTargetEntry[] {
  if (!canEditExistingWaypointVariables(source)) return current;
  const parsed = readWaypointVariableTargetEntries(candidate);
  return parsed?.map((entry) => ({ ...entry })) ?? current;
}

export function materializeExistingWaypointVariables(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectWaypointVariableTargetEntry[] | undefined,
  draft: unknown,
): SceneObjectWaypointVariableTargetEntry[] | undefined {
  if (!canEditExistingWaypointVariables(source)) return current?.map((entry) => ({ ...entry }));
  const parsed = readWaypointVariableTargetEntries(draft);
  return parsed?.map((entry) => ({ ...entry })) ?? current?.map((entry) => ({ ...entry }));
}
