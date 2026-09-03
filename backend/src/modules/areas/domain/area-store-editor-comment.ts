import {
  MAX_AREA_PLACEABLE_EDITOR_COMMENT_CODE_UNITS,
  isAreaPlaceableEditorComment,
  type ExistingAreaPlaceableEditorCommentMutation,
} from "./area-placeable-editor-comment";

export const MAX_AREA_STORE_EDITOR_COMMENT_CODE_UNITS =
  MAX_AREA_PLACEABLE_EDITOR_COMMENT_CODE_UNITS;

export type ExistingAreaStoreEditorCommentMutation =
  ExistingAreaPlaceableEditorCommentMutation;

export const isAreaStoreEditorComment = isAreaPlaceableEditorComment;
