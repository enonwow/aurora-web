import type {
  ToolbarActionKey,
  WorkspaceToolbarState
} from "./workspaceChromeFacade";

export interface WorkspaceTopbarActionStateFacade {
  isActionActive(
    actionKey: ToolbarActionKey,
    toolbarState: WorkspaceToolbarState
  ): boolean;
}

function isSelectionModeActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  return (
    (toolbarState.selectionMode === "terrain" && actionKey === "select_terrain") ||
    (toolbarState.selectionMode === "object" && actionKey === "select_object")
  );
}

function isSelectionScopeActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  return (
    (toolbarState.selectionScope === "all" && actionKey === "scope_all") ||
    (toolbarState.selectionScope === "creatures" && actionKey === "scope_creatures") ||
    (toolbarState.selectionScope === "doors" && actionKey === "scope_doors") ||
    (toolbarState.selectionScope === "items" && actionKey === "scope_items") ||
    (toolbarState.selectionScope === "placeables" && actionKey === "scope_placeables") ||
    (toolbarState.selectionScope === "sounds" && actionKey === "scope_sounds")
  );
}

function isVisibilityActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  if (
    (actionKey === "show_creatures" && toolbarState.visibility.creatures) ||
    (actionKey === "show_doors" && toolbarState.visibility.doors) ||
    (actionKey === "show_items" && toolbarState.visibility.items) ||
    (actionKey === "show_placeables" && toolbarState.visibility.placeables) ||
    (actionKey === "show_sounds" && toolbarState.visibility.sounds)
  ) {
    return true;
  }

  return (
    actionKey === "show_none" &&
    !toolbarState.visibility.creatures &&
    !toolbarState.visibility.doors &&
    !toolbarState.visibility.items &&
    !toolbarState.visibility.placeables &&
    !toolbarState.visibility.sounds
  );
}

function isCanvasDebugToggleActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  return (
    (actionKey === "debug_wireframe" && toolbarState.canvasDebug.wireframe) ||
    (actionKey === "debug_textures" && toolbarState.canvasDebug.textures) ||
    (actionKey === "debug_grid" && toolbarState.canvasDebug.grid) ||
    (actionKey === "debug_axes" && toolbarState.canvasDebug.axes) ||
    (actionKey === "debug_bounds" && toolbarState.canvasDebug.bounds) ||
    (actionKey === "debug_hidden_meshes" && toolbarState.canvasDebug.hiddenMeshes) ||
    (actionKey === "debug_show_non_render_meshes" &&
      toolbarState.canvasDebug.showNonRenderMeshes)
  );
}

function isStatusMapActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  return (
    (actionKey === "debug_status_map_off" && toolbarState.canvasDebug.statusMap === "off") ||
    (actionKey === "debug_status_map_placeables" &&
      toolbarState.canvasDebug.statusMap === "placeables") ||
    (actionKey === "debug_status_map_doors" &&
      toolbarState.canvasDebug.statusMap === "doors") ||
    (actionKey === "debug_status_map_creatures" &&
      toolbarState.canvasDebug.statusMap === "creatures") ||
    (actionKey === "debug_status_map_items" &&
      toolbarState.canvasDebug.statusMap === "items") ||
    (actionKey === "debug_status_map_sounds" &&
      toolbarState.canvasDebug.statusMap === "sounds") ||
    (actionKey === "debug_status_map_all" && toolbarState.canvasDebug.statusMap === "all")
  );
}

function isTextureCompressionActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  return (
    (actionKey === "debug_texture_compression_none" &&
      toolbarState.canvasDebug.textureCompression === "none") ||
    (actionKey === "debug_texture_compression_etc1s" &&
      toolbarState.canvasDebug.textureCompression === "etc1s") ||
    (actionKey === "debug_texture_compression_uastc" &&
      toolbarState.canvasDebug.textureCompression === "uastc")
  );
}

function isGizmoActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  return (
    (actionKey === "canvas_gizmo_translate" &&
      toolbarState.canvasDebug.gizmoMode === "translate") ||
    (actionKey === "canvas_gizmo_rotate" && toolbarState.canvasDebug.gizmoMode === "rotate") ||
    (actionKey === "canvas_gizmo_scale" && toolbarState.canvasDebug.gizmoMode === "scale")
  );
}

function isSnapActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  return (
    (actionKey === "snap_grid_toggle" && toolbarState.canvasDebug.snapGrid) ||
    (actionKey === "snap_angle_toggle" && toolbarState.canvasDebug.snapAngle) ||
    (actionKey === "snap_height_toggle" && toolbarState.canvasDebug.snapHeight)
  );
}

function isLockActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  if (
    (actionKey === "lock_creatures" && toolbarState.canvasDebug.lockedKinds.creatures) ||
    (actionKey === "lock_doors" && toolbarState.canvasDebug.lockedKinds.doors) ||
    (actionKey === "lock_items" && toolbarState.canvasDebug.lockedKinds.items) ||
    (actionKey === "lock_placeables" && toolbarState.canvasDebug.lockedKinds.placeables) ||
    (actionKey === "lock_sounds" && toolbarState.canvasDebug.lockedKinds.sounds)
  ) {
    return true;
  }

  return (
    actionKey === "unlock_all_layers" &&
    !toolbarState.canvasDebug.lockedKinds.creatures &&
    !toolbarState.canvasDebug.lockedKinds.doors &&
    !toolbarState.canvasDebug.lockedKinds.items &&
    !toolbarState.canvasDebug.lockedKinds.placeables &&
    !toolbarState.canvasDebug.lockedKinds.sounds
  );
}

function isIsolationActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  if (
    (actionKey === "isolate_creatures" &&
      toolbarState.canvasDebug.isolateKind === "creatures") ||
    (actionKey === "isolate_doors" && toolbarState.canvasDebug.isolateKind === "doors") ||
    (actionKey === "isolate_items" && toolbarState.canvasDebug.isolateKind === "items") ||
    (actionKey === "isolate_placeables" &&
      toolbarState.canvasDebug.isolateKind === "placeables") ||
    (actionKey === "isolate_sounds" && toolbarState.canvasDebug.isolateKind === "sounds")
  ) {
    return true;
  }

  return actionKey === "clear_isolation" && toolbarState.canvasDebug.isolateKind === "none";
}

function isAdvancedDebugActionActive(
  actionKey: ToolbarActionKey,
  toolbarState: WorkspaceToolbarState
): boolean {
  return (
    (actionKey === "debug_chunks" && toolbarState.canvasDebug.chunkBounds) ||
    (actionKey === "debug_object_labels" && toolbarState.canvasDebug.objectLabels) ||
    (actionKey === "debug_perf_hud" && toolbarState.canvasDebug.perfHud) ||
    (actionKey === "debug_controls_hint" && toolbarState.canvasDebug.controlsHint) ||
    (actionKey === "debug_runtime_hud" && toolbarState.canvasDebug.runtimeHud) ||
    (actionKey === "debug_walkmesh_overlay" && toolbarState.canvasDebug.walkmeshOverlay) ||
    (actionKey === "debug_collision_overlay" && toolbarState.canvasDebug.collisionOverlay)
  );
}

export function createWorkspaceTopbarActionStateFacade(): WorkspaceTopbarActionStateFacade {
  return {
    isActionActive(actionKey, toolbarState) {
      return (
        isSelectionModeActionActive(actionKey, toolbarState) ||
        isSelectionScopeActionActive(actionKey, toolbarState) ||
        isVisibilityActionActive(actionKey, toolbarState) ||
        isCanvasDebugToggleActionActive(actionKey, toolbarState) ||
        isStatusMapActionActive(actionKey, toolbarState) ||
        isTextureCompressionActionActive(actionKey, toolbarState) ||
        isGizmoActionActive(actionKey, toolbarState) ||
        isSnapActionActive(actionKey, toolbarState) ||
        isLockActionActive(actionKey, toolbarState) ||
        isIsolationActionActive(actionKey, toolbarState) ||
        isAdvancedDebugActionActive(actionKey, toolbarState)
      );
    }
  };
}
