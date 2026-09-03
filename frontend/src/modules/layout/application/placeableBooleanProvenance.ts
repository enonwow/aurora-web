import type { SceneObjectSourceMetadata } from "../../scene/contracts";

export type ExistingPlaceableBooleanField =
  | "isStatic"
  | "useable"
  | "plot"
  | "hasInventory";

const SOURCE_FIELD_BY_EDITABLE_FIELD = {
  isStatic: "placeableStatic",
  useable: "placeableUseable",
  plot: "placeablePlot",
  hasInventory: "placeableHasInventory"
} as const satisfies Record<ExistingPlaceableBooleanField, keyof SceneObjectSourceMetadata>;

export function canEditExistingPlaceableBoolean(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingPlaceableBooleanField
): boolean {
  const sourceField = SOURCE_FIELD_BY_EDITABLE_FIELD[field];
  return source?.type === "aurora_git" &&
    source.sourceKind === "placeable" &&
    source[sourceField] !== undefined;
}
