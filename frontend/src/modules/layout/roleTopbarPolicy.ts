import type { WorkspaceUserRole } from "./contracts";

export type ToolbarStatus = "mvp" | "post_mvp" | "pending_estimate";

export type SelectionMode = "terrain" | "object";
export type SelectionScope =
  | "all"
  | "creatures"
  | "doors"
  | "encounters"
  | "items"
  | "placeables"
  | "sounds"
  | "stores"
  | "triggers"
  | "waypoints";
export type VisibilityFilterKey =
  | "creatures"
  | "doors"
  | "encounters"
  | "items"
  | "merchants"
  | "placeables"
  | "sounds"
  | "stores"
  | "triggers"
  | "waypoints"
  | "start_location";

export type ToolbarActionKey =
  | "save_local_draft"
  | "undo"
  | "redo"
  | "go_to_start_location"
  | "fit_area_view"
  | "top_down_oracle_view"
  | "reorient_camera"
  | "select_terrain"
  | "select_object"
  | "scope_all"
  | "scope_creatures"
  | "scope_doors"
  | "scope_items"
  | "scope_placeables"
  | "scope_sounds"
  | "show_all"
  | "show_none"
  | "show_creatures"
  | "show_doors"
  | "show_encounters"
  | "show_items"
  | "show_merchants"
  | "show_placeables"
  | "show_sounds"
  | "show_triggers"
  | "show_waypoints"
  | "show_start_location"
  | "display_shadows"
  | "display_fog"
  | "use_area_lighting"
  | "play_ambient_sound"
  | "play_ambient_music"
  | "play_placed_sound_object"
  | "show_preview_window"
  | "debug_wireframe"
  | "debug_textures"
  | "debug_grid"
  | "debug_axes"
  | "debug_bounds"
  | "debug_ceiling_meshes"
  | "debug_hidden_meshes"
  | "debug_show_non_render_meshes"
  | "debug_show_vt_physical_anchor"
  | "debug_status_map_off"
  | "debug_status_map_placeables"
  | "debug_status_map_doors"
  | "debug_status_map_creatures"
  | "debug_status_map_items"
  | "debug_status_map_sounds"
  | "debug_status_map_all"
  | "debug_texture_compression_none"
  | "debug_texture_compression_etc1s"
  | "debug_texture_compression_uastc"
  | "canvas_gizmo_translate"
  | "canvas_gizmo_rotate"
  | "canvas_gizmo_scale"
  | "canvas_gizmo_vt_rotate"
  | "canvas_gizmo_vt_translate"
  | "canvas_gizmo_vt_scale"
  | "snap_grid_toggle"
  | "snap_angle_toggle"
  | "snap_height_toggle"
  | "lock_creatures"
  | "lock_doors"
  | "lock_items"
  | "lock_placeables"
  | "lock_sounds"
  | "unlock_all_layers"
  | "isolate_creatures"
  | "isolate_doors"
  | "isolate_items"
  | "isolate_placeables"
  | "isolate_sounds"
  | "clear_isolation"
  | "debug_chunks"
  | "debug_object_labels"
  | "debug_perf_hud"
  | "debug_walkmesh_overlay"
  | "debug_collision_overlay"
  | "debug_controls_hint"
  | "debug_runtime_hud"
  | "debug_export_status_report"
  | "select_same_resref"
  | "select_invert"
  | "select_radius"
  | "copy_selected_objects"
  | "delete_selected_objects"
  | "camera_bookmark_save_1"
  | "camera_bookmark_load_1"
  | "dm_spawn_creature"
  | "dm_spawn_vfx";

export interface ToolbarAction {
  key: ToolbarActionKey;
  label: string;
  status: ToolbarStatus;
  supported: boolean;
}

export interface ToolbarGroup {
  key: string;
  label: string;
  actions: ToolbarAction[];
}

export interface KeyboardShortcut {
  key: string;
  description: string;
}

export interface WorkspaceToolbarState {
  selectionMode: SelectionMode;
  selectionScope: SelectionScope;
  visibility: Record<VisibilityFilterKey, boolean>;
  canvasDebug: {
    wireframe: boolean;
    textures: boolean;
    grid: boolean;
    axes: boolean;
    bounds: boolean;
    displayShadows: boolean;
    displayFog: boolean;
    useAreaLighting: boolean;
    ceilingMeshes: boolean;
    hiddenMeshes: boolean;
    showNonRenderMeshes: boolean;
    showVtPhysicalAnchor: boolean;
    statusMap:
      | "off"
      | "placeables"
      | "doors"
      | "creatures"
      | "encounters"
      | "items"
      | "sounds"
      | "all";
    textureCompression: "none" | "etc1s" | "uastc";
    gizmoMode:
      | "translate"
      | "rotate"
      | "scale"
      | "vt_rotate"
      | "vt_translate"
      | "vt_scale";
    snapGrid: boolean;
    snapAngle: boolean;
    snapHeight: boolean;
    lockedKinds: {
      creatures: boolean;
      doors: boolean;
      encounters: boolean;
      items: boolean;
      placeables: boolean;
      sounds: boolean;
      stores: boolean;
      triggers: boolean;
      waypoints: boolean;
    };
    isolateKind:
      | "none"
      | "creatures"
      | "doors"
      | "encounters"
      | "items"
      | "placeables"
      | "sounds"
      | "stores"
      | "triggers"
      | "waypoints";
    chunkBounds: boolean;
    objectLabels: boolean;
    perfHud: boolean;
    walkmeshOverlay: boolean;
    collisionOverlay: boolean;
    controlsHint: boolean;
    runtimeHud: boolean;
  };
  lastCommand: ToolbarActionKey | null;
}

export interface WorkspaceCommandSignal {
  actionKey: ToolbarActionKey;
  revision: number;
  issuedAtUnixMs: number;
}

const toggleKeys: ToolbarActionKey[] = [
  "show_creatures",
  "show_doors",
  "show_encounters",
  "show_items",
  "show_merchants",
  "show_placeables",
  "show_sounds",
  "show_triggers",
  "show_waypoints",
  "show_start_location",
  "display_shadows",
  "display_fog",
  "use_area_lighting",
  "play_ambient_sound",
  "play_ambient_music",
  "play_placed_sound_object",
  "show_preview_window"
];

function action(
  key: ToolbarActionKey,
  label: string,
  status: ToolbarStatus
): ToolbarAction {
  return {
    key,
    label,
    status,
    supported: status === "mvp"
  };
}

const builderAndAdminGroups: ToolbarGroup[] = [
  {
    key: "module",
    label: "Module",
    actions: [action("save_local_draft", "Save (Local Draft)", "mvp")]
  },
  {
    key: "camera",
    label: "Camera",
    actions: [
      action("go_to_start_location", "Go To Start Location", "post_mvp"),
      action("fit_area_view", "Fit Area", "mvp"),
      action("top_down_oracle_view", "Top Down", "mvp"),
      action("reorient_camera", "Reorient Camera", "mvp")
    ]
  },
  {
    key: "selection",
    label: "Selection",
    actions: [
      action("select_terrain", "Select Terrain", "mvp"),
      action("select_object", "Select Object", "mvp"),
      action("scope_all", "All", "mvp"),
      action("scope_creatures", "Creatures", "mvp"),
      action("scope_doors", "Doors", "mvp"),
      action("scope_items", "Items", "mvp"),
      action("scope_placeables", "Placeables", "mvp"),
      action("scope_sounds", "Sounds", "mvp")
    ]
  },
  {
    key: "visibility",
    label: "Visibility",
    actions: [
      action("show_all", "Show All", "mvp"),
      action("show_none", "Show None", "mvp"),
      action("show_creatures", "Show Creatures", "mvp"),
      action("show_doors", "Show Doors", "mvp"),
      action("show_encounters", "Show Encounters", "post_mvp"),
      action("show_items", "Show Items", "mvp"),
      action("show_merchants", "Show Merchants", "post_mvp"),
      action("show_placeables", "Show Placeables", "mvp"),
      action("show_sounds", "Show Sounds", "mvp"),
      action("show_triggers", "Show Triggers", "post_mvp"),
      action("show_waypoints", "Show Waypoints", "post_mvp"),
      action("show_start_location", "Show Start Location", "post_mvp")
    ]
  },
  {
    key: "environment",
    label: "Environment",
    actions: [
      action("display_shadows", "Display Shadows", "mvp"),
      action("display_fog", "Display Fog", "mvp"),
      action("use_area_lighting", "Use Area Lighting", "mvp"),
      action("play_ambient_sound", "Play Ambient Sound", "pending_estimate"),
      action("play_ambient_music", "Play Ambient Music In Area", "pending_estimate"),
      action(
        "play_placed_sound_object",
        "Play Placed Sound Object In Area",
        "pending_estimate"
      ),
      action("show_preview_window", "Show Preview Window", "pending_estimate")
    ]
  },
  {
    key: "canvas",
    label: "Canvas",
    actions: [
      action("canvas_gizmo_translate", "World Move (1)", "mvp"),
      action("canvas_gizmo_rotate", "World Bearing (2)", "mvp"),
      action("canvas_gizmo_vt_rotate", "VT Rotate (3)", "mvp"),
      action("canvas_gizmo_vt_translate", "VT Offset (4)", "mvp"),
      action("canvas_gizmo_vt_scale", "VT Scale (5)", "mvp"),
      action("snap_grid_toggle", "Snap Grid", "mvp"),
      action("snap_angle_toggle", "Snap Angle", "mvp"),
      action("snap_height_toggle", "Snap Height", "mvp"),
      action("lock_placeables", "Lock Placeables", "mvp"),
      action("lock_creatures", "Lock Creatures", "mvp"),
      action("lock_doors", "Lock Doors", "mvp"),
      action("lock_items", "Lock Items", "mvp"),
      action("lock_sounds", "Lock Sounds", "mvp"),
      action("unlock_all_layers", "Unlock All", "mvp"),
      action("isolate_placeables", "Isolate Placeables", "mvp"),
      action("isolate_creatures", "Isolate Creatures", "mvp"),
      action("isolate_doors", "Isolate Doors", "mvp"),
      action("isolate_items", "Isolate Items", "mvp"),
      action("isolate_sounds", "Isolate Sounds", "mvp"),
      action("clear_isolation", "Clear Isolation", "mvp"),
      action("select_same_resref", "Select Same ResRef", "mvp"),
      action("select_invert", "Invert Selection", "mvp"),
      action("select_radius", "Select In Radius", "mvp"),
      action("copy_selected_objects", "Copy Selected", "mvp"),
      action("delete_selected_objects", "Delete Selected", "mvp"),
      action("fit_area_view", "Fit Area", "mvp"),
      action("camera_bookmark_save_1", "Save Bookmark #1", "mvp"),
      action("camera_bookmark_load_1", "Load Bookmark #1", "mvp"),
      action("debug_wireframe", "Wireframe", "mvp"),
      action("debug_textures", "Textures", "mvp"),
      action("debug_grid", "Grid", "mvp"),
      action("debug_axes", "Axes", "mvp"),
      action("debug_bounds", "Bounds", "mvp"),
      action("debug_ceiling_meshes", "Ceiling", "mvp"),
      action("debug_chunks", "Chunk Bounds", "mvp"),
      action("debug_object_labels", "Object Labels", "mvp"),
      action("debug_hidden_meshes", "Hidden Meshes", "mvp"),
      action("debug_show_non_render_meshes", "Show Non-render Meshes", "mvp"),
      action("debug_show_vt_physical_anchor", "Show VT Physical Anchor", "mvp"),
      action("debug_perf_hud", "Perf HUD", "mvp"),
      action("debug_walkmesh_overlay", "Walkmesh Overlay", "mvp"),
      action("debug_collision_overlay", "Collision Overlay", "mvp"),
      action("debug_controls_hint", "Controls Hint", "mvp"),
      action("debug_runtime_hud", "Runtime Popup", "mvp"),
      action("debug_export_status_report", "Export Status Report", "mvp"),
      action("debug_status_map_off", "Status Off", "mvp"),
      action("debug_status_map_placeables", "Status Placeables", "mvp"),
      action("debug_status_map_doors", "Status Doors", "mvp"),
      action("debug_status_map_creatures", "Status Creatures", "mvp"),
      action("debug_status_map_items", "Status Items", "mvp"),
      action("debug_status_map_sounds", "Status Sounds", "mvp"),
      action("debug_status_map_all", "Status All", "mvp"),
      action("debug_texture_compression_none", "Tex none", "mvp"),
      action("debug_texture_compression_etc1s", "Tex ETC1S", "mvp"),
      action("debug_texture_compression_uastc", "Tex UASTC", "mvp")
    ]
  }
];

const dmGroups: ToolbarGroup[] = [
  {
    key: "dm_commands",
    label: "DM Commands",
    actions: [
      action("dm_spawn_creature", "Spawn Creature", "mvp"),
      action("dm_spawn_vfx", "Spawn VFX", "mvp")
    ]
  },
  {
    key: "camera",
    label: "Camera",
    actions: [
      action("fit_area_view", "Fit Area", "mvp"),
      action("top_down_oracle_view", "Top Down", "mvp"),
      action("reorient_camera", "Reorient Camera", "mvp")
    ]
  },
  {
    key: "selection",
    label: "Selection",
    actions: [
      action("select_object", "Select Object", "mvp"),
      action("scope_all", "All", "mvp"),
      action("scope_creatures", "Creatures", "mvp"),
      action("scope_doors", "Doors", "mvp"),
      action("scope_items", "Items", "mvp"),
      action("scope_placeables", "Placeables", "mvp"),
      action("scope_sounds", "Sounds", "mvp")
    ]
  },
  {
    key: "visibility",
    label: "Visibility",
    actions: [
      action("show_all", "Show All", "mvp"),
      action("show_none", "Show None", "mvp"),
      action("show_creatures", "Show Creatures", "mvp"),
      action("show_doors", "Show Doors", "mvp"),
      action("show_items", "Show Items", "mvp"),
      action("show_placeables", "Show Placeables", "mvp"),
      action("show_sounds", "Show Sounds", "mvp")
    ]
  },
  {
    key: "canvas",
    label: "Canvas",
    actions: [
      action("canvas_gizmo_translate", "World Move (1)", "mvp"),
      action("canvas_gizmo_rotate", "World Bearing (2)", "mvp"),
      action("canvas_gizmo_vt_rotate", "VT Rotate (3)", "mvp"),
      action("canvas_gizmo_vt_translate", "VT Offset (4)", "mvp"),
      action("canvas_gizmo_vt_scale", "VT Scale (5)", "mvp"),
      action("snap_grid_toggle", "Snap Grid", "mvp"),
      action("snap_angle_toggle", "Snap Angle", "mvp"),
      action("fit_area_view", "Fit Area", "mvp"),
      action("camera_bookmark_save_1", "Save Bookmark #1", "mvp"),
      action("camera_bookmark_load_1", "Load Bookmark #1", "mvp"),
      action("debug_wireframe", "Wireframe", "mvp"),
      action("debug_textures", "Textures", "mvp"),
      action("debug_grid", "Grid", "mvp"),
      action("debug_axes", "Axes", "mvp"),
      action("debug_bounds", "Bounds", "mvp"),
      action("debug_show_vt_physical_anchor", "Show VT Physical Anchor", "mvp"),
      action("debug_chunks", "Chunk Bounds", "mvp"),
      action("debug_object_labels", "Object Labels", "mvp"),
      action("debug_perf_hud", "Perf HUD", "mvp"),
      action("debug_walkmesh_overlay", "Walkmesh Overlay", "mvp"),
      action("debug_collision_overlay", "Collision Overlay", "mvp"),
      action("debug_controls_hint", "Controls Hint", "mvp"),
      action("debug_runtime_hud", "Runtime Popup", "mvp"),
      action("debug_export_status_report", "Export Status Report", "mvp"),
      action("debug_status_map_off", "Status Off", "mvp"),
      action("debug_status_map_all", "Status All", "mvp")
    ]
  }
];

const viewerGroups: ToolbarGroup[] = [
  {
    key: "camera",
    label: "Camera",
    actions: [
      action("fit_area_view", "Fit Area", "mvp"),
      action("top_down_oracle_view", "Top Down", "mvp"),
      action("reorient_camera", "Reorient Camera", "mvp")
    ]
  },
  {
    key: "selection",
    label: "Selection",
    actions: [
      action("select_object", "Select Object", "mvp"),
      action("scope_all", "All", "mvp"),
      action("scope_creatures", "Creatures", "mvp"),
      action("scope_doors", "Doors", "mvp"),
      action("scope_items", "Items", "mvp"),
      action("scope_placeables", "Placeables", "mvp"),
      action("scope_sounds", "Sounds", "mvp")
    ]
  },
  {
    key: "visibility",
    label: "Visibility",
    actions: [
      action("show_all", "Show All", "mvp"),
      action("show_none", "Show None", "mvp"),
      action("show_creatures", "Show Creatures", "mvp"),
      action("show_doors", "Show Doors", "mvp"),
      action("show_items", "Show Items", "mvp"),
      action("show_placeables", "Show Placeables", "mvp"),
      action("show_sounds", "Show Sounds", "mvp")
    ]
  },
  {
    key: "canvas",
    label: "Canvas",
    actions: [
      action("fit_area_view", "Fit Area", "mvp"),
      action("camera_bookmark_load_1", "Load Bookmark #1", "mvp"),
      action("debug_wireframe", "Wireframe", "mvp"),
      action("debug_textures", "Textures", "mvp"),
      action("debug_grid", "Grid", "mvp"),
      action("debug_axes", "Axes", "mvp"),
      action("debug_bounds", "Bounds", "mvp"),
      action("debug_show_vt_physical_anchor", "Show VT Physical Anchor", "mvp"),
      action("debug_chunks", "Chunk Bounds", "mvp"),
      action("debug_object_labels", "Object Labels", "mvp"),
      action("debug_perf_hud", "Perf HUD", "mvp"),
      action("debug_walkmesh_overlay", "Walkmesh Overlay", "mvp"),
      action("debug_collision_overlay", "Collision Overlay", "mvp"),
      action("debug_controls_hint", "Controls Hint", "mvp"),
      action("debug_runtime_hud", "Runtime Popup", "mvp"),
      action("debug_export_status_report", "Export Status Report", "mvp")
    ]
  }
];

const groupsByRole: Record<WorkspaceUserRole, ToolbarGroup[]> = {
  viewer: viewerGroups,
  builder: builderAndAdminGroups,
  dm: dmGroups,
  admin: builderAndAdminGroups
};

const quickActionsByRole: Record<WorkspaceUserRole, ToolbarAction[]> = {
  viewer: [action("fit_area_view", "Fit Area", "mvp")],
  builder: [
    action("fit_area_view", "Fit Area", "mvp"),
    action("undo", "Undo", "mvp"),
    action("redo", "Redo", "mvp")
  ],
  dm: [action("fit_area_view", "Fit Area", "mvp")],
  admin: [
    action("fit_area_view", "Fit Area", "mvp"),
    action("undo", "Undo", "mvp"),
    action("redo", "Redo", "mvp")
  ]
};

const commonShortcuts: KeyboardShortcut[] = [
  { key: "?", description: "Open keyboard shortcuts." },
  { key: "Esc", description: "Close open popup panels." }
];

const roleSpecificShortcuts: Record<WorkspaceUserRole, KeyboardShortcut[]> = {
  viewer: [{ key: "Ctrl/Cmd + R", description: "Fit/reset view." }],
  builder: [
    { key: "Ctrl/Cmd + R", description: "Fit/reset view." },
    { key: "Ctrl/Cmd + Z", description: "Undo." },
    { key: "Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z", description: "Redo." },
    { key: "Ctrl/Cmd + S", description: "Save local draft." }
  ],
  dm: [{ key: "Ctrl/Cmd + R", description: "Fit/reset view." }],
  admin: [
    { key: "Ctrl/Cmd + R", description: "Fit/reset view." },
    { key: "Ctrl/Cmd + Z", description: "Undo." },
    { key: "Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z", description: "Redo." },
    { key: "Ctrl/Cmd + S", description: "Save local draft." }
  ]
};

export function getRoleToolbarGroups(role: WorkspaceUserRole): ToolbarGroup[] {
  return groupsByRole[role];
}

export function getRoleQuickActions(role: WorkspaceUserRole): ToolbarAction[] {
  return quickActionsByRole[role];
}

export function getRoleKeyboardShortcuts(role: WorkspaceUserRole): KeyboardShortcut[] {
  return [...commonShortcuts, ...roleSpecificShortcuts[role]];
}

export function createDefaultToolbarState(): WorkspaceToolbarState {
  return {
    selectionMode: "object",
    selectionScope: "all",
    visibility: {
      creatures: true,
      doors: true,
      encounters: false,
      items: true,
      merchants: false,
      placeables: true,
      sounds: true,
      stores: false,
      triggers: false,
      waypoints: false,
      start_location: false
    },
    canvasDebug: {
      wireframe: false,
      textures: true,
      grid: true,
      axes: true,
      bounds: false,
      displayShadows: true,
      displayFog: false,
      useAreaLighting: false,
      ceilingMeshes: false,
      hiddenMeshes: false,
      showNonRenderMeshes: false,
      showVtPhysicalAnchor: false,
      statusMap: "off",
      textureCompression: "uastc",
      gizmoMode: "translate",
      snapGrid: true,
      snapAngle: true,
      snapHeight: true,
      lockedKinds: {
        creatures: false,
        doors: false,
        encounters: false,
        items: false,
        placeables: false,
        sounds: false,
        stores: false,
        triggers: false,
        waypoints: false
      },
      isolateKind: "none",
      chunkBounds: false,
      objectLabels: false,
      perfHud: true,
      walkmeshOverlay: false,
      collisionOverlay: false,
      controlsHint: true,
      runtimeHud: true
    },
    lastCommand: null
  };
}

export function applyToolbarAction(
  current: WorkspaceToolbarState,
  actionKey: ToolbarActionKey
): WorkspaceToolbarState {
  if (actionKey === "select_terrain") {
    return { ...current, selectionMode: "terrain", lastCommand: actionKey };
  }

  if (actionKey === "select_object") {
    return { ...current, selectionMode: "object", lastCommand: actionKey };
  }

  if (actionKey === "scope_all") {
    return {
      ...current,
      selectionMode: "object",
      selectionScope: "all",
      lastCommand: actionKey
    };
  }

  if (actionKey === "scope_creatures") {
    return {
      ...current,
      selectionMode: "object",
      selectionScope: "creatures",
      lastCommand: actionKey
    };
  }

  if (actionKey === "scope_doors") {
    return {
      ...current,
      selectionMode: "object",
      selectionScope: "doors",
      lastCommand: actionKey
    };
  }

  if (actionKey === "scope_items") {
    return {
      ...current,
      selectionMode: "object",
      selectionScope: "items",
      lastCommand: actionKey
    };
  }

  if (actionKey === "scope_placeables") {
    return {
      ...current,
      selectionMode: "object",
      selectionScope: "placeables",
      lastCommand: actionKey
    };
  }

  if (actionKey === "scope_sounds") {
    return {
      ...current,
      selectionMode: "object",
      selectionScope: "sounds",
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_all") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        creatures: true,
        doors: true,
        encounters: false,
        items: true,
        placeables: true,
        sounds: true,
        stores: false,
        triggers: false,
        waypoints: false
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_none") {
    return {
      ...current,
      visibility: {
        creatures: false,
        doors: false,
        encounters: false,
        items: false,
        merchants: false,
        placeables: false,
        sounds: false,
        stores: false,
        triggers: false,
        waypoints: false,
        start_location: false
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_creatures") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        creatures: !current.visibility.creatures
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_doors") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        doors: !current.visibility.doors
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_items") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        items: !current.visibility.items
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_placeables") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        placeables: !current.visibility.placeables
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_sounds") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        sounds: !current.visibility.sounds
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_wireframe") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        wireframe: !current.canvasDebug.wireframe
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_textures") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        textures: !current.canvasDebug.textures
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_grid") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        grid: !current.canvasDebug.grid
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_axes") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        axes: !current.canvasDebug.axes
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_bounds") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        bounds: !current.canvasDebug.bounds
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_encounters") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        encounters: !current.visibility.encounters
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_merchants") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        merchants: !current.visibility.merchants,
        stores: !current.visibility.stores
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_triggers") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        triggers: !current.visibility.triggers
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_waypoints") {
    return {
      ...current,
      visibility: {
        ...current.visibility,
        waypoints: !current.visibility.waypoints
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "display_shadows") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        displayShadows: !current.canvasDebug.displayShadows
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "display_fog") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        displayFog: !current.canvasDebug.displayFog
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "use_area_lighting") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        useAreaLighting: !current.canvasDebug.useAreaLighting
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_ceiling_meshes") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        ceilingMeshes: !current.canvasDebug.ceilingMeshes
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_hidden_meshes") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        hiddenMeshes: !current.canvasDebug.hiddenMeshes
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_show_non_render_meshes") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        showNonRenderMeshes: !current.canvasDebug.showNonRenderMeshes
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_show_vt_physical_anchor") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        showVtPhysicalAnchor: !current.canvasDebug.showVtPhysicalAnchor
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_status_map_off") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        statusMap: "off"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_status_map_placeables") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        statusMap: "placeables"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_status_map_doors") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        statusMap: "doors"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_status_map_creatures") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        statusMap: "creatures"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_status_map_items") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        statusMap: "items"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_status_map_sounds") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        statusMap: "sounds"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_status_map_all") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        statusMap: "all"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_texture_compression_none") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        textureCompression: "none"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_texture_compression_etc1s") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        textureCompression: "etc1s"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_texture_compression_uastc") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        textureCompression: "uastc"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "canvas_gizmo_translate") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        gizmoMode: "translate"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "canvas_gizmo_rotate") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        gizmoMode: "rotate"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "canvas_gizmo_scale") {
    return {
      ...current,
      lastCommand: actionKey
    };
  }

  if (actionKey === "canvas_gizmo_vt_rotate") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        gizmoMode: "vt_rotate"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "canvas_gizmo_vt_translate") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        gizmoMode: "vt_translate"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "canvas_gizmo_vt_scale") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        gizmoMode: "vt_scale"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "snap_grid_toggle") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        snapGrid: !current.canvasDebug.snapGrid
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "snap_angle_toggle") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        snapAngle: !current.canvasDebug.snapAngle
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "snap_height_toggle") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        snapHeight: !current.canvasDebug.snapHeight
      },
      lastCommand: actionKey
    };
  }

  if (
    actionKey === "lock_creatures" ||
    actionKey === "lock_doors" ||
    actionKey === "lock_items" ||
    actionKey === "lock_placeables" ||
    actionKey === "lock_sounds"
  ) {
    const key = actionKey.replace("lock_", "") as keyof WorkspaceToolbarState["canvasDebug"]["lockedKinds"];
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        lockedKinds: {
          ...current.canvasDebug.lockedKinds,
          [key]: !current.canvasDebug.lockedKinds[key]
        }
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "unlock_all_layers") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        lockedKinds: {
          creatures: false,
          doors: false,
          encounters: false,
          items: false,
          placeables: false,
          sounds: false,
          stores: false,
          triggers: false,
          waypoints: false
        }
      },
      lastCommand: actionKey
    };
  }

  if (
    actionKey === "isolate_creatures" ||
    actionKey === "isolate_doors" ||
    actionKey === "isolate_items" ||
    actionKey === "isolate_placeables" ||
    actionKey === "isolate_sounds"
  ) {
    const target = actionKey.replace("isolate_", "") as WorkspaceToolbarState["canvasDebug"]["isolateKind"];
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        isolateKind: current.canvasDebug.isolateKind === target ? "none" : target
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "clear_isolation") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        isolateKind: "none"
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_chunks") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        chunkBounds: !current.canvasDebug.chunkBounds
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_object_labels") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        objectLabels: !current.canvasDebug.objectLabels
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_perf_hud") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        perfHud: !current.canvasDebug.perfHud
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_walkmesh_overlay") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        walkmeshOverlay: !current.canvasDebug.walkmeshOverlay
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_collision_overlay") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        collisionOverlay: !current.canvasDebug.collisionOverlay
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_controls_hint") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        controlsHint: !current.canvasDebug.controlsHint
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "debug_runtime_hud") {
    return {
      ...current,
      canvasDebug: {
        ...current.canvasDebug,
        runtimeHud: !current.canvasDebug.runtimeHud
      },
      lastCommand: actionKey
    };
  }

  if (toggleKeys.includes(actionKey)) {
    return { ...current, lastCommand: actionKey };
  }

  return { ...current, lastCommand: actionKey };
}
