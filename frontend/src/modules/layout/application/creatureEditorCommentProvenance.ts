import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { isCreatureEditorComment } from "../../scene/domain/creatureEditorComment";

export function canEditExistingCreatureEditorComment(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    isCreatureEditorComment(source.creatureEditorComment);
}

export function reduceExistingCreatureEditorComment(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingCreatureEditorComment(source) &&
    isCreatureEditorComment(candidate)
    ? candidate
    : current;
}

export function materializeExistingCreatureComments(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  draftComments: unknown,
): string {
  if (source?.type !== "aurora_git") {
    return isCreatureEditorComment(draftComments) ? draftComments : current;
  }
  return canEditExistingCreatureEditorComment(source) &&
    isCreatureEditorComment(draftComments)
    ? draftComments
    : current;
}
