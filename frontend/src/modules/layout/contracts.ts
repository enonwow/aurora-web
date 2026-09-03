export type WorkspaceUserRole = "viewer" | "builder" | "dm" | "admin";

/**
 * Ephemeral Area-canvas interaction state. It intentionally lives outside the
 * Area scene so arming or rotating a brush never becomes an undoable mutation.
 */
export type AuroraAreaEditingTool =
  | { kind: "inspect" }
  | { kind: "terrain"; terrain: string }
  | { kind: "crosser"; crosser: string }
  | { kind: "height"; delta: -1 | 1 }
  | { kind: "eraser" }
  | {
      kind: "group";
      groupId: string;
      orientation: 0 | 1 | 2 | 3;
    };

export const DEFAULT_AURORA_AREA_EDITING_TOOL: AuroraAreaEditingTool = {
  kind: "inspect"
};

export type {
  AreaScene,
  SceneAreaGlobalLighting,
  SceneAreaGlobalLightingFieldName,
  SceneHistoryState,
  SceneObject,
  SceneObjectEmbeddedItemSummary,
  SceneObjectKind,
  SceneObjectPlaceableInventoryItemReference,
  ScenePlaceableTrapTypeCatalog,
  ScenePlaceableBodyBagCatalog,
  ScenePlaceablePortraitCatalog,
  ScenePlaceableFactionCatalog,
  SceneObjectVisualTransform,
  SceneObjectVfxPreservePayload,
  SceneTile,
  SceneTileNativeLightNode,
  SceneTileSourceLightNode,
  TerrainBrushKind
} from "../scene/contracts";
