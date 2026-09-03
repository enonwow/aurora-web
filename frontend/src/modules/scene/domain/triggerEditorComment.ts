import type { SceneObjectSourceMetadata } from "../contracts";
import {
  AREA_EDITOR_COMMENT_MAX_CODE_UNITS,
  isAreaEditorComment,
  readAreaEditorComment,
} from "./editorComment";

export const TRIGGER_EDITOR_COMMENT_MAX_CODE_UNITS =
  AREA_EDITOR_COMMENT_MAX_CODE_UNITS;

export function isTriggerEditorComment(value: unknown): value is string {
  return isAreaEditorComment(value);
}

export function readTriggerEditorComment(
  metadata: Readonly<{ editorComment?: unknown }> | undefined,
): string | undefined {
  return readAreaEditorComment(metadata as Readonly<Record<string, unknown>> | undefined);
}

export function canEditExistingTriggerEditorComment(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "trigger" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    isTriggerEditorComment(source.triggerEditorComment);
}
