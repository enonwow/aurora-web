import type { AreaScene, AuroraAreaEditingTool } from "../contracts";

export interface AuroraAreaGridPointerDuringAssetLoadingInput {
  scene: Pick<AreaScene, "tiles" | "auroraAreaEditing">;
  selectionMode: "object" | "terrain";
  areaEditingTool: AuroraAreaEditingTool;
  objectAddPlacementActive: boolean;
  transformInteractionActive: boolean;
}

/**
 * Tile models are presentation assets. An Aurora Area editing payload already
 * contains the authoritative ARE grid needed for hit testing and tile edits,
 * so loading those models must not make the grid itself read-only.
 *
 * The exception is deliberately limited to grid selection or an explicitly
 * armed Aurora palette tool. Object placement, transform controls and scenes
 * without an Aurora editing payload remain behind the global loading gate.
 */
export function canUseAuroraAreaGridPointerDuringAssetLoading({
  scene,
  selectionMode,
  areaEditingTool,
  objectAddPlacementActive,
  transformInteractionActive
}: AuroraAreaGridPointerDuringAssetLoadingInput): boolean {
  const explicitAuroraPaintTool = areaEditingTool.kind !== "inspect";
  if (
    (selectionMode !== "terrain" && !explicitAuroraPaintTool) ||
    objectAddPlacementActive ||
    transformInteractionActive ||
    !scene.auroraAreaEditing ||
    scene.tiles.length === 0
  ) {
    return false;
  }

  const state = scene.auroraAreaEditing.state;
  if (state.width <= 0 || state.height <= 0 || state.tiles.length === 0) {
    return false;
  }

  return (
    areaEditingTool.kind === "inspect" ||
    areaEditingTool.kind === "terrain" ||
    areaEditingTool.kind === "group" ||
    areaEditingTool.kind === "crosser" ||
    areaEditingTool.kind === "height" ||
    areaEditingTool.kind === "eraser"
  );
}
