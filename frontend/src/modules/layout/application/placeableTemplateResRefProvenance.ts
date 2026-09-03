import type {
  SceneObjectPlaceableAdvancedSettings,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { isPlaceableTemplateResRef } from "../../scene/domain/placeableTemplateResRef";

export function canEditExistingPlaceableTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "placeable" &&
    isPlaceableTemplateResRef(source.placeableTemplateResRef);
}

export function reduceExistingPlaceableTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingPlaceableTemplateResRef(source) &&
    isPlaceableTemplateResRef(candidate)
    ? candidate
    : current;
}

export function materializeExistingPlaceableTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableAdvancedSettings | undefined,
  candidate: unknown,
): SceneObjectPlaceableAdvancedSettings | undefined {
  if (
    !current ||
    !canEditExistingPlaceableTemplateResRef(source) ||
    !isPlaceableTemplateResRef(candidate)
  ) {
    return current;
  }
  return { ...current, blueprintResRef: candidate };
}
