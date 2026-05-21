import type { UserRole } from "../auth/contracts";

export type ToolbarStatus = "mvp" | "post_mvp" | "pending_estimate";

export type SelectionMode = "terrain" | "object";
export type SelectionScope =
  | "all"
  | "creatures"
  | "doors"
  | "items"
  | "placeables"
  | "sounds";
export type VisibilityFilterKey =
  | "creatures"
  | "doors"
  | "encounters"
  | "items"
  | "merchants"
  | "placeables"
  | "sounds"
  | "triggers"
  | "waypoints"
  | "start_location";

export type ToolbarActionKey =
  | "save_local_draft"
  | "undo"
  | "redo"
  | "go_to_start_location"
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
  lastCommand: ToolbarActionKey | null;
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
      action("show_none", "Show None", "post_mvp"),
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
      action("display_shadows", "Display Shadows", "pending_estimate"),
      action("display_fog", "Display Fog", "pending_estimate"),
      action("use_area_lighting", "Use Area Lighting", "pending_estimate"),
      action("play_ambient_sound", "Play Ambient Sound", "pending_estimate"),
      action("play_ambient_music", "Play Ambient Music In Area", "pending_estimate"),
      action(
        "play_placed_sound_object",
        "Play Placed Sound Object In Area",
        "pending_estimate"
      ),
      action("show_preview_window", "Show Preview Window", "pending_estimate")
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
    actions: [action("reorient_camera", "Reorient Camera", "mvp")]
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
      action("show_creatures", "Show Creatures", "mvp"),
      action("show_doors", "Show Doors", "mvp"),
      action("show_items", "Show Items", "mvp"),
      action("show_placeables", "Show Placeables", "mvp"),
      action("show_sounds", "Show Sounds", "mvp")
    ]
  }
];

const viewerGroups: ToolbarGroup[] = [
  {
    key: "camera",
    label: "Camera",
    actions: [action("reorient_camera", "Reorient Camera", "mvp")]
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
      action("show_creatures", "Show Creatures", "mvp"),
      action("show_doors", "Show Doors", "mvp"),
      action("show_items", "Show Items", "mvp"),
      action("show_placeables", "Show Placeables", "mvp"),
      action("show_sounds", "Show Sounds", "mvp")
    ]
  }
];

const groupsByRole: Record<UserRole, ToolbarGroup[]> = {
  viewer: viewerGroups,
  builder: builderAndAdminGroups,
  dm: dmGroups,
  admin: builderAndAdminGroups
};

const quickActionsByRole: Record<UserRole, ToolbarAction[]> = {
  viewer: [],
  builder: [action("undo", "Undo", "mvp"), action("redo", "Redo", "mvp")],
  dm: [],
  admin: [action("undo", "Undo", "mvp"), action("redo", "Redo", "mvp")]
};

const commonShortcuts: KeyboardShortcut[] = [
  { key: "?", description: "Open keyboard shortcuts." },
  { key: "Esc", description: "Close open popup panels." }
];

const roleSpecificShortcuts: Record<UserRole, KeyboardShortcut[]> = {
  viewer: [{ key: "Ctrl/Cmd + R", description: "Reorient camera." }],
  builder: [
    { key: "Ctrl/Cmd + Z", description: "Undo." },
    { key: "Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z", description: "Redo." },
    { key: "Ctrl/Cmd + S", description: "Save local draft." }
  ],
  dm: [{ key: "Ctrl/Cmd + R", description: "Reorient camera." }],
  admin: [
    { key: "Ctrl/Cmd + Z", description: "Undo." },
    { key: "Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z", description: "Redo." },
    { key: "Ctrl/Cmd + S", description: "Save local draft." }
  ]
};

export function getRoleToolbarGroups(role: UserRole): ToolbarGroup[] {
  return groupsByRole[role];
}

export function getRoleQuickActions(role: UserRole): ToolbarAction[] {
  return quickActionsByRole[role];
}

export function getRoleKeyboardShortcuts(role: UserRole): KeyboardShortcut[] {
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
      triggers: false,
      waypoints: false,
      start_location: false
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
        items: true,
        placeables: true,
        sounds: true
      },
      lastCommand: actionKey
    };
  }

  if (actionKey === "show_none") {
    return { ...current, lastCommand: actionKey };
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

  if (toggleKeys.includes(actionKey)) {
    return { ...current, lastCommand: actionKey };
  }

  return { ...current, lastCommand: actionKey };
}
