import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { isEncounterEditorComment } from "../../scene/domain/encounterEditorComment";

export function canEditExistingEncounterEditorComment(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "encounter" &&
    isEncounterEditorComment(source.encounterEditorComment);
}

export function reduceExistingEncounterEditorComment(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingEncounterEditorComment(source) &&
    isEncounterEditorComment(candidate)
    ? candidate
    : current;
}

export function materializeExistingEncounterEditorComment(
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
  candidate: unknown,
): string | undefined {
  return canEditExistingEncounterEditorComment(source) &&
    isEncounterEditorComment(candidate)
    ? candidate
    : current;
}
