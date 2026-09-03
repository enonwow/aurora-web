import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingTriggerEditorComment as canEditExactTriggerEditorComment,
  isTriggerEditorComment,
} from "../../scene/domain/triggerEditorComment";

export function canEditExistingTriggerEditorComment(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return canEditExactTriggerEditorComment(source);
}

export function reduceExistingTriggerEditorComment(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingTriggerEditorComment(source) &&
    isTriggerEditorComment(candidate)
    ? candidate
    : current;
}

export function materializeExistingTriggerEditorComment(
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
  candidate: unknown,
): string | undefined {
  return canEditExistingTriggerEditorComment(source) &&
    isTriggerEditorComment(candidate)
    ? candidate
    : current;
}
