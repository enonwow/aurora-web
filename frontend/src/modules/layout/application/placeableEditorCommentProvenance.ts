import type {
  SceneObjectPlaceableProperties,
  SceneObjectSourceMetadata
} from "../../scene/contracts";
import { isPlaceableEditorComment } from "../../scene/domain/placeableEditorComment";

type PlaceableLongTextProperties = Pick<
  SceneObjectPlaceableProperties,
  "description" | "comments"
>;

export function canEditExistingPlaceableEditorComment(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "placeable" &&
    isPlaceableEditorComment(source.placeableEditorComment);
}

export function reduceExistingPlaceableEditorComment(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown
): string {
  return canEditExistingPlaceableEditorComment(source) &&
    isPlaceableEditorComment(candidate)
    ? candidate
    : current;
}

export function materializeExistingPlaceableComments(
  source: SceneObjectSourceMetadata | undefined,
  current: Readonly<PlaceableLongTextProperties> | undefined,
  draftComments: unknown
): PlaceableLongTextProperties {
  const result: PlaceableLongTextProperties = {};
  if (current?.description !== undefined) {
    result.description = current.description;
  }
  if (current?.comments !== undefined) {
    result.comments = canEditExistingPlaceableEditorComment(source) &&
      isPlaceableEditorComment(draftComments)
      ? draftComments
      : current.comments;
  }
  return result;
}
