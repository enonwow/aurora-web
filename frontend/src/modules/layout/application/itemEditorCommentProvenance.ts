import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { isItemEditorComment } from "../../scene/domain/itemEditorComment";

export function canEditExistingItemEditorComment(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "item" &&
    isItemEditorComment(source.itemEditorComment);
}

export function reduceExistingItemEditorComment(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingItemEditorComment(source) && isItemEditorComment(candidate)
    ? candidate
    : current;
}

export function materializeExistingItemComments(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  draftComments: unknown,
): string {
  return canEditExistingItemEditorComment(source) && isItemEditorComment(draftComments)
    ? draftComments
    : current;
}
