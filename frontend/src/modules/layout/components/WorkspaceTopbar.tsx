import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  KeyboardShortcut,
  WorkspaceChromeFacade,
  WorkspaceUserRole,
  ToolbarActionKey,
  ToolbarAction,
  ToolbarGroup,
  WorkspaceToolbarState
} from "../application/workspaceChromeFacade";
import {
  LAYOUT_THEME_OPTIONS,
  type LayoutThemeId,
  type SelectionBoxMode,
  type WorkspaceOptionSettings
} from "../application/layoutPreferencesFacade";
import type { WorkspaceTopbarActionStateFacade } from "../application/workspaceTopbarActionStateFacade";
import type { WorkspaceModeId } from "../workspaceModes";
import type {
  ClientAssetCacheDiagnosticSink,
  ClientAssetCachePort,
} from "../../shared/application/clientAssetCachePort";
import { ClientAssetCacheControl } from "./ClientAssetCacheControl";

interface WorkspaceTopbarProps {
  isAuthenticated: boolean;
  role?: WorkspaceUserRole;
  workspaceChromeFacade: WorkspaceChromeFacade;
  workspaceTopbarActionStateFacade: WorkspaceTopbarActionStateFacade;
  workspaceModeId?: WorkspaceModeId;
  toolbarState: WorkspaceToolbarState;
  layoutTheme: LayoutThemeId;
  onLayoutThemeChange: (theme: LayoutThemeId) => void;
  workspaceOptions: WorkspaceOptionSettings;
  onWorkspaceOptionsChange: (patch: Partial<WorkspaceOptionSettings>) => void;
  clientAssetCachePort?: ClientAssetCachePort;
  onClientAssetCacheDiagnostic?: ClientAssetCacheDiagnosticSink;
  onAction: (actionKey: ToolbarActionKey) => void;
  showDebugPanel: boolean;
  onToggleDebug: () => void;
  isViewportFullscreen?: boolean;
  onToggleViewportFullscreen?: () => void;
  onOpenRuntimeSettings?: () => void;
  onSignOut: () => void;
}

type NumericWorkspaceOptionKey =
  | "snapGridStep"
  | "snapAngleStepDeg"
  | "snapHeightStep"
  | "runtimeMaxLights"
  | "cameraRotateSpeed"
  | "cameraZoomSpeed"
  | "cameraPanSpeed"
  | "cameraDampingFactor";

function statusLabel(status: "mvp" | "post_mvp" | "pending_estimate"): string {
  if (status === "mvp") {
    return "MVP";
  }
  if (status === "post_mvp") {
    return "Post-MVP";
  }
  return "Pending";
}

function resolveCanvasActionTitle(action: ToolbarAction): string {
  const status = statusLabel(action.status);
  if (
    action.key === "canvas_gizmo_scale" &&
    !action.supported &&
    action.status === "post_mvp"
  ) {
    return `${action.label} (${status}, Reserved)`;
  }
  return `${action.label} (${status})`;
}

function resolveInitialGroup(groups: ToolbarGroup[]): string | null {
  if (!groups.length) {
    return null;
  }
  return groups[0].key;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return target.isContentEditable;
}

const CANVAS_STATUS_OPTIONS: Array<{
  value: WorkspaceToolbarState["canvasDebug"]["statusMap"];
  label: string;
  actionKey: ToolbarActionKey;
}> = [
  { value: "off", label: "Off", actionKey: "debug_status_map_off" },
  { value: "placeables", label: "Placeables", actionKey: "debug_status_map_placeables" },
  { value: "doors", label: "Doors", actionKey: "debug_status_map_doors" },
  { value: "creatures", label: "Creatures", actionKey: "debug_status_map_creatures" },
  { value: "items", label: "Items", actionKey: "debug_status_map_items" },
  { value: "sounds", label: "Sounds", actionKey: "debug_status_map_sounds" },
  { value: "all", label: "All", actionKey: "debug_status_map_all" }
];

const CANVAS_TEXTURE_OPTIONS: Array<{
  value: WorkspaceToolbarState["canvasDebug"]["textureCompression"];
  label: string;
  actionKey: ToolbarActionKey;
}> = [
  { value: "none", label: "None", actionKey: "debug_texture_compression_none" },
  { value: "etc1s", label: "ETC1S", actionKey: "debug_texture_compression_etc1s" },
  { value: "uastc", label: "UASTC", actionKey: "debug_texture_compression_uastc" }
];

const EMPTY_TOOLBAR_GROUPS: ToolbarGroup[] = [];

function filterToolbarGroupsForWorkspaceMode(
  groups: ToolbarGroup[],
  isAreasMode: boolean
): ToolbarGroup[] {
  return groups
    .map((group) => {
      const actions = group.actions.filter((action) => {
        if (action.key === "fit_area_view" || action.key === "top_down_oracle_view") {
          return isAreasMode;
        }
        if (action.key === "reorient_camera") {
          return !isAreasMode;
        }
        return true;
      });
      return { ...group, actions };
    })
    .filter((group) => group.actions.length > 0);
}

function filterQuickActionsForWorkspaceMode(
  actions: ToolbarAction[],
  isAreasMode: boolean
): ToolbarAction[] {
  return actions.filter(
    (action) =>
      (action.key !== "fit_area_view" && action.key !== "top_down_oracle_view") ||
      isAreasMode
  );
}

export function WorkspaceTopbar({
  isAuthenticated,
  role,
  workspaceChromeFacade,
  workspaceTopbarActionStateFacade,
  workspaceModeId,
  toolbarState,
  layoutTheme,
  onLayoutThemeChange,
  workspaceOptions,
  onWorkspaceOptionsChange,
  clientAssetCachePort,
  onClientAssetCacheDiagnostic,
  onAction,
  showDebugPanel,
  onToggleDebug,
  isViewportFullscreen = false,
  onToggleViewportFullscreen,
  onOpenRuntimeSettings,
  onSignOut
}: WorkspaceTopbarProps) {
  const isAreasMode = workspaceModeId === undefined || workspaceModeId === "areas_mode";
  const isPlaceablesMode = workspaceModeId === "placeables_mode";
  const isCreaturesMode = workspaceModeId === "creatures_mode";
  const isFocusedPreviewMode = isPlaceablesMode || isCreaturesMode;
  const roleToolbarGroups =
    isAuthenticated && role
      ? workspaceChromeFacade.getRoleToolbarGroups(role)
      : EMPTY_TOOLBAR_GROUPS;
  const sectionGroups = useMemo(
    () =>
      isFocusedPreviewMode
        ? EMPTY_TOOLBAR_GROUPS
        : filterToolbarGroupsForWorkspaceMode(roleToolbarGroups, isAreasMode),
    [isAreasMode, isFocusedPreviewMode, roleToolbarGroups]
  );
  const roleQuickActions =
    isAuthenticated && role ? workspaceChromeFacade.getRoleQuickActions(role) : [];
  const quickActions = useMemo(
    () => filterQuickActionsForWorkspaceMode(roleQuickActions, isAreasMode),
    [isAreasMode, roleQuickActions]
  );
  const baseShortcuts =
    isAuthenticated && role ? workspaceChromeFacade.getRoleKeyboardShortcuts(role) : [];
  const shortcuts = useMemo(() => {
    if (!isAuthenticated || !role) {
      return [];
    }

    const supportedActionKeys = new Set(
      sectionGroups.flatMap((group) =>
        group.actions.filter((action) => action.supported).map((action) => action.key)
      )
    );
    const viewportShortcuts: KeyboardShortcut[] = [
      { key: "MMB", description: "Rotate camera." },
      { key: "Ctrl + RMB", description: "Pan camera." },
      { key: "Wheel", description: "Zoom camera." }
    ];
    if (isFocusedPreviewMode) {
      return [
        ...baseShortcuts.filter((shortcut) => shortcut.key === "?" || shortcut.key === "Esc"),
        ...viewportShortcuts
      ];
    }

    const hasGizmoVtRotate = supportedActionKeys.has("canvas_gizmo_vt_rotate");
    const hasGizmoVtTranslate = supportedActionKeys.has("canvas_gizmo_vt_translate");
    const hasGizmoVtScale = supportedActionKeys.has("canvas_gizmo_vt_scale");

    const editorViewportShortcuts: KeyboardShortcut[] = [
      { key: "MMB", description: "Rotate camera." },
      { key: "Ctrl + RMB", description: "Pan camera." },
      { key: "RMB on object", description: "Open object context menu." },
      { key: "Wheel", description: "Zoom camera." }
    ];
    const canvasWorkflowShortcuts: KeyboardShortcut[] = [
      { key: "Canvas menu", description: "Gizmo / snap / lock / isolate / debug toggles." },
      { key: "1", description: "Switch gizmo to World Move mode." },
      { key: "2", description: "Switch gizmo to World Bearing mode." },
      { key: "Arrow keys / Shift + Arrow", description: "Move selected object(s) in scene." },
      { key: "Ctrl/Cmd + C", description: "Copy selected object(s)." },
      { key: "Ctrl/Cmd + X", description: "Cut selected object(s)." },
      { key: "Ctrl/Cmd + V", description: "Paste copied or cut object(s)." },
      { key: "Del / Backspace", description: "Delete selected objects (unlocked layers only)." }
    ];
    const insertionIndex = 3;
    if (hasGizmoVtRotate) {
      canvasWorkflowShortcuts.splice(insertionIndex, 0, {
        key: "3",
        description: "Switch gizmo to VT Rotate mode (XYZ)."
      });
    }
    if (hasGizmoVtTranslate) {
      canvasWorkflowShortcuts.splice(
        insertionIndex + (hasGizmoVtRotate ? 1 : 0),
        0,
        {
          key: "4",
          description: "Switch gizmo to VT Offset mode (XYZ)."
        }
      );
    }
    if (hasGizmoVtScale) {
      canvasWorkflowShortcuts.splice(
        insertionIndex + (hasGizmoVtRotate ? 1 : 0) + (hasGizmoVtTranslate ? 1 : 0),
        0,
        {
          key: "5",
          description: "Switch gizmo to VT Scale mode."
        }
      );
    }

    return [
      ...baseShortcuts,
      ...editorViewportShortcuts,
      ...canvasWorkflowShortcuts
    ];
  }, [baseShortcuts, isAuthenticated, isFocusedPreviewMode, role, sectionGroups]);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(
    resolveInitialGroup(sectionGroups)
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isQuickOptionsOpen, setIsQuickOptionsOpen] = useState(false);
  const [isLayoutOptionsExpanded, setIsLayoutOptionsExpanded] = useState(true);
  const topbarCenterRef = useRef<HTMLDivElement | null>(null);
  const shortcutsDialogRef = useRef<HTMLDivElement | null>(null);
  const optionsDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveGroupKey(resolveInitialGroup(sectionGroups));
    setIsDrawerOpen(false);
    setIsShortcutsOpen(false);
    setIsQuickOptionsOpen(false);
    setIsLayoutOptionsExpanded(true);
  }, [role, isAuthenticated, isFocusedPreviewMode, sectionGroups.length]);

  const activeGroup = useMemo(() => {
    if (!activeGroupKey) {
      return sectionGroups[0] ?? null;
    }
    return sectionGroups.find((group) => group.key === activeGroupKey) ?? sectionGroups[0] ?? null;
  }, [activeGroupKey, sectionGroups]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const handleOutsidePointerDown = (event: MouseEvent) => {
      const current = topbarCenterRef.current;
      if (!current) {
        return;
      }
      if (!current.contains(event.target as Node)) {
        setIsDrawerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsidePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleOutsidePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isAuthenticated || !role) {
      return;
    }

    const hasUndo = quickActions.some((action) => action.key === "undo");
    const hasRedo = quickActions.some((action) => action.key === "redo");
    const supportedActionKeys = new Set(
      sectionGroups.flatMap((group) =>
        group.actions.filter((action) => action.supported).map((action) => action.key)
      )
    );
    const hasGizmoTranslate = supportedActionKeys.has("canvas_gizmo_translate");
    const hasGizmoRotate = supportedActionKeys.has("canvas_gizmo_rotate");
    const hasGizmoVtRotate = supportedActionKeys.has("canvas_gizmo_vt_rotate");
    const hasGizmoVtTranslate = supportedActionKeys.has("canvas_gizmo_vt_translate");
    const hasGizmoVtScale = supportedActionKeys.has("canvas_gizmo_vt_scale");
    const hasFitAreaView =
      supportedActionKeys.has("fit_area_view") ||
      quickActions.some(
        (action) => action.key === "fit_area_view" && action.supported
      );
    const hasReorientCamera = supportedActionKeys.has("reorient_camera");

    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const isMeta = event.ctrlKey || event.metaKey;
      const lowerKey = event.key.toLowerCase();

      if (event.key === "?" && !isMeta && !event.altKey) {
        event.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setIsShortcutsOpen(false);
        setIsQuickOptionsOpen(false);
        return;
      }

      const isDigit1 =
        event.key === "1" || event.code === "Digit1" || event.code === "Numpad1";
      if (!isMeta && !event.altKey && !event.shiftKey && isDigit1 && hasGizmoTranslate) {
        event.preventDefault();
        onAction("canvas_gizmo_translate");
        return;
      }

      const isDigit2 =
        event.key === "2" || event.code === "Digit2" || event.code === "Numpad2";
      if (!isMeta && !event.altKey && !event.shiftKey && isDigit2 && hasGizmoRotate) {
        event.preventDefault();
        onAction("canvas_gizmo_rotate");
        return;
      }

      const isDigit3 =
        event.key === "3" || event.code === "Digit3" || event.code === "Numpad3";
      if (!isMeta && !event.altKey && !event.shiftKey && isDigit3 && hasGizmoVtRotate) {
        event.preventDefault();
        onAction("canvas_gizmo_vt_rotate");
        return;
      }

      const isDigit4 =
        event.key === "4" || event.code === "Digit4" || event.code === "Numpad4";
      if (!isMeta && !event.altKey && !event.shiftKey && isDigit4 && hasGizmoVtTranslate) {
        event.preventDefault();
        onAction("canvas_gizmo_vt_translate");
        return;
      }

      const isDigit5 =
        event.key === "5" || event.code === "Digit5" || event.code === "Numpad5";
      if (!isMeta && !event.altKey && !event.shiftKey && isDigit5 && hasGizmoVtScale) {
        event.preventDefault();
        onAction("canvas_gizmo_vt_scale");
        return;
      }

      if (isMeta && lowerKey === "z" && !event.shiftKey && hasUndo) {
        event.preventDefault();
        onAction("undo");
        return;
      }

      if (
        hasRedo &&
        isMeta &&
        ((lowerKey === "y" && !event.shiftKey) || (lowerKey === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        onAction("redo");
        return;
      }

      if (isMeta && lowerKey === "r" && (hasFitAreaView || hasReorientCamera)) {
        event.preventDefault();
        onAction(hasFitAreaView ? "fit_area_view" : "reorient_camera");
        return;
      }

      if (isMeta && lowerKey === "s") {
        const saveAction = sectionGroups
          .flatMap((group) => group.actions)
          .find((action) => action.key === "save_local_draft" && action.supported);
        if (saveAction) {
          event.preventDefault();
          onAction("save_local_draft");
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [isAuthenticated, onAction, quickActions, role, sectionGroups]);

  useEffect(() => {
    if (!isShortcutsOpen) {
      return;
    }

    shortcutsDialogRef.current?.focus();
  }, [isShortcutsOpen]);

  useEffect(() => {
    if (!isQuickOptionsOpen) {
      return;
    }

    optionsDialogRef.current?.focus();
  }, [isQuickOptionsOpen]);

  const handleGroupToggle = (groupKey: string) => {
    if (activeGroupKey === groupKey) {
      setIsDrawerOpen((current) => !current);
      return;
    }
    setActiveGroupKey(groupKey);
    setIsDrawerOpen(true);
  };

  const updateNumberOption = useCallback(
    (key: NumericWorkspaceOptionKey, rawValue: string) => {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed)) {
        return;
      }
      onWorkspaceOptionsChange({ [key]: parsed } as Partial<WorkspaceOptionSettings>);
    },
    [onWorkspaceOptionsChange]
  );

  const canvasActionMap = useMemo(() => {
    if (!activeGroup || activeGroup.key !== "canvas") {
      return null;
    }
    return new Map(activeGroup.actions.map((action) => [action.key, action]));
  }, [activeGroup]);

  const renderCanvasActionButton = useCallback(
    (actionKey: ToolbarActionKey, shortLabel?: string) => {
      const action = canvasActionMap?.get(actionKey);
      if (!action) {
        return null;
      }

      return (
        <button
          className={`topbar-nav-btn topbar-nav-btn-compact ${
            workspaceTopbarActionStateFacade.isActionActive(action.key, toolbarState)
              ? "is-active"
              : ""
          }`}
          type="button"
          key={action.key}
          onClick={() => onAction(action.key)}
          disabled={!action.supported}
          title={resolveCanvasActionTitle(action)}
        >
          <span>{shortLabel ?? action.label}</span>
        </button>
      );
    },
    [canvasActionMap, onAction, toolbarState]
  );

  const renderCanvasDrawer = () => (
    <section className="canvas-drawer-layout" aria-label="canvas compact commands">
      <section className="canvas-drawer-group">
        <h3>Transform</h3>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("canvas_gizmo_translate", "World Move (1)")}
          {renderCanvasActionButton("canvas_gizmo_rotate", "World Bearing (2)")}
          {renderCanvasActionButton("canvas_gizmo_vt_rotate", "VT Rotate (3)")}
          {renderCanvasActionButton("canvas_gizmo_vt_translate", "VT Offset (4)")}
          {renderCanvasActionButton("canvas_gizmo_vt_scale", "VT Scale (5)")}
          {renderCanvasActionButton("snap_grid_toggle", "Snap Grid")}
          {renderCanvasActionButton("snap_angle_toggle", "Snap Angle")}
          {renderCanvasActionButton("snap_height_toggle", "Snap Height")}
        </div>
      </section>

      <section className="canvas-drawer-group">
        <h3>Layers</h3>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("lock_placeables", "Lock PLC")}
          {renderCanvasActionButton("lock_creatures", "Lock CRT")}
          {renderCanvasActionButton("lock_doors", "Lock DOR")}
          {renderCanvasActionButton("lock_items", "Lock ITM")}
          {renderCanvasActionButton("lock_sounds", "Lock SND")}
          {renderCanvasActionButton("unlock_all_layers", "Unlock All")}
        </div>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("isolate_placeables", "Iso PLC")}
          {renderCanvasActionButton("isolate_creatures", "Iso CRT")}
          {renderCanvasActionButton("isolate_doors", "Iso DOR")}
          {renderCanvasActionButton("isolate_items", "Iso ITM")}
          {renderCanvasActionButton("isolate_sounds", "Iso SND")}
          {renderCanvasActionButton("clear_isolation", "Clear Iso")}
        </div>
      </section>

      <section className="canvas-drawer-group">
        <h3>Selection</h3>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("select_same_resref", "Same ResRef")}
          {renderCanvasActionButton("select_invert", "Invert")}
          {renderCanvasActionButton("select_radius", "In Radius")}
          {renderCanvasActionButton("copy_selected_objects", "Copy Sel")}
          {renderCanvasActionButton("delete_selected_objects", "Delete Sel")}
          {renderCanvasActionButton("fit_area_view", "Fit Area")}
          {renderCanvasActionButton("camera_bookmark_save_1", "Save #1")}
          {renderCanvasActionButton("camera_bookmark_load_1", "Load #1")}
        </div>
      </section>

      <section className="canvas-drawer-group">
        <h3>Display</h3>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("debug_wireframe", "Wireframe")}
          {renderCanvasActionButton("debug_textures", "Textures")}
          {renderCanvasActionButton("debug_grid", "Grid")}
          {renderCanvasActionButton("debug_axes", "Axes")}
          {renderCanvasActionButton("debug_bounds", "Bounds")}
          {renderCanvasActionButton("debug_ceiling_meshes", "Ceiling")}
          {renderCanvasActionButton("debug_hidden_meshes", "Hidden")}
          {renderCanvasActionButton("debug_show_non_render_meshes", "Non-render")}
          {renderCanvasActionButton("debug_show_vt_physical_anchor", "VT Physical")}
        </div>
      </section>

      <section className="canvas-drawer-group canvas-drawer-group-inline">
        <h3>Status Map</h3>
        <select
          className="topbar-nav-select"
          aria-label="Status map"
          value={toolbarState.canvasDebug.statusMap}
          onChange={(event) => {
            const option = CANVAS_STATUS_OPTIONS.find(
              (entry) => entry.value === event.target.value
            );
            if (option) {
              onAction(option.actionKey);
            }
          }}
        >
          {CANVAS_STATUS_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </section>

      <section className="canvas-drawer-group canvas-drawer-group-inline">
        <h3>Texture Mode</h3>
        <select
          className="topbar-nav-select"
          aria-label="Texture mode"
          value={toolbarState.canvasDebug.textureCompression}
          onChange={(event) => {
            const option = CANVAS_TEXTURE_OPTIONS.find(
              (entry) => entry.value === event.target.value
            );
            if (option) {
              onAction(option.actionKey);
            }
          }}
        >
          {CANVAS_TEXTURE_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </section>

      <details className="canvas-drawer-advanced">
        <summary>Advanced Debug</summary>
        <div className="topbar-nav-buttons topbar-nav-buttons-compact">
          {renderCanvasActionButton("debug_chunks", "Chunk Bounds")}
          {renderCanvasActionButton("debug_object_labels", "Object Labels")}
          {renderCanvasActionButton("debug_perf_hud", "Perf HUD")}
          {renderCanvasActionButton("debug_walkmesh_overlay", "Walkmesh")}
          {renderCanvasActionButton("debug_collision_overlay", "Collision")}
          {renderCanvasActionButton("debug_controls_hint", "Controls Hint")}
          {renderCanvasActionButton("debug_runtime_hud", "Runtime Popup")}
          {renderCanvasActionButton("debug_export_status_report", "Export Report")}
        </div>
      </details>
    </section>
  );
  const viewportFullscreenToggleButton =
    isAuthenticated && onToggleViewportFullscreen ? (
      <button
        type="button"
        className={`topbar-btn ${isViewportFullscreen ? "is-active" : ""}`}
        onClick={onToggleViewportFullscreen}
        aria-label={
          isViewportFullscreen
            ? "Exit viewport fullscreen"
            : "Open viewport fullscreen"
        }
        aria-pressed={isViewportFullscreen}
        title={
          isViewportFullscreen
            ? "Exit viewport fullscreen"
            : "Open viewport fullscreen"
        }
      >
        {isViewportFullscreen ? "Exit View" : "Full View"}
      </button>
    ) : null;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <p className="topbar-brand">Aurora Web</p>
        {quickActions.length || viewportFullscreenToggleButton ? (
          <div className="topbar-quick-actions" aria-label="quick actions">
            {quickActions.map((action: ToolbarAction) => (
              <button
                key={action.key}
                type="button"
                className={`topbar-btn ${
                  workspaceTopbarActionStateFacade.isActionActive(action.key, toolbarState)
                    ? "is-active"
                    : ""
                }`}
                onClick={() => onAction(action.key)}
                title={`${action.label} (${statusLabel(action.status)})`}
              >
                {action.label}
              </button>
            ))}
            {viewportFullscreenToggleButton}
          </div>
        ) : null}
      </div>

      {sectionGroups.length > 0 ? (
        <div className="topbar-center-wrap" ref={topbarCenterRef}>
          <span className="topbar-major-separator" aria-hidden="true" />
          <div className="topbar-center">
          <nav className="topbar-nav" aria-label="workspace sections">
            {sectionGroups.map((group) => (
              <span key={group.key} className="topbar-nav-entry">
                {group.key === "canvas" ? (
                  <span className="topbar-nav-separator" aria-hidden="true" />
                ) : null}
                <button
                  type="button"
                  className={`topbar-group-tab ${activeGroup?.key === group.key ? "is-active" : ""}`}
                  onClick={() => handleGroupToggle(group.key)}
                  onMouseEnter={() => {
                    if (isDrawerOpen) {
                      setActiveGroupKey(group.key);
                    }
                  }}
                  aria-expanded={activeGroup?.key === group.key && isDrawerOpen}
                  aria-controls="workspace-toolbar-drawer"
                >
                  {group.label}
                </button>
              </span>
            ))}
          </nav>
          {activeGroup && isDrawerOpen ? (
            <section
              className="topbar-drawer"
              aria-label={`${activeGroup.label} commands`}
              id="workspace-toolbar-drawer"
            >
              <header className="topbar-drawer-header">
                <span>{activeGroup.label} Commands</span>
              </header>
              {activeGroup.key === "canvas" ? (
                renderCanvasDrawer()
              ) : (
                <div className="topbar-nav-buttons">
                  {activeGroup.actions.map((action) => (
                    <button
                      className={`topbar-nav-btn ${
                        workspaceTopbarActionStateFacade.isActionActive(action.key, toolbarState)
                          ? "is-active"
                          : ""
                      }`}
                      type="button"
                      key={action.key}
                      onClick={() => onAction(action.key)}
                      disabled={!action.supported}
                      title={`${action.label} (${statusLabel(action.status)})`}
                    >
                      <span>{action.label}</span>
                      <span className={`toolbar-status toolbar-status-${action.status}`}>
                        {statusLabel(action.status)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : null}
          </div>
        </div>
      ) : null}

      <div className="topbar-actions" data-testid="topbar-actions">
        {isAuthenticated ? (
          <>
            <button
              className="topbar-btn"
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              aria-label="Open keyboard shortcuts"
              title="Keyboard shortcuts"
            >
              Shortcuts
            </button>
            <button
              className="topbar-btn"
              type="button"
              onClick={onToggleDebug}
              aria-label={showDebugPanel ? "Hide debug panel" : "Show debug panel"}
              aria-pressed={showDebugPanel}
              title={showDebugPanel ? "Hide debug panel" : "Show debug panel"}
            >
              {showDebugPanel ? "Hide Debug" : "Debug"}
            </button>
            <button
              className="topbar-btn"
              type="button"
              aria-label="Open quick options"
              aria-haspopup="dialog"
              aria-expanded={isQuickOptionsOpen}
              onClick={() => setIsQuickOptionsOpen((current) => !current)}
              title="Options"
            >
              Options
            </button>
            {role === "admin" && onOpenRuntimeSettings ? (
              <button
                className="topbar-btn"
                type="button"
                onClick={onOpenRuntimeSettings}
              >
                Server paths
              </button>
            ) : null}
            <button className="topbar-btn" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : null}
      </div>

      {isQuickOptionsOpen ? (
        <section
          className="options-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsQuickOptionsOpen(false);
            }
          }}
        >
          <article
            className="options-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Quick options"
            tabIndex={-1}
            ref={optionsDialogRef}
          >
            <header className="options-dialog-header">
              <h2>Options</h2>
              <button
                type="button"
                className="topbar-btn"
                onClick={() => setIsQuickOptionsOpen(false)}
              >
                Close
              </button>
            </header>

            <details
              className="topbar-options-section"
              open={isLayoutOptionsExpanded}
              role="group"
              aria-label="Layout"
              onToggle={(event) =>
                setIsLayoutOptionsExpanded((event.currentTarget as HTMLDetailsElement).open)
              }
            >
              <summary className="topbar-options-summary">
                <span>Layout</span>
                <span className="topbar-options-summary-right">
                  <span className="topbar-options-summary-state">
                    {isLayoutOptionsExpanded ? "Expanded" : "Collapsed"}
                  </span>
                  <span
                    className={`topbar-options-chevron ${isLayoutOptionsExpanded ? "is-open" : ""}`}
                    aria-hidden="true"
                  >
                    v
                  </span>
                </span>
              </summary>
              <div className="topbar-options-content">
                <label className="topbar-options-label" htmlFor="app-style-select">
                  App style
                </label>
                <select
                  id="app-style-select"
                  className="topbar-options-select"
                  value={layoutTheme}
                  onChange={(event) => onLayoutThemeChange(event.target.value as LayoutThemeId)}
                >
                  {LAYOUT_THEME_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </details>

            {!isFocusedPreviewMode ? (
              <>
                <details className="topbar-options-section" open role="group" aria-label="Viewport controls">
                  <summary className="topbar-options-summary">
                    <span>Viewport</span>
                  </summary>
                  <div className="topbar-options-content">
                    <label className="topbar-options-label" htmlFor="camera-rotate-speed">
                      Camera rotate speed
                    </label>
                    <input
                      id="camera-rotate-speed"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="4"
                      className="topbar-options-select"
                      value={workspaceOptions.cameraRotateSpeed}
                      onChange={(event) => updateNumberOption("cameraRotateSpeed", event.target.value)}
                    />

                    <label className="topbar-options-label" htmlFor="camera-zoom-speed">
                      Camera zoom speed
                    </label>
                    <input
                      id="camera-zoom-speed"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="4"
                      className="topbar-options-select"
                      value={workspaceOptions.cameraZoomSpeed}
                      onChange={(event) => updateNumberOption("cameraZoomSpeed", event.target.value)}
                    />

                    <label className="topbar-options-label" htmlFor="camera-pan-speed">
                      Camera pan speed
                    </label>
                    <input
                      id="camera-pan-speed"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="4"
                      className="topbar-options-select"
                      value={workspaceOptions.cameraPanSpeed}
                      onChange={(event) => updateNumberOption("cameraPanSpeed", event.target.value)}
                    />

                    <label className="topbar-options-label" htmlFor="camera-damping-factor">
                      Camera damping
                    </label>
                    <input
                      id="camera-damping-factor"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="0.35"
                      className="topbar-options-select"
                      value={workspaceOptions.cameraDampingFactor}
                      onChange={(event) => updateNumberOption("cameraDampingFactor", event.target.value)}
                    />
                  </div>
                </details>

                <details className="topbar-options-section" open role="group" aria-label="Snap and selection">
                  <summary className="topbar-options-summary">
                    <span>Snap & Selection</span>
                  </summary>
                  <div className="topbar-options-content">
                    <label className="topbar-options-label" htmlFor="snap-grid-step">
                      Grid step
                    </label>
                    <input
                      id="snap-grid-step"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="8"
                      className="topbar-options-select"
                      value={workspaceOptions.snapGridStep}
                      onChange={(event) => updateNumberOption("snapGridStep", event.target.value)}
                    />

                    <label className="topbar-options-label" htmlFor="snap-angle-step">
                      Angle step
                    </label>
                    <input
                      id="snap-angle-step"
                      type="number"
                      step="1"
                      min="1"
                      max="180"
                      className="topbar-options-select"
                      value={workspaceOptions.snapAngleStepDeg}
                      onChange={(event) => updateNumberOption("snapAngleStepDeg", event.target.value)}
                    />

                    <label className="topbar-options-label" htmlFor="snap-height-step">
                      Height step
                    </label>
                    <input
                      id="snap-height-step"
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="8"
                      className="topbar-options-select"
                      value={workspaceOptions.snapHeightStep}
                      onChange={(event) => updateNumberOption("snapHeightStep", event.target.value)}
                    />

                    <label className="topbar-options-label" htmlFor="selection-box-mode">
                      Selection box mode
                    </label>
                    <select
                      id="selection-box-mode"
                      className="topbar-options-select"
                      value={workspaceOptions.selectionBoxMode}
                      onChange={(event) =>
                        onWorkspaceOptionsChange({
                          selectionBoxMode: event.target.value as SelectionBoxMode
                        })
                      }
                    >
                      <option value="replace">replace</option>
                      <option value="add">add</option>
                      <option value="subtract">subtract</option>
                      <option value="intersect">intersect</option>
                    </select>

                    <label className="topbar-options-checkbox" htmlFor="show-per-object-gizmo-hints">
                      <input
                        id="show-per-object-gizmo-hints"
                        type="checkbox"
                        checked={workspaceOptions.showPerObjectGizmoHints}
                        onChange={(event) =>
                          onWorkspaceOptionsChange({
                            showPerObjectGizmoHints: event.target.checked
                          })
                        }
                      />
                      Show per-object gizmo hints (multi-select)
                    </label>

                    <label className="topbar-options-checkbox" htmlFor="show-tile-grid-overlay">
                      <input
                        id="show-tile-grid-overlay"
                        type="checkbox"
                        checked={workspaceOptions.showTileGridOverlay}
                        onChange={(event) =>
                          onWorkspaceOptionsChange({
                            showTileGridOverlay: event.target.checked
                          })
                        }
                      />
                      Display tile grid overlay (Aurora-style)
                    </label>

                    <label className="topbar-options-checkbox" htmlFor="enable-runtime-sound-preview">
                      <input
                        id="enable-runtime-sound-preview"
                        type="checkbox"
                        checked={workspaceOptions.enableRuntimeSoundPreview}
                        onChange={(event) =>
                          onWorkspaceOptionsChange({
                            enableRuntimeSoundPreview: event.target.checked
                          })
                        }
                      />
                      Enable runtime sound preview (Aurora runtime preview)
                    </label>

                    <label className="topbar-options-checkbox" htmlFor="show-runtime-sound-now-playing">
                      <input
                        id="show-runtime-sound-now-playing"
                        type="checkbox"
                        checked={workspaceOptions.showRuntimeSoundNowPlaying}
                        onChange={(event) =>
                          onWorkspaceOptionsChange({
                            showRuntimeSoundNowPlaying: event.target.checked
                          })
                        }
                        disabled={!workspaceOptions.enableRuntimeSoundPreview}
                      />
                      Show now-playing marker for active sounds
                    </label>
                  </div>
                </details>

                <details className="topbar-options-section" open role="group" aria-label="Lighting">
                  <summary className="topbar-options-summary">
                    <span>Lighting</span>
                  </summary>
                  <div className="topbar-options-content">
                    <label className="topbar-options-label" htmlFor="runtime-max-lights">
                      Max active lights
                    </label>
                    <input
                      id="runtime-max-lights"
                      type="number"
                      step="1"
                      min="0"
                      max="128"
                      className="topbar-options-select"
                      value={workspaceOptions.runtimeMaxLights}
                      onChange={(event) =>
                        updateNumberOption("runtimeMaxLights", event.target.value)
                      }
                    />
                  </div>
                </details>
              </>
            ) : null}

            {clientAssetCachePort ? (
              <details className="topbar-options-section" open role="group" aria-label="Asset cache">
                <summary className="topbar-options-summary">
                  <span>Asset cache</span>
                </summary>
                <div className="topbar-options-content">
                  <ClientAssetCacheControl
                    port={clientAssetCachePort}
                    onDiagnostic={onClientAssetCacheDiagnostic}
                  />
                </div>
              </details>
            ) : null}

          </article>
        </section>
      ) : null}

      {isShortcutsOpen ? (
        <section
          className="shortcuts-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsShortcutsOpen(false);
            }
          }}
        >
          <article
            className="shortcuts-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            tabIndex={-1}
            ref={shortcutsDialogRef}
          >
            <header className="shortcuts-header">
              <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
              <button
                type="button"
                className="topbar-btn"
                onClick={() => setIsShortcutsOpen(false)}
              >
                Close
              </button>
            </header>
            <ul className="shortcuts-list">
              {shortcuts.map((shortcut: KeyboardShortcut) => (
                <li key={shortcut.key + shortcut.description}>
                  <kbd>{shortcut.key}</kbd>
                  <span>{shortcut.description}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </header>
  );
}


